import { BEST_OF_PAGE_MAP } from '@/app/best-onlyfans-accounts/bestOfPages';
import { rankingListSize } from '@/lib/bestOfPageContent/top50Rankings';

export const BEST_ONLYFANS_HUB_PATH = '/best-onlyfans-accounts';

const RANKING_HUBS: Record<string, { variant: 'top10' | 'best'; size: 25 | 50 }> = {
  'top-25-onlyfans-models': { variant: 'top10', size: 25 },
  'top-50-onlyfans-models': { variant: 'top10', size: 50 },
  'best-25-onlyfans-models': { variant: 'best', size: 25 },
  'best-50-onlyfans-models': { variant: 'best', size: 50 },
};

export type ResolvedEnglishRanking = {
  slug: string;
  variant: 'top10' | 'best';
};

/** Valid canonical ranking URL: registry slug + matching top-25 vs top-50 list size. */
export function resolveEnglishRankingRoute(hub: string, niche: string): ResolvedEnglishRanking | null {
  const spec = RANKING_HUBS[hub];
  if (!spec) return null;
  const slug = (niche || '').trim().toLowerCase();
  if (!BEST_OF_PAGE_MAP.has(slug)) return null;
  if (rankingListSize(slug) !== spec.size) return null;
  return { slug, variant: spec.variant };
}

export function isEnglishRankingHubSegment(hub: string): boolean {
  return hub in RANKING_HUBS;
}
