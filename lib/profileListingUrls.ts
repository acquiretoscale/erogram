import { ofCreatorProfileUrl } from '@/lib/ofsearch/creatorUrls';

export type ProfileListingHrefInput = {
  type: 'group' | 'bot' | 'ainsfw' | 'onlyfans';
  slug: string;
  status: string;
};

export function getProfileListingHref(listing: ProfileListingHrefInput): string {
  if (listing.type === 'onlyfans') {
    return `${ofCreatorProfileUrl(listing.slug)}?edit=1`;
  }
  if (listing.status === 'approved' && listing.slug) {
    return `/${listing.slug}`;
  }
  return '/profile?tab=listings';
}
