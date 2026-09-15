/** Shared explore individual site listing registry. */

import { PREMIUM_PORN_LISTINGS } from '@/lib/explore/premiumPornListings';
import { LISTINGS as LIVE_SEX_CAMS_LISTINGS } from '@/lib/explore/liveSexCamsListings';
import { LISTINGS as VR_PORN_LISTINGS } from '@/lib/explore/vrPornListings';
import { LISTINGS as PREMIUM_ASIAN_PORN_LISTINGS } from '@/lib/explore/premiumAsianPornListings';
import { LISTINGS as UNCENSORED_JAV_PORN_LISTINGS } from '@/lib/explore/uncensoredJavPornListings';
import { REMAINING_CATEGORY_LISTING_GROUPS } from '@/lib/explore/remainingCategoryListings';

export type ExploreSiteListingBase = {
  slug: string;
  name: string;
  description: string;
  image: string;
  externalUrl: string;
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
    .map(({ slug: altSlug, name, description, image, externalUrl }) => ({
      slug: altSlug,
      name,
      description,
      image,
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
  }));
}

export function exploreSitesForCategory(categorySlug: string) {
  const group = REMAINING_CATEGORY_LISTING_GROUPS.find((entry) => entry.categorySlug === categorySlug);
  return group ? exploreSitesFromListings(group.listings, categorySlug) : [];
}
