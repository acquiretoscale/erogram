import type { Metadata } from 'next';
import ExploreClient from './ExploreClient';
import { buildSocialMeta, CANONICAL_BASE } from '@/lib/seo/socialMeta';
import { AI_NSFW_TOOLS } from '@/app/ainsfw/data';
import { AINSFW_PAID_CLIENTS } from '@/app/ainsfw/fullReviews';
import type { AINsfwTool } from '@/app/ainsfw/types';
import { getAllToolStats, getApprovedSubmissions } from '@/lib/actions/ainsfw';
import connectDB from '@/lib/db/mongodb';
import { Bot } from '@/lib/models';
import { withErogramExploreLists, type ExploreCategory, type ExploreSite } from '@/lib/explore/topPornSitesData';
import { applyExploreFeatured } from '@/lib/explore/exploreFeatured';
import { applyExploreAdminData } from '@/lib/explore/applyExploreAdmin';
import { getExploreAdminSnapshot } from '@/lib/actions/exploreAdmin';

const title = 'Explore | Erogram';
const description = 'Adult website directory by category.';

export const revalidate = 300;

export const metadata: Metadata = {
  title,
  description,
  other: { rating: 'adult' },
  alternates: { canonical: `${CANONICAL_BASE}/porn-websites` },
  ...buildSocialMeta({
    title,
    description,
    url: `${CANONICAL_BASE}/porn-websites`,
    type: 'website',
  }),
};

function listingImage(image?: string): string | undefined {
  if (!image) return undefined;
  if (image.startsWith('http://') || image.startsWith('https://') || image.startsWith('/')) return image;
  return undefined;
}

function ainsfwSite(
  tool: Pick<AINsfwTool, 'name' | 'slug' | 'image' | 'sourceUrl'>,
  openInNewTab = false,
): ExploreSite {
  return {
    name: tool.name,
    url: `/ainsfw/${tool.slug}`,
    externalUrl: tool.sourceUrl,
    image: listingImage(tool.image),
    openInNewTab,
  };
}

function pickLatestAiNsfw(
  allTools: AINsfwTool[],
  submissions: Array<AINsfwTool & { createdAt?: string }>,
  limit: number,
): AINsfwTool[] {
  const toolsBySlug = new Map(allTools.map((t) => [t.slug, t]));
  const submissionSlugs = new Set(submissions.map((t) => t.slug));

  const fromDb = submissions.filter((t) => t.createdAt);
  const fromPaid = AINSFW_PAID_CLIENTS
    .filter(({ slug }) => !submissionSlugs.has(slug) && toolsBySlug.has(slug))
    .map(({ slug, goLive }) => ({ ...toolsBySlug.get(slug)!, createdAt: goLive }));

  const dated = [...fromDb, ...fromPaid].sort(
    (a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime(),
  );

  const seen = new Set<string>();
  const out: AINsfwTool[] = [];
  for (const tool of dated) {
    if (out.length >= limit) break;
    if (seen.has(tool.slug)) continue;
    seen.add(tool.slug);
    out.push(tool);
  }
  for (const tool of [...AI_NSFW_TOOLS].reverse()) {
    if (out.length >= limit) break;
    if (seen.has(tool.slug)) continue;
    seen.add(tool.slug);
    out.push(tool);
  }
  for (const tool of submissions) {
    if (out.length >= limit) break;
    if (seen.has(tool.slug)) continue;
    seen.add(tool.slug);
    out.push(tool);
  }
  return out.slice(0, limit);
}

async function loadExploreCategories(): Promise<ExploreCategory[]> {
  const staticSlugs = new Set(AI_NSFW_TOOLS.map((t) => t.slug));
  let submissions: Array<AINsfwTool & { createdAt?: string }> = [];
  try {
    submissions = await getApprovedSubmissions(staticSlugs);
  } catch (e) {
    console.error('[explore] approved submissions failed', e);
  }

  const allTools = [...AI_NSFW_TOOLS, ...submissions];
  const latestAiNsfw = pickLatestAiNsfw(allTools, submissions, 20).map((tool) => ainsfwSite(tool));

  let paidBots: ExploreSite[] = [];
  try {
    await connectDB();
    const bots = await Bot.find({
      status: 'approved',
      $or: [{ paidBoost: true }, { paidBoostStars: { $gt: 0 } }, { boosted: true }],
    })
      .select('name slug image telegramLink')
      .sort({ createdAt: -1 })
      .lean();
    paidBots = bots.map((bot: { name: string; slug: string; image?: string; telegramLink?: string }) => ({
      name: bot.name,
      url: `/${bot.slug}`,
      externalUrl: bot.telegramLink || undefined,
      image: listingImage(bot.image),
    }));
  } catch (e) {
    console.error('[explore] paid bots failed', e);
  }

  const companions = allTools.filter((t) => t.category === 'AI Companion');
  let stats: Record<string, { featured?: boolean; upvotes?: number }> = {};
  try {
    stats = await getAllToolStats(companions.map((t) => t.slug));
  } catch (e) {
    console.error('[explore] companion stats failed', e);
  }
  const companionSites = [...companions]
    .sort((a, b) => {
      const sa = stats[a.slug];
      const sb = stats[b.slug];
      const scoreA = (sa?.featured ? 1_000_000 : 0) + (sa?.upvotes || 0);
      const scoreB = (sb?.featured ? 1_000_000 : 0) + (sb?.upvotes || 0);
      return scoreB - scoreA || a.name.localeCompare(b.name);
    })
    .map((tool) => ainsfwSite(tool, true));

  const admin = await getExploreAdminSnapshot();
  return applyExploreFeatured(
    applyExploreAdminData(
      withErogramExploreLists(latestAiNsfw, paidBots, companionSites),
      admin.overrides,
      admin.orders,
    ),
  );
}

export default async function ExplorePage() {
  const categories = await loadExploreCategories();
  return <ExploreClient categories={categories} />;
}
