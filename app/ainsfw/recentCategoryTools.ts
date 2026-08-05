import type { AINsfwTool } from './types';
import { AINSFW_PAID_CLIENTS } from './fullReviews';
import { AINSFW_RECENT_EXCLUDED_SLUGS } from './newlyAddedSlugs';

export const RECENT_POOL_LIMIT = 6;
export const RECENT_DISPLAY_LIMIT = 4;

/** When a category has fewer paid recent listings, pull from these related categories next. */
const RELATED_CATEGORIES: Record<string, string[]> = {
  'AI Porn Generator': ['Undress AI', 'AI NSFW Image Generator'],
  'Undress AI': ['AI Porn Generator', 'AI NSFW Image Generator'],
  'AI NSFW Image Generator': ['AI Porn Generator', 'Undress AI'],
  'AI Companion': ['AI Sexting / Chat', 'AI NSFW Roleplay'],
  'AI Sexting / Chat': ['AI Companion', 'AI NSFW Roleplay'],
  'AI NSFW Roleplay': ['AI Sexting / Chat', 'AI Companion'],
};

function isExcluded(slug: string): boolean {
  return AINSFW_RECENT_EXCLUDED_SLUGS.has(slug);
}

/** Recent additions = all paid clients (registry + portal submissions), newest first. */
export function pickRecentTools(
  toolsBySlug: Map<string, AINsfwTool>,
  paidSubmissions: Array<AINsfwTool & { createdAt?: string }>,
  options?: { category?: string; limit?: number },
): AINsfwTool[] {
  const limit = options?.limit ?? RECENT_POOL_LIMIT;
  const submissionSlugs = new Set(paidSubmissions.map((t) => t.slug));

  const fromDb = [...paidSubmissions]
    .filter((tool) => tool.createdAt && !isExcluded(tool.slug))
    .filter((tool) => !options?.category || tool.category === options.category);

  const fromPaidClients = AINSFW_PAID_CLIENTS
    .filter(({ slug }) => !isExcluded(slug) && !submissionSlugs.has(slug) && toolsBySlug.has(slug))
    .map(({ slug, goLive }) => ({ ...toolsBySlug.get(slug)!, createdAt: goLive }))
    .filter((tool) => !options?.category || tool.category === options.category);

  return [...fromDb, ...fromPaidClients]
    .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
    .slice(0, limit);
}

export function pickRecentCategoryTools(
  category: string,
  toolsBySlug: Map<string, AINsfwTool>,
  paidSubmissions: Array<AINsfwTool & { createdAt?: string }>,
  limit = RECENT_DISPLAY_LIMIT,
): AINsfwTool[] {
  const picked: AINsfwTool[] = [];
  const seen = new Set<string>();

  const addFromCategory = (cat: string | undefined) => {
    const batch = pickRecentTools(toolsBySlug, paidSubmissions, { category: cat, limit: RECENT_POOL_LIMIT });
    for (const tool of batch) {
      if (picked.length >= limit || seen.has(tool.slug)) continue;
      seen.add(tool.slug);
      picked.push(tool);
      if (picked.length >= limit) break;
    }
  };

  addFromCategory(category);

  for (const related of RELATED_CATEGORIES[category] || []) {
    if (picked.length >= limit) break;
    addFromCategory(related);
  }

  if (picked.length < limit) {
    addFromCategory(undefined);
  }

  return picked;
}
