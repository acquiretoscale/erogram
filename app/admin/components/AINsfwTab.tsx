'use client';

import { useState, useEffect, useCallback } from 'react';
import { AI_NSFW_TOOLS } from '@/app/ainsfw/data';
import type { AINsfwTool } from '@/app/ainsfw/types';
import {
  getAllToolStats,
  adminSetToolVotes,
  adminDeleteReview,
  type ToolStatsData,
} from '@/lib/actions/ainsfw';

type SortKey = 'name' | 'category' | 'upvotes' | 'downvotes' | 'score' | 'reviews';

export default function AINsfwTab() {
  const [stats, setStats] = useState<Record<string, ToolStatsData>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('All');
  const [sortKey, setSortKey] = useState<SortKey>('score');
  const [sortAsc, setSortAsc] = useState(false);
  const [editSlug, setEditSlug] = useState<string | null>(null);
  const [editUp, setEditUp] = useState(0);
  const [editDown, setEditDown] = useState(0);
  const [reviewSlug, setReviewSlug] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const slugs = AI_NSFW_TOOLS.map((t) => t.slug);
      const data = await getAllToolStats(slugs);
      setStats(data);
    } catch {
      showToast('Failed to load stats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const getStats = (slug: string): ToolStatsData =>
    stats[slug] || { upvotes: 0, downvotes: 0, reviews: [] };

  const score = (slug: string) => {
    const s = getStats(slug);
    return s.upvotes - s.downvotes;
  };

  const openEdit = (tool: AINsfwTool) => {
    const s = getStats(tool.slug);
    setEditSlug(tool.slug);
    setEditUp(s.upvotes);
    setEditDown(s.downvotes);
  };

  const saveVotes = async () => {
    if (!editSlug) return;
    setSaving(editSlug);
    try {
      const result = await adminSetToolVotes(editSlug, editUp, editDown);
      setStats((prev) => ({
        ...prev,
        [editSlug]: { ...getStats(editSlug), upvotes: result.upvotes, downvotes: result.downvotes },
      }));
      setEditSlug(null);
      showToast('Votes updated');
    } catch {
      showToast('Failed to save');
    } finally {
      setSaving(null);
    }
  };

  const handleDeleteReview = async (slug: string, idx: number) => {
    setSaving(slug);
    try {
      const result = await adminDeleteReview(slug, idx);
      setStats((prev) => ({ ...prev, [slug]: result }));
      showToast('Review deleted');
    } catch {
      showToast('Failed to delete review');
    } finally {
      setSaving(null);
    }
  };

  const categories = ['All', ...new Set(AI_NSFW_TOOLS.map((t) => t.category))];

  const filtered = AI_NSFW_TOOLS.filter((t) => {
    if (catFilter !== 'All' && t.category !== catFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return t.name.toLowerCase().includes(q) || t.vendor.toLowerCase().includes(q) || t.slug.includes(q);
    }
    return true;
  }).sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case 'name': cmp = a.name.localeCompare(b.name); break;
      case 'category': cmp = a.category.localeCompare(b.category); break;
      case 'upvotes': cmp = getStats(a.slug).upvotes - getStats(b.slug).upvotes; break;
      case 'downvotes': cmp = getStats(a.slug).downvotes - getStats(b.slug).downvotes; break;
      case 'score': cmp = score(a.slug) - score(b.slug); break;
      case 'reviews': cmp = (getStats(a.slug).reviews?.length || 0) - (getStats(b.slug).reviews?.length || 0); break;
    }
    return sortAsc ? cmp : -cmp;
  });

  const handleSort = (key: SortKey) => {
    if (sortKey === key) { setSortAsc(!sortAsc); }
    else { setSortKey(key); setSortAsc(false); }
  };

  const sortIcon = (key: SortKey) =>
    sortKey === key ? (sortAsc ? ' ▲' : ' ▼') : '';

  const totalUp = Object.values(stats).reduce((s, v) => s + (v.upvotes || 0), 0);
  const totalDown = Object.values(stats).reduce((s, v) => s + (v.downvotes || 0), 0);
  const totalReviews = Object.values(stats).reduce((s, v) => s + (v.reviews?.length || 0), 0);
  const toolsWithVotes = Object.values(stats).filter((v) => v.upvotes > 0 || v.downvotes > 0).length;

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-[100] bg-green-600 text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-xl animate-fade-in">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">AI NSFW Tools</h1>
          <p className="text-sm text-white/40 mt-0.5">Manage upvotes, downvotes & reviews</p>
        </div>
        <button
          onClick={fetchStats}
          disabled={loading}
          className="px-4 py-2 rounded-lg text-sm font-semibold bg-white/[0.06] border border-white/[0.10] text-white/70 hover:text-white hover:bg-white/[0.10] transition-all disabled:opacity-40"
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Tools', value: AI_NSFW_TOOLS.length, color: 'text-blue-400' },
          { label: 'Tools with Votes', value: toolsWithVotes, color: 'text-emerald-400' },
          { label: 'Total Upvotes', value: totalUp, color: 'text-green-400' },
          { label: 'Total Reviews', value: totalReviews, color: 'text-yellow-400' },
        ].map((c) => (
          <div key={c.label} className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4">
            <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider">{c.label}</p>
            <p className={`text-2xl font-bold mt-1 ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tools..."
          className="flex-1 px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.10] text-white text-sm placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        />
        <select
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.10] text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none cursor-pointer"
        >
          {categories.map((c) => (
            <option key={c} value={c} className="bg-[#1a1a1a]">{c}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-white/[0.04] border-b border-white/[0.08]">
              {[
                { key: 'name' as SortKey, label: 'Tool' },
                { key: 'category' as SortKey, label: 'Category' },
                { key: 'upvotes' as SortKey, label: 'Upvotes' },
                { key: 'downvotes' as SortKey, label: 'Downvotes' },
                { key: 'score' as SortKey, label: 'Score' },
                { key: 'reviews' as SortKey, label: 'Reviews' },
              ].map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-white/50 cursor-pointer hover:text-white/80 transition-colors whitespace-nowrap select-none"
                >
                  {col.label}{sortIcon(col.key)}
                </th>
              ))}
              <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-white/50">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05]">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="px-4 py-3" colSpan={7}><div className="h-4 bg-white/[0.06] rounded w-full" /></td>
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td className="px-4 py-8 text-center text-white/30" colSpan={7}>No tools found</td></tr>
            ) : (
              filtered.map((tool) => {
                const s = getStats(tool.slug);
                const sc = s.upvotes - s.downvotes;
                return (
                  <tr key={tool.slug} className="hover:bg-white/[0.03] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={tool.image || '/assets/image.jpg'}
                          alt={tool.name}
                          className="w-8 h-8 rounded-md object-cover shrink-0 border border-white/10"
                        />
                        <div>
                          <p className="text-white font-medium text-[13px] truncate max-w-[180px]">{tool.name}</p>
                          <p className="text-white/30 text-[11px]">{tool.vendor}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-white/[0.06] text-white/60">{tool.category}</span>
                    </td>
                    <td className="px-4 py-3 text-green-400 font-semibold">{s.upvotes}</td>
                    <td className="px-4 py-3 text-red-400 font-semibold">{s.downvotes}</td>
                    <td className="px-4 py-3">
                      <span className={`font-bold ${sc > 0 ? 'text-green-400' : sc < 0 ? 'text-red-400' : 'text-white/30'}`}>
                        {sc > 0 ? `+${sc}` : sc}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {(s.reviews?.length || 0) > 0 ? (
                        <button
                          onClick={() => setReviewSlug(reviewSlug === tool.slug ? null : tool.slug)}
                          className="text-yellow-400 hover:text-yellow-300 font-semibold transition-colors"
                        >
                          {s.reviews.length}
                        </button>
                      ) : (
                        <span className="text-white/20">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => openEdit(tool)}
                        className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-500/20 transition-all"
                      >
                        Edit Votes
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Reviews panel */}
      {reviewSlug && (
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-bold text-sm">
              Reviews for {AI_NSFW_TOOLS.find((t) => t.slug === reviewSlug)?.name}
            </h3>
            <button onClick={() => setReviewSlug(null)} className="text-white/30 hover:text-white transition-colors text-lg leading-none">&times;</button>
          </div>
          {(getStats(reviewSlug).reviews?.length || 0) === 0 ? (
            <p className="text-white/30 text-sm">No reviews yet</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {getStats(reviewSlug).reviews.map((r, i) => (
                <div key={i} className="flex items-start justify-between gap-3 bg-white/[0.04] rounded-lg p-3 border border-white/[0.06]">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <span key={s} className={`text-xs ${s <= r.rating ? 'text-yellow-400' : 'text-white/15'}`}>&#9733;</span>
                        ))}
                      </div>
                      <span className="text-white/30 text-[10px]">{r.createdAt}</span>
                    </div>
                    <p className="text-white/70 text-xs leading-relaxed">{r.text}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteReview(reviewSlug, i)}
                    disabled={saving === reviewSlug}
                    className="shrink-0 px-2 py-1 rounded text-[10px] font-semibold bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-500/20 transition-all disabled:opacity-40"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Edit modal */}
      {editSlug && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setEditSlug(null)}>
          <div className="bg-[#141414] rounded-2xl border border-white/[0.10] shadow-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-white font-bold text-base mb-1">
              Edit Votes
            </h3>
            <p className="text-white/40 text-sm mb-5">
              {AI_NSFW_TOOLS.find((t) => t.slug === editSlug)?.name}
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-1.5 block">Upvotes</label>
                <input
                  type="number"
                  min={0}
                  value={editUp}
                  onChange={(e) => setEditUp(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-3 py-2.5 rounded-lg bg-white/[0.06] border border-white/[0.10] text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500/50"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-1.5 block">Downvotes</label>
                <input
                  type="number"
                  min={0}
                  value={editDown}
                  onChange={(e) => setEditDown(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-3 py-2.5 rounded-lg bg-white/[0.06] border border-white/[0.10] text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50"
                />
              </div>
              <div className="text-center">
                <span className={`text-lg font-bold ${editUp - editDown > 0 ? 'text-green-400' : editUp - editDown < 0 ? 'text-red-400' : 'text-white/30'}`}>
                  Score: {editUp - editDown > 0 ? '+' : ''}{editUp - editDown}
                </span>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditSlug(null)}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white/50 hover:text-white bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.08] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={saveVotes}
                disabled={saving === editSlug}
                className="flex-1 py-2.5 rounded-lg text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white transition-all disabled:opacity-40"
              >
                {saving === editSlug ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
