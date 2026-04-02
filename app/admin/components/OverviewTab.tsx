'use client';

import { getLiveStats } from '@/lib/actions/adminStats';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshCw } from 'lucide-react';

/* ─── Types ─── */
type TrendPoint = { date: string; value: number };
type Metric = { last24h?: number; lifetime?: number; trend30d?: TrendPoint[] };
type MonitoringAlert = { level: 'critical' | 'warning' | 'info' | 'ok'; title: string; description: string; actionUrl?: string };
type RecentSale = {
  _id: string;
  type: 'subscription' | 'group_boost' | 'bot_boost';
  label: string;
  plan: string | null;
  paymentMethod: string;
  stars: number;
  usd: number;
  createdAt: string;
  buyer: {
    username: string;
    firstName: string | null;
    country: string | null;
    city: string | null;
    photoUrl: string | null;
    telegramUsername: string | null;
  };
};
type AdvertiserEntry = { name: string; total: number; count: number };
export type DashboardData = {
  generatedAt?: string;
  headline?: {
    totalPageviewsLifetime?: number;
    earningsLifetimeUsd?: number;
    starsLifetime?: number;
    starsUsdRate?: number;
    manualRevenueLifetime?: number;
    totalEarningsLifetimeUsd?: number;
    totalRevenueThisMonth?: number;
    totalRevenuePrevMonth?: number;
    starsRevenueThisMonth?: number;
    manualRevenueThisMonth?: number;
  };
  kpis?: { paidSubs?: Metric; adClicks?: Metric; traffic?: Metric; users?: { total: number; free: number; newUsersTrend30d: TrendPoint[]; byCountry30d?: { country: string; count: number }[] }; engagement?: { bookmarks: number; folders: number }; publishing?: { groupsTrend30d: TrendPoint[]; botsTrend30d: TrendPoint[]; scheduledCount?: number; nextScheduled?: { name: string; date: string } | null; lastScheduled?: { date: string } | null } };
  pending?: { groups: number; bots: number; reviews: number; reports: number; total: number };
  recentSales?: RecentSale[];
  salesSummary?: { count: number; totalStars: number; totalUsd: number; last24hCount: number; last24hUsd: number };
  earningsByCategory?: { subscriptions: number; groups: number; bots: number; advertisers: AdvertiserEntry[] };
  monitoring?: { dbLatencyMs: number; alerts: MonitoringAlert[] };
};

interface Props {
  data: DashboardData | null;
  loading: boolean;
  onRefresh: () => void | Promise<void>;
}

/* ─── Utils ─── */
const fmtNum = (v: number) => {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return String(Math.round(v) || 0);
};
const fmtFullNum = (v: number) => new Intl.NumberFormat('en-US').format(Math.round(v || 0));
const fmtUsd = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(v || 0);
const fmtUsdWhole = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v || 0);
const fmtDate = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)   return 'just now';
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...(days > 365 ? { year: 'numeric' } : {}) });
};
const fmtShortDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

const FLAGS: Record<string, string> = {
  US:'🇺🇸',GB:'🇬🇧',DE:'🇩🇪',FR:'🇫🇷',ES:'🇪🇸',IT:'🇮🇹',BR:'🇧🇷',PT:'🇵🇹',NL:'🇳🇱',
  CA:'🇨🇦',AU:'🇦🇺',IN:'🇮🇳',JP:'🇯🇵',KR:'🇰🇷',RU:'🇷🇺',MX:'🇲🇽',AR:'🇦🇷',CO:'🇨🇴',
  CL:'🇨🇱',PL:'🇵🇱',SE:'🇸🇪',NO:'🇳🇴',DK:'🇩🇰',FI:'🇫🇮',AT:'🇦🇹',CH:'🇨🇭',UA:'🇺🇦',
  TR:'🇹🇷',SA:'🇸🇦',AE:'🇦🇪',SG:'🇸🇬',PH:'🇵🇭',TH:'🇹🇭',ID:'🇮🇩',VN:'🇻🇳',CN:'🇨🇳',
  BE:'🇧🇪',IE:'🇮🇪',ZA:'🇿🇦',NG:'🇳🇬',EG:'🇪🇬',HK:'🇭🇰',TW:'🇹🇼',RO:'🇷🇴',CZ:'🇨🇿',
};
const flag = (c: string | null) => c ? (FLAGS[c.toUpperCase()] ?? '🌍') : '🌍';

/* ─── Area Chart ─── */
function AreaChart({ points, color, label }: { points: TrendPoint[]; color: string; label: string }) {
  const [hover, setHover] = useState<number | null>(null);

  if (!points?.length) return <div className="h-16 flex items-center justify-center text-xs text-white/20">No data</div>;

  const W = 400, H = 64, PAD = 2;
  const vals  = points.map(p => p.value);
  const max   = Math.max(...vals, 1);
  const step  = (W - PAD * 2) / Math.max(points.length - 1, 1);
  const pts   = points.map((p, i) => ({ x: PAD + i * step, y: PAD + (1 - p.value / max) * (H - PAD * 2) }));
  const line  = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const area  = `${line} L${pts[pts.length - 1].x},${H} L${pts[0].x},${H} Z`;
  const axIdx = [0, Math.floor(points.length / 2), points.length - 1];

  return (
    <div>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 56 }} onMouseLeave={() => setHover(null)}>
          <defs>
            <linearGradient id={`g-${label}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.25" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill={`url(#g-${label})`} />
          <path d={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          {pts.map((p, i) => (
            <rect key={i} x={p.x - step / 2} y={0} width={step} height={H} fill="transparent"
              onMouseEnter={() => setHover(i)} onClick={() => setHover(i)} style={{ cursor: 'pointer' }} />
          ))}
          {hover !== null && pts[hover] && (
            <>
              <line x1={pts[hover].x} y1={0} x2={pts[hover].x} y2={H} stroke={color} strokeWidth="1" strokeDasharray="3,3" opacity="0.3" />
              <circle cx={pts[hover].x} cy={pts[hover].y} r="3.5" fill="#141414" stroke={color} strokeWidth="1.5" />
            </>
          )}
        </svg>
        {hover !== null && points[hover] && (() => {
          const pct = hover / Math.max(points.length - 1, 1);
          return (
            <div
              className="absolute -top-8 pointer-events-none z-10 bg-[#1e1e1e] border border-white/10 text-white text-[11px] font-semibold px-2 py-1 rounded-md shadow-lg whitespace-nowrap"
              style={{ left: `${pct * 100}%`, transform: `translateX(-${pct * 100}%)` }}
            >
              {fmtShortDate(points[hover].date)}: <span className="font-bold">{fmtNum(points[hover].value)}</span>
            </div>
          );
        })()}
      </div>
      <div className="flex justify-between mt-1">
        {axIdx.map(i => <span key={i} className="text-[10px] text-white/25">{fmtShortDate(points[i].date)}</span>)}
      </div>
    </div>
  );
}

/* ─── Dual Area Chart ─── */
function DualAreaChart({ free: allNew, paid }: { free: TrendPoint[]; paid: TrendPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const [showFree, setShowFree] = useState(true);
  const [showPaid, setShowPaid] = useState(true);

  const dates = allNew.length ? allNew.map(p => p.date) : paid.map(p => p.date);
  if (!dates.length) return <div className="h-16 flex items-center justify-center text-xs text-white/20">No data</div>;

  const allMap  = Object.fromEntries(allNew.map(p => [p.date, p.value]));
  const paidMap = Object.fromEntries(paid.map(p => [p.date, p.value]));
  const combined = dates.map(d => {
    const total  = allMap[d] ?? 0;
    const paidV  = paidMap[d] ?? 0;
    return { date: d, free: Math.max(0, total - paidV), paid: paidV };
  });

  const W = 400, H = 64, PAD = 2;
  const maxVal = Math.max(
    ...combined.map(p => {
      let v = 0;
      if (showFree) v = Math.max(v, p.free);
      if (showPaid) v = Math.max(v, p.paid);
      return v;
    }),
    1
  );
  const step = (W - PAD * 2) / Math.max(combined.length - 1, 1);
  const yOf  = (v: number) => PAD + (1 - v / maxVal) * (H - PAD * 2);

  const freePts = combined.map((p, i) => ({ x: PAD + i * step, y: yOf(p.free) }));
  const paidPts = combined.map((p, i) => ({ x: PAD + i * step, y: yOf(p.paid) }));

  const linePath = (pts: {x:number;y:number}[]) => pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaPath = (pts: {x:number;y:number}[], line: string) =>
    `${line} L${pts[pts.length-1].x},${H} L${pts[0].x},${H} Z`;

  const freeLine = linePath(freePts);
  const paidLine = linePath(paidPts);
  const axIdx = [0, Math.floor(combined.length / 2), combined.length - 1];
  const hoverX = hover !== null ? freePts[hover]?.x : null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <button
          onClick={() => { if (showFree || !showPaid) setShowFree(!showFree); if (!showFree && !showPaid) setShowPaid(true); }}
          className={`flex items-center gap-1 text-[10px] font-semibold rounded px-2 py-0.5 transition-colors ${showFree ? 'bg-sky-500/15 text-sky-400 border border-sky-500/20' : 'bg-white/5 text-white/30 border border-white/5 line-through'}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full inline-block ${showFree ? 'bg-sky-400' : 'bg-white/20'}`} />Free
        </button>
        <button
          onClick={() => { if (showPaid || !showFree) setShowPaid(!showPaid); if (!showPaid && !showFree) setShowFree(true); }}
          className={`flex items-center gap-1 text-[10px] font-semibold rounded px-2 py-0.5 transition-colors ${showPaid ? 'bg-violet-500/15 text-violet-400 border border-violet-500/20' : 'bg-white/5 text-white/30 border border-white/5 line-through'}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full inline-block ${showPaid ? 'bg-violet-400' : 'bg-white/20'}`} />Paid
        </button>
      </div>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 56 }} onMouseLeave={() => setHover(null)}>
          <defs>
            <linearGradient id="g-free" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="g-paid" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
            </linearGradient>
          </defs>
          {showFree && <>
            <path d={areaPath(freePts, freeLine)} fill="url(#g-free)" />
            <path d={freeLine} fill="none" stroke="#0ea5e9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </>}
          {showPaid && <>
            <path d={areaPath(paidPts, paidLine)} fill="url(#g-paid)" />
            <path d={paidLine} fill="none" stroke="#7c3aed" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </>}
          {combined.map((_, i) => (
            <rect key={i} x={freePts[i].x - step/2} y={0} width={step} height={H}
              fill="transparent" onMouseEnter={() => setHover(i)} onClick={() => setHover(i)} style={{ cursor: 'pointer' }} />
          ))}
          {hover !== null && hoverX !== null && (
            <>
              <line x1={hoverX} y1={0} x2={hoverX} y2={H} stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="3,3" />
              {showFree && <circle cx={freePts[hover].x} cy={freePts[hover].y} r="3.5" fill="#141414" stroke="#0ea5e9" strokeWidth="1.5" />}
              {showPaid && <circle cx={paidPts[hover].x} cy={paidPts[hover].y} r="3.5" fill="#141414" stroke="#7c3aed" strokeWidth="1.5" />}
            </>
          )}
        </svg>
        {hover !== null && combined[hover] && (() => {
          const pct = hover / Math.max(combined.length - 1, 1);
          return (
            <div
              className="absolute -top-8 pointer-events-none z-10 bg-[#1e1e1e] border border-white/10 text-white text-[11px] font-semibold px-2 py-1 rounded-md shadow-lg whitespace-nowrap"
              style={{ left: `${pct * 100}%`, transform: `translateX(-${pct * 100}%)` }}
            >
              {fmtShortDate(combined[hover].date)}
              {showFree && <>{' '}<span className="text-sky-400">Free {fmtNum(combined[hover].free)}</span></>}
              {showPaid && <>{' '}<span className="text-violet-400">Paid {fmtNum(combined[hover].paid)}</span></>}
            </div>
          );
        })()}
      </div>
      <div className="flex justify-between mt-1">
        {axIdx.map(i => <span key={i} className="text-[10px] text-white/25">{fmtShortDate(combined[i].date)}</span>)}
      </div>
    </div>
  );
}

/* ─── Dual Series Chart (two independent series) ─── */
function DualSeriesChart({ series1, series2, label1, label2, color1, color2 }: {
  series1: TrendPoint[]; series2: TrendPoint[];
  label1: string; label2: string;
  color1: string; color2: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const [show1, setShow1] = useState(true);
  const [show2, setShow2] = useState(true);

  const dates = series1.length ? series1.map(p => p.date) : series2.map(p => p.date);
  if (!dates.length) return <div className="h-16 flex items-center justify-center text-xs text-white/20">No data</div>;

  const map1 = Object.fromEntries(series1.map(p => [p.date, p.value]));
  const map2 = Object.fromEntries(series2.map(p => [p.date, p.value]));
  const combined = dates.map(d => ({ date: d, v1: map1[d] ?? 0, v2: map2[d] ?? 0 }));

  const W = 400, H = 64, PAD = 2;
  const maxVal = Math.max(
    ...combined.map(p => {
      let v = 0;
      if (show1) v = Math.max(v, p.v1);
      if (show2) v = Math.max(v, p.v2);
      return v;
    }),
    1
  );
  const step = (W - PAD * 2) / Math.max(combined.length - 1, 1);
  const yOf = (v: number) => PAD + (1 - v / maxVal) * (H - PAD * 2);

  const pts1 = combined.map((p, i) => ({ x: PAD + i * step, y: yOf(p.v1) }));
  const pts2 = combined.map((p, i) => ({ x: PAD + i * step, y: yOf(p.v2) }));

  const linePath = (pts: {x:number;y:number}[]) => pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaPath = (pts: {x:number;y:number}[], line: string) =>
    `${line} L${pts[pts.length-1].x},${H} L${pts[0].x},${H} Z`;

  const line1 = linePath(pts1);
  const line2 = linePath(pts2);
  const axIdx = [0, Math.floor(combined.length / 2), combined.length - 1];

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <button
          onClick={() => { if (show1 || !show2) setShow1(!show1); if (!show1 && !show2) setShow2(true); }}
          className={`flex items-center gap-1 text-[10px] font-semibold rounded px-2 py-0.5 transition-colors ${show1 ? `bg-[${color1}]/15 border` : 'bg-white/5 text-white/30 border border-white/5 line-through'}`}
          style={show1 ? { background: `${color1}15`, color: color1, borderColor: `${color1}33` } : undefined}
        >
          <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: show1 ? color1 : 'rgba(255,255,255,0.2)' }} />{label1}
        </button>
        <button
          onClick={() => { if (show2 || !show1) setShow2(!show2); if (!show2 && !show1) setShow1(true); }}
          className={`flex items-center gap-1 text-[10px] font-semibold rounded px-2 py-0.5 transition-colors ${show2 ? `border` : 'bg-white/5 text-white/30 border border-white/5 line-through'}`}
          style={show2 ? { background: `${color2}15`, color: color2, borderColor: `${color2}33` } : undefined}
        >
          <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: show2 ? color2 : 'rgba(255,255,255,0.2)' }} />{label2}
        </button>
      </div>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 56 }} onMouseLeave={() => setHover(null)}>
          <defs>
            <linearGradient id={`g-ds-1`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color1} stopOpacity="0.2" />
              <stop offset="100%" stopColor={color1} stopOpacity="0" />
            </linearGradient>
            <linearGradient id={`g-ds-2`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color2} stopOpacity="0.2" />
              <stop offset="100%" stopColor={color2} stopOpacity="0" />
            </linearGradient>
          </defs>
          {show1 && <>
            <path d={areaPath(pts1, line1)} fill="url(#g-ds-1)" />
            <path d={line1} fill="none" stroke={color1} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </>}
          {show2 && <>
            <path d={areaPath(pts2, line2)} fill="url(#g-ds-2)" />
            <path d={line2} fill="none" stroke={color2} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </>}
          {combined.map((_, i) => (
            <rect key={i} x={pts1[i].x - step/2} y={0} width={step} height={H}
              fill="transparent" onMouseEnter={() => setHover(i)} onClick={() => setHover(i)} style={{ cursor: 'pointer' }} />
          ))}
          {hover !== null && pts1[hover] && (
            <>
              <line x1={pts1[hover].x} y1={0} x2={pts1[hover].x} y2={H} stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="3,3" />
              {show1 && <circle cx={pts1[hover].x} cy={pts1[hover].y} r="3.5" fill="#141414" stroke={color1} strokeWidth="1.5" />}
              {show2 && <circle cx={pts2[hover].x} cy={pts2[hover].y} r="3.5" fill="#141414" stroke={color2} strokeWidth="1.5" />}
            </>
          )}
        </svg>
        {hover !== null && combined[hover] && (() => {
          const pct = hover / Math.max(combined.length - 1, 1);
          return (
            <div
              className="absolute -top-8 pointer-events-none z-10 bg-[#1e1e1e] border border-white/10 text-white text-[11px] font-semibold px-2 py-1 rounded-md shadow-lg whitespace-nowrap"
              style={{ left: `${pct * 100}%`, transform: `translateX(-${pct * 100}%)` }}
            >
              {fmtShortDate(combined[hover].date)}
              {show1 && <>{' '}<span style={{ color: color1 }}>{label1} {fmtNum(combined[hover].v1)}</span></>}
              {show2 && <>{' '}<span style={{ color: color2 }}>{label2} {fmtNum(combined[hover].v2)}</span></>}
            </div>
          );
        })()}
      </div>
      <div className="flex justify-between mt-1">
        {axIdx.map(i => <span key={i} className="text-[10px] text-white/25">{fmtShortDate(combined[i].date)}</span>)}
      </div>
    </div>
  );
}

/* ─── Donut Chart ─── */
interface Slice { label: string; value: number; color: string }

const PIE_COLORS = ['#7c3aed', '#0284c7', '#0d9488', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'];

function DonutChart({ slices, format = 'usd', compact = false }: { slices: Slice[]; format?: 'usd' | 'number'; compact?: boolean }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const total = slices.reduce((s, x) => s + x.value, 0);
  if (total === 0) return <p className="text-sm text-white/25 text-center py-4">No data</p>;

  const SIZE = compact ? 80 : 112;
  const CX = SIZE / 2, CY = SIZE / 2;
  const R = compact ? 34 : 48, IR = compact ? 20 : 30;
  const toRad = (deg: number) => ((deg - 90) * Math.PI) / 180;

  let cursor = 0;
  const arcs = slices.filter(s => s.value > 0).map((s, idx) => {
    const pct   = s.value / total;
    const span  = pct * 360;
    const start = cursor;
    cursor += span;
    if (pct >= 0.9999) return { ...s, idx, pct, path: null };
    const s1 = toRad(start), e1 = toRad(start + span);
    const lg = span > 180 ? 1 : 0;
    const rr = hovered === idx ? R + 3 : R;
    const ir = hovered === idx ? IR - 2 : IR;
    const path = [
      `M${CX + rr * Math.cos(s1)},${CY + rr * Math.sin(s1)}`,
      `A${rr},${rr} 0 ${lg},1 ${CX + rr * Math.cos(e1)},${CY + rr * Math.sin(e1)}`,
      `L${CX + ir * Math.cos(e1)},${CY + ir * Math.sin(e1)}`,
      `A${ir},${ir} 0 ${lg},0 ${CX + ir * Math.cos(s1)},${CY + ir * Math.sin(s1)}`,
      'Z',
    ].join(' ');
    return { ...s, idx, pct, path };
  });

  return (
    <div className={`flex items-start ${compact ? 'gap-3' : 'gap-4'}`}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="shrink-0">
        {arcs.map((a) =>
          a.path
            ? <path key={a.label} d={a.path} fill={a.color} onMouseEnter={() => setHovered(a.idx)} onMouseLeave={() => setHovered(null)} style={{ cursor: 'pointer', transition: 'd 150ms' }} />
            : <circle key={a.label} cx={CX} cy={CY} r={R} fill={a.color} />
        )}
        <circle cx={CX} cy={CY} r={IR} fill="#141414" />
        <text x={CX} y={CY + 3} textAnchor="middle" fontSize={compact ? '9' : '11'} fill="#f0f0f0" fontWeight="700">
          {format === 'usd'
            ? (total >= 1000 ? `$${(total / 1000).toFixed(1)}K` : `$${Math.round(total)}`)
            : fmtNum(total)}
        </text>
      </svg>
      <div className={`flex flex-col ${compact ? 'gap-0.5' : 'gap-1.5'} flex-1 ${compact ? '' : 'pt-1'}`}>
        {slices.filter(s => s.value > 0).map((s, i) => (
          <div key={s.label}
            className={`flex items-center justify-between gap-2 rounded-md ${compact ? 'px-1.5 py-0.5' : 'px-2 py-1'} transition-colors ${hovered === i ? 'bg-white/[0.05]' : ''}`}
            onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
            <div className="flex items-center gap-1.5 min-w-0">
              <div className={`${compact ? 'w-2 h-2' : 'w-2.5 h-2.5'} rounded-sm shrink-0`} style={{ background: s.color }} />
              <span className={`${compact ? 'text-[11px]' : 'text-xs'} text-white/60 truncate`}>{s.label}</span>
            </div>
            <div className="text-right shrink-0">
              <span className={`${compact ? 'text-[11px]' : 'text-xs'} font-bold text-white/90`}>{format === 'usd' ? fmtUsd(s.value) : fmtNum(s.value)}</span>
              <span className={`${compact ? 'text-[9px]' : 'text-[10px]'} text-white/30 ml-1`}>{Math.round((s.value / total) * 100)}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Stat Card ─── */
function StatCard({ label, value, sub, accent, live }: { label: string; value: string; sub: string; accent?: string; live?: boolean }) {
  return (
    <div className="bg-[#141414] border border-white/[0.07] rounded-xl px-4 py-3.5">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-semibold text-white/35 uppercase tracking-[0.12em]">{label}</p>
        {live && (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
            </span>
            LIVE
          </span>
        )}
        {accent && !live && <div className="w-1.5 h-1.5 rounded-full" style={{ background: accent }} />}
      </div>
      <p className="text-[22px] font-bold text-white leading-none tracking-tight tabular-nums">{value}</p>
      <p className="text-[11px] mt-1.5 text-white/35">{sub}</p>
    </div>
  );
}

const TYPE_META = {
  subscription: { dot: '#a78bfa', label: 'Premium', bg: 'rgba(124,58,237,0.12)', tx: '#c4b5fd' },
  group_boost:  { dot: '#38bdf8', label: 'Group',   bg: 'rgba(2,132,199,0.12)',  tx: '#7dd3fc' },
  bot_boost:    { dot: '#2dd4bf', label: 'Bot',      bg: 'rgba(13,148,136,0.12)', tx: '#5eead4' },
};
const PLAN_LABEL: Record<string, string> = { monthly:'1 Month', quarterly:'3 Months', yearly:'1 Year', lifetime:'Lifetime' };

/* ─── Live Stats Hook ─── */
function useLiveStats(initialPageviews: number) {
  const [totalPageviews, setTotalPageviews] = useState(initialPageviews);
  const [activeVisitors, setActiveVisitors] = useState<number | null>(null);
  const prevInitial = useRef(initialPageviews);

  useEffect(() => {
    if (initialPageviews && initialPageviews !== prevInitial.current) {
      setTotalPageviews(initialPageviews);
      prevInitial.current = initialPageviews;
    }
  }, [initialPageviews]);

  const poll = useCallback(async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) return;
      const data = await getLiveStats(token);
      if (data.totalPageviews) setTotalPageviews(data.totalPageviews);
      if (data.activeVisitors != null) setActiveVisitors(data.activeVisitors);
    } catch {}
  }, []);

  useEffect(() => {
    poll();
    const id = setInterval(poll, 15_000);
    return () => clearInterval(id);
  }, [poll]);

  return { totalPageviews, activeVisitors };
}

/* ─── Card shell ─── */
function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-[#141414] border border-white/[0.07] rounded-xl overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

/* ─── Section header ─── */
function SectionHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06]">
      <p className="text-[12px] font-semibold text-white/70">{title}</p>
      {right}
    </div>
  );
}

/* ─── Main ─── */
export default function OverviewTab({ data, loading, onRefresh }: Props) {
  const h       = data?.headline        ?? {};
  const kpis    = data?.kpis            ?? {};
  const pending = data?.pending         ?? { groups:0, bots:0, reviews:0, reports:0, total:0 };
  const sales   = data?.recentSales     ?? [];
  const summary = data?.salesSummary    ?? { count:0, totalStars:0, totalUsd:0, last24hCount:0, last24hUsd:0 };
  const earn    = data?.earningsByCategory ?? { subscriptions:0, groups:0, bots:0, advertisers:[] };
  const mon     = data?.monitoring       ?? { dbLatencyMs:0, alerts:[] };

  const { totalPageviews, activeVisitors } = useLiveStats(h.totalPageviewsLifetime || 0);

  const pieSlices: Slice[] = [];
  const starsTotal = (earn.subscriptions ?? 0) + (earn.groups ?? 0);
  if (starsTotal > 0)  pieSlices.push({ label: 'Stars Revenue',  value: starsTotal,    color: PIE_COLORS[0] });
  if (earn.bots > 0)   pieSlices.push({ label: 'Bot Boosts',     value: earn.bots,     color: PIE_COLORS[2] });
  (earn.advertisers || []).forEach((adv, i) => {
    if (adv.total > 0) pieSlices.push({ label: adv.name, value: adv.total, color: PIE_COLORS[(i + 3) % PIE_COLORS.length] });
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-7 h-7 rounded-full border-2 border-white/10 border-t-red-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[15px] font-semibold text-white">Overview</h1>
          {data?.generatedAt && <p className="text-[11px] text-white/30 mt-0.5">Updated {fmtDate(data.generatedAt)}</p>}
        </div>
        <button
          onClick={() => onRefresh()}
          className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[12px] font-medium text-white/50 hover:text-white hover:bg-white/[0.07] transition-colors"
        >
          <RefreshCw size={12} />
          Refresh
        </button>
      </div>

      {/* Stat cards — 6 cards, 2 col on mobile, 3 on md, 6 on lg */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <motion.div initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }} transition={{ delay:0 }}
          className="bg-emerald-950/40 border border-emerald-500/20 rounded-xl px-4 py-3.5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-semibold text-emerald-400/70 uppercase tracking-[0.12em]">Last Month</p>
            <span className="text-[10px] font-semibold rounded px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/15">PREV</span>
          </div>
          <p className="text-[24px] font-bold text-emerald-300 leading-none tracking-tight tabular-nums">{fmtUsdWhole(h.totalRevenuePrevMonth || 0)}</p>
          <p className="text-[11px] mt-1.5 text-emerald-400/50">Previous month total</p>
        </motion.div>
        <motion.div initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.03 }}
          className="bg-emerald-950/40 border border-emerald-500/20 rounded-xl px-4 py-3.5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-semibold text-emerald-400/70 uppercase tracking-[0.12em]">This Month</p>
            <span className="text-[10px] font-semibold rounded px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/15">MTD</span>
          </div>
          <p className="text-[24px] font-bold text-emerald-300 leading-none tracking-tight tabular-nums">{fmtUsdWhole(h.totalRevenueThisMonth || 0)}</p>
          <p className="text-[11px] mt-1.5 text-emerald-400/50">Total revenue this month</p>
        </motion.div>
        <motion.div initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.06 }}>
          <StatCard label="Page Views" value={fmtFullNum(totalPageviews)} sub="Lifetime total" live />
        </motion.div>
        <motion.div initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.09 }}>
          <StatCard label="Live Now" value={activeVisitors != null ? fmtFullNum(activeVisitors) : '—'} sub="Last 30 minutes" live />
        </motion.div>
        <motion.div initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.12 }}>
          <StatCard label="Sales 24h" value={fmtUsd(summary.last24hUsd)} sub={`${summary.last24hCount} transaction${summary.last24hCount !== 1 ? 's' : ''}`} accent="#ef4444" />
        </motion.div>
        <motion.div initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.15 }}>
          <StatCard label="Ad Clicks 24h" value={fmtNum(kpis.adClicks?.last24h || 0)} sub={`${fmtNum(kpis.adClicks?.lifetime || 0)} lifetime`} accent="#f59e0b" />
        </motion.div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          { title: 'Ad Clicks', points: kpis.adClicks?.trend30d ?? [], color: '#f59e0b', label: 'adclicks' },
          { title: 'Traffic',   points: kpis.traffic?.trend30d  ?? [], color: '#0284c7', label: 'traffic'  },
        ].map(c => (
          <motion.div key={c.label} initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.1 }}>
            <Card>
              <SectionHeader title={c.title} right={<span className="text-[10px] text-white/25">30d</span>} />
              <div className="p-3 pt-2">
                <AreaChart points={c.points} color={c.color} label={c.label} />
              </div>
            </Card>
          </motion.div>
        ))}
        <motion.div initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.14 }}>
          <Card>
            <SectionHeader title="New Users" right={<span className="text-[10px] text-white/25">30d</span>} />
            <div className="p-3 pt-2">
              <DualAreaChart free={kpis.users?.newUsersTrend30d ?? []} paid={kpis.paidSubs?.trend30d ?? []} />
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Groups/Bots Published */}
      <motion.div initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.16 }}>
        <Card>
          <SectionHeader title="Groups & Bots Published" right={<span className="text-[10px] text-white/25">30d</span>} />
          <div className="p-3 pt-2">
            <DualSeriesChart
              series1={kpis.publishing?.groupsTrend30d ?? []}
              series2={kpis.publishing?.botsTrend30d ?? []}
              label1="Groups" label2="Bots"
              color1="#f59e0b" color2="#7c3aed"
            />
            {/* Scheduled pipeline status */}
            <div className="mt-3 pt-3 border-t border-white/[0.06]">
              {(kpis.publishing?.scheduledCount ?? 0) > 0 ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500" />
                    </span>
                    <span className="text-[11px] text-white/50">
                      <span className="font-semibold text-amber-400">{kpis.publishing!.scheduledCount}</span> scheduled
                    </span>
                  </div>
                  <span className="text-[10px] text-white/30">
                    Next: {kpis.publishing!.nextScheduled ? fmtDate(kpis.publishing!.nextScheduled.date) : '—'}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500/60" />
                  <span className="text-[11px] text-red-400/70">No groups in scheduled pipeline</span>
                </div>
              )}
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Donuts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <motion.div initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.17 }}>
          <Card>
            <SectionHeader title="Earnings by Source" />
            <div className="p-3.5">
              <DonutChart slices={pieSlices} compact />
            </div>
          </Card>
        </motion.div>
        {(kpis.users?.byCountry30d?.length ?? 0) > 0 && (
          <motion.div initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.2 }}>
            <Card>
              <SectionHeader title="Users by Country" right={<span className="text-[10px] text-white/25">30 days</span>} />
              <div className="p-3.5">
                <DonutChart format="number" compact slices={
                  (kpis.users!.byCountry30d!).map((r, i) => ({
                    label: `${flag(r.country)} ${r.country}`,
                    value: r.count,
                    color: PIE_COLORS[i % PIE_COLORS.length],
                  }))
                } />
              </div>
            </Card>
          </motion.div>
        )}
      </div>

      {/* Bottom: Sales table + sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4 items-start">

        {/* Sales table */}
        <motion.div initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.12 }}>
          <Card>
            <SectionHeader
              title="All Sales"
              right={
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-white/30">{summary.count} total</span>
                  <span className="text-[12px] font-semibold text-emerald-400">{fmtUsd(summary.totalUsd)}</span>
                </div>
              }
            />
            {sales.length === 0 ? (
              <div className="py-10 text-center text-[12px] text-white/25">No sales recorded yet</div>
            ) : (
              <div className="overflow-x-auto max-h-[440px] overflow-y-auto custom-scrollbar">
                <table className="w-full">
                  <thead className="sticky top-0 z-10 bg-[#1a1a1a] border-b border-white/[0.06]">
                    <tr>
                      <th className="text-left text-[10px] font-semibold text-white/30 px-4 py-2 uppercase tracking-wide">Buyer</th>
                      <th className="text-left text-[10px] font-semibold text-white/30 px-3 py-2 uppercase tracking-wide">Type</th>
                      <th className="text-left text-[10px] font-semibold text-white/30 px-3 py-2 uppercase tracking-wide">Plan</th>
                      <th className="text-right text-[10px] font-semibold text-white/30 px-4 py-2 uppercase tracking-wide">Amount</th>
                      <th className="text-right text-[10px] font-semibold text-white/30 px-4 py-2 uppercase tracking-wide">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {sales.map((s) => {
                      const meta = TYPE_META[s.type] ?? TYPE_META.subscription;
                      const name = s.buyer.firstName || s.buyer.username;
                      return (
                        <tr key={s._id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-2.5">
                              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-red-600 to-red-400 flex items-center justify-center text-white text-[10px] font-bold shrink-0 overflow-hidden">
                                {s.buyer.photoUrl
                                  ? <img src={s.buyer.photoUrl} alt="" className="w-6 h-6 object-cover" />
                                  : (name ?? '?')[0].toUpperCase()}
                              </div>
                              <p className="text-[12px] font-medium text-white/80 truncate max-w-[90px]">
                                {flag(s.buyer.country)} {name}
                              </p>
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold" style={{ background: meta.bg, color: meta.tx }}>
                              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: meta.dot }} />
                              {meta.label}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-[12px] text-white/50 whitespace-nowrap">
                            {s.plan ? (PLAN_LABEL[s.plan] ?? s.plan) : (s.label ?? '—')}
                          </td>
                          <td className="px-4 py-2 text-right whitespace-nowrap">
                            <span className="text-[12px] font-semibold text-white/90">{fmtUsd(s.usd)}</span>
                            {s.stars > 0 && <p className="text-[9px] text-amber-400 leading-tight">{fmtNum(s.stars)} ⭐</p>}
                          </td>
                          <td className="px-4 py-2 text-right whitespace-nowrap">
                            <span className="text-[11px] text-white/30">{fmtDate(s.createdAt)}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </motion.div>

        {/* Right sidebar */}
        <div className="space-y-3">

          {/* Pending Queue */}
          <motion.div initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.22 }}>
            <Card>
              <SectionHeader
                title="Pending Queue"
                right={pending.total > 0 ? <span className="text-[10px] font-bold text-white bg-red-600 rounded-full px-2 py-0.5">{pending.total}</span> : undefined}
              />
              <div className="p-2 space-y-0.5">
                {([
                  { label:'Groups',  count:pending.groups,  href:'/admin/groups?tab=pending', color:'#f59e0b' },
                  { label:'Bots',    count:pending.bots,    href:'/admin/pending-bots',       color:'#7c3aed' },
                  { label:'Reviews', count:pending.reviews, href:'/admin/reviews',            color:'#0284c7' },
                  { label:'Reports', count:pending.reports, href:'/admin/reports',            color:'#ef4444' },
                ]).map(item => (
                  <Link key={item.label} href={item.href}
                    className="flex items-center justify-between rounded-md bg-white/[0.02] hover:bg-white/[0.05] px-3 py-2 transition-colors">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: item.color }} />
                      <span className="text-[12px] text-white/55">{item.label}</span>
                    </div>
                    <span className="text-[12px] font-semibold text-white/80">{item.count}</span>
                  </Link>
                ))}
              </div>
            </Card>
          </motion.div>

          {/* Revenue */}
          <motion.div initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.26 }}>
            <Card>
              <SectionHeader title="Revenue" />
              <div className="p-3 space-y-2">
                <div className="rounded-lg bg-emerald-950/40 border border-emerald-500/20 px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400/70">This Month</p>
                    <span className="text-[10px] font-semibold rounded px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/15">MTD</span>
                  </div>
                  <p className="text-[20px] font-bold text-emerald-300 leading-tight tabular-nums">{fmtUsdWhole(h.totalRevenueThisMonth || 0)}</p>
                </div>
                <div className="space-y-1.5 pt-0.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /><span className="text-[12px] text-white/50">Stars (all time)</span></div>
                    <span className="text-[12px] font-semibold text-white/80">{fmtUsd(h.earningsLifetimeUsd || 0)}</span>
                  </div>
                  {(h.manualRevenueLifetime ?? 0) > 0 && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-amber-500" /><span className="text-[12px] text-white/50">Advertisers (all time)</span></div>
                      <span className="text-[12px] font-semibold text-white/80">{fmtUsd(h.manualRevenueLifetime!)}</span>
                    </div>
                  )}
                  <div className="border-t border-white/[0.06] pt-2 flex items-center justify-between">
                    <span className="text-[12px] font-medium text-white/50">Total lifetime</span>
                    <span className="text-[12px] font-bold text-emerald-400">{fmtUsd(h.totalEarningsLifetimeUsd || h.earningsLifetimeUsd || 0)}</span>
                  </div>
                  {h.starsUsdRate ? <p className="text-[10px] text-white/25">${h.starsUsdRate.toFixed(4)} / star</p> : null}
                </div>
              </div>
            </Card>
          </motion.div>

          {/* System Alerts */}
          {mon.alerts.length > 0 && (
            <motion.div initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.3 }}>
              <Card>
                <SectionHeader title="System" right={<span className="text-[10px] font-mono text-white/25">{mon.dbLatencyMs}ms</span>} />
                <div className="p-2 space-y-1">
                  {mon.alerts.map((a, i) => {
                    const s = {
                      critical: { dot:'bg-red-500',     bg:'bg-red-500/10',     tx:'text-red-400'     },
                      warning:  { dot:'bg-amber-400',   bg:'bg-amber-500/10',   tx:'text-amber-400'   },
                      ok:       { dot:'bg-emerald-500', bg:'bg-emerald-500/10', tx:'text-emerald-400' },
                      info:     { dot:'bg-blue-500',    bg:'bg-blue-500/10',    tx:'text-blue-400'    },
                    }[a.level] ?? { dot:'bg-white/20', bg:'bg-white/5', tx:'text-white/50' };
                    return (
                      <div key={i} className={`flex gap-2.5 rounded-md p-2.5 ${s.bg}`}>
                        <div className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-[12px] font-semibold ${s.tx}`}>{a.title}</p>
                          <p className={`text-[11px] mt-0.5 ${s.tx} opacity-70`}>{a.description}</p>
                        </div>
                        {a.actionUrl && <Link href={a.actionUrl} className={`text-[11px] font-semibold shrink-0 ${s.tx} underline`}>View</Link>}
                      </div>
                    );
                  })}
                </div>
              </Card>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
