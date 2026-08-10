'use server';

import connectDB from '@/lib/db/mongodb';
import { OnlyFansCreator } from '@/lib/models';
import type { BestOfPage } from '@/app/best-onlyfans-accounts/bestOfPages';
import { buildBestOfCreatorMatch } from '@/lib/tags/creatorMatch';

export async function getBestOfTopByClicks(page: BestOfPage, limit = 10) {
  await connectDB();
  const baseMatch = buildBestOfCreatorMatch(page);
  return OnlyFansCreator.find({ ...baseMatch, clicks: { $gt: 0 } })
    .sort({ clicks: -1 })
    .limit(limit)
    .select('_id name username slug avatar bio location likesCount mediaCount photosCount videosCount postsCount price isFree url clicks')
    .lean();
}

export async function getBestOfPreviewAvatars(pages: BestOfPage[], per = 4): Promise<Record<string, string[]>> {
  await connectDB();
  const entries = await Promise.all(
    pages.map(async (page) => {
      const baseMatch = buildBestOfCreatorMatch(page);
      const rows = await OnlyFansCreator.find(baseMatch)
        .sort({ likesCount: -1 })
        .limit(per)
        .select('avatar')
        .lean();
      const avatars = (rows as { avatar?: string }[]).map((r) => r.avatar || '').filter(Boolean);
      return [page.slug, avatars] as const;
    }),
  );
  return Object.fromEntries(entries);
}

export async function getBestOfFillCreators(page: BestOfPage, excludeUsernames: string[], limit: number) {
  if (limit <= 0) return [];
  await connectDB();
  const baseMatch = buildBestOfCreatorMatch(page);
  return OnlyFansCreator.find({
    ...baseMatch,
    username: { $nin: excludeUsernames },
  })
    .sort({ clicks: -1, likesCount: -1 })
    .limit(limit)
    .select('_id name username slug avatar bio location likesCount mediaCount photosCount videosCount postsCount price isFree url clicks')
    .lean();
}

const RANKING_CREATOR_SELECT =
  '_id name username slug avatar bio location likesCount mediaCount photosCount videosCount postsCount price isFree url clicks';

/** Hard floor: every Top-10 / Best ranking page lists at least this many creators. */
const RANKING_LIST_MIN = 25;
const RANKING_ORGANIC_LIMIT_DEFAULT = 30;
const RANKING_ORGANIC_LIMIT_LARGE = 50;

/** Pages with more than 50 matching creators list up to 50; others cap at 30 (never below min). */
export async function getBestOfRankingOrganicCap(page: BestOfPage): Promise<number> {
  await connectDB();
  const total = await OnlyFansCreator.countDocuments(buildBestOfCreatorMatch(page));
  const cap = total > RANKING_ORGANIC_LIMIT_LARGE ? RANKING_ORGANIC_LIMIT_LARGE : RANKING_ORGANIC_LIMIT_DEFAULT;
  return Math.max(cap, RANKING_LIST_MIN);
}

/** Organic ranking list: every matching creator up to cap (clicks first, then likes). */
export async function getBestOfRankingOrganic(
  page: BestOfPage,
  cap: number,
  excludeUsernames: string[] = [],
) {
  await connectDB();
  const baseMatch = buildBestOfCreatorMatch(page);
  const match: Record<string, unknown> = { ...baseMatch };
  if (excludeUsernames.length) match.username = { $nin: excludeUsernames };

  const total = await OnlyFansCreator.countDocuments(match);
  const take = Math.min(cap, total);
  if (take <= 0) return [];

  return OnlyFansCreator.find(match)
    .sort({ clicks: -1, likesCount: -1 })
    .limit(take)
    .select(RANKING_CREATOR_SELECT)
    .lean();
}

async function getBestOfQualityFill(excludeUsernames: string[], limit: number) {
  if (limit <= 0) return [];
  await connectDB();
  const { creatorQualityFilter } = await import('@/lib/tags/creatorMatch');
  return OnlyFansCreator.find({
    ...creatorQualityFilter,
    ...(excludeUsernames.length ? { username: { $nin: excludeUsernames } } : {}),
  })
    .sort({ clicks: -1, likesCount: -1 })
    .limit(limit)
    .select(RANKING_CREATOR_SELECT)
    .lean();
}

/**
 * Organic ranking up to cap, then fill from related cluster siblings
 * when the primary niche does not have enough creators.
 * If still under RANKING_LIST_MIN after cluster fill, backfill with top quality creators.
 */
export async function getBestOfRankingOrganicWithClusterFill(
  page: BestOfPage,
  cap: number,
  excludeUsernames: string[] = [],
) {
  const target = Math.max(cap, RANKING_LIST_MIN);
  const primary = await getBestOfRankingOrganic(page, target, excludeUsernames);
  if (primary.length >= target) return primary;

  const { getRelatedRankingSlugs } = await import('@/lib/bestOnlyfansAccounts/relatedRankings');
  const { BEST_OF_PAGE_MAP } = await import('@/app/best-onlyfans-accounts/bestOfPages');

  const rows = [...primary];
  const exclude = new Set(
    [
      ...excludeUsernames,
      ...rows.map((r) => String((r as { username?: string }).username || '').toLowerCase()),
    ].filter(Boolean),
  );

  for (const siblingSlug of getRelatedRankingSlugs(page.slug)) {
    if (rows.length >= target) break;
    const siblingPage = BEST_OF_PAGE_MAP.get(siblingSlug);
    if (!siblingPage) continue;
    const need = target - rows.length;
    const fill = await getBestOfFillCreators(siblingPage, [...exclude], need);
    for (const c of fill as { username?: string }[]) {
      const u = String(c.username || '').toLowerCase();
      if (!u || exclude.has(u)) continue;
      exclude.add(u);
      rows.push(c as (typeof primary)[number]);
      if (rows.length >= target) break;
    }
  }

  if (rows.length < RANKING_LIST_MIN) {
    const need = RANKING_LIST_MIN - rows.length;
    const fill = await getBestOfQualityFill([...exclude], need);
    for (const c of fill as { username?: string }[]) {
      const u = String(c.username || '').toLowerCase();
      if (!u || exclude.has(u)) continue;
      exclude.add(u);
      rows.push(c as (typeof primary)[number]);
      if (rows.length >= RANKING_LIST_MIN) break;
    }
  }

  return rows;
}
