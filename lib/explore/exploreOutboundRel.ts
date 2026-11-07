import type { ExploreSite } from '@/lib/explore/topPornSitesData';
import { exploreSiteKey } from '@/lib/explore/siteKey';

/** Explore listing slugs with link-exchange / badge — outbound “Visit site” links stay dofollow. */
export const EXPLORE_DOFOLLOW_PARTNER_SLUGS = new Set<string>(['ikisoda']);

export function isExploreDofollowPartner(slug: string): boolean {
  const key = slug.trim().toLowerCase();
  if (EXPLORE_DOFOLLOW_PARTNER_SLUGS.has(key)) return true;
  return false;
}

/** Call from server code when loading partners (optional dofollow sync from DB). */
export function registerExploreDofollowPartnerSlug(slug: string) {
  const key = slug.trim().toLowerCase();
  if (key) EXPLORE_DOFOLLOW_PARTNER_SLUGS.add(key);
}

export function exploreListingOutboundRel(listingSlug: string): string {
  return isExploreDofollowPartner(listingSlug) ? 'noopener noreferrer' : 'nofollow noopener noreferrer';
}

export function exploreSiteOutboundRel(site: ExploreSite): string {
  return exploreListingOutboundRel(exploreSiteKey(site));
}
