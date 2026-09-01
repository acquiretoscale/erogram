'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import PartnershipStats from '@/app/partnership/PartnershipStats';

const OF_HEADER_BG = 'linear-gradient(160deg, #041828 0%, #0a2840 55%, #0d3550 100%)';
const OF_ACCENT = '#00AFF0';

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

export default function SubmitErogramReachBlock({
  aiNsfwCount,
  groupsAndBotsCount,
  totalUsers,
}: {
  aiNsfwCount: number;
  groupsAndBotsCount: number;
  totalUsers: number;
}) {
  const { views, last30dAdClicks } = useAdClickStats();

  return (
    <section className="overflow-hidden rounded-2xl border-2 border-[#00AFF0]/35 shadow-[0_16px_40px_-20px_rgba(0,40,80,0.55)]">
      <div className="border-b-2 border-[#0077B3]/40">
        <div className="w-full overflow-hidden bg-black">
          <Image
            src="/assets/erogram-discovery-hub-banner.webp"
            alt=""
            width={1024}
            height={225}
            className="w-full h-auto block"
            priority
          />
        </div>
        <div className="px-3 py-2.5 sm:px-6 sm:py-4" style={{ background: OF_HEADER_BG }}>
          <p className="text-center text-base sm:text-lg md:text-xl font-black uppercase tracking-wide leading-snug px-1" style={{ color: OF_ACCENT }}>
            AD CLICKS THE LAST 30 DAYS.
          </p>
          <p className="text-center text-[9px] sm:text-[10px] text-white/40 mt-1.5 px-2 leading-snug">
            Total traffic delivered to our partners and sponsors.
          </p>
        </div>
        <div className="px-3 py-4 sm:py-8 text-center bg-gradient-to-br from-[#f0f8ff] via-white to-[#e6f6ff]">
          <div className="flex flex-wrap items-baseline justify-center gap-x-2 gap-y-1">
            <p className="text-4xl sm:text-6xl md:text-7xl font-black tabular-nums text-[#0077B3] leading-none">
              {last30dAdClicks != null ? last30dAdClicks.toLocaleString() : '—'}
            </p>
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wide text-[#0077B3]/45 leading-tight">
              clicks last 30 days
            </span>
          </div>
        </div>
        <div className="flex items-center justify-center border-t border-[#00AFF0]/15 px-3 py-2 sm:py-3 bg-white">
          <div className="flex flex-col items-center justify-center text-center min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-0.5">Page views</span>
            <span className="text-lg sm:text-xl font-black tabular-nums leading-none" style={{ color: OF_ACCENT }}>
              {views != null ? views.toLocaleString() : '—'}
            </span>
          </div>
        </div>
      </div>

      <PartnershipStats
        aiNsfwCount={aiNsfwCount}
        groupsAndBotsCount={groupsAndBotsCount}
        totalUsers={totalUsers}
        variant="onlyfans"
        embedded
      />

      <div className="px-4 py-8 sm:py-10 border-t border-[#00AFF0]/20" style={{ background: OF_HEADER_BG }}>
        <h2 className="text-center px-2 leading-[0.92]">
          <span className="ainsfw-hero-title text-[clamp(1.35rem,6.8vw,3.5rem)] sm:text-5xl md:text-6xl">
            WE HAVE YOUR{' '}
            <span className="of-hero-customers">FANS.</span>
          </span>
        </h2>
      </div>
    </section>
  );
}
