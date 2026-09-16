/** Shared explore individual site listing registry. */

import { PREMIUM_PORN_LISTINGS } from '@/lib/explore/premiumPornListings';
import { LISTINGS as LIVE_SEX_CAMS_LISTINGS } from '@/lib/explore/liveSexCamsListings';
import { LISTINGS as VR_PORN_LISTINGS } from '@/lib/explore/vrPornListings';
import { LISTINGS as PREMIUM_ASIAN_PORN_LISTINGS } from '@/lib/explore/premiumAsianPornListings';
import { LISTINGS as UNCENSORED_JAV_PORN_LISTINGS } from '@/lib/explore/uncensoredJavPornListings';
import { REMAINING_CATEGORY_LISTING_GROUPS } from '@/lib/explore/remainingCategoryListings';

export const MAX_LISTING_CATEGORIES = 10;

export type ExploreSiteListingBase = {
  slug: string;
  name: string;
  description: string;
  image: string;
  icon?: string;
  externalUrl: string;
  extraCategorySlugs?: string[];
};

export type ExploreSiteListing = ExploreSiteListingBase & {
  categorySlug: string;
  categoryTitle: string;
};

const ROOT_SEP = '-porn-';

export function categoryPathKey(categorySlug: string): string {
  return categorySlug.replace(/^best-/, '');
}

export function exploreListingRootSlug(slug: string, categorySlug: string): string {
  return `${slug}${ROOT_SEP}${categoryPathKey(categorySlug)}`;
}

const WITH_CATEGORY: ExploreSiteListing[] = [
  ...PREMIUM_PORN_LISTINGS.map((listing) => ({
    ...listing,
    categorySlug: 'best-premium-porn',
    categoryTitle: 'Best Premium Porn',
  })),
  ...LIVE_SEX_CAMS_LISTINGS.map((listing) => ({
    ...listing,
    categorySlug: 'best-live-sex-cams',
    categoryTitle: 'Best Live Sex Cams',
  })),
  ...VR_PORN_LISTINGS.map((listing) => ({
    ...listing,
    categorySlug: 'best-vr-porn',
    categoryTitle: 'Best VR Porn',
  })),
  ...PREMIUM_ASIAN_PORN_LISTINGS.map((listing) => ({
    ...listing,
    categorySlug: 'best-premium-asian-porn-sites',
    categoryTitle: 'Premium Asian Porn Sites',
  })),
  ...UNCENSORED_JAV_PORN_LISTINGS.map((listing) => ({
    ...listing,
    categorySlug: 'best-uncensored-jav-porn-websites',
    categoryTitle: 'Best Uncensored Jav Porn websites',
  })),
  ...REMAINING_CATEGORY_LISTING_GROUPS.flatMap((group) =>
    group.listings.map((listing) => ({
      ...listing,
      categorySlug: group.categorySlug,
      categoryTitle: group.categoryTitle,
    })),
  ),
];

export const ALL_EXPLORE_SITE_LISTINGS = WITH_CATEGORY;

export function getExploreSiteListing(slug: string): ExploreSiteListing | undefined {
  return ALL_EXPLORE_SITE_LISTINGS.find((entry) => entry.slug === slug);
}

export function getExploreSiteListingByRootSlug(rootSlug: string): ExploreSiteListing | undefined {
  return ALL_EXPLORE_SITE_LISTINGS.find(
    (entry) => exploreListingRootSlug(entry.slug, entry.categorySlug) === rootSlug,
  );
}

export function exploreSiteListingPath(slug: string, categorySlug?: string): string {
  if (categorySlug) return `/${exploreListingRootSlug(slug, categorySlug)}`;
  const listing = getExploreSiteListing(slug);
  if (listing) return `/${exploreListingRootSlug(listing.slug, listing.categorySlug)}`;
  return `/${slug}`;
}

export function getExploreSiteAlternatives(slug: string, limit = 8, categorySlug?: string): ExploreSiteListingBase[] {
  const listing = categorySlug
    ? ALL_EXPLORE_SITE_LISTINGS.find((entry) => entry.slug === slug && entry.categorySlug === categorySlug)
    : getExploreSiteListing(slug);
  if (!listing) return [];

  return ALL_EXPLORE_SITE_LISTINGS.filter(
    (entry) => entry.categorySlug === listing.categorySlug && entry.slug !== slug,
  )
    .slice(0, limit)
    .map(({ slug: altSlug, name, description, image, icon, externalUrl }) => ({
      slug: altSlug,
      name,
      description,
      image,
      icon,
      externalUrl,
    }));
}

export function exploreSitesFromListings(listings: ExploreSiteListingBase[], categorySlug?: string) {
  return listings.map((listing) => ({
    name: listing.name,
    url: exploreSiteListingPath(listing.slug, categorySlug),
    externalUrl: listing.externalUrl,
    description: listing.description,
    image: listing.image,
    icon: listing.icon,
  }));
}

function listingHost(url?: string): string {
  if (!url || url.startsWith('/')) return '';
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

function extraSlugs(listing: ExploreSiteListingBase): string[] {
  return (listing.extraCategorySlugs || []).slice(0, MAX_LISTING_CATEGORIES - 1);
}

function allPrimaryListings(): { listing: ExploreSiteListingBase; primaryCategory: string }[] {
  return [
    ...PREMIUM_PORN_LISTINGS.map((listing) => ({ listing, primaryCategory: 'best-premium-porn' })),
    ...LIVE_SEX_CAMS_LISTINGS.map((listing) => ({ listing, primaryCategory: 'best-live-sex-cams' })),
    ...VR_PORN_LISTINGS.map((listing) => ({ listing, primaryCategory: 'best-vr-porn' })),
    ...PREMIUM_ASIAN_PORN_LISTINGS.map((listing) => ({ listing, primaryCategory: 'best-premium-asian-porn-sites' })),
    ...UNCENSORED_JAV_PORN_LISTINGS.map((listing) => ({ listing, primaryCategory: 'best-uncensored-jav-porn-websites' })),
    ...REMAINING_CATEGORY_LISTING_GROUPS.flatMap((group) =>
      group.listings.map((listing) => ({ listing, primaryCategory: group.categorySlug })),
    ),
  ];
}

export function mergeExploreSites(
  primary: ReturnType<typeof exploreSitesFromListings>,
  extra: ReturnType<typeof exploreSitesFromListings>,
) {
  const seenHost = new Set<string>();
  const seenName = new Set<string>();
  const out: ReturnType<typeof exploreSitesFromListings> = [];
  for (const site of [...primary, ...extra]) {
    const host = listingHost(site.externalUrl);
    const nameKey = site.name.replace(/\s+/g, '').toLowerCase();
    if (host && seenHost.has(host)) continue;
    if (seenName.has(nameKey)) continue;
    if (host) seenHost.add(host);
    seenName.add(nameKey);
    out.push(site);
  }
  return out;
}

export function extraSitesForCategory(categorySlug: string) {
  return allPrimaryListings()
    .filter(
      ({ listing, primaryCategory }) =>
        primaryCategory !== categorySlug && extraSlugs(listing).includes(categorySlug),
    )
    .flatMap(({ listing, primaryCategory }) => exploreSitesFromListings([listing], primaryCategory));
}

export function exploreSitesForCategory(categorySlug: string) {
  const group = REMAINING_CATEGORY_LISTING_GROUPS.find((entry) => entry.categorySlug === categorySlug);
  const primary = group ? exploreSitesFromListings(group.listings, categorySlug) : [];
  return mergeExploreSites(extraSitesForCategory(categorySlug), primary);
}

export function getExploreListingCategorySlugs(listing: ExploreSiteListing): string[] {
  const slugs = [listing.categorySlug, ...extraSlugs(listing)];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const slug of slugs) {
    if (seen.has(slug)) continue;
    seen.add(slug);
    out.push(slug);
    if (out.length >= MAX_LISTING_CATEGORIES) break;
  }
  return out;
}

export function getExploreListingCategories(listing: ExploreSiteListing): { slug: string; title: string }[] {
  return getExploreListingCategorySlugs(listing).map((slug) => ({
    slug,
    title:
      slug === listing.categorySlug
        ? listing.categoryTitle
        : WITH_CATEGORY.find((entry) => entry.categorySlug === slug)?.categoryTitle || slug,
  }));
}
