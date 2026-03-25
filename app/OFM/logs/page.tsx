'use client';

import { useState, useEffect, useCallback } from 'react';

interface ScrapeLog {
  _id: string;
  source: 'bulk' | 'search' | 'import';
  query: string;
  runId: string;
  actorId: string;
  status: 'running' | 'succeeded' | 'failed' | 'aborted' | 'timed-out';
  maxItems: number;
  totalItems: number;
  saved: number;
  skipped: number;
  clean: boolean;
  error: string;
  apiKeyHint: string;
  startedAt: string;
  completedAt: string | null;
  durationMs: number;
  createdAt: string;
}

interface Stats {
  totalRuns: number;
  totalSaved: number;
  totalItems: number;
  avgDuration: number;
  succeeded: number;
  failed: number;
  searchTriggered: number;
  bulkTriggered: number;
}

const STATUS_STYLES: Record<string, string> = {
  succeeded: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  running: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
  failed: 'bg-red-500/15 text-red-400 border-red-500/25',
  aborted: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  'timed-out': 'bg-orange-500/15 text-orange-400 border-orange-500/25',
};

const SOURCE_STYLES: Record<string, string> = {
  bulk: 'bg-purple-500/15 text-purple-400 border-purple-500/25',
  search: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/25',
  import: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/25',
};

const SOURCE_FILTERS = [
  { label: 'All Sources', value: 'all' },
  { label: 'Bulk', value: 'bulk' },
  { label: 'Search', value: 'search' },
  { label: 'Import', value: 'import' },
];

const STATUS_FILTERS = [
  { label: 'All Status', value: 'all' },
  { label: 'Succeeded', value: 'succeeded' },
  { label: 'Failed', value: 'failed' },
  { label: 'Running', value: 'running' },
  { label: 'Aborted', value: 'aborted' },
  { label: 'Timed Out', value: 'timed-out' },
];

function formatDuration(ms: number): string {
  if (!ms) return '—';
  if (ms < 1000) return `${ms}ms`;
  const secs = Math.round(ms / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  const remainSecs = secs % 60;
  return `${mins}m ${remainSecs}s`;
}

function formatDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export default function LogsPage() {
  const [logs, setLogs] = useState<ScrapeLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [sourceFilter, setSourceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stats, setStats] = useState<Stats | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [backfilling, setBackfilling] = useState(false);
  const [backfillResult, setBackfillResult] = useState<string | null>(null);

  const handleBackfill = async () => {
    if (!confirm('This will reconstruct scrape logs from SearchQuery records and creator data. Continue?')) return;
    setBackfilling(true);
    setBackfillResult(null);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/OFM/scrape-logs/backfill', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        const failedNote = data.failedSearchQueries > 0
          ? ` (${data.failedSearchQueries} failed search queries skipped — they didn't cost credits)`
          : '';
        setBackfillResult(
          `Backfilled ${data.searchCreated} search-triggered + ${data.bulkCreated} bulk scrape logs. Total now: ${data.totalNow}${failedNote}`,
        );
        fetchLogs();
      } else {
        setBackfillResult(`Error: ${data.error}`);
      }
    } catch (e: any) {
      setBackfillResult(`Error: ${e.message}`);
    } finally {
      setBackfilling(false);
    }
  };

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '50',
        source: sourceFilter,
        status: statusFilter,
      });
      const res = await fetch(`/api/OFM/scrape-logs?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setLogs(data.logs || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
      if (data.stats) setStats(data.stats);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [page, sourceFilter, statusFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this log entry?')) return;
    const token = localStorage.getItem('token');
    try {
      await fetch('/api/OFM/scrape-logs', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      setLogs((prev) => prev.filter((l) => l._id !== id));
      setTotal((prev) => prev - 1);
    } catch {
      alert('Failed to delete');
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Delete ALL scrape logs? This cannot be undone.')) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/OFM/scrape-logs', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ clearAll: true }),
      });
      const data = await res.json();
      if (data.success) {
        setLogs([]);
        setTotal(0);
        setStats(null);
      }
    } catch {
      alert('Failed to clear logs');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Scrape Logs</h1>
          <p className="text-white/40 text-sm mt-1">
            Every Apify scrape run logged with query, results &amp; duration. {total} total runs.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleBackfill}
            disabled={backfilling}
            className="px-4 py-2 bg-purple-600/15 border border-purple-600/25 rounded-xl text-purple-400 text-sm hover:bg-purple-600/25 transition disabled:opacity-40 flex items-center gap-2"
          >
            {backfilling && <span className="inline-block w-3.5 h-3.5 border-2 border-purple-400/40 border-t-purple-400 rounded-full animate-spin" />}
            {backfilling ? 'Backfilling...' : 'Backfill from History'}
          </button>
          <button
            onClick={fetchLogs}
            className="px-4 py-2 bg-white/[0.05] border border-white/[0.08] rounded-xl text-white/60 text-sm hover:bg-white/[0.10] transition"
          >
            Refresh
          </button>
          {total > 0 && (
            <button
              onClick={handleClearAll}
              className="px-4 py-2 bg-red-600/15 border border-red-600/25 rounded-xl text-red-400 text-sm hover:bg-red-600/25 transition"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Backfill result banner */}
      {backfillResult && (
        <div className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium ${
          backfillResult.startsWith('Error')
            ? 'bg-red-500/10 border border-red-500/20 text-red-400'
            : 'bg-purple-500/10 border border-purple-500/20 text-purple-400'
        }`}>
          <span>{backfillResult}</span>
          <button onClick={() => setBackfillResult(null)} className="text-white/30 hover:text-white/60 ml-4">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
      )}

      {/* Stats cards */}
      {stats && stats.totalRuns > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Total Runs" value={stats.totalRuns} />
          <StatCard label="Creators Saved" value={stats.totalSaved} />
          <StatCard label="Success Rate" value={`${stats.totalRuns > 0 ? Math.round((stats.succeeded / stats.totalRuns) * 100) : 0}%`} />
          <StatCard label="Avg Duration" value={formatDuration(stats.avgDuration)} />
          <StatCard label="Succeeded" value={stats.succeeded} color="emerald" />
          <StatCard label="Failed" value={stats.failed} color="red" />
          <StatCard label="From Search" value={stats.searchTriggered} color="cyan" />
          <StatCard label="From Bulk" value={stats.bulkTriggered} color="purple" />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {SOURCE_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => { setSourceFilter(f.value); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
              sourceFilter === f.value
                ? 'bg-[#00AFF0]/15 text-[#00AFF0] border-[#00AFF0]/30'
                : 'bg-white/[0.03] text-white/40 border-white/[0.06] hover:text-white/70'
            }`}
          >
            {f.label}
          </button>
        ))}
        <span className="w-px h-5 bg-white/[0.08]" />
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => { setStatusFilter(f.value); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
              statusFilter === f.value
                ? 'bg-[#00AFF0]/15 text-[#00AFF0] border-[#00AFF0]/30'
                : 'bg-white/[0.03] text-white/40 border-white/[0.06] hover:text-white/70'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Logs table */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left px-4 py-3 text-xs font-bold text-white/30 uppercase tracking-wider">Query</th>
                <th className="text-center px-3 py-3 text-xs font-bold text-white/30 uppercase tracking-wider">Source</th>
                <th className="text-center px-3 py-3 text-xs font-bold text-white/30 uppercase tracking-wider">Status</th>
                <th className="text-center px-3 py-3 text-xs font-bold text-white/30 uppercase tracking-wider">Items</th>
                <th className="text-center px-3 py-3 text-xs font-bold text-white/30 uppercase tracking-wider">Saved</th>
                <th className="text-center px-3 py-3 text-xs font-bold text-white/30 uppercase tracking-wider">Skipped</th>
                <th className="text-center px-3 py-3 text-xs font-bold text-white/30 uppercase tracking-wider">Duration</th>
                <th className="text-left px-3 py-3 text-xs font-bold text-white/30 uppercase tracking-wider">Started</th>
                <th className="text-center px-3 py-3 text-xs font-bold text-white/30 uppercase tracking-wider w-16" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }, (_, i) => (
                  <tr key={`sk-${i}`} className="border-b border-white/[0.04]">
                    {Array.from({ length: 9 }, (_, j) => (
                      <td key={j} className="px-3 py-3">
                        <div className="h-4 bg-white/[0.05] rounded w-16 mx-auto animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center text-white/20">
                    No scrape logs yet. They&apos;ll appear here when Apify scrapes run.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <>
                    <tr
                      key={log._id}
                      onClick={() => setExpandedId(expandedId === log._id ? null : log._id)}
                      className="border-b border-white/[0.04] hover:bg-white/[0.02] transition cursor-pointer"
                    >
                      <td className="px-4 py-3">
                        <span className="font-semibold text-white/80 capitalize">{log.query}</span>
                        {log.clean && (
                          <span className="ml-2 text-[9px] font-bold text-amber-400/70 uppercase">clean</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${SOURCE_STYLES[log.source] || ''}`}>
                          {log.source}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${STATUS_STYLES[log.status] || ''}`}>
                          {log.status === 'running' && (
                            <span className="inline-block w-2.5 h-2.5 border-2 border-blue-400/40 border-t-blue-400 rounded-full animate-spin" />
                          )}
                          {log.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center text-white/50 tabular-nums">{log.totalItems || '—'}</td>
                      <td className="px-3 py-3 text-center">
                        <span className="text-emerald-400 font-bold tabular-nums">{log.saved || '—'}</span>
                      </td>
                      <td className="px-3 py-3 text-center text-white/30 tabular-nums">{log.skipped || '—'}</td>
                      <td className="px-3 py-3 text-center text-white/40 tabular-nums text-xs">{formatDuration(log.durationMs)}</td>
                      <td className="px-3 py-3 text-white/40 text-xs whitespace-nowrap">{formatDate(log.startedAt)}</td>
                      <td className="px-3 py-3 text-center">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(log._id); }}
                          className="text-white/15 hover:text-red-400 transition"
                          title="Delete log"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </td>
                    </tr>

                    {/* Expanded details row */}
                    {expandedId === log._id && (
                      <tr key={`${log._id}-detail`} className="border-b border-white/[0.04]">
                        <td colSpan={9} className="px-6 py-4 bg-white/[0.01]">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                            <div>
                              <span className="text-white/30 block mb-0.5">Apify Run ID</span>
                              <span className="text-white/70 font-mono text-[11px] break-all">{log.runId || '—'}</span>
                            </div>
                            <div>
                              <span className="text-white/30 block mb-0.5">Actor</span>
                              <span className="text-white/70 font-mono text-[11px]">{log.actorId || '—'}</span>
                            </div>
                            <div>
                              <span className="text-white/30 block mb-0.5">Max Items Requested</span>
                              <span className="text-white/70 tabular-nums">{log.maxItems}</span>
                            </div>
                            <div>
                              <span className="text-white/30 block mb-0.5">API Key (hint)</span>
                              <span className="text-white/70 font-mono">...{log.apiKeyHint || '?'}</span>
                            </div>
                            <div>
                              <span className="text-white/30 block mb-0.5">Completed At</span>
                              <span className="text-white/70">{formatDate(log.completedAt)}</span>
                            </div>
                            <div>
                              <span className="text-white/30 block mb-0.5">Clean Mode</span>
                              <span className="text-white/70">{log.clean ? 'Yes (replaced category)' : 'No (additive)'}</span>
                            </div>
                            {log.error && (
                              <div className="col-span-2">
                                <span className="text-red-400/60 block mb-0.5">Error</span>
                                <span className="text-red-400/80 font-mono text-[11px] break-all">{log.error}</span>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.06]">
            <span className="text-xs text-white/30">
              Page {page} of {pages} ({total} total)
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

function StatCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  const colorMap: Record<string, string> = {
    emerald: 'text-emerald-400',
    red: 'text-red-400',
    cyan: 'text-cyan-400',
    purple: 'text-purple-400',
  };

  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3">
      <div className="text-[10px] font-bold text-white/30 uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-lg font-black tabular-nums ${color ? colorMap[color] || 'text-white' : 'text-white'}`}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
    </div>
  );
}
