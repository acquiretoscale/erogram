'use client';

import Link from 'next/link';
import ToolCard from './ToolCard';
import type { AINsfwTool } from './types';
import type { ToolStatsData } from '@/lib/actions/ainsfw';

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
  const verifiedSet = new Set(verifiedSlugs);

  const bySlug = new Map(tools.map((tool) => [tool.slug, tool]));
  const featuredTools = featuredHubSlugs
    .map((slug) => bySlug.get(slug))
    .filter(Boolean) as AINsfwTool[];

  const displayTools =
    featuredTools.length >= 4
      ? featuredTools.slice(0, 4)
      : featuredTools.length >= 2
        ? featuredTools.slice(0, 2)
        : [];

  if (displayTools.length !== 2 && displayTools.length !== 4) return null;

  const gridCols =
    displayTools.length === 4
      ? 'grid grid-cols-2 lg:grid-cols-4 gap-3'
      : 'grid grid-cols-2 gap-3 max-w-xl mx-auto w-full';

  return (
    <section className="mb-10 sm:mb-14">
      <div className="bg-white rounded-2xl border border-black/10 p-4 sm:p-5">
        <div className="mb-4 sm:mb-5 flex items-center justify-between gap-3">
          <h2 className="inline-block px-2.5 py-1 rounded-lg bg-[#22c55e] text-black text-sm sm:text-base font-black uppercase tracking-wider">
            Featured on Erogram
          </h2>
          <Link
            href="/add/ainsfw"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center h-9 sm:h-10 shrink-0 rounded-md px-3 sm:px-4 bg-rose-700 hover:bg-rose-800 active:bg-rose-900 text-white text-[9px] sm:text-[10px] font-black uppercase tracking-tight whitespace-nowrap transition-colors"
          >
            GET FEATURED
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
              verified={verifiedSet.has(tool.slug)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
