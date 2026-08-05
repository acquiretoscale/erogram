/** Owner-curated FEATURED row on /ainsfw (slot 4 rotates hourly). */
export const AINSFW_FEATURED_HUB_FIXED = [
  'porncreate-undress-ai',
  'candy-ai-ai-girlfriend',
  'joi-ai-nude-generator',
] as const;

export const AINSFW_FEATURED_HUB_ROTATING = [
  'clothoff-undress-ai',
  'genesis-porn-ai-image',
  'nudiva-undress-ai',
] as const;

export function getFeaturedHubRotatingSlug(now = Date.now()): string {
  const hour = Math.floor(now / (60 * 60 * 1000));
  return AINSFW_FEATURED_HUB_ROTATING[hour % AINSFW_FEATURED_HUB_ROTATING.length];
}

export function getFeaturedHubSlugs(now = Date.now()): string[] {
  return [...AINSFW_FEATURED_HUB_FIXED, getFeaturedHubRotatingSlug(now)];
}
