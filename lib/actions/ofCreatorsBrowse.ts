'use server';

import connectDB from '@/lib/db/mongodb';
import { Types } from 'mongoose';
import { Campaign, OnlyFansCreator, ProfileFeedLike, TrendingOFCreator, User } from '@/lib/models';
import { campaignNotExpired } from '@/lib/campaignDates';
import { whaleBrowseLikesFilter } from '@/lib/tags/creatorMatch';
import {
  buildBrowseQualityMatch,
  buildSearchOrClauses,
  buildSearchTierStage,
  expandSearchQuery,
  rotateSearchResults,
} from '@/lib/tags/ofSearchMatch';
import { buildNicheMatchClause, buildSlugCreatorMatch, creatorQualityFilter } from '@/lib/tags/creatorMatch';
import {
  OF_RESULTS_PAGE_SIZE,
  type ProfilePremiumSearchFilters,
} from '@/lib/actions/ofCreatorsBrowse.shared';

function buildR2AvatarMatch() {
  const raw = process.env.R2_PUBLIC_URL || '';
  if (!raw) return { $ne: '' };
  try {
    const host = new URL(raw).host.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return { $regex: new RegExp(host, 'i') };
  } catch {
    return { $ne: '' };
  }
}

/** Unique extra photos beyond avatar + cover — matches OnlyFansClient communityExtras. */
function countUniqueExtraPhotos(creator: {
  avatar?: string;
  header?: string;
  extraPhotos?: string[];
}): number {
  const avatar = (creator.avatar || '').trim();
  const cover = (creator.header || '').trim();
  const seen = new Set<string>([avatar, cover].filter(Boolean));
  let count = 0;
  for (const url of creator.extraPhotos || []) {
    const u = (url || '').trim();
    if (!u.startsWith('http') || seen.has(u)) continue;
    seen.add(u);
    count++;
  }
  return count;
}

const CREATOR_PROJECT = {
  $project: {
    name: 1, username: 1, slug: 1, avatar: 1, header: 1,
    categories: 1, subscriberCount: 1,
    likesCount: 1, photosCount: 1, videosCount: 1,
    price: 1, isFree: 1, url: 1, clicks: 1, redirectToOF: 1,
  },
};

// ---------------------------------------------------------------------------
// Browse — random creators excluding already-loaded IDs
// ---------------------------------------------------------------------------

export async function browseCreators(excludeIds: string[] = [], limit = 80) {
  await connectDB();

  const match: Record<string, any> = {
    avatar: buildR2AvatarMatch(),
    gender: 'female',
    categories: { $exists: true, $ne: [] },
    deleted: { $ne: true },
    ...whaleBrowseLikesFilter,
  };

  if (excludeIds.length > 0) {
    match._id = { $nin: excludeIds.map((id) => new Types.ObjectId(id)) };
  }

  const [creators, total] = await Promise.all([
    OnlyFansCreator.aggregate([
      { $match: match },
      { $sample: { size: Math.min(limit, 200) } },
      CREATOR_PROJECT,
    ]),
    OnlyFansCreator.estimatedDocumentCount(),
  ]);

  const hasMore = excludeIds.length + creators.length < total;

  return {
    creators: creators.map((c: any) => ({ ...c, _id: c._id.toString() })),
    hasMore,
    total,
  };
}

// ---------------------------------------------------------------------------
// Search — synonym-aware full-text search
// ---------------------------------------------------------------------------

const MAX_TOTAL = 1000;
/** Public /onlyfanssearch — pool + max results per search. */
const SEARCH_POOL = 100;
/** Premium profile search — deeper pool, per-user rotation. */
const PROFILE_PREMIUM_SEARCH_POOL = 400;
async function stripNonPremiumFilters(
  filters: ProfilePremiumSearchFilters,
  token?: string,
): Promise<ProfilePremiumSearchFilters> {
  if (!filters.hasInstagram && !(filters.joinWithinDays && filters.joinWithinDays > 0)) {
    return filters;
  }
  const userId = token ? await requirePremiumUserId(token) : null;
  if (userId) return filters;
  return {
    ...filters,
    hasInstagram: undefined,
    joinWithinDays: undefined,
  };
}

const HUB_BROWSE_PROJECT = {
  $project: {
    name: 1, username: 1, slug: 1, avatar: 1, header: 1,
    categories: 1, subscriberCount: 1,
    likesCount: 1, photosCount: 1, videosCount: 1, mediaCount: 1,
    price: 1, isFree: 1, url: 1, clicks: 1, redirectToOF: 1,
    instagramUrl: 1, instagramUsername: 1, joinDate: 1, createdAt: 1,
    bio: 1,
  },
};

/** Paginated category browse for /onlyfanssearch/{slug} — stable clicks ranking. */
export async function browseCategoryCreators(
  categorySlug: string,
  offset = 0,
  limit = OF_RESULTS_PAGE_SIZE,
) {
  await connectDB();

  const skip = Math.max(0, offset);
  const pageSize = Math.min(Math.max(1, limit), 48);
  const baseMatch = buildSlugCreatorMatch(categorySlug);

  const rows = await OnlyFansCreator.find(baseMatch)
    .sort({ clicks: -1, likesCount: -1, _id: 1 })
    .skip(skip)
    .limit(pageSize + 1)
    .select(
      'name username slug avatar header bio subscriberCount likesCount photosCount videosCount price isFree isVerified url clicks',
    )
    .lean();

  const seen = new Set<string>();
  const creators: Record<string, unknown>[] = [];
  for (const raw of rows as Record<string, unknown>[]) {
    const username = String(raw.username || '').toLowerCase();
    if (!username || seen.has(username)) continue;
    seen.add(username);
    creators.push({
      ...raw,
      _id: String(raw._id),
      bio: String(raw.bio || '').slice(0, 200),
    });
    if (creators.length > pageSize) break;
  }

  const hasMore = creators.length > pageSize;
  const page = creators.slice(0, pageSize);

  return {
    ok: true as const,
    creators: page,
    hasMore,
    nextOffset: skip + page.length,
  };
}

/**
 * After a category feed is exhausted, fill with creators from the same related cluster
 * (e.g. brazilian → colombian, latina, mexican…). Falls back to generic browse when
 * the slug has no cluster.
 */
export async function browseClusterFillCreators(
  categorySlug: string,
  excludeIds: string[] = [],
  limit = 20,
) {
  const { getRelatedRankingSlugs } = await import('@/lib/bestOnlyfansAccounts/relatedRankings');
  const siblings = getRelatedRankingSlugs(categorySlug);
  if (!siblings.length) {
    return browseCreators(excludeIds, limit);
  }

  await connectDB();
  const pageSize = Math.min(Math.max(1, limit), 48);
  const excludeObjectIds = excludeIds
    .filter((id) => Types.ObjectId.isValid(id))
    .map((id) => new Types.ObjectId(id));
  const seenIds = new Set(excludeIds);
  const creators: Record<string, unknown>[] = [];

  for (const sibling of siblings) {
    if (creators.length >= pageSize + 1) break;
    const need = pageSize + 1 - creators.length;
    const match: Record<string, unknown> = {
      ...buildSlugCreatorMatch(sibling),
    };
    if (excludeObjectIds.length || creators.length) {
      const nin = [
        ...excludeObjectIds,
        ...creators
          .map((c) => c._id)
          .filter((id): id is string => typeof id === 'string' && Types.ObjectId.isValid(id))
          .map((id) => new Types.ObjectId(id)),
      ];
      if (nin.length) match._id = { $nin: nin };
    }

    const rows = await OnlyFansCreator.find(match)
      .sort({ clicks: -1, likesCount: -1, _id: 1 })
      .limit(need)
      .select(
        'name username slug avatar header bio subscriberCount likesCount photosCount videosCount price isFree isVerified url clicks',
      )
      .lean();

    for (const raw of rows as Record<string, unknown>[]) {
      const id = String(raw._id);
      if (seenIds.has(id)) continue;
      seenIds.add(id);
      creators.push({
        ...raw,
        _id: id,
        bio: String(raw.bio || '').slice(0, 200),
      });
      if (creators.length > pageSize) break;
    }
  }

  const hasMore = creators.length > pageSize;
  const page = creators.slice(0, pageSize);

  return {
    creators: page,
    hasMore,
    total: page.length,
  };
}

/** Filtered hub browse for /onlyfans hero — niches + price + premium toggles, optional text query. */
export async function hubBrowseCreators(
  filters: ProfilePremiumSearchFilters & { query?: string },
  rotateSeed = 'default',
  token?: string,
  pagination: { offset?: number; limit?: number } = {},
) {
  const offset = Math.max(0, pagination.offset ?? 0);
  const limit = Math.min(Math.max(1, pagination.limit ?? OF_RESULTS_PAGE_SIZE), 48);
  await connectDB();

  const effectiveFilters = await stripNonPremiumFilters(filters, token);

  const nicheGroups = (effectiveFilters.nicheGroups || filters.nicheGroups || []).filter((g) => g.length > 0);
  let match: Record<string, unknown> = { ...creatorQualityFilter };

  if (nicheGroups.length > 0) {
    const andClauses = nicheGroups.map((group) => {
      if (group.length === 1) return buildNicheMatchClause(group[0]);
      return { $or: group.map((slug) => buildNicheMatchClause(slug)) };
    });
    if (andClauses.length === 1) {
      match = { ...match, ...andClauses[0] };
    } else {
      match = { ...match, $and: andClauses };
    }
  }

  const trimmed = filters.query?.trim() || '';
  if (trimmed) {
    const plan = expandSearchQuery(trimmed);
    if (plan) {
      const searchMatch = buildBrowseQualityMatch(buildSearchOrClauses(plan));
      match = { $and: [match, searchMatch] };
    } else {
      return { ok: true as const, creators: [] as any[], hasMore: false, nextOffset: 0 };
    }
  }

  const filterStages = buildPremiumFilterStages(effectiveFilters);
  const pipeline: Record<string, unknown>[] = [{ $match: match }, ...filterStages];

  const sortByFreshness = (effectiveFilters.joinWithinDays || 0) > 0;

  if (trimmed) {
    const plan = expandSearchQuery(trimmed)!;
    pipeline.push(buildSearchTierStage(plan));
    pipeline.push({
      $sort: sortByFreshness
        ? { _searchTier: -1, createdAt: -1, clicks: -1, _id: 1 }
        : { _searchTier: -1, clicks: -1, likesCount: -1, _id: 1 },
    });
  } else if (sortByFreshness) {
    pipeline.push({ $sort: { createdAt: -1, clicks: -1, _id: 1 } });
  } else {
    pipeline.push({ $sort: { clicks: -1, likesCount: -1, _id: 1 } });
  }

  pipeline.push({ $limit: PROFILE_PREMIUM_SEARCH_POOL }, HUB_BROWSE_PROJECT);

  const creators = await OnlyFansCreator.aggregate(pipeline as any[]);
  const rotated = rotateSearchResults(
    creators as any[],
    trimmed || nicheGroups.flat().join('+') || 'hub',
    offset,
    limit + 1,
    `hub-browse:${rotateSeed}:${JSON.stringify(effectiveFilters)}`,
  );
  const hasMore = rotated.length > limit;
  const page = rotated.slice(0, limit);

  return {
    ok: true as const,
    creators: page.map(({ _searchTier, ...c }: any) => ({ ...c, _id: c._id.toString() })),
    hasMore,
    nextOffset: offset + page.length,
  };
}

function buildPremiumFilterStages(filters: ProfilePremiumSearchFilters) {
  const stages: Record<string, unknown>[] = [];
  const price = filters.price || 'all';
  const minMedia = Math.max(0, filters.minMedia || 0);
  const minPrice = Math.max(0, filters.minPrice || 0);
  const maxPrice = Math.max(0, filters.maxPrice || 0);
  const joinWithinDays = Math.max(0, filters.joinWithinDays || 0);

  stages.push({
    $addFields: {
      _mediaTotal: {
        $cond: [
          { $gt: [{ $ifNull: ['$mediaCount', 0] }, 0] },
          '$mediaCount',
          {
            $add: [
              { $ifNull: ['$photosCount', 0] },
              { $ifNull: ['$videosCount', 0] },
            ],
          },
        ],
      },
    },
  });

  const filterMatch: Record<string, unknown> = {};
  if (price === 'free') filterMatch.isFree = true;
  if (price === 'paid') filterMatch.isFree = { $ne: true };
  if (minMedia > 0) filterMatch._mediaTotal = { $gte: minMedia };

  if (minPrice > 0 || maxPrice > 0) {
    const priceRange: Record<string, number> = {};
    if (minPrice > 0) priceRange.$gte = minPrice;
    if (maxPrice > 0) priceRange.$lte = maxPrice;
    filterMatch.price = priceRange;
    if (price !== 'free') filterMatch.isFree = { $ne: true };
  }

  if (filters.hasInstagram) {
    filterMatch.$or = [
      { instagramUrl: { $exists: true, $nin: ['', null] } },
      { instagramUsername: { $exists: true, $nin: ['', null] } },
    ];
  }

  if (joinWithinDays > 0) {
    filterMatch.createdAt = { $gte: new Date(Date.now() - joinWithinDays * 86400000) };
  }

  if (Object.keys(filterMatch).length > 0) {
    stages.push({ $match: filterMatch });
  }

  return stages;
}

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';

async function requirePremiumUserId(token: string): Promise<string | null> {
  try {
    const jwt = (await import('jsonwebtoken')).default;
    const decoded = jwt.verify(token, JWT_SECRET) as { id?: string };
    if (!decoded?.id) return null;
    await connectDB();
    const user = await User.findById(decoded.id).select('premium premiumExpiresAt isAdmin').lean() as {
      premium?: boolean;
      premiumExpiresAt?: Date | string | null;
      isAdmin?: boolean;
    } | null;
    if (!user) return null;
    if (user.isAdmin) return decoded.id;
    const isPremium =
      user.premium === true &&
      (!user.premiumExpiresAt || new Date(user.premiumExpiresAt) > new Date());
    return isPremium ? decoded.id : null;
  } catch {
    return null;
  }
}

async function runAdvancedSearchCreators(
  q: string,
  rotateSeed: string,
  filters: ProfilePremiumSearchFilters,
  rotateKey: string,
  pagination: { offset?: number; limit?: number } = {},
) {
  const offset = Math.max(0, pagination.offset ?? 0);
  const limit = Math.min(Math.max(1, pagination.limit ?? OF_RESULTS_PAGE_SIZE), 48);
  const trimmed = q.trim();
  if (!trimmed) return { ok: true as const, creators: [] as any[], hasMore: false, nextOffset: 0 };

  await connectDB();

  const plan = expandSearchQuery(trimmed);
  if (!plan) return { ok: true as const, creators: [] as any[], hasMore: false, nextOffset: 0 };

  const match = buildBrowseQualityMatch(buildSearchOrClauses(plan));
  const filterStages = buildPremiumFilterStages(filters);

  const sortByFreshness = (filters.joinWithinDays || 0) > 0;

  const creators = await OnlyFansCreator.aggregate([
    { $match: match },
    buildSearchTierStage(plan),
    ...filterStages,
    {
      $sort: sortByFreshness
        ? { _searchTier: -1, createdAt: -1, clicks: -1, _id: 1 }
        : { _searchTier: -1, clicks: -1, likesCount: -1, _id: 1 },
    },
    { $limit: PROFILE_PREMIUM_SEARCH_POOL },
    {
      $project: {
        name: 1, username: 1, slug: 1, avatar: 1, header: 1,
        categories: 1, subscriberCount: 1,
        likesCount: 1, photosCount: 1, videosCount: 1, mediaCount: 1,
        price: 1, isFree: 1, url: 1, clicks: 1, redirectToOF: 1,
        instagramUrl: 1, instagramUsername: 1, joinDate: 1, createdAt: 1,
        bio: 1,
        _searchTier: 1,
      },
    },
  ] as any[]);

  const rotated = rotateSearchResults(
    creators as any[],
    plan.normalized,
    offset,
    limit + 1,
    `${rotateKey}:${rotateSeed}:${JSON.stringify(filters)}`,
  );
  const hasMore = rotated.length > limit;
  const page = rotated.slice(0, limit);

  return {
    ok: true as const,
    creators: page.map(({ _searchTier, ...c }: any) => ({ ...c, _id: c._id.toString() })),
    hasMore,
    nextOffset: offset + page.length,
  };
}

/** Free advanced search for /onlyfanssearch (no premium gate). */
export async function advancedSearchCreators(
  q: string,
  rotateSeed = 'default',
  filters: ProfilePremiumSearchFilters = {},
  token?: string,
  pagination: { offset?: number; limit?: number } = {},
) {
  const effectiveFilters = await stripNonPremiumFilters(filters, token);
  return runAdvancedSearchCreators(q, rotateSeed, effectiveFilters, 'of-search', pagination);
}

export async function profilePremiumSearchCreators(
  token: string,
  q: string,
  rotateSeed = 'default',
  filters: ProfilePremiumSearchFilters = {},
  pagination: { offset?: number; limit?: number } = {},
) {
  const userId = await requirePremiumUserId(token);
  if (!userId) return { ok: false as const, message: 'Premium required', creators: [], hasMore: false, nextOffset: 0 };

  return runAdvancedSearchCreators(q, rotateSeed, filters, userId, pagination);
}

export async function searchCreators(q: string, limit = 100, skip = 0) {
  const trimmed = q.trim();
  if (!trimmed) return { creators: [], total: 0 };

  await connectDB();

  const plan = expandSearchQuery(trimmed);
  if (!plan) return { creators: [], total: 0 };

  const match = buildBrowseQualityMatch(buildSearchOrClauses(plan));

  const creators = await OnlyFansCreator.aggregate([
    { $match: match },
    buildSearchTierStage(plan),
    { $sort: { _searchTier: -1, clicks: -1, likesCount: -1, _id: 1 } },
    { $limit: SEARCH_POOL },
    {
      $project: {
        name: 1, username: 1, slug: 1, avatar: 1, header: 1,
        categories: 1, subscriberCount: 1,
        likesCount: 1, photosCount: 1, videosCount: 1,
        price: 1, isFree: 1, url: 1, clicks: 1, redirectToOF: 1,
        _searchTier: 1,
      },
    },
  ] as any[]);

  const resultCap = Math.min(Math.max(1, limit), SEARCH_POOL);
  const rotated = rotateSearchResults(
    creators as any[],
    plan.normalized,
    Math.max(0, skip),
    resultCap,
  );
  const total = creators.length;

  return {
    creators: rotated.map(({ _searchTier, ...c }: any) => ({ ...c, _id: c._id.toString() })),
    total,
  };
}

export async function deleteCreatorBySlug(token: string, slug: string) {
  const jwt = (await import('jsonwebtoken')).default;
  const { User } = await import('@/lib/models');
  const { deleteFromR2 } = await import('@/lib/r2');
  const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';
  try {
    const d = jwt.verify(token, JWT_SECRET) as any;
    await connectDB();
    const u = await User.findById(d.id);
    if (!u || !u.isAdmin) throw new Error('Unauthorized');
  } catch (e) {
    if (e instanceof Error && e.message === 'Unauthorized') throw e;
    throw new Error('Unauthorized');
  }

  await connectDB();
  const creator = await OnlyFansCreator.findOne({ slug }).lean() as {
    _id: unknown;
    avatar?: string;
    header?: string;
    extraPhotos?: string[];
  } | null;
  if (!creator) throw new Error('Not found');

  if (creator.avatar) await deleteFromR2(creator.avatar).catch(() => {});
  if (creator.header) await deleteFromR2(creator.header).catch(() => {});
  for (const url of creator.extraPhotos || []) {
    if (url) await deleteFromR2(url).catch(() => {});
  }

  await OnlyFansCreator.deleteOne({ _id: creator._id });
  return { success: true };
}

const TOP_CLICKED_PAGE_SIZE = 24;
const TOP_CLICKED_MAX_PUBLIC = 200;

type TopClickedRow = {
  _id: string;
  name: string;
  username: string;
  slug: string;
  avatar: string;
  likesCount: number;
  photosCount?: number;
  videosCount?: number;
  mediaCount?: number;
  isFree: boolean;
  price: number;
  instagramUrl?: string;
  instagramUsername?: string;
  joinDate?: string;
  bio?: string;
  clicks?: number;
};

export async function getTopClickedOnlyfansCreators(
  excludeUsernames: string[] = [],
  limit = TOP_CLICKED_PAGE_SIZE,
) {
  if (excludeUsernames.length >= TOP_CLICKED_MAX_PUBLIC) {
    return { ok: true as const, creators: [] as TopClickedRow[], hasMore: false };
  }

  await connectDB();

  const match: Record<string, unknown> = {
    ...creatorQualityFilter,
    categories: { $exists: true, $ne: [] },
    clicks: { $gt: 0 },
  };

  if (excludeUsernames.length) {
    match.username = { $nin: excludeUsernames.map((u) => u.toLowerCase()) };
  }

  const queryLimit = Math.min(limit + excludeUsernames.length + 4, 64);
  const rows = await OnlyFansCreator.find(match)
    .sort({ clicks: -1, likesCount: -1, _id: 1 })
    .limit(queryLimit)
    .select(
      'name username slug avatar likesCount photosCount videosCount mediaCount price isFree instagramUrl instagramUsername joinDate bio clicks',
    )
    .lean();

  const seen = new Set<string>();
  const creators: TopClickedRow[] = [];
  for (const raw of rows as Record<string, unknown>[]) {
    const username = String(raw.username || '').toLowerCase();
    if (!username || !raw.avatar || seen.has(username)) continue;
    seen.add(username);
    creators.push({
      _id: String(raw._id),
      name: String(raw.name || raw.username || ''),
      username: String(raw.username || ''),
      slug: String(raw.slug || raw.username || ''),
      avatar: String(raw.avatar || ''),
      likesCount: Number(raw.likesCount) || 0,
      photosCount: raw.photosCount as number | undefined,
      videosCount: raw.videosCount as number | undefined,
      mediaCount: raw.mediaCount as number | undefined,
      isFree: Boolean(raw.isFree),
      price: Number(raw.price) || 0,
      instagramUrl: raw.instagramUrl as string | undefined,
      instagramUsername: raw.instagramUsername as string | undefined,
      joinDate: raw.joinDate as string | undefined,
      bio: raw.bio as string | undefined,
      clicks: Number(raw.clicks) || 0,
    });
    if (creators.length >= limit) break;
  }

  const totalLoaded = excludeUsernames.length + creators.length;
  const hasMore = creators.length >= limit && totalLoaded < TOP_CLICKED_MAX_PUBLIC;

  return { ok: true as const, creators, hasMore };
}

const COMMUNITY_CREATOR_SELECT =
  'name username slug avatar header extraPhotos categories subscriberCount likesCount photosCount videosCount price isFree url clicks redirectToOF instagramUrl twitterUrl tiktokUrl telegramUrl fanslyUrl fanvueUrl redditUrl patreonUrl website linktreeUrl allmylinksUrl beaconsUrl createdAt';

/** Always first in community block, with FEATURED badge in UI. */
const COMMUNITY_FEATURED_TOP = ['abellaolsen', 'amelia_russo'] as const;

function usernameRegex(username: string) {
  return new RegExp(`^${username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
}

function buildTrendingFallbackProfile(
  trending: Record<string, unknown>,
  username: string,
): Record<string, unknown> {
  return {
    _id: trending._id,
    name: trending.name || trending.username || username,
    username: trending.username || username,
    slug: `${username}-onlyfans`,
    avatar: trending.avatar || '',
    header: trending.avatar || '',
    extraPhotos: [],
    categories: [],
    likesCount: 0,
    photosCount: 0,
    videosCount: 0,
    price: 0,
    isFree: true,
    url: trending.url || '',
    clicks: 0,
    createdAt: trending.createdAt,
  };
}

function formatCommunityCreator(
  raw: Record<string, unknown>,
  saveMap: Map<string, number>,
): Record<string, unknown> {
  const id = String(raw._id);
  return {
    ...raw,
    _id: id,
    extraPhotos: Array.isArray(raw.extraPhotos) ? raw.extraPhotos : [],
    erogramSaves: saveMap.get(id) || 0,
    ...(raw.isCommunityFeatured ? { isCommunityFeatured: true } : {}),
  };
}

async function loadCommunityTopFeatured(): Promise<Record<string, unknown>[]> {
  const [rows, trendingFallback] = await Promise.all([
    OnlyFansCreator.find({
      username: { $in: COMMUNITY_FEATURED_TOP.map((u) => usernameRegex(u)) },
      deleted: { $ne: true },
    })
      .select(COMMUNITY_CREATOR_SELECT)
      .lean(),
    TrendingOFCreator.find({
      username: { $in: COMMUNITY_FEATURED_TOP.map((u) => usernameRegex(u)) },
      active: true,
    })
      .select('username name avatar url bio createdAt')
      .lean(),
  ]);

  const byUser = new Map<string, Record<string, unknown>>();
  for (const raw of rows as Record<string, unknown>[]) {
    byUser.set(String(raw.username || '').toLowerCase(), raw);
  }
  for (const raw of trendingFallback as Record<string, unknown>[]) {
    const username = String(raw.username || '').toLowerCase();
    if (!byUser.has(username)) byUser.set(username, buildTrendingFallbackProfile(raw, username));
  }

  return COMMUNITY_FEATURED_TOP.map((username) => byUser.get(username))
    .filter(Boolean)
    .map((profile) => ({ ...profile!, isCommunityFeatured: true }));
}

/** Active featured slots — newest campaign/trending add first in community block. */
async function getRecentlyFeaturedUsernames(): Promise<{ username: string; featuredAt: Date }[]> {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const [campaigns, trending] = await Promise.all([
    Campaign.find({
      status: 'active',
      isVisible: true,
      adType: 'onlyfans-creator',
      ofUsername: { $exists: true, $ne: '' },
      startDate: { $lte: now },
      ...campaignNotExpired(startOfToday),
      placements: 'of-search-featured',
    })
      .select('ofUsername createdAt startDate')
      .sort({ createdAt: -1 })
      .lean(),
    TrendingOFCreator.find({ active: true })
      .select('username createdAt')
      .sort({ createdAt: -1 })
      .lean(),
  ]);

  const featuredAtByUser = new Map<string, Date>();
  const noteFeatured = (username: string, at: Date) => {
    const u = username.trim().toLowerCase();
    if (!u) return;
    const prev = featuredAtByUser.get(u);
    if (!prev || at.getTime() > prev.getTime()) featuredAtByUser.set(u, at);
  };

  for (const c of campaigns as Array<{ ofUsername?: string; createdAt?: Date; startDate?: Date }>) {
    noteFeatured(String(c.ofUsername || ''), new Date(c.createdAt || c.startDate || 0));
  }
  for (const t of trending as Array<{ username?: string; createdAt?: Date }>) {
    noteFeatured(String(t.username || ''), new Date(t.createdAt || 0));
  }

  return [...featuredAtByUser.entries()]
    .sort((a, b) => b[1].getTime() - a[1].getTime())
    .map(([username, featuredAt]) => ({ username, featuredAt }));
}

/** Newest profiles added to the directory — for /onlyfanssearch Community block. */
export async function getNewestOnlyFansCreators(limit = 40) {
  await connectDB();

  const pageSize = Math.min(Math.max(1, limit), 40);
  const poolSize = Math.max(pageSize * 4, 120);
  const match: Record<string, unknown> = {
    ...creatorQualityFilter,
    categories: { $exists: true, $ne: [] },
    submissionStatus: { $ne: 'pending' },
  };

  const featuredUsers = await getRecentlyFeaturedUsernames();
  const featuredUsernames = featuredUsers.map((f) => f.username);
  const topFeaturedUsernames = new Set<string>(COMMUNITY_FEATURED_TOP);

  const [topFeatured, featuredRows, rows, trendingFallback] = await Promise.all([
    loadCommunityTopFeatured(),
    featuredUsernames.length
      ? OnlyFansCreator.find({
          username: { $in: featuredUsernames.map((u) => usernameRegex(u)) },
          deleted: { $ne: true },
        })
          .select(COMMUNITY_CREATOR_SELECT)
          .lean()
      : Promise.resolve([]),
    OnlyFansCreator.find(match)
      .sort({ createdAt: -1 })
      .limit(poolSize)
      .select(COMMUNITY_CREATOR_SELECT)
      .lean(),
    featuredUsernames.length
      ? TrendingOFCreator.find({
          username: { $in: featuredUsernames.map((u) => usernameRegex(u)) },
          active: true,
        })
          .select('username name avatar url bio createdAt')
          .lean()
      : Promise.resolve([]),
  ]);

  const featuredByUser = new Map<string, Record<string, unknown>>();
  for (const raw of featuredRows as Record<string, unknown>[]) {
    featuredByUser.set(String(raw.username || '').toLowerCase(), raw);
  }
  const trendingByUser = new Map<string, Record<string, unknown>>();
  for (const raw of trendingFallback as Record<string, unknown>[]) {
    trendingByUser.set(String(raw.username || '').toLowerCase(), raw);
  }

  const pinned: Record<string, unknown>[] = [...topFeatured];
  for (const { username } of featuredUsers) {
    if (topFeaturedUsernames.has(username)) continue;
    const profile = featuredByUser.get(username);
    if (profile) {
      pinned.push(profile);
      continue;
    }
    const trending = trendingByUser.get(username);
    if (!trending) continue;
    pinned.push(buildTrendingFallbackProfile(trending, username));
  }

  const ranked: Array<Record<string, unknown> & { extraPhotoCount: number }> = (rows as Record<string, unknown>[])
    .map((raw) => ({
      ...raw,
      extraPhotoCount: countUniqueExtraPhotos({
        avatar: raw.avatar as string | undefined,
        header: raw.header as string | undefined,
        extraPhotos: raw.extraPhotos as string[] | undefined,
      }),
    }))
    .sort((a: Record<string, unknown> & { extraPhotoCount: number }, b: Record<string, unknown> & { extraPhotoCount: number }) => {
      if (b.extraPhotoCount !== a.extraPhotoCount) return b.extraPhotoCount - a.extraPhotoCount;
      const bTime = b.createdAt ? new Date(b.createdAt as string | Date).getTime() : 0;
      const aTime = a.createdAt ? new Date(a.createdAt as string | Date).getTime() : 0;
      return bTime - aTime;
    });

  const pinnedUsernames = new Set(pinned.map((p) => String(p.username || '').toLowerCase()));
  const allRows = [...pinned, ...ranked.filter((r) => !pinnedUsernames.has(String(r.username || '').toLowerCase()))];
  const ids = allRows.map((r) => r._id).filter(Boolean);
  const saveMap = new Map<string, number>();
  if (ids.length > 0) {
    const saveCounts = await User.aggregate([
      { $match: { savedCreators: { $in: ids } } },
      { $unwind: '$savedCreators' },
      { $match: { savedCreators: { $in: ids } } },
      { $group: { _id: '$savedCreators', erogramSaves: { $sum: 1 } } },
    ]);
    for (const row of saveCounts) {
      saveMap.set(String(row._id), row.erogramSaves as number);
    }
  }

  const seen = new Set<string>();
  const creators: Record<string, unknown>[] = [];
  for (const raw of allRows) {
    const username = String(raw.username || '').toLowerCase();
    if (!username || seen.has(username)) continue;
    seen.add(username);
    const { extraPhotoCount: _extraPhotoCount, ...rest } = raw as Record<string, unknown> & { extraPhotoCount?: number };
    creators.push(formatCommunityCreator(rest, saveMap));
    if (creators.length >= pageSize) break;
  }

  return creators;
}

/** Top bookmarked creators in the last 30 days — whales excluded via creatorQualityFilter. */
export async function getTopCommunityBookmarkedCreatorsLast30Days(limit = 10) {
  await connectDB();

  const pageSize = Math.min(Math.max(1, limit), 40);
  const poolSize = Math.max(pageSize * 3, 40);
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const saveCounts = await ProfileFeedLike.aggregate([
    { $match: { createdAt: { $gte: since } } },
    { $group: { _id: { creatorId: '$creatorId', userId: '$userId' } } },
    {
      $lookup: {
        from: 'users',
        localField: '_id.userId',
        foreignField: '_id',
        as: 'user',
      },
    },
    { $unwind: '$user' },
    {
      $match: {
        $expr: { $in: ['$_id.creatorId', { $ifNull: ['$user.savedCreators', []] }] },
      },
    },
    { $group: { _id: '$_id.creatorId', erogramSaves: { $sum: 1 } } },
    { $sort: { erogramSaves: -1 } },
    { $limit: poolSize },
  ]);

  if (saveCounts.length === 0) return [];

  const saveMap = new Map<string, number>();
  for (const row of saveCounts) {
    saveMap.set(String(row._id), row.erogramSaves as number);
  }

  const match: Record<string, unknown> = {
    _id: { $in: saveCounts.map((r) => r._id) },
    ...creatorQualityFilter,
    categories: { $exists: true, $ne: [] },
    submissionStatus: { $ne: 'pending' },
  };

  const rows = await OnlyFansCreator.find(match)
    .select(
      'name username slug avatar header categories subscriberCount likesCount photosCount videosCount price isFree url clicks redirectToOF instagramUrl twitterUrl tiktokUrl telegramUrl fanslyUrl fanvueUrl redditUrl patreonUrl website linktreeUrl allmylinksUrl beaconsUrl',
    )
    .lean();

  const seen = new Set<string>();
  const creators: Record<string, unknown>[] = [];
  const ranked: Array<Record<string, unknown> & { _id: string; erogramSaves: number }> = (rows as Record<string, unknown>[])
    .map((raw) => ({
      ...raw,
      _id: String(raw._id),
      erogramSaves: saveMap.get(String(raw._id)) || 0,
    }))
    .sort((a, b) => (b.erogramSaves as number) - (a.erogramSaves as number));

  for (const raw of ranked) {
    const username = String(raw.username || '').toLowerCase();
    if (!username || seen.has(username)) continue;
    seen.add(username);
    creators.push(raw);
    if (creators.length >= pageSize) break;
  }

  return creators;
}

/** Most saved/liked by Erogram users — whales excluded via creatorQualityFilter. */
export async function getTopCommunityLikedCreators(limit = 40) {
  await connectDB();

  const pageSize = Math.min(Math.max(1, limit), 40);
  const poolSize = Math.max(pageSize * 3, 80);

  const saveCounts = await User.aggregate([
    { $match: { savedCreators: { $exists: true, $ne: [] } } },
    { $unwind: '$savedCreators' },
    { $group: { _id: '$savedCreators', erogramSaves: { $sum: 1 } } },
    { $sort: { erogramSaves: -1 } },
    { $limit: poolSize },
  ]);

  if (saveCounts.length === 0) return [];

  const saveMap = new Map<string, number>();
  for (const row of saveCounts) {
    saveMap.set(String(row._id), row.erogramSaves as number);
  }

  const match: Record<string, unknown> = {
    _id: { $in: saveCounts.map((r) => r._id) },
    ...creatorQualityFilter,
    categories: { $exists: true, $ne: [] },
    submissionStatus: { $ne: 'pending' },
  };

  const rows = await OnlyFansCreator.find(match)
    .select(
      'name username slug avatar header categories subscriberCount likesCount photosCount videosCount price isFree url clicks redirectToOF instagramUrl twitterUrl tiktokUrl telegramUrl fanslyUrl fanvueUrl redditUrl patreonUrl website linktreeUrl allmylinksUrl beaconsUrl',
    )
    .lean();

  const seen = new Set<string>();
  const creators: Record<string, unknown>[] = [];
  const ranked: Array<Record<string, unknown> & { _id: string; erogramSaves: number }> = (rows as Record<string, unknown>[])
    .map((raw) => ({
      ...raw,
      _id: String(raw._id),
      erogramSaves: saveMap.get(String(raw._id)) || 0,
    }))
    .sort((a, b) => (b.erogramSaves as number) - (a.erogramSaves as number));

  for (const raw of ranked) {
    const username = String(raw.username || '').toLowerCase();
    if (!username || seen.has(username)) continue;
    seen.add(username);
    creators.push(raw);
    if (creators.length >= pageSize) break;
  }

  return creators;
}
