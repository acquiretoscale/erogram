'use server';

import connectDB from '@/lib/db/mongodb';
import { OnlyFansCreator } from '@/lib/models';
import { getCreatorBio } from '@/app/onlyfanssearch/creatorBios';
import { buildR2AvatarMatch, whaleBrowseLikesFilter } from '@/lib/tags/creatorMatch';
import type { BestFreeCreatorEntry, BestFreeCreatorFacts } from './types';
import { bestFreeArticleCopy } from './copy';

const ARTICLE_LIMIT = 20;

function profileUrl(username: string): string {
  return `/${username.toLowerCase()}-onlyfans`;
}

function mapFacts(raw: Record<string, unknown>, rank: number): BestFreeCreatorFacts | null {
  const username = String(raw.username || '').toLowerCase();
  if (!username || !raw.avatar) return null;

  const bioData = getCreatorBio(username);

  return {
    rank,
    username,
    name: String(raw.name || raw.username || username),
    slug: String(raw.slug || username),
    avatar: String(raw.avatar),
    likesCount: Number(raw.likesCount) || 0,
    photosCount: raw.photosCount as number | undefined,
    videosCount: raw.videosCount as number | undefined,
    mediaCount: raw.mediaCount as number | undefined,
    joinDate: raw.joinDate as string | undefined,
    location: raw.location as string | undefined,
    categories: Array.isArray(raw.categories) ? raw.categories.map(String) : [],
    bioDb: raw.bio ? String(raw.bio) : undefined,
    bioHandwritten: bioData?.bio,
    profileUrl: profileUrl(username),
    telegram: bioData?.telegram,
    priceLabel: 'Free',
  };
}

/** Top free creators for the /onlyfanssearch/best editorial article. Sorted by Erogram clicks + likes. */
export async function buildBestFreeArticleRanking(
  limit = ARTICLE_LIMIT,
): Promise<BestFreeCreatorEntry[]> {
  await connectDB();

  const rows = await OnlyFansCreator.find({
    avatar: buildR2AvatarMatch(),
    gender: 'female',
    categories: { $exists: true, $ne: [] },
    deleted: { $ne: true },
    isFree: true,
    ...whaleBrowseLikesFilter,
  })
    .sort({ clicks: -1, likesCount: -1, _id: 1 })
    .limit(limit * 2)
    .select(
      'name username slug avatar likesCount photosCount videosCount mediaCount joinDate location bio categories',
    )
    .lean();

  const seen = new Set<string>();
  const entries: BestFreeCreatorEntry[] = [];

  for (const raw of rows as Record<string, unknown>[]) {
    const username = String(raw.username || '').toLowerCase();
    if (!username || seen.has(username)) continue;
    seen.add(username);

    const facts = mapFacts(raw, entries.length + 1);
    if (!facts) continue;

    entries.push({
      facts,
      copy: bestFreeArticleCopy.creators[username] ?? null,
    });

    if (entries.length >= limit) break;
  }

  return entries;
}