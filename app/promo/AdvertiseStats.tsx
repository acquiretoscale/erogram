'use client';

import { useEffect, useState, useRef, useCallback, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ClickSource { source: string; clicks: number }
interface StatsData {
  totalViews: number;
  last30dClientClicks: number;
  activeVisitors?: number;
  clickBreakdown?: ClickSource[];
}

const POLL_INTERVAL = 60_000;

function useCountUp(target: number, duration = 2000, start = false) {
  const [count, setCount] = useState(0);
  const ref = useRef<number>(0);
  const highWater = useRef(0);
  const displayed = useRef(0);

  useEffect(() => {
    const next = Math.max(highWater.current, target);
    highWater.current = next;

    if (!start) {
      displayed.current = next;
      setCount(next);
      return;
    }

    if (next <= displayed.current) return;

    const from = displayed.current;
    const startTime = performance.now();
    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = Math.round(from + eased * (next - from));
      displayed.current = value;
      setCount(value);
      if (progress < 1) {
        ref.current = requestAnimationFrame(tick);
      } else {
        displayed.current = next;
        setCount(next);
      }
    }
    ref.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(ref.current);
  }, [target, duration, start]);

  return count;
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function LiveDot() {
  return (
    <span className="inline-flex items-center gap-1 shrink-0 text-[8px] font-bold uppercase tracking-wider text-[#4ade80]">
      <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e] animate-pulse" />
      Live
    </span>
  );
}

function StatCard({ label, value, ready, full, live, compact }: {
  label: ReactNode; value: number; ready: boolean; full?: boolean; live?: boolean; compact?: boolean;
}) {
  const animated = useCountUp(value, 2200, ready);

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {live && <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />}
        <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-white/80">{label}</span>
        <span className="text-sm sm:text-base font-black text-white tabular-nums">
          {full ? animated.toLocaleString() : fmt(animated)}
        </span>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-2.5 px-3 py-1.5 sm:px-4 border-b border-white/[0.06] sm:[&:nth-child(odd)]:border-r sm:[&:nth-child(odd)]:border-white/[0.06]"
      style={{ background: 'linear-gradient(90deg, rgba(34,197,94,0.14) 0%, rgba(255,255,255,0.02) 70%)' }}
    >
      <span className="font-black text-[1.05rem] sm:text-[1.15rem] leading-none tabular-nums shrink-0 min-w-[4.25rem] sm:min-w-[4.75rem] text-[#22c55e]">
        {full ? animated.toLocaleString() : fmt(animated)}
      </span>
      <p className="text-[11px] sm:text-[12px] leading-snug min-w-0 text-white/65 flex-1">{label}</p>
      {live && <LiveDot />}
    </div>
  );
}

function AdClicksRow({ value, ready }: { value: number; ready: boolean }) {
  const animated = useCountUp(value, 2400, ready);

  return (
    <div className="relative bg-white px-4 py-3 sm:px-5 sm:py-3.5 text-center border-b border-black">
      <div className="absolute top-1.5 right-2 sm:top-2 sm:right-3">
        <LiveDot />
      </div>
      <p className="text-3xl sm:text-4xl font-black text-black tabular-nums leading-none tracking-tight">
        {animated.toLocaleString()}
      </p>
      <p className="mt-1 text-xs sm:text-sm font-semibold text-black leading-snug">
        Total ad clicks served to our advertisers the last 30 days.
      </p>
    </div>
  );
}

export default function AdvertiseStats({
  onLiveAudience,
}: {
  onLiveAudience?: (d: { pageViews: number; activeVisitors: number }) => void;
}) {
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSticky, setShowSticky] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);

  const fetchStats = useCallback(() => {
    fetch('/api/advertise-stats', { cache: 'no-store' })
      .then(r => r.json())
      .then((d) => {
        const next = typeof d.last30dClientClicks === 'number' ? d.last30dClientClicks : 0;
        const totalViews = typeof d.totalViews === 'number' ? d.totalViews : 0;
        const activeVisitors = typeof d.activeVisitors === 'number' ? d.activeVisitors : 0;
        setData((prev) => ({
          totalViews,
          last30dClientClicks: prev ? Math.max(prev.last30dClientClicks, next) : next,
          clickBreakdown: Array.isArray(d.clickBreakdown) ? d.clickBreakdown : [],
          activeVisitors,
        }));
        onLiveAudience?.({ pageViews: totalViews, activeVisitors });
        setLoading(false);
      })
      .catch(() => {
        setData({ totalViews: 0, last30dClientClicks: 0, clickBreakdown: [], activeVisitors: 0 });
        setLoading(false);
      });
  }, [onLiveAudience]);

  useEffect(() => {
    fetchStats();
    const id = setInterval(fetchStats, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [fetchStats]);

  useEffect(() => {
    const el = statsRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => setShowSticky(!entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [data]);

  if (loading) {
    return (
      <div className="px-3 py-3 sm:px-4 space-y-2 animate-pulse">
        <div className="h-5 bg-white/10 rounded w-40" />
        <div className="h-4 bg-white/10 rounded w-full" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <>
      <AnimatePresence>
        {showSticky && (
          <motion.div
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -40, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed top-16 left-0 right-0 z-40 border-b border-[#22c55e]/30 bg-gradient-to-r from-[#04140c] via-[#0a2e1a] to-[#04140c] shadow-lg"
          >
            <div className="max-w-5xl mx-auto px-4 sm:px-8 py-2 flex items-center justify-center">
              <StatCard label="Total ad clicks · last 30 days" value={data.last30dClientClicks} ready full compact />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div ref={statsRef}>
        <AdClicksRow value={data.last30dClientClicks} ready={!loading} />
      </div>
    </>
  );
}
