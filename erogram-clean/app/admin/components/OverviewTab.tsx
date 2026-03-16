'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useState } from 'react';

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
    starsRevenueThisMonth?: number;
    manualRevenueThisMonth?: number;
  };
  kpis?: { paidSubs?: Metric; adClicks?: Metric; traffic?: Metric; users?: { total: number; free: number; newUsersTrend30d: TrendPoint[]; byCountry30d?: { country: string; count: number }[] }; engagement?: { bookmarks: number; folders: number } };
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
const fmtUsd = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(v || 0);
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

/* ─── Interactive Area Chart ─── */
function AreaChart({ points, color, label }: { points: TrendPoint[]; color: string; label: string }) {
  const [hover, setHover] = useState<number | null>(null);

  if (!points?.length) return <div className="h-[88px] flex items-center justify-center text-xs text-gray-400">No data</div>;

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
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          style={{ height: 64 }}
          onMouseLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id={`g-${label}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.3" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill={`url(#g-${label})`} />
          <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          {/* Invisible rects per data point for hover */}
          {pts.map((p, i) => (
            <rect
              key={i}
              x={p.x - step / 2}
              y={0}
              width={step}
              height={H}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              onClick={() => setHover(i)}
              style={{ cursor: 'pointer' }}
            />
          ))}
          {/* Hover dot + line */}
          {hover !== null && pts[hover] && (
            <>
              <line x1={pts[hover].x} y1={0} x2={pts[hover].x} y2={H} stroke={color} strokeWidth="1" strokeDasharray="3,3" opacity="0.4" />
              <circle cx={pts[hover].x} cy={pts[hover].y} r="4" fill="white" stroke={color} strokeWidth="2" />
            </>
          )}
        </svg>
        {/* Tooltip */}
        {hover !== null && points[hover] && (
          <div
            className="absolute -top-10 pointer-events-none z-10 bg-gray-900 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg shadow-lg whitespace-nowrap"
            style={{ left: `${(hover / Math.max(points.length - 1, 1)) * 100}%`, transform: 'translateX(-50%)' }}
          >
            {fmtShortDate(points[hover].date)}: <span className="font-bold">{fmtNum(points[hover].value)}</span>
          </div>
        )}
      </div>
      <div className="flex justify-between mt-1.5">
        {axIdx.map(i => <span key={i} className="text-[10px] text-gray-400">{fmtShortDate(points[i].date)}</span>)}
      </div>
    </div>
  );
}

/* ─── Dual Area Chart (free vs paid users) with toggles ─── */
function DualAreaChart({ free: allNew, paid }: { free: TrendPoint[]; paid: TrendPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const [showFree, setShowFree] = useState(true);
  const [showPaid, setShowPaid] = useState(true);

  const dates = allNew.length ? allNew.map(p => p.date) : paid.map(p => p.date);
  if (!dates.length) return <div className="h-[88px] flex items-center justify-center text-xs text-gray-400">No data</div>;

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
          className={`flex items-center gap-1 text-[10px] font-semibold rounded-full px-2 py-0.5 transition-colors ${showFree ? 'bg-sky-100 text-sky-700' : 'bg-gray-100 text-gray-400 line-through'}`}
        >
          <span className={`w-2 h-2 rounded-full inline-block ${showFree ? 'bg-sky-500' : 'bg-gray-300'}`} />Free
        </button>
        <button
          onClick={() => { if (showPaid || !showFree) setShowPaid(!showPaid); if (!showPaid && !showFree) setShowFree(true); }}
          className={`flex items-center gap-1 text-[10px] font-semibold rounded-full px-2 py-0.5 transition-colors ${showPaid ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-400 line-through'}`}
        >
          <span className={`w-2 h-2 rounded-full inline-block ${showPaid ? 'bg-violet-500' : 'bg-gray-300'}`} />Paid
        </button>
      </div>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 64 }} onMouseLeave={() => setHover(null)}>
          <defs>
            <linearGradient id="g-free" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="g-paid" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
            </linearGradient>
          </defs>
          {showFree && <>
            <path d={areaPath(freePts, freeLine)} fill="url(#g-free)" />
            <path d={freeLine} fill="none" stroke="#0ea5e9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </>}
          {showPaid && <>
            <path d={areaPath(paidPts, paidLine)} fill="url(#g-paid)" />
            <path d={paidLine} fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </>}
          {combined.map((_, i) => (
            <rect key={i} x={freePts[i].x - step/2} y={0} width={step} height={H}
              fill="transparent" onMouseEnter={() => setHover(i)} onClick={() => setHover(i)} style={{ cursor: 'pointer' }} />
          ))}
          {hover !== null && hoverX !== null && (
            <>
              <line x1={hoverX} y1={0} x2={hoverX} y2={H} stroke="#6b7280" strokeWidth="1" strokeDasharray="3,3" opacity="0.4" />
              {showFree && <circle cx={freePts[hover].x} cy={freePts[hover].y} r="4" fill="white" stroke="#0ea5e9" strokeWidth="2" />}
              {showPaid && <circle cx={paidPts[hover].x} cy={paidPts[hover].y} r="4" fill="white" stroke="#7c3aed" strokeWidth="2" />}
            </>
          )}
        </svg>
        {hover !== null && combined[hover] && (
          <div
            className="absolute -top-10 pointer-events-none z-10 bg-gray-900 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg shadow-lg whitespace-nowrap"
            style={{ left: `${(hover / Math.max(combined.length - 1, 1)) * 100}%`, transform: 'translateX(-50%)' }}
          >
            {fmtShortDate(combined[hover].date)}
            {showFree && <>{' '}<span className="text-sky-300">Free {fmtNum(combined[hover].free)}</span></>}
            {showPaid && <>{' '}<span className="text-violet-300">Paid {fmtNum(combined[hover].paid)}</span></>}
          </div>
        )}
      </div>
      <div className="flex justify-between mt-1.5">
        {axIdx.map(i => <span key={i} className="text-[10px] text-gray-400">{fmtShortDate(combined[i].date)}</span>)}
      </div>
    </div>
  );
}

/* ─── Donut Chart ─── */
interface Slice { label: string; value: number; color: string }

const PIE_COLORS = ['#7c3aed', '#0284c7', '#0d9488', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'];

function DonutChart({ slices, format = 'usd' }: { slices: Slice[]; format?: 'usd' | 'number' }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const total = slices.reduce((s, x) => s + x.value, 0);
  if (total === 0) return <p className="text-sm text-gray-400 text-center py-4">No data</p>;

  const CX = 56, CY = 56, R = 48, IR = 30;
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
    const rr = hovered === idx ? R + 4 : R;
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
    <div className="flex items-start gap-4">
      <svg width="112" height="112" viewBox="0 0 112 112" className="shrink-0">
        {arcs.map((a) =>
          a.path
            ? <path key={a.label} d={a.path} fill={a.color} onMouseEnter={() => setHovered(a.idx)} onMouseLeave={() => setHovered(null)} style={{ cursor: 'pointer', transition: 'd 150ms' }} />
            : <circle key={a.label} cx={CX} cy={CY} r={R} fill={a.color} />
        )}
        <circle cx={CX} cy={CY} r={IR} fill="white" />
        <text x={CX} y={CY + 4} textAnchor="middle" fontSize="11" fill="#111827" fontWeight="700">
          {format === 'usd'
            ? (total >= 1000 ? `$${(total / 1000).toFixed(1)}K` : `$${Math.round(total)}`)
            : fmtNum(total)}
        </text>
      </svg>
      <div className="flex flex-col gap-1.5 flex-1 pt-1">
        {slices.filter(s => s.value > 0).map((s, i) => (
          <div key={s.label} className={`flex items-center justify-between gap-2 rounded-lg px-2 py-1 transition-colors ${hovered === i ? 'bg-gray-100' : ''}`} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: s.color }} />
              <span className="text-xs text-gray-700 truncate">{s.label}</span>
            </div>
            <div className="text-right shrink-0">
              <span className="text-xs font-bold text-gray-900">{format === 'usd' ? fmtUsd(s.value) : fmtNum(s.value)}</span>
              <span className="text-[10px] text-gray-400 ml-1">{Math.round((s.value / total) * 100)}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Stat Card ─── */
function StatCard({ label, value, sub, dot, subGreen }: { label: string; value: string; sub: string; dot: string; subGreen?: boolean }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3.5">
      <div className="flex items-center gap-2 mb-2.5">
        <div className="w-2 h-2 rounded-full" style={{ background: dot }} />
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">{label}</p>
      </div>
      <p className="text-[22px] font-bold text-gray-900 leading-none tracking-tight">{value}</p>
      <p className={`text-xs mt-1.5 font-semibold ${subGreen ? 'text-emerald-500' : 'text-gray-400'}`}>{sub}</p>
    </div>
  );
}

const TYPE_META = {
  subscription: { dot: '#7c3aed', label: 'Premium', bg: '#f5f3ff', tx: '#6d28d9' },
  group_boost:  { dot: '#0284c7', label: 'Group',   bg: '#f0f9ff', tx: '#0369a1' },
  bot_boost:    { dot: '#0d9488', label: 'Bot',      bg: '#f0fdfa', tx: '#0f766e' },
};
const PLAN_LABEL: Record<string, string> = { monthly:'1 Month', quarterly:'3 Months', yearly:'1 Year', lifetime:'Lifetime' };

/* ─── Main ─── */
export default function OverviewTab({ data, loading, onRefresh }: Props) {
  const h       = data?.headline        ?? {};
  const kpis    = data?.kpis            ?? {};
  const pending = data?.pending         ?? { groups:0, bots:0, reviews:0, reports:0, total:0 };
  const sales   = data?.recentSales     ?? [];
  const summary = data?.salesSummary    ?? { count:0, totalStars:0, totalUsd:0, last24hCount:0, last24hUsd:0 };
  const earn    = data?.earningsByCategory ?? { subscriptions:0, groups:0, bots:0, advertisers:[] };
  const mon     = data?.monitoring       ?? { dbLatencyMs:0, alerts:[] };

  // Build pie slices: Premium + Groups + Bots + each individual advertiser
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
        <div className="w-8 h-8 rounded-full border-2 border-gray-200 border-t-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Overview</h1>
          {data?.generatedAt && <p className="text-xs text-gray-400 mt-0.5">Updated {fmtDate(data.generatedAt)}</p>}
        </div>
        <button onClick={() => onRefresh()} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow-sm hover:bg-gray-50 transition-colors">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 11-3.25-6.92M21 3v6h-6" /></svg>
          Refresh
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <motion.div initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }}>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3.5 h-full">
            <div className="flex items-center gap-2 mb-2.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">This Month</p>
            </div>
            <p className="text-[26px] font-black text-gray-900 leading-none tracking-tight tabular-nums">{fmtUsd(h.totalRevenueThisMonth || 0)}</p>
            <p className="text-xs mt-1.5 font-semibold text-emerald-500">
              Stars {fmtUsd(h.starsRevenueThisMonth || 0)}{(h.manualRevenueThisMonth ?? 0) > 0 ? ` · Ads ${fmtUsd(h.manualRevenueThisMonth!)}` : ''}
            </p>
          </div>
        </motion.div>
        <motion.div initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.04 }}>
          <StatCard label="Sales (24h)" value={fmtUsd(summary.last24hUsd)} sub={`${summary.last24hCount} transaction${summary.last24hCount !== 1 ? 's' : ''}`} dot="#ef4444" />
        </motion.div>
        <motion.div initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.08 }}>
          <StatCard label="Premium Users" value={fmtNum(kpis.paidSubs?.lifetime || 0)} sub={`+${fmtNum(kpis.paidSubs?.last24h || 0)} today`} dot="#7c3aed" subGreen={true} />
        </motion.div>
        <motion.div initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.12 }}>
          <StatCard label="Free Users" value={fmtNum(kpis.users?.free || 0)} sub={`${fmtNum(kpis.users?.total || 0)} total`} dot="#0ea5e9" />
        </motion.div>
        <motion.div initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.16 }}>
          <StatCard label="Ad Clicks (24h)" value={fmtNum(kpis.adClicks?.last24h || 0)} sub={`${fmtNum(kpis.adClicks?.lifetime || 0)} lifetime`} dot="#f59e0b" />
        </motion.div>
        <motion.div initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.2 }}>
          <StatCard label="Bookmarks" value={fmtNum(kpis.engagement?.bookmarks || 0)} sub={`${fmtNum(kpis.engagement?.folders || 0)} folders`} dot="#ec4899" />
        </motion.div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.1 }} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-900">Ad Clicks</h3>
            <span className="text-xs text-gray-400">30d · hover</span>
          </div>
          <AreaChart points={kpis.adClicks?.trend30d ?? []} color="#f59e0b" label="adclicks" />
        </motion.div>
        <motion.div initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.14 }} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-900">Traffic</h3>
            <span className="text-xs text-gray-400">30d · hover</span>
          </div>
          <AreaChart points={kpis.traffic?.trend30d ?? []} color="#0284c7" label="traffic" />
        </motion.div>
        <motion.div initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.18 }} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-900">New Users</h3>
            <span className="text-xs text-gray-400">30d · hover</span>
          </div>
          <DualAreaChart free={kpis.users?.newUsersTrend30d ?? []} paid={kpis.paidSubs?.trend30d ?? []} />
        </motion.div>
      </div>

      {/* Pies: Earnings + Users by Country */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.18 }} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-4">Earnings by Source</h3>
          <DonutChart slices={pieSlices} />
        </motion.div>
        {(kpis.users?.byCountry30d?.length ?? 0) > 0 && (
          <motion.div initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.22 }} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-900">Users by Country</h3>
              <span className="text-[10px] text-gray-400">30 days</span>
            </div>
            <DonutChart format="number" slices={
              (kpis.users!.byCountry30d!).map((r, i) => ({
                label: `${flag(r.country)} ${r.country}`,
                value: r.count,
                color: PIE_COLORS[i % PIE_COLORS.length],
              }))
            } />
          </motion.div>
        )}
      </div>

      {/* Sales + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5 items-start">

        {/* Sales table */}
        <motion.div initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.12 }} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden max-w-[500px]">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
            <div className="flex items-baseline gap-2">
              <h2 className="text-sm font-bold text-gray-900">All Sales</h2>
              <span className="text-xs text-gray-400">{summary.count}</span>
            </div>
            <p className="text-sm font-bold text-emerald-600">{fmtUsd(summary.totalUsd)}</p>
          </div>

          {sales.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-400">No sales recorded yet</div>
          ) : (
            <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
              <table className="w-full">
                <thead className="sticky top-0 z-10 bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left text-[10px] font-semibold text-gray-400 px-3 py-2 uppercase tracking-wide">Buyer</th>
                    <th className="text-left text-[10px] font-semibold text-gray-400 px-2 py-2 uppercase tracking-wide">Type</th>
                    <th className="text-left text-[10px] font-semibold text-gray-400 px-2 py-2 uppercase tracking-wide">Plan</th>
                    <th className="text-right text-[10px] font-semibold text-gray-400 px-3 py-2 uppercase tracking-wide">Amount</th>
                    <th className="text-right text-[10px] font-semibold text-gray-400 px-3 py-2 uppercase tracking-wide">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {sales.map((s) => {
                    const meta = TYPE_META[s.type] ?? TYPE_META.subscription;
                    const name = s.buyer.firstName || s.buyer.username;
                    return (
                      <tr key={s._id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-3 py-1.5">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0 overflow-hidden">
                              {s.buyer.photoUrl
                                ? <img src={s.buyer.photoUrl} alt="" className="w-6 h-6 object-cover" />
                                : (name ?? '?')[0].toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-gray-900 leading-tight truncate max-w-[90px]">
                                {flag(s.buyer.country)} {name}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-1.5">
                          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: meta.bg, color: meta.tx }}>
                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: meta.dot }} />
                            {meta.label}
                          </span>
                        </td>
                        <td className="px-2 py-1.5 text-xs text-gray-600 whitespace-nowrap">
                          {s.plan ? (PLAN_LABEL[s.plan] ?? s.plan) : (s.label ?? '—')}
                        </td>
                        <td className="px-3 py-1.5 text-right whitespace-nowrap">
                          <span className="text-xs font-bold text-gray-900">{fmtUsd(s.usd)}</span>
                          {s.stars > 0 && <p className="text-[9px] text-amber-500 leading-tight">{fmtNum(s.stars)} ⭐</p>}
                        </td>
                        <td className="px-3 py-1.5 text-right whitespace-nowrap">
                          <span className="text-[10px] text-gray-400">{fmtDate(s.createdAt)}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        {/* Sidebar */}
        <div className="space-y-4">

          {/* Pending */}
          <motion.div initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.22 }} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-900">Pending Queue</h3>
              {pending.total > 0 && <span className="text-xs font-bold text-white bg-red-500 rounded-full px-2 py-0.5">{pending.total}</span>}
            </div>
            <div className="space-y-1.5">
              {([
                { label:'Groups',  count:pending.groups,  href:'/admin/groups?tab=pending', color:'#f59e0b' },
                { label:'Bots',    count:pending.bots,    href:'/admin/pending-bots',       color:'#7c3aed' },
                { label:'Reviews', count:pending.reviews, href:'/admin/reviews',            color:'#0284c7' },
                { label:'Reports', count:pending.reports, href:'/admin/reports',            color:'#ef4444' },
              ]).map(item => (
                <Link key={item.label} href={item.href} className="flex items-center justify-between rounded-xl bg-gray-50 hover:bg-gray-100 px-3.5 py-2.5 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                    <span className="text-sm text-gray-700">{item.label}</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">{item.count}</span>
                </Link>
              ))}
            </div>
          </motion.div>

          {/* Lifetime revenue */}
          <motion.div initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.26 }} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-3">Revenue</h3>
            <div className="space-y-2.5">
              {/* This month highlight */}
              <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2.5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600">This Month</p>
                  <p className="text-base font-bold text-emerald-700 leading-tight">{fmtUsd(h.totalRevenueThisMonth || 0)}</p>
                </div>
                <div className="text-right text-[10px] text-emerald-600 space-y-0.5">
                  <p>Stars {fmtUsd(h.starsRevenueThisMonth || 0)}</p>
                  {(h.manualRevenueThisMonth ?? 0) > 0 && <p>Ads {fmtUsd(h.manualRevenueThisMonth!)}</p>}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500" /><span className="text-sm text-gray-600">Stars (all time)</span></div>
                <span className="text-sm font-bold text-gray-900">{fmtUsd(h.earningsLifetimeUsd || 0)}</span>
              </div>
              {(h.manualRevenueLifetime ?? 0) > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-amber-500" /><span className="text-sm text-gray-600">Advertisers (all time)</span></div>
                  <span className="text-sm font-bold text-gray-900">{fmtUsd(h.manualRevenueLifetime!)}</span>
                </div>
              )}
              <div className="border-t border-gray-100 pt-2.5 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">Total lifetime</span>
                <span className="text-sm font-bold text-emerald-600">{fmtUsd(h.totalEarningsLifetimeUsd || h.earningsLifetimeUsd || 0)}</span>
              </div>
              {h.starsUsdRate ? <p className="text-xs text-gray-400">${h.starsUsdRate.toFixed(4)} / star</p> : null}
            </div>
          </motion.div>

          {/* System */}
          {mon.alerts.length > 0 && (
            <motion.div initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.3 }} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-900">System</h3>
                <span className="text-xs font-mono text-gray-400">{mon.dbLatencyMs}ms</span>
              </div>
              <div className="space-y-2">
                {mon.alerts.map((a, i) => {
                  const s = { critical:{bar:'bg-red-500',bg:'bg-red-50',tx:'text-red-700'}, warning:{bar:'bg-amber-400',bg:'bg-amber-50',tx:'text-amber-700'}, ok:{bar:'bg-emerald-500',bg:'bg-emerald-50',tx:'text-emerald-700'}, info:{bar:'bg-blue-500',bg:'bg-blue-50',tx:'text-blue-700'} }[a.level] ?? {bar:'bg-gray-400',bg:'bg-gray-50',tx:'text-gray-700'};
                  return (
                    <div key={i} className={`flex gap-3 rounded-xl p-3 ${s.bg}`}>
                      <div className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${s.bar}`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold ${s.tx}`}>{a.title}</p>
                        <p className={`text-xs mt-0.5 ${s.tx} opacity-70`}>{a.description}</p>
                      </div>
                      {a.actionUrl && <Link href={a.actionUrl} className={`text-xs font-semibold shrink-0 ${s.tx} underline`}>View</Link>}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
