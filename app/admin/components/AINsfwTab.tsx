'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { AI_NSFW_TOOLS } from '@/app/ainsfw/data';
import type { AINsfwTool } from '@/app/ainsfw/types';
import {
  getAllToolStats,
  adminSetToolVotes,
  adminDeleteReview,
  adminEditTool,
  getAdminSubmissions,
  type ToolStatsData,
  type AdminSubmission,
} from '@/lib/actions/ainsfw';
import { requestPresignedUpload } from '@/lib/actions/presignedUpload';

type SortKey = 'name' | 'category' | 'upvotes' | 'downvotes' | 'score' | 'reviews';

export default function AINsfwTab() {
  const [stats, setStats] = useState<Record<string, ToolStatsData>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('All');
  const [sortKey, setSortKey] = useState<SortKey>('score');
  const [sortAsc, setSortAsc] = useState(false);
  const [reviewSlug, setReviewSlug] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  const [subs, setSubs] = useState<AdminSubmission[]>([]);

  // Edit modal state
  const [editSlug, setEditSlug] = useState<string | null>(null);
  const [editUp, setEditUp] = useState(0);
  const [editDown, setEditDown] = useState(0);
  const [editDesc, setEditDesc] = useState('');
  const [editDescDe, setEditDescDe] = useState('');
  const [editDescEs, setEditDescEs] = useState('');
  const [editFeatured, setEditFeatured] = useState(false);
  const [editFeaturedDays, setEditFeaturedDays] = useState(30);
  const [editGallery, setEditGallery] = useState<string[]>([]);
  const [editTab, setEditTab] = useState<'content' | 'featured' | 'votes'>('content');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const fetchSubs = useCallback(async () => {
    try {
      const data = await getAdminSubmissions();
      setSubs(data);
    } catch {}
  }, []);

  const staticSlugs = new Set(AI_NSFW_TOOLS.map((t) => t.slug));
  const paidSubTools: AINsfwTool[] = subs
    .filter((s) => s.paymentStatus === 'paid' && !staticSlugs.has(s.slug))
    .map((s) => ({
      slug: s.slug, name: s.name, category: s.category as AINsfwTool['category'],
      vendor: s.vendor || s.name, description: s.description, image: s.image || '/assets/image.jpg',
      tags: [], subscription: '', payment: [], tryNowUrl: s.websiteUrl, sourceUrl: s.websiteUrl,
    }));
  const allAdminTools = [...AI_NSFW_TOOLS, ...paidSubTools];

  const fetchStats = useCallback(async (slugs: string[]) => {
    setLoading(true);
    try {
      const data = await getAllToolStats(slugs);
      setStats((prev) => ({ ...prev, ...data }));
    } catch {
      showToast('Failed to load stats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSubs(); }, [fetchSubs]);
  useEffect(() => {
    const slugs = allAdminTools.map((t) => t.slug);
    if (slugs.length > 0) fetchStats(slugs);
  }, [subs]);

  const getStats = (slug: string): ToolStatsData =>
    stats[slug] || { upvotes: 0, downvotes: 0, featured: false, reviews: [], gallery: [] };

  const score = (slug: string) => { const s = getStats(slug); return s.upvotes - s.downvotes; };

  const openEdit = (tool: AINsfwTool) => {
    const s = getStats(tool.slug);
    setEditSlug(tool.slug);
    setEditUp(s.upvotes);
    setEditDown(s.downvotes);
    setEditDesc(s.description || tool.description || '');
    setEditDescDe(s.description_de || (tool as any).description_de || '');
    setEditDescEs(s.description_es || (tool as any).description_es || '');
    setEditFeatured(s.featured);
    setEditFeaturedDays(30);
    setEditGallery(s.gallery || []);
    setEditTab('content');
  };

  const saveEdit = async () => {
    if (!editSlug) return;
    setSaving(editSlug);
    try {
      const [voteResult, editResult] = await Promise.all([
        adminSetToolVotes(editSlug, editUp, editDown),
        adminEditTool(editSlug, {
          description: editDesc,
          description_de: editDescDe,
          description_es: editDescEs,
          featured: editFeatured,
          featuredDays: editFeaturedDays,
          gallery: editGallery,
        }),
      ]);
      setStats((prev) => ({
        ...prev,
        [editSlug]: { ...editResult, upvotes: voteResult.upvotes, downvotes: voteResult.downvotes },
      }));
      setEditSlug(null);
      showToast('Tool updated');
    } catch {
      showToast('Failed to save');
    } finally {
      setSaving(null);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const res = await requestPresignedUpload(file.type);
        if ('error' in res || !res.uploadUrl) { showToast(res.error || 'Upload failed'); continue; }
        await fetch(res.uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
        setEditGallery((prev) => [...prev, res.publicUrl!]);
      }
      showToast('Images uploaded');
    } catch {
      showToast('Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeGalleryImage = (idx: number) => {
    setEditGallery((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleDeleteReview = async (slug: string, idx: number) => {
    setSaving(slug);
    try {
      const result = await adminDeleteReview(slug, idx);
      setStats((prev) => ({ ...prev, [slug]: result }));
      showToast('Review deleted');
    } catch { showToast('Failed to delete review'); }
    finally { setSaving(null); }
  };

  const categories = ['All', ...new Set(allAdminTools.map((t) => t.category))];

  const filtered = allAdminTools.filter((t) => {
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
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const sortIcon = (key: SortKey) => sortKey === key ? (sortAsc ? ' ▲' : ' ▼') : '';

  const totalUp = Object.values(stats).reduce((s, v) => s + (v.upvotes || 0), 0);
  const featuredCount = Object.values(stats).filter((v) => v.featured).length;
  const totalReviews = Object.values(stats).reduce((s, v) => s + (v.reviews?.length || 0), 0);

  const inputCls = 'w-full px-3 py-2.5 rounded-lg bg-white/[0.06] border border-white/[0.10] text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50';
  const labelCls = 'text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-1.5 block';

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed top-4 right-4 z-[100] bg-green-600 text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-xl animate-fade-in">
          {toast}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">AI NSFW Tools</h1>
          <p className="text-sm text-white/40 mt-0.5">Manage all tools — descriptions, translations, featured, images</p>
        </div>
        <button
          onClick={() => { fetchSubs(); fetchStats(allAdminTools.map(t => t.slug)); }}
          disabled={loading}
          className="px-4 py-2 rounded-lg text-sm font-semibold bg-white/[0.06] border border-white/[0.10] text-white/70 hover:text-white hover:bg-white/[0.10] transition-all disabled:opacity-40"
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Tools', value: allAdminTools.length, color: 'text-blue-400' },
          { label: 'Featured', value: featuredCount, color: 'text-purple-400' },
          { label: 'Total Upvotes', value: totalUp, color: 'text-green-400' },
          { label: 'Total Reviews', value: totalReviews, color: 'text-yellow-400' },
        ].map((c) => (
          <div key={c.label} className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4">
            <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider">{c.label}</p>
            <p className={`text-2xl font-bold mt-1 ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tools..." className="flex-1 px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.10] text-white text-sm placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
        <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className="px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.10] text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none cursor-pointer">
          {categories.map((c) => (<option key={c} value={c} className="bg-[#1a1a1a]">{c}</option>))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-white/[0.04] border-b border-white/[0.08]">
              {([
                { key: 'name' as SortKey, label: 'Tool' },
                { key: 'category' as SortKey, label: 'Category' },
                { key: 'score' as SortKey, label: 'Score' },
                { key: 'reviews' as SortKey, label: 'Reviews' },
              ]).map((col) => (
                <th key={col.key} onClick={() => handleSort(col.key)} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-white/50 cursor-pointer hover:text-white/80 transition-colors whitespace-nowrap select-none">
                  {col.label}{sortIcon(col.key)}
                </th>
              ))}
              <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-white/50">Translations</th>
              <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-white/50">Featured</th>
              <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-white/50">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05]">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="animate-pulse"><td className="px-4 py-3" colSpan={7}><div className="h-4 bg-white/[0.06] rounded w-full" /></td></tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td className="px-4 py-8 text-center text-white/30" colSpan={7}>No tools found</td></tr>
            ) : (
              filtered.map((tool) => {
                const s = getStats(tool.slug);
                const sc = s.upvotes - s.downvotes;
                const hasDe = !!(s.description_de || (tool as any).description_de);
                const hasEs = !!(s.description_es || (tool as any).description_es);
                return (
                  <tr key={tool.slug} className="hover:bg-white/[0.03] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <img src={tool.image || '/assets/image.jpg'} alt={tool.name} className="w-8 h-8 rounded-md object-cover shrink-0 border border-white/10" />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="text-white font-medium text-[13px] truncate max-w-[160px]">{tool.name}</p>
                            {!staticSlugs.has(tool.slug) && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-green-600/20 text-green-400 border border-green-500/20">PAID</span>
                            )}
                          </div>
                          <p className="text-white/30 text-[11px]">{tool.vendor}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-white/[0.06] text-white/60">{tool.category}</span></td>
                    <td className="px-4 py-3">
                      <span className={`font-bold ${sc > 0 ? 'text-green-400' : sc < 0 ? 'text-red-400' : 'text-white/30'}`}>
                        {sc > 0 ? `+${sc}` : sc}
                      </span>
                      <span className="text-white/20 text-[10px] ml-1">({s.upvotes}/{s.downvotes})</span>
                    </td>
                    <td className="px-4 py-3">
                      {(s.reviews?.length || 0) > 0 ? (
                        <button onClick={() => setReviewSlug(reviewSlug === tool.slug ? null : tool.slug)} className="text-yellow-400 hover:text-yellow-300 font-semibold transition-colors">{s.reviews.length}</button>
                      ) : (<span className="text-white/20">0</span>)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${hasDe ? 'bg-green-600/20 text-green-400' : 'bg-white/[0.04] text-white/20'}`}>DE</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${hasEs ? 'bg-green-600/20 text-green-400' : 'bg-white/[0.04] text-white/20'}`}>ES</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border ${
                        s.featured
                          ? 'bg-purple-600/30 text-purple-300 border-purple-500/30'
                          : 'bg-white/[0.04] text-white/20 border-white/[0.06]'
                      }`}>
                        {s.featured ? '★ Featured' : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => openEdit(tool)} className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-500/20 transition-all">
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {reviewSlug && (
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-bold text-sm">Reviews for {allAdminTools.find((t) => t.slug === reviewSlug)?.name}</h3>
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
                      <div className="flex">{[1,2,3,4,5].map((s) => (<span key={s} className={`text-xs ${s <= r.rating ? 'text-yellow-400' : 'text-white/15'}`}>&#9733;</span>))}</div>
                      <span className="text-white/30 text-[10px]">{r.createdAt}</span>
                    </div>
                    <p className="text-white/70 text-xs leading-relaxed">{r.text}</p>
                  </div>
                  <button onClick={() => handleDeleteReview(reviewSlug, i)} disabled={saving === reviewSlug} className="shrink-0 px-2 py-1 rounded text-[10px] font-semibold bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-500/20 transition-all disabled:opacity-40">Delete</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {editSlug && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setEditSlug(null)}>
          <div className="bg-[#141414] rounded-2xl border border-white/[0.10] shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-white font-bold text-base mb-1">Edit Tool</h3>
            <p className="text-white/40 text-sm mb-4">{allAdminTools.find((t) => t.slug === editSlug)?.name} — {editSlug}</p>

            <div className="flex gap-1 mb-5 border-b border-white/[0.08] pb-3">
              {(['content', 'featured', 'votes'] as const).map((tab) => (
                <button key={tab} onClick={() => setEditTab(tab)} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${editTab === tab ? 'bg-blue-600 text-white' : 'bg-white/[0.04] text-white/40 hover:text-white/60'}`}>
                  {tab === 'content' ? 'Content & Images' : tab === 'featured' ? 'Featured' : 'Votes'}
                </button>
              ))}
            </div>

            {editTab === 'content' && (
              <div className="space-y-4">
                <div>
                  <label className={labelCls}>Description (EN)</label>
                  <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={5} className={`${inputCls} resize-none`} />
                </div>
                <div>
                  <label className={labelCls}>Description (DE)</label>
                  <textarea value={editDescDe} onChange={(e) => setEditDescDe(e.target.value)} rows={4} className={`${inputCls} resize-none`} placeholder="German translation..." />
                </div>
                <div>
                  <label className={labelCls}>Description (ES)</label>
                  <textarea value={editDescEs} onChange={(e) => setEditDescEs(e.target.value)} rows={4} className={`${inputCls} resize-none`} placeholder="Spanish translation..." />
                </div>
                <div>
                  <label className={labelCls}>Gallery Images ({editGallery.length})</label>
                  {editGallery.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {editGallery.map((url, i) => (
                        <div key={i} className="relative group">
                          <img src={url} alt="" className="w-20 h-20 rounded-lg object-cover border border-white/10" />
                          <button onClick={() => removeGalleryImage(i)} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
                  <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="px-4 py-2 rounded-lg text-sm font-semibold bg-white/[0.06] border border-white/[0.10] text-white/70 hover:text-white hover:bg-white/[0.10] transition-all disabled:opacity-40">
                    {uploading ? 'Uploading...' : '+ Upload Images'}
                  </button>
                </div>
              </div>
            )}

            {editTab === 'featured' && (
              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={editFeatured} onChange={(e) => setEditFeatured(e.target.checked)} className="w-5 h-5 rounded bg-white/[0.06] border-white/[0.20] text-purple-500 focus:ring-purple-500/50" />
                  <span className="text-white font-semibold">Featured</span>
                </label>
                {editFeatured && (
                  <div>
                    <label className={labelCls}>Featured Duration</label>
                    <div className="flex items-center gap-2">
                      <input type="number" min={1} max={365} value={editFeaturedDays} onChange={(e) => setEditFeaturedDays(Math.max(1, parseInt(e.target.value) || 30))} className={`w-24 ${inputCls}`} />
                      <span className="text-white/40 text-sm">days from now</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {editTab === 'votes' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Upvotes</label>
                    <input type="number" min={0} value={editUp} onChange={(e) => setEditUp(Math.max(0, parseInt(e.target.value) || 0))} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Downvotes</label>
                    <input type="number" min={0} value={editDown} onChange={(e) => setEditDown(Math.max(0, parseInt(e.target.value) || 0))} className={inputCls} />
                  </div>
                </div>
                <div className="text-center">
                  <span className={`text-lg font-bold ${editUp - editDown > 0 ? 'text-green-400' : editUp - editDown < 0 ? 'text-red-400' : 'text-white/30'}`}>
                    Score: {editUp - editDown > 0 ? '+' : ''}{editUp - editDown}
                  </span>
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditSlug(null)} className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white/50 hover:text-white bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.08] transition-all">Cancel</button>
              <button onClick={saveEdit} disabled={saving === editSlug} className="flex-1 py-2.5 rounded-lg text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white transition-all disabled:opacity-40">
                {saving === editSlug ? 'Saving...' : 'Save All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
