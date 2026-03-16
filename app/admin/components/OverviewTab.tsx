'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

type TrendPoint = { date: string; value: number };
type Metric = { last24h?: number; lifetime?: number; trend30d?: TrendPoint[] };
type MonitoringAlert = { level: 'critical' | 'warning' | 'info' | 'ok'; title: string; description: string; actionUrl?: string };
type DashboardData = {
  generatedAt?: string;
  headline?: {
    totalPageviewsLifetime?: number;
    earningsTodayUsd?: number;
    earningsLifetimeUsd?: number;
    starsLifetime?: number;
    starsUsdRate?: number;
    earningsSource?: string;
    manualRevenueLifetime?: number;
    manualRevenueThisMonth?: number;
    totalEarningsLifetimeUsd?: number;
    totalEarningsThisMonthUsd?: number;
  };
  kpis?: { paidSubs?: Metric; newUsers?: Metric; newGroups?: Metric; adClicks?: Metric; totalViews?: Metric };
  pending?: { groups: number; bots: number; reviews: number; reports: number; total: number };
  monitoring?: { dbLatencyMs: number; alerts: MonitoringAlert[] };
};

interface OverviewTabProps {
  data: DashboardData | null;
  loading: boolean;
  onRefresh: () => void | Promise<void>;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value || 0);
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value || 0);
}

function Sparkline({ points, stroke = '#4f46e5' }: { points: TrendPoint[]; stroke?: string }) {
  if (!points?.length) {
    return <div className="h-14 rounded-md bg-slate-50 border border-slate-200" />;
  }

  const width = 100;
  const height = 26;
  const max = Math.max(...points.map((p) => p.value), 1);
  const min = Math.min(...points.map((p) => p.value), 0);
  const range = Math.max(max - min, 1);
  const stepX = points.length > 1 ? width / (points.length - 1) : width;

  const path = points
    .map((p, i) => {
      const x = i * stepX;
      const normalized = (p.value - min) / range;
      const y = height - normalized * height;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="h-14 rounded-md bg-slate-50 border border-slate-200 p-2">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
        <polyline
          fill="none"
          stroke={stroke}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={path}
        />
      </svg>
    </div>
  );
}

function KpiCard({
  title,
  label,
  last24h,
  lifetime,
  points,
  tone,
}: {
  title: string;
  label: string;
  last24h?: number;
  lifetime?: number;
  points: TrendPoint[];
  tone: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-slate-200 bg-white p-4"
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-slate-500">{label}</p>
          <h3 className="text-sm font-semibold text-slate-900 mt-0.5">{title}</h3>
        </div>
        <span className={`h-2 w-2 rounded-full ${tone}`} />
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">24h</p>
          <p className="text-xl font-semibold text-slate-900">{formatNumber(last24h || 0)}</p>
        </div>
        <div>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">Lifetime</p>
          <p className="text-xl font-semibold text-slate-900">{formatNumber(lifetime || 0)}</p>
        </div>
      </div>

      <Sparkline points={points} />
      <p className="text-[10px] text-slate-500 mt-1.5">Last 30 days</p>
    </motion.div>
  );
}

function alertStyle(level: string) {
  if (level === 'critical') return 'border-red-200 bg-red-50 text-red-700';
  if (level === 'warning') return 'border-amber-200 bg-amber-50 text-amber-700';
  if (level === 'ok') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  return 'border-blue-200 bg-blue-50 text-blue-700';
}

export default function OverviewTab({ data, loading, onRefresh }: OverviewTabProps) {
  const headline = data?.headline || {};
  const kpis = data?.kpis || {};
  const pending = data?.pending || { groups: 0, bots: 0, reviews: 0, reports: 0, total: 0 };
  const monitoring = data?.monitoring || { dbLatencyMs: 0, alerts: [] };

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-500">
        Loading dashboard data...
      </div>
    );
  }

  return (
    <div className="-m-4 md:-m-8 p-4 md:p-6 min-h-screen bg-[#f6f8fc] space-y-3">
      <div className="rounded-xl border border-slate-200 bg-white px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-500">Control Center</p>
            <h1 className="text-2xl font-semibold text-slate-900 mt-1">Performance Dashboard</h1>
          </div>
          <button
            onClick={() => onRefresh()}
            className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm text-slate-700 bg-white hover:bg-slate-50 transition-colors"
          >
            Refresh
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-1.5">Last sync: {data?.generatedAt ? new Date(data.generatedAt).toLocaleString() : 'N/A'}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="rounded-xl border border-slate-200 bg-white p-3.5">
          <p className="text-[11px] uppercase tracking-wider font-medium" style={{ color: '#64748b' }}>Total Pageviews</p>
          <p className="text-2xl font-semibold mt-1" style={{ color: '#0f172a' }}>{formatNumber(headline.totalPageviewsLifetime || 0)}</p>
          <p className="text-xs mt-1" style={{ color: '#64748b' }}>Lifetime</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5">
          <p className="text-[11px] uppercase tracking-wider font-medium" style={{ color: '#047857' }}>Stars Earnings</p>
          <p className="text-2xl font-semibold mt-1" style={{ color: '#064e3b' }}>{formatUsd(headline.earningsLifetimeUsd || 0)}</p>
          <p className="text-xs mt-1" style={{ color: '#065f46' }}>
            {headline.starsLifetime
              ? `${headline.starsLifetime.toLocaleString()} ★ · rate $${(headline.starsUsdRate || 0).toFixed(5)}/★`
              : headline.earningsSource === 'unavailable' ? 'Bot token not configured' : 'Lifetime Stars revenue'}
          </p>
        </div>
        {(headline.manualRevenueLifetime || 0) > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5">
            <p className="text-[11px] uppercase tracking-wider font-medium" style={{ color: '#92400e' }}>Manual Revenue</p>
            <p className="text-2xl font-semibold mt-1" style={{ color: '#78350f' }}>{formatUsd(headline.manualRevenueLifetime || 0)}</p>
            <p className="text-xs mt-1" style={{ color: '#92400e' }}>
              This month: {formatUsd(headline.manualRevenueThisMonth || 0)}
            </p>
          </div>
        )}
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3.5">
          <p className="text-[11px] uppercase tracking-wider font-medium" style={{ color: '#4338ca' }}>Total Earnings</p>
          <p className="text-2xl font-semibold mt-1" style={{ color: '#1e1b4b' }}>{formatUsd(headline.totalEarningsLifetimeUsd || headline.earningsLifetimeUsd || 0)}</p>
          <p className="text-xs mt-1" style={{ color: '#3730a3' }}>
            Stars + Manual · All time
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2.5">
        <KpiCard
          title="Paid Subs"
          label="Revenue"
          last24h={kpis?.paidSubs?.last24h || 0}
          lifetime={kpis?.paidSubs?.lifetime || 0}
          points={kpis?.paidSubs?.trend30d || []}
          tone="bg-amber-500"
        />
        <KpiCard
          title="New Users"
          label="Acquisition"
          last24h={kpis?.newUsers?.last24h || 0}
          lifetime={kpis?.newUsers?.lifetime || 0}
          points={kpis?.newUsers?.trend30d || []}
          tone="bg-blue-500"
        />
        <KpiCard
          title="New Groups"
          label="Supply"
          last24h={kpis?.newGroups?.last24h || 0}
          lifetime={kpis?.newGroups?.lifetime || 0}
          points={kpis?.newGroups?.trend30d || []}
          tone="bg-emerald-500"
        />
        <KpiCard
          title="Ad Clicks"
          label="Ads"
          last24h={kpis?.adClicks?.last24h || 0}
          lifetime={kpis?.adClicks?.lifetime || 0}
          points={kpis?.adClicks?.trend30d || []}
          tone="bg-fuchsia-500"
        />
        <KpiCard
          title="Total Views"
          label="Traffic"
          last24h={undefined}
          lifetime={kpis?.totalViews?.lifetime || 0}
          points={kpis?.totalViews?.trend30d || []}
          tone="bg-cyan-500"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-2.5">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-slate-200 bg-white p-3.5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-slate-900">Pending Queue</h2>
            <span className="text-xs bg-slate-100 border border-slate-200 rounded-full px-2.5 py-0.5 text-slate-600">
              Total: {formatNumber(pending.total || 0)}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Link href="/admin/pending-groups" className="rounded-lg border border-amber-200 bg-amber-50 p-3 hover:bg-amber-100 transition-colors">
              <p className="text-[11px] text-amber-700">Groups</p>
              <p className="text-lg font-semibold text-slate-900">{formatNumber(pending.groups || 0)}</p>
            </Link>
            <Link href="/admin/pending-bots" className="rounded-lg border border-purple-200 bg-purple-50 p-3 hover:bg-purple-100 transition-colors">
              <p className="text-[11px] text-purple-700">Bots</p>
              <p className="text-lg font-semibold text-slate-900">{formatNumber(pending.bots || 0)}</p>
            </Link>
            <Link href="/admin/reviews" className="rounded-lg border border-blue-200 bg-blue-50 p-3 hover:bg-blue-100 transition-colors">
              <p className="text-[11px] text-blue-700">Reviews</p>
              <p className="text-lg font-semibold text-slate-900">{formatNumber(pending.reviews || 0)}</p>
            </Link>
            <Link href="/admin/reports" className="rounded-lg border border-red-200 bg-red-50 p-3 hover:bg-red-100 transition-colors">
              <p className="text-[11px] text-red-700">Reports</p>
              <p className="text-lg font-semibold text-slate-900">{formatNumber(pending.reports || 0)}</p>
            </Link>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-slate-200 bg-white p-3.5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-slate-900">System Monitoring</h2>
            <span className="text-xs bg-slate-100 border border-slate-200 rounded-full px-2.5 py-0.5 text-slate-600">
              DB: {monitoring.dbLatencyMs || 0}ms
            </span>
          </div>

          <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
            {(monitoring.alerts || []).map((alert: MonitoringAlert, idx: number) => (
              <div key={`${alert.title}-${idx}`} className={`rounded-lg border p-3 ${alertStyle(alert.level)}`}>
                <p className="text-sm font-semibold">{alert.title}</p>
                <p className="text-xs opacity-95 mt-0.5">{alert.description}</p>
                {alert.actionUrl ? (
                  <Link href={alert.actionUrl} className="inline-block mt-1.5 text-xs underline underline-offset-2">
                    Open section
                  </Link>
                ) : null}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
