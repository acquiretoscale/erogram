'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import ToolCard from './ToolCard';
import type { AINsfwTool } from './types';
import type { ToolStatsData } from '@/lib/actions/ainsfw';
import { useTranslation } from '@/lib/i18n';

function shuffleTools<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

interface RecentAdditionsBlockProps {
  tools: AINsfwTool[];
  allStats?: Record<string, ToolStatsData>;
  shuffle?: boolean;
  displayCount?: number;
  verifiedSlugs?: string[];
}

export default function RecentAdditionsBlock({
  tools,
  allStats,
  shuffle = false,
  displayCount = 4,
  verifiedSlugs = [],
}: RecentAdditionsBlockProps) {
  const verifiedSet = new Set(verifiedSlugs);
  const { t } = useTranslation();
  const [displayTools, setDisplayTools] = useState(() => tools.slice(0, displayCount));

  useEffect(() => {
    setDisplayTools(shuffle ? shuffleTools(tools).slice(0, displayCount) : tools.slice(0, displayCount));
  }, [tools, shuffle, displayCount]);

  if (displayTools.length === 0) return null;

  return (
    <section className="mb-10 sm:mb-14">
      <div className="bg-white rounded-2xl border border-black/10 p-4 sm:p-5">
        <div className="mb-4 sm:mb-5 flex items-center justify-between gap-3">
          <h2 className="inline-block px-2.5 py-1 rounded-lg bg-[#22c55e] text-black text-sm sm:text-base font-black uppercase tracking-wider">
            {t('ainsfw.recentAdditionsTitle')}
          </h2>
          <Link
            href="/add/ainsfw"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center h-9 sm:h-10 shrink-0 rounded-md px-3 sm:px-4 bg-rose-700 hover:bg-rose-800 active:bg-rose-900 text-white text-[9px] sm:text-[10px] font-black uppercase tracking-tight whitespace-nowrap transition-colors"
          >
            Get Listed on EROgram
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {displayTools.map((tool, i) => (
            <ToolCard
              key={tool.slug}
              tool={tool}
              index={i}
              initialStats={allStats?.[tool.slug]}
              verified={verifiedSet.has(tool.slug)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
