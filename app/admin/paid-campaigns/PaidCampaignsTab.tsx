'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  getPaidCampaigns,
  setCampaignStatus,
  markCampaignPaid,
  searchUsersForAssign,
  assignCampaignOwner,
  type PaidCampaignRow,
} from '@/lib/actions/paidCampaigns';

const TYPE_LABEL: Record<string, string> = { group: 'Group', bot: 'Bot', ainsfw: 'AI NSFW' };
const TYPE_COLOR: Record<string, string> = {
  group: 'bg-[#00AFF0]/15 text-[#4ec3f7] border-[#00AFF0]/25',
  bot: 'bg-violet-500/15 text-violet-300 border-violet-500/25',
  ainsfw: 'bg-pink-500/15 text-pink-300 border-pink-500/25',
};

function StatusPill({ status }: { status: string }) {
  if (status === 'approved') {
    return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/25"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />Approved</span>;
  }
  if (status === 'rejected') {
    return <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-red-500/15 text-red-300 border border-red-500/25">Rejected</span>;
  }
  return <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/25 animate-pulse">Pending</span>;
}

export default function PaidCampaignsTab() {
  const [rows, setRows] = useState<PaidCampaignRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [filter, setFilter] = useState<'all' | 'group' | 'bot' | 'ainsfw'>('all');
  const [busyId, setBusyId] = useState<string | null>(null);

  // Assign-owner modal
  const [assignFor, setAssignFor] = useState<PaidCampaignRow | null>(null);
  const [assignQuery, setAssignQuery] = useState('');
  const [assignResults, setAssignResults] = useState<{ _id: string; username: string; email: string }[]>([]);
  const [assignSearching, setAssignSearching] = useState(false);

  const token = () => localStorage.getItem('token') || '';
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(''), 3000); };

  const load = async () => {
    setLoading(true);
    const res = await getPaidCampaigns(token());
    if (res.rows) setRows(res.rows);
    else if (res.error) flash(res.error);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(
    () => (filter === 'all' ? rows : rows.filter((r) => r.entityType === filter)),
    [rows, filter],
  );

  const totals = useMemo(() => {
    const usd = rows.reduce((s, r) => s + (r.paid ? (r.amountUsd || 0) : 0), 0);
    const clicks = rows.reduce((s, r) => s + r.clicks, 0);
    const views = rows.reduce((s, r) => s + r.views, 0);
    const active = rows.filter((r) => r.daysLeft != null && r.daysLeft > 0).length;
    const pending = rows.filter((r) => r.status === 'pending').length;
    return { usd: Math.round(usd), clicks, views, active, pending, count: rows.length };
  }, [rows]);

  const doStatus = async (r: PaidCampaignRow, status: 'approved' | 'rejected') => {
    setBusyId(r._id);
    const res = await setCampaignStatus(token(), r.entityType, r._id, status);
    setBusyId(null);
    if (res.error) { flash(res.error); return; }
    setRows((prev) => prev.map((x) => (x._id === r._id ? { ...x, status } : x)));
    flash(`Marked ${status}`);
  };

  const doMarkPaid = async (r: PaidCampaignRow) => {
    setBusyId(r._id);
    const res = await markCampaignPaid(token(), r.entityType, r._id);
    setBusyId(null);
    if (res.error) { flash(res.error); return; }
    setRows((prev) => prev.map((x) => (x._id === r._id ? { ...x, paid: true, status: 'approved' } : x)));
    flash('Marked as paid');
  };

  const runAssignSearch = async (q: string) => {
    setAssignQuery(q);
    if (q.trim().length < 2) { setAssignResults([]); return; }
    setAssignSearching(true);
    const res = await searchUsersForAssign(token(), q);
    setAssignSearching(false);
    if (res.users) setAssignResults(res.users);
  };

  const doAssign = async (userId: string, username: string) => {
    if (!assignFor) return;
    const res = await assignCampaignOwner(token(), assignFor.entityType, assignFor._id, userId);
    if (res.error) { flash(res.error); return; }
    setRows((prev) => prev.map((x) => (x._id === assignFor._id ? { ...x, ownerId: userId, ownerName: res.ownerName || username } : x)));
    setAssignFor(null); setAssignQuery(''); setAssignResults([]);
    flash(`Assigned to @${res.ownerName || username}`);
  };

  return (
    <div className="min-h-screen bg-[#080c10] text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-black">Paid Campaigns</h1>
          <p className="text-white/40 text-sm mt-1">All paid boosts & listings across Groups, Bots, and AI NSFW.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            { label: 'Total revenue', value: `$${totals.usd.toLocaleString()}` },
            { label: 'Campaigns', value: totals.count },
            { label: 'Active boosts', value: totals.active },
            { label: 'Total clicks', value: totals.clicks.toLocaleString() },
            { label: 'Pending', value: totals.pending },
          ].map((s) => (
            <div key={s.label} className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-4">
              <div className="text-white/40 text-[11px] font-bold uppercase tracking-wide">{s.label}</div>
              <div className="text-xl font-black mt-1">{s.value}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-4">
          {(['all', 'group', 'bot', 'ainsfw'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition ${filter === f ? 'bg-[#00AFF0] text-white' : 'bg-white/[0.05] text-white/60 hover:bg-white/[0.08] border border-white/10'}`}
            >
              {f === 'all' ? 'All' : TYPE_LABEL[f]}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-white/40">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-white/40">No campaigns found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-white/40 text-[11px] uppercase tracking-wide border-b border-white/[0.06]">
                    <th className="px-4 py-3 font-bold">Listing</th>
                    <th className="px-4 py-3 font-bold">Type</th>
                    <th className="px-4 py-3 font-bold">Tier / Paid</th>
                    <th className="px-4 py-3 font-bold">Status</th>
                    <th className="px-4 py-3 font-bold">Duration</th>
                    <th className="px-4 py-3 font-bold">Views / Clicks</th>
                    <th className="px-4 py-3 font-bold">Contact</th>
                    <th className="px-4 py-3 font-bold">Owner</th>
                    <th className="px-4 py-3 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filtered.map((r) => (
                    <tr key={`${r.entityType}-${r._id}`} className="hover:bg-white/[0.02]">
                      {/* Listing */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg overflow-hidden bg-white/[0.06] shrink-0">
                            {r.image ? <img src={r.image} alt="" className="w-full h-full object-cover" /> : null}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold truncate max-w-[180px]">{r.name}</div>
                            {r.status === 'approved' && r.slug && (
                              <a href={`/${r.slug}`} target="_blank" rel="noopener noreferrer" className="text-[11px] text-[#00AFF0] hover:underline">View ↗</a>
                            )}
                          </div>
                        </div>
                      </td>
                      {/* Type */}
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-md text-[11px] font-bold border ${TYPE_COLOR[r.entityType]}`}>{TYPE_LABEL[r.entityType]}</span>
                      </td>
                      {/* Tier / paid */}
                      <td className="px-4 py-3">
                        <div className="font-bold capitalize">{r.tier}</div>
                        <div className="text-[11px] text-white/40">
                          {r.amountStars != null ? `${r.amountStars.toLocaleString()}★ · ` : ''}
                          {r.amountUsd != null ? `$${r.amountUsd}` : '—'}
                          {r.paid ? <span className="text-emerald-400"> ✓</span> : <span className="text-amber-400"> unpaid</span>}
                        </div>
                      </td>
                      {/* Status */}
                      <td className="px-4 py-3"><StatusPill status={r.status} /></td>
                      {/* Duration */}
                      <td className="px-4 py-3">
                        {r.daysLeft != null && r.daysLeft > 0 ? (
                          <span className="text-emerald-300 font-bold">{r.daysLeft}d left</span>
                        ) : r.boostExpiresAt ? (
                          <span className="text-white/30">Expired</span>
                        ) : (
                          <span className="text-white/30">—</span>
                        )}
                      </td>
                      {/* Views/Clicks */}
                      <td className="px-4 py-3 text-white/70">
                        {r.views.toLocaleString()} / <span className="text-white">{r.clicks.toLocaleString()}</span>
                      </td>
                      {/* Contact */}
                      <td className="px-4 py-3">
                        <div className="text-[11px] text-white/60 max-w-[160px] truncate">
                          {r.contactTelegram || r.contactEmail || <span className="text-white/25">none</span>}
                        </div>
                      </td>
                      {/* Owner */}
                      <td className="px-4 py-3">
                        {r.ownerName ? (
                          <span className="text-[12px] font-bold text-white/80">@{r.ownerName}</span>
                        ) : (
                          <span className="text-[11px] text-white/30">unassigned</span>
                        )}
                      </td>
                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {r.status !== 'approved' && (
                            <button disabled={busyId === r._id} onClick={() => doStatus(r, 'approved')} className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 hover:bg-emerald-500/25 disabled:opacity-40">Approve</button>
                          )}
                          {r.status !== 'rejected' && (
                            <button disabled={busyId === r._id} onClick={() => doStatus(r, 'rejected')} className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-red-500/10 text-red-300 border border-red-500/20 hover:bg-red-500/20 disabled:opacity-40">Reject</button>
                          )}
                          {!r.paid && (
                            <button disabled={busyId === r._id} onClick={() => doMarkPaid(r)} className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-[#00AFF0]/15 text-[#4ec3f7] border border-[#00AFF0]/25 hover:bg-[#00AFF0]/25 disabled:opacity-40">Mark paid</button>
                          )}
                          <button onClick={() => { setAssignFor(r); setAssignQuery(''); setAssignResults([]); }} className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-white/[0.05] text-white/70 border border-white/10 hover:bg-white/[0.1]">Assign</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Assign-owner modal */}
      {assignFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setAssignFor(null)}>
          <div className="bg-[#0c1116] border border-white/10 rounded-2xl p-5 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-black text-lg mb-1">Assign owner</h3>
            <p className="text-white/40 text-sm mb-4">Link <span className="text-white font-bold">{assignFor.name}</span> to an Erogram account. They&apos;ll then manage it in their dashboard.</p>
            <input
              autoFocus
              value={assignQuery}
              onChange={(e) => runAssignSearch(e.target.value)}
              placeholder="Search username or email…"
              className="w-full px-3 py-2.5 bg-white/[0.05] border border-white/10 rounded-lg text-white text-sm outline-none focus:border-[#00AFF0]/40 mb-3"
            />
            <div className="max-h-64 overflow-y-auto divide-y divide-white/[0.04]">
              {assignSearching && <div className="text-white/40 text-sm py-3 text-center">Searching…</div>}
              {!assignSearching && assignQuery.length >= 2 && assignResults.length === 0 && (
                <div className="text-white/40 text-sm py-3 text-center">No users found.</div>
              )}
              {assignResults.map((u) => (
                <button key={u._id} onClick={() => doAssign(u._id, u.username)} className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-white/[0.04] text-left">
                  <div>
                    <div className="font-bold text-sm">@{u.username || '(no username)'}</div>
                    <div className="text-[11px] text-white/40">{u.email}</div>
                  </div>
                  <span className="text-[#00AFF0] text-xs font-bold">Assign →</span>
                </button>
              ))}
            </div>
            <button onClick={() => setAssignFor(null)} className="mt-4 w-full py-2.5 rounded-lg bg-white/[0.05] border border-white/10 text-white/70 text-sm font-bold hover:bg-white/[0.1]">Cancel</button>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl bg-[#00AFF0] text-white text-sm font-bold shadow-lg shadow-[#00AFF0]/30">
          {toast}
        </div>
      )}
    </div>
  );
}
