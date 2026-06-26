'use client';

import { useState, useEffect, useMemo } from 'react';
import { getLeads, type Lead } from '@/lib/actions/leads';

type SegFilter = 'all' | 'agency' | 'paid' | 'free' | 'hot';

const SEG_META: Record<Lead['segment'], { label: string; cls: string }> = {
  agency: { label: 'Agency', cls: 'bg-violet-500/15 text-violet-300 border-violet-500/25' },
  paid: { label: 'Paid', cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25' },
  free: { label: 'Free', cls: 'bg-white/10 text-gray-300 border-white/15' },
};

function tgLink(handle: string) {
  const h = handle.replace(/^@/, '').replace(/^https?:\/\/t\.me\//, '').trim();
  return h ? `https://t.me/${h}` : '';
}

export default function LeadsTab() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<SegFilter>('all');
  const [q, setQ] = useState('');

  useEffect(() => {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') || '' : '';
    getLeads(token).then((r) => {
      if (r.error) setError(r.error);
      else setLeads(r.leads);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    let rows = leads;
    if (filter === 'hot') rows = rows.filter((l) => l.hotUpsell);
    else if (filter !== 'all') rows = rows.filter((l) => l.segment === filter);
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      rows = rows.filter((l) => l.username.toLowerCase().includes(s) || l.email.toLowerCase().includes(s) || l.telegram.toLowerCase().includes(s));
    }
    return rows;
  }, [leads, filter, q]);

  const totals = useMemo(() => ({
    count: leads.length,
    agencies: leads.filter((l) => l.segment === 'agency').length,
    paid: leads.filter((l) => l.segment === 'paid').length,
    hot: leads.filter((l) => l.hotUpsell).length,
    revenue: Math.round(leads.reduce((s, l) => s + l.paidUsd, 0)),
  }), [leads]);

  if (loading) {
    return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#00AFF0]" /></div>;
  }
  if (error) {
    return <div className="p-8 text-red-300 text-sm">{error}</div>;
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <div className="mb-5">
        <h1 className="text-2xl font-black text-white">Leads</h1>
        <p className="text-gray-400 text-sm mt-0.5">Group, bot &amp; AI NSFW posters — your outreach &amp; upsell list.</p>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-5">
        {[
          { label: 'Total leads', val: totals.count },
          { label: 'Agencies', val: totals.agencies },
          { label: 'Paid', val: totals.paid },
          { label: 'Hot upsell', val: totals.hot },
          { label: 'Revenue', val: `$${totals.revenue.toLocaleString()}` },
        ].map((s) => (
          <div key={s.label} className="rounded-xl bg-white/[0.04] border border-white/10 p-3">
            <div className="text-lg font-black text-white">{s.val}</div>
            <div className="text-[11px] text-gray-400 font-semibold">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {(['all', 'agency', 'paid', 'free', 'hot'] as SegFilter[]).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${filter === f ? 'bg-[#00AFF0] text-white' : 'bg-white/[0.05] text-gray-300 border border-white/10 hover:bg-white/10'}`}>
            {f === 'hot' ? '🔥 Hot upsell' : f}
          </button>
        ))}
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search username / email / telegram"
          className="ml-auto px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/10 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-[#00AFF0]/40 w-full sm:w-64" />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-white/10 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-white/[0.04] text-gray-400 text-[11px] uppercase tracking-wider">
              <th className="text-left font-bold px-3 py-2.5">Lead</th>
              <th className="text-left font-bold px-3 py-2.5">Contact</th>
              <th className="text-center font-bold px-3 py-2.5">Groups</th>
              <th className="text-center font-bold px-3 py-2.5">Bots</th>
              <th className="text-center font-bold px-3 py-2.5">AI</th>
              <th className="text-right font-bold px-3 py-2.5">Paid</th>
              <th className="text-right font-bold px-3 py-2.5">Top clicks</th>
              <th className="text-left font-bold px-3 py-2.5">Segment</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.map((l) => (
              <tr key={l.userId} className="hover:bg-white/[0.02]">
                <td className="px-3 py-2.5">
                  <div className="font-bold text-white flex items-center gap-2">
                    {l.username}
                    {l.hotUpsell && <span title="Free poster with traction — prime upsell" className="text-[10px]">🔥</span>}
                    {l.hasActiveBoost && <span title="Active boost" className="text-[10px] text-[#00AFF0]">●</span>}
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex flex-col gap-0.5">
                    {l.telegram && <a href={tgLink(l.telegram)} target="_blank" rel="noopener noreferrer" className="text-[#4ec3f7] text-xs hover:underline">@{l.telegram.replace(/^@/, '')}</a>}
                    {l.email && <a href={`mailto:${l.email}`} className="text-gray-400 text-xs hover:underline truncate max-w-[180px]">{l.email}</a>}
                    {!l.telegram && !l.email && <span className="text-gray-600 text-xs">—</span>}
                  </div>
                </td>
                <td className="px-3 py-2.5 text-center text-gray-300">{l.groups || '—'}</td>
                <td className="px-3 py-2.5 text-center text-gray-300">{l.bots || '—'}</td>
                <td className="px-3 py-2.5 text-center text-gray-300">{l.ainsfw || '—'}</td>
                <td className="px-3 py-2.5 text-right font-bold text-emerald-300">{l.paidUsd > 0 ? `$${l.paidUsd}` : '—'}</td>
                <td className="px-3 py-2.5 text-right text-gray-300">{l.topClicks || '—'}</td>
                <td className="px-3 py-2.5">
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${SEG_META[l.segment].cls}`}>{SEG_META[l.segment].label}</span>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="px-3 py-8 text-center text-gray-500 text-sm">No leads match this filter.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
