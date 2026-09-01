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
import { PROFILE_OF_INTEREST_SLUGS, profileOfInterestLabel, sanitizeUserInterests, type InterestOption } from '@/lib/userInterests';
import { AI_NSFW_TOOLS, categoryToSlug, getCategoryBySlug } from '@/app/ainsfw/data';
import { getTagDefinition, type TagDefinition } from '@/lib/tags/registry';
import { buildInterestsCreatorMatch, rotateFeedResults } from '@/lib/tags/ofSearchMatch';
import { getCreatorFeedCategories } from '@/lib/tags/creatorProfileTags';
import {
  ArticleComment,
  Bot,
  CreatorReview,
  Group,
  OnlyFansCreator,
  Post,
  ProfileFeedComment,
} from '@/lib/models';
import { ofCreatorProfileUrl } from '@/lib/ofsearch/creatorUrls';
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
  tagSlugs: Set<string>;
}> {
  const tagInterests: InterestOption[] = PROFILE_OF_INTEREST_SLUGS.map((slug) => ({
    slug,
    name: profileOfInterestLabel(slug),
  }));

  return {
    tagInterests,
    tagSlugs: new Set(PROFILE_OF_INTEREST_SLUGS),
  };
}

export async function getProfileInterestOptions() {
  const options = await loadProfileInterestOptions();
  return {
    tagInterests: options.tagInterests,
    aiInterests: [] as InterestOption[],
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
  });

  await connectDB();
  await User.findByIdAndUpdate(userId, {
    $set: {
      preferredPlatforms: cleaned.preferredPlatforms,
      interests: cleaned.interests,
      aiInterests: cleaned.aiInterests,
      interestedInAI: false,
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
  const order = Array.isArray(user?.savedLikesOrder) ? user.savedLikesOrder : [];
  return order.map((k) => (k.startsWith('creator:') ? `onlyfans:${k.slice('creator:'.length)}` : k));
}

export async function saveOnlyFansCreatorFromLink(token: string, input: string) {
  const userId = await getUserIdFromToken(token);
  if (!userId) return { ok: false as const, message: 'Unauthorized' };

  try {
    const { saveOnlyFansCreatorByUsernameInput } = await import('@/lib/onlyfansCreatorSaveDb');
    const { creatorId } = await saveOnlyFansCreatorByUsernameInput(userId, input);
    return { ok: true as const, creatorId };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Save failed';
    if (message === 'Creator not found' || message === 'Invalid username or link') {
      return { ok: false as const, message };
    }
    throw e;
  }
}

export async function getBookmarkCreatorLikeStatus(token: string, creatorIds: string[]) {
  const userId = await getUserIdFromToken(token);
  if (!userId) return { ok: false as const, likedByCreatorId: {} as Record<string, boolean> };

  const { getCreatorDualPhotoLikeStatus } = await import('@/lib/onlyfansCreatorSaveDb');
  const likedByCreatorId = await getCreatorDualPhotoLikeStatus(userId, creatorIds);
  return { ok: true as const, likedByCreatorId };
}

export async function toggleBookmarkCreatorLikes(token: string, creatorId: string) {
  const userId = await getUserIdFromToken(token);
  if (!userId) return { ok: false as const, message: 'Unauthorized' };

  try {
    const { toggleCreatorDualPhotoLikes } = await import('@/lib/onlyfansCreatorSaveDb');
    const { liked } = await toggleCreatorDualPhotoLikes(userId, creatorId);
    return { ok: true as const, liked };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Like failed';
    if (message === 'Creator not found') {
      return { ok: false as const, message };
    }
    throw e;
  }
}

export async function saveSavedLikesOrder(token: string, order: string[]) {
  const userId = await getUserIdFromToken(token);
  if (!userId) return { ok: false as const, message: 'Unauthorized' };

  const clean = order.filter((k) => typeof k === 'string' && /^[a-z]+:.+/.test(k));
  const creatorIds = clean
    .filter((k) => k.startsWith('onlyfans:') || k.startsWith('creator:'))
    .map((k) => (k.startsWith('onlyfans:') ? k.slice('onlyfans:'.length) : k.slice('creator:'.length)))
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

export type PublicUserContribution = {
  id: string;
  type: 'group_review' | 'creator_review' | 'article_comment' | 'photo_comment';
  label: string;
  content: string;
  rating?: number;
  href: string;
  createdAt: string;
};

export async function getPublicUserContributions(userId: string, limit = 10): Promise<PublicUserContribution[]> {
  await connectDB();
  const uid = new mongoose.Types.ObjectId(userId);

  const [posts, creatorReviews, articleComments, photoComments] = await Promise.all([
    Post.find({ author: uid, status: 'approved' })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('groupId', 'name slug')
      .lean(),
    CreatorReview.find({ author: uid, status: 'approved' })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean(),
    ArticleComment.find({ author: uid, status: 'approved' })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean(),
    ProfileFeedComment.find({ author: uid, status: 'approved' })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('creatorId', 'username name')
      .lean(),
  ]);

  const items: PublicUserContribution[] = [];

  for (const row of posts as Array<{
    _id: unknown;
    content?: string;
    rating?: number;
    createdAt?: Date;
    groupId?: { name?: string; slug?: string } | null;
  }>) {
    const group = row.groupId && typeof row.groupId === 'object' ? row.groupId : null;
    if (!group?.slug) continue;
    items.push({
      id: `post-${String(row._id)}`,
      type: 'group_review',
      label: group.name ? `Review on ${group.name}` : 'Group review',
      content: row.content || '',
      rating: row.rating,
      href: `/${group.slug}`,
      createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : '',
    });
  }

  for (const row of creatorReviews as Array<{
    _id: unknown;
    creatorSlug?: string;
    content?: string;
    rating?: number;
    createdAt?: Date;
  }>) {
    if (!row.creatorSlug) continue;
    items.push({
      id: `creator-${String(row._id)}`,
      type: 'creator_review',
      label: `Review on @${row.creatorSlug}`,
      content: row.content || '',
      rating: row.rating,
      href: ofCreatorProfileUrl(row.creatorSlug),
      createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : '',
    });
  }

  for (const row of articleComments as Array<{
    _id: unknown;
    articleSlug?: string;
    content?: string;
    createdAt?: Date;
  }>) {
    if (!row.articleSlug) continue;
    items.push({
      id: `article-${String(row._id)}`,
      type: 'article_comment',
      label: 'Article comment',
      content: row.content || '',
      href: `/blog/${row.articleSlug}`,
      createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : '',
    });
  }

  for (const row of photoComments as Array<{
    _id: unknown;
    content?: string;
    createdAt?: Date;
    creatorId?: { username?: string; name?: string } | null;
  }>) {
    const creator = row.creatorId && typeof row.creatorId === 'object' ? row.creatorId : null;
    const slug = creator?.username;
    items.push({
      id: `photo-${String(row._id)}`,
      type: 'photo_comment',
      label: creator?.name ? `Comment on ${creator.name}` : 'Photo comment',
      content: row.content || '',
      href: slug ? ofCreatorProfileUrl(slug) : '/ofsearch',
      createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : '',
    });
  }

  return items
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}
