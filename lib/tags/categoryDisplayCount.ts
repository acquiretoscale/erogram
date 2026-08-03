/**
 * SINGLE SOURCE OF TRUTH for category creator counts shown in UI.
 *
 * NEVER use a raw Mongo `{ categories: slug }` query alone to decide if a
 * category is "empty". Creators are matched two ways:
 * 1. bestOfPages.count — keyword/bio/location match (precomputed registry)
 * 2. category pool tags — expandCategorySlug() groups (milf+mature, asian+japanese, etc.)
 *
 * Always use buildCategoryDisplayCounts() for browse cards and empty checks.
 */
import connectDB from '@/lib/db/mongodb';
import { OnlyFansCreator } from '@/lib/models';
import { BEST_OF_PAGE_MAP } from '@/app/best-onlyfans-accounts/bestOfPages';
import { buildSlugCreatorMatch, expandCategorySlug } from '@/lib/tags/creatorMatch';

function poolKey(slug: string): string {
  return expandCategorySlug(slug).slice().sort().join('|');
}

function bestOfMaxForPool(slug: string): number {
  const pool = expandCategorySlug(slug);
  let max = 0;
  for (const s of pool) {
    const n = BEST_OF_PAGE_MAP.get(s)?.count ?? 0;
    if (n > max) max = n;
  }
  return max;
}

async function poolTagCount(slug: string): Promise<number> {
  return OnlyFansCreator.countDocuments(buildSlugCreatorMatch(slug));
}

/** Shared display count for every slug in the same expansion pool. */
export async function buildCategoryDisplayCounts(slugs: string[]): Promise<Map<string, number>> {
  const uniqueKeys = [...new Set(slugs.map(poolKey))];
  const keyCounts = new Map<string, number>();

  await connectDB();

  await Promise.all(
    uniqueKeys.map(async (key) => {
      const representative = key.split('|')[0];
      const [bestOfMax, tagCount] = await Promise.all([
        Promise.resolve(bestOfMaxForPool(representative)),
        poolTagCount(representative),
      ]);
      keyCounts.set(key, Math.max(bestOfMax, tagCount));
    }),
  );

  const out = new Map<string, number>();
  for (const slug of slugs) {
    out.set(slug, keyCounts.get(poolKey(slug)) ?? 0);
  }
  return out;
}

export function bestOfOnlyCount(slug: string): number | undefined {
  const n = BEST_OF_PAGE_MAP.get(slug)?.count;
  return n && n > 0 ? n : undefined;
}
