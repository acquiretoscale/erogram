'use client';

import { useEffect, useState, useCallback } from 'react';
import { OF_CATEGORIES, OF_CATEGORY_MAP } from '@/app/onlyfanssearch/constants';
import {
  getOFMCreators,
  deleteOFMCreator,
} from '@/lib/actions/ofm';
import { ofCreatorProfileUrl } from '@/lib/onlyfanssearch/creatorUrls';
import { importOFMCreator } from '@/lib/actions/ofmAdmin';
import { importCreatorToOFMAgency } from '@/lib/actions/ofClients';
import { PROMOTE_OF_CREATOR_PLACEMENTS } from '@/lib/adPlacements';
import PendingCreatorsPanel from '@/app/OF/creators/PendingCreatorsPanel';
import { getCreatorRankingPages } from '@/lib/tags/creatorMatch';
import { getCreatorProfileCategories } from '@/lib/tags/creatorProfileTags';
import { extractBioHashtagSlugs } from '@/lib/tags/bioHashtags';
import { getTagDefinition } from '@/lib/tags/registry';

type Creator = {
  _id: string;
  name: string;
  username: string;
  slug: string;
  categories: string[];
  avatar: string;
  bio: string;
  location: string;
  subscriberCount: number;
  likesCount: number;
  price: number;
  isFree: boolean;
  isVerified: boolean;
  url: string;
  scrapedAt: string;
};

function labelForGoldSlug(slug: string): string {
  return OF_CATEGORY_MAP.get(slug)?.name || getTagDefinition(slug)?.label || slug.replace(/-/g, ' ');
}

/** Stored categories + ALL bio hashtags + keyword scan + ranking pages — full admin gold view. */
function getAdminGoldTags(c: Creator): { slug: string; label: string }[] {
  const ranking = getCreatorRankingPages(c).map((p) => ({ slug: p.slug, label: p.label }));
  const merged = getCreatorProfileCategories(
    c.categories || [],
    c.location || '',
    c.bio || '',
    ranking,
    c,
  );
  const seen = new Set(merged.map((t) => t.slug));
  for (const tag of extractBioHashtagSlugs(c.bio || '')) {
    if (seen.has(tag)) continue;
    seen.add(tag);
    merged.push({ slug: tag, label: labelForGoldSlug(tag) });
  }
  return merged;
}

function formatLikes(n: number) {
  if (!n) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString();
}

const SORT_OPTIONS = [
  { value: 'scrapedAt', label: 'Scraped At' },
  { value: 'likesCount', label: 'Likes' },
  { value: 'name', label: 'Name' },
];

const ACCOUNT_SIZE_OPTIONS = [
  { value: '', label: 'All account sizes' },
  { value: 'under-10k', label: 'Under 10K likes' },
  { value: '10k-50k', label: '10K - 50K likes' },
  { value: '50k-100k', label: '50K - 100K likes' },
  { value: '100k-500k', label: '100K - 500K likes' },
  { value: '500k-1m', label: '500K - 1M likes' },
  { value: '1m-plus', label: '1M+ likes' },
];

export default function CreatorsPage() {
  const [view, setView] = useState<'all' | 'pending'>('all');
  const [creators, setCreators] = useState<Creator[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [isFree, setIsFree] = useState('');
  const [accountSize, setAccountSize] = useState('');
  const [sortBy, setSortBy] = useState('scrapedAt');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [promotingId, setPromotingId] = useState<string | null>(null);
  const [importInput, setImportInput] = useState('');
  const [importing, setImporting] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handlePromote = async (creator: Creator) => {
    setPromotingId(creator._id);
    const token = localStorage.getItem('token') || '';
    try {
      const res = await importCreatorToOFMAgency(token, {
        username: creator.username,
        clientId: 'ofm-creators',
        categories: creator.categories,
        defaultPlacements: PROMOTE_OF_CREATOR_PLACEMENTS,
      });
      window.location.href = `/ofm/${res.agencySlug}/${res.creator.slug}`;
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Promote failed');
      setPromotingId(null);
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
        ...(accountSize && { accountSize }),
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
  }, [page, search, category, isFree, accountSize, sortBy, sortDir]);

  useEffect(() => { load(1); }, [search, category, isFree, accountSize, sortBy, sortDir]); // eslint-disable-line react-hooks/exhaustive-deps

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
          <p className="text-white/40 text-sm mt-0.5">
            {view === 'all' ? `${total.toLocaleString()} total in database` : 'User submissions queue'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded-xl border border-white/10 overflow-hidden">
            <button
              type="button"
              onClick={() => setView('all')}
              className={`px-3.5 py-1.5 text-xs font-bold transition ${view === 'all' ? 'bg-[#00AFF0] text-white' : 'bg-white/[0.04] text-white/50 hover:text-white'}`}
            >
              All Creators
            </button>
            <button
              type="button"
              onClick={() => setView('pending')}
              className={`px-3.5 py-1.5 text-xs font-bold transition ${view === 'pending' ? 'bg-[#00AFF0] text-white' : 'bg-white/[0.04] text-white/50 hover:text-white'}`}
            >
              Latest User Additions
            </button>
          </div>
          {view === 'all' && (
            <a href="/OF/import" className="px-3.5 py-1.5 bg-white/[0.06] border border-white/10 rounded-xl text-white/50 text-xs font-semibold hover:bg-white/10 transition">
              Advanced Import →
            </a>
          )}
        </div>
      </div>

      {view === 'pending' ? (
        <PendingCreatorsPanel />
      ) : (
        <>
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
          value={accountSize}
          onChange={(e) => setAccountSize(e.target.value)}
          className="px-3 py-2 bg-white/[0.05] border border-white/10 rounded-xl text-white/70 text-sm outline-none focus:border-[#00AFF0]/40 transition"
        >
          {ACCOUNT_SIZE_OPTIONS.map(o => <option key={o.value || 'all'} value={o.value}>{o.label}</option>)}
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
                  {['Creator', 'Likes', 'Tag categories', 'Scraped', 'Actions'].map(h => (
                    <th key={h} className={`px-4 py-3 text-left text-[11px] font-bold text-white/30 uppercase tracking-wider whitespace-nowrap${h === 'Actions' ? ' sticky right-0 bg-[#0c1116]' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {creators.map((c) => {
                  const goldTags = getAdminGoldTags(c);
                  return (
                  <tr key={c._id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-4 min-w-0">
                        {c.avatar ? (
                          <img src={c.avatar} alt={c.name} className="w-56 h-56 rounded-2xl object-cover bg-white/5 flex-shrink-0" />
                        ) : (
                          <div className="w-56 h-56 rounded-2xl bg-[#00AFF0]/10 border border-[#00AFF0]/20 flex items-center justify-center text-[#00AFF0] text-4xl font-bold flex-shrink-0">
                            {c.name.charAt(0)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-semibold text-white text-base">{c.name}</div>
                          <div className="text-sm text-white/30 mt-0.5">@{c.username}</div>
                          {c.isVerified && <span className="text-[#00AFF0] text-xs mt-1 inline-block">✓ Verified</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top whitespace-nowrap">
                      <span className="text-sm font-bold text-white/80">{formatLikes(c.likesCount)}</span>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex flex-wrap items-center gap-1.5 max-w-3xl">
                        {goldTags.length === 0 ? (
                          <span className="text-white/20 text-xs">—</span>
                        ) : (
                          goldTags.map((tag) => (
                            <span
                              key={tag.slug}
                              title={tag.slug}
                              className="px-2 py-0.5 rounded-md text-[11px] font-semibold capitalize border border-amber-400/35 bg-gradient-to-br from-amber-500/20 to-yellow-600/10 text-amber-200 shadow-[0_0_12px_-4px_rgba(251,191,36,0.35)]"
                            >
                              {tag.label}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-white/30 text-[11px] whitespace-nowrap">
                      {c.scrapedAt ? new Date(c.scrapedAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 sticky right-0 bg-[#0c1116]">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handlePromote(c)}
                          disabled={promotingId === c._id}
                          className="px-3 py-2 rounded-lg text-xs font-black tracking-wider bg-[#00AFF0] hover:bg-[#009dd9] text-white transition disabled:opacity-50 disabled:cursor-wait"
                          title="Promote and open OFM management"
                        >
                          {promotingId === c._id ? '…' : 'PROMOTE'}
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
                        <a
                          href={`${ofCreatorProfileUrl(c.username)}?edit=1`}
                          className="p-1.5 text-white/30 hover:text-white hover:bg-white/10 rounded-lg transition"
                          title="Edit on Erogram"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </a>
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
                  );
                })}
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

        </>
      )}

    </div>
  );
}
