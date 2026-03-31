'use client';

import { useEffect, useState, useCallback } from 'react';
import { OF_CATEGORIES } from '@/app/onlyfanssearch/constants';
import {
  getOFMCreators,
  deleteOFMCreator,
  updateOFMCreator,
  getOFMTrending,
  createOFMTrendingSlot,
} from '@/lib/actions/ofm';
import { importOFMCreator } from '@/lib/actions/ofmAdmin';

type Creator = {
  _id: string;
  name: string;
  username: string;
  slug: string;
  categories: string[];
  avatar: string;
  bio: string;
  subscriberCount: number;
  likesCount: number;
  price: number;
  isFree: boolean;
  isVerified: boolean;
  url: string;
  scrapedAt: string;
};

type EditState = Partial<Creator> & { _id?: string };

type TrendingSlot = { _id: string; position: number; name: string; username: string } | null;

const SORT_OPTIONS = [
  { value: 'scrapedAt', label: 'Scraped At' },
  { value: 'subscriberCount', label: 'Subscribers' },
  { value: 'likesCount', label: 'Likes' },
  { value: 'price', label: 'Price' },
  { value: 'name', label: 'Name' },
];

export default function CreatorsPage() {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [isFree, setIsFree] = useState('');
  const [sortBy, setSortBy] = useState('scrapedAt');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');
  const [editCreator, setEditCreator] = useState<EditState | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [featuredSlots, setFeaturedSlots] = useState<TrendingSlot[]>([null, null, null, null]);
  const [sendToFeatured, setSendToFeatured] = useState<Creator | null>(null);
  const [sendingSlot, setSendingSlot] = useState<number | null>(null);
  const [importInput, setImportInput] = useState('');
  const [importing, setImporting] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const loadFeaturedSlots = useCallback(async () => {
    const token = localStorage.getItem('token') || '';
    try {
      const data = await getOFMTrending(token);
      const mapped: TrendingSlot[] = [null, null, null, null];
      if (Array.isArray(data)) {
        for (const s of data) {
          if (s.position >= 1 && s.position <= 4) mapped[s.position - 1] = s;
        }
      }
      setFeaturedSlots(mapped);
    } catch { /* silent */ }
  }, []);

  const handleSendToSlot = async (creator: Creator, position: number) => {
    setSendingSlot(position);
    const token = localStorage.getItem('token') || '';
    try {
      await createOFMTrendingSlot(token, {
        name: creator.name,
        username: creator.username,
        avatar: creator.avatar,
        url: creator.url,
        bio: creator.bio,
        categories: creator.categories,
        position,
        active: true,
      });
      showToast(`${creator.name} added to Featured Spot #${position}`);
      setSendToFeatured(null);
      loadFeaturedSlots();
    } catch {
      showToast('Failed to add to Featured');
    } finally {
      setSendingSlot(null);
    }
  };

  const handleQuickImport = async () => {
    const cleaned = importInput.trim().replace(/^@/, '').replace(/^https?:\/\/(www\.)?onlyfans\.com\//i, '').replace(/\/$/, '');
    if (!cleaned) return;
    setImporting(true);
    const token = localStorage.getItem('token') || '';
    try {
      const data = await importOFMCreator(token, { username: cleaned });
      showToast(`Imported ${data.creator?.name || cleaned}`);
      setImportInput('');
      load(1);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Import failed';
      showToast(message);
    } finally {
      setImporting(false);
    }
  };

  const load = useCallback(async (p = page) => {
    setLoading(true);
    const token = localStorage.getItem('token') || '';
    try {
      const data = await getOFMCreators(token, {
        page: p,
        limit: 50,
        sortBy,
        sortDir,
        ...(search && { search }),
        ...(category && { category }),
        ...(isFree && { isFree }),
      });
      setCreators(data.creators || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
      setPage(p);
    } catch {
      showToast('Failed to load creators');
    } finally {
      setLoading(false);
    }
  }, [page, search, category, isFree, sortBy, sortDir]);

  useEffect(() => { load(1); loadFeaturedSlots(); }, [search, category, isFree, sortBy, sortDir]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = async () => {
    if (!deleteId) return;
    const token = localStorage.getItem('token') || '';
    try {
      await deleteOFMCreator(token, deleteId);
      setDeleteId(null);
      showToast('Creator deleted');
      load(page);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Delete failed';
      showToast(message);
    }
  };

  const handleSave = async () => {
    if (!editCreator?._id) return;
    setEditLoading(true);
    const token = localStorage.getItem('token') || '';
    const { _id, ...patch } = editCreator;
    try {
      await updateOFMCreator(token, _id, patch);
      showToast('Creator updated');
      setEditCreator(null);
      load(page);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save';
      showToast(message);
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-5 py-3 bg-[#1a2a30] border border-[#00AFF0]/30 text-[#00AFF0] text-sm font-semibold rounded-xl shadow-xl">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-white">Creators</h1>
          <p className="text-white/40 text-sm mt-0.5">{total.toLocaleString()} total in database</p>
        </div>
        <a href="/OF/import" className="px-3.5 py-1.5 bg-white/[0.06] border border-white/10 rounded-xl text-white/50 text-xs font-semibold hover:bg-white/10 transition">
          Advanced Import →
        </a>
      </div>

      {/* Quick import */}
      <div className="bg-[#00AFF0]/[0.04] border border-[#00AFF0]/15 rounded-2xl p-4 flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-[200px] relative">
          <input
            type="text"
            value={importInput}
            onChange={e => setImportInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !importing && handleQuickImport()}
            placeholder="Paste OnlyFans link or username to import…"
            className="w-full px-4 py-2.5 bg-white/[0.05] border border-[#00AFF0]/20 rounded-xl text-white text-sm placeholder:text-white/25 outline-none focus:border-[#00AFF0]/40 transition"
          />
        </div>
        <button
          onClick={handleQuickImport}
          disabled={importing || !importInput.trim()}
          className="px-5 py-2.5 bg-[#00AFF0] hover:bg-[#009dd9] text-white text-sm font-bold rounded-xl transition shadow-sm shadow-[#00AFF0]/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {importing ? (
            <>
              <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Importing…
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
              </svg>
              Import
            </>
          )}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-4 flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Search name or username…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[180px] px-3 py-2 bg-white/[0.05] border border-white/10 rounded-xl text-white placeholder:text-white/20 text-sm outline-none focus:border-[#00AFF0]/40 transition"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-3 py-2 bg-white/[0.05] border border-white/10 rounded-xl text-white/70 text-sm outline-none focus:border-[#00AFF0]/40 transition"
        >
          <option value="">All Categories</option>
          {OF_CATEGORIES.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
        <select
          value={isFree}
          onChange={(e) => setIsFree(e.target.value)}
          className="px-3 py-2 bg-white/[0.05] border border-white/10 rounded-xl text-white/70 text-sm outline-none focus:border-[#00AFF0]/40 transition"
        >
          <option value="">Free &amp; Paid</option>
          <option value="true">Free only</option>
          <option value="false">Paid only</option>
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-3 py-2 bg-white/[0.05] border border-white/10 rounded-xl text-white/70 text-sm outline-none focus:border-[#00AFF0]/40 transition"
        >
          {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <button
          onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
          className="px-3 py-2 bg-white/[0.05] border border-white/10 rounded-xl text-white/60 text-sm hover:bg-white/10 transition"
        >
          {sortDir === 'desc' ? '↓ Desc' : '↑ Asc'}
        </button>
      </div>

      {/* Table */}
      <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-[#00AFF0]" />
          </div>
        ) : creators.length === 0 ? (
          <div className="text-center text-white/20 py-12 text-sm">No creators found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {['Creator', 'Categories', 'Subs', 'Price', 'Scraped', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-white/30 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {creators.map((c) => (
                  <tr key={c._id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {c.avatar ? (
                          <img src={c.avatar} alt={c.name} className="w-7 h-7 rounded-full object-cover bg-white/5 flex-shrink-0" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-[#00AFF0]/10 border border-[#00AFF0]/20 flex items-center justify-center text-[#00AFF0] text-xs font-bold flex-shrink-0">
                            {c.name.charAt(0)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-semibold text-white truncate max-w-[140px]">{c.name}</div>
                          <div className="text-[11px] text-white/30">@{c.username}</div>
                        </div>
                        {c.isVerified && <span className="text-[#00AFF0] text-[10px]">✓</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1 max-w-[150px]">
                        {c.categories.slice(0, 3).map(cat => (
                          <span key={cat} className="px-1.5 py-0.5 bg-[#00AFF0]/10 text-[#00AFF0] text-[10px] rounded-md capitalize">{cat}</span>
                        ))}
                        {c.categories.length > 3 && <span className="text-[10px] text-white/20">+{c.categories.length - 3}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-white/60 whitespace-nowrap">{c.subscriberCount > 0 ? c.subscriberCount.toLocaleString() : '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {c.isFree ? (
                        <span className="text-emerald-400 text-[11px] font-bold">Free</span>
                      ) : (
                        <span className="text-amber-400 text-[11px] font-bold">${c.price}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-white/30 text-[11px] whitespace-nowrap">
                      {c.scrapedAt ? new Date(c.scrapedAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => { setSendToFeatured(c); loadFeaturedSlots(); }}
                          className="p-1.5 text-white/30 hover:text-[#00AFF0] hover:bg-[#00AFF0]/10 rounded-lg transition"
                          title="Send to Featured"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>
                          </svg>
                        </button>
                        <a
                          href={c.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-white/30 hover:text-[#00AFF0] hover:bg-[#00AFF0]/10 rounded-lg transition"
                          title="View on OnlyFans"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/>
                          </svg>
                        </a>
                        <button
                          onClick={() => setEditCreator(c)}
                          className="p-1.5 text-white/30 hover:text-white hover:bg-white/10 rounded-lg transition"
                          title="Edit"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeleteId(c._id)}
                          className="p-1.5 text-white/30 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                          title="Delete"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => load(page - 1)} disabled={page <= 1} className="px-3 py-1.5 bg-white/[0.05] border border-white/10 rounded-lg text-white/50 text-sm hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition">
            ← Prev
          </button>
          <span className="text-white/30 text-sm px-2">Page {page} of {pages}</span>
          <button onClick={() => load(page + 1)} disabled={page >= pages} className="px-3 py-1.5 bg-white/[0.05] border border-white/10 rounded-lg text-white/50 text-sm hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition">
            Next →
          </button>
        </div>
      )}

      {/* Send to Featured modal */}
      {sendToFeatured && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0e1419] border border-white/10 rounded-2xl p-6 w-full max-w-sm">
            <div className="flex items-center gap-3 mb-4">
              {sendToFeatured.avatar ? (
                <img src={sendToFeatured.avatar} alt={sendToFeatured.name} className="w-10 h-10 rounded-xl object-cover bg-white/5 flex-shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-[#00AFF0]/10 flex items-center justify-center text-[#00AFF0] font-black flex-shrink-0">
                  {sendToFeatured.name.charAt(0)}
                </div>
              )}
              <div>
                <div className="text-white font-bold text-sm">{sendToFeatured.name}</div>
                <div className="text-[#00AFF0] text-xs">@{sendToFeatured.username}</div>
              </div>
            </div>
            <p className="text-white/50 text-xs mb-4">Pick a Featured spot. Occupied slots will be replaced.</p>
            <div className="grid grid-cols-2 gap-2">
              {([1, 2, 3, 4] as const).map((pos) => {
                const occupant = featuredSlots[pos - 1];
                const isBusy = sendingSlot === pos;
                return (
                  <button
                    key={pos}
                    onClick={() => handleSendToSlot(sendToFeatured, pos)}
                    disabled={sendingSlot !== null}
                    className={`relative flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition disabled:opacity-50 ${
                      occupant
                        ? 'bg-amber-500/[0.06] border-amber-500/20 hover:bg-amber-500/[0.12]'
                        : 'bg-[#00AFF0]/[0.06] border-[#00AFF0]/20 hover:bg-[#00AFF0]/[0.12]'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className={`text-xs font-black ${occupant ? 'text-amber-400' : 'text-[#00AFF0]'}`}>
                        Slot #{pos}
                      </span>
                      {isBusy && (
                        <span className="inline-block w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      )}
                    </div>
                    {occupant ? (
                      <span className="text-[10px] text-amber-400/70 truncate w-full">⚠ Replaces: {occupant.name}</span>
                    ) : (
                      <span className="text-[10px] text-[#00AFF0]/60">Empty — set now</span>
                    )}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setSendToFeatured(null)}
              className="w-full mt-4 py-2 bg-white/[0.05] border border-white/10 rounded-xl text-white/40 text-sm hover:bg-white/10 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0e1419] border border-white/10 rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-white font-bold text-lg mb-2">Delete Creator?</h3>
            <p className="text-white/40 text-sm mb-5">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 bg-white/[0.06] border border-white/10 rounded-xl text-white/60 text-sm font-semibold hover:bg-white/10 transition">
                Cancel
              </button>
              <button onClick={handleDelete} className="flex-1 py-2.5 bg-red-500/80 hover:bg-red-500 rounded-xl text-white text-sm font-bold transition">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editCreator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0e1419] border border-white/10 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-white font-bold text-lg mb-5">Edit Creator</h3>
            <div className="space-y-4">
              {(['name', 'username', 'url', 'bio', 'avatar'] as const).map(field => (
                <div key={field}>
                  <label className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-1.5 capitalize">{field}</label>
                  {field === 'bio' ? (
                    <textarea
                      rows={3}
                      value={(editCreator as any)[field] || ''}
                      onChange={(e) => setEditCreator({ ...editCreator, [field]: e.target.value })}
                      className="w-full px-3 py-2 bg-white/[0.05] border border-white/10 rounded-xl text-white text-sm outline-none focus:border-[#00AFF0]/40 transition resize-none"
                    />
                  ) : (
                    <input
                      type="text"
                      value={(editCreator as any)[field] || ''}
                      onChange={(e) => setEditCreator({ ...editCreator, [field]: e.target.value })}
                      className="w-full px-3 py-2 bg-white/[0.05] border border-white/10 rounded-xl text-white text-sm outline-none focus:border-[#00AFF0]/40 transition"
                    />
                  )}
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-1.5">Price ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editCreator.price ?? 0}
                    onChange={(e) => setEditCreator({ ...editCreator, price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-white/[0.05] border border-white/10 rounded-xl text-white text-sm outline-none focus:border-[#00AFF0]/40 transition"
                  />
                </div>
                <div className="flex flex-col gap-2 justify-end pb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editCreator.isFree ?? false}
                      onChange={(e) => setEditCreator({ ...editCreator, isFree: e.target.checked })}
                      className="accent-[#00AFF0]"
                    />
                    <span className="text-sm text-white/60">Free account</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editCreator.isVerified ?? false}
                      onChange={(e) => setEditCreator({ ...editCreator, isVerified: e.target.checked })}
                      className="accent-[#00AFF0]"
                    />
                    <span className="text-sm text-white/60">Verified</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditCreator(null)} className="flex-1 py-2.5 bg-white/[0.06] border border-white/10 rounded-xl text-white/60 text-sm font-semibold hover:bg-white/10 transition">
                Cancel
              </button>
              <button onClick={handleSave} disabled={editLoading} className="flex-1 py-2.5 bg-[#00AFF0] hover:bg-[#009dd9] rounded-xl text-white text-sm font-bold transition disabled:opacity-50">
                {editLoading ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
