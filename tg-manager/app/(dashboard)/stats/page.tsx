'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Snapshot { date: string; count: number }
interface GroupStat {
  _id: string;
  name: string;
  channelId: string;
  mediaFolder: string;
  memberCount: number | null;
  isAdminOk: boolean | null;
  delta24h: number | null;
  delta48h: number | null;
  weekDelta: number | null;
  snapshots: Snapshot[];
  postsLast7: number;
  errorsLast7: number;
  lastPostAt: string | null;
}
interface Ecosystem {
  totalMembers: number;
  total24hDelta: number | null;
  total48hDelta: number | null;
  totalWeekDelta: number;
  totalPostsLast7: number;
  totalErrorsLast7: number;
  healthyGroups: number;
  unhealthyGroups: number;
  groupCount: number;
}

// ─── Color palette per channel ────────────────────────────────────────────────
const COLORS = [
  '#ef4444','#f97316','#eab308','#22c55e',
  '#06b6d4','#8b5cf6','#ec4899','#14b8a6',
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmt(n: number | null | undefined) {
  if (n === null || n === undefined) return '—';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString();
}

function timeAgo(dateStr: string | null) {
  if (!dateStr) return 'never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function DeltaBadge({ value, size = 'sm' }: { value: number | null; size?: 'sm' | 'lg' }) {
  if (value === null || value === undefined) return <span className="text-[#555]">—</span>;
  if (value === 0) return <span className={`text-[#888] ${size === 'lg' ? 'text-xl' : 'text-sm'}`}>±0</span>;
  const pos = value > 0;
  return (
    <span className={`font-semibold ${pos ? 'text-emerald-400' : 'text-red-400'} ${size === 'lg' ? 'text-xl' : 'text-sm'}`}>
      {pos ? '▲' : '▼'} {Math.abs(value).toLocaleString()}
    </span>
  );
}

function HealthPill({ ok }: { ok: boolean | null }) {
  if (ok === null) return <span className="px-2 py-0.5 text-xs rounded-full bg-[#333] text-[#888]">Unknown</span>;
  if (ok) return <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-500/20 text-emerald-400 font-medium">✓ Admin</span>;
  return <span className="px-2 py-0.5 text-xs rounded-full bg-red-500/20 text-red-400 font-medium">✗ Missing</span>;
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a1a1a] border border-white/15 rounded-xl p-3 shadow-xl min-w-[150px]">
      <p className="text-xs text-[#888] mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4 text-sm">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
            <span className="text-[#ccc] truncate max-w-[130px]">{p.name}</span>
          </span>
          <span className="font-semibold text-white">{Number(p.value).toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Build chart data ─────────────────────────────────────────────────────────
function buildChartData(groups: GroupStat[], selectedIds: Set<string>, mode: 'ecosystem' | 'individual') {
  if (mode === 'ecosystem') {
    const dateMap: Record<string, number> = {};
    for (const g of groups) {
      for (const s of g.snapshots) {
        const d = new Date(s.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
        dateMap[d] = (dateMap[d] || 0) + s.count;
      }
    }
    const sorted = Object.keys(dateMap).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    return sorted.map(date => ({ date, total: dateMap[date] }));
  }

  const allDates = new Set<string>();
  const groupData: Record<string, Record<string, number>> = {};
  for (const g of groups) {
    if (!selectedIds.has(g._id)) continue;
    groupData[g._id] = {};
    for (const s of g.snapshots) {
      const d = new Date(s.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      allDates.add(d);
      groupData[g._id][d] = s.count;
    }
  }
  const sorted = [...allDates].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  return sorted.map(date => {
    const row: any = { date };
    for (const g of groups) {
      if (!selectedIds.has(g._id)) continue;
      row[g._id] = groupData[g._id]?.[date] ?? null;
    }
    return row;
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function StatsPage() {
  const [data, setData] = useState<{ groups: GroupStat[]; ecosystem: Ecosystem } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [snapshotting, setSnapshotting] = useState(false);
  const [snapshotMsg, setSnapshotMsg] = useState('');
  const [chartMode, setChartMode] = useState<'ecosystem' | 'individual'>('ecosystem');
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'chart' | 'health'>('chart');
  const [sortBy, setSortBy] = useState<'members' | 'growth' | 'posts'>('members');

  const load = useCallback(async (live = false) => {
    if (live) setRefreshing(true); else setLoading(true);
    const res = await fetch(`/api/stats${live ? '?live=1' : ''}`);
    const json = await res.json();
    setData(json);
    if (json.groups) setSelectedGroups(new Set(json.groups.map((g: GroupStat) => g._id)));
    if (live) setRefreshing(false); else setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function runSnapshot() {
    setSnapshotting(true);
    setSnapshotMsg('');
    const res = await fetch('/api/cron/stats');
    const json = await res.json();
    const saved = json.snapshotted ?? 0;
    await load(false);
    setSnapshotting(false);
    setSnapshotMsg(saved > 0 ? `✓ Saved ${saved} snapshot${saved !== 1 ? 's' : ''}` : 'Already snapshotted today');
    setTimeout(() => setSnapshotMsg(''), 5000);
  }

  function toggleGroup(id: string) {
    setSelectedGroups(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const chartData = useMemo(() => {
    if (!data) return [];
    return buildChartData(data.groups, selectedGroups, chartMode);
  }, [data, selectedGroups, chartMode]);

  // Need at least 1 data point to show "you have a snapshot", 2+ for a meaningful line
  const snapshotCount = chartData.length;

  const sorted = data ? [...data.groups].sort((a, b) => {
    if (sortBy === 'members') return (b.memberCount || 0) - (a.memberCount || 0);
    if (sortBy === 'growth') return (b.weekDelta || 0) - (a.weekDelta || 0);
    return b.postsLast7 - a.postsLast7;
  }) : [];

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-[#b31b1b] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-[#888] text-sm">Loading stats...</p>
      </div>
    </div>
  );

  const eco = data!.ecosystem;

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold">Channel Stats</h2>
          <p className="text-sm text-[#888] mt-0.5">Growth tracking & health monitoring</p>
        </div>
        <div className="flex items-center gap-2">
          {snapshotMsg && <span className="text-xs text-emerald-400">{snapshotMsg}</span>}
          <button
            onClick={runSnapshot}
            disabled={snapshotting}
            className="px-3 py-2 bg-[#111] border border-white/10 rounded-lg text-xs hover:bg-white/5 transition disabled:opacity-50"
          >
            {snapshotting ? 'Snapshotting...' : '📸 Snapshot Now'}
          </button>
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="px-3 py-2 bg-[#b31b1b] text-white rounded-lg text-xs font-medium hover:bg-[#d42020] transition disabled:opacity-50"
          >
            {refreshing ? 'Fetching...' : '↻ Live Refresh'}
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Total */}
        <div className="col-span-2 md:col-span-1 rounded-xl p-4 border bg-[#b31b1b]/10 border-[#b31b1b]/30">
          <p className="text-xs text-[#888] mb-1 uppercase tracking-wide">Total Subscribers</p>
          <p className="text-3xl font-bold text-white leading-none">{fmt(eco.totalMembers)}</p>
          <p className="text-xs text-[#666] mt-1">{eco.groupCount} channels</p>
        </div>
        {/* 24h */}
        <div className="rounded-xl p-4 border bg-[#111] border-white/10">
          <p className="text-xs text-[#888] mb-1 uppercase tracking-wide">New Subs · 24h</p>
          <div className="text-2xl font-bold leading-none mt-1">
            <DeltaBadge value={eco.total24hDelta} size="lg" />
          </div>
          <p className="text-xs text-[#555] mt-1">vs yesterday</p>
        </div>
        {/* 48h */}
        <div className="rounded-xl p-4 border bg-[#111] border-white/10">
          <p className="text-xs text-[#888] mb-1 uppercase tracking-wide">New Subs · 48h</p>
          <div className="text-2xl font-bold leading-none mt-1">
            <DeltaBadge value={eco.total48hDelta} size="lg" />
          </div>
          <p className="text-xs text-[#555] mt-1">vs 2 days ago</p>
        </div>
        {/* 7d */}
        <div className="rounded-xl p-4 border bg-[#111] border-white/10">
          <p className="text-xs text-[#888] mb-1 uppercase tracking-wide">New Subs · 7d</p>
          <div className="text-2xl font-bold leading-none mt-1">
            <DeltaBadge value={eco.totalWeekDelta} size="lg" />
          </div>
          <p className="text-xs text-[#555] mt-1">vs last week</p>
        </div>
      </div>

      {/* ── Tab switcher ── */}
      <div className="flex gap-1 bg-[#111] border border-white/10 rounded-xl p-1 w-fit">
        {([['chart', '📈 Growth Chart'], ['health', '🔍 Health Check']] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`px-4 py-2 rounded-lg text-sm transition ${activeTab === id ? 'bg-white/10 text-white font-medium' : 'text-[#888] hover:text-white'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ══════════════ CHART TAB ══════════════ */}
      {activeTab === 'chart' && (
        <div className="space-y-4">

          {/* Chart mode + group chips */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex gap-1 bg-[#111] border border-white/10 rounded-lg p-1">
              <button
                onClick={() => setChartMode('ecosystem')}
                className={`px-3 py-1.5 rounded text-xs transition ${chartMode === 'ecosystem' ? 'bg-white/10 text-white font-medium' : 'text-[#888] hover:text-white'}`}
              >
                🌐 Ecosystem Total
              </button>
              <button
                onClick={() => setChartMode('individual')}
                className={`px-3 py-1.5 rounded text-xs transition ${chartMode === 'individual' ? 'bg-white/10 text-white font-medium' : 'text-[#888] hover:text-white'}`}
              >
                📊 Per Channel
              </button>
            </div>
            {chartMode === 'individual' && (
              <div className="flex items-center gap-2 text-xs text-[#888]">
                <button onClick={() => setSelectedGroups(new Set(data!.groups.map(g => g._id)))} className="hover:text-white transition">All</button>
                <span>·</span>
                <button onClick={() => setSelectedGroups(new Set())} className="hover:text-white transition">None</button>
              </div>
            )}
          </div>

          {chartMode === 'individual' && (
            <div className="flex flex-wrap gap-2">
              {data!.groups.map((g, i) => {
                const on = selectedGroups.has(g._id);
                const color = COLORS[i % COLORS.length];
                return (
                  <button
                    key={g._id}
                    onClick={() => toggleGroup(g._id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition ${
                      on ? 'border-transparent text-white' : 'border-white/10 text-[#666] hover:border-white/20'
                    }`}
                    style={on ? { background: color + '22', borderColor: color + '66', color } : {}}
                  >
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: on ? color : '#444' }} />
                    {g.name}
                    {g.memberCount !== null && <span className="opacity-60 ml-0.5">{fmt(g.memberCount)}</span>}
                  </button>
                );
              })}
            </div>
          )}

          {/* Chart area */}
          <div className="bg-[#111] border border-white/10 rounded-2xl p-5">
            {snapshotCount === 0 ? (
              /* ── No data at all ── */
              <div className="flex flex-col items-center justify-center h-52 text-center gap-3">
                <p className="text-4xl">📊</p>
                <p className="text-white font-semibold">No snapshots yet</p>
                <p className="text-sm text-[#666] max-w-sm">
                  Take your first snapshot to start recording subscriber counts.
                  The chart will appear after 2+ snapshots.
                </p>
                <button
                  onClick={runSnapshot}
                  disabled={snapshotting}
                  className="mt-1 px-5 py-2.5 bg-[#b31b1b] hover:bg-[#d42020] text-white text-sm font-medium rounded-xl transition disabled:opacity-50"
                >
                  {snapshotting ? 'Taking snapshot...' : '📸 Take First Snapshot'}
                </button>
              </div>
            ) : snapshotCount === 1 ? (
              /* ── One snapshot, waiting for second ── */
              <div className="flex flex-col items-center justify-center h-52 text-center gap-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-2xl">✓</div>
                <p className="text-white font-semibold">First snapshot saved!</p>
                <p className="text-sm text-[#666] max-w-sm">
                  The growth chart appears once you have 2+ data points.
                  Come back tomorrow — the daily cron will snapshot automatically at 8am UTC.
                </p>
                <button
                  onClick={runSnapshot}
                  disabled={snapshotting}
                  className="mt-1 px-5 py-2.5 bg-[#111] border border-white/15 hover:bg-white/5 text-white text-sm rounded-xl transition disabled:opacity-50"
                >
                  {snapshotting ? 'Snapshotting...' : '📸 Snapshot Again Now'}
                </button>
              </div>
            ) : (
              /* ── Chart ── */
              <>
                <p className="text-xs text-[#666] mb-4">
                  {chartMode === 'ecosystem'
                    ? `Total across ${eco.groupCount} channels · ${snapshotCount} data points`
                    : `${selectedGroups.size} channel${selectedGroups.size !== 1 ? 's' : ''} · ${snapshotCount} dates`}
                </p>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      {chartMode === 'ecosystem' ? (
                        <linearGradient id="grad-eco" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#b31b1b" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#b31b1b" stopOpacity={0} />
                        </linearGradient>
                      ) : (
                        data!.groups.map((g, i) => (
                          <linearGradient key={g._id} id={`grad-${g._id}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.2} />
                            <stop offset="100%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0} />
                          </linearGradient>
                        ))
                      )}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: '#666', fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fill: '#666', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => fmt(v)} width={50} />
                    <Tooltip content={<ChartTooltip />} />
                    {chartMode === 'individual' && selectedGroups.size > 1 && (
                      <Legend
                        formatter={(value: string) => {
                          const g = data!.groups.find(g => g._id === value);
                          return <span style={{ fontSize: 11, color: '#ccc' }}>{g?.name ?? value}</span>;
                        }}
                      />
                    )}
                    {chartMode === 'ecosystem' ? (
                      <Area type="monotone" dataKey="total" name="Total subscribers"
                        stroke="#b31b1b" strokeWidth={2} fill="url(#grad-eco)"
                        dot={false} activeDot={{ r: 5, fill: '#b31b1b', strokeWidth: 0 }} />
                    ) : (
                      data!.groups.map((g, i) => selectedGroups.has(g._id) && (
                        <Area key={g._id} type="monotone" dataKey={g._id} name={g.name}
                          stroke={COLORS[i % COLORS.length]} strokeWidth={2}
                          fill={`url(#grad-${g._id})`} dot={false} connectNulls
                          activeDot={{ r: 5, strokeWidth: 0 }} />
                      ))
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </>
            )}
          </div>

          {/* Channel table */}
          <div className="bg-[#111] border border-white/10 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <p className="text-sm font-medium">All Channels</p>
              <div className="flex gap-1 text-xs">
                {(['members', 'growth', 'posts'] as const).map(s => (
                  <button key={s} onClick={() => setSortBy(s)}
                    className={`px-3 py-1.5 rounded-lg transition capitalize ${sortBy === s ? 'bg-white/10 text-white' : 'text-[#888] hover:text-white'}`}>
                    {s === 'members' ? 'By size' : s === 'growth' ? 'By growth' : 'By activity'}
                  </button>
                ))}
              </div>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-[#555] border-b border-white/5">
                  <th className="text-left px-4 py-2.5 font-medium">Channel</th>
                  <th className="text-right px-4 py-2.5 font-medium">Subscribers</th>
                  <th className="text-right px-4 py-2.5 font-medium">+24h</th>
                  <th className="text-right px-4 py-2.5 font-medium">+48h</th>
                  <th className="text-right px-4 py-2.5 font-medium">+7d</th>
                  <th className="text-right px-4 py-2.5 font-medium">Posts</th>
                  <th className="text-right px-4 py-2.5 font-medium">Last Post</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((g, _i) => {
                  const colorIdx = data!.groups.findIndex(x => x._id === g._id);
                  return (
                    <tr key={g._id}
                      className="border-b border-white/[0.04] hover:bg-white/[0.02] cursor-pointer"
                      onClick={() => { setChartMode('individual'); setSelectedGroups(new Set([g._id])); }}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ background: COLORS[colorIdx % COLORS.length] }} />
                          <span className="font-medium">{g.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-white">{fmt(g.memberCount)}</td>
                      <td className="px-4 py-3 text-right"><DeltaBadge value={g.delta24h} /></td>
                      <td className="px-4 py-3 text-right"><DeltaBadge value={g.delta48h} /></td>
                      <td className="px-4 py-3 text-right"><DeltaBadge value={g.weekDelta} /></td>
                      <td className="px-4 py-3 text-right text-[#aaa]">{g.postsLast7}</td>
                      <td className="px-4 py-3 text-right text-[#666] text-xs">{timeAgo(g.lastPostAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-white/10 bg-white/[0.02]">
                  <td className="px-4 py-3 text-xs text-[#666] font-medium uppercase tracking-wide">Ecosystem Total</td>
                  <td className="px-4 py-3 text-right font-bold text-white">{fmt(eco.totalMembers)}</td>
                  <td className="px-4 py-3 text-right"><DeltaBadge value={eco.total24hDelta} /></td>
                  <td className="px-4 py-3 text-right"><DeltaBadge value={eco.total48hDelta} /></td>
                  <td className="px-4 py-3 text-right"><DeltaBadge value={eco.totalWeekDelta} /></td>
                  <td className="px-4 py-3 text-right text-[#aaa] font-medium">{eco.totalPostsLast7}</td>
                  <td className="px-4 py-3" />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ══════════════ HEALTH TAB ══════════════ */}
      {activeTab === 'health' && (
        <div className="space-y-4">
          {data!.groups.some(g => g.isAdminOk === false) && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-300 flex gap-3">
              <span className="text-lg">⚠️</span>
              <div>
                <strong>Action needed:</strong> Some channels are missing bot admin rights.
                In Telegram → channel → Admins → add your bot with <em>Post Messages</em> permission.
              </div>
            </div>
          )}
          <div className="bg-[#111] border border-white/10 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-[#555] border-b border-white/10">
                  <th className="text-left px-4 py-3 font-medium">Channel</th>
                  <th className="text-left px-4 py-3 font-medium">Bot Status</th>
                  <th className="text-right px-4 py-3 font-medium">Subscribers</th>
                  <th className="text-right px-4 py-3 font-medium">+24h</th>
                  <th className="text-right px-4 py-3 font-medium">+7d</th>
                  <th className="text-right px-4 py-3 font-medium">Posts (7d)</th>
                  <th className="text-right px-4 py-3 font-medium">Errors</th>
                  <th className="text-right px-4 py-3 font-medium">Last Post</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(g => (
                  <tr key={g._id} className={`border-b border-white/[0.04] hover:bg-white/[0.02] ${g.isAdminOk === false ? 'bg-red-500/[0.03]' : ''}`}>
                    <td className="px-4 py-3">
                      <span className="font-medium">{g.name}</span>
                      <span className="block text-xs text-[#555]">{g.channelId}</span>
                    </td>
                    <td className="px-4 py-3"><HealthPill ok={g.isAdminOk} /></td>
                    <td className="px-4 py-3 text-right font-semibold">{fmt(g.memberCount)}</td>
                    <td className="px-4 py-3 text-right"><DeltaBadge value={g.delta24h} /></td>
                    <td className="px-4 py-3 text-right"><DeltaBadge value={g.weekDelta} /></td>
                    <td className="px-4 py-3 text-right text-[#aaa]">{g.postsLast7}</td>
                    <td className="px-4 py-3 text-right">
                      {g.errorsLast7 > 0
                        ? <span className="text-red-400 font-medium">{g.errorsLast7}</span>
                        : <span className="text-emerald-400">0</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-[#666] text-xs">{timeAgo(g.lastPostAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
