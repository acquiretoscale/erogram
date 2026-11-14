'use client';

import Link from 'next/link';
import ToolCard from './ToolCard';
import type { AINsfwTool } from './types';
import type { ToolStatsData } from '@/lib/actions/ainsfw';
import { AINSFW_FEATURED_SLOT_COUNT } from '@/lib/ainsfw/featuredHub';
import { useLocalePath, useTranslation } from '@/lib/i18n/client';

export function loadAllScores(allStats?: Record<string, ToolStatsData>): Record<string, number> {
  const map: Record<string, number> = {};
  if (allStats) {
    for (const [slug, stats] of Object.entries(allStats)) {
      map[slug] = (stats.upvotes ?? 0) - (stats.downvotes ?? 0);
    }
  }
  return map;
}

interface TopAINsfwBlockProps {
  tools: AINsfwTool[];
  featuredHubSlugs: string[];
  allStats?: Record<string, ToolStatsData>;
  featuredCampaignMap?: Record<string, string>;
  topAdCampaigns?: unknown[];
  onVoteChange: (slug: string, score: number) => void;
  verifiedSlugs?: string[];
}

export default function TopAINsfwBlock({
  tools,
  featuredHubSlugs,
  allStats,
  featuredCampaignMap = {},
  onVoteChange,
  verifiedSlugs = [],
}: TopAINsfwBlockProps) {
  const { t } = useTranslation();
  const lp = useLocalePath();
  const verifiedSet = new Set(verifiedSlugs);
  const bySlug = new Map(tools.map((tool) => [tool.slug, tool]));
  const displayTools = featuredHubSlugs
    .map((slug) => bySlug.get(slug))
    .filter(Boolean)
    .slice(0, AINSFW_FEATURED_SLOT_COUNT) as AINsfwTool[];

  if (displayTools.length === 0) return null;

  const gridCols = displayTools.length === 1
    ? 'grid grid-cols-1 gap-2 max-w-xs'
    : 'grid grid-cols-2 lg:grid-cols-4 gap-2';

  return (
    <section className="mb-8">
      <div className="relative rounded-2xl border-2 border-[#22c55e]/80 bg-gradient-to-b from-[#166534] via-[#0c2e1a] to-[#07180f] px-2 pb-2 pt-5 shadow-[0_0_36px_-8px_rgba(34,197,94,0.65)]">
        <div className="absolute -top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
          <h2 className="pointer-events-auto inline-flex items-center h-6 px-2.5 rounded-md bg-[#22c55e] text-black text-[11px] font-black uppercase tracking-wide leading-none shadow-[0_0_16px_rgba(34,197,94,0.55)]">
            {t('ainsfw.featuredOn', 'Featured on Erogram')}
          </h2>
          <Link
            href={lp('/add/ainsfw')}
            target="_blank"
            rel="noopener noreferrer"
            className="pointer-events-auto inline-flex items-center justify-center h-5 shrink-0 rounded-md px-1.5 bg-rose-700 hover:bg-rose-800 active:bg-rose-900 text-white text-[8px] font-black uppercase tracking-tight whitespace-nowrap transition-colors shadow-[0_1px_0_rgba(0,0,0,0.08)]"
          >
            {t('ainsfw.getFeatured', 'GET FEATURED')}
          </Link>
        </div>
        <div className={gridCols}>
          {displayTools.map((tool, i) => (
            <ToolCard
              key={tool.slug}
              tool={tool}
              index={i}
              initialStats={allStats?.[tool.slug]}
              onVoteChange={onVoteChange}
              campaignId={featuredCampaignMap[tool.slug]}
              verified={verifiedSet.has(tool.slug)}
              light
              hubCta
            />
          ))}
        </div>
      </div>
    </section>
  );
}
