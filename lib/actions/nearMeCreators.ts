'use server';

import { cookies, headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import { OnlyFansCreator, User } from '@/lib/models';
import { rotateFeedResults } from '@/lib/tags/ofSearchMatch';
import {
  buildNearMeCreatorMatch,
  buildRegionNearMeMatch,
  nearMeAreaLabel,
  NEAR_ME_MIN_RESULTS,
  regionIdForCountry,
  regionLabel,
} from '@/lib/tags/nearMeMatch';
import { parseCountryCode, parseCity } from '@/lib/utils/geo';
import { buildNicheMatchClause, creatorQualityFilter, whaleBrowseLikesFilter } from '@/lib/tags/creatorMatch';
import { BEST_OF_PAGE_MAP } from '@/app/best-onlyfans-accounts/bestOfPages';

const NEAR_ME_PAGE_SIZE = 24;
const NEAR_ME_MAX_PUBLIC = 200;
const NEAR_ME_LIMIT_PROFILE = 12;
const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';

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

async function queryBrowseFallback(pool: number, excludeUsernames: string[] = []) {
  await connectDB();
  const match = {
    avatar: buildR2AvatarMatch(),
    gender: 'female',
    categories: { $exists: true, $ne: [] },
    deleted: { $ne: true },
    ...whaleBrowseLikesFilter,
  };
  return OnlyFansCreator.aggregate([
    { $match: withUsernameExclude(match, excludeUsernames) },
    { $sample: { size: pool } },
    {
      $project: {
        name: 1,
        username: 1,
        slug: 1,
        avatar: 1,
        likesCount: 1,
        photosCount: 1,
        videosCount: 1,
        mediaCount: 1,
        price: 1,
        isFree: 1,
        instagramUrl: 1,
        instagramUsername: 1,
        joinDate: 1,
        location: 1,
        bio: 1,
      },
    },
  ]);
}

export type NearMeCreatorRow = {
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
  location?: string;
  bio?: string;
};

export type NearMeCreatorItem = NearMeCreatorRow;

export type NearMeFetchResult = {
  ok: true;
  creators: NearMeCreatorRow[];
  areaLabel: string;
  tier: 'country' | 'region';
  needsLocation: boolean;
  hasMore: boolean;
};

function withUsernameExclude(match: Record<string, unknown>, excludeUsernames: string[]) {
  if (!excludeUsernames.length) return match;
  return {
    ...match,
    username: { $nin: excludeUsernames.map((u) => u.toLowerCase()) },
  };
}

async function getVisitorGeo(): Promise<{ country?: string; city?: string }> {
  const h = await headers();
  const fromHeader = parseCountryCode(
    h.get('x-vercel-ip-country') ||
      h.get('cf-ipcountry') ||
      h.get('cloudfront-viewer-country') ||
      h.get('x-country-code'),
  );
  if (fromHeader) {
    return { country: fromHeader, city: parseCity(h.get('x-vercel-ip-city')) };
  }
  const cc = parseCountryCode((await cookies()).get('__ero_cc')?.value);
  const city = parseCity(h.get('x-vercel-ip-city'));
  if (cc) return { country: cc, city };
  return city ? { city } : {};
}

async function resolveVisitorCountry(countryHint?: string, token?: string): Promise<string | undefined> {
  const h = await headers();
  const fromIp = parseCountryCode(
    h.get('x-vercel-ip-country') ||
      h.get('cf-ipcountry') ||
      h.get('cloudfront-viewer-country') ||
      h.get('x-country-code'),
  );
  if (fromIp) return fromIp;

  const fromProfile = await getCountryFromToken(token);
  if (fromProfile) return fromProfile;

  const fromHint = parseCountryCode(countryHint);
  if (fromHint) return fromHint;

  return parseCountryCode((await cookies()).get('__ero_cc')?.value);
}

async function getCountryFromToken(token?: string): Promise<string | undefined> {
  if (!token) return undefined;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id?: string };
    if (!decoded.id) return undefined;
    await connectDB();
    const user = await User.findById(decoded.id).select('country city').lean() as {
      country?: string;
      city?: string;
    } | null;
    return parseCountryCode(user?.country);
  } catch {
    return undefined;
  }
}

async function resolveVisitorCity(token?: string): Promise<string | undefined> {
  const h = await headers();
  const fromIp = parseCity(h.get('x-vercel-ip-city'));
  if (fromIp) return fromIp;

  if (!token) return undefined;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id?: string };
    if (!decoded.id) return undefined;
    await connectDB();
    const user = await User.findById(decoded.id).select('city').lean() as { city?: string } | null;
    const fromProfile = parseCity(user?.city) || user?.city?.trim();
    return fromProfile || undefined;
  } catch {
    return undefined;
  }
}

function mergeUniqueRows(
  primary: Record<string, unknown>[],
  extra: Record<string, unknown>[],
  cap: number,
): Record<string, unknown>[] {
  const out = [...primary];
  const seen = new Set(out.map((r) => String(r.username || '').toLowerCase()).filter(Boolean));
  for (const row of extra) {
    if (out.length >= cap) break;
    const username = String(row.username || '').toLowerCase();
    if (!username || seen.has(username)) continue;
    seen.add(username);
    out.push(row);
  }
  return out;
}

async function queryNearMe(
  match: Record<string, unknown>,
  pool: number,
  excludeUsernames: string[] = [],
) {
  await connectDB();
  return OnlyFansCreator.aggregate([
    { $match: withUsernameExclude(match, excludeUsernames) },
    { $sort: { clicks: -1, likesCount: -1, _id: 1 } },
    { $limit: pool },
    {
      $project: {
        name: 1,
        username: 1,
        slug: 1,
        avatar: 1,
        likesCount: 1,
        photosCount: 1,
        videosCount: 1,
        mediaCount: 1,
        price: 1,
        isFree: 1,
        instagramUrl: 1,
        instagramUsername: 1,
        joinDate: 1,
        location: 1,
        bio: 1,
      },
    },
  ]);
}

function rowId(value: unknown): string {
  if (value && typeof value === 'object' && 'toString' in value) {
    return (value as { toString(): string }).toString();
  }
  return String(value ?? '');
}

function mapBrowseRow(c: Record<string, unknown>): NearMeCreatorRow {
  return {
    _id: rowId(c._id),
    name: String(c.name || c.username || ''),
    username: String(c.username || ''),
    slug: String(c.slug || c.username || ''),
    avatar: String(c.avatar || ''),
    likesCount: Number(c.likesCount) || 0,
    photosCount: c.photosCount as number | undefined,
    videosCount: c.videosCount as number | undefined,
    mediaCount: c.mediaCount as number | undefined,
    isFree: !!c.isFree,
    price: Number(c.price) || 0,
    instagramUrl: c.instagramUrl as string | undefined,
    instagramUsername: c.instagramUsername as string | undefined,
    joinDate: c.joinDate as string | undefined,
    location: c.location as string | undefined,
    bio: c.bio as string | undefined,
  };
}

function mapCreators(rows: Record<string, unknown>[], rotateKey: string, limit: number): NearMeCreatorRow[] {
  const creators: NearMeCreatorRow[] = [];
  const seen = new Set<string>();

  for (const c of rows) {
    const username = String(c.username || '').toLowerCase();
    if (!username || !c.avatar || seen.has(username)) continue;
    seen.add(username);
    creators.push(mapBrowseRow(c));
    if (creators.length >= limit) break;
  }

  return creators;
}

function shuffleRows(rows: Record<string, unknown>[], rotateKey: string, rotateSeed: string): Record<string, unknown>[] {
  if (rows.length <= 1) return rows;
  const day = new Date().toISOString().slice(0, 10);
  return rotateFeedResults(rows, `${rotateKey}:${rotateSeed}:${day}`, rows.length) as Record<string, unknown>[];
}

async function tryRegionMatch(regionId: string, pool: number, excludeUsernames: string[] = []) {
  const regionMatch = buildRegionNearMeMatch(regionId);
  if (!regionMatch) return [];
  return queryNearMe(regionMatch, pool, excludeUsernames);
}

export async function fetchNearMeCreatorsTiered(
  countryCode?: string,
  city?: string,
  rotateSeed = 'default',
  rotateKey = 'near-me',
  limit = NEAR_ME_LIMIT_PROFILE,
  excludeUsernames: string[] = [],
): Promise<NearMeFetchResult> {
  const cc = countryCode?.trim().toUpperCase();
  let tier: 'country' | 'region' = 'country';
  let areaLabel = nearMeAreaLabel(cc, city);
  let rows: Record<string, unknown>[] = [];
  let countryCount = 0;
  const queryLimit = Math.min(limit + excludeUsernames.length + 8, 64);

  const countryMatch = cc ? buildNearMeCreatorMatch(cc, city) : null;
  if (countryMatch) {
    const countryRows = await queryNearMe(countryMatch, queryLimit, excludeUsernames);
    countryCount = countryRows.length;
    rows = excludeUsernames.length === 0
      ? shuffleRows(countryRows, `${rotateKey}:country`, rotateSeed)
      : countryRows;
  }

  const regionId = cc ? regionIdForCountry(cc) : undefined;
  if (regionId && rows.length < limit) {
    const regionRows = await tryRegionMatch(regionId, queryLimit, excludeUsernames);
    rows = mergeUniqueRows(rows, regionRows, queryLimit);
    if (countryCount < NEAR_ME_MIN_RESULTS) {
      tier = 'region';
      areaLabel = regionLabel(regionId);
    }
  }

  if (rows.length < limit && (countryCount === 0 || !cc)) {
    const browseRows = await queryBrowseFallback(Math.min(queryLimit, 64), excludeUsernames);
    rows = mergeUniqueRows(rows, browseRows, queryLimit);
    if (!areaLabel && browseRows.length) {
      areaLabel = '';
      tier = 'region';
    }
  }

  if (!rows.length) {
    return { ok: true, creators: [], areaLabel, tier, needsLocation: !cc, hasMore: false };
  }

  const creators = mapCreators(rows, `${rotateKey}:${rotateSeed}`, limit);
  const totalLoaded = excludeUsernames.length + creators.length;
  const hasMore = creators.length >= limit && totalLoaded < NEAR_ME_MAX_PUBLIC;

  return { ok: true, creators, areaLabel, tier, needsLocation: false, hasMore };
}

/** Near me by best-of country or US state slug (e.g. american, california). */
export async function getNearMeByPlaceSlug(
  placeSlug: string,
  rotateSeed = 'default',
  excludeUsernames: string[] = [],
  limit = NEAR_ME_PAGE_SIZE,
): Promise<NearMeFetchResult> {
  if (excludeUsernames.length >= NEAR_ME_MAX_PUBLIC) {
    return {
      ok: true,
      creators: [],
      areaLabel: '',
      tier: 'country',
      needsLocation: false,
      hasMore: false,
    };
  }

  const page = BEST_OF_PAGE_MAP.get(placeSlug);
  if (!page || (page.type !== 'country' && page.type !== 'state')) {
    return {
      ok: true,
      creators: [],
      areaLabel: '',
      tier: 'country',
      needsLocation: false,
      hasMore: false,
    };
  }

  const match = { ...creatorQualityFilter, ...buildNicheMatchClause(placeSlug) };
  const queryLimit = Math.min(limit + excludeUsernames.length + 8, 64);
  let rows = await queryNearMe(match, queryLimit, excludeUsernames);
  if (excludeUsernames.length === 0) {
    rows = shuffleRows(rows, `near-me-place:${placeSlug}`, rotateSeed);
  }

  const creators = mapCreators(rows, `near-me-place:${placeSlug}:${rotateSeed}`, limit);
  const totalLoaded = excludeUsernames.length + creators.length;
  const hasMore = creators.length >= limit && totalLoaded < NEAR_ME_MAX_PUBLIC;

  return {
    ok: true,
    creators,
    areaLabel: page.label,
    tier: 'country',
    needsLocation: false,
    hasMore,
  };
}

/** IP-based near me for /onlyfans (no login). Country first, then region fallback. */
export async function getNearMeCreatorsPublic(
  rotateSeed = 'default',
  countryHint?: string,
  token?: string,
  excludeUsernames: string[] = [],
  limit = NEAR_ME_PAGE_SIZE,
) {
  if (excludeUsernames.length >= NEAR_ME_MAX_PUBLIC) {
    return {
      ok: true as const,
      creators: [],
      areaLabel: '',
      tier: 'region' as const,
      needsLocation: false,
      hasMore: false,
    };
  }
  const country = await resolveVisitorCountry(countryHint, token);
  const city = (await resolveVisitorCity(token)) || (await getVisitorGeo()).city;
  return fetchNearMeCreatorsTiered(
    country,
    city,
    rotateSeed,
    'near-me-ip',
    limit,
    excludeUsernames,
  );
}

/** Country code for Near me flag (IP → profile → cookie). */
export async function getVisitorCountryCode(countryHint?: string, token?: string) {
  return (await resolveVisitorCountry(countryHint, token)) || '';
}

export async function getVisitorNearMeLocation(countryHint?: string, token?: string) {
  const country = await resolveVisitorCountry(countryHint, token);
  const city = (await resolveVisitorCity(token)) || (await getVisitorGeo()).city;
  return {
    countryCode: country || '',
    city: city || '',
    areaLabel: nearMeAreaLabel(country, city),
  };
}
