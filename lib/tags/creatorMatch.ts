import type { BestOfPage } from '@/app/best-onlyfans-accounts/bestOfPages';
import { BEST_OF_PAGES, BEST_OF_PAGE_MAP } from '@/app/best-onlyfans-accounts/bestOfPages';
import { getKeywordCategoryPatterns, OF_KEYWORD_CATEGORIES } from '@/lib/onlyfanssearch/keywordCategories';

const R2 = process.env.R2_PUBLIC_URL || '';

export function buildR2AvatarMatch() {
  if (!R2) return { $ne: '' as const };
  try {
    const host = new URL(R2).host.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return { $regex: new RegExp(host, 'i') };
  } catch {
    return { $ne: '' as const };
  }
}

function buildKeywordRegex(patterns: string[]) {
  const parts = patterns.map((p) => {
    if (p.includes('\\b') || p.includes('\\')) return p;
    const esc = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return `\\b${esc}\\b`;
  });
  return new RegExp(`(${parts.join('|')})`, 'i');
}

const MAX_CATEGORIES = 4;

/** Related category slugs — browse/search returns creators tagged with any slug in the group.
 *  Display counts: use buildCategoryDisplayCounts() — never raw single-tag queries. */
export const CATEGORY_SLUG_EXPAND: Record<string, readonly string[]> = {
  milf: ['milf', 'mature', 'housewife'],
  mature: ['milf', 'mature', 'housewife'],
  housewife: ['milf', 'mature', 'housewife'],
  asian: ['asian', 'taiwanese', 'japanese', 'filipina', 'chinese', 'south-korean', 'korean', 'thai'],
  twerk: ['twerk', 'latina', 'curvy'],
  thick: ['thick', 'curvy', 'chubby'],
  curvy: ['thick', 'curvy', 'chubby'],
  chubby: ['thick', 'curvy', 'chubby'],
  goth: ['goth', 'alt', 'tattoo'],
  alt: ['goth', 'alt', 'tattoo'],
  tattoo: ['goth', 'alt', 'tattoo'],
  ahegao: ['ahegao', 'blowjob', 'joi'],
  blowjob: ['ahegao', 'blowjob', 'joi'],
  joi: ['ahegao', 'blowjob', 'joi'],
};

export function expandCategorySlug(slug: string): string[] {
  return [...(CATEGORY_SLUG_EXPAND[slug] ?? [slug])];
}

function categoriesMatch(slug: string): string | { $in: string[] } {
  const slugs = expandCategorySlug(slug);
  return slugs.length === 1 ? slugs[0] : { $in: slugs };
}

/** Same threshold as scripts/purge-whale-creators.js — public browse hides these unless OF admin imported. */
export const WHALE_LIKES_MIN = 180_000;

/** Hide 180K+ likes on search/browse unless the profile was imported via OF admin. */
export const whaleBrowseLikesFilter = {
  $nor: [{ likesCount: { $gte: WHALE_LIKES_MIN }, adminImported: { $ne: true } }],
};

export const creatorQualityFilter = {
  avatar: buildR2AvatarMatch(),
  gender: 'female',
  deleted: { $ne: true },
  $expr: { $lte: [{ $size: { $ifNull: ['$categories', []] } }, MAX_CATEGORIES] },
  ...whaleBrowseLikesFilter,
};

export function buildBestOfCreatorMatch(page: BestOfPage): Record<string, unknown> {
  const base: Record<string, unknown> = { ...creatorQualityFilter };

  if (page.match === 'category' && page.categorySlug) {
    base.categories = categoriesMatch(page.categorySlug);
    return base;
  }

  if (page.patterns?.length) {
    const regex = buildKeywordRegex(page.patterns);
    base.$or = [
      { bio: regex },
      { categories: regex },
      { name: regex },
      { username: regex },
      { location: regex },
    ];
  }

  return base;
}

function keywordFieldsMatch(patterns: string[], creator: RankingMatchFields): boolean {
  const regex = buildKeywordRegex(patterns);
  const cats = creator.categories ?? [];
  return (
    regex.test(creator.bio ?? '') ||
    cats.some((c) => regex.test(c)) ||
    regex.test(creator.name ?? '') ||
    regex.test(creator.username ?? '') ||
    regex.test(creator.location ?? '')
  );
}

export function buildSlugCreatorMatch(slug: string): Record<string, unknown> {
  const keywordPatterns = getKeywordCategoryPatterns(slug);
  if (keywordPatterns?.length) {
    const regex = buildKeywordRegex(keywordPatterns);
    return {
      ...creatorQualityFilter,
      $or: [
        { bio: regex },
        { categories: regex },
        { name: regex },
        { username: regex },
        { location: regex },
      ],
    };
  }

  return {
    ...creatorQualityFilter,
    categories: categoriesMatch(slug),
  };
}

/** Bio-keyword OF categories this creator matches (for profile pills). */
export function getMatchingKeywordOfCategories(creator: RankingMatchFields): { slug: string; label: string }[] {
  const out: { slug: string; label: string }[] = [];
  for (const cat of OF_KEYWORD_CATEGORIES) {
    if (keywordFieldsMatch([...cat.patterns], creator)) {
      out.push({ slug: cat.slug, label: cat.name });
    }
  }
  return out;
}

/** Match clause for one niche slug (OF category, best-of category, or best-of keyword). */
export function buildNicheMatchClause(slug: string): Record<string, unknown> {
  const page = BEST_OF_PAGE_MAP.get(slug);

  if (page?.match === 'keyword' && page.patterns?.length) {
    const regex = buildKeywordRegex(page.patterns);
    return {
      $or: [
        { bio: regex },
        { categories: regex },
        { name: regex },
        { username: regex },
        { location: regex },
      ],
    };
  }

  const catSlug = page?.categorySlug ?? slug;
  return { categories: categoriesMatch(catSlug) };
}

/** Creators matching both parent and modifier niches (combo sub-niche pages). */
export function buildComboCreatorMatch(parentSlug: string, modifierSlug: string): Record<string, unknown> {
  return {
    ...creatorQualityFilter,
    $and: [buildNicheMatchClause(parentSlug), buildNicheMatchClause(modifierSlug)],
  };
}

// ── Reverse lookup: which ranking pages does one creator appear on? ──────────

export interface RankingMatchFields {
  categories?: string[];
  bio?: string;
  name?: string;
  username?: string;
  location?: string;
}

function matchesNiche(slug: string, creator: RankingMatchFields): boolean {
  const page = BEST_OF_PAGE_MAP.get(slug);
  const cats = creator.categories ?? [];

  if (page?.match === 'keyword' && page.patterns?.length) {
    const regex = buildKeywordRegex(page.patterns);
    return (
      regex.test(creator.bio ?? '') ||
      cats.some((c) => regex.test(c)) ||
      regex.test(creator.name ?? '') ||
      regex.test(creator.username ?? '') ||
      regex.test(creator.location ?? '')
    );
  }

  const expanded = expandCategorySlug(page?.categorySlug ?? slug);
  return cats.some((c) => expanded.includes(c));
}

/**
 * Every /best-onlyfans-accounts ranking page this creator qualifies for.
 * Mirrors buildBestOfCreatorMatch so the profile shows the same memberships
 * the ranking pages themselves compute. A creator can be on many pages.
 */
export function getCreatorRankingPages(creator: RankingMatchFields): BestOfPage[] {
  // Same scraper-spam guard the ranking queries apply.
  if ((creator.categories?.length ?? 0) > MAX_CATEGORIES) return [];

  return BEST_OF_PAGES.filter((page) => {
    if (page.match === 'combo' && page.categorySlugs?.length === 2) {
      return matchesNiche(page.categorySlugs[0], creator) && matchesNiche(page.categorySlugs[1], creator);
    }
    return matchesNiche(page.slug, creator);
  }).sort((a, b) => b.count - a.count);
}
