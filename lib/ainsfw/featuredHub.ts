/** Owner-curated FEATURED row on /ainsfw (slot 4 rotates hourly). */
export const AINSFW_FEATURED_HUB_FIXED = [
  'porncreate-undress-ai',
  'candy-ai-ai-girlfriend',
  'joi-ai-nude-generator',
] as const;

export const AINSFW_FEATURED_HUB_ROTATING = [
  'clothoff-undress-ai',
  'genesis-porn-ai-image',
  'aislutbot-ai-nude-generator',
] as const;

export function getFeaturedHubRotatingSlug(now = Date.now()): string {
  const hour = Math.floor(now / (60 * 60 * 1000));
  return AINSFW_FEATURED_HUB_ROTATING[hour % AINSFW_FEATURED_HUB_ROTATING.length];
}

export function getFeaturedHubSlugs(now = Date.now()): string[] {
  return [...AINSFW_FEATURED_HUB_FIXED, getFeaturedHubRotatingSlug(now)];
}

export function normalizeFeaturedHubSlugs(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== 'string') continue;
    const slug = item.trim();
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    out.push(slug);
    if (out.length >= 4) break;
  }
  return out;
}

export async function resolveFeaturedHubSlugs(now = Date.now()): Promise<string[]> {
  try {
    const connectDB = (await import('@/lib/db/mongodb')).default;
    const { SiteConfig } = await import('@/lib/models');
    await connectDB();
    const doc = await SiteConfig.findOne().select('generalSettings').lean() as {
      generalSettings?: { ainsfwFeaturedHubSlugs?: unknown };
    } | null;
    const saved = normalizeFeaturedHubSlugs(doc?.generalSettings?.ainsfwFeaturedHubSlugs);
    if (saved.length >= 2) return saved;
  } catch {}
  return getFeaturedHubSlugs(now);
}
