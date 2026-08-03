'use client';

import { useEffect, useState } from 'react';
import ToolCard from './ToolCard';
import AdvertCard from '../groups/AdvertCard';
import type { FeedCampaign } from '../groups/types';
import type { AINsfwTool } from './types';
import type { ToolStatsData } from '@/lib/actions/ainsfw';
import { getPlacementFeedCampaigns } from '@/lib/actions/campaigns';
import { useTranslation } from '@/lib/i18n';

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
  allStats?: Record<string, ToolStatsData>;
  scores: Record<string, number>;
  featuredSlugs: string[];
  boostFeaturedSlugs: string[];
  featuredCampaignMap: Record<string, string>;
  topAdCampaigns: FeedCampaign[];
  onVoteChange: (slug: string, score: number) => void;
  verifiedSlugs?: string[];
}

export default function TopAINsfwBlock({
  tools,
  allStats,
  scores,
  featuredSlugs,
  boostFeaturedSlugs,
  featuredCampaignMap,
  topAdCampaigns,
  onVoteChange,
  verifiedSlugs = [],
}: TopAINsfwBlockProps) {
  const verifiedSet = new Set(verifiedSlugs);
  const { t } = useTranslation();
  const [liveTopAds, setLiveTopAds] = useState<FeedCampaign[]>(topAdCampaigns);

  useEffect(() => {
    getPlacementFeedCampaigns('ainsfw-featured', 4)
      .catch(() => [] as FeedCampaign[])
      .then((topAds) => {
        if (topAds.length > 0) setLiveTopAds(topAds as FeedCampaign[]);
      });
  }, []);

  const featuredSet = new Set(featuredSlugs);
  const boostSet = new Set(boostFeaturedSlugs);

  const scoreSorted = [...tools]
    .filter((tool) => (scores[tool.slug] ?? 0) > 0)
    .sort((a, b) => (scores[b.slug] ?? 0) - (scores[a.slug] ?? 0));

  const boostFeatured = boostFeaturedSlugs
    .map((slug) => tools.find((tool) => tool.slug === slug))
    .filter(Boolean) as AINsfwTool[];
  const otherFeatured = tools.filter((t) => featuredSet.has(t.slug) && !boostSet.has(t.slug));
  const nonFeaturedByScore = scoreSorted.filter((t) => !featuredSet.has(t.slug));

  const seenAdIds = new Set<string>();
  const ads = liveTopAds.filter((c) => (seenAdIds.has(c._id) ? false : (seenAdIds.add(c._id), true)));

  const GRID = 4;
  type Cell = { kind: 'tool'; tool: AINsfwTool } | { kind: 'ad'; campaign: FeedCampaign };
  const cells: Cell[] = [];
  for (const tool of boostFeatured) {
    if (cells.length >= GRID) break;
    cells.push({ kind: 'tool', tool });
  }
  for (const tool of [...otherFeatured, ...nonFeaturedByScore]) {
    if (cells.length >= GRID) break;
    cells.push({ kind: 'tool', tool });
  }
  for (const campaign of ads) {
    if (cells.length >= GRID) break;
    cells.push({ kind: 'ad', campaign });
  }

  if (cells.length === 0) return null;

  return (
    <section className="mb-10 sm:mb-14">
      <div className="bg-white rounded-2xl border border-black/10 p-4 sm:p-5">
        <div className="flex items-center justify-between mb-4 sm:mb-5">
          <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-black">{t('ainsfw.topTitle')}</h2>
          <span className="text-[10px] sm:text-xs font-black bg-[#22c55e] text-black rounded px-2 py-0.5">
            {t('ainsfw.topBadge')}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {cells.map((cell, i) =>
            cell.kind === 'ad' ? (
              <div key={`ainsfw-ad-${cell.campaign._id}`} className="h-full rounded-xl overflow-hidden bg-[#0a0a0a] border border-white/10 [&>*]:h-full">
                <AdvertCard campaign={cell.campaign} isIndex={i} placementOverride="ainsfw-featured" />
              </div>
            ) : (
              <ToolCard
                key={cell.tool.slug}
                tool={cell.tool}
                index={i}
                initialStats={allStats?.[cell.tool.slug]}
                onVoteChange={onVoteChange}
                featured={featuredSet.has(cell.tool.slug)}
                campaignId={featuredCampaignMap[cell.tool.slug]}
                verified={verifiedSet.has(cell.tool.slug)}
              />
            ),
          )}
        </div>
      </div>
    </section>
  );
}
