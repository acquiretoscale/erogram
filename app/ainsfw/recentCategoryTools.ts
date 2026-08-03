import type { AINsfwTool } from './types';
import { AINSFW_RECENT_EXCLUDED_SLUGS } from './newlyAddedSlugs';

export const RECENT_POOL_LIMIT = 8;
export const RECENT_DISPLAY_LIMIT = 4;

function isExcluded(slug: string): boolean {
  return AINSFW_RECENT_EXCLUDED_SLUGS.has(slug);
}

/** Recent additions = paid listings only, newest first. */
export function pickRecentTools(
  _toolsBySlug: Map<string, AINsfwTool>,
  paidSubmissions: Array<AINsfwTool & { createdAt?: string }>,
  options?: { category?: string; limit?: number },
): AINsfwTool[] {
  const limit = options?.limit ?? RECENT_POOL_LIMIT;

  return [...paidSubmissions]
    .filter((tool) => tool.createdAt && !isExcluded(tool.slug))
    .filter((tool) => !options?.category || tool.category === options.category)
    .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
    .slice(0, limit);
}

export function pickRecentCategoryTools(
  category: string,
  toolsBySlug: Map<string, AINsfwTool>,
  paidSubmissions: Array<AINsfwTool & { createdAt?: string }>,
  limit = RECENT_DISPLAY_LIMIT,
): AINsfwTool[] {
  return pickRecentTools(toolsBySlug, paidSubmissions, { category, limit });
}
