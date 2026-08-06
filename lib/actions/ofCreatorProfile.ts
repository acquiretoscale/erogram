'use server';

import jwt from 'jsonwebtoken';
import { revalidatePath } from 'next/cache';
import connectDB from '@/lib/db/mongodb';
import { OnlyFansCreator, CreatorReview, User, Group, Post } from '@/lib/models';
import { deleteFromR2 } from '@/lib/r2';
import { LOCALES } from '@/lib/i18n/config';
import { ofCreatorProfileUrl, normalizeCreatorProfileSegment } from '@/lib/onlyfanssearch/creatorUrls';

import { getCreatorProfileTags } from '@/lib/tags/creatorProfileTags';

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';

/** OF creator pages are ISR-cached; rebuild instantly on edit/import/delete. */
export async function revalidateCreatorPage(slug: string, username?: string) {
  try {
    const paths = new Set<string>();
    if (username) {
      paths.add(ofCreatorProfileUrl(username));
      paths.add(`/onlyfanssearch/${normalizeCreatorProfileSegment(username)}`);
    }
    if (slug) {
      paths.add(ofCreatorProfileUrl(slug));
      paths.add(`/onlyfanssearch/${normalizeCreatorProfileSegment(slug)}`);
    }
    for (const p of paths) {
      for (const locale of LOCALES) {
        revalidatePath(locale === 'en' ? p : `/${locale}${p}`);
      }
    }
    if (username) revalidatePath(`/onlyfanssearch/${username}`);
  } catch (err) {
    console.error('[Creator Update] revalidatePath failed:', err);
  }
}

export interface CreatorProfile {
  _id: string;
  name: string;
  username: string;
  slug: string;
  bio: string;
  avatar: string;
  avatarThumbC50: string;
  avatarThumbC144: string;
  header: string;
  categories: string[];
  subscriberCount: number;
  likesCount: number;
  mediaCount: number;
  photosCount: number;
  videosCount: number;
  audiosCount: number;
  postsCount: number;
  price: number;
  isFree: boolean;
  isVerified: boolean;
  url: string;
  gender: string;
  scrapedAt: string | null;
  lastSeen: string;
  location: string;
  website: string;
  joinDate: string;
  onlyfansId: number;
  hasStories: boolean;
  hasStream: boolean;
  tipsEnabled: boolean;
  tipsMin: number;
  tipsMax: number;
  finishedStreamsCount: number;
  instagramUrl: string;
  instagramUsername: string;
  twitterUrl: string;
  tiktokUrl: string;
  fanslyUrl: string;
  fanvueUrl: string;
  privacyUrl: string;
  pornhubUrl: string;
  telegramUrl: string;
  linktreeUrl: string;
  allmylinksUrl: string;
  beaconsUrl: string;
  redditUrl: string;
  patreonUrl: string;
  extraPhotos: string[];
  extraVideos: string[];
  adminImported: boolean;
  publicPage?: boolean;
}

export async function getCreatorByProfileSegment(segment: string): Promise<CreatorProfile | null> {
  const name = (segment || '').replace(/^@/, '').trim();
  if (!name) return null;
  if (name.toLowerCase().endsWith('-onlyfans')) {
    return getCreatorBySlug(name);
  }
  const bySlug = await getCreatorBySlug(name);
  if (bySlug) return bySlug;
  return getCreatorByUsername(name);
}

export async function getCreatorBySlug(slug: string): Promise<CreatorProfile | null> {
  try {
    await connectDB();
    let creator = await OnlyFansCreator.findOne({ slug, deleted: { $ne: true } }).lean();

    // Fallback for /{something}-onlyfans URLs where the DB record still has the
    // legacy un-suffixed slug (true for ~12.6K scraped creators). Admin-imported
    // top creators have slug = '{username}-onlyfans' already and hit the first
    // query. For scraped ones, the DB slug is the sanitized base (e.g. URL
    // 'sirenaa-xx-onlyfans' -> DB slug 'sirenaa-xx', username 'sirenaa.xx').
    if (!creator && slug.endsWith('-onlyfans')) {
      const base = slug.slice(0, -'-onlyfans'.length);
      creator = await OnlyFansCreator.findOne({
        $or: [{ slug: base }, { username: base }],
        deleted: { $ne: true },
      }).lean();
    }

    if (!creator) return null;
    if ((creator as any).submissionStatus === 'pending' || (creator as any).submissionStatus === 'rejected') return null;
    // Big-player creators flagged redirectToOF have NO individual Erogram page.
    // They still appear as cards on /onlyfanssearch (click goes straight to OnlyFans).
    if ((creator as any).redirectToOF === true) return null;

    const c = creator as any;
    return {
      _id: c._id.toString(),
      name: c.name || '',
      username: c.username || '',
      slug: c.slug || '',
      bio: c.bio || '',
      avatar: c.avatar || '',
      avatarThumbC50: c.avatarThumbC50 || '',
      avatarThumbC144: c.avatarThumbC144 || '',
      header: c.header || '',
      categories: c.categories || [],
      subscriberCount: c.subscriberCount || 0,
      likesCount: c.likesCount || 0,
      mediaCount: c.mediaCount || 0,
      photosCount: c.photosCount || 0,
      videosCount: c.videosCount || 0,
      audiosCount: c.audiosCount || 0,
      postsCount: c.postsCount || 0,
      price: c.price || 0,
      isFree: c.isFree || false,
      isVerified: c.isVerified || false,
      url: c.url || '',
      gender: c.gender || 'unknown',
      scrapedAt: c.scrapedAt ? new Date(c.scrapedAt).toISOString() : null,
      lastSeen: c.lastSeen || '',
      location: c.location || '',
      website: c.website || '',
      joinDate: c.joinDate || '',
      onlyfansId: c.onlyfansId || 0,
      hasStories: c.hasStories || false,
      hasStream: c.hasStream || false,
      tipsEnabled: c.tipsEnabled || false,
      tipsMin: c.tipsMin || 0,
      tipsMax: c.tipsMax || 0,
      finishedStreamsCount: c.finishedStreamsCount || 0,
      instagramUrl: c.instagramUrl || '',
      instagramUsername: c.instagramUsername || '',
      twitterUrl: c.twitterUrl || '',
      tiktokUrl: c.tiktokUrl || '',
      fanslyUrl: c.fanslyUrl || '',
      fanvueUrl: c.fanvueUrl || '',
      privacyUrl: c.privacyUrl || '',
      pornhubUrl: c.pornhubUrl || '',
      telegramUrl: c.telegramUrl || '',
      linktreeUrl: c.linktreeUrl || '',
      allmylinksUrl: c.allmylinksUrl || '',
      beaconsUrl: c.beaconsUrl || '',
      redditUrl: c.redditUrl || '',
      patreonUrl: c.patreonUrl || '',
      extraPhotos: c.extraPhotos || [],
      extraVideos: c.extraVideos || [],
      adminImported: c.adminImported || false,
      publicPage: c.publicPage || false,
    };
  } catch {
    return null;
  }
}

export async function getCreatorByUsername(username: string): Promise<CreatorProfile | null> {
  try {
    await connectDB();
    const creator = await OnlyFansCreator.findOne({ username, deleted: { $ne: true } }).lean();
    if (!creator) return null;

    const c = creator as any;
    return {
      _id: c._id.toString(),
      name: c.name || '',
      username: c.username || '',
      slug: c.slug || '',
      bio: c.bio || '',
      avatar: c.avatar || '',
      avatarThumbC50: c.avatarThumbC50 || '',
      avatarThumbC144: c.avatarThumbC144 || '',
      header: c.header || '',
      categories: c.categories || [],
      subscriberCount: c.subscriberCount || 0,
      likesCount: c.likesCount || 0,
      mediaCount: c.mediaCount || 0,
      photosCount: c.photosCount || 0,
      videosCount: c.videosCount || 0,
      audiosCount: c.audiosCount || 0,
      postsCount: c.postsCount || 0,
      price: c.price || 0,
      isFree: c.isFree || false,
      isVerified: c.isVerified || false,
      url: c.url || '',
      gender: c.gender || 'unknown',
      scrapedAt: c.scrapedAt ? new Date(c.scrapedAt).toISOString() : null,
      lastSeen: c.lastSeen || '',
      location: c.location || '',
      website: c.website || '',
      joinDate: c.joinDate || '',
      onlyfansId: c.onlyfansId || 0,
      hasStories: c.hasStories || false,
      hasStream: c.hasStream || false,
      tipsEnabled: c.tipsEnabled || false,
      tipsMin: c.tipsMin || 0,
      tipsMax: c.tipsMax || 0,
      finishedStreamsCount: c.finishedStreamsCount || 0,
      instagramUrl: c.instagramUrl || '',
      instagramUsername: c.instagramUsername || '',
      twitterUrl: c.twitterUrl || '',
      tiktokUrl: c.tiktokUrl || '',
      fanslyUrl: c.fanslyUrl || '',
      fanvueUrl: c.fanvueUrl || '',
      privacyUrl: c.privacyUrl || '',
      pornhubUrl: c.pornhubUrl || '',
      telegramUrl: c.telegramUrl || '',
      linktreeUrl: c.linktreeUrl || '',
      allmylinksUrl: c.allmylinksUrl || '',
      beaconsUrl: c.beaconsUrl || '',
      redditUrl: c.redditUrl || '',
      patreonUrl: c.patreonUrl || '',
      extraPhotos: c.extraPhotos || [],
      extraVideos: c.extraVideos || [],
      adminImported: c.adminImported || false,
      publicPage: c.publicPage || false,
    };
  } catch {
    return null;
  }
}

const RELATED_SELECT = 'name username slug avatar avatarThumbC50 avatarThumbC144 header categories subscriberCount likesCount photosCount videosCount price isFree isVerified url location';

function mapRelatedCreator(c: any): CreatorProfile {
  return {
    _id: c._id.toString(),
    name: c.name || '',
    username: c.username || '',
    slug: c.slug || '',
    bio: '',
    avatar: c.avatar || '',
    avatarThumbC50: c.avatarThumbC50 || '',
    avatarThumbC144: c.avatarThumbC144 || '',
    header: c.header || '',
    categories: c.categories || [],
    subscriberCount: c.subscriberCount || 0,
    likesCount: c.likesCount || 0,
    mediaCount: 0,
    photosCount: c.photosCount || 0,
    videosCount: c.videosCount || 0,
    audiosCount: 0,
    postsCount: 0,
    price: c.price || 0,
    isFree: c.isFree || false,
    isVerified: c.isVerified || false,
    url: c.url || '',
    gender: 'female',
    scrapedAt: null,
    lastSeen: '',
    location: c.location || '',
    website: '',
    joinDate: '',
    onlyfansId: 0,
    hasStories: false,
    hasStream: false,
    tipsEnabled: false,
    tipsMin: 0,
    tipsMax: 0,
    finishedStreamsCount: 0,
    instagramUrl: '',
    instagramUsername: '',
    twitterUrl: '',
    tiktokUrl: '',
    fanslyUrl: '',
    fanvueUrl: '',
    privacyUrl: '',
    pornhubUrl: '',
    telegramUrl: '',
    linktreeUrl: '',
    allmylinksUrl: '',
    beaconsUrl: '',
    redditUrl: '',
    patreonUrl: '',
    extraPhotos: [],
    extraVideos: [],
    adminImported: false,
  };
}

export async function getRelatedCreators(
  categories: string[],
  excludeSlug: string,
  limit = 4,
  location = '',
): Promise<CreatorProfile[]> {
  try {
    await connectDB();
    const baseFilter = {
      slug: { $ne: excludeSlug },
      avatar: { $ne: '' },
      deleted: { $ne: true },
      redirectToOF: { $ne: true },
    };

    let searchCats = categories.filter(Boolean);
    if (searchCats.length === 0 && location) {
      searchCats = getCreatorProfileTags([], location).map((t) => t.slug);
    }

    let creators: any[] = [];
    if (searchCats.length > 0) {
      creators = await OnlyFansCreator.find({
        ...baseFilter,
        categories: { $in: searchCats },
      })
        .sort({ likesCount: -1 })
        .limit(limit)
        .select(RELATED_SELECT)
        .lean();
    }

    if (creators.length < limit) {
      const exclude = [excludeSlug, ...creators.map((c) => c.slug)];
      const fill = await OnlyFansCreator.find({
        slug: { $nin: exclude },
        avatar: { $ne: '' },
        deleted: { $ne: true },
        redirectToOF: { $ne: true },
      })
        .sort({ likesCount: -1 })
        .limit(limit - creators.length)
        .select(RELATED_SELECT)
        .lean();
      creators = [...creators, ...fill];
    }

    return creators.map(mapRelatedCreator);
  } catch {
    return [];
  }
}

/** Other admin-imported (top 100) creators for cross-links on profile pages. */
export async function getTop100CreatorSuggestions(
  excludeSlugs: string[],
  limit = 12
): Promise<CreatorProfile[]> {
  try {
    await connectDB();
    const unique = [...new Set(excludeSlugs.filter(Boolean))];
    const creators = await OnlyFansCreator.find({
      adminImported: true,
      slug: { $nin: unique },
      avatar: { $ne: '' },
      deleted: { $ne: true },
    })
      .sort({ likesCount: -1 })
      .limit(limit)
      .select('name username slug avatar header categories subscriberCount likesCount photosCount videosCount price isFree isVerified url location')
      .lean();

    return (creators as any[]).map((c) => ({
      _id: c._id.toString(),
      name: c.name || '',
      username: c.username || '',
      slug: c.slug || '',
      bio: '',
      avatar: c.avatar || '',
      avatarThumbC50: '',
      avatarThumbC144: '',
      header: c.header || '',
      categories: c.categories || [],
      subscriberCount: c.subscriberCount || 0,
      likesCount: c.likesCount || 0,
      mediaCount: 0,
      photosCount: c.photosCount || 0,
      videosCount: c.videosCount || 0,
      audiosCount: 0,
      postsCount: 0,
      price: c.price || 0,
      isFree: c.isFree || false,
      isVerified: c.isVerified || false,
      url: c.url || '',
      gender: 'female',
      scrapedAt: null,
      lastSeen: '',
      location: c.location || '',
      website: '',
      joinDate: '',
      onlyfansId: 0,
      hasStories: false,
      hasStream: false,
      tipsEnabled: false,
      tipsMin: 0,
      tipsMax: 0,
      finishedStreamsCount: 0,
      instagramUrl: '',
      instagramUsername: '',
      twitterUrl: '',
      tiktokUrl: '',
      fanslyUrl: '',
      fanvueUrl: '',
      privacyUrl: '',
      pornhubUrl: '',
      telegramUrl: '',
      linktreeUrl: '',
      allmylinksUrl: '',
      beaconsUrl: '',
      redditUrl: '',
      patreonUrl: '',
      extraPhotos: [],
      extraVideos: [],
      adminImported: false,
    }));
  } catch {
    return [];
  }
}

// ── Creator profile access (owner or admin) ──

async function assertCreatorProfileAccess(token: string, slug: string) {
  if (!token) throw new Error('Sign in to edit this profile');
  let userId: string;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id?: string };
    if (!decoded?.id) throw new Error('Invalid session');
    userId = decoded.id;
  } catch {
    throw new Error('Invalid session');
  }

  await connectDB();
  const user = await User.findById(userId).select('isAdmin').lean() as { isAdmin?: boolean } | null;
  if (!user) throw new Error('User not found');
  if (user.isAdmin) return { userId, isAdmin: true as const };

  const creator = await OnlyFansCreator.findOne({ slug, deleted: { $ne: true } })
    .select('submittedBy')
    .lean() as { submittedBy?: { toString(): string } } | null;
  if (!creator) throw new Error('Creator not found');
  if (creator.submittedBy?.toString() !== userId) {
    throw new Error('You can only edit your own creator profile');
  }
  return { userId, isAdmin: false as const };
}

export async function canManageCreatorProfile(token: string, slug: string): Promise<boolean> {
  try {
    await assertCreatorProfileAccess(token, slug);
    return true;
  } catch {
    return false;
  }
}

export async function getMyCreatorProfile(token: string): Promise<{ slug: string; username: string; name: string; avatar: string } | null> {
  if (!token) return null;
  let userId: string;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id?: string };
    if (!decoded?.id) return null;
    userId = decoded.id;
  } catch {
    return null;
  }

  await connectDB();
  const creator = await OnlyFansCreator.findOne({ submittedBy: userId, deleted: { $ne: true } })
    .select('slug username name avatar')
    .lean() as { slug?: string; username?: string; name?: string; avatar?: string } | null;
  if (!creator?.slug) return null;
  return {
    slug: creator.slug,
    username: creator.username || creator.slug,
    name: creator.name || creator.username || creator.slug,
    avatar: creator.avatar || '',
  };
}

const OWNER_EDITABLE_FIELDS = new Set([
  'name', 'bio', 'location', 'website', 'price', 'isFree',
  'instagramUrl', 'twitterUrl', 'tiktokUrl', 'telegramUrl',
  'fanslyUrl', 'fanvueUrl', 'redditUrl', 'patreonUrl',
  'linktreeUrl', 'allmylinksUrl', 'beaconsUrl', 'privacyUrl', 'pornhubUrl',
  'avatar', 'avatarThumbC50', 'avatarThumbC144', 'header', 'extraPhotos', 'extraVideos',
]);

function filterOwnerFields(fields: Record<string, any>) {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (OWNER_EDITABLE_FIELDS.has(k)) out[k] = v;
  }
  if ('price' in out) {
    const p = parseFloat(String(out.price)) || 0;
    out.price = p;
    out.isFree = p === 0;
  }
  return out;
}

// ── Admin / owner actions ──

export async function updateCreatorFields(slug: string, fields: Record<string, any>, token?: string) {
  if (!token) throw new Error('Sign in to edit this profile');
  const { isAdmin } = await assertCreatorProfileAccess(token, slug);
  const patch = isAdmin ? { ...fields } : filterOwnerFields(fields);
  if (!isAdmin) delete patch.publicPage;

  await connectDB();
  const creator = await OnlyFansCreator.findOne({ slug }).select('username').lean() as any;
  await OnlyFansCreator.updateOne({ slug }, { $set: patch }, { strict: false });
  await revalidateCreatorPage(slug, creator?.username);
  return { success: true };
}

export async function deleteCreatorPhoto(slug: string, photoType: 'avatar' | 'header' | 'extra', extraIndex?: number, token?: string) {
  if (!token) throw new Error('Sign in to edit this profile');
  await assertCreatorProfileAccess(token, slug);

  await connectDB();
  const creator = await OnlyFansCreator.findOne({ slug }).lean() as any;
  if (!creator) return { success: false };

  if (photoType === 'avatar') {
    await deleteFromR2(creator.avatar);
    await OnlyFansCreator.updateOne({ slug }, { $set: { avatar: '' } });
  } else if (photoType === 'header') {
    await deleteFromR2(creator.header);
    await OnlyFansCreator.updateOne({ slug }, { $set: { header: '' } });
  } else if (photoType === 'extra' && typeof extraIndex === 'number') {
    const extras: string[] = creator.extraPhotos || [];
    if (extras[extraIndex]) {
      await deleteFromR2(extras[extraIndex]);
      extras.splice(extraIndex, 1);
      await OnlyFansCreator.updateOne({ slug }, { $set: { extraPhotos: extras } }, { strict: false });
    }
  }
  await revalidateCreatorPage(slug, creator.username);
  return { success: true };
}

export async function deleteCreator(slug: string, token?: string) {
  if (!token) throw new Error('Sign in required');
  const { isAdmin } = await assertCreatorProfileAccess(token, slug);
  if (!isAdmin) throw new Error('Only admins can delete profiles');

  await connectDB();
  const creator = await OnlyFansCreator.findOne({ slug }).lean() as any;
  if (!creator) return { success: false };

  if (creator.avatar) await deleteFromR2(creator.avatar).catch(() => {});
  if (creator.header) await deleteFromR2(creator.header).catch(() => {});
  for (const url of creator.extraPhotos || []) {
    if (url) await deleteFromR2(url).catch(() => {});
  }

  await OnlyFansCreator.updateOne({ slug }, { $set: { deleted: true, deletedAt: new Date() } });
  await revalidateCreatorPage(slug, creator.username);
  return { success: true };
}

// ── Creator Reviews ──

export interface CreatorReviewData {
  _id: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  rating: number;
  createdAt: string;
}

export async function getCreatorReviews(slug: string): Promise<{ reviews: CreatorReviewData[]; avg: number; count: number }> {
  await connectDB();
  const reviews = await CreatorReview.find({ creatorSlug: slug, status: 'approved', author: { $ne: null } })
    .sort({ createdAt: -1 })
    .limit(20)
    .populate('author', 'username firstName photoUrl isProfileVisible')
    .lean() as any[];

  const mapped = reviews.map((r: any) => {
    const author = r.author && typeof r.author === 'object' ? r.author : null;
    let authorName = 'Anonymous';
    let authorAvatar = '';

    if (author) {
      if (author.isProfileVisible !== false) {
        authorName = author.firstName?.trim() || author.username || r.authorName || 'Anonymous';
        authorAvatar = author.photoUrl || '';
      }
    } else if (r.authorName && r.authorName !== 'Anonymous') {
      authorName = r.authorName;
    }

    return {
      _id: r._id.toString(),
      authorName,
      authorAvatar,
      content: r.content || '',
      rating: r.rating,
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : '',
    };
  });

  // Legacy group grid reviews (Post) — merged so flame reads one list per slug.
  const group = await Group.findOne({ slug }).select('_id').lean() as { _id: unknown } | null;
  let legacyMapped: CreatorReviewData[] = [];
  if (group?._id) {
    const legacyPosts = await Post.find({ groupId: group._id, status: 'approved', author: { $ne: null } })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean() as any[];
    legacyMapped = legacyPosts.map((r: any) => ({
      _id: `post-${r._id.toString()}`,
      authorName: r.authorName || 'Anonymous',
      authorAvatar: '',
      content: r.content || '',
      rating: r.rating,
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : '',
    }));
  }

  const combined = [...mapped, ...legacyMapped]
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, 20);

  const count = combined.length;
  const avg = count > 0 ? Math.round((combined.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10 : 0;

  return { reviews: combined, avg, count };
}

export async function submitCreatorReview(slug: string, rating: number, content: string, token: string) {
  if (rating < 1 || rating > 5) throw new Error('Rating must be 1–5');
  if (content.length > 1000) throw new Error('Review too long');
  if (!token) throw new Error('Login required to submit a review');

  let userId: string | null = null;
  let authorName = 'Member';
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    await connectDB();
    const user = await User.findById(decoded.id).select('username firstName photoUrl isProfileVisible').lean() as any;
    if (user) {
      userId = user._id.toString();
      if (user.isProfileVisible !== false) {
        authorName = user.firstName?.trim() || user.username || 'Member';
      }
    }
  } catch {
    throw new Error('Login required to submit a review');
  }
  if (!userId) throw new Error('Login required to submit a review');

  await connectDB();

  const existing = await CreatorReview.findOne({ creatorSlug: slug, author: userId });
  if (existing) {
    existing.content = content.trim();
    existing.rating = Math.round(rating);
    existing.authorName = authorName;
    existing.status = 'approved';
    await existing.save();
    return { _id: existing._id.toString() };
  }

  const review = await CreatorReview.create({
    creatorSlug: slug,
    author: userId,
    authorName,
    content: content.trim(),
    rating: Math.round(rating),
    status: 'approved',
  });

  return { _id: review._id.toString() };
}
