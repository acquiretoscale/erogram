'use client';

import { useState, useEffect, useCallback } from 'react';

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

export default function ImportPage() {
  const [input, setInput] = useState('');
  const [categories, setCategories] = useState('');
  const [trendingSlot, setTrendingSlot] = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportedCreator | null>(null);
  const [source, setSource] = useState('');
  const [warning, setWarning] = useState('');
  const [trendingResult, setTrendingResult] = useState<{ position: number } | null>(null);
  const [error, setError] = useState('');
  const [slots, setSlots] = useState<TrendingSlot[]>([null, null, null, null]);

  const loadSlots = useCallback(async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/OFM/trending', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
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
    setTrendingResult(null);
    setSource('');
    setWarning('');

    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/OFM/import', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: cleaned,
          categories: categories ? categories.split(',').map(s => s.trim()).filter(Boolean) : [],
          trendingSlot: trendingSlot > 0 ? trendingSlot : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Import failed');
      } else {
        setResult(data.creator);
        setTrendingResult(data.trending || null);
        setSource(data.source || 'manual');
        setWarning(data.warning || '');
        loadSlots();
      }
    } catch {
      setError('Network error');
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
          <label className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Assign to Trending Spot (optional)</label>
          <div className="flex gap-2">
            <button
              onClick={() => setTrendingSlot(0)}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${trendingSlot === 0 ? 'bg-white/10 border-white/20 text-white' : 'bg-white/[0.03] border-white/[0.07] text-white/40 hover:bg-white/[0.06]'}`}
            >
              None
            </button>
            {[1, 2, 3, 4].map(pos => {
              const occupant = slots[pos - 1];
              return (
                <button
                  key={pos}
                  onClick={() => setTrendingSlot(pos)}
                  title={occupant ? `Replaces: ${occupant.name}` : 'Empty'}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${
                    trendingSlot === pos ? 'bg-[#00AFF0]/15 border-[#00AFF0]/40 text-[#00AFF0]'
                      : occupant ? 'bg-amber-500/[0.06] border-amber-500/20 text-amber-400/70 hover:bg-amber-500/[0.12]'
                      : 'bg-white/[0.03] border-white/[0.07] text-white/40 hover:bg-white/[0.06]'
                  }`}
                >
                  #{pos}
                  {occupant && trendingSlot !== pos && <span className="block text-[9px] text-amber-400/50 font-normal truncate max-w-[60px]">{occupant.name}</span>}
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
            {trendingResult && (
              <span className="text-xs text-[#00AFF0] bg-[#00AFF0]/10 px-2 py-0.5 rounded-full font-bold">+ Trending #{trendingResult.position}</span>
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
    </div>
  );
}
