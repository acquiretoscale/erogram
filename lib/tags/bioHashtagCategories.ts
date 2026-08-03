import hashtagsGte10Data from './hashtagsGte10.json';

/** Site ban — never expose as browse/tag category. */
const BANNED_BIO_HASHTAG_SLUGS = new Set(['india', 'indian']);

export const BIO_HASHTAG_MIN_CREATORS = hashtagsGte10Data.minCreators;

const SLUGS: Record<string, number> = Object.fromEntries(
  Object.entries(hashtagsGte10Data.slugs).filter(([slug]) => !BANNED_BIO_HASHTAG_SLUGS.has(slug)),
);

export const BIO_HASHTAG_SLUGS = new Set(Object.keys(SLUGS));

export function isBioHashtagSlug(slug: string): boolean {
  return BIO_HASHTAG_SLUGS.has(slug);
}

export function bioHashtagCreatorCount(slug: string): number | undefined {
  return SLUGS[slug];
}

/** Display label from slug — no copy invention, title-case words only. */
export function bioHashtagLabel(slug: string): string {
  return slug
    .split('-')
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ');
}

/** Bio + text match patterns for mined hashtag slugs (#pussy, naturaltits, etc.). */
export function getBioHashtagSearchPatterns(slug: string): string[] {
  if (!isBioHashtagSlug(slug)) return [];
  const spaced = slug.replace(/-/g, ' ');
  return spaced === slug ? [slug] : [slug, spaced];
}

export type BioHashtagCategoryRow = { name: string; emoji: string; slug: string };

/** OF category rows for mined bio hashtags not already registered. */
export function buildBioHashtagCategoryRows(existingSlugs: Set<string>): BioHashtagCategoryRow[] {
  return [...BIO_HASHTAG_SLUGS]
    .filter((slug) => !existingSlugs.has(slug))
    .sort((a, b) => (SLUGS[b] ?? 0) - (SLUGS[a] ?? 0) || a.localeCompare(b))
    .map((slug) => ({
      name: bioHashtagLabel(slug),
      emoji: '🏷️',
      slug,
    }));
}
