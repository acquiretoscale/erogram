'use server';

import connectDB from '@/lib/db/mongodb';
import { OnlyFansCreator } from '@/lib/models';
import { buildSlugCreatorMatch, buildR2AvatarMatch, whaleBrowseLikesFilter } from '@/lib/tags/creatorMatch';

const FREE_PAGE_SIZE = 24;
const FREE_MAX_PUBLIC = 200;

type FreeOnlyfansRow = {
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

type FreeOnlyfansResult = {
  ok: true;
  creators: FreeOnlyfansRow[];
  hasMore: boolean;
};

function buildAllFreeMatch() {
  return {
    avatar: buildR2AvatarMatch(),
    gender: 'female',
    categories: { $exists: true, $ne: [] },
    deleted: { $ne: true },
    isFree: true,
    ...whaleBrowseLikesFilter,
  };
}

function rowId(value: unknown): string {
  if (value && typeof value === 'object' && 'toString' in value) {
    return (value as { toString(): string }).toString();
  }
  return String(value ?? '');
}

function mapRow(c: Record<string, unknown>): FreeOnlyfansRow {
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
    isFree: true,
    price: 0,
    instagramUrl: c.instagramUrl as string | undefined,
    instagramUsername: c.instagramUsername as string | undefined,
    joinDate: c.joinDate as string | undefined,
    location: c.location as string | undefined,
    bio: c.bio as string | undefined,
  };
}

export async function getFreeOnlyfansCreators(
  excludeUsernames: string[] = [],
  limit = FREE_PAGE_SIZE,
  categorySlug?: string,
): Promise<FreeOnlyfansResult> {
  if (excludeUsernames.length >= FREE_MAX_PUBLIC) {
    return { ok: true, creators: [], hasMore: false };
  }

  await connectDB();

  const match: Record<string, unknown> = categorySlug
    ? { ...buildSlugCreatorMatch(categorySlug), isFree: true }
    : buildAllFreeMatch();

  if (excludeUsernames.length) {
    match.username = { $nin: excludeUsernames.map((u) => u.toLowerCase()) };
  }

  const queryLimit = Math.min(limit + excludeUsernames.length + 4, 64);
  const rows = await OnlyFansCreator.find(match)
    .sort({ clicks: -1, likesCount: -1, _id: 1 })
    .limit(queryLimit)
    .select(
      'name username slug avatar likesCount photosCount videosCount mediaCount price isFree instagramUrl instagramUsername joinDate location bio',
    )
    .lean();

  const seen = new Set<string>();
  const creators: FreeOnlyfansRow[] = [];
  for (const raw of rows as Record<string, unknown>[]) {
    const username = String(raw.username || '').toLowerCase();
    if (!username || !raw.avatar || seen.has(username)) continue;
    seen.add(username);
    creators.push(mapRow(raw));
    if (creators.length >= limit) break;
  }

  const totalLoaded = excludeUsernames.length + creators.length;
  const hasMore = creators.length >= limit && totalLoaded < FREE_MAX_PUBLIC;

  return { ok: true, creators, hasMore };
}
