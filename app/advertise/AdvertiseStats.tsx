'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TelegramGroup { name: string; memberCount: number }
interface ClickSource { source: string; clicks: number }
interface StatsData {
  totalViews: number;
  totalClicks: number;
  totalGroups: number;
  last24hClicks: number;
  clickBreakdown?: ClickSource[];
  telegramEcosystem?: { groups: TelegramGroup[]; totalSubscribers: number; groupCount: number } | null;
  activeVisitors?: number;
}

const POLL_INTERVAL = 60_000;

function useCountUp(target: number, duration = 2000, start = false) {
  const [count, setCount] = useState(0);
  const ref = useRef<number>(0);
  const prevTarget = useRef(target);

  useEffect(() => {
    if (!start) { setCount(target); return; }
    const from = prevTarget.current !== target ? prevTarget.current : 0;
    prevTarget.current = target;
    if (target === 0) { setCount(0); return; }

    const startTime = performance.now();
    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(from + eased * (target - from)));
      if (progress < 1) ref.current = requestAnimationFrame(tick);
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

function StatCard({ label, value, suffix, gradient, delay, ready, full, live, compact }: {
  label: string; value: number; suffix?: string; gradient: string; delay: number; ready: boolean; full?: boolean; live?: boolean; compact?: boolean;
}) {
  const animated = useCountUp(value, 2200, ready);

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {live && <span className="flex h-1.5 w-1.5 rounded-full bg-white animate-pulse shrink-0" />}
        <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-white/80">{label}</span>
        <span className="text-sm sm:text-base font-black text-white tabular-nums">
          {full ? animated.toLocaleString() : fmt(animated)}{suffix && <span className="text-xs text-white/70 ml-0.5">{suffix}</span>}
        </span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay }}
      className={`relative overflow-hidden rounded-2xl border border-white/10 p-6 sm:p-8 text-center ${gradient}`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none" />
      {live && (
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400/70">Live</span>
        </div>
      )}
      <p className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-white/60 mb-2">{label}</p>
      <p className="text-3xl sm:text-4xl font-black text-white tabular-nums">
        {full ? animated.toLocaleString() : fmt(animated)}{suffix && <span className="text-lg text-white/40 ml-1">{suffix}</span>}
      </p>
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
      .then((r) => r.json())
      .then((d) => {
        setData({
          totalViews: typeof d.totalViews === 'number' ? d.totalViews : 0,
          totalClicks: typeof d.totalClicks === 'number' ? d.totalClicks : 0,
          totalGroups: typeof d.totalGroups === 'number' ? d.totalGroups : 0,
          last24hClicks: typeof d.last24hClicks === 'number' ? d.last24hClicks : 0,
          clickBreakdown: Array.isArray(d.clickBreakdown) ? d.clickBreakdown : [],
          telegramEcosystem: d.telegramEcosystem ?? null,
          activeVisitors: typeof d.activeVisitors === 'number' ? d.activeVisitors : 0,
        });
        setLoading(false);
      })
      .catch(() => {
        setData({ totalViews: 0, totalClicks: 0, totalGroups: 0, last24hClicks: 0, clickBreakdown: [], activeVisitors: 0 });
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-16">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 animate-pulse">
            <div className="h-4 bg-white/10 rounded w-24 mx-auto mb-3" />
            <div className="h-10 bg-white/10 rounded w-20 mx-auto" />
          </div>
        ))}
      </div>
    );
  }

  if (!data) return null;
  const tg = data.telegramEcosystem;

  return (
    <>
      {/* Sticky floating bar */}
      <AnimatePresence>
        {showSticky && (
          <motion.div
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed top-0 left-0 right-0 z-50 border-b border-amber-600/40 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 shadow-lg shadow-amber-800/30"
          >
            <div className="max-w-5xl mx-auto px-4 sm:px-8 py-2.5 flex flex-wrap items-center justify-center gap-x-6 gap-y-1">
              <StatCard label="Total visits" value={data.totalViews} gradient="" delay={0} ready full live compact />
              <div className="hidden sm:block w-px h-5 bg-white/25" />
              <StatCard label="Clicks (24h)" value={data.last24hClicks} gradient="" delay={0} ready full live compact />
              {typeof data.activeVisitors === 'number' && data.activeVisitors > 0 && (
                <>
                  <div className="hidden sm:block w-px h-5 bg-white/25" />
                  <StatCard label="Active now" value={data.activeVisitors} gradient="" delay={0} ready full live compact />
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div ref={statsRef} className="space-y-8 mb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total visits" value={data.totalViews} gradient="bg-gradient-to-br from-blue-900/40 to-purple-900/30" delay={0.1} ready full live />
          <StatCard label="Clicks (24h)" value={data.last24hClicks} gradient="bg-gradient-to-br from-amber-900/40 to-orange-900/30" delay={0.15} ready full live />
          {typeof data.activeVisitors === 'number' && data.activeVisitors > 0 && (
            <StatCard label="Visitors (last 30 min)" value={data.activeVisitors} gradient="bg-gradient-to-br from-emerald-900/40 to-cyan-900/30" delay={0.21} ready full live />
          )}
          {tg && tg.totalSubscribers > 0 && (
            <StatCard label="Telegram subscribers" value={tg.totalSubscribers} suffix="+" gradient="bg-gradient-to-br from-emerald-900/40 to-teal-900/30" delay={0.24} ready />
          )}
        </div>

        {/* Click breakdown by source */}
        {data.clickBreakdown && data.clickBreakdown.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden"
          >
            <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-2 w-2 rounded-full bg-orange-400 animate-pulse" />
                <div>
                  <h3 className="font-bold text-white text-sm">Clicks by ad type (24h)</h3>
                  <p className="text-xs text-gray-500">Breakdown of clicks delivered to advertisers</p>
                </div>
              </div>
              <span className="text-sm font-bold text-orange-400 tabular-nums">{data.last24hClicks.toLocaleString()} total</span>
            </div>
            <div className="p-5 space-y-3">
              {data.clickBreakdown.map((item, i) => {
                const max = data.clickBreakdown![0].clicks || 1;
                const pct = Math.round((item.clicks / max) * 100);
                return (
                  <motion.div
                    key={item.source}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.35 + i * 0.05 }}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm text-white/80 font-medium">{item.source}</span>
                      <span className="text-sm text-white font-bold tabular-nums">{item.clicks.toLocaleString()}</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400"
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, delay: 0.4 + i * 0.05, ease: 'easeOut' }}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

      </div>
    </>
  );
}
