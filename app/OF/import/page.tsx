'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getOFMTrending } from '@/lib/actions/ofm';
import { importOFMCreator, checkExistingCreators, getRecentImports, saveBulkApifyResults } from '@/lib/actions/ofmAdmin';

type TrendingSlot = { _id: string; position: number; name: string } | null;

type ImportedCreator = {
  _id: string;
  name: string;
  username: string;
  avatar: string;
  bio: string;
  url: string;
  likesCount: number;
  price: number;
  isFree: boolean;
  categories: string[];
};

type BulkResult = {
  input: string;
  status: 'pending' | 'importing' | 'success' | 'failed';
  creator?: ImportedCreator;
  source?: string;
  error?: string;
};

export default function ImportPage() {
  const [input, setInput] = useState('');
  const [categories, setCategories] = useState('');
  const [featuredSlot, setFeaturedSlot] = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportedCreator | null>(null);
  const [source, setSource] = useState('');
  const [warning, setWarning] = useState('');
  const [featuredResult, setFeaturedResult] = useState<{ position: number } | null>(null);
  const [error, setError] = useState('');
  const [slots, setSlots] = useState<TrendingSlot[]>([null, null, null, null]);

  const loadSlots = useCallback(async () => {
    const token = localStorage.getItem('token') || '';
    try {
      const data = await getOFMTrending(token);
      const mapped: TrendingSlot[] = [null, null, null, null];
      if (Array.isArray(data)) {
        for (const s of data) if (s.position >= 1 && s.position <= 4) mapped[s.position - 1] = s;
      }
      setSlots(mapped);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { loadSlots(); }, [loadSlots]);

  const handleImport = async () => {
    const cleaned = input.trim().replace(/^@/, '').replace(/^https?:\/\/(www\.)?onlyfans\.com\//i, '').replace(/[/?#].*$/, '').trim();
    if (!cleaned) { setError('Enter a username or OnlyFans URL'); return; }

    setLoading(true);
    setError('');
    setResult(null);
    setFeaturedResult(null);
    setSource('');
    setWarning('');

    const token = localStorage.getItem('token') || '';
    try {
      const data = await importOFMCreator(token, {
        username: cleaned,
        categories: categories ? categories.split(',').map(s => s.trim()).filter(Boolean) : [],
        trendingSlot: featuredSlot > 0 ? featuredSlot : undefined,
      });
      setResult(data.creator);
      setFeaturedResult(data.trending || null);
      setSource(data.source || 'manual');
      setWarning(data.warning || '');
      loadSlots();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-white">Import Creator</h1>
        <p className="text-white/40 text-sm mt-1">
          Paste a username or URL. Uses the same Apify scraper as bulk scrape to fetch real profile data. If already in DB, pulls from there instantly.
        </p>
      </div>

      <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6 space-y-5">
        {/* Username input */}
        <div>
          <label className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Username or Profile URL</label>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !loading && handleImport()}
            placeholder="e.g. amouranth or https://onlyfans.com/amouranth"
            className="w-full px-4 py-3 bg-white/[0.05] border border-white/10 rounded-xl text-white text-sm placeholder:text-white/20 outline-none focus:border-[#00AFF0]/40 transition"
          />
        </div>

        {/* Categories */}
        <div>
          <label className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Categories (optional)</label>
          <input
            type="text"
            value={categories}
            onChange={e => setCategories(e.target.value)}
            placeholder="e.g. cosplay, streamer, fitness"
            className="w-full px-4 py-3 bg-white/[0.05] border border-white/10 rounded-xl text-white text-sm placeholder:text-white/20 outline-none focus:border-[#00AFF0]/40 transition"
          />
        </div>

        {/* Trending slot */}
        <div>
          <label className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Assign to Featured Spot (optional)</label>
          <div className="flex gap-2">
            <button
              onClick={() => setFeaturedSlot(0)}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${featuredSlot === 0 ? 'bg-white/10 border-white/20 text-white' : 'bg-white/[0.03] border-white/[0.07] text-white/40 hover:bg-white/[0.06]'}`}
            >
              None
            </button>
            {[1, 2, 3, 4].map(pos => {
              const occupant = slots[pos - 1];
              return (
                <button
                  key={pos}
                  onClick={() => setFeaturedSlot(pos)}
                  title={occupant ? `Replaces: ${occupant.name}` : 'Empty'}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${
                    featuredSlot === pos ? 'bg-[#00AFF0]/15 border-[#00AFF0]/40 text-[#00AFF0]'
                      : occupant ? 'bg-amber-500/[0.06] border-amber-500/20 text-amber-400/70 hover:bg-amber-500/[0.12]'
                      : 'bg-white/[0.03] border-white/[0.07] text-white/40 hover:bg-white/[0.06]'
                  }`}
                >
                  #{pos}
                  {occupant && featuredSlot !== pos && <span className="block text-[9px] text-amber-400/50 font-normal truncate max-w-[60px]">{occupant.name}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Action */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleImport}
            disabled={loading || !input.trim()}
            className="px-6 py-3 bg-[#00AFF0] hover:bg-[#009dd9] text-white font-bold text-sm rounded-xl transition shadow-sm shadow-[#00AFF0]/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Scraping via Apify…
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                </svg>
                Import Creator
              </>
            )}
          </button>
          {loading && <p className="text-white/30 text-xs">This may take up to 2 minutes while Apify scrapes the profile…</p>}
        </div>

        {error && (
          <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">{error}</div>
        )}
      </div>

      {/* Result */}
      {result && (
        <div className="bg-white/[0.03] border border-[#00AFF0]/20 rounded-2xl p-6">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <span className="text-sm font-bold text-emerald-400">Creator imported</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
              source === 'apify' ? 'text-[#00AFF0]/60 bg-[#00AFF0]/10' :
              source === 'database' ? 'text-emerald-400/60 bg-emerald-500/10' :
              'text-white/30 bg-white/5'
            }`}>
              {source === 'apify' ? 'scraped via Apify' : source === 'database' ? 'already in database' : 'basic entry'}
            </span>
            {featuredResult && (
              <span className="text-xs text-[#00AFF0] bg-[#00AFF0]/10 px-2 py-0.5 rounded-full font-bold">+ Featured #{featuredResult.position}</span>
            )}
          </div>

          <div className="flex items-start gap-4">
            {result.avatar ? (
              <img src={result.avatar} alt={result.name} className="w-20 h-20 rounded-2xl object-cover bg-white/5 flex-shrink-0" />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-[#00AFF0]/10 border border-[#00AFF0]/20 flex items-center justify-center text-[#00AFF0] font-black text-2xl flex-shrink-0">
                {result.name.charAt(0)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-lg font-black text-white">{result.name}</div>
              <div className="text-sm text-[#00AFF0]">@{result.username}</div>
              {result.bio && <p className="text-xs text-white/40 mt-1.5 line-clamp-3">{result.bio}</p>}
              {result.categories?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {result.categories.map(c => (
                    <span key={c} className="px-2 py-0.5 bg-[#00AFF0]/10 text-[#00AFF0] text-[10px] font-semibold rounded-md capitalize">{c}</span>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-4 mt-3 text-xs text-white/40">
                {result.likesCount > 0 && <span>{result.likesCount.toLocaleString()} likes</span>}
                {result.isFree ? <span className="text-emerald-400">Free</span> : result.price > 0 ? <span className="text-amber-400">${result.price}</span> : null}
                <a href={result.url} target="_blank" rel="noopener noreferrer" className="text-[#00AFF0] hover:text-[#00AFF0]/80 transition">
                  View on OnlyFans →
                </a>
              </div>
            </div>
          </div>

          {warning && (
            <div className="mt-4 p-3 bg-amber-500/[0.06] border border-amber-500/15 rounded-xl">
              <p className="text-xs text-amber-400/70">{warning}</p>
            </div>
          )}
        </div>
      )}

      {/* ── BULK IMPORT ──────────────────────────────────── */}
      <BulkImportSection />
    </div>
  );
}

function BulkImportSection() {
  const [bulkInput, setBulkInput] = useState('');
  const [bulkResults, setBulkResults] = useState<BulkResult[]>([]);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const [recentImports, setRecentImports] = useState<any[]>([]);
  const abortRef = useRef(false);

  useEffect(() => { getRecentImports(50).then(setRecentImports).catch(() => {}); }, []);

  const parseBulkInput = (text: string): string[] => {
    return text.split(/[\n,]+/)
      .map((l) => l.trim().replace(/^@/, '').replace(/^https?:\/\/(www\.)?onlyfans\.com\//i, '').replace(/[/?#].*$/, '').trim())
      .filter(Boolean).filter((v, i, a) => a.indexOf(v) === i);
  };

  const BATCH_SIZE = 3;

  const handleBulkImport = async () => {
    const names = parseBulkInput(bulkInput);
    if (!names.length) return;
    abortRef.current = false;
    setBulkRunning(true);

    const results: BulkResult[] = names.map((n) => ({ input: n, status: 'pending' }));
    setBulkResults([...results]);

    const existing = await checkExistingCreators(names);
    const existingMap = new Map(existing.map((c: any) => [c.username.toLowerCase(), c]));
    const toScrape: number[] = [];
    for (let i = 0; i < names.length; i++) {
      const match = existingMap.get(names[i].toLowerCase());
      if (match) { results[i] = { input: names[i], status: 'success', creator: match, source: 'database' }; }
      else { toScrape.push(i); }
    }
    setBulkResults([...results]);

    const batches: number[][] = [];
    for (let i = 0; i < toScrape.length; i += BATCH_SIZE) batches.push(toScrape.slice(i, i + BATCH_SIZE));
    setBatchProgress({ current: 0, total: batches.length });

    for (let b = 0; b < batches.length; b++) {
      if (abortRef.current) break;
      const indices = batches[b];
      const batch = indices.map((idx) => names[idx]);
      setBatchProgress({ current: b + 1, total: batches.length });
      for (const idx of indices) results[idx].status = 'importing';
      setBulkResults([...results]);

      try {
        const res = await fetch('/api/onlyfans/scrape', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ category: 'bulk-import', usernames: batch, maxItems: batch.length, source: 'admin' }),
        });
        const data = await res.json();
        const saved = res.ok ? (data.savedCreators || []) : [];
        for (const idx of indices) {
          const nLower = names[idx].toLowerCase();
          const match = saved.find((s: any) => (s.username || '').toLowerCase() === nLower || (s.slug || '').toLowerCase() === nLower);
          results[idx] = match
            ? { input: names[idx], status: 'success', creator: match, source: 'apify' }
            : { input: names[idx], status: 'failed', error: !res.ok ? (data.error || 'Scrape failed') : 'Not found on OnlyFans' };
        }
      } catch (e: any) {
        for (const idx of indices) results[idx] = { input: names[idx], status: 'failed', error: e.message || 'Network error' };
      }
      setBulkResults([...results]);
    }
    setBulkRunning(false);
    getRecentImports(50).then(setRecentImports).catch(() => {});
  };

  const succeeded = bulkResults.filter((r) => r.status === 'success').length;
  const failed = bulkResults.filter((r) => r.status === 'failed').length;
  const pending = bulkResults.filter((r) => r.status === 'pending' || r.status === 'importing').length;

  return (
    <>
      <div className="border-t border-white/[0.06] pt-8">
        <h2 className="text-xl font-black text-white">Bulk Import</h2>
        <p className="text-white/40 text-sm mt-1">Paste usernames or URLs. Batches of {BATCH_SIZE}, results show live after each batch.</p>
      </div>

      {bulkRunning && (
        <div className="p-4 bg-[#00AFF0]/10 border border-[#00AFF0]/30 rounded-xl flex items-center gap-3">
          <span className="w-5 h-5 border-2 border-[#00AFF0]/30 border-t-[#00AFF0] rounded-full animate-spin shrink-0" />
          <p className="text-sm font-bold text-[#00AFF0]">Batch {batchProgress.current}/{batchProgress.total} — {succeeded} imported, stay on this page</p>
        </div>
      )}

      <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6 space-y-5">
        <div>
          <label className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Usernames / URLs (one per line)</label>
          <textarea value={bulkInput} onChange={(e) => setBulkInput(e.target.value)} placeholder={`amouranth\nhttps://onlyfans.com/belledelphine\nsophieraiin`} rows={6} className="w-full px-4 py-3 bg-white/[0.05] border border-white/10 rounded-xl text-white text-sm placeholder:text-white/20 outline-none focus:border-[#00AFF0]/40 transition font-mono" disabled={bulkRunning} />
          <p className="text-[11px] text-white/25 mt-1">{parseBulkInput(bulkInput).length} creators · {Math.ceil(parseBulkInput(bulkInput).length / BATCH_SIZE)} batches</p>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={handleBulkImport} disabled={bulkRunning || !parseBulkInput(bulkInput).length} className="px-6 py-3 bg-[#00AFF0] hover:bg-[#009dd9] text-white font-bold text-sm rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2">
            {bulkRunning ? (<><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Batch {batchProgress.current}/{batchProgress.total}</>) : (<>Import All ({parseBulkInput(bulkInput).length})</>)}
          </button>
          {bulkRunning && <button onClick={() => { abortRef.current = true; }} className="px-4 py-3 bg-red-500/10 border border-red-500/20 text-red-400 font-bold text-sm rounded-xl hover:bg-red-500/20 transition">Stop</button>}
          {bulkResults.length > 0 && (
            <div className="flex items-center gap-3 text-xs font-bold">
              <span className="text-emerald-400">{succeeded} imported</span>
              {failed > 0 && <span className="text-red-400">{failed} failed</span>}
              {pending > 0 && <span className="text-white/30">{pending} pending</span>}
            </div>
          )}
          {bulkResults.length > 0 && !bulkRunning && <button onClick={() => setBulkResults([])} className="text-[11px] text-white/20 hover:text-white/40">Clear</button>}
        </div>
      </div>

      {bulkResults.length > 0 && (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden divide-y divide-white/[0.04]">
          {bulkResults.map((r, i) => (
            <div key={i} className={`flex items-center gap-4 px-5 py-3 ${r.status === 'importing' ? 'bg-[#00AFF0]/[0.03]' : ''}`}>
              <div className="w-6 h-6 flex items-center justify-center shrink-0">
                {r.status === 'pending' && <span className="w-2 h-2 rounded-full bg-white/20" />}
                {r.status === 'importing' && <span className="w-4 h-4 border-2 border-[#00AFF0]/30 border-t-[#00AFF0] rounded-full animate-spin" />}
                {r.status === 'success' && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>}
                {r.status === 'failed' && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="3" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>}
              </div>
              {r.creator?.avatar ? <img src={r.creator.avatar} alt="" className="w-10 h-10 rounded-xl object-cover bg-white/5 shrink-0" /> : <div className="w-10 h-10 rounded-xl bg-white/[0.05] flex items-center justify-center text-white/20 text-xs font-bold shrink-0">{r.input.charAt(0).toUpperCase()}</div>}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white truncate">{r.creator?.name || r.input}</span>
                  {r.creator && <span className="text-xs text-[#00AFF0] shrink-0">@{r.creator.username}</span>}
                  {r.source && r.status === 'success' && <span className={`text-[9px] px-1.5 py-0.5 rounded-full shrink-0 ${r.source === 'apify' ? 'text-[#00AFF0]/60 bg-[#00AFF0]/10' : 'text-emerald-400/60 bg-emerald-500/10'}`}>{r.source === 'apify' ? 'scraped' : 'from DB'}</span>}
                </div>
                {r.status === 'failed' && <p className="text-[11px] text-red-400/70 truncate">{r.error}</p>}
                {r.creator && r.status === 'success' && r.creator.likesCount > 0 && <p className="text-[11px] text-white/30 mt-0.5">{r.creator.likesCount.toLocaleString()} likes</p>}
              </div>
              {r.creator && r.status === 'success' && <a href={`/${r.creator.username}`} target="_blank" rel="noopener noreferrer" className="text-[11px] text-[#00AFF0] font-bold shrink-0">View →</a>}
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-white/[0.06] pt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black text-white">Recent Imports</h2>
          <button onClick={() => getRecentImports(50).then(setRecentImports).catch(() => {})} className="text-xs text-[#00AFF0] font-bold hover:text-[#00AFF0]/70 transition">Refresh</button>
        </div>
        {recentImports.length === 0 ? <p className="text-white/20 text-sm">No recent imports.</p> : (
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden divide-y divide-white/[0.04]">
            {recentImports.map((c) => (
              <div key={c._id} className="flex items-center gap-3 px-5 py-2.5">
                {c.avatar ? <img src={c.avatar} alt="" className="w-8 h-8 rounded-lg object-cover bg-white/5 shrink-0" /> : <div className="w-8 h-8 rounded-lg bg-white/[0.05] flex items-center justify-center text-white/20 text-xs font-bold shrink-0">{c.name?.charAt(0)}</div>}
                <div className="flex-1 min-w-0"><span className="text-sm font-bold text-white truncate">{c.name}</span><span className="text-xs text-[#00AFF0] ml-2">@{c.username}</span></div>
                {c.likesCount > 0 && <span className="text-[10px] text-white/25 shrink-0">{c.likesCount.toLocaleString()} likes</span>}
                <span className="text-[10px] text-white/20 shrink-0">{c.scrapedAt ? new Date(c.scrapedAt).toLocaleDateString() : ''}</span>
                <a href={`/${c.slug}`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-[#00AFF0] font-bold shrink-0">View →</a>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
