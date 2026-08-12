'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import ToolCard from './ToolCard';
import type { AINsfwTool } from './types';
import type { ToolStatsData } from '@/lib/actions/ainsfw';
import { useTranslation } from '@/lib/i18n';
import { RECENT_DISPLAY_LIMIT, RECENT_POOL_LIMIT } from './recentCategoryTools';

interface RecentAdditionsBlockProps {
  tools: AINsfwTool[];
  allStats?: Record<string, ToolStatsData>;
  verifiedSlugs?: string[];
}

function NavButton({
  direction,
  disabled,
  onClick,
}: {
  direction: 'prev' | 'next';
  disabled: boolean;
  onClick: () => void;
}) {
  const label = direction === 'prev' ? 'Previous recent additions' : 'Next recent additions';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="group shrink-0 inline-flex flex-col items-center justify-center gap-1 w-11 sm:w-14 min-h-[120px] sm:min-h-[140px] rounded-xl border-2 border-[#22c55e] bg-[#22c55e] text-black shadow-[0_4px_18px_rgba(34,197,94,0.35)] disabled:border-gray-300 disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none disabled:cursor-not-allowed hover:bg-[#4ade80] hover:border-[#4ade80] active:scale-[0.98] transition-all"
    >
      <svg
        className="w-5 h-5 sm:w-6 sm:h-6"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        aria-hidden
      >
        {direction === 'prev' ? <path d="M15 18l-6-6 6-6" /> : <path d="M9 18l6-6-6-6" />}
      </svg>
      <span className="hidden sm:block text-[9px] font-black uppercase tracking-[0.14em] leading-none">
        {direction === 'prev' ? 'Prev' : 'Next'}
      </span>
    </button>
  );
}

export default function RecentAdditionsBlock({
  tools,
  allStats,
  verifiedSlugs = [],
}: RecentAdditionsBlockProps) {
  const verifiedSet = new Set(verifiedSlugs);
  const { t } = useTranslation();
  const orderedTools = useMemo(() => tools.slice(0, RECENT_POOL_LIMIT), [tools]);
  const pageCount = Math.ceil(orderedTools.length / RECENT_DISPLAY_LIMIT);
  const [page, setPage] = useState(0);

  const visibleTools = orderedTools.slice(
    page * RECENT_DISPLAY_LIMIT,
    page * RECENT_DISPLAY_LIMIT + RECENT_DISPLAY_LIMIT,
  );

  if (orderedTools.length === 0) return null;

  const canPrev = page > 0;
  const canNext = page < pageCount - 1;
  const showNav = pageCount > 1;

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

        <div className="flex items-stretch gap-2 sm:gap-3">
          {showNav ? (
            <NavButton direction="prev" disabled={!canPrev} onClick={() => setPage((p) => Math.max(0, p - 1))} />
          ) : null}

          <div className="min-w-0 flex-1 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {visibleTools.map((tool, i) => (
              <ToolCard
                key={tool.slug}
                tool={tool}
                index={page * RECENT_DISPLAY_LIMIT + i}
                initialStats={allStats?.[tool.slug]}
                verified={verifiedSet.has(tool.slug)}
              />
            ))}
          </div>

          {showNav ? (
            <NavButton direction="next" disabled={!canNext} onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))} />
          ) : null}
        </div>

        {showNav ? (
          <div className="mt-4 flex items-center justify-center gap-2">
            {Array.from({ length: pageCount }, (_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setPage(i)}
                aria-label={`Show recent additions page ${i + 1}`}
                aria-current={page === i ? 'true' : undefined}
                className={`h-2.5 rounded-full transition-all ${
                  page === i ? 'w-8 bg-[#22c55e]' : 'w-2.5 bg-gray-300 hover:bg-gray-400'
                }`}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
