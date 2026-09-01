/** Shared explore individual site listing registry. */

import { PREMIUM_PORN_LISTINGS } from '@/lib/explore/premiumPornListings';
import { LISTINGS as LIVE_SEX_CAMS_LISTINGS } from '@/lib/explore/liveSexCamsListings';
import { LISTINGS as VR_PORN_LISTINGS } from '@/lib/explore/vrPornListings';
import { LISTINGS as PREMIUM_ASIAN_PORN_LISTINGS } from '@/lib/explore/premiumAsianPornListings';
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

export function exploreSiteListingPath(slug: string): string {
  return `/porn-websites/${slug}`;
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

export function getExploreSiteAlternatives(slug: string, limit = 8): ExploreSiteListingBase[] {
  const listing = getExploreSiteListing(slug);
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

export function exploreSitesFromListings(listings: ExploreSiteListingBase[]) {
  return listings.map((listing) => ({
    name: listing.name,
    url: exploreSiteListingPath(listing.slug),
    externalUrl: listing.externalUrl,
    description: listing.description,
    image: listing.image,
  }));
}

export function exploreSitesForCategory(categorySlug: string) {
  const group = REMAINING_CATEGORY_LISTING_GROUPS.find((entry) => entry.categorySlug === categorySlug);
  return group ? exploreSitesFromListings(group.listings) : [];
}
