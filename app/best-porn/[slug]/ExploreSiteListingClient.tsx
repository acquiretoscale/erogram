'use client';

import { useEffect, useState } from 'react';
import ToolDetailClient, { RED_LISTING_THEME } from '@/app/ainsfw/[slug]/ToolDetailClient';
import { getAllToolStats, getToolStats, type ToolStatsData } from '@/lib/actions/ainsfw';
import { PLACEHOLDER_IMAGE_URL } from '@/lib/placeholder';
import type { AINsfwTool } from '@/app/ainsfw/types';
import type { ExploreSiteListing, ExploreSiteListingBase } from '@/lib/explore/exploreSiteListings';
import { exploreSiteListingPath, getExploreListingCategories } from '@/lib/explore/exploreSiteListings';

const CATEGORY_ROOT: Record<string, string> = {
  'best-live-asian-sex-cams': 'best-asian-sex-cams',
  'best-live-sex-cams': 'best-live-sex-cam-websites',
};

function categoryHref(categorySlug: string): string {
  return `/${CATEGORY_ROOT[categorySlug] || categorySlug}`;
}

/**
 * Porn Website listings render the SAME template as AI NSFW tools
 * (ToolDetailClient) with the red/white theme. One template, two colors:
 * edits to ToolDetailClient reflect here automatically.
 */
export default function ExploreSiteListingClient({
  listing,
  alternatives,
  visitRel = 'nofollow noopener noreferrer',
}: {
  listing: ExploreSiteListing;
  alternatives: ExploreSiteListingBase[];
  visitRel?: string;
}) {
  const [stats, setStats] = useState<ToolStatsData | undefined>(undefined);
  const [altStats, setAltStats] = useState<Record<string, ToolStatsData>>({});

  useEffect(() => {
    getToolStats(listing.slug).then(setStats).catch(() => {});
  }, [listing.slug]);

  useEffect(() => {
    const slugs = alternatives.map((a) => a.slug);
    if (!slugs.length) return;
    getAllToolStats(slugs).then(setAltStats).catch(() => {});
  }, [listing.slug]);

  // Map explore category titles -> their page href, so category pills/breadcrumb
  // route to the right adult-site category page instead of /ainsfw/*.
  const categories = getExploreListingCategories(listing);
  const titleToHref = new Map(categories.map((c) => [c.title, categoryHref(c.slug)]));

  const tool: AINsfwTool = {
    slug: listing.slug,
    name: listing.name,
    // Loose cast: adult category titles are not in the AI union, but the
    // template only uses `category` as a display string + for pills.
    category: listing.categoryTitle as AINsfwTool['category'],
    vendor: listing.name,
    description: listing.description,
    image: listing.image || PLACEHOLDER_IMAGE_URL,
    tags: [],
    subscription: '',
    payment: [],
    tryNowUrl: listing.externalUrl,
    sourceUrl: listing.externalUrl,
    categories: categories.map((c) => c.title),
    ctaText: `VISIT ${listing.name}`,
  };

  const theme = {
    ...RED_LISTING_THEME,
    categoryHref: (title: string) =>
      titleToHref.get(title) || categoryHref(listing.categorySlug),
    listingHref: (slug: string) => exploreSiteListingPath(slug, listing.categorySlug),
    logoUrl: listing.icon || listing.image || PLACEHOLDER_IMAGE_URL,
  };

  const altTools: AINsfwTool[] = [...alternatives]
    .sort((a, b) => (altStats[b.slug]?.upvotes ?? 0) - (altStats[a.slug]?.upvotes ?? 0))
    .slice(0, 4)
    .map((a) => ({
      slug: a.slug,
      name: a.name,
      category: listing.categoryTitle as AINsfwTool['category'],
      vendor: a.name,
      description: a.description,
      image: a.image || PLACEHOLDER_IMAGE_URL,
      tags: [],
      subscription: '',
      payment: [],
      tryNowUrl: a.externalUrl,
      sourceUrl: a.externalUrl,
      ctaText: `VISIT ${a.name}`,
    }));

  return (
    <ToolDetailClient
      tool={tool}
      theme={theme}
      initialStats={stats}
      featuredHubTools={altTools}
      featuredHubSlugs={altTools.map((t) => t.slug)}
      featuredHubStats={altStats}
    />
  );
}
