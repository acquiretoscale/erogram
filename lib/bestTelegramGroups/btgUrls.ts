import type { Locale } from '@/lib/i18n/config';
import { getLocalizedBestTgSlug, resolveBestTgSlugFromPublicSegment } from './slugTranslations';
import { getLocalizedHubSegment } from '@/lib/i18n/hubSlugTranslations';

export function bestTgCategoryPublicPath(categorySlug: string, locale: Locale): string {
  const hub =
    locale === 'en'
      ? 'best-telegram-groups'
      : getLocalizedHubSegment('best-telegram-groups', locale) || 'best-telegram-groups';
  const catSeg =
    locale === 'en' ? categorySlug : getLocalizedBestTgSlug(categorySlug, locale) || categorySlug;
  if (locale === 'en') return `/best-telegram-groups/${catSeg}`;
  return `/${locale}/${hub}/${catSeg}`;
}

export function bestTgCategoryFromPublicSegment(segment: string): string | null {
  return resolveBestTgSlugFromPublicSegment(segment);
}
