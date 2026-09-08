'use client';

import Link from 'next/link';
import { useCallback, useMemo, useRef, useState } from 'react';
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

const SWIPE_THRESHOLD_PX = 48;

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
  const side = direction === 'prev' ? 'left-1 sm:left-2' : 'right-1 sm:right-2';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`absolute ${side} top-1/2 -translate-y-1/2 z-30 flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-full border border-black/10 bg-white/95 text-black shadow-[0_4px_16px_rgba(0,0,0,0.12)] backdrop-blur-sm transition-all disabled:pointer-events-none disabled:opacity-0 hover:bg-white hover:scale-105 active:scale-95`}
    >
      <svg
        className="h-4 w-4 sm:h-5 sm:w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        aria-hidden
      >
        {direction === 'prev' ? <path d="M15 18l-6-6 6-6" /> : <path d="M9 18l6-6-6-6" />}
      </svg>
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
  const touchStartX = useRef<number | null>(null);

  const visibleTools = orderedTools.slice(
    page * RECENT_DISPLAY_LIMIT,
    page * RECENT_DISPLAY_LIMIT + RECENT_DISPLAY_LIMIT,
  );

  const canPrev = page > 0;
  const canNext = page < pageCount - 1;
  const showNav = pageCount > 1;

  const goPrev = useCallback(() => setPage((p) => Math.max(0, p - 1)), []);
  const goNext = useCallback(() => setPage((p) => Math.min(pageCount - 1, p + 1)), [pageCount]);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  }, []);

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartX.current == null) return;
      const endX = e.changedTouches[0]?.clientX ?? touchStartX.current;
      const delta = endX - touchStartX.current;
      touchStartX.current = null;
      if (delta > SWIPE_THRESHOLD_PX && canPrev) goPrev();
      else if (delta < -SWIPE_THRESHOLD_PX && canNext) goNext();
    },
    [canPrev, canNext, goPrev, goNext],
  );

  if (orderedTools.length === 0) return null;

  return (
    <section className="mb-2.5">
      <div className="relative bg-white rounded-xl border border-black/10 px-1.5 pb-1.5 pt-3">
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

        <div
          className="relative touch-pan-y"
          onTouchStart={showNav ? onTouchStart : undefined}
          onTouchEnd={showNav ? onTouchEnd : undefined}
        >
          {showNav ? (
            <>
              <NavButton direction="prev" disabled={!canPrev} onClick={goPrev} />
              <NavButton direction="next" disabled={!canNext} onClick={goNext} />
            </>
          ) : null}

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
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
        </div>

        {showNav ? (
          <div className="mt-1 flex items-center justify-center gap-1.5" role="tablist" aria-label="Recent additions pages">
            {Array.from({ length: pageCount }, (_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                onClick={() => setPage(i)}
                aria-label={`Show recent additions page ${i + 1}`}
                aria-selected={page === i}
                className={`h-2 rounded-full transition-all ${
                  page === i ? 'w-6 bg-[#22c55e]' : 'w-2 bg-gray-300 hover:bg-gray-400'
                }`}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
