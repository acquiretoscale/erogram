import type { BestOfPage } from '@/app/best-onlyfans-accounts/bestOfPages';
import { BEST_OF_PAGES, bestOfBlogSlug } from '@/app/best-onlyfans-accounts/bestOfPages';
import type { TagDefinition } from '@/lib/tags/registry';

export interface TagRankingPage {
  slug: string;
  label: string;
  type: BestOfPage['type'];
  href: string;
  isPrimary: boolean;
}

export function getRankingPagesForTag(def: TagDefinition): TagRankingPage[] {
  const out: TagRankingPage[] = [];
  const seen = new Set<string>();

  const push = (page: BestOfPage, isPrimary: boolean) => {
    if (seen.has(page.slug)) return;
    seen.add(page.slug);
    out.push({
      slug: page.slug,
      label: page.label,
      type: page.type,
      href: `/onlyfanssearch/${bestOfBlogSlug(page.slug)}`,
      isPrimary,
    });
  };

  if (def.bestOfPage) push(def.bestOfPage, true);

  for (const page of BEST_OF_PAGES) {
    if (seen.has(page.slug)) continue;
    const related =
      page.categorySlug === def.slug ||
      page.categorySlug === def.creatorCategorySlug ||
      page.slug === def.creatorCategorySlug ||
      page.label.toLowerCase() === def.label.toLowerCase();
    if (related) push(page, false);
  }

  out.sort((a, b) => {
    if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
    return a.label.localeCompare(b.label);
  });

  return out;
}
