'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

function useAdClickStats(pollMs = 60_000) {
  const [views, setViews] = useState<number | null>(null);
  const [last30dAdClicks, setLast30dAdClicks] = useState<number | null>(null);

  useEffect(() => {
    const fetchStats = () => {
      fetch('/api/advertise-stats', { cache: 'no-store' })
        .then((r) => r.json())
        .then((d) => {
          if (typeof d.totalViews === 'number') setViews(d.totalViews);
          if (typeof d.last30dClientClicks === 'number') setLast30dAdClicks(d.last30dClientClicks);
        })
        .catch(() => {});
    };
    fetchStats();
    const id = setInterval(fetchStats, pollMs);
    return () => clearInterval(id);
  }, [pollMs]);

  return { views, last30dAdClicks };
}

export default function SubmitAdClicksStats() {
  const { views, last30dAdClicks } = useAdClickStats();

  return (
    <div className="flex justify-center w-full">
      <div
        className="w-full max-w-xl sm:max-w-2xl rounded-2xl bg-white overflow-hidden border border-[#00AFF0]/30 shadow-[0_16px_40px_-20px_rgba(0,40,80,0.55)]"
      >
        <div className="border-b border-[#00AFF0]/25">
          <div className="w-full overflow-hidden bg-black">
            <Image
              src="/assets/erogram-discovery-hub-banner.webp"
              alt=""
              width={1024}
              height={225}
              className="w-full h-auto block"
            />
          </div>
          <div
            className="px-3 py-2.5 sm:px-6 sm:py-4"
            style={{ background: 'linear-gradient(160deg, #041828 0%, #0a2840 55%, #0d3550 100%)' }}
          >
            <p className="text-center text-base sm:text-lg md:text-xl lg:text-2xl font-black uppercase tracking-wide text-[#00AFF0] leading-snug px-1">
              AD CLICKS THE LAST 30 DAYS.
            </p>
            <p className="text-center text-[9px] sm:text-[10px] text-white/40 mt-1.5 px-2 leading-snug">
              Total traffic delivered to Creators listed on Erogram the last 30 days
            </p>
          </div>
        </div>
        <div className="px-3 py-4 sm:py-8 text-center bg-gradient-to-br from-[#e8f8ff] via-white to-[#f0faff]">
          <div className="flex flex-wrap items-baseline justify-center gap-x-2 gap-y-1">
            <p className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tabular-nums text-black leading-none">
              {last30dAdClicks != null ? last30dAdClicks.toLocaleString() : '—'}
            </p>
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wide text-black/40 leading-tight">
              clicks last 30 days
            </span>
          </div>
        </div>
        <div className="flex items-center justify-center border-t border-[#00AFF0]/15 px-3 py-2 sm:py-3">
          <div className="flex flex-col items-center justify-center text-center min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-black/45 mb-0.5">Page views</span>
            <span className="text-lg sm:text-xl font-black tabular-nums text-[#00AFF0] leading-none">
              {views != null ? views.toLocaleString() : '—'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
