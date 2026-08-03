'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PROMO_BORDER, PROMO_SHADOW_LG } from './promoTheme';

interface ClickSource { source: string; clicks: number }
interface StatsData {
  totalViews: number;
  last30dClientClicks: number;
  activeVisitors?: number;
  clickBreakdown?: ClickSource[];
}

const POLL_INTERVAL = 5_000;

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

function StatCard({ label, value, gradient, delay, ready, full, live, compact }: {
  label: string; value: number; gradient: string; delay: number; ready: boolean; full?: boolean; live?: boolean; compact?: boolean;
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
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay }}
      className={`relative overflow-hidden p-4 sm:p-6 md:p-8 text-center hover:-translate-y-1 transition-all duration-300 ${gradient}`}
      style={{ border: '3px solid #000', boxShadow: '4px 4px 0px #000' }}
    >
      {live && (
        <div className="absolute top-2 right-2 sm:top-3 sm:right-3 flex items-center gap-1">
          <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-emerald-400/70">Live</span>
        </div>
      )}
      <p className="text-[10px] sm:text-xs md:text-sm font-semibold uppercase tracking-wider text-white/40 mb-1 sm:mb-2 leading-tight">{label}</p>
      <p className="text-2xl sm:text-3xl md:text-4xl font-black text-[#f5f5f5] tabular-nums">
        {full ? animated.toLocaleString() : fmt(animated)}
      </p>
    </motion.div>
  );
}

function AdClicksHero({ value, ready }: { value: number; ready: boolean }) {
  const animated = useCountUp(value, 2400, ready);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55 }}
      className="overflow-hidden bg-white mb-3 sm:mb-4"
      style={{ border: PROMO_BORDER, boxShadow: PROMO_SHADOW_LG }}
    >
      <div className="px-4 sm:px-6 py-4 sm:py-5 flex flex-wrap items-center gap-2 sm:gap-3" style={{ background: 'linear-gradient(160deg, #04140c 0%, #0a2e1a 60%, #064e3b 100%)', borderBottom: PROMO_BORDER }}>
        <div className="w-9 h-9 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 text-[#4ade80]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 3h4a2 2 0 012 2v4M10 14L21 3M5 21h14a2 2 0 002-2V7l-5 5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm sm:text-base font-black uppercase tracking-wide text-white">Total ad clicks served</h3>
          <p className="text-[10px] sm:text-xs text-white/45">Last 30 days · Erogram ad network</p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-[9px] sm:text-[10px] font-black px-2.5 py-1 uppercase tracking-wider shrink-0 text-[#4ade80] border border-[#22c55e]/30 bg-[#22c55e]/10">
          <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e] animate-pulse" />
          Live
        </span>
      </div>
      <div className="px-4 sm:px-6 py-7 sm:py-10 bg-gradient-to-br from-[#ecfdf5] via-white to-[#f0fdf4] text-center">
        <p className="text-5xl sm:text-6xl md:text-7xl font-black text-gray-900 tabular-nums leading-none tracking-tight">
          {animated.toLocaleString()}
        </p>
      </div>
    </motion.div>
  );
}

export default function AdvertiseStats() {
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSticky, setShowSticky] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);

  const fetchStats = useCallback(() => {
    fetch('/api/advertise-stats', { cache: 'no-store' })
      .then(r => r.json())
      .then((d) => {
        setData((prev) => {
          const next = typeof d.last30dClientClicks === 'number' ? d.last30dClientClicks : 0;
          return {
            totalViews: typeof d.totalViews === 'number' ? d.totalViews : 0,
            last30dClientClicks: prev ? Math.max(prev.last30dClientClicks, next) : next,
            clickBreakdown: Array.isArray(d.clickBreakdown) ? d.clickBreakdown : [],
            activeVisitors: typeof d.activeVisitors === 'number' ? d.activeVisitors : 0,
          };
        });
        setLoading(false);
      })
      .catch(() => {
        setData({ totalViews: 0, last30dClientClicks: 0, clickBreakdown: [], activeVisitors: 0 });
        setLoading(false);
      });
  }, []);

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
      <div className="mb-16 space-y-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-12 animate-pulse">
          <div className="h-4 bg-white/10 rounded w-48 mx-auto mb-4" />
          <div className="h-14 bg-white/10 rounded w-40 mx-auto" />
        </div>
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
              <StatCard label="Total ad clicks · last 30 days" value={data.last30dClientClicks} gradient="" delay={0} ready full compact />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div ref={statsRef} className="mb-16">
        <AdClicksHero value={data.last30dClientClicks} ready={!loading} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
          <StatCard label="Total page views" value={data.totalViews} gradient="bg-gradient-to-br from-[#04140c] via-[#0a2e1a] to-[#064e3b]" delay={0.1} ready full live />
          {typeof data.activeVisitors === 'number' && data.activeVisitors > 0 && (
            <StatCard label="People browsing Erogram right now" value={data.activeVisitors} gradient="bg-gradient-to-br from-[#0a2e1a] via-[#064e3b] to-[#04140c]" delay={0.21} ready full live />
          )}
        </div>
      </div>
    </>
  );
}
