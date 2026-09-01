import { EXPLORE_CATEGORIES } from '@/lib/explore/topPornSitesData';
import { exploreSiteListingPath } from '@/lib/explore/exploreSiteListings';
import type { ExploreSite } from '@/lib/explore/topPornSitesData';
import type { ExploreSiteListing } from '@/lib/explore/exploreSiteListings';

const EXTRA_CATEGORY_TITLES: Record<string, string> = {
  'best-telegram-porn-bots': 'Best Telegram porn bots',
  'best-ai-companion-websites': 'Best AI companion websites',
};

export function getExploreCategoryTitle(categorySlug: string): string {
  const fromStatic = EXPLORE_CATEGORIES.find((c) => c.slug === categorySlug)?.title;
  return fromStatic || EXTRA_CATEGORY_TITLES[categorySlug] || categorySlug;
}

export function slugifyExploreSiteKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function customRowToExploreSite(row: {
  siteKey: string;
  name?: string;
  externalUrl?: string;
  description?: string;
  image?: string;
}): ExploreSite {
  return {
    name: row.name || row.siteKey,
    url: exploreSiteListingPath(row.siteKey),
    externalUrl: row.externalUrl || undefined,
    description: row.description || undefined,
    image: row.image || undefined,
  };
}

export function customRowToListing(row: {
  siteKey: string;
  categorySlug: string;
  name?: string;
  externalUrl?: string;
  description?: string;
  image?: string;
}): ExploreSiteListing {
  return {
    slug: row.siteKey,
    name: row.name || row.siteKey,
    description: row.description || '',
    externalUrl: row.externalUrl || '',
    image: row.image || '/assets/og-default.png',
    categorySlug: row.categorySlug,
    categoryTitle: getExploreCategoryTitle(row.categorySlug),
  };
}
