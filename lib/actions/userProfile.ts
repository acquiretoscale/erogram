'use server';

import mongoose from 'mongoose';
import connectDB from '@/lib/db/mongodb';
import { User } from '@/lib/models';
import jwt from 'jsonwebtoken';
import { uploadToR2, isR2Configured, getR2PublicUrl, deleteFromR2 } from '@/lib/r2';
import {
  compressUserAvatar,
  presetAvatarKey,
  customAvatarKey,
  publicAvatarUrl,
} from '@/lib/images/processUserAvatar';
import { PRESET_AVATAR_COUNT, presetAvatarIdFromUrl } from '@/lib/userAvatars';
import { PROFILE_TAG_SLUGS, sanitizeUserInterests, type InterestOption } from '@/lib/userInterests';
import { getTagIndex } from '@/lib/actions/tags';
import { AI_NSFW_TOOLS, categoryToSlug, getCategoryBySlug } from '@/app/ainsfw/data';
import { getAllTagDefinitions, getTagDefinition, type TagDefinition } from '@/lib/tags/registry';
import { buildInterestsCreatorMatch, rotateFeedResults } from '@/lib/tags/ofSearchMatch';
import { getCreatorFeedCategories } from '@/lib/tags/creatorProfileTags';
import { fetchNearMeCreatorsTiered, type NearMeCreatorItem } from '@/lib/actions/nearMeCreators';
import { Bot, OnlyFansCreator } from '@/lib/models';
import { PROFILE_THEMES, type ProfileThemeId, isFreeProfileTheme } from '@/app/profile/profileTheme';

const MIN_INTEREST_CONTENT = 20;

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

async function getUserIdFromToken(token: string): Promise<string | null> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id?: string };
    return decoded?.id || null;
  } catch {
    return null;
  }
}

async function userHasPremium(userId: string): Promise<boolean> {
  await connectDB();
  const user = await User.findById(userId).select('premium premiumExpiresAt').lean() as {
    premium?: boolean;
    premiumExpiresAt?: Date | string | null;
  } | null;
  if (!user) return false;
  return user.premium === true && (!user.premiumExpiresAt || new Date(user.premiumExpiresAt) > new Date());
}

export async function getAvatarCatalog() {
  if (!isR2Configured()) {
    return { ok: false as const, message: 'Storage not configured', presets: [] as { id: number; url: string }[] };
  }
  const base = getR2PublicUrl();
  const presets = Array.from({ length: PRESET_AVATAR_COUNT }, (_, i) => {
    const id = i + 1;
    return { id, url: `${base}/${presetAvatarKey(id)}` };
  });
  return { ok: true as const, presets };
}

export async function updateUserAvatar(token: string, avatarId: number) {
  const userId = await getUserIdFromToken(token);
  if (!userId) return { ok: false, message: 'Unauthorized' };
  if (avatarId < 1 || avatarId > PRESET_AVATAR_COUNT) return { ok: false, message: 'Invalid avatar' };
  if (!isR2Configured()) return { ok: false, message: 'Storage not configured' };

  const photoUrl = publicAvatarUrl(presetAvatarKey(avatarId));
  await connectDB();
  const user = await User.findById(userId).select('photoUrl username').lean() as { photoUrl?: string; username?: string } | null;
  if (!user) return { ok: false, message: 'User not found' };

  await maybeDeleteOldCustomAvatar(user.photoUrl, user.username);
  await User.findByIdAndUpdate(userId, { $set: { photoUrl } });

  return { ok: true, photoUrl };
}

export async function uploadUserAvatar(token: string, formData: FormData) {
  const userId = await getUserIdFromToken(token);
  if (!userId) return { ok: false, message: 'Unauthorized' };
  if (!isR2Configured()) return { ok: false, message: 'Storage not configured' };

  const file = formData.get('file') as File | null;
  if (!file || file.size === 0) return { ok: false, message: 'No file uploaded' };
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, message: 'File too large (max 8MB)' };

  await connectDB();
  const user = await User.findById(userId).select('username photoUrl').lean() as { username?: string; photoUrl?: string } | null;
  if (!user?.username) return { ok: false, message: 'User not found' };

  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const optimized = await compressUserAvatar(buf);
    const key = customAvatarKey(user.username);
    const photoUrl = await uploadToR2(optimized, key, 'image/webp');

    if (user.photoUrl && user.photoUrl !== photoUrl) {
      await maybeDeleteOldCustomAvatar(user.photoUrl, user.username);
    }

    await User.findByIdAndUpdate(userId, { $set: { photoUrl } });
    return { ok: true, photoUrl };
  } catch {
    return { ok: false, message: 'Upload failed' };
  }
}

async function maybeDeleteOldCustomAvatar(photoUrl: string | null | undefined, username?: string) {
  if (!photoUrl || !username || !isR2Configured()) return;
  const base = getR2PublicUrl();
  if (!photoUrl.startsWith(base)) return;
  const expected = `${base}/${customAvatarKey(username)}`;
  if (photoUrl === expected) return;
  if (presetAvatarIdFromUrl(photoUrl, base)) return;
  await deleteFromR2(photoUrl).catch(() => {});
}

const MAX_DISPLAY_NAME = 50;
const MAX_BIO = 160;

const PROFILE_THEME_IDS = new Set<string>(Object.keys(PROFILE_THEMES));

export async function updateUserProfileTheme(token: string, theme: string) {
  const userId = await getUserIdFromToken(token);
  if (!userId) return { ok: false as const, message: 'Unauthorized' };
  if (!PROFILE_THEME_IDS.has(theme)) {
    return { ok: false as const, message: 'Invalid theme' };
  }
  if (!isFreeProfileTheme(theme as ProfileThemeId) && !(await userHasPremium(userId))) {
    return { ok: false as const, message: 'Premium theme requires upgrade' };
  }

  await connectDB();
  const user = await User.findByIdAndUpdate(
    userId,
    { $set: { profileTheme: theme } },
    { new: true },
  )
    .select('profileTheme')
    .lean() as { profileTheme?: ProfileThemeId | null } | null;

  if (!user) return { ok: false as const, message: 'User not found' };

  return { ok: true as const, profileTheme: (user.profileTheme as ProfileThemeId) || theme };
}

export async function updateUserProfile(
  token: string,
  data: { firstName?: string; bio?: string },
) {
  const userId = await getUserIdFromToken(token);
  if (!userId) return { ok: false as const, message: 'Unauthorized' };

  const update: { firstName?: string | null; bio?: string | null } = {};

  if (data.firstName !== undefined) {
    const trimmed = data.firstName.trim();
    if (trimmed.length > MAX_DISPLAY_NAME) {
      return { ok: false as const, message: `Display name max ${MAX_DISPLAY_NAME} characters` };
    }
    update.firstName = trimmed || null;
  }

  if (data.bio !== undefined) {
    const trimmed = data.bio.trim();
    if (trimmed.length > MAX_BIO) {
      return { ok: false as const, message: `Bio max ${MAX_BIO} characters` };
    }
    update.bio = trimmed || null;
  }

  if (!Object.keys(update).length) {
    return { ok: false as const, message: 'Nothing to update' };
  }

  await connectDB();
  const user = await User.findByIdAndUpdate(userId, { $set: update }, { new: true })
    .select('firstName bio')
    .lean() as { firstName?: string | null; bio?: string | null } | null;

  if (!user) return { ok: false as const, message: 'User not found' };

  return {
    ok: true as const,
    firstName: user.firstName || null,
    bio: user.bio || null,
  };
}

async function loadProfileInterestOptions(): Promise<{
  tagInterests: InterestOption[];
  aiInterests: InterestOption[];
  tagSlugs: Set<string>;
  aiSlugs: Set<string>;
}> {
  const tags = await getTagIndex('en', MIN_INTEREST_CONTENT);
  const bySlug = new Map(tags.map((t) => [t.slug, { slug: t.slug, name: t.label }]));
  for (const def of getAllTagDefinitions()) {
    if (!bySlug.has(def.slug)) bySlug.set(def.slug, { slug: def.slug, name: def.label });
  }
  for (const slug of PROFILE_TAG_SLUGS) {
    if (bySlug.has(slug)) continue;
    const def = getTagDefinition(slug);
    if (def) bySlug.set(slug, { slug, name: def.label });
  }
  const tagInterests = [...bySlug.values()].sort((a, b) => a.name.localeCompare(b.name));

  const counts = new Map<string, number>();
  for (const tool of AI_NSFW_TOOLS) {
    counts.set(tool.category, (counts.get(tool.category) || 0) + 1);
  }
  const aiInterests: InterestOption[] = [];
  for (const [category, count] of counts) {
    if (count >= MIN_INTEREST_CONTENT) {
      aiInterests.push({ slug: categoryToSlug(category), name: category });
    }
  }
  aiInterests.sort((a, b) => a.name.localeCompare(b.name));

  return {
    tagInterests,
    aiInterests,
    tagSlugs: new Set(tagInterests.map((t) => t.slug)),
    aiSlugs: new Set(aiInterests.map((t) => t.slug)),
  };
}

export async function getProfileInterestOptions() {
  const options = await loadProfileInterestOptions();
  return {
    tagInterests: options.tagInterests,
    aiInterests: options.aiInterests,
  };
}

export async function updateUserInterests(
  token: string,
  data: {
    preferredPlatforms: string[];
    interests: string[];
    aiInterests: string[];
  },
) {
  const userId = await getUserIdFromToken(token);
  if (!userId) return { ok: false as const, message: 'Unauthorized' };

  const allowed = await loadProfileInterestOptions();
  const cleaned = sanitizeUserInterests(data, {
    tagSlugs: allowed.tagSlugs,
    aiSlugs: allowed.aiSlugs,
  });

  await connectDB();
  await User.findByIdAndUpdate(userId, {
    $set: {
      preferredPlatforms: cleaned.preferredPlatforms,
      interests: cleaned.interests,
      aiInterests: cleaned.aiInterests,
      interestedInAI: cleaned.preferredPlatforms.includes('ai'),
    },
  });

  return { ok: true as const, ...cleaned };
}

export type ProfileCategoryPill = { slug: string; label: string };

export type ProfileFeedItem =
  | {
      type: 'creator';
      _id: string;
      name: string;
      username: string;
      avatar: string;
      profileCategories: ProfileCategoryPill[];
      interestLabel: string;
    }
  | {
      type: 'bot';
      _id: string;
      name: string;
      slug: string;
      image: string;
      interestLabel: string;
    }
  | {
      type: 'ai';
      slug: string;
      name: string;
      image: string;
      category: string;
      vendor: string;
      description: string;
      interestLabel: string;
    };

const FEED_TARGET = 12;
const AI_FEED_MAX = 4;
const BOT_BASE = { status: 'approved', isAdvertisement: { $ne: true } };

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildBotMatch(def: TagDefinition) {
  const labels = [...new Set(def.groupLabels.filter(Boolean))];
  if (!labels.length) return null;
  const or = labels.flatMap((label) => [
    { category: { $regex: `^${escapeRegex(label)}$`, $options: 'i' } },
    { categories: { $regex: `^${escapeRegex(label)}$`, $options: 'i' } },
  ]);
  return { ...BOT_BASE, $or: or };
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function tagLabelForSlug(slug: string): string {
  return getTagDefinition(slug)?.label || slug.replace(/-/g, ' ');
}

function aiLabelForSlug(slug: string): string {
  return getCategoryBySlug(slug) || slug.replace(/-/g, ' ');
}

function feedLimits(wantsOf: boolean, wantsBot: boolean, wantsAi: boolean) {
  const ai = wantsAi ? AI_FEED_MAX : 0;
  const n = [wantsOf, wantsBot].filter(Boolean).length;
  if (n === 0) return { of: 0, bot: 0, ai };
  if (n === 1) {
    return { of: wantsOf ? FEED_TARGET : 0, bot: wantsBot ? FEED_TARGET : 0, ai };
  }
  const half = Math.ceil(FEED_TARGET / 2);
  return { of: wantsOf ? half : 0, bot: wantsBot ? half : 0, ai };
}

const FEED_POOL = 300;

async function sampleCreators(
  slugs: string[],
  limit: number,
  userId: string,
  rotateSeed: string,
): Promise<ProfileFeedItem[]> {
  if (!limit || !slugs.length) return [];

  if (slugs.length > 1) {
    const perSlug = Math.max(2, Math.ceil(limit / slugs.length));
    const batches = await Promise.all(
      slugs.map((slug) => sampleCreators([slug], perSlug, userId, `${rotateSeed}:${slug}`)),
    );
    const merged = shuffle(batches.flat());
    const seen = new Set<string>();
    const out: ProfileFeedItem[] = [];
    for (const item of merged) {
      if (item.type !== 'creator' || seen.has(item.username)) continue;
      seen.add(item.username);
      out.push(item);
      if (out.length >= limit) break;
    }
    return out;
  }

  const slug = slugs[0];
  const match = buildInterestsCreatorMatch([slug]);
  if (!match) return [];

  const rows = await OnlyFansCreator.aggregate([
    { $match: match },
    { $sort: { clicks: -1, likesCount: -1, _id: 1 } },
    { $limit: FEED_POOL },
    {
      $project: {
        name: 1,
        username: 1,
        avatar: 1,
        categories: 1,
        bio: 1,
        location: 1,
      },
    },
  ]);

  const day = new Date().toISOString().slice(0, 10);
  const seed = `${userId}:${day}:${rotateSeed}:${slug}`;
  const picked = rotateFeedResults(rows as any[], seed, limit * 3);

  const seen = new Set<string>();
  const items: ProfileFeedItem[] = [];
  for (const c of picked) {
    const username = (c.username || '').toLowerCase();
    if (!username || !c.avatar || seen.has(username)) continue;
    seen.add(username);
    const profileCategories = getCreatorFeedCategories({
      categories: (c.categories || []) as string[],
      bio: c.bio,
      name: c.name,
      username: c.username,
      location: c.location,
    });
    items.push({
      type: 'creator',
      _id: c._id.toString(),
      name: c.name || c.username,
      username: c.username,
      avatar: c.avatar,
      profileCategories,
      interestLabel: profileCategories[0]?.label || '',
    });
    if (items.length >= limit) break;
  }
  return items;
}

async function sampleBots(slugs: string[], limit: number): Promise<ProfileFeedItem[]> {
  if (!limit || !slugs.length) return [];
  const matches = slugs
    .map((slug) => {
      const def = getTagDefinition(slug);
      return def ? buildBotMatch(def) : null;
    })
    .filter(Boolean) as Record<string, unknown>[];
  if (!matches.length) return [];

  const rows = await Bot.aggregate([
    { $match: { $or: matches } },
    { $sample: { size: Math.min(limit * 3, 60) } },
    { $project: { name: 1, slug: 1, image: 1, category: 1, categories: 1 } },
  ]);

  const seen = new Set<string>();
  const items: ProfileFeedItem[] = [];
  for (const b of rows as any[]) {
    const slug = b.slug || '';
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    const label = b.category || (b.categories || [])[0] || '';
    const interestSlug =
      slugs.find((s) => {
        const def = getTagDefinition(s);
        return def?.groupLabels.some((l) => l.toLowerCase() === String(label).toLowerCase());
      }) || slugs[0];
    items.push({
      type: 'bot',
      _id: b._id.toString(),
      name: b.name || slug,
      slug,
      image: b.image || '/assets/image.jpg',
      interestLabel: tagLabelForSlug(interestSlug),
    });
    if (items.length >= limit) break;
  }
  return items;
}

function sampleAiTools(slugs: string[], limit: number): ProfileFeedItem[] {
  if (!limit || !slugs.length) return [];
  const categories = new Set(slugs.map((s) => getCategoryBySlug(s)).filter(Boolean) as string[]);
  const pool = AI_NSFW_TOOLS.filter((t) => categories.has(t.category));
  return shuffle(pool)
    .slice(0, limit)
    .map((t) => ({
      type: 'ai' as const,
      slug: t.slug,
      name: t.name,
      image: t.image || '/assets/image.jpg',
      category: t.category,
      vendor: t.vendor,
      description: t.description,
      interestLabel: aiLabelForSlug(categoryToSlug(t.category)),
    }));
}

export async function getProfileInterestFeed(
  token: string,
  rotateSeed = 'default',
): Promise<{ items: ProfileFeedItem[]; aiItems: Extract<ProfileFeedItem, { type: 'ai' }>[] }> {
  const userId = await getUserIdFromToken(token);
  if (!userId) return { items: [], aiItems: [] };

  await connectDB();
  const user = await User.findById(userId)
    .select('preferredPlatforms interests aiInterests')
    .lean() as {
      preferredPlatforms?: string[];
      interests?: string[];
      aiInterests?: string[];
    } | null;
  if (!user) return { items: [], aiItems: [] };

  const platforms = user.preferredPlatforms || [];
  const tagSlugs = user.interests || [];
  const aiSlugs = user.aiInterests || [];

  // Category pills are OnlyFans niches — always sample creators when any are saved.
  // Telegram bots are additive when that platform is enabled.
  const wantsOf = tagSlugs.length > 0;
  const wantsBot = platforms.includes('telegram') && tagSlugs.length > 0;
  const wantsAi = platforms.includes('ai') && aiSlugs.length > 0;

  const limits = feedLimits(wantsOf, wantsBot, wantsAi);
  if (!limits.of && !limits.bot && !limits.ai) return { items: [], aiItems: [] };

  const [creators, bots, aiTools] = await Promise.all([
    sampleCreators(tagSlugs, limits.of, userId, rotateSeed),
    sampleBots(tagSlugs, limits.bot),
    Promise.resolve(sampleAiTools(aiSlugs, limits.ai)),
  ]);

  let items = shuffle([...creators, ...bots]);
  if (items.length < FEED_TARGET && (wantsOf || wantsBot)) {
    const extraOf = wantsOf ? await sampleCreators(tagSlugs, FEED_TARGET - items.length, userId, `${rotateSeed}:extra`) : [];
    const extraBot = wantsBot ? await sampleBots(tagSlugs, FEED_TARGET - items.length) : [];
    const seen = new Set(items.map((i) => (i.type === 'creator' ? i.username : i.slug)));
    for (const item of shuffle([...extraOf, ...extraBot])) {
      const key = item.type === 'creator' ? item.username : item.slug;
      if (seen.has(key)) continue;
      seen.add(key);
      items.push(item);
      if (items.length >= FEED_TARGET) break;
    }
  }

  const aiItems = aiTools.filter((t): t is Extract<ProfileFeedItem, { type: 'ai' }> => t.type === 'ai').slice(0, AI_FEED_MAX);
  return { items: items.slice(0, FEED_TARGET), aiItems };
}

export async function getSavedLikesOrder(token: string): Promise<string[]> {
  const userId = await getUserIdFromToken(token);
  if (!userId) return [];
  await connectDB();
  const user = await User.findById(userId).select('savedLikesOrder').lean() as { savedLikesOrder?: string[] } | null;
  return Array.isArray(user?.savedLikesOrder) ? user.savedLikesOrder : [];
}

export async function saveSavedLikesOrder(token: string, order: string[]) {
  const userId = await getUserIdFromToken(token);
  if (!userId) return { ok: false as const, message: 'Unauthorized' };

  const clean = order.filter((k) => typeof k === 'string' && /^[a-z]+:.+/.test(k));
  const creatorIds = clean
    .filter((k) => k.startsWith('onlyfans:'))
    .map((k) => k.slice('onlyfans:'.length))
    .filter((id) => mongoose.Types.ObjectId.isValid(id));

  await connectDB();
  const user = await User.findById(userId).select('savedCreators').lean() as { savedCreators?: unknown[] } | null;
  const existing = (user?.savedCreators || []).map(String);
  const orderedSet = new Set(creatorIds);
  const finalCreators = [...creatorIds, ...existing.filter((id) => !orderedSet.has(id))];

  await User.findByIdAndUpdate(userId, {
    $set: {
      savedLikesOrder: clean,
      savedCreators: finalCreators,
    },
  });

  return { ok: true as const };
}

const NEAR_ME_LIMIT = 12;

export type { NearMeCreatorItem };

export async function getNearMeCreators(token: string, rotateSeed = 'default') {
  const userId = await getUserIdFromToken(token);
  if (!userId) {
    return { ok: false as const, creators: [] as NearMeCreatorItem[], needsLocation: true, areaLabel: '' };
  }

  await connectDB();
  const user = await User.findById(userId).select('country city').lean() as {
    country?: string;
    city?: string;
  } | null;

  const res = await fetchNearMeCreatorsTiered(
    user?.country,
    user?.city,
    rotateSeed,
    userId,
    NEAR_ME_LIMIT,
  );

  return {
    ok: true as const,
    creators: res.creators,
    needsLocation: res.needsLocation,
    areaLabel: res.areaLabel,
  };
}
