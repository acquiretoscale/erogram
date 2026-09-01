/**
 * Ranking page list-size branding (DMCA alignment).
 * - Live pool &gt; 50 → Top 50 (fixed set from 2026-08-31)
 * - Everyone else → Top 25 (was Top 10)
 */
export const TOP_50_RANKING_SLUGS = new Set([
  'milf',
  'latina',
  'alt',
  'goth',
  'tattoo',
  'blonde',
  'cosplay',
  'petite',
  'solo',
  'big-ass',
  'ahegao',
  'model',
  'joi',
  'nude',
  'big-boobs',
  'muslim',
  'arab',
  'fetish',
  'redhead',
  'teen',
  'brunette',
  'streamer',
  'thick',
  'onlyfans-free',
  'turkish',
  'feet',
  'asian',
  'anal',
  'dominatrix',
  'lingerie',
  'toys',
  'sexting',
  'lesbian',
  'findom',
]);

export function isTop50RankingSlug(slug: string): boolean {
  return TOP_50_RANKING_SLUGS.has(slug);
}

export function rankingListSize(slug: string): 25 | 50 {
  return isTop50RankingSlug(slug) ? 50 : 25;
}

/** URL segment prefix for /ofsearch/{prefix}{slug}-onlyfans-models */
export function rankingBlogPrefix(slug: string): 'top-25-' | 'top-50-' {
  return isTop50RankingSlug(slug) ? 'top-50-' : 'top-25-';
}

/**
 * Rewrite stored ranking "10" copy to this page's size (25 or 50).
 * Titles, meta, body, localized URL segments.
 */
export function rankingCopyForSlug(text: string, slug: string): string {
  const n = rankingListSize(slug);
  return text
    .replace(/Top 10/g, `Top ${n}`)
    .replace(/top 10/g, `top ${n}`)
    .replace(/TOP 10/g, `TOP ${n}`)
    .replace(/top-10/g, `top-${n}`)
    .replace(/\b10\b/g, String(n));
}

/** @deprecated use rankingCopyForSlug */
export function rankingCopy10to50(text: string): string {
  return text
    .replace(/Top 10/g, 'Top 50')
    .replace(/top 10/g, 'top 50')
    .replace(/TOP 10/g, 'TOP 50')
    .replace(/top-10/g, 'top-50')
    .replace(/\b10\b/g, '50');
}
