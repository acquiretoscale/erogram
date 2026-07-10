'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ClickSource { source: string; clicks: number }
interface StatsData {
  totalViews: number;
  totalClicks: number;
  totalGroups: number;
  last24hClicks: number;
  clickBreakdown?: ClickSource[];
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
        {live && <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />}
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
        {full ? animated.toLocaleString() : fmt(animated)}{suffix && <span className="text-sm sm:text-lg text-white/40 ml-0.5 sm:ml-1">{suffix}</span>}
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
      .then(r => r.json())
      .then((d) => {
        setData({
          totalViews: typeof d.totalViews === 'number' ? d.totalViews : 0,
          totalClicks: typeof d.totalClicks === 'number' ? d.totalClicks : 0,
          totalGroups: typeof d.totalGroups === 'number' ? d.totalGroups : 0,
          last24hClicks: typeof d.last24hClicks === 'number' ? d.last24hClicks : 0,
          clickBreakdown: Array.isArray(d.clickBreakdown) ? d.clickBreakdown : [],
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

  return (
    <>
      {/* Sticky floating bar */}
      <AnimatePresence>
        {showSticky && (
          <motion.div
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -40, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed top-16 left-0 right-0 z-40 border-b border-[#0ea5e9]/40 bg-gradient-to-r from-[#0c2d48] via-[#0a3d62] to-[#0c2d48] shadow-lg shadow-sky-900/30"
          >
            <div className="max-w-5xl mx-auto px-4 sm:px-8 py-2 flex items-center justify-between gap-x-4">
              <div className="flex items-center gap-x-4 sm:gap-x-6 shrink-0">
                <StatCard label="Total visits" value={data.totalViews} gradient="" delay={0} ready full live compact />
                {typeof data.activeVisitors === 'number' && data.activeVisitors > 0 && (
                  <>
                    <div className="hidden sm:block w-px h-5 bg-white/25" />
                    <StatCard label="Active (30m)" value={data.activeVisitors} gradient="" delay={0} ready full live compact />
                  </>
                )}
              </div>
              <nav className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto scrollbar-none">
                <span className="shrink-0 text-[9px] font-black uppercase tracking-widest text-[#0ea5e9] mr-1 hidden lg:block">Media Kit</span>
                <a href="#audience-stats" className="whitespace-nowrap px-2 sm:px-2.5 py-1 rounded-md text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-white/70 hover:text-white hover:bg-white/10 transition-all">
                  Audience
                </a>
                <a href="#website-ads" className="whitespace-nowrap px-2 sm:px-2.5 py-1 rounded-md text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-white/70 hover:text-white hover:bg-white/10 transition-all">
                  Placements
                </a>
                <a href="#ad-pricing-list" className="whitespace-nowrap px-2 sm:px-2.5 py-1 rounded-md text-[9px] sm:text-[10px] font-bold uppercase tracking-wider bg-[#0ea5e9] text-white hover:bg-[#0ea5e9]/80 transition-all" style={{ border: '1.5px solid #000', boxShadow: '1.5px 1.5px 0px #000' }}>
                  Rates
                </a>
                <a href="#contact-form" className="whitespace-nowrap px-2 sm:px-2.5 py-1 rounded-md text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-white/70 hover:text-white hover:bg-white/10 transition-all">
                  Contact
                </a>
              </nav>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div ref={statsRef} className="space-y-8 mb-16">
        <div className={`grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-3`}>
          <StatCard label="Total visits" value={data.totalViews} gradient="bg-gradient-to-br from-sky-950/50 to-sky-900/40" delay={0.1} ready full live />
          {typeof data.activeVisitors === 'number' && data.activeVisitors > 0 && (
            <StatCard label="Active users (30 min)" value={data.activeVisitors} gradient="bg-gradient-to-br from-sky-900/40 to-sky-950/30" delay={0.21} ready full live />
          )}
          <StatCard label="Page views/mo" value={400000} suffix="+" gradient="bg-gradient-to-br from-sky-950/50 to-sky-900/40" delay={0.3} ready />
        </div>


      </div>
    </>
  );
}
