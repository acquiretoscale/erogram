'use client';

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
        <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-black mb-4 sm:mb-5">
          {t('ainsfw.recentAdditionsTitle')}
        </h2>
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
