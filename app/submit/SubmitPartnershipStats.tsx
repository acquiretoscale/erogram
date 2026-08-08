'use client';

import { useEffect, useState } from 'react';

const OF = '#00AFF0';
const SURFACE = '#0a1628';
const HEADER_BG = 'linear-gradient(160deg, #041828 0%, #0a2840 55%, #0d3550 100%)';
const SUBMIT_AD_CLICKS_DISPLAY_OFFSET = 40_000;

function useAdClickStats(pollMs = 60_000) {
  const [last30dAdClicks, setLast30dAdClicks] = useState<number | null>(null);

  useEffect(() => {
    const fetchStats = () => {
      fetch('/api/advertise-stats', { cache: 'no-store' })
        .then((r) => r.json())
        .then((d) => {
          if (typeof d.last30dClientClicks === 'number') setLast30dAdClicks(d.last30dClientClicks);
        })
        .catch(() => {});
    };
    fetchStats();
    const id = setInterval(fetchStats, pollMs);
    return () => clearInterval(id);
  }, [pollMs]);

  return { last30dAdClicks };
}

export default function SubmitPartnershipStats() {
  const { last30dAdClicks } = useAdClickStats();
  const displayedAdClicks =
    last30dAdClicks != null ? Math.max(0, last30dAdClicks - SUBMIT_AD_CLICKS_DISPLAY_OFFSET) : null;

  return (
    <section
      className="overflow-hidden rounded-2xl border border-[#00AFF0]/30 shadow-[0_16px_40px_-20px_rgba(0,40,80,0.55)]"
      style={{ backgroundColor: SURFACE }}
    >
      <div style={{ background: HEADER_BG }}>
        <div className="px-3 py-3 sm:px-6 sm:py-4 border-b border-white/[0.08]">
          <div className="flex items-center justify-center gap-2 sm:gap-2.5 px-1">
            <p className="text-center text-[10px] sm:text-xs font-semibold leading-snug text-white/45 max-w-md">
              Total traffic delivered to Creators listed on Erogram the last 30 days
            </p>
            <svg className="flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6" viewBox="0 0 24 24" fill={OF} aria-hidden="true">
              <path d="M24 4.003h-4.015c-3.45 0-5.3.197-6.748 1.957a7.996 7.996 0 1 0 2.103 9.211c3.182-.231 5.39-2.134 6.085-5.173c0 0-2.399.585-4.43 0c4.018-.777 6.333-3.037 7.005-5.995M5.61 11.999A2.391 2.391 0 0 1 9.28 9.97a2.966 2.966 0 0 1 2.998-2.528h.008c-.92 1.778-1.407 3.352-1.998 5.263A2.392 2.392 0 0 1 5.61 12Zm2.386-7.996a7.996 7.996 0 1 0 7.996 7.996a7.996 7.996 0 0 0-7.996-7.996m0 10.394A2.399 2.399 0 1 1 10.395 12a2.396 2.396 0 0 1-2.399 2.398Z" />
            </svg>
          </div>
        </div>
        <div className="px-3 py-4 sm:py-6 text-center">
          <div className="flex flex-wrap items-baseline justify-center gap-x-2 gap-y-1">
            <p className="text-3xl sm:text-5xl md:text-6xl font-black tabular-nums leading-none" style={{ color: OF }}>
              {displayedAdClicks != null ? displayedAdClicks.toLocaleString() : '—'}
            </p>
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wide text-white/45 leading-tight">
              clicks last 7 days
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
