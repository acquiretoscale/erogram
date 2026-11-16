'use client';

import type { ReactNode } from 'react';
import ToolCard from './ToolCard';
import type { AINsfwTool } from './types';
import type { ToolStatsData } from '@/lib/actions/ainsfw';
import { AINSFW_FEATURED_SLOT_COUNT } from '@/lib/ainsfw/featuredHub';
import { useTranslation } from '@/lib/i18n/client';

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
  heading?: string;
  showGetFeatured?: boolean;
  listingHref?: (slug: string) => string;
  tone?: 'green' | 'red' | 'gold';
  badge?: string;
  allowEmpty?: boolean;
  toolbar?: ReactNode;
  slotCount?: number;
  compactCards?: boolean;
}

export default function TopAINsfwBlock({
  tools,
  featuredHubSlugs,
  allStats,
  featuredCampaignMap = {},
  onVoteChange,
  verifiedSlugs = [],
  heading,
  listingHref,
  tone = 'green',
  badge,
  allowEmpty = false,
  toolbar,
  slotCount = AINSFW_FEATURED_SLOT_COUNT,
  compactCards = false,
}: TopAINsfwBlockProps) {
  const { t } = useTranslation();
  const verifiedSet = new Set(verifiedSlugs);
  const bySlug = new Map(tools.map((tool) => [tool.slug, tool]));
  const displayTools = featuredHubSlugs
    .map((slug) => bySlug.get(slug))
    .filter(Boolean)
    .slice(0, slotCount) as AINsfwTool[];

  if (displayTools.length === 0 && !allowEmpty) return null;
  const badgeText = badge || t('ainsfw.featuredOn', 'Featured on EROGRAMX');

  const gridCols = displayTools.length === 1
    ? 'grid grid-cols-1 gap-2 max-w-xs'
    : tone === 'gold'
    ? 'grid grid-cols-2 lg:grid-cols-4 gap-3'
    : 'grid grid-cols-2 lg:grid-cols-4 gap-2';

  const shell = tone === 'red'
    ? 'border-2 border-[#c0392f]/80 bg-gradient-to-b from-[#7a1f1a] via-[#2a0c0c] to-[#140404] shadow-[0_0_36px_-8px_rgba(192,57,47,0.55)]'
    : tone === 'gold'
    ? 'border border-black/10 bg-white shadow-[0_8px_24px_-16px_rgba(0,0,0,0.35)]'
    : 'border-2 border-[#22c55e]/80 bg-gradient-to-b from-[#166534] via-[#0c2e1a] to-[#07180f] shadow-[0_0_36px_-8px_rgba(34,197,94,0.65)]';
  const featuredLabelCls = tone === 'gold'
    ? 'text-[#1a0f00]'
    : 'bg-[#22c55e] text-black shadow-[0_0_16px_rgba(34,197,94,0.55)]';
  const goldLabelStyle = tone === 'gold'
    ? {
        background: 'linear-gradient(135deg, #b8860b 0%, #ffd700 40%, #fff8b0 55%, #ffd700 70%, #b8860b 100%)',
        boxShadow: '0 4px 18px -6px rgba(255,215,0,0.55), inset 0 1px 0 rgba(255,255,255,0.4)',
      }
    : undefined;

  return (
    <section className="mb-8">
      <div className={`relative rounded-2xl ${shell} ${tone === 'gold' ? 'px-3 pb-3' : 'px-2 pb-2'} ${heading ? 'pt-3' : 'pt-5'}`}>
        {heading ? (
          <h2 className="px-2 pb-3 text-sm sm:text-base font-black text-white leading-snug">
            {heading}
          </h2>
        ) : (
        <div className="absolute -top-3 left-3 right-3 flex items-center justify-end gap-2 pointer-events-none">
          <h2 className={`pointer-events-auto inline-flex items-center min-h-6 px-2.5 py-1 rounded-md text-[10px] sm:text-[11px] font-black uppercase tracking-wide leading-none text-right ${featuredLabelCls}`} style={goldLabelStyle}>
            {badgeText}
          </h2>
        </div>
        )}
        {toolbar}
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
              spotlight
              hubCta
              compact={compactCards}
              listingHref={listingHref?.(tool.slug)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
