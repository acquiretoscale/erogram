'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import ToolCard from './ToolCard';
import type { AINsfwTool } from './types';
import type { ToolStatsData } from '@/lib/actions/ainsfw';
import { useTranslation } from '@/lib/i18n';
import { RECENT_POOL_LIMIT } from './recentCategoryTools';

interface RecentAdditionsBlockProps {
  tools: AINsfwTool[];
  allStats?: Record<string, ToolStatsData>;
  verifiedSlugs?: string[];
}

export default function RecentAdditionsBlock({
  tools,
  allStats,
  verifiedSlugs = [],
}: RecentAdditionsBlockProps) {
  const verifiedSet = new Set(verifiedSlugs);
  const { t } = useTranslation();
  const visibleTools = useMemo(() => tools.slice(0, RECENT_POOL_LIMIT), [tools]);

  if (visibleTools.length === 0) return null;

  return (
    <section className="mb-2.5">
      <div className="relative rounded-2xl border-2 border-[#22c55e]/80 bg-gradient-to-b from-[#166534] via-[#0c2e1a] to-[#07180f] px-2 pb-2 pt-5 shadow-[0_0_36px_-8px_rgba(34,197,94,0.65)]">
        <div className="absolute -top-2.5 left-2 right-2 flex items-center justify-between gap-2 pointer-events-none">
          <h2 className="pointer-events-auto inline-flex items-center h-5 px-2 rounded-md bg-[#22c55e] text-black text-[10px] font-black uppercase tracking-wide leading-none shadow-[0_1px_0_rgba(0,0,0,0.08)]">
            {t('ainsfw.recentAdditionsTitle')}
          </h2>
          <Link
            href="/add/ainsfw"
            target="_blank"
            rel="noopener noreferrer"
            className="pointer-events-auto inline-flex items-center justify-center h-5 shrink-0 rounded-md px-1.5 bg-rose-700 hover:bg-rose-800 active:bg-rose-900 text-white text-[8px] font-black uppercase tracking-tight whitespace-nowrap transition-colors shadow-[0_1px_0_rgba(0,0,0,0.08)]"
          >
            Get Listed on EROgram
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {visibleTools.map((tool, i) => (
            <ToolCard
              key={tool.slug}
              tool={tool}
              index={i}
              initialStats={allStats?.[tool.slug]}
              verified={verifiedSet.has(tool.slug)}
              spotlight
            />
          ))}
        </div>
      </div>
    </section>
  );
}
