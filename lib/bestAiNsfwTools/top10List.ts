import { getAllToolStats } from '@/lib/actions/ainsfw';
import type { BestAiCryptoToolPage, BestAiToolPage } from './pages';
import { getToolsForBestAiPage, getToolsForCryptoPage, getToolDisplayCategories } from './pages';

export type Top10ToolDoc = {
  slug: string;
  name: string;
  category: string;
  displayCategories: string[];
  description: string;
  image: string;
  vendor: string;
  galleryImages: string[];
  payment: string[];
  reviewCount: number;
  featured: boolean;
};

export type Top10ToolRankEntry = {
  tool: Top10ToolDoc;
  rank: number;
};

function truncateDescription(text: string, max = 320): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trim()}…`;
}

async function buildRankedToolList(
  matched: ReturnType<typeof getToolsForBestAiPage>,
  limit: number,
): Promise<Top10ToolRankEntry[]> {
  const slugs = matched.map((t) => t.slug);
  const statsMap = slugs.length ? await getAllToolStats(slugs) : {};

  const scored = matched
    .map((tool) => {
      const stats = statsMap[tool.slug];
      const mainImage = stats?.imageOverride || tool.image;
      const hidden = new Set(stats?.hiddenGalleryUrls || []);
      const extraGallery = (stats?.customGallery || []).filter(
        (url) => url && !hidden.has(url) && url !== mainImage,
      );
      const galleryImages = [mainImage, ...extraGallery].slice(0, 7);
      return {
        tool: {
          slug: tool.slug,
          name: tool.name,
          category: tool.category,
          displayCategories: getToolDisplayCategories(tool),
          description: truncateDescription(stats?.descriptionOverride || tool.description),
          image: mainImage,
          vendor: tool.vendor,
          galleryImages,
          payment: tool.payment || [],
          reviewCount: stats?.reviews?.length || 0,
          featured: !!stats?.featured,
        } satisfies Top10ToolDoc,
        score: (stats?.featured ? 1_000_000 : 0) + (stats?.upvotes || 0),
      };
    })
    .sort((a, b) => b.score - a.score || a.tool.name.localeCompare(b.tool.name))
    .slice(0, limit);

  return scored.map((entry, index) => ({
    tool: entry.tool,
    rank: index + 1,
  }));
}

export async function buildBestAiToolTop10(page: BestAiToolPage): Promise<Top10ToolRankEntry[]> {
  return buildRankedToolList(getToolsForBestAiPage(page), 10);
}

export async function buildBestAiToolTop20Crypto(
  page: BestAiCryptoToolPage,
): Promise<Top10ToolRankEntry[]> {
  return buildRankedToolList(getToolsForCryptoPage(page), 20);
}
