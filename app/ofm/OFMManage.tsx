'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getOFMCreators, listOFClientsForManage } from '@/lib/actions/ofManage';

interface Picture {
  index: number;
  label: string;
  url: string;
  paused: boolean;
  total: number;
  last24h: number;
  last48h: number;
  last7d: number;
  last30d: number;
}
interface CreatorRow {
  _id: string;
  name: string;
  username: string;
  slug: string;
  avatar: string;
  url: string;
  active: boolean;
  liveOnly: boolean;
  liveHourStart: number;
  liveHourEnd: number;
  imageCount: number;
  activeCount: number;
  pictures: Picture[];
  winnerIndex: number | null;
  total: number;
  last24h: number;
  last48h: number;
  last7d: number;
  last30d: number;
  impressions: number;
  ctr: number;
}

function tok() {
  return typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '';
}
function fmt(n: number) { return n.toLocaleString(); }

function ctrColor(ctr: number) {
  return ctr >= 2 ? 'text-emerald-400' : ctr >= 0.5 ? 'text-amber-400' : 'text-white/40';
}

export default function OFMManage() {
  const [clients, setClients] = useState<{ _id: string; name: string }[]>([]);
  const [activeId, setActiveId] = useState('');
  const [agencySlug, setAgencySlug] = useState('');
  const [rows, setRows] = useState<CreatorRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async (id?: string) => {
    const cid = id || activeId;
    if (!cid) return;
    setLoading(true);
    try {
      const data = await getOFMCreators(tok(), cid) as { agencySlug: string; creators: CreatorRow[] };
      setRows(data.creators);
      setAgencySlug(data.agencySlug);
    } catch { setRows([]); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    (async () => {
      try {
        const cl = await listOFClientsForManage(tok()) as { _id: string; name: string }[];
        setClients(cl);
        if (cl.length) { setActiveId(cl[0]._id); await load(cl[0]._id); }
        else setLoading(false);
      } catch { setLoading(false); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-5">
      {/* Header / client switcher */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-black">Manage Ads</h2>
          {clients.length > 1 && (
            <select
              value={activeId}
              onChange={(e) => { setActiveId(e.target.value); load(e.target.value); }}
              className="bg-white/[0.06] border border-white/10 rounded-lg px-3 py-1.5 text-sm outline-none text-white"
            >
              {clients.map((c) => <option key={c._id} value={c._id} className="bg-[#0e1018]">{c.name}</option>)}
            </select>
          )}
        </div>
        <span className="text-[11px] text-white/30">Click a model to edit images, live time & link</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#00AFF0]" />
        </div>
      ) : rows.length === 0 ? (
        <div className="text-white/30 text-sm py-10 text-center">No creators linked. Add them in /OF/featured.</div>
      ) : (
        <div className="bg-[#0e1018] border border-white/[0.06] rounded-2xl overflow-hidden">
          {/* Column header */}
          <div className="hidden sm:grid grid-cols-[1.6fr_repeat(4,0.6fr)_0.7fr_0.7fr_0.5fr] gap-2 px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-white/35 border-b border-white/[0.06]">
            <span>Model</span>
            <span className="text-right">24h</span>
            <span className="text-right">48h</span>
            <span className="text-right">7d</span>
            <span className="text-right">30d</span>
            <span className="text-right">Total</span>
            <span className="text-right">Impr.</span>
            <span className="text-right">CTR</span>
          </div>

          {rows.map((r) => {
            const hasPics = r.imageCount > 0 && r.pictures.length > 0;
            return (
            <div key={r._id} className="border-b border-white/[0.04] last:border-0">
              <div className="grid grid-cols-[1.6fr_repeat(4,0.6fr)_0.7fr_0.7fr_0.5fr] gap-2 px-4 py-2.5 items-center hover:bg-white/[0.02] transition">
                {/* Model cell — compact, links to detail */}
                <Link href={`/ofm/${agencySlug}/${r.slug}`} className="flex items-center gap-3 min-w-0 text-left group">
                  {r.avatar
                    ? <img src={r.avatar} alt="" className="w-7 h-7 rounded object-cover bg-white/5 flex-shrink-0" />
                    : <div className="w-7 h-7 rounded bg-[#00AFF0]/15 flex items-center justify-center text-[#00AFF0] text-xs font-black flex-shrink-0">{r.name.charAt(0)}</div>}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-bold truncate group-hover:text-[#00AFF0]">{r.name}</span>
                      {!r.active && <span className="text-[8px] font-black text-white/30 bg-white/10 px-1 py-px rounded">PAUSED</span>}
                      {r.liveOnly && <span className="text-[8px] font-black text-emerald-400 bg-emerald-500/15 px-1 py-px rounded">LIVE-ONLY</span>}
                      {hasPics && (
                        <span className="text-[8px] font-black text-emerald-400 bg-emerald-500/15 px-1 py-px rounded">{r.activeCount} LIVE</span>
                      )}
                    </div>
                    <div className="text-[10px] text-white/35 truncate">@{r.username}</div>
                  </div>
                </Link>
                {/* Stats — pure tracking numbers */}
                <span className="text-right text-xs font-bold text-white/80 tabular-nums">{fmt(r.last24h)}</span>
                <span className="text-right text-xs font-bold text-white/80 tabular-nums">{fmt(r.last48h)}</span>
                <span className="text-right text-xs font-bold text-white/80 tabular-nums">{fmt(r.last7d)}</span>
                <span className="text-right text-xs font-bold text-white/80 tabular-nums">{fmt(r.last30d)}</span>
                <span className="text-right text-xs font-black text-[#00AFF0] tabular-nums">{fmt(r.total)}</span>
                <span className="text-right text-xs font-bold text-white/50 tabular-nums">{fmt(r.impressions)}</span>
                <span className={`text-right text-xs font-black tabular-nums ${ctrColor(r.ctr)}`}>{r.ctr}%</span>
              </div>

              {/* SPLIT TEST TABLE — proper column-aligned rows like /admin advertisers feed-ads */}
              {hasPics && (
                <div className="border-t border-white/[0.04] bg-black/20">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/[0.04]">
                        <th className="pl-12 pr-2 py-1.5 text-left font-bold text-[#555] uppercase tracking-wide text-[9px]">Image</th>
                        <th className="px-2 py-1.5 text-left font-bold text-[#555] uppercase tracking-wide text-[9px]">Variant</th>
                        <th className="px-2 py-1.5 text-right font-bold text-green-500/50 uppercase tracking-wide text-[9px]">24h</th>
                        <th className="px-2 py-1.5 text-right font-bold text-[#555] uppercase tracking-wide text-[9px]">7d</th>
                        <th className="px-2 py-1.5 text-right font-bold text-[#555] uppercase tracking-wide text-[9px]">30d</th>
                        <th className="px-2 py-1.5 text-right font-bold text-[#555] uppercase tracking-wide text-[9px]">Total</th>
                        <th className="px-2 py-1.5 text-left font-bold text-[#555] uppercase tracking-wide text-[9px]">Status</th>
                        <th className="px-3 py-1.5 text-right font-bold text-[#555] uppercase tracking-wide text-[9px]"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.02]">
                      {r.pictures.map((p) => {
                        const isPaused = p.paused;
                        const isLeader = r.winnerIndex === p.index && !isPaused;
                        return (
                          <tr key={p.index} className="hover:bg-white/[0.03] transition-colors">
                            <td className="pl-12 pr-2 py-1.5">
                              {p.url
                                ? <img src={p.url} alt="" className="h-7 w-10 object-cover rounded" />
                                : <span className="h-7 w-10 inline-block bg-white/5 rounded" />}
                            </td>
                            <td className="px-2 py-1.5 text-white font-medium">{p.label}</td>
                            <td className="px-2 py-1.5 text-right text-green-400 font-semibold tabular-nums">{fmt(p.last24h)}</td>
                            <td className="px-2 py-1.5 text-right text-[#999] tabular-nums">{fmt(p.last7d)}</td>
                            <td className="px-2 py-1.5 text-right text-[#999] tabular-nums">{fmt(p.last30d)}</td>
                            <td className="px-2 py-1.5 text-right text-white font-bold tabular-nums">{fmt(p.total)}</td>
                            <td className="px-2 py-1.5">
                              {/* Each LIVE image rotates. Leader = most clicks among live. Paused = not rotating. */}
                              {isPaused && <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-white/10 text-white/40">PAUSED</span>}
                              {!isPaused && isLeader && <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-[#00AFF0]/20 text-[#00AFF0]">LEADING</span>}
                              {!isPaused && !isLeader && <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-500/20 text-emerald-400">LIVE</span>}
                            </td>
                            <td className="px-3 py-1.5 text-right">
                              <Link href={`/ofm/${agencySlug}/${r.slug}`} className="text-[10px] font-black text-[#00AFF0]/60 hover:text-[#00AFF0]">edit</Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
