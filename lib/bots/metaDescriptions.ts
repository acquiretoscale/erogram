export interface BotMetaSet {
  en: string;
  de: string;
  es: string;
  pt: string;
}

/**
 * Master list for all Bot-related meta descriptions.
 * Keys:
 * - category slugs
 * - country slugs
 * - individual bot slugs
 */
export const META_DESCRIPTIONS: Record<string, BotMetaSet> = {};

export function getBotMetaDescription(slug: string, locale: 'en' | 'de' | 'es' | 'pt' = 'en'): string {
  const entry = META_DESCRIPTIONS[slug];
  if (!entry) return '';
  return entry[locale] || entry.en || '';
}
