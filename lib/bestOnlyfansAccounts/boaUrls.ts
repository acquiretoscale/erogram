import type { Locale } from '@/lib/i18n/config';
import { getLocalizedOfCategorySlug, resolveOfCategorySlugFromPublicSegment } from './slugTranslations';
import { getLocalizedHubSegment } from '@/lib/i18n/hubSlugTranslations';

export function ofCategoryPublicPath(categorySlug: string, locale: Locale): string {
  const hub =
    locale === 'en'
      ? 'best-onlyfans-accounts'
      : getLocalizedHubSegment('best-onlyfans-accounts', locale) || 'best-onlyfans-accounts';
  const catSeg =
    locale === 'en' ? categorySlug : getLocalizedOfCategorySlug(categorySlug, locale) || categorySlug;
  if (locale === 'en') return `/best-onlyfans-accounts/${catSeg}`;
  return `/${locale}/${hub}/${catSeg}`;
}

export function ofCategoryFromPublicSegment(segment: string): string | null {
  return resolveOfCategorySlugFromPublicSegment(segment);
}
