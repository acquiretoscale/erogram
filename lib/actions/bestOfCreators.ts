'use server';

import connectDB from '@/lib/db/mongodb';
import { OnlyFansCreator } from '@/lib/models';
import type { BestOfPage } from '@/app/best-onlyfans-accounts/bestOfPages';

const R2 = process.env.R2_PUBLIC_URL || '';
function buildR2AvatarMatch() {
  if (!R2) return { $ne: '' as const };
  try {
    const host = new URL(R2).host.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return { $regex: new RegExp(host, 'i') };
  } catch {
    return { $ne: '' as const };
  }
}

function buildKeywordRegex(patterns: string[]) {
  const hasRegexSyntax = patterns.some((p) => p.includes('\\b') || p.includes('\\'));
  if (hasRegexSyntax) {
    return new RegExp(`(${patterns.join('|')})`, 'i');
  }
  const esc = patterns.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp(`(${esc.join('|')})`, 'i');
}

// Scraper-spam guard: a genuinely-tagged creator has a handful of categories.
// Creators with a bloated category array (8+, up to 183) were keyword-stuffed by
// the Apify scraper and wrongly surface on pages they don't belong to (e.g. a
// redhead tagged "brunette"). Capping the array size keeps the 97% of clean
// creators while dropping the ~340 stuffed ones from category/top-10 matching.
const MAX_CATEGORIES = 4;
const notSpamTagged = { $expr: { $lte: [{ $size: { $ifNull: ['$categories', []] } }, MAX_CATEGORIES] } };

function buildBestOfBaseMatch(page: BestOfPage) {
  const base: Record<string, unknown> = {
    avatar: buildR2AvatarMatch(),
    gender: 'female',
    deleted: { $ne: true },
    ...notSpamTagged,
  };

  if (page.match === 'category' && page.categorySlug) {
    base.categories = page.categorySlug;
    return base;
  }

  if (page.patterns?.length) {
    const regex = buildKeywordRegex(page.patterns);
    base.$or = [
      { bio: regex },
      { categories: regex },
      { name: regex },
      { username: regex },
      { location: regex },
    ];
  }

  return base;
}

export async function getBestOfTopByClicks(page: BestOfPage, limit = 10) {
  await connectDB();
  const baseMatch = buildBestOfBaseMatch(page);
  return OnlyFansCreator.find({ ...baseMatch, clicks: { $gt: 0 } })
    .sort({ clicks: -1 })
    .limit(limit)
    .select('_id name username slug avatar bio location likesCount mediaCount photosCount videosCount postsCount price isFree url clicks')
    .lean();
}

/**
 * 4 preview avatars per best-of page, for the "More Top OnlyFans Rankings" cards.
 * One query per page (small, indexed, top-by-likes) — runs in parallel by the caller.
 */
export async function getBestOfPreviewAvatars(pages: BestOfPage[], per = 4): Promise<Record<string, string[]>> {
  await connectDB();
  const entries = await Promise.all(
    pages.map(async (page) => {
      const baseMatch = buildBestOfBaseMatch(page);
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
  const baseMatch = buildBestOfBaseMatch(page);
  return OnlyFansCreator.find({
    ...baseMatch,
    username: { $nin: excludeUsernames },
  })
    .sort({ likesCount: -1 })
    .limit(limit)
    .select('_id name username slug avatar bio location likesCount mediaCount photosCount videosCount postsCount price isFree url clicks')
    .lean();
}
