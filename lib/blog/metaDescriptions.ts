export interface BlogMetaSet {
  en: string;
  de?: string;
  es?: string;
  pt?: string;
}

/**
 * Master list for Blog section.
 * Keys can be:
 * - blog category (e.g. "news", "guides")
 * - article slug (for individual posts)
 */
export const META_DESCRIPTIONS: Record<string, BlogMetaSet> = {};

export function getBlogMetaDescription(slug: string, locale: 'en' | 'de' | 'es' | 'pt' = 'en'): string {
  const entry = META_DESCRIPTIONS[slug];
  if (!entry) return '';
  return entry[locale] || entry.en || '';
}
