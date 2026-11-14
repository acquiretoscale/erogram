import type { AINsfwTool } from '@/app/ainsfw/types';
import { AINSFW_CATEGORIES, type AINsfwCategory } from '@/app/ainsfw/types';

export type AINsfwToolWithCategories = AINsfwTool & {
  categories?: string[];
  createdAt?: string;
  submissionTier?: string;
};

/** Paid featured/boost plans: up to 6 hub categories shown and honored. */
export const LISTING_PLACEMENT_LIMIT = 6;

/** Standard paid listing: 2 categories when applicable. */
export const BASIC_LISTING_PLACEMENT_LIMIT = 2;

/**
 * Authoritative placements: paid `categories[]` from checkout/admin, else primary category.
 * These MUST match listing chips and category page grids (what we sold).
 */
export function placementCategoriesForTool(tool: {
  category: string;
  categories?: string[];
}): string[] {
  const explicit = (tool.categories ?? []).map((c) => c?.trim()).filter(Boolean) as string[];
  if (explicit.length > 0) return [...new Set(explicit)];
  const primary = tool.category?.trim();
  return primary ? [primary] : [];
}

/** Category chips on the listing — same list as hub placements (max 6). */
export function listingCategoryPlacementsForDisplay(tool: {
  category: string;
  categories?: string[];
}): string[] {
  return placementCategoriesForTool(tool).slice(0, LISTING_PLACEMENT_LIMIT);
}

export function toolMatchesCategory(
  tool: { category: string; categories?: string[] },
  category: string,
): boolean {
  return placementCategoriesForTool(tool).includes(category);
}

/** Category hub grid: full catalog + paid listings in every sold placement. */
export function mergeCategoryPageTools(
  category: string,
  _catalogPrimaryInCategory: AINsfwTool[],
  paidTools: AINsfwToolWithCategories[],
  allCatalogTools: AINsfwTool[],
): AINsfwTool[] {
  const bySlug = new Map<string, AINsfwTool>();

  for (const t of allCatalogTools) {
    if (toolMatchesCategory(t, category)) bySlug.set(t.slug, t);
  }
  for (const t of paidTools) {
    if (toolMatchesCategory(t, category)) bySlug.set(t.slug, t);
  }

  return [...bySlug.values()];
}

/** Hub categories that have at least one listing (for dropdown — no empty scam pages). */
export function getPopulatedHubCategories(
  allCatalogTools: AINsfwTool[],
  paidTools: AINsfwToolWithCategories[],
): AINsfwCategory[] {
  const out: AINsfwCategory[] = ['All'];
  for (const cat of AINSFW_CATEGORIES) {
    if (cat === 'All') continue;
    const count = mergeCategoryPageTools(cat, [], paidTools, allCatalogTools).length;
    if (count > 0) out.push(cat);
  }
  return out;
}

/** Count listings in a hub category (admin / QA). */
export function countListingsInCategory(
  category: string,
  allCatalogTools: AINsfwTool[],
  paidTools: AINsfwToolWithCategories[],
): number {
  return mergeCategoryPageTools(category, [], paidTools, allCatalogTools).length;
}
