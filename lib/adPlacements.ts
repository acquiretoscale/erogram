/**
 * AD PLACEMENT CATALOG — single source of truth for named ad surfaces.
 *
 * This is the foundation of the unified ad engine (brain node: ad-engine-unify).
 * It is ADDITIVE: the legacy tierSlot/feedTier system keeps working untouched.
 * A campaign with `placements: []` falls back to the old tierSlot logic.
 * A campaign with `placements: [...]` uses these named surfaces.
 *
 * RULES (from the brain — do not break):
 *  - Ads render client-side. These placements never change page rendering/SEO.
 *  - All creatives from R2. Tracking via server actions. No external ad scripts.
 *  - One ad can target MANY placements (multi-placement selector, Phase 4).
 */

import { BEST_OF_PAGES, BEST_OF_PAGE_MAP } from '@/app/best-onlyfans-accounts/bestOfPages';
import { filterCategories } from '@/app/groups/constants';

export type PlacementSurface =
  // Top Groups section on /groups — 4 spots, the most valuable inventory
  | 'top-groups-1'
  | 'top-groups-2'
  | 'top-groups-3'
  | 'top-groups-4'
  // In-feed on /groups + /bots (existing feed slots, named)
  | 'feed-1'
  | 'feed-2'
  | 'feed-3'
  | 'feed-4'
  | 'feed-5'
  // Top Bots section on /bots — 4 spots
  | 'top-bots-1'
  | 'top-bots-2'
  | 'top-bots-3'
  | 'top-bots-4'
  // Join CTA on individual group/bot pages
  | 'join-cta'
  // Sidebar promo on individual group/bot pages (rotates: up to 4 OF creators / ads / EROGRAM PREMIUM)
  | 'group-sidebar'
  // AI NSFW featured row
  | 'ainsfw-featured'
  | 'ainsfw-feed'
  // Trending (/trending) versatile blocks — rotate wide banner (image/video) OR a 4-up card grid
  | 'home-block-1'
  | 'home-block-2'
  // Global banners / CTA
  | 'top-banner'
  | 'navbar-cta'
  // OnlyFans Search homepage featured strip (/ofsearch)
  | 'of-search-featured';

/** A placement definition the admin UI reads to build the multi-placement selector. */
export interface PlacementDef {
  id: PlacementSurface | string;
  label: string;
  group: 'Top Groups' | 'In-Feed' | 'Top Bots' | 'Join Pages' | 'AI NSFW' | 'Banners' | 'Best Groups' | 'OnlyFans' | 'Home' | 'Trending on Erogram';
  /** Maps a named placement to the legacy tierSlot so existing render code keeps working. */
  legacyTierSlot?: number;
  /** Reserved = defined for the roadmap but NOT wired to any surface yet. */
  reserved?: boolean;
  /** Whether this placement supports keyword/category targeting (Phase 4). */
  keywordTargetable?: boolean;
}

/**
 * ACTIVE placements — wired to real surfaces today.
 * legacyTierSlot maps the new name → the current GroupsClient/feed logic:
 *   top-groups-1 → tierSlot 6 (Top Groups Spot 1)
 *   top-groups-2 → tierSlot 1 (Top Groups Spot 2)
 *   top-groups-4 → tierSlot 5 (Top Groups Spot 4 / Featured Bot)
 *   feed-2/3/4   → tierSlot 2/3/4 (in-feed positions)
 */
export const PLACEMENTS: PlacementDef[] = [
  { id: 'top-groups-1', label: 'Top Groups — Spot 1', group: 'Top Groups', legacyTierSlot: 6 },
  { id: 'top-groups-2', label: 'Top Groups — Spot 2', group: 'Top Groups', legacyTierSlot: 1 },
  { id: 'top-groups-3', label: 'Top Groups — Spot 3', group: 'Top Groups', legacyTierSlot: 11 },
  { id: 'top-groups-4', label: 'Top Groups — Spot 4 (Featured Bot)', group: 'Top Groups', legacyTierSlot: 5 },

  { id: 'feed-2', label: 'In-Feed — after 2 groups', group: 'In-Feed', legacyTierSlot: 2 },
  { id: 'feed-3', label: 'In-Feed — after 7 groups', group: 'In-Feed', legacyTierSlot: 3 },
  { id: 'feed-4', label: 'In-Feed — after 12 groups + loops', group: 'In-Feed', legacyTierSlot: 4 },
  { id: 'feed-5', label: 'In-Feed — Featured Bot (after 4 groups)', group: 'In-Feed', legacyTierSlot: 5 },

  { id: 'top-bots-1', label: 'Top Bots — Spot 1', group: 'Top Bots', legacyTierSlot: 7 },
  { id: 'top-bots-2', label: 'Top Bots — Spot 2', group: 'Top Bots', legacyTierSlot: 8 },
  { id: 'top-bots-3', label: 'Top Bots — Spot 3', group: 'Top Bots', legacyTierSlot: 9 },
  { id: 'top-bots-4', label: 'Top Bots — Spot 4', group: 'Top Bots', legacyTierSlot: 10 },

  { id: 'join-cta', label: 'Join CTA (group/bot pages)', group: 'Join Pages' },
  { id: 'group-sidebar', label: 'Group/Bot Page — Sidebar Promo (up to 4 OF creators / ads)', group: 'Join Pages' },
  { id: 'ainsfw-featured', label: 'AI NSFW Featured', group: 'AI NSFW' },
  { id: 'ainsfw-feed', label: 'In-Feed — AI NSFW grid', group: 'In-Feed' },
  { id: 'home-block-1', label: 'TRENDING — Adspace 1 (mid-page)', group: 'Home' },
  { id: 'home-block-2', label: 'TRENDING — Adspace 2 (below newsletter)', group: 'Home' },
  { id: 'top-banner', label: 'Top Banner', group: 'Banners' },
  { id: 'navbar-cta', label: 'Navbar CTA', group: 'Banners' },

  // Top-10 keyword-targeted surfaces. The placement id is fixed; the category is chosen
  // via the campaign's targetKeywords (must pick at least one; see AD_KEYWORDS).
  { id: 'best-of', label: 'Best OnlyFans Accounts — Top 10 (keyword-targeted)', group: 'Best Groups', keywordTargetable: true },
  { id: 'best-groups', label: 'Best Telegram Groups — Top 10 (keyword-targeted)', group: 'Best Groups', keywordTargetable: true },

  // OnlyFans Search category pages (/{slug}onlyfans) + keyword search results.
  // Featured strip (paid OF creators) + agnostic 4-ad block every 80 results. Keyword = category slug.
  { id: 'of-search-featured', label: 'OFsearch — Featured (homepage /onlyfans)', group: 'OnlyFans' },
  { id: 'of-cat', label: 'OFsearch — category pages only (keyword-targeted)', group: 'OnlyFans', keywordTargetable: true },

  // New unified mixed promotional surface: Trending on Erogram.
  // Used on /groups, /bots, /ainsfw (below native Top).
  // Supports heterogeneous content via ad campaigns (OF creators, boosted via assignment, advertisers, etc.).
  // Rendered as a 4-up block styled identically to Top Groups.
  { id: 'trending-1', label: 'Trending on Erogram — Spot 1', group: 'Trending on Erogram' },
  { id: 'trending-2', label: 'Trending on Erogram — Spot 2', group: 'Trending on Erogram' },
  { id: 'trending-3', label: 'Trending on Erogram — Spot 3', group: 'Trending on Erogram' },
  { id: 'trending-4', label: 'Trending on Erogram — Spot 4', group: 'Trending on Erogram' },
];

/**
 * BOOST visibility multiplier — a boosted (highest-paying) ad gets this many entries in each
 * slot's rotation draw, so it appears ~10× more often than a normal ad sharing the same slot.
 * Non-boosted ads still rotate in (never starved). Tune this one number to dial priority strength.
 */
export const BOOST_WEIGHT = 10;

/**
 * DEFAULT max-exposure placement set for a featured OnlyFans creator.
 * When a featured OF creator is mirrored into an Ad Network campaign (lib/actions/ofSync),
 * we assign these so "add to OF featured" == "live across the whole network" automatically —
 * no second manual step in /admin/ad-network. The owner can still trim placements later.
 * Covers: Top Groups, In-Feed, Top Bots, AI NSFW, Spotlight, Top-10 + OF category surfaces.
 */
export const DEFAULT_OF_CREATOR_PLACEMENTS: string[] = [
  // OF creators are unrelated to groups → only Top Groups cards 2 & 4 (never card 1 or 3).
  'top-groups-2', 'top-groups-4',
  'feed-2', 'feed-3', 'feed-4', 'feed-5',
  // OF creators are unrelated to bots → only Top Bots cards 2 & 4 (never card 1 or 3).
  'top-bots-2', 'top-bots-4',
  'ainsfw-featured', 'ainsfw-feed',
  'home-block-1', 'home-block-2',
  'best-of', 'of-cat',
];

/** Bird-eye PROMOTE → OFM: Top-10 best-of + OF category pages only. Owner picks keywords in OFM. */
export const PROMOTE_OF_CREATOR_PLACEMENTS: string[] = ['best-of', 'of-cat'];

/**
 * Keyword-targetable: e.g. promote a MILF OF creator on the MILF best-groups page.
 * These are intentionally inert until their surfaces are built (later phase).
 */
export const RESERVED_PLACEMENTS: PlacementDef[] = [
  // best-of / best-groups / of-cat surfaces are now ACTIVE (see PLACEMENTS). No reserved roadmap items.
];

const LEGACY_TIER_TO_PLACEMENT: Record<number, PlacementSurface> = {
  6: 'top-groups-1',
  1: 'top-groups-2',
  11: 'top-groups-3',
  5: 'top-groups-4',
  2: 'feed-2',
  3: 'feed-3',
  4: 'feed-4',
  7: 'top-bots-1',
  8: 'top-bots-2',
  9: 'top-bots-3',
  10: 'top-bots-4',
};

/** In-feed positions on /groups (and /bots where wired). Top Groups uses top-groups-* only. */
export const GROUPS_IN_FEED_PLACEMENTS = ['feed-2', 'feed-3', 'feed-4', 'feed-5'] as const;

export function isGroupsInFeedPlacement(placement: string | undefined | null): boolean {
  return !!placement && (GROUPS_IN_FEED_PLACEMENTS as readonly string[]).includes(placement);
}

/** Map a legacy tierSlot to its named placement (for stats labelling + back-compat). */
export function tierSlotToPlacement(tierSlot: number | null | undefined): PlacementSurface | null {
  if (tierSlot == null) return null;
  return LEGACY_TIER_TO_PLACEMENT[tierSlot] ?? null;
}

/** Map a named placement back to its legacy tierSlot (so existing render code can resolve it). */
export function placementToTierSlot(placement: string): number | null {
  const def = PLACEMENTS.find((p) => p.id === placement);
  return def?.legacyTierSlot ?? null;
}

/** Which named placements belong on each main feed page (replaces legacy feedPlacement groups/bots/ainsfw). */
export type FeedPageSurface = 'groups' | 'bots' | 'ainsfw';

const GROUPS_PAGE_PLACEMENTS = new Set<string>([
  'top-groups-1', 'top-groups-2', 'top-groups-3', 'top-groups-4',
  'feed-2', 'feed-3', 'feed-4', 'feed-5',
  'best-groups',
]);

const BOTS_PAGE_PLACEMENTS = new Set<string>([
  'top-bots-1', 'top-bots-2', 'top-bots-3', 'top-bots-4',
  'feed-2', 'feed-3', 'feed-4', 'feed-5',
]);

const AINSFW_PAGE_PLACEMENTS = new Set<string>([
  'ainsfw-featured', 'ainsfw-feed',
]);

export function feedPageSurfacePlacements(page: FeedPageSurface): ReadonlySet<string> {
  if (page === 'groups') return GROUPS_PAGE_PLACEMENTS;
  if (page === 'bots') return BOTS_PAGE_PLACEMENTS;
  return AINSFW_PAGE_PLACEMENTS;
}

export function placementMatchesFeedPage(placementId: string, page: FeedPageSurface): boolean {
  return feedPageSurfacePlacements(page).has(placementId);
}

/** All selectable placements for the admin UI (active first, reserved flagged). */
export function getAllPlacements(): PlacementDef[] {
  return [...PLACEMENTS, ...RESERVED_PLACEMENTS];
}

/**
 * Canonical keyword slug — spaces/underscores → hyphens, lowercased.
 * OF pages use hyphenated slugs (big-ass) while group pages use spaces (big ass);
 * canonicalizing BOTH the page slug and the stored keyword makes one keyword match
 * every related page (OF Top-10, Groups Top-10, and future surfaces). Unified, not per-page.
 */
export function canonicalKeyword(s: string): string {
  return (s || '').toLowerCase().trim().replace(/[\s_]+/g, '-');
}

/**
 * All keyword aliases that match a category / Top-10 page slug.
 * e.g. french page → french, france, française (from bestOfPages patterns).
 */
export function getAdKeywordAliasesForPage(pageSlug: string): string[] {
  const slug = canonicalKeyword(pageSlug);
  const aliases = new Set<string>([slug]);
  const page = BEST_OF_PAGE_MAP.get(slug);
  if (page?.categorySlug) aliases.add(canonicalKeyword(page.categorySlug));
  if (page?.patterns?.length) {
    for (const p of page.patterns) aliases.add(canonicalKeyword(p));
  }
  return [...aliases];
}

/**
 * ONE unified keyword catalog for Ad Network targeting.
 * Primary source: every Top-10 / hottest OF page (countries, states, niches).
 * Plus telegram group categories not already covered. Empty = off category pages.
 */
export const AD_KEYWORDS: { label: string; slug: string }[] = (() => {
  const seen = new Set<string>();
  const out: { label: string; slug: string }[] = [];

  for (const page of BEST_OF_PAGES) {
    if (seen.has(page.slug)) continue;
    seen.add(page.slug);
    out.push({ label: page.label, slug: page.slug });
  }

  for (const name of filterCategories) {
    const slug = canonicalKeyword(name);
    if (seen.has(slug)) continue;
    seen.add(slug);
    out.push({ label: name, slug });
  }

  return out.sort((a, b) => a.label.localeCompare(b.label));
})();
