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

/** Strip legacy registry PCRE snippets (e.g. "\\bcalifornia\\b") down to plain keywords. */
function normalizeKeywordPattern(p: string): string {
  return p.replace(/^\\b/, '').replace(/\\b$/, '').trim();
}

function buildKeywordRegex(patterns: string[]) {
  const parts = patterns.map((p) => {
    const plain = normalizeKeywordPattern(p);
    if (!plain) return null;
    // Preserve intentional interior spacing (e.g. " bi ").
    if (plain.startsWith(' ') || plain.endsWith(' ')) {
      const esc = plain.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return esc;
    }
    const esc = plain.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return `\\b${esc}\\b`;
  }).filter(Boolean) as string[];
  return new RegExp(`(${parts.join('|')})`, 'i');
}

/** Bio-only keyword pages (no name/username/category matching). */
const BIO_ONLY_BEST_OF_SLUGS = new Set([
  'girlfriend',
  'toys',
  'instagram',
  'korean',
  'caucasian',
  'couple-lesbian',
  'couple-straight',
  'ecuadorian',
  'public-sex',
  'shower-sex',
  'singaporean',
  'step-fantasy',
]);

function keywordMatchFields(page: BestOfPage): Array<'bio' | 'location' | 'categories' | 'name' | 'username'> {
  if (BIO_ONLY_BEST_OF_SLUGS.has(page.slug)) return ['bio'];
  if (page.type === 'state') return ['bio', 'location'];
  return ['bio', 'categories', 'name', 'username', 'location'];
}

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
  ...whaleBrowseLikesFilter,
};

export function buildBestOfCreatorMatch(page: BestOfPage): Record<string, unknown> {
  const base: Record<string, unknown> = { ...creatorQualityFilter };

  if (page.match === 'category' && page.categorySlug) {
    base.categories = categoriesMatch(page.categorySlug);
    return base;
  }

  if (page.match === 'combo' && page.categorySlugs?.length === 2) {
    return buildComboCreatorMatch(page.categorySlugs[0], page.categorySlugs[1]);
  }

  if (page.patterns?.length) {
    const regex = buildKeywordRegex(page.patterns);
    const fields = keywordMatchFields(page);
    const or = fields.map((field) => ({ [field]: regex }));
    base.$or = or;
  }

  return base;
}

function keywordFieldsMatch(patterns: string[], creator: RankingMatchFields, page?: BestOfPage): boolean {
  const regex = buildKeywordRegex(patterns);
  const cats = creator.categories ?? [];
  const fields = page ? keywordMatchFields(page) : ['bio', 'categories', 'name', 'username', 'location'];
  return fields.some((field) => {
    if (field === 'categories') return cats.some((c) => regex.test(c));
    return regex.test((creator as Record<string, string | undefined>)[field] ?? '');
  });
}

export function buildSlugCreatorMatch(slug: string): Record<string, unknown> {
  const keywordPatterns = getKeywordCategoryPatterns(slug);
  if (keywordPatterns?.length) {
    const regex = buildKeywordRegex(keywordPatterns);
    const orClause: Record<string, unknown>[] = [
      { bio: regex },
      { categories: regex },
      { name: regex },
      { username: regex },
      { location: regex },
    ];
    return {
      ...creatorQualityFilter,
      $or: orClause,
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
    const fields = keywordMatchFields(page);
    return {
      $or: fields.map((field) => ({ [field]: regex })),
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
    return keywordFieldsMatch(page.patterns, creator, page);
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
  return BEST_OF_PAGES.filter((page) => {
    if (page.match === 'combo' && page.categorySlugs?.length === 2) {
      return matchesNiche(page.categorySlugs[0], creator) && matchesNiche(page.categorySlugs[1], creator);
    }
    return matchesNiche(page.slug, creator);
  }).sort((a, b) => b.count - a.count);
}
