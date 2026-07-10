import type { Locale } from '@/lib/i18n/config';
import {
  getLocalizedListingSlug,
  resolveListingSlugFromPublicSegment,
  type ListingSlugType,
} from './listingSlugTranslations';

export function listingPublicPath(type: ListingSlugType, enSlug: string, locale: Locale): string {
  const seg = locale === 'en' ? enSlug : getLocalizedListingSlug(type, enSlug, locale) || enSlug;
  if (locale === 'en') return `/${seg}`;
  return `/${locale}/${seg}`;
}

export { resolveListingSlugFromPublicSegment };
