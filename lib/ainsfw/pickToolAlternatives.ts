import type { AINsfwTool } from '@/app/ainsfw/types';
import {
  AINSFW_PAID_CLIENT_SLUGS,
  getVerifiedPaidSlugs,
} from '@/app/ainsfw/fullReviews';
import type { ToolStatsData } from '@/lib/actions/ainsfw';

export type SuggestedAlternative = {
  tool: AINsfwTool;
  isClient: boolean;
};

export function pickSuggestedAlternatives(
  currentSlug: string,
  category: string,
  categoryTools: AINsfwTool[],
  paidInCategory: AINsfwTool[],
  stats: Record<string, ToolStatsData>,
  limit = 8,
): SuggestedAlternative[] {
  const clientSlugs = new Set<string>(AINSFW_PAID_CLIENT_SLUGS);
  for (const slug of getVerifiedPaidSlugs(paidInCategory.map((t) => t.slug))) {
    clientSlugs.add(slug);
  }
  for (const t of paidInCategory) {
    if (t.category === category) clientSlugs.add(t.slug);
  }
  clientSlugs.delete(currentSlug);

  const bySlug = new Map<string, AINsfwTool>();
  for (const t of categoryTools) {
    if (t.slug !== currentSlug) bySlug.set(t.slug, t);
  }
  for (const t of paidInCategory) {
    if (t.slug !== currentSlug && t.category === category) bySlug.set(t.slug, t);
  }

  const sortByUpvotes = (list: AINsfwTool[]) =>
    [...list].sort(
      (a, b) => (stats[b.slug]?.upvotes || 0) - (stats[a.slug]?.upvotes || 0),
    );

  const pool = sortByUpvotes([...bySlug.values()]);
  const clients = pool.filter((t) => clientSlugs.has(t.slug));
  const others = pool.filter((t) => !clientSlugs.has(t.slug));

  const out: SuggestedAlternative[] = [];
  const seen = new Set<string>();

  for (const t of clients) {
    if (out.length >= limit) break;
    if (seen.has(t.slug)) continue;
    seen.add(t.slug);
    out.push({ tool: t, isClient: true });
  }
  for (const t of others) {
    if (out.length >= limit) break;
    if (seen.has(t.slug)) continue;
    seen.add(t.slug);
    out.push({ tool: t, isClient: false });
  }

  return out;
}
