'use client';

import { useState, useEffect, useMemo } from 'react';
import { getNewsletterSubscribers, type NewsletterRow } from '@/lib/actions/newsletter';

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function NewsletterTab() {
  const [rows, setRows] = useState<NewsletterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');

  useEffect(() => {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') || '' : '';
    getNewsletterSubscribers(token).then((r) => {
      if (r.error) setError(r.error);
      else setRows(r.rows);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    if (!q.trim()) return rows;
    const s = q.trim().toLowerCase();
    return rows.filter((r) => r.email.toLowerCase().includes(s) || r.source.toLowerCase().includes(s));
  }, [rows, q]);

  const copyAll = () => {
    navigator.clipboard?.writeText(filtered.map((r) => r.email).join(', ')).catch(() => {});
  };

  if (loading) {
    return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#c0392f]" /></div>;
  }
  if (error) {
    return <div className="p-8 text-red-300 text-sm">{error}</div>;
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="mb-5">
        <h1 className="text-2xl font-black text-white">Newsletter</h1>
        <p className="text-gray-400 text-sm mt-0.5">Emails captured from the blog. No email service connected yet — these are stored for when we wire one up.</p>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-5">
        <div className="rounded-xl bg-white/[0.04] border border-white/10 p-3">
          <div className="text-lg font-black text-white">{rows.length}</div>
          <div className="text-[11px] text-gray-400 font-semibold">Total subscribers</div>
        </div>
        <div className="rounded-xl bg-white/[0.04] border border-white/10 p-3">
          <div className="text-lg font-black text-white">{rows.filter((r) => r.createdAt && Date.now() - new Date(r.createdAt).getTime() < 7 * 864e5).length}</div>
          <div className="text-[11px] text-gray-400 font-semibold">Last 7 days</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search email / source"
          className="px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/10 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-[#c0392f]/40 w-full sm:w-64" />
        <button onClick={copyAll} className="ml-auto px-3 py-1.5 rounded-lg text-xs font-bold bg-white/[0.05] text-gray-200 border border-white/10 hover:bg-white/10 transition-all">
          Copy all emails
        </button>
      </div>

      <div className="rounded-xl border border-white/10 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-white/[0.04] text-gray-400 text-[11px] uppercase tracking-wider">
              <th className="text-left font-bold px-3 py-2.5">Email</th>
              <th className="text-left font-bold px-3 py-2.5">Source</th>
              <th className="text-right font-bold px-3 py-2.5">Subscribed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.map((r) => (
              <tr key={r._id} className="hover:bg-white/[0.02]">
                <td className="px-3 py-2.5">
                  <a href={`mailto:${r.email}`} className="text-[#4ec3f7] hover:underline">{r.email}</a>
                </td>
                <td className="px-3 py-2.5 text-gray-300 text-xs">{r.source}</td>
                <td className="px-3 py-2.5 text-right text-gray-400 text-xs">{fmtDate(r.createdAt)}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={3} className="px-3 py-8 text-center text-gray-500 text-sm">No subscribers yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
