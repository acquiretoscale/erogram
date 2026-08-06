import { BEST_OF_PAGES, type BestOfPage, bestOfBlogSlug } from '@/app/best-onlyfans-accounts/bestOfPages';

function bestRankingLinkTitle(label: string, year: number): string {
  return `10 Best ${label} OnlyFans Accounts & Creators (${year})`;
}

function top10RankingLinkTitle(label: string, year: number): string {
  return `Top 10 ${label} OnlyFans Models In ${year}`;
}

export interface LocationBrowseItem {
  slug: string;
  href: string;
  title: string;
  count: number;
}

export interface LocationBrowseSection {
  id: string;
  label: string;
  items: LocationBrowseItem[];
}

function toBestItem(page: BestOfPage): LocationBrowseItem {
  const year = new Date().getFullYear();
  return {
    slug: `${page.slug}-best`,
    href: `/best-onlyfans-accounts/${page.slug}`,
    title: bestRankingLinkTitle(page.label, year),
    count: page.count,
  };
}

function toTop10Item(page: BestOfPage): LocationBrowseItem {
  const year = new Date().getFullYear();
  return {
    slug: `${page.slug}-top10`,
    href: `/onlyfanssearch/${bestOfBlogSlug(page.slug)}`,
    title: top10RankingLinkTitle(page.label, year),
    count: page.count,
  };
}

export function getLocationBrowseSections(): LocationBrowseSection[] {
  const countryPages = BEST_OF_PAGES.filter((p) => p.type === 'country').sort((a, b) => b.count - a.count);
  const statePages = BEST_OF_PAGES.filter((p) => p.type === 'state').sort((a, b) => b.count - a.count);

  return [
    { id: 'best-countries', label: '10 Best — Countries', items: countryPages.map(toBestItem) },
    { id: 'top10-countries', label: 'Top 10 — Countries', items: countryPages.map(toTop10Item) },
    { id: 'best-states', label: '10 Best — US States', items: statePages.map(toBestItem) },
    { id: 'top10-states', label: 'Top 10 — US States', items: statePages.map(toTop10Item) },
  ].filter((section) => section.items.length > 0);
}
