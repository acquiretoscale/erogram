'use server';

import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import { OnlyFansCreator, ProfileFeedComment, ProfileFeedLike, User } from '@/lib/models';
import { getAinsfwProfileFeedStubs, parseAinsfwMediaKey } from '@/lib/ainsfw/profileFeedItems';
import { getToolBySlug } from '@/app/ainsfw/data';
import { buildInterestsCreatorMatch, rotateFeedResults, seededShuffle } from '@/lib/tags/ofSearchMatch';
import { getCreatorFeedCategories } from '@/lib/tags/creatorProfileTags';
import { getTagDefinition } from '@/lib/tags/registry';

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';
const FEED_CREATOR_POOL = 100;
const FEED_PAGE_SIZE = 12;
const COMMENTS_PER_POST = 30;

function mapCommentRow(r: any): ProfileFeedCommentItem {
  return {
    _id: r._id.toString(),
    authorName: r.authorName || 'User',
    content: r.content,
    createdAt: r.createdAt?.toISOString?.() || '',
  };
}

export type ProfileFeedMediaItem = {
  mediaKey: string;
  type: 'photo' | 'video';
  url: string;
  creatorId: string;
  creatorName: string;
  creatorUsername: string;
  profileCategories: { slug: string; label: string }[];
  categoryLabel: string;
  likeCount: number;
  commentCount: number;
  liked: boolean;
  comments: ProfileFeedCommentItem[];
  source?: 'onlyfans' | 'ainsfw';
  brandLogo?: string;
  toolSlug?: string;
  tryNowUrl?: string;
};

export type ProfileFeedCommentItem = {
  _id: string;
  authorName: string;
  content: string;
  createdAt: string;
};

function mediaKeyFor(creatorId: string, type: string, url: string) {
  return `${creatorId}:${type}:${url}`;
}

export type CreatorMediaEngagement = {
  mediaKey: string;
  type: 'photo' | 'video';
  url: string;
  likeCount: number;
  commentCount: number;
  liked: boolean;
  comments: ProfileFeedCommentItem[];
};

async function getUserIdFromToken(token: string): Promise<string | null> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id?: string };
    return decoded?.id || null;
  } catch {
    return null;
  }
}

function tagLabelForSlug(slug: string): string {
  return getTagDefinition(slug)?.label || slug.replace(/-/g, ' ');
}

function collectMedia(c: {
  avatar?: string;
  header?: string;
  extraPhotos?: string[];
  extraVideos?: string[];
}) {
  const items: { type: 'photo' | 'video'; url: string }[] = [];
  for (const url of c.extraVideos || []) {
    if (url?.startsWith('http')) items.push({ type: 'video', url });
  }
  for (const url of c.extraPhotos || []) {
    if (url?.startsWith('http')) items.push({ type: 'photo', url });
  }
  if (c.header?.startsWith('http')) items.push({ type: 'photo', url: c.header });
  if (c.avatar?.startsWith('http')) items.push({ type: 'photo', url: c.avatar });
  return items;
}

type ProfileFeedMediaStub = Omit<
  ProfileFeedMediaItem,
  'likeCount' | 'commentCount' | 'liked' | 'comments'
>;

/** AINSFW at post 2 (index 1), then every 20 posts: 22, 42, 62… */
function isAinsfwFeedSlot(zeroBasedIndex: number) {
  return zeroBasedIndex >= 1 && (zeroBasedIndex - 1) % 20 === 0;
}

function buildProfileFeedOrder(
  ofItems: ProfileFeedMediaStub[],
  ainsfwItems: ProfileFeedMediaStub[],
  seed: string,
): ProfileFeedMediaStub[] {
  if (!ofItems.length) {
    return ainsfwItems.length ? seededShuffle(ainsfwItems, `${seed}:ainsfw-only`) : [];
  }
  if (!ainsfwItems.length) {
    return seededShuffle(ofItems, seed);
  }

  const shuffledOf = seededShuffle(ofItems, seed);
  const shuffledAinsfw = seededShuffle(ainsfwItems, `${seed}:ainsfw`);
  const out: ProfileFeedMediaStub[] = [];
  let ofIdx = 0;
  let ainsfwIdx = 0;

  const nextAinsfw = () => {
    const item = shuffledAinsfw[ainsfwIdx % shuffledAinsfw.length];
    ainsfwIdx += 1;
    return item;
  };

  while (ofIdx < shuffledOf.length) {
    const pos = out.length;
    if (isAinsfwFeedSlot(pos)) {
      out.push(nextAinsfw());
    } else {
      out.push(shuffledOf[ofIdx++]);
    }
  }

  return out;
}

export type ProfileLikedMediaItem = {
  mediaKey: string;
  type: 'photo' | 'video';
  url: string;
  creatorId: string;
  creatorName: string;
  creatorUsername: string;
  likedAt: string;
  source?: 'onlyfans' | 'ainsfw';
  brandLogo?: string;
  toolSlug?: string;
};

function applyLikedMediaOrder(items: ProfileLikedMediaItem[], order: string[]): ProfileLikedMediaItem[] {
  const map = new Map(items.map((item) => [item.mediaKey, item]));
  const out: ProfileLikedMediaItem[] = [];
  for (const key of order) {
    const item = map.get(key);
    if (item) {
      out.push(item);
      map.delete(key);
    }
  }
  for (const item of items) {
    if (map.has(item.mediaKey)) out.push(item);
  }
  return out;
}

export async function getProfileLikedMedia(token: string): Promise<{
  ok: boolean;
  items: ProfileLikedMediaItem[];
}> {
  const userId = await getUserIdFromToken(token);
  if (!userId) return { ok: false, items: [] };

  await connectDB();
  const user = await User.findById(userId).select('likedMediaOrder').lean() as { likedMediaOrder?: string[] } | null;
  const savedOrder = Array.isArray(user?.likedMediaOrder) ? user.likedMediaOrder : [];

  const likes = await ProfileFeedLike.find({ userId })
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();

  if (!likes.length) return { ok: true, items: [] };

  const creatorIds = [...new Set(likes.map((l) => String(l.creatorId)).filter((id) => !id.startsWith('ainsfw:')))];
  const creators = creatorIds.length
    ? await OnlyFansCreator.find({ _id: { $in: creatorIds } })
        .select('name username')
        .lean()
    : [];
  const creatorMap = new Map(
    creators.map((c) => [String(c._id), { name: c.name as string, username: c.username as string }]),
  );

  const items: ProfileLikedMediaItem[] = [];
  for (const like of likes as any[]) {
    const key = like.mediaKey as string;
    const first = key.indexOf(':');
    const second = key.indexOf(':', first + 1);
    if (first < 0 || second < 0) continue;

    const ainsfwParsed = parseAinsfwMediaKey(key);
    if (ainsfwParsed) {
      const tool = getToolBySlug(ainsfwParsed.slug);
      items.push({
        mediaKey: key,
        type: 'video',
        url: ainsfwParsed.url,
        creatorId: `ainsfw:${ainsfwParsed.slug}`,
        creatorName: tool?.name || ainsfwParsed.slug,
        creatorUsername: ainsfwParsed.slug,
        likedAt: like.createdAt?.toISOString?.() || '',
        source: 'ainsfw',
        brandLogo: tool?.image,
        toolSlug: ainsfwParsed.slug,
      });
      continue;
    }

    const creatorId = key.slice(0, first);
    const type = key.slice(first + 1, second) as 'photo' | 'video';
    const url = key.slice(second + 1);
    if ((type !== 'photo' && type !== 'video') || !url.startsWith('http')) continue;

    const creator = creatorMap.get(creatorId);
    items.push({
      mediaKey: key,
      type,
      url,
      creatorId,
      creatorName: creator?.name || creator?.username || 'Creator',
      creatorUsername: creator?.username || '',
      likedAt: like.createdAt?.toISOString?.() || '',
      source: 'onlyfans',
    });
  }

  return { ok: true, items: applyLikedMediaOrder(items, savedOrder) };
}

export async function saveLikedMediaOrder(token: string, order: string[]) {
  const userId = await getUserIdFromToken(token);
  if (!userId) return { ok: false as const, message: 'Unauthorized' };

  const clean = order.filter((key) => typeof key === 'string' && key.split(':').length >= 3);
  await connectDB();
  await User.findByIdAndUpdate(userId, { $set: { likedMediaOrder: clean } });
  return { ok: true as const };
}

export async function getProfileMediaFeed(
  token: string,
  options: { rotateSeed?: string; offset?: number; limit?: number } = {},
): Promise<{
  ok: boolean;
  items: ProfileFeedMediaItem[];
  needsInterests?: boolean;
  hasMore: boolean;
  nextOffset: number;
}> {
  const rotateSeed = options.rotateSeed ?? 'default';
  const offset = Math.max(0, options.offset ?? 0);
  const limit = Math.min(Math.max(1, options.limit ?? FEED_PAGE_SIZE), 48);
  const userId = await getUserIdFromToken(token);
  if (!userId) return { ok: false, items: [], hasMore: false, nextOffset: 0 };

  await connectDB();
  const user = await User.findById(userId)
    .select('preferredPlatforms interests firstName username')
    .lean() as {
      preferredPlatforms?: string[];
      interests?: string[];
      firstName?: string;
      username?: string;
    } | null;
  if (!user) return { ok: false, items: [], hasMore: false, nextOffset: 0 };

  const tagSlugs = user.interests || [];
  const ainsfwStubs = getAinsfwProfileFeedStubs().map((item) => ({ ...item, source: 'ainsfw' as const }));

  const day = new Date().toISOString().slice(0, 10);
  let picked: any[] = [];

  if (tagSlugs.length > 0) {
    const perSlug = Math.max(8, Math.ceil(FEED_CREATOR_POOL / tagSlugs.length));
    const slugRows = await Promise.all(
      tagSlugs.map(async (slug) => {
        const match = buildInterestsCreatorMatch([slug]);
        if (!match) return [] as any[];
        const rows = await OnlyFansCreator.aggregate([
          {
            $match: {
              $and: [
                match,
                {
                  $or: [
                    { 'extraPhotos.0': { $exists: true } },
                    { 'extraVideos.0': { $exists: true } },
                    { header: { $regex: /^https?:\/\// } },
                    { avatar: { $regex: /^https?:\/\// } },
                  ],
                },
              ],
            },
          },
          { $sort: { clicks: -1, likesCount: -1, _id: 1 } },
          { $limit: perSlug },
          {
            $project: {
              name: 1,
              username: 1,
              avatar: 1,
              header: 1,
              extraPhotos: 1,
              extraVideos: 1,
              categories: 1,
              bio: 1,
              location: 1,
            },
          },
        ]);
        const seed = `${userId}:${day}:${rotateSeed}:${slug}`;
        return rotateFeedResults(rows as any[], seed, perSlug);
      }),
    );

    const seenCreator = new Set<string>();
    for (const batch of slugRows) {
      for (const c of batch) {
        const id = c._id?.toString?.() || '';
        if (!id || seenCreator.has(id)) continue;
        seenCreator.add(id);
        picked.push(c);
      }
    }
  }

  const flat: ProfileFeedMediaStub[] = [];
  const seenMedia = new Set<string>();

  for (const c of picked) {
    const creatorId = c._id.toString();
    const username = c.username || '';
    if (!username) continue;
    const profileCategories = getCreatorFeedCategories({
      categories: (c.categories || []) as string[],
      bio: c.bio,
      name: c.name,
      username: c.username,
      location: c.location,
    });

    for (const m of collectMedia(c)) {
      const key = mediaKeyFor(creatorId, m.type, m.url);
      if (seenMedia.has(key)) continue;
      seenMedia.add(key);
      flat.push({
        mediaKey: key,
        type: m.type,
        url: m.url,
        creatorId,
        creatorName: c.name || username,
        creatorUsername: username,
        profileCategories,
        categoryLabel: profileCategories[0]?.label || '',
        source: 'onlyfans',
      });
    }
  }

  if (!flat.length && !ainsfwStubs.length) {
    return {
      ok: true,
      items: [],
      needsInterests: tagSlugs.length === 0,
      hasMore: false,
      nextOffset: 0,
    };
  }

  const feedOrderSeed = `${userId}:${day}:${rotateSeed}`;
  const ordered = buildProfileFeedOrder(flat, ainsfwStubs, feedOrderSeed);
  const pageItems = ordered.slice(offset, offset + limit);
  if (!pageItems.length) {
    return {
      ok: true,
      items: [],
      needsInterests: tagSlugs.length === 0,
      hasMore: false,
      nextOffset: offset,
    };
  }

  const mediaKeys = pageItems.map((i) => i.mediaKey);

  const [likeCounts, userLikes, commentCounts, commentRows] = await Promise.all([
    ProfileFeedLike.aggregate([
      { $match: { mediaKey: { $in: mediaKeys } } },
      { $group: { _id: '$mediaKey', count: { $sum: 1 } } },
    ]),
    ProfileFeedLike.find({ mediaKey: { $in: mediaKeys }, userId }).select('mediaKey').lean(),
    ProfileFeedComment.aggregate([
      { $match: { mediaKey: { $in: mediaKeys }, status: 'approved' } },
      { $group: { _id: '$mediaKey', count: { $sum: 1 } } },
    ]),
    ProfileFeedComment.find({ mediaKey: { $in: mediaKeys }, status: 'approved', author: { $ne: null } })
      .sort({ createdAt: 1 })
      .limit(mediaKeys.length * COMMENTS_PER_POST)
      .lean(),
  ]);

  const likeMap = new Map(likeCounts.map((r: any) => [r._id, r.count]));
  const commentMap = new Map(commentCounts.map((r: any) => [r._id, r.count]));
  const likedSet = new Set(userLikes.map((r: any) => r.mediaKey));

  const commentsByKey = new Map<string, ProfileFeedCommentItem[]>();
  for (const row of commentRows as any[]) {
    const key = row.mediaKey as string;
    const list = commentsByKey.get(key) || [];
    if (list.length >= COMMENTS_PER_POST) continue;
    list.push(mapCommentRow(row));
    commentsByKey.set(key, list);
  }

  const nextOffset = offset + pageItems.length;
  return {
    ok: true,
    items: pageItems.map((item) => ({
      ...item,
      likeCount: likeMap.get(item.mediaKey) || 0,
      commentCount: commentMap.get(item.mediaKey) || 0,
      liked: likedSet.has(item.mediaKey),
      comments: commentsByKey.get(item.mediaKey) || [],
    })),
    hasMore: nextOffset < ordered.length,
    nextOffset,
  };
}

export async function toggleProfileFeedLike(token: string, mediaKey: string, creatorId: string) {
  const userId = await getUserIdFromToken(token);
  if (!userId) return { ok: false as const, message: 'Unauthorized' };

  if (!mediaKey || !creatorId) return { ok: false as const, message: 'Invalid item' };

  await connectDB();
  const existing = await ProfileFeedLike.findOne({ mediaKey, userId });
  if (existing) {
    await ProfileFeedLike.deleteOne({ _id: existing._id });
  } else {
    await ProfileFeedLike.create({ mediaKey, creatorId, userId });
  }

  const likeCount = await ProfileFeedLike.countDocuments({ mediaKey });
  return { ok: true as const, liked: !existing, likeCount };
}

export async function getProfileFeedComments(token: string, mediaKey: string) {
  const userId = await getUserIdFromToken(token);
  if (!userId) return { ok: false as const, comments: [] as ProfileFeedCommentItem[] };

  await connectDB();
  const rows = await ProfileFeedComment.find({ mediaKey, status: 'approved', author: { $ne: null } })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  return {
    ok: true as const,
    comments: rows.map(mapCommentRow),
  };
}

export async function postProfileFeedComment(
  token: string,
  mediaKey: string,
  creatorId: string,
  content: string,
) {
  const userId = await getUserIdFromToken(token);
  if (!userId) return { ok: false as const, message: 'Unauthorized' };

  const trimmed = content.trim().slice(0, 500);
  if (!trimmed) return { ok: false as const, message: 'Comment is empty' };
  if (!mediaKey || !creatorId) return { ok: false as const, message: 'Invalid item' };

  await connectDB();
  const user = await User.findById(userId).select('firstName username').lean() as {
    firstName?: string;
    username?: string;
  } | null;

  const doc = await ProfileFeedComment.create({
    mediaKey,
    creatorId,
    author: userId,
    authorName: user?.firstName || user?.username || 'User',
    content: trimmed,
    status: 'approved',
  });

  const commentCount = await ProfileFeedComment.countDocuments({ mediaKey, status: 'approved' });

  return {
    ok: true as const,
    comment: {
      _id: doc._id.toString(),
      authorName: doc.authorName,
      content: doc.content,
      createdAt: doc.createdAt?.toISOString?.() || new Date().toISOString(),
    } satisfies ProfileFeedCommentItem,
    commentCount,
  };
}

export async function getCreatorMediaEngagement(
  token: string | null,
  creatorId: string,
  items: { type: 'photo' | 'video'; url: string }[],
): Promise<{ ok: boolean; items: CreatorMediaEngagement[] }> {
  if (!creatorId || !items.length) return { ok: true, items: [] };

  await connectDB();
  const userId = token ? await getUserIdFromToken(token) : null;
  const mediaKeys = items.map((i) => mediaKeyFor(creatorId, i.type, i.url));

  const [likeCounts, userLikes, commentCounts, commentRows] = await Promise.all([
    ProfileFeedLike.aggregate([
      { $match: { mediaKey: { $in: mediaKeys } } },
      { $group: { _id: '$mediaKey', count: { $sum: 1 } } },
    ]),
    userId
      ? ProfileFeedLike.find({ mediaKey: { $in: mediaKeys }, userId }).select('mediaKey').lean()
      : Promise.resolve([]),
    ProfileFeedComment.aggregate([
      { $match: { mediaKey: { $in: mediaKeys }, status: 'approved' } },
      { $group: { _id: '$mediaKey', count: { $sum: 1 } } },
    ]),
    ProfileFeedComment.find({ mediaKey: { $in: mediaKeys }, status: 'approved', author: { $ne: null } })
      .sort({ createdAt: 1 })
      .limit(mediaKeys.length * COMMENTS_PER_POST)
      .lean(),
  ]);

  const likeMap = new Map(likeCounts.map((r: any) => [r._id, r.count]));
  const commentMap = new Map(commentCounts.map((r: any) => [r._id, r.count]));
  const likedSet = new Set((userLikes as any[]).map((r) => r.mediaKey));

  const commentsByKey = new Map<string, ProfileFeedCommentItem[]>();
  for (const row of commentRows as any[]) {
    const key = row.mediaKey as string;
    const list = commentsByKey.get(key) || [];
    if (list.length >= COMMENTS_PER_POST) continue;
    list.push(mapCommentRow(row));
    commentsByKey.set(key, list);
  }

  return {
    ok: true,
    items: items.map((item) => {
      const mediaKey = mediaKeyFor(creatorId, item.type, item.url);
      return {
        mediaKey,
        type: item.type,
        url: item.url,
        likeCount: likeMap.get(mediaKey) || 0,
        commentCount: commentMap.get(mediaKey) || 0,
        liked: likedSet.has(mediaKey),
        comments: commentsByKey.get(mediaKey) || [],
      };
    }),
  };
}

export async function getBatchMediaEngagement(
  token: string | null,
  items: { creatorId: string; type: 'photo' | 'video'; url: string }[],
): Promise<{ ok: boolean; items: CreatorMediaEngagement[] }> {
  const valid = items.filter((i) => i.creatorId && i.url?.startsWith('http'));
  if (!valid.length) return { ok: true, items: [] };

  await connectDB();
  const userId = token ? await getUserIdFromToken(token) : null;
  const mediaKeys = valid.map((i) => mediaKeyFor(i.creatorId, i.type, i.url));

  const [likeCounts, userLikes, commentCounts, commentRows] = await Promise.all([
    ProfileFeedLike.aggregate([
      { $match: { mediaKey: { $in: mediaKeys } } },
      { $group: { _id: '$mediaKey', count: { $sum: 1 } } },
    ]),
    userId
      ? ProfileFeedLike.find({ mediaKey: { $in: mediaKeys }, userId }).select('mediaKey').lean()
      : Promise.resolve([]),
    ProfileFeedComment.aggregate([
      { $match: { mediaKey: { $in: mediaKeys }, status: 'approved' } },
      { $group: { _id: '$mediaKey', count: { $sum: 1 } } },
    ]),
    ProfileFeedComment.find({ mediaKey: { $in: mediaKeys }, status: 'approved', author: { $ne: null } })
      .sort({ createdAt: 1 })
      .limit(mediaKeys.length * COMMENTS_PER_POST)
      .lean(),
  ]);

  const likeMap = new Map(likeCounts.map((r: any) => [r._id, r.count]));
  const commentMap = new Map(commentCounts.map((r: any) => [r._id, r.count]));
  const likedSet = new Set((userLikes as any[]).map((r) => r.mediaKey));

  const commentsByKey = new Map<string, ProfileFeedCommentItem[]>();
  for (const row of commentRows as any[]) {
    const key = row.mediaKey as string;
    const list = commentsByKey.get(key) || [];
    if (list.length >= COMMENTS_PER_POST) continue;
    list.push(mapCommentRow(row));
    commentsByKey.set(key, list);
  }

  return {
    ok: true,
    items: valid.map((item) => {
      const mediaKey = mediaKeyFor(item.creatorId, item.type, item.url);
      return {
        mediaKey,
        type: item.type,
        url: item.url,
        likeCount: likeMap.get(mediaKey) || 0,
        commentCount: commentMap.get(mediaKey) || 0,
        liked: likedSet.has(mediaKey),
        comments: commentsByKey.get(mediaKey) || [],
      };
    }),
  };
}
