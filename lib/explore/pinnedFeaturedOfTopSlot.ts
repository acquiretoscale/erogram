import type { FeedCampaign } from '@/app/groups/types';
import { HOME_FEATURED_OF_USERNAME } from '@/lib/explore/homeFeaturedOfCreator';

/** Permanent Victoria Kovak — 3rd tile (top-groups-3) on /groups Top Groups. */
export const GROUPS_PINNED_VICTORIA_TOP_SLOT_INDEX = 2;

/** Permanent home-featured OF client — 2nd tile in Top Bots. */
export const BOTS_PINNED_FEATURED_OF_TOP_SLOT_INDEX = 1;

/** @deprecated Prefer BOTS_PINNED_FEATURED_OF_TOP_SLOT_INDEX or GROUPS_PINNED_VICTORIA_TOP_SLOT_INDEX */
export const PINNED_FEATURED_OF_TOP_SLOT_INDEX = BOTS_PINNED_FEATURED_OF_TOP_SLOT_INDEX;

const PINNED_BY_PAGE = {
  groups: { placement: 'top-groups-3', tierSlot: 11 },
  bots: { placement: 'top-bots-2', tierSlot: 8 },
} as const;

export function findFeaturedOfCampaignInFeed(feedCampaigns: FeedCampaign[]): FeedCampaign | null {
  const want = HOME_FEATURED_OF_USERNAME.toLowerCase();
  const hit = feedCampaigns.find(
    (c) => c.adType === 'onlyfans-creator' && (c.ofUsername || '').toLowerCase() === want,
  );
  return hit ?? null;
}

export function pinnedFeaturedOfCampaignForPage(
  base: FeedCampaign,
  page: keyof typeof PINNED_BY_PAGE,
): FeedCampaign {
  const { placement, tierSlot } = PINNED_BY_PAGE[page];
  return { ...base, placement, tierSlot, position: tierSlot };
}

/** Reserved top slots — not eligible for random rotation / boost swap-backfill. */
export function isPinnedFeaturedOfTopSlot(spot: number, page: 'groups' | 'bots' = 'bots'): boolean {
  return page === 'groups'
    ? spot === GROUPS_PINNED_VICTORIA_TOP_SLOT_INDEX
    : spot === BOTS_PINNED_FEATURED_OF_TOP_SLOT_INDEX;
}
