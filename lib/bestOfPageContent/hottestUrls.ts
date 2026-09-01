import type { Locale } from '@/lib/i18n/config';
import { OF_SEARCH_HUB } from '@/lib/i18n/config';
import {
  BEST_OF_BLOG_PREFIX,
  BEST_OF_BLOG_PREFIX_25,
  BEST_OF_BLOG_PREFIX_50,
  BEST_OF_BLOG_SUFFIX,
  BEST_OF_PAGE_MAP,
  bestOfBlogSlug,
} from '@/app/best-onlyfans-accounts/bestOfPages';
import { getLocalizedSlug, resolveBestOfSlugFromPublicSegment } from './slugTranslations';
import { rankingListSize } from './top50Rankings';

const RANKING_PREFIXES = [BEST_OF_BLOG_PREFIX_50, BEST_OF_BLOG_PREFIX_25, BEST_OF_BLOG_PREFIX] as const;

export type EnglishRankingKind = 'top' | 'best';

const ENGLISH_RANKING_HUB_RE = /^(top|best)-(25|50)-onlyfans-models$/;

/** English ranking URL: /ofsearch/top-25-onlyfans-models/{niche} */
export function rankingEnglishPublicPath(slug: string, kind: EnglishRankingKind): string {
  const n = rankingListSize(slug);
  return `/ofsearch/${kind}-${n}-onlyfans-models/${slug}`;
}

export function parseEnglishRankingHub(
  hub: string,
  niche: string,
): { slug: string; kind: EnglishRankingKind; size: 25 | 50 } | null {
  const m = (hub || '').match(ENGLISH_RANKING_HUB_RE);
  if (!m) return null;
  const slug = (niche || '').trim().toLowerCase();
  if (!BEST_OF_PAGE_MAP.has(slug)) return null;
  const size = Number(m[2]) as 25 | 50;
  if (rankingListSize(slug) !== size) return null;
  return { slug, kind: m[1] as EnglishRankingKind, size };
}

/** URL path segment after /ofsearch/ (or localized hub). */
export function hottestRankingPathSegment(slug: string, locale: Locale): string {
  if (locale !== 'en') {
    const localized = getLocalizedSlug(slug, locale);
    if (localized?.trim()) return localized;
  }
  return bestOfBlogSlug(slug);
}

/** Full public path including /de/ofsearch/… when locale is de. */
export function hottestRankingPublicPath(slug: string, locale: Locale): string {
  if (locale === 'en') return rankingEnglishPublicPath(slug, 'top');
  const segment = hottestRankingPathSegment(slug, locale);
  return `/${locale}/${OF_SEARCH_HUB[locale]}/${segment}`;
}

/** Resolve internal best-of slug from any public path segment (EN or localized DE/ES/PT). */
export function bestOfSlugFromPublicPath(pathSegment: string): string | null {
  if (pathSegment.endsWith(BEST_OF_BLOG_SUFFIX)) {
    for (const prefix of RANKING_PREFIXES) {
      if (!pathSegment.startsWith(prefix)) continue;
      const inner = pathSegment.slice(prefix.length, pathSegment.length - BEST_OF_BLOG_SUFFIX.length);
      if (BEST_OF_PAGE_MAP.has(inner)) return inner;
    }
  }
  return resolveBestOfSlugFromPublicSegment(pathSegment);
}
