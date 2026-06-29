'use client';

import { useEffect, useState } from 'react';
import { listOFClients, getOFClientDashboard } from '@/lib/actions/ofClients';

interface CreatorRow { name: string; username: string; avatar: string; url: string; clicks: number; }
interface Series { label: string; clicks: number; }
interface Dashboard {
  client: { _id: string; name: string; goalClicks: number; dealPrice: number; startDate: string; endDate: string };
  totalClicks: number;
  goalClicks: number;
  goalProgress: number;
  remainingClicks: number;
  expectedByNow: number;
  onPace: boolean;
  timeProgress: number;
  hoursLeft: number;
  daysLeft: number;
  totalImpressions: number;
  ctr: number;
  perCreator: CreatorRow[];
  sections: Series[];
  hourly: Series[];
  daily: Series[];
}
interface ClientLite { _id: string; name: string; }

function fmt(n: number) { return n.toLocaleString(); }
function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) + ' GMT';
}

// Circular goal gauge — pure SVG.
function Gauge({ progress, total, goal, onPace }: { progress: number; total: number; goal: number; onPace: boolean }) {
  const r = 86;
  const circ = 2 * Math.PI * r;
  const pct = Math.round(progress * 100);
  const color = progress >= 1 ? '#22c55e' : onPace ? '#00AFF0' : '#f59e0b';
  return (
    <div className="relative flex items-center justify-center">
      <svg width="200" height="200" className="-rotate-90">
        <circle cx="100" cy="100" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="14" />
        <circle
          cx="100" cy="100" r={r} fill="none" stroke={color} strokeWidth="14" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - Math.min(progress, 1))}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-4xl font-black text-white leading-none">{pct}%</div>
        <div className="text-xs text-white/40 mt-1.5">{fmt(total)} / {fmt(goal)}</div>
        <div className="text-[10px] mt-0.5" style={{ color }}>to goal</div>
      </div>
    </div>
  );
}

// Bar chart — pure SVG, no deps.
function BarChart({ data, accent }: { data: Series[]; accent: string }) {
  const max = Math.max(...data.map((d) => d.clicks), 1);
  const barW = Math.max(6, Math.min(26, Math.floor(720 / data.length) - 3));
  const H = 140;
  const W = data.length * (barW + 3) + 16;
  const [hover, setHover] = useState<number | null>(null);
  return (
    <div className="overflow-x-auto">
      <svg width={W} height={H + 22} style={{ display: 'block' }} onMouseLeave={() => setHover(null)}>
        {data.map((d, i) => {
          const h = (d.clicks / max) * H;
          const x = i * (barW + 3) + 8;
          const active = hover === i;
          return (
            <g key={i} onMouseEnter={() => setHover(i)}>
              <rect x={x} y={0} width={barW} height={H} fill="transparent" />
              <rect x={x} y={H - Math.max(h, 2)} width={barW} height={Math.max(h, 2)} rx={3}
                fill={d.clicks === 0 ? 'rgba(255,255,255,0.06)' : active ? '#fff' : accent} />
              {d.clicks > 0 && (
                <text x={x + barW / 2} y={H - Math.max(h, 2) - 4} textAnchor="middle" fontSize={active ? "11" : "9"} fontWeight={active ? "700" : "600"} fill={active ? "#fff" : "rgba(255,255,255,0.55)"}>{d.clicks}</text>
              )}
              {i % Math.ceil(data.length / 12) === 0 && (
                <text x={x + barW / 2} y={H + 15} textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.3)">{d.label}</text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function OFMDashboard() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [clients, setClients] = useState<ClientLite[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'hour' | 'day'>('day');
  const token = () => (typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '');

  const load = async (id?: string) => {
    setLoading(true);
    try {
      const d = await getOFClientDashboard(token(), id);
      setData(d as Dashboard | null);
      if (d) setActiveId((d as Dashboard).client._id);
    } catch { setData(null); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    (async () => {
      try { setClients(await listOFClients(token()) as ClientLite[]); } catch { /* */ }
      await load();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return <div className="min-h-screen bg-[#080c14] flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#00AFF0]" /></div>;
  }
  if (!data) {
    return <div className="min-h-screen bg-[#080c14] flex items-center justify-center text-white/40">No agency client found. Add one in /OF/featured.</div>;
  }

  const chart = view === 'hour' ? data.hourly : data.daily;

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{data.client.name}</h1>
            {clients.length > 1 && (
              <select value={activeId} onChange={(e) => load(e.target.value)}
                className="bg-white/[0.06] border border-white/10 rounded-lg px-3 py-1.5 text-sm outline-none">
                {clients.map((c) => <option key={c._id} value={c._id} className="bg-[#0e1018]">{c.name}</option>)}
              </select>
            )}
          </div>
          <span className={`px-3 py-1.5 rounded-full text-xs font-black ${data.onPace ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'}`}>
            {data.goalProgress >= 1 ? '✓ GOAL HIT' : data.onPace ? 'ON PACE' : 'BEHIND PACE'}
          </span>
        </div>

        {/* Campaign window */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { l: 'Starts', v: fmtDate(data.client.startDate) },
            { l: 'Ends', v: fmtDate(data.client.endDate) },
            { l: 'Time left', v: data.daysLeft > 0 ? `${data.daysLeft}d ${data.hoursLeft % 24}h` : `${data.hoursLeft}h` },
            { l: 'Need / day left', v: fmt(data.daysLeft > 0 ? Math.ceil(data.remainingClicks / data.daysLeft) : data.remainingClicks) },
          ].map((s) => (
            <div key={s.l} className="bg-[#0e1018] border border-white/[0.06] rounded-2xl p-4">
              <div className="text-[11px] text-white/35 font-bold uppercase tracking-wider">{s.l}</div>
              <div className="text-sm font-bold mt-1">{s.v}</div>
            </div>
          ))}
        </div>

        {/* Impressions + CTR row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { l: 'Total Clicks', v: fmt(data.totalClicks), color: '#00AFF0' },
            { l: 'Impressions', v: fmt(data.totalImpressions), color: 'rgba(255,255,255,0.7)' },
            { l: 'CTR', v: `${data.ctr}%`, color: data.ctr >= 2 ? '#22c55e' : data.ctr >= 0.5 ? '#f59e0b' : 'rgba(255,255,255,0.5)' },
          ].map((s) => (
            <div key={s.l} className="bg-[#0e1018] border border-white/[0.06] rounded-2xl p-4">
              <div className="text-[11px] text-white/35 font-bold uppercase tracking-wider">{s.l}</div>
              <div className="text-xl font-black mt-1" style={{ color: s.color }}>{s.v}</div>
            </div>
          ))}
        </div>

        {/* Gauge + totals */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-[#0e1018] border border-white/[0.06] rounded-2xl p-6 flex flex-col items-center justify-center">
            <Gauge progress={data.goalProgress} total={data.totalClicks} goal={data.goalClicks} onPace={data.onPace} />
            <div className="text-xs text-white/40 mt-4 text-center">
              {data.remainingClicks > 0 ? <><span className="text-white font-bold">{fmt(data.remainingClicks)}</span> clicks to go</> : 'Goal reached 🎉'}
            </div>
          </div>

          {/* Per-creator */}
          <div className="lg:col-span-2 bg-[#0e1018] border border-white/[0.06] rounded-2xl p-5">
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="text-sm font-bold text-white/70">Clicks per model</h2>
              <div className="text-right">
                <div className="text-2xl font-black text-[#00AFF0]">{fmt(data.totalClicks)}</div>
                <div className="text-[10px] text-white/30">total combined</div>
              </div>
            </div>
            <div className="space-y-2.5">
              {data.perCreator.map((c) => {
                const pct = data.perCreator[0]?.clicks ? (c.clicks / data.perCreator[0].clicks) * 100 : 0;
                return (
                  <div key={c.username} className="flex items-center gap-3">
                    {c.avatar
                      ? <img src={c.avatar} alt="" className="w-9 h-9 rounded-lg object-cover bg-white/5 flex-shrink-0" />
                      : <div className="w-9 h-9 rounded-lg bg-[#00AFF0]/15 flex items-center justify-center text-[#00AFF0] font-black flex-shrink-0">{c.name.charAt(0)}</div>}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold truncate">{c.name}</span>
                        <span className="text-sm font-black text-[#00AFF0] ml-2">{fmt(c.clicks)}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden mt-1">
                        <div className="h-full rounded-full bg-[#00AFF0]" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Section breakdown — where clicks come from */}
        <div className="bg-[#0e1018] border border-white/[0.06] rounded-2xl p-5">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-sm font-bold text-white/70">Where clicks come from</h2>
            <span className="text-[10px] text-white/30">double down on the top sections</span>
          </div>
          {data.sections.length === 0 ? (
            <div className="text-sm text-white/30 py-4">No clicks yet.</div>
          ) : (
            <div className="space-y-2.5">
              {data.sections.map((s) => {
                const pct = data.totalClicks ? (s.clicks / data.totalClicks) * 100 : 0;
                const topPct = data.sections[0]?.clicks ? (s.clicks / data.sections[0].clicks) * 100 : 0;
                return (
                  <div key={s.label} className="flex items-center gap-3">
                    <span className="w-32 sm:w-40 text-sm font-bold text-white/80 flex-shrink-0 truncate">{s.label}</span>
                    <div className="flex-1 h-2.5 rounded-full bg-white/[0.06] overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-[#00AFF0] to-[#00d4ff]" style={{ width: `${topPct}%` }} />
                    </div>
                    <span className="w-20 text-right text-sm font-black text-[#00AFF0] flex-shrink-0">{fmt(s.clicks)}</span>
                    <span className="w-12 text-right text-[11px] text-white/35 flex-shrink-0">{pct.toFixed(0)}%</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Chart */}
        <div className="bg-[#0e1018] border border-white/[0.06] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-white/70">Clicks over time</h2>
            <div className="flex gap-1 bg-white/[0.04] rounded-lg p-1">
              {(['hour', 'day'] as const).map((v) => (
                <button key={v} onClick={() => setView(v)}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition ${view === v ? 'bg-[#00AFF0] text-white' : 'text-white/40 hover:text-white/70'}`}>
                  {v === 'hour' ? 'Last 24h' : 'By day'}
                </button>
              ))}
            </div>
          </div>
          <BarChart data={chart} accent="#00AFF0" />
        </div>
    </div>
  );
}
