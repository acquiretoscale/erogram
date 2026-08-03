'use server';

import connectDB from '@/lib/db/mongodb';
import { Types } from 'mongoose';
import { OnlyFansCreator, SearchQuery, User } from '@/lib/models';
import { whaleBrowseLikesFilter } from '@/lib/tags/creatorMatch';
import {
  buildBrowseQualityMatch,
  buildSearchOrClauses,
  buildSearchTierStage,
  expandSearchQuery,
  isKnownSearchQuery,
  rotateSearchResults,
} from '@/lib/tags/ofSearchMatch';
import { buildNicheMatchClause, creatorQualityFilter } from '@/lib/tags/creatorMatch';

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
const SCRAPE_COOLDOWN_MS = 24 * 60 * 60 * 1000;
/** Public /onlyfanssearch — pool + max results per search. */
const SEARCH_POOL = 100;
/** Premium profile search — deeper pool, per-user rotation. */
const PROFILE_PREMIUM_SEARCH_POOL = 400;

export type ProfilePremiumPriceFilter = 'all' | 'free' | 'paid';

export interface ProfilePremiumSearchFilters {
  price?: ProfilePremiumPriceFilter;
  minMedia?: number;
  minPrice?: number;
  maxPrice?: number;
  hasInstagram?: boolean;
  /** Recently added to Erogram (createdAt), not OF join date */
  joinWithinDays?: number;
  /** Each inner array = OR within silo; outer = AND across silos */
  nicheGroups?: string[][];
}

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

/** Filtered hub browse for /onlyfans hero — niches + price + premium toggles, optional text query. */
export async function hubBrowseCreators(
  filters: ProfilePremiumSearchFilters & { query?: string },
  rotateSeed = 'default',
  token?: string,
) {
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
      return { ok: true as const, creators: [] as any[] };
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

  const creators = await OnlyFansCreator.aggregate(pipeline);
  const rotated = rotateSearchResults(
    creators as any[],
    trimmed || nicheGroups.flat().join('+') || 'hub',
    0,
    PROFILE_PREMIUM_SEARCH_POOL,
    `hub-browse:${rotateSeed}:${JSON.stringify(effectiveFilters)}`,
  );

  return {
    ok: true as const,
    creators: rotated.map(({ _searchTier, ...c }: any) => ({ ...c, _id: c._id.toString() })),
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
) {
  const trimmed = q.trim();
  if (!trimmed) return { ok: true as const, creators: [] as any[] };

  await connectDB();

  const plan = expandSearchQuery(trimmed);
  if (!plan) return { ok: true as const, creators: [] as any[] };

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
  ]);

  const rotated = rotateSearchResults(
    creators as any[],
    plan.normalized,
    0,
    PROFILE_PREMIUM_SEARCH_POOL,
    `${rotateKey}:${rotateSeed}:${JSON.stringify(filters)}`,
  );

  return {
    ok: true as const,
    creators: rotated.map(({ _searchTier, ...c }: any) => ({ ...c, _id: c._id.toString() })),
  };
}

/** Free advanced search for /onlyfanssearch (no premium gate). */
export async function advancedSearchCreators(
  q: string,
  rotateSeed = 'default',
  filters: ProfilePremiumSearchFilters = {},
  token?: string,
) {
  const effectiveFilters = await stripNonPremiumFilters(filters, token);
  return runAdvancedSearchCreators(q, rotateSeed, effectiveFilters, 'of-search');
}

export async function profilePremiumSearchCreators(
  token: string,
  q: string,
  rotateSeed = 'default',
  filters: ProfilePremiumSearchFilters = {},
) {
  const userId = await requirePremiumUserId(token);
  if (!userId) return { ok: false as const, message: 'Premium required', creators: [] };

  return runAdvancedSearchCreators(q, rotateSeed, filters, userId);
}

export async function searchCreators(q: string, limit = 100, skip = 0) {
  const trimmed = q.trim();
  if (!trimmed) return { creators: [], total: 0, shouldScrape: false };

  await connectDB();

  const plan = expandSearchQuery(trimmed);
  if (!plan) return { creators: [], total: 0, shouldScrape: false };

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
  ]);

  const resultCap = Math.min(Math.max(1, limit), SEARCH_POOL);
  const rotated = rotateSearchResults(
    creators as any[],
    plan.normalized,
    Math.max(0, skip),
    resultCap,
  );
  const total = creators.length;

  let shouldScrape = false;
  if (skip === 0) {
    if (!(total > 0 && isKnownSearchQuery(plan))) {
      shouldScrape = await logAndCheckScrapeNeeded(plan.normalized, trimmed);
    }
  }

  return {
    creators: rotated.map(({ _searchTier, ...c }: any) => ({ ...c, _id: c._id.toString() })),
    total,
    shouldScrape,
    scrapeQuery: shouldScrape ? plan.normalized : undefined,
  };
}

export async function deleteCreatorBySlug(token: string, slug: string) {
  const jwt = (await import('jsonwebtoken')).default;
  const { User } = await import('@/lib/models');
  const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';
  try {
    const d = jwt.verify(token, JWT_SECRET) as any;
    await connectDB();
    const u = await User.findById(d.id);
    if (!u || !u.isAdmin) throw new Error('Unauthorized');
  } catch {
    throw new Error('Unauthorized');
  }
  const result = await OnlyFansCreator.findOneAndUpdate(
    { slug },
    { $set: { deleted: true, deletedAt: new Date() } },
  );
  if (!result) throw new Error('Not found');
  return { success: true };
}

async function logAndCheckScrapeNeeded(normalized: string, originalQuery: string): Promise<boolean> {
  try {
    const existing = await SearchQuery.findOneAndUpdate(
      { queryNormalized: normalized },
      {
        $inc: { searchCount: 1 },
        $set: { lastSearchedAt: new Date(), query: originalQuery },
        $setOnInsert: { queryNormalized: normalized, scraped: false, scrapeStatus: 'pending', resultsCount: 0 },
      },
      { upsert: true, new: true },
    );

    if (existing.scrapeStatus === 'scraping') return false;
    if (existing.scrapeStatus === 'done' && existing.scrapedAt) {
      if (Date.now() - new Date(existing.scrapedAt).getTime() < SCRAPE_COOLDOWN_MS) return false;
    }

    await SearchQuery.updateOne({ _id: existing._id }, { $set: { scrapeStatus: 'scraping' } });
    return true;
  } catch {
    return false;
  }
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
