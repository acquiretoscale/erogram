'use client';

import { useEffect, useRef, useState } from 'react';
import {
  getBlogFeaturedCreatorAdmin,
  upsertBlogFeaturedCreator,
  searchCreatorsForUncut,
  type BlogFeaturedCreatorData,
  type CreatorPickerResult,
} from '@/lib/actions/blogFeatured';

const token = () => (typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '');

const BLANK: Omit<BlogFeaturedCreatorData, '_id' | 'clicks'> = {
  name: '', username: '', monthLabel: '', blurb: '',
  coverImage: '', avatar: '', destinationUrl: '',
  ctaLabel: 'Visit the profile', active: true,
};

export default function CreatorOfMonthManager() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<BlogFeaturedCreatorData | null>(null);
  const [form, setForm] = useState({ ...BLANK });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // Search picker
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CreatorPickerResult[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load existing slot when panel opens
  useEffect(() => {
    if (!open) return;
    getBlogFeaturedCreatorAdmin(token())
      .then((d) => {
        setCurrent(d);
        if (d) setForm({
          name: d.name, username: d.username, monthLabel: d.monthLabel, blurb: d.blurb,
          coverImage: d.coverImage, avatar: d.avatar, destinationUrl: d.destinationUrl,
          ctaLabel: d.ctaLabel || 'Visit the profile', active: d.active,
        });
      })
      .catch((e) => setError(e?.message || 'Failed to load'));
  }, [open]);

  // Debounced creator search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await searchCreatorsForUncut(token(), query);
        setResults(r);
      } catch { setResults([]); }
      finally { setSearching(false); }
    }, 320);
  }, [query]);

  const pick = (creator: CreatorPickerResult) => {
    const now = new Date();
    setForm((f) => ({
      ...f,
      name: creator.name,
      username: creator.username,
      avatar: creator.avatar,
      coverImage: creator.avatar,
      destinationUrl: creator.username ? `/${creator.username}-onlyfans` : '',
      monthLabel: f.monthLabel || now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    }));
    setQuery('');
    setResults([]);
  };

  const save = async () => {
    setSaving(true); setSaved(false); setError('');
    try {
      await upsertBlogFeaturedCreator(token(), form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      // Refresh current
      const d = await getBlogFeaturedCreatorAdmin(token());
      setCurrent(d);
    } catch (e: any) {
      setError(e?.message || 'Save failed');
    } finally { setSaving(false); }
  };

  const inp = 'w-full p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:ring-2 focus:ring-[#b31b1b] focus:border-transparent outline-none text-[14px]';
  const lbl = 'block text-sm font-semibold text-[#999] mb-2';

  return (
    <div className="glass rounded-xl p-5 border border-white/5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: '#e8c873' }}>
            Blog · Creator of the Month (SPOTLIGHT Cover)
          </div>
          <p className="text-[#999] text-sm">
            {current?.name
              ? <span>Currently: <span className="text-white font-semibold">{current.name}</span>{current.username ? ` @${current.username}` : ''} · {(current.clicks || 0).toLocaleString()} clicks</span>
              : <span className="text-[#666]">No creator assigned — cover is hidden on /main</span>
            }
          </p>
        </div>
        <button
          onClick={() => setOpen((s) => !s)}
          className="px-5 py-2.5 rounded-xl font-bold transition-all text-sm"
          style={{ background: open ? 'rgba(255,255,255,0.08)' : 'linear-gradient(90deg,#e8c873,#cba24f)', color: open ? '#fff' : '#0a0807' }}
        >
          {open ? 'Close' : 'Manage'}
        </button>
      </div>

      {open && (
        <div className="mt-6 space-y-5">
          {/* Creator search picker */}
          <div>
            <label className={lbl}>Search any creator on Erogram</label>
            <div className="relative">
              <input
                className={inp}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type a name or @username…"
                autoComplete="off"
              />
              {searching && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#666] text-xs">Searching…</span>
              )}
            </div>

            {results.length > 0 && (
              <div className="mt-2 rounded-xl border border-white/10 bg-[#111] overflow-hidden divide-y divide-white/5">
                {results.map((r) => (
                  <button
                    key={r._id}
                    type="button"
                    onClick={() => pick(r)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left"
                  >
                    {r.avatar
                      ? <img src={r.avatar} alt={r.name} className="w-10 h-10 rounded-full object-cover shrink-0 ring-1 ring-white/10" referrerPolicy="no-referrer" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      : <span className="w-10 h-10 rounded-full bg-white/10 shrink-0 flex items-center justify-center text-white/40 text-lg font-bold">{(r.name || '?').charAt(0)}</span>
                    }
                    <div className="min-w-0">
                      <div className="text-white font-semibold text-sm truncate">{r.name}</div>
                      <div className="text-[#666] text-xs">@{r.username}</div>
                    </div>
                    <span className="ml-auto text-[11px] font-bold text-[#e8c873] shrink-0">Select →</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Current selection preview + editable fields */}
          {form.name && (
            <div className="rounded-xl border border-[#e8c873]/30 bg-[#16110a] p-4 flex items-center gap-4">
              {form.avatar && <img src={form.avatar} alt={form.name} className="w-16 h-16 rounded-full object-cover shrink-0 ring-2 ring-[#e8c873]/40" referrerPolicy="no-referrer" />}
              <div>
                <div className="text-white font-black text-[16px]">{form.name}</div>
                {form.username && <div className="text-[#999] text-xs mt-0.5">@{form.username}</div>}
                <div className="text-[#e8c873] text-[11px] font-bold mt-1">Selected for SPOTLIGHT cover</div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Month label</label>
              <input className={inp} value={form.monthLabel} onChange={(e) => setForm({ ...form, monthLabel: e.target.value })} placeholder="June 2026" />
            </div>
            <div>
              <label className={lbl}>CTA label</label>
              <input className={inp} value={form.ctaLabel} onChange={(e) => setForm({ ...form, ctaLabel: e.target.value })} placeholder="Visit the profile" />
            </div>
          </div>

          <div>
            <label className={lbl}>Destination URL</label>
            <input className={inp} value={form.destinationUrl} onChange={(e) => setForm({ ...form, destinationUrl: e.target.value })} placeholder="https://… or /username-onlyfans" />
          </div>

          <div>
            <label className={lbl}>Cover image URL <span className="text-[#555] font-normal">(optional override — uses avatar if blank)</span></label>
            <input className={inp} value={form.coverImage} onChange={(e) => setForm({ ...form, coverImage: e.target.value })} placeholder="https://…" />
            {(form.coverImage || form.avatar) && (
              <img src={form.coverImage || form.avatar} alt="" className="mt-2 w-full max-h-48 object-cover object-top rounded-lg ring-1 ring-white/10" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            )}
          </div>

          <label className="flex items-center gap-3 text-sm text-white cursor-pointer">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="w-4 h-4 accent-[#e8c873]" />
            Active (show on /main)
          </label>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex items-center gap-3">
            <button
              onClick={save}
              disabled={saving || !form.name}
              className="px-6 py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-40"
              style={{ background: 'linear-gradient(90deg,#e8c873,#cba24f)', color: '#0a0807' }}
            >
              {saving ? 'Saving…' : 'Save SPOTLIGHT slot'}
            </button>
            {saved && <span className="text-sm text-green-400 font-semibold">Saved ✓</span>}
            {form.name && (
              <button
                type="button"
                onClick={() => { setForm({ ...BLANK }); setCurrent(null); }}
                className="text-sm text-[#666] hover:text-[#999] transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
