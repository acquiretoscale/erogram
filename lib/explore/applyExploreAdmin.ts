import type { ExploreCategory, ExploreSite } from '@/lib/explore/topPornSitesData';
import { applySiteOrder, exploreSiteKey } from '@/lib/explore/siteKey';
import { customRowToExploreSite } from '@/lib/explore/exploreCustomSites';

export type ExploreSiteOverrideRow = {
  categorySlug: string;
  siteKey: string;
  name?: string;
  externalUrl?: string;
  description?: string;
  image?: string;
  hidden?: boolean;
  isCustom?: boolean;
};

export type ExploreCategoryOrderRow = {
  categorySlug: string;
  siteKeys: string[];
};

function overrideKey(categorySlug: string, siteKey: string): string {
  return `${categorySlug}:${siteKey}`;
}

function mergeSiteOverride(site: ExploreSite, override?: ExploreSiteOverrideRow): ExploreSite {
  if (!override || override.isCustom) return site;
  return {
    ...site,
    externalUrl: override.externalUrl ?? site.externalUrl,
    description: override.description ?? site.description,
  };
}

export function applyExploreAdminData(
  categories: ExploreCategory[],
  overrides: ExploreSiteOverrideRow[],
  orders: ExploreCategoryOrderRow[],
): ExploreCategory[] {
  const overrideMap = new Map(
    overrides.map((row) => [overrideKey(row.categorySlug, row.siteKey), row]),
  );
  const orderMap = new Map(orders.map((row) => [row.categorySlug, row.siteKeys]));
  const hiddenKeys = new Set(
    overrides.filter((row) => row.hidden).map((row) => overrideKey(row.categorySlug, row.siteKey)),
  );

  return categories.map((category) => {
    let sites = category.sites
      .filter((site) => !hiddenKeys.has(overrideKey(category.slug, exploreSiteKey(site))))
      .map((site) =>
        mergeSiteOverride(site, overrideMap.get(overrideKey(category.slug, exploreSiteKey(site)))),
      );

    const customSites = overrides
      .filter((row) => row.isCustom && row.categorySlug === category.slug && !row.hidden)
      .map((row) => customRowToExploreSite(row));

    sites = [...sites, ...customSites];

    const order = orderMap.get(category.slug);
    if (order?.length) sites = applySiteOrder(sites, order);
    return { ...category, sites };
  });
}

export function mergeListingOverride<T extends { externalUrl: string; description: string; name?: string; image?: string }>(
  listing: T,
  override?: Pick<ExploreSiteOverrideRow, 'externalUrl' | 'description' | 'name' | 'image'>,
): T {
  if (!override) return listing;
  return {
    ...listing,
    name: override.name ?? listing.name,
    externalUrl: override.externalUrl ?? listing.externalUrl,
    description: override.description ?? listing.description,
    image: override.image ?? listing.image,
  };
}
