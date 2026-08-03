import { AI_NSFW_TOOLS } from '@/app/ainsfw/data';
import type { AINsfwTool } from '@/app/ainsfw/types';

export type BestAiToolMatch = 'category' | 'tag';

export interface BestAiToolPage {
  slug: string;
  label: string;
  match: BestAiToolMatch;
  /** Primary DB category (match === 'category'). */
  category?: string;
  /** Tag substring match on tool.tags (match === 'tag'). */
  tagPatterns?: string[];
}

/** Owner-approved ranking pages — EN canonical slug is the key. */
export const BEST_AI_NSFW_TOOL_PAGES: BestAiToolPage[] = [
  { slug: 'ai-companion', label: 'AI Companion', match: 'category', category: 'AI Companion' },
  { slug: 'undress-ai', label: 'Undress AI', match: 'category', category: 'Undress AI' },
  { slug: 'ai-nsfw-image-generator', label: 'AI NSFW Image Generator', match: 'category', category: 'AI NSFW Image Generator' },
  { slug: 'ai-nsfw-roleplay', label: 'AI NSFW Roleplay', match: 'category', category: 'AI NSFW Roleplay' },
  { slug: 'ai-sexting-chat', label: 'AI Sexting / Chat', match: 'category', category: 'AI Sexting / Chat' },
  { slug: 'ai-porn-generator', label: 'AI Porn Generator', match: 'category', category: 'AI Porn Generator' },
  { slug: 'adult-games', label: 'Adult Games', match: 'category', category: 'Adult Games' },
  { slug: 'ai-girlfriend', label: 'AI Girlfriend', match: 'tag', tagPatterns: ['ai girlfriend', 'virtual girlfriend'] },
  { slug: 'ai-sexting', label: 'AI Sexting', match: 'tag', tagPatterns: ['ai sexting'] },
  { slug: 'ai-nude-generator', label: 'AI Nude Generator', match: 'tag', tagPatterns: ['nude generator', 'nude maker', 'ai nude'] },
  {
    slug: 'ai-nsfw-story-generator',
    label: 'AI NSFW Story Generator',
    match: 'tag',
    tagPatterns: ['ai story', 'story generator', 'erotic storytelling', 'nsfw story'],
  },
];

export const BEST_AI_NSFW_TOOLS_HUB = 'best-ai-nsfw-tools';

/** Top 20 crypto-only ranking pages — canonical slug has no year. */
export interface BestAiCryptoToolPage {
  slug: string;
  /** Display label in titles (e.g. "AI companion"). */
  titleLabel: string;
  category: AINsfwTool['category'];
}

export const BEST_AI_CRYPTO_TOOL_PAGES: BestAiCryptoToolPage[] = [
  {
    slug: 'top-20-ai-companion-tools-accepting-crypto',
    titleLabel: 'AI companion',
    category: 'AI Companion',
  },
  {
    slug: 'top-20-undress-ai-tools-accepting-crypto',
    titleLabel: 'Undress AI',
    category: 'Undress AI',
  },
  {
    slug: 'top-20-ai-nsfw-image-generator-tools-accepting-crypto',
    titleLabel: 'AI NSFW Image Generator',
    category: 'AI NSFW Image Generator',
  },
];

export function cryptoPageFromSlug(slug: string): BestAiCryptoToolPage | undefined {
  const normalized = slug.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, '');
  return BEST_AI_CRYPTO_TOOL_PAGES.find((p) => p.slug === normalized);
}

export function getCryptoPageMetaTitle(page: BestAiCryptoToolPage): string {
  return `TOP 20 ${page.titleLabel} Tools accepting crypto`;
}

export function getCryptoPageHeroTitle(page: BestAiCryptoToolPage, year: number): string {
  return `TOP 20 ${page.titleLabel} Tools accepting crypto in ${year}`;
}

export function getToolsForCryptoPage(page: BestAiCryptoToolPage): AINsfwTool[] {
  return AI_NSFW_TOOLS.filter(
    (tool) => tool.category === page.category && tool.payment.includes('Crypto'),
  );
}

export function bestAiToolPageFromSlug(slug: string): BestAiToolPage | undefined {
  const normalized = slug.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, '');
  return BEST_AI_NSFW_TOOL_PAGES.find((p) => p.slug === normalized);
}

function toolMatchesPage(tool: AINsfwTool, page: BestAiToolPage): boolean {
  if (page.match === 'category') {
    return tool.category === page.category;
  }
  const tags = tool.tags.map((t) => t.toLowerCase());
  return (page.tagPatterns || []).some((pattern) =>
    tags.some((tag) => tag.includes(pattern.toLowerCase())),
  );
}

export function getToolsForBestAiPage(page: BestAiToolPage): AINsfwTool[] {
  return AI_NSFW_TOOLS.filter((tool) => toolMatchesPage(tool, page));
}

/** Main category first, then up to 3 other matching ranking categories from tags. */
export function getToolDisplayCategories(tool: AINsfwTool): string[] {
  const main = tool.category;
  const extras: string[] = [];
  for (const page of BEST_AI_NSFW_TOOL_PAGES) {
    if (page.label === main) continue;
    if (extras.includes(page.label)) continue;
    if (toolMatchesPage(tool, page)) {
      extras.push(page.label);
    }
    if (extras.length >= 3) break;
  }
  return [main, ...extras];
}
