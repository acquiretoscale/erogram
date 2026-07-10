export interface AinsfwMetaSet {
  en: string;
  de?: string;
  es?: string;
  pt?: string;
}

/**
 * Master list for AI NSFW tool pages (hub + individual tools).
 * Key = tool slug (from data.ts or submission)
 */
export const META_DESCRIPTIONS: Record<string, AinsfwMetaSet> = {};

export function getAinsfwMetaDescription(slug: string, locale: 'en' | 'de' | 'es' | 'pt' = 'en'): string {
  const entry = META_DESCRIPTIONS[slug];
  if (!entry) return '';
  return entry[locale] || entry.en || '';
}
