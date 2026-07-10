import type { Locale } from '@/lib/i18n/config';
import { OF_SEARCH_HUB } from '@/lib/i18n/config';
import {
  BEST_OF_BLOG_PREFIX,
  BEST_OF_BLOG_SUFFIX,
  BEST_OF_PAGE_MAP,
  bestOfBlogSlug,
} from '@/app/best-onlyfans-accounts/bestOfPages';
import { getLocalizedSlug, resolveBestOfSlugFromPublicSegment } from './slugTranslations';

/** URL path segment after /onlyfanssearch/ (or localized hub). */
export function hottestRankingPathSegment(slug: string, locale: Locale): string {
  if (locale !== 'en') {
    const localized = getLocalizedSlug(slug, locale);
    if (localized?.trim()) return localized;
  }
  return bestOfBlogSlug(slug);
}

/** Full public path including /de/onlyfans-suche/… when locale is de. */
export function hottestRankingPublicPath(slug: string, locale: Locale): string {
  const segment = hottestRankingPathSegment(slug, locale);
  if (locale === 'en') return `/onlyfanssearch/${segment}`;
  return `/${locale}/${OF_SEARCH_HUB[locale]}/${segment}`;
}

/** Resolve internal best-of slug from any public path segment (EN or localized DE/ES). */
export function bestOfSlugFromPublicPath(pathSegment: string): string | null {
  if (pathSegment.startsWith(BEST_OF_BLOG_PREFIX) && pathSegment.endsWith(BEST_OF_BLOG_SUFFIX)) {
    const inner = pathSegment.slice(BEST_OF_BLOG_PREFIX.length, pathSegment.length - BEST_OF_BLOG_SUFFIX.length);
    if (BEST_OF_PAGE_MAP.has(inner)) return inner;
  }
  return resolveBestOfSlugFromPublicSegment(pathSegment);
}
