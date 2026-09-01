import type { Locale } from '@/lib/i18n/config';
import { getLocalizedOfCategorySlug, resolveOfCategorySlugFromPublicSegment } from './slugTranslations';
import { getLocalizedHubSegment } from '@/lib/i18n/hubSlugTranslations';
import { rankingEnglishPublicPath } from '@/lib/bestOfPageContent/hottestUrls';

export function bestHubPublicPath(locale: Locale): string {
  if (locale === 'en') return '/best-onlyfans-accounts';
  return `/${locale}/${getLocalizedHubSegment('best-onlyfans-accounts', locale) || 'best-onlyfans-accounts'}`;
}

export function ofCategoryPublicPath(categorySlug: string, locale: Locale): string {
  if (locale === 'en') return rankingEnglishPublicPath(categorySlug, 'best');
  const hub = getLocalizedHubSegment('best-onlyfans-accounts', locale) || 'best-onlyfans-accounts';
  const catSeg = getLocalizedOfCategorySlug(categorySlug, locale) || categorySlug;
  return `/${locale}/${hub}/${catSeg}`;
}

export function ofCategoryFromPublicSegment(segment: string): string | null {
  return resolveOfCategorySlugFromPublicSegment(segment);
}
