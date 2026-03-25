'use client';

import { useState, useEffect, useCallback } from 'react';

interface SearchQueryItem {
  _id: string;
  query: string;
  queryNormalized: string;
  searchCount: number;
  lastSearchedAt: string;
  scraped: boolean;
  scrapeStatus: 'pending' | 'scraping' | 'done' | 'failed';
  scrapedAt: string | null;
  resultsCount: number;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  done: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  pending: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  scraping: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
  failed: 'bg-red-500/15 text-red-400 border-red-500/25',
};

const FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Scraped', value: 'scraped' },
  { label: 'Pending', value: 'pending' },
  { label: 'Scraping', value: 'scraping' },
  { label: 'Failed', value: 'failed' },
];

export default function QueriesPage() {
  const [queries, setQueries] = useState<SearchQueryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('searchCount');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [resetResult, setResetResult] = useState('');

  const handleResetStuck = async () => {
    if (!confirm('Reset all stuck (scraping/failed) queries to pending so they can retry on next search?')) return;
    setResetting(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/OFM/search-queries', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset-stuck' }),
      });
      const data = await res.json();
      if (data.success) {
        setResetResult(`Reset ${data.reset} stuck queries to pending`);
        fetchQueries();
        setTimeout(() => setResetResult(''), 4000);
      }
    } catch {
      setResetResult('Failed to reset');
    } finally {
      setResetting(false);
    }
  };

  const fetchQueries = useCallback(async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(
        `/api/OFM/search-queries?page=${page}&limit=50&sort=${sort}&order=desc&filter=${filter}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const data = await res.json();
      setQueries(data.queries || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
    } catch {
      setQueries([]);
    } finally {
      setLoading(false);
    }
  }, [page, sort, filter]);

  useEffect(() => {
    fetchQueries();
  }, [fetchQueries]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this query log?')) return;
    setDeletingId(id);
    const token = localStorage.getItem('token');
    try {
      await fetch('/api/OFM/search-queries', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      setQueries((prev) => prev.filter((q) => q._id !== id));
      setTotal((prev) => prev - 1);
    } catch {
      alert('Failed to delete');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white">Search Queries</h1>
          <p className="text-white/40 text-sm mt-1">
            {total} queries logged from user searches
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleResetStuck}
            disabled={resetting}
            className="px-4 py-2 bg-amber-500/15 border border-amber-500/25 rounded-xl text-amber-400 text-sm hover:bg-amber-500/25 transition disabled:opacity-40"
          >
            {resetting ? 'Resetting...' : 'Reset Stuck Queries'}
          </button>
          <button
            onClick={fetchQueries}
            className="px-4 py-2 bg-white/[0.05] border border-white/[0.08] rounded-xl text-white/60 text-sm hover:bg-white/[0.10] transition"
          >
            Refresh
          </button>
        </div>
      </div>

      {resetResult && (
        <div className="mb-4 px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-sm font-medium">
          {resetResult}
        </div>
      )}

      {/* Filters + Sort */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => { setFilter(f.value); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
              filter === f.value
                ? 'bg-[#00AFF0]/15 text-[#00AFF0] border-[#00AFF0]/30'
                : 'bg-white/[0.03] text-white/40 border-white/[0.06] hover:text-white/70'
            }`}
          >
            {f.label}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-white/30">Sort by</span>
          <select
            value={sort}
            onChange={(e) => { setSort(e.target.value); setPage(1); }}
            className="bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-white/70 outline-none"
          >
            <option value="searchCount">Most searched</option>
            <option value="lastSearchedAt">Most recent</option>
            <option value="createdAt">First seen</option>
            <option value="resultsCount">Results count</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left px-4 py-3 text-xs font-bold text-white/30 uppercase tracking-wider">Query</th>
                <th className="text-center px-3 py-3 text-xs font-bold text-white/30 uppercase tracking-wider">Searches</th>
                <th className="text-center px-3 py-3 text-xs font-bold text-white/30 uppercase tracking-wider">Status</th>
                <th className="text-center px-3 py-3 text-xs font-bold text-white/30 uppercase tracking-wider">Results</th>
                <th className="text-left px-3 py-3 text-xs font-bold text-white/30 uppercase tracking-wider">Last Searched</th>
                <th className="text-left px-3 py-3 text-xs font-bold text-white/30 uppercase tracking-wider">Scraped At</th>
                <th className="text-center px-3 py-3 text-xs font-bold text-white/30 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }, (_, i) => (
                  <tr key={`sk-${i}`} className="border-b border-white/[0.04]">
                    <td className="px-4 py-3"><div className="h-4 bg-white/[0.05] rounded w-40 animate-pulse" /></td>
                    <td className="px-3 py-3 text-center"><div className="h-4 bg-white/[0.05] rounded w-8 mx-auto animate-pulse" /></td>
                    <td className="px-3 py-3 text-center"><div className="h-5 bg-white/[0.05] rounded w-16 mx-auto animate-pulse" /></td>
                    <td className="px-3 py-3 text-center"><div className="h-4 bg-white/[0.05] rounded w-8 mx-auto animate-pulse" /></td>
                    <td className="px-3 py-3"><div className="h-4 bg-white/[0.05] rounded w-24 animate-pulse" /></td>
                    <td className="px-3 py-3"><div className="h-4 bg-white/[0.05] rounded w-24 animate-pulse" /></td>
                    <td className="px-3 py-3 text-center"><div className="h-4 bg-white/[0.05] rounded w-10 mx-auto animate-pulse" /></td>
                  </tr>
                ))
              ) : queries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-white/20">
                    No search queries yet. They&apos;ll appear here when users search on /onlyfans-search.
                  </td>
                </tr>
              ) : (
                queries.map((q) => (
                  <tr key={q._id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition">
                    <td className="px-4 py-3">
                      <span className="font-semibold text-white/80">{q.query}</span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="font-black text-white tabular-nums">{q.searchCount}</span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${STATUS_COLORS[q.scrapeStatus] || STATUS_COLORS.pending}`}>
                        {q.scrapeStatus}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="text-white/50 tabular-nums">{q.resultsCount}</span>
                    </td>
                    <td className="px-3 py-3 text-white/40 text-xs">{formatDate(q.lastSearchedAt)}</td>
                    <td className="px-3 py-3 text-white/40 text-xs">{formatDate(q.scrapedAt)}</td>
                    <td className="px-3 py-3 text-center">
                      <button
                        onClick={() => handleDelete(q._id)}
                        disabled={deletingId === q._id}
                        className="text-white/20 hover:text-red-400 transition disabled:opacity-30"
                        title="Delete"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.06]">
            <span className="text-xs text-white/30">
              Page {page} of {pages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs text-white/50 hover:text-white/80 disabled:opacity-30 transition"
              >
                Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page >= pages}
                className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs text-white/50 hover:text-white/80 disabled:opacity-30 transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
