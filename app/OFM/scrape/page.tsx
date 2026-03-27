'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { OF_CATEGORIES } from '@/app/onlyfanssearch/constants';
import { browseOFMCreators, purgeOFMCreators } from '@/lib/actions/ofm';

const MAX_PER_SCRAPE = 2000;

interface BrowseCreator {
  _id: string;
  name: string;
  username: string;
  slug: string;
  avatar: string;
  bio: string;
  url: string;
  categories: string[];
  gender: string;
  price: number;
  isFree: boolean;
  likesCount: number;
}

type ScrapeResult = {
  success?: boolean;
  error?: string;
  runId?: string;
  totalItems?: number;
  saved?: number;
  category?: string;
};

type JobEntry = {
  id: string;
  category: string;
  maxResults: number;
  status: 'pending' | 'running' | 'done' | 'error' | 'stopped';
  result?: ScrapeResult;
  startedAt: Date;
};

export default function ScrapePage() {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [customTerms, setCustomTerms] = useState<string[]>([]);
  const [customInput, setCustomInput] = useState('');
  const [maxResults, setMaxResults] = useState(200);
  const [jobs, setJobs] = useState<JobEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const stoppedRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const activeRunIdRef = useRef<string | null>(null);

  // Browse scraped results
  const [browseCategory, setBrowseCategory] = useState('');
  const [browseResults, setBrowseResults] = useState<BrowseCreator[]>([]);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [browseLoaded, setBrowseLoaded] = useState(false);
  const [browseSkip, setBrowseSkip] = useState(0);
  const [browseHasMore, setBrowseHasMore] = useState(false);
  const [purging, setPurging] = useState(false);
  const [purgeResult, setPurgeResult] = useState<string | null>(null);
  const BROWSE_LIMIT = 60;

  const loadBrowse = useCallback(async (cat: string, skip = 0, append = false) => {
    setBrowseLoading(true);
    const token = localStorage.getItem('token');
    try {
      const data = await browseOFMCreators(token || '', {
        category: cat || undefined,
        limit: BROWSE_LIMIT,
        skip,
      });
      const list: BrowseCreator[] = data.creators || [];
      setBrowseResults(prev => append ? [...prev, ...list] : list);
      setBrowseHasMore(list.length >= BROWSE_LIMIT);
      setBrowseSkip(skip + list.length);
    } catch (err: unknown) {
      setBrowseResults([]);
      alert(err instanceof Error ? err.message : 'Failed to load browse');
    } finally {
      setBrowseLoading(false);
      setBrowseLoaded(true);
    }
  }, []);

  const handleBrowse = (cat: string) => {
    setBrowseCategory(cat);
    loadBrowse(cat, 0, false);
  };

  const handleBrowseMore = () => {
    loadBrowse(browseCategory, browseSkip, true);
  };

  const handleBrowseDelete = async (slug: string) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/onlyfans/creators/${slug}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setBrowseResults(prev => prev.filter(c => c.slug !== slug));
      } else {
        alert('Delete failed');
      }
    } catch {
      alert('Delete failed');
    }
  };

  const handlePurge = async () => {
    if (!confirm('This will permanently delete ALL male, trans, gay, unknown gender profiles and any profiles with blocked keywords in their bio/name. Continue?')) return;
    setPurging(true);
    setPurgeResult(null);
    const token = localStorage.getItem('token');
    try {
      const data = await purgeOFMCreators(token || '');
      if (data.success) {
        setPurgeResult(
          `Purged ${data.deleted.total} profiles (${data.deleted.nonFemaleGender} non-female gender, ${data.deleted.blockedKeywordsInBioOrName} blocked keywords, ${data.deleted.noAvatar} no avatar)`,
        );
        if (browseLoaded) handleBrowse(browseCategory);
      } else {
        setPurgeResult('Error: Purge failed');
      }
    } catch (e: unknown) {
      setPurgeResult(`Error: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setPurging(false);
    }
  };

  const toggleCategory = (slug: string) => {
    setSelectedCategories(prev =>
      prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug]
    );
  };

  const selectAll = () => setSelectedCategories(OF_CATEGORIES.map(c => c.slug));
  const clearAll = () => { setSelectedCategories([]); setCustomTerms([]); };

  const addCustomTerm = () => {
    const term = customInput.trim().toLowerCase();
    if (!term || customTerms.includes(term) || selectedCategories.includes(term)) return;
    setCustomTerms(prev => [...prev, term]);
    setCustomInput('');
  };

  const removeCustomTerm = (term: string) => {
    setCustomTerms(prev => prev.filter(t => t !== term));
  };

  const stopScrape = useCallback(async () => {
    stoppedRef.current = true;
    abortRef.current?.abort();

    if (activeRunIdRef.current) {
      const token = localStorage.getItem('token');
      try {
        await fetch('/api/onlyfans/scrape', {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ runId: activeRunIdRef.current }),
        });
      } catch {}
      activeRunIdRef.current = null;
    }

    setJobs(prev => prev.map(j =>
      j.status === 'pending' || j.status === 'running' ? { ...j, status: 'stopped', result: { error: 'Stopped by user' } } : j
    ));
    setIsRunning(false);
  }, []);

  const allTerms = [...selectedCategories, ...customTerms];
  const totalTermCount = allTerms.length;

  const runScrape = async () => {
    if (totalTermCount === 0) return;
    stoppedRef.current = false;
    setIsRunning(true);

    const token = localStorage.getItem('token');
    const capped = Math.min(maxResults, MAX_PER_SCRAPE);
    const newJobs: JobEntry[] = allTerms.map(cat => ({
      id: `${cat}-${Date.now()}`,
      category: cat,
      maxResults: capped,
      status: 'pending',
      startedAt: new Date(),
    }));

    setJobs(prev => [...newJobs, ...prev]);

    for (const job of newJobs) {
      if (stoppedRef.current) break;

      setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: 'running' } : j));

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch('/api/onlyfans/scrape', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ category: job.category, maxItems: capped, clean: true, source: 'bulk' }),
          signal: controller.signal,
        });
        const result: ScrapeResult = await res.json();
        activeRunIdRef.current = result.runId || null;
        setJobs(prev => prev.map(j =>
          j.id === job.id
            ? { ...j, status: result.success ? 'done' : 'error', result }
            : j
        ));
      } catch (e: any) {
        if (stoppedRef.current || e.name === 'AbortError') {
          setJobs(prev => prev.map(j =>
            j.id === job.id && j.status === 'running'
              ? { ...j, status: 'stopped', result: { error: 'Stopped by user' } }
              : j
          ));
          break;
        }
        setJobs(prev => prev.map(j =>
          j.id === job.id
            ? { ...j, status: 'error', result: { error: e.message } }
            : j
        ));
      } finally {
        abortRef.current = null;
      }
    }

    setIsRunning(false);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white">Scrape Data</h1>
        <p className="text-white/40 text-sm mt-0.5">Pull OnlyFans creator profiles via Apify. Runs sequentially per category.</p>
      </div>

      {/* Config */}
      <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white">Select Categories</h2>
          <div className="flex gap-2">
            <button onClick={selectAll} className="text-xs text-[#00AFF0] hover:text-white transition px-2 py-1 rounded-lg hover:bg-white/5">
              Select all
            </button>
            <button onClick={clearAll} className="text-xs text-white/30 hover:text-white transition px-2 py-1 rounded-lg hover:bg-white/5">
              Clear
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {OF_CATEGORIES.map(cat => (
            <button
              key={cat.slug}
              onClick={() => toggleCategory(cat.slug)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium border transition ${
                selectedCategories.includes(cat.slug)
                  ? 'bg-[#00AFF0]/15 border-[#00AFF0]/40 text-[#00AFF0]'
                  : 'bg-white/[0.04] border-white/[0.08] text-white/50 hover:text-white hover:border-white/20'
              }`}
            >
              <span>{cat.emoji}</span>
              {cat.name}
            </button>
          ))}
        </div>

        {/* Custom search terms */}
        <div className="pt-2 border-t border-white/[0.06]">
          <label className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Custom Search Terms</label>
          <p className="text-[10px] text-white/25 mb-2">Add any keyword to scrape — it doesn&apos;t have to be a predefined category.</p>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomTerm(); } }}
              placeholder="e.g. goth, feet, yoga, tattoo..."
              className="flex-1 px-3 py-2 bg-white/[0.05] border border-white/10 rounded-xl text-white text-sm placeholder:text-white/20 outline-none focus:border-[#00AFF0]/40 transition"
            />
            <button
              type="button"
              onClick={addCustomTerm}
              disabled={!customInput.trim()}
              className="px-4 py-2 bg-[#00AFF0]/15 hover:bg-[#00AFF0]/25 border border-[#00AFF0]/30 text-[#00AFF0] text-sm font-bold rounded-xl transition disabled:opacity-30 disabled:cursor-not-allowed"
            >
              + Add
            </button>
          </div>
          {customTerms.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {customTerms.map(term => (
                <span
                  key={term}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                >
                  {term}
                  <button
                    type="button"
                    onClick={() => removeCustomTerm(term)}
                    className="text-emerald-400/60 hover:text-white transition"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 pt-2 border-t border-white/[0.06]">
          <div>
            <label className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-1.5">Max Results per Category</label>
            <input
              type="number"
              min={10}
              max={MAX_PER_SCRAPE}
              step={10}
              value={maxResults}
              onChange={(e) => setMaxResults(Math.min(parseInt(e.target.value) || 200, MAX_PER_SCRAPE))}
              className="w-28 px-3 py-2 bg-white/[0.05] border border-white/10 rounded-xl text-white text-sm outline-none focus:border-[#00AFF0]/40 transition"
            />
            <p className="text-white/20 text-[10px] mt-1">Max {MAX_PER_SCRAPE.toLocaleString()}</p>
          </div>
          <div className="flex-1" />
          <div className="text-right">
            {totalTermCount > 0 && (
              <p className="text-white/30 text-xs mb-2">
                {totalTermCount} term{totalTermCount === 1 ? '' : 's'} selected · ~{(totalTermCount * Math.min(maxResults, MAX_PER_SCRAPE)).toLocaleString()} max profiles
              </p>
            )}
            <div className="flex items-center gap-2 justify-end">
              {isRunning && (
                <button
                  onClick={stopScrape}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-xl transition shadow-sm shadow-red-600/20 flex items-center gap-2"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="4" y="4" width="16" height="16" rx="2" />
                  </svg>
                  Stop
                </button>
              )}
              <button
                onClick={runScrape}
                disabled={isRunning || totalTermCount === 0}
                className="px-6 py-2.5 bg-[#00AFF0] hover:bg-[#009dd9] text-white font-bold text-sm rounded-xl transition shadow-sm shadow-[#00AFF0]/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isRunning ? (
                  <>
                    <span className="inline-block w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Running…
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-.18-5.69"/>
                    </svg>
                    Start Scrape
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Warning */}
      <div className="flex items-start gap-3 px-4 py-3 bg-amber-500/[0.08] border border-amber-500/20 rounded-xl">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400 flex-shrink-0 mt-0.5">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01"/>
        </svg>
        <p className="text-amber-400/80 text-xs leading-relaxed">
          Scraping runs synchronously and can take several minutes per category depending on Apify actor run time (up to 8 min timeout). API keys rotate automatically from your pool — manage them in <a href="/OFM/settings" className="underline hover:text-amber-300 transition">Settings</a>.
        </p>
      </div>

      {/* Job log */}
      {jobs.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-white/50 uppercase tracking-wider">Job Log</h2>
          <div className="space-y-2">
            {jobs.map(job => (
              <div
                key={job.id}
                className={`flex items-center gap-4 px-4 py-3 rounded-xl border text-sm ${
                  job.status === 'done'
                    ? 'bg-emerald-500/[0.05] border-emerald-500/20'
                    : job.status === 'error'
                    ? 'bg-red-500/[0.05] border-red-500/20'
                    : job.status === 'stopped'
                    ? 'bg-amber-500/[0.05] border-amber-500/20'
                    : job.status === 'running'
                    ? 'bg-[#00AFF0]/[0.05] border-[#00AFF0]/20'
                    : 'bg-white/[0.03] border-white/[0.07]'
                }`}
              >
                <div className="flex-shrink-0 w-5">
                  {job.status === 'pending' && <span className="text-white/20">⏳</span>}
                  {job.status === 'running' && (
                    <span className="inline-block w-4 h-4 border-2 border-[#00AFF0]/30 border-t-[#00AFF0] rounded-full animate-spin" />
                  )}
                  {job.status === 'done' && <span className="text-emerald-400">✓</span>}
                  {job.status === 'stopped' && <span className="text-amber-400">■</span>}
                  {job.status === 'error' && <span className="text-red-400">✗</span>}
                </div>
                <div className="flex-1">
                  <span className="font-semibold text-white capitalize">{job.category}</span>
                  {job.result?.saved !== undefined && (
                    <span className="text-white/40 ml-2">— {job.result.saved} saved / {job.result.totalItems} found</span>
                  )}
                  {job.result?.error && (
                    <span className="text-red-400/80 ml-2">— {job.result.error}</span>
                  )}
                </div>
                <div className="text-white/20 text-xs">{job.startedAt.toLocaleTimeString()}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Browse Scraped Profiles */}
      <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-white">Browse Scraped Profiles</h2>
            <p className="text-white/30 text-xs mt-0.5">View scraped creators by category. Delete unwanted profiles.</p>
          </div>
          <button
            onClick={handlePurge}
            disabled={purging}
            className="flex-shrink-0 px-4 py-2.5 bg-red-600/20 hover:bg-red-600/40 border border-red-600/30 text-red-400 text-xs font-bold rounded-xl transition disabled:opacity-40 flex items-center gap-2"
          >
            {purging ? (
              <span className="inline-block w-3.5 h-3.5 border-2 border-red-400/40 border-t-red-400 rounded-full animate-spin" />
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2"/>
              </svg>
            )}
            Purge Males/Trans/Gay
          </button>
        </div>
        {purgeResult && (
          <div className={`px-4 py-3 rounded-xl text-xs font-medium ${purgeResult.startsWith('Error') ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'}`}>
            {purgeResult}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleBrowse('')}
            className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition ${
              browseLoaded && browseCategory === ''
                ? 'bg-[#00AFF0]/15 border-[#00AFF0]/40 text-[#00AFF0]'
                : 'bg-white/[0.04] border-white/[0.08] text-white/50 hover:text-white hover:border-white/20'
            }`}
          >
            All
          </button>
          {OF_CATEGORIES.map(cat => (
            <button
              key={cat.slug}
              onClick={() => handleBrowse(cat.slug)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium border transition ${
                browseLoaded && browseCategory === cat.slug
                  ? 'bg-[#00AFF0]/15 border-[#00AFF0]/40 text-[#00AFF0]'
                  : 'bg-white/[0.04] border-white/[0.08] text-white/50 hover:text-white hover:border-white/20'
              }`}
            >
              <span>{cat.emoji}</span>
              {cat.name}
            </button>
          ))}
        </div>

        {browseLoading && browseResults.length === 0 && (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-[#00AFF0]" />
          </div>
        )}

        {browseLoaded && browseResults.length === 0 && !browseLoading && (
          <div className="text-center py-12 text-white/20 text-sm">
            No profiles found for this category.
          </div>
        )}

        {browseResults.length > 0 && (
          <>
            <p className="text-white/25 text-xs">{browseResults.length} loaded{browseHasMore ? ' — scroll down for more' : ''}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {browseResults.map(c => (
                <div key={c._id} className="relative group rounded-2xl overflow-hidden bg-white/[0.04] border border-white/[0.08]">
                  <div className="relative aspect-[3/4] bg-white/[0.02]">
                    {c.avatar ? (
                      <img
                        src={c.avatar}
                        alt={c.name}
                        className="absolute inset-0 w-full h-full object-cover"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl font-black text-white/10">
                        {c.name.charAt(0)}
                      </div>
                    )}

                    {/* Delete button */}
                    <button
                      onClick={() => { if (confirm(`Delete ${c.name} (@${c.username})?`)) handleBrowseDelete(c.slug); }}
                      className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full bg-red-600/90 hover:bg-red-600 text-white shadow-lg transition-all opacity-0 group-hover:opacity-100"
                      title="Delete permanently"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2"/>
                      </svg>
                    </button>

                    {/* Gender badge */}
                    {c.gender && c.gender !== 'female' && (
                      <span className="absolute top-2 left-2 px-1.5 py-0.5 bg-amber-500/90 text-white text-[9px] font-black uppercase rounded">
                        {c.gender}
                      </span>
                    )}
                  </div>

                  <div className="p-3">
                    <div className="font-bold text-white text-sm truncate">{c.name}</div>
                    <div className="text-[#00AFF0] text-xs">@{c.username}</div>
                    {c.categories && c.categories.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {c.categories.slice(0, 3).map(cat => (
                          <span key={cat} className="px-1.5 py-0.5 bg-white/[0.06] text-white/40 text-[9px] rounded capitalize">{cat}</span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-1.5 text-[10px] text-white/25">
                      {c.isFree ? <span className="text-emerald-400 font-bold">FREE</span> : c.price > 0 ? <span>${c.price}</span> : null}
                      {c.likesCount > 0 && <span>· {c.likesCount.toLocaleString()} likes</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {browseHasMore && (
              <div className="text-center pt-4">
                <button
                  onClick={handleBrowseMore}
                  disabled={browseLoading}
                  className="px-8 py-3 bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.10] text-white/60 text-sm font-semibold rounded-xl transition disabled:opacity-40"
                >
                  {browseLoading ? 'Loading…' : 'Load More'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
