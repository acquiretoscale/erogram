import { AI_NSFW_TOOLS } from '@/app/ainsfw/data';
import type { AINsfwTool } from '@/app/ainsfw/types';
import { bestAiToolPageFromSlug, getToolsForBestAiPage } from '@/lib/bestAiNsfwTools/pages';
import { getAllBotStats } from '@/lib/actions/botVotes';
import { getAllToolStats, getApprovedSubmissions } from '@/lib/actions/ainsfw';
import { getExploreAdminSnapshot } from '@/lib/actions/exploreAdmin';
import { applyExploreAdminData } from '@/lib/explore/applyExploreAdmin';
import { applyExploreFeatured } from '@/lib/explore/exploreFeatured';
import { EXPLORE_CATEGORIES, type ExploreCategory, type ExploreSite } from '@/lib/explore/topPornSitesData';
import { exploreSiteKey } from '@/lib/explore/siteKey';
import connectDB from '@/lib/db/mongodb';
import { Bot } from '@/lib/models';
import {
  DIRECTORY_PAGES,
  RANKING_LIMIT,
  directoryPageFromSlug,
  type DirectoryPageConfig,
} from './config';
import type { DirectoryRankItem } from './types';

export type { DirectoryRankItem } from './types';

function listingImage(image?: string): string {
  if (!image) return '';
  if (image.startsWith('http://') || image.startsWith('https://') || image.startsWith('/')) return image;
  return '';
}

function toolMatchesGirlfriend(tool: Pick<AINsfwTool, 'category' | 'tags'>): boolean {
  if (tool.category === 'AI Girlfriend') return true;
  const tags = (tool.tags || []).map((tag) => tag.toLowerCase());
  return tags.some((tag) => tag.includes('ai girlfriend') || tag.includes('virtual girlfriend'));
}

function toolsForPage(page: DirectoryPageConfig, allTools: AINsfwTool[]): AINsfwTool[] {
  if (page.match === 'all-ainsfw') return allTools;
  if (page.match === 'ai-girlfriend') {
    const staticPage = bestAiToolPageFromSlug('ai-girlfriend');
    const fromStatic = staticPage ? getToolsForBestAiPage(staticPage) : [];
    const staticSlugs = new Set(fromStatic.map((tool) => tool.slug));
    const fromAll = allTools.filter((tool) => !staticSlugs.has(tool.slug) && toolMatchesGirlfriend(tool));
    return [...fromStatic, ...fromAll];
  }
  if (page.match === 'undress-ai') {
    return allTools.filter((tool) => tool.category === 'Undress AI');
  }
  if (page.match === 'ai-porn-generator') {
    return allTools.filter((tool) => tool.category === 'AI Porn Generator');
  }
  return [];
}

function rankTools(
  tools: AINsfwTool[],
  stats: Record<string, { upvotes?: number }>,
  limit = RANKING_LIMIT,
): AINsfwTool[] {
  return [...tools]
    .sort(
      (a, b) =>
        (stats[b.slug]?.upvotes || 0) - (stats[a.slug]?.upvotes || 0) || a.name.localeCompare(b.name),
    )
    .slice(0, limit);
}

function toolToSite(tool: AINsfwTool, image?: string): ExploreSite {
  return {
    name: tool.name,
    url: `/ainsfw/${tool.slug}`,
    image: listingImage(image || tool.image),
  };
}

function toolToRankItem(tool: AINsfwTool, image?: string, description?: string): DirectoryRankItem {
  return {
    name: tool.name,
    href: `/ainsfw/${tool.slug}`,
    image: listingImage(image || tool.image),
    description: (description || tool.description || '').slice(0, 320),
    category: tool.category,
    bookmarkKind: 'ainsfw',
    bookmarkId: tool.slug,
  };
}

function siteToRankItem(site: ExploreSite): DirectoryRankItem {
  const href = site.url.startsWith('/') ? site.url : `/${site.url}`;
  return {
    name: site.name,
    href,
    image: listingImage(site.image),
    description: site.description || '',
    category: '',
    bookmarkKind: 'explore',
    bookmarkId: exploreSiteKey(site),
  };
}

async function loadAllAinsfwTools(): Promise<{ tools: AINsfwTool[]; stats: Record<string, { upvotes?: number; imageOverride?: string; descriptionOverride?: string }> }> {
  const staticSlugs = new Set(AI_NSFW_TOOLS.map((tool) => tool.slug));
  let submissions: AINsfwTool[] = [];
  try {
    submissions = await getApprovedSubmissions(staticSlugs);
  } catch (error) {
    console.error('[bestDirectory] submissions failed', error);
  }
  const tools = [...AI_NSFW_TOOLS, ...submissions];
  let stats: Record<string, { upvotes?: number; imageOverride?: string; descriptionOverride?: string }> = {};
  try {
    stats = await getAllToolStats(tools.map((tool) => tool.slug));
  } catch (error) {
    console.error('[bestDirectory] tool stats failed', error);
  }
  return { tools, stats };
}

async function loadBotsByCategory(category: string): Promise<DirectoryRankItem[]> {
  try {
    await connectDB();
    const bots = await Bot.find({
      status: 'approved',
      isAdvertisement: { $ne: true },
      $or: [{ category }, { categories: category }],
    })
      .select('name slug image description category country views')
      .lean<{
        _id: { toString(): string };
        name: string;
        slug: string;
        image?: string;
        description?: string;
        category?: string;
        country?: string;
        views?: number;
      }[]>();
    const stats = await getAllBotStats(bots.map((bot) => bot.slug));
    return [...bots]
      .sort(
        (a, b) =>
          (stats[b.slug]?.upvotes || 0) - (stats[a.slug]?.upvotes || 0) || a.name.localeCompare(b.name),
      )
      .slice(0, RANKING_LIMIT)
      .map((bot) => ({
        name: bot.name,
        href: `/${bot.slug}`,
        image: listingImage(bot.image),
        description: (bot.description || '').slice(0, 320),
        category: bot.category || category,
        views: bot.views || 0,
        country: bot.country || '',
        bookmarkKind: 'bot' as const,
        bookmarkId: bot._id.toString(),
      }));
  } catch (error) {
    console.error('[bestDirectory] bots failed', error);
    return [];
  }
}

async function loadExploreCategory(
  sourceSlug: string,
  admin?: Awaited<ReturnType<typeof getExploreAdminSnapshot>>,
): Promise<ExploreCategory | undefined> {
  const base = EXPLORE_CATEGORIES.find((category) => category.slug === sourceSlug);
  if (!base) return undefined;
  try {
    const snapshot = admin || (await getExploreAdminSnapshot());
    const [ready] = applyExploreFeatured(
      applyExploreAdminData([base], snapshot.overrides, snapshot.orders),
    );
    return ready;
  } catch (error) {
    console.error('[bestDirectory] explore admin failed', error);
    return base;
  }
}

export async function loadRankingItems(slug: string): Promise<DirectoryRankItem[]> {
  const page = directoryPageFromSlug(slug);
  if (!page) return [];

  if (page.kind === 'ainsfw') {
    const { tools, stats } = await loadAllAinsfwTools();
    return rankTools(toolsForPage(page, tools), stats).map((tool) =>
      toolToRankItem(tool, stats[tool.slug]?.imageOverride, stats[tool.slug]?.descriptionOverride),
    );
  }

  if (page.match === 'bots-undress') return loadBotsByCategory('Undress AI');
  if (page.match === 'bots-girlfriend') return loadBotsByCategory('AI Girlfriend');

  if (page.exploreSourceSlug) {
    const category = await loadExploreCategory(page.exploreSourceSlug);
    return (category?.sites || []).slice(0, RANKING_LIMIT).map(siteToRankItem);
  }

  return [];
}

function pageToHomeCategory(
  page: DirectoryPageConfig,
  sites: ExploreSite[],
): ExploreCategory {
  return {
    slug: page.slug,
    title: page.homeTitle,
    description: page.homeDescription,
    sites,
  };
}

export async function loadHomeDirectoryCategories(): Promise<ExploreCategory[]> {
  const ainsfwPages = DIRECTORY_PAGES.filter((page) => page.kind === 'ainsfw');
  const botPages = DIRECTORY_PAGES.filter((page) => page.kind === 'bots');
  const explorePages = DIRECTORY_PAGES.filter((page) => page.kind === 'explore');

  const admin = await getExploreAdminSnapshot().catch((error) => {
    console.error('[bestDirectory] explore admin failed', error);
    return { overrides: [], orders: [] };
  });

  const [{ tools, stats }, botItems, exploreCats] = await Promise.all([
    loadAllAinsfwTools(),
    Promise.all(botPages.map((page) => loadRankingItems(page.slug))),
    Promise.all(
      explorePages.map((page) => loadExploreCategory(page.exploreSourceSlug || page.slug, admin)),
    ),
  ]);

  const ainsfwCats = ainsfwPages.map((page) =>
    pageToHomeCategory(
      page,
      rankTools(toolsForPage(page, tools), stats).map((tool) => toolToSite(tool, stats[tool.slug]?.imageOverride)),
    ),
  );

  const botCats = botPages.map((page, index) =>
    pageToHomeCategory(
      page,
      botItems[index].map((item) => ({
        name: item.name,
        url: item.href,
        image: item.image,
      })),
    ),
  );

  const webCats = explorePages.map((page, index) => {
    const source = exploreCats[index];
    return pageToHomeCategory(page, source?.sites || []);
  });

  return [...ainsfwCats, ...botCats, ...webCats];
}
