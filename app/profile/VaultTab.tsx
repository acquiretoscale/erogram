'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import BookmarkButton from '@/components/BookmarkButton';
import VoteButtons from '@/components/VoteButtons';

interface VaultGroup {
  _id: string;
  name: string;
  slug: string;
  image: string;
  category: string;
  categories?: string[];
  country: string;
  description: string;
  memberCount?: number;
  telegramLink?: string;
  createdAt?: string;
  likes?: number;
  dislikes?: number;
  showOnVaultTeaser?: boolean;
}

const GoldStar = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="#b8964e">
    <path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z"/>
  </svg>
);

export default function VaultTab({ isPremium, isAdmin }: { isPremium: boolean; isAdmin?: boolean }) {
  const [groups, setGroups] = useState<VaultGroup[]>([]);
  const [total, setTotal] = useState(0);
  const [vaultTotal, setVaultTotal] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [country, setCountry] = useState('All');
  const [sortBy, setSortBy] = useState('random');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [quickCategories, setQuickCategories] = useState<{ category: string; count: number }[]>([]);
  const [quickCountries, setQuickCountries] = useState<{ country: string; count: number }[]>([]);
  const [topLiked, setTopLiked] = useState<VaultGroup[]>([]);
  const [topIdx, setTopIdx] = useState(0);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(() => {
    if (typeof window !== 'undefined') return (localStorage.getItem('vault_view') as 'list' | 'grid') || 'list';
    return 'list';
  });

  const [userVotes, setUserVotes] = useState<Record<string, 'like' | 'dislike'>>({});
  const [lightMode, setLightMode] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('vault_theme') === 'light';
    return false;
  });

  const T = lightMode ? {
    bg: '#f8f6f1', headerBg: 'linear-gradient(135deg, #faf8f3 0%, #f5f0e6 60%, #f8f6f1 100%)',
    headerBorder: '1px solid #e0d5c0', glowColor: '#c9973a', cardBg: 'linear-gradient(135deg, #ffffff 0%, #faf8f3 100%)',
    cardBorder: '#e5ddd0', cardHover: '#c9973a66', catBg: '#f5f0e6', catBorder: '#c9973a33',
    catColor: '#8b6914', catDim: '#a08050', text: '#1a1000', textDim: '#7a6a50', textMuted: '#a09070',
    inputBg: '#ffffff', inputBorder: '#e0d5c0', pillBg: '#f5f0e6', pillBorder: '#e0d5c0',
    pillActive: 'linear-gradient(135deg, #c9973a, #a67c2e)', pillActiveText: '#fff',
    pillText: '#8b7040', gold: '#b8860b', goldText: '#8b6914', lockBg: '#f5f0e6',
    blurOverlay: '#f8f6f1', subsBg: '#f5f0e6cc',
  } : {
    bg: 'transparent', headerBg: 'linear-gradient(135deg, #111009 0%, #140f07 60%, #0e0d0b 100%)',
    headerBorder: '1px solid #2e2010', glowColor: '#c9973a', cardBg: 'linear-gradient(135deg, #0f0d08 0%, #120e09 100%)',
    cardBorder: '#2a1f0e', cardHover: '#c9973a44', catBg: '#1a1408', catBorder: '#c9973a22',
    catColor: '#c9973a', catDim: '#7a6040', text: '#ffffff', textDim: '#7a6040', textMuted: '#4a3820',
    inputBg: '#0d0c0a', inputBorder: '#2e2010', pillBg: '#0d0c0a', pillBorder: '#2e2010',
    pillActive: 'linear-gradient(135deg, #c9973a, #a67c2e)', pillActiveText: '#0d0c0a',
    pillText: '#7a6040', gold: '#c9973a', goldText: '#c9973a', lockBg: '#1a1408',
    blurOverlay: '#0d0c0a', subsBg: '#1a140866',
  };

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const loadGroups = useCallback(async (reset = true) => {
    if (reset) setLoading(true);
    else setLoadingMore(true);
    try {
      const skip = reset ? 0 : groups.length;
      const fetchLimit = isPremium ? 50 : 200;
      const params = new URLSearchParams({ skip: String(skip), limit: String(fetchLimit) });
      if (searchDebounced) params.set('search', searchDebounced);
      if (category !== 'All') params.set('category', category);
      if (country !== 'All') params.set('country', country);
      if (sortBy !== 'random') params.set('sort', sortBy);
      else {
        params.set('sort', 'random');
        if (!reset && groups.length > 0) {
          params.set('exclude', groups.map(g => g._id).join(','));
        }
      }
      const res = await fetch(`/api/vault?${params}`, { headers });
      const data = await res.json();
      const hasImg = (g: VaultGroup) => g.image && g.image !== '/assets/image.jpg' && g.image !== '/assets/placeholder-no-image.png';
      const sorted = (data.groups || []).sort((a: VaultGroup, b: VaultGroup) => (hasImg(b) ? 1 : 0) - (hasImg(a) ? 1 : 0));
      if (reset) setGroups(sorted);
      else setGroups(prev => [...prev, ...sorted]);
      setTotal(data.total || 0);
      setHasMore(data.hasMore || false);
      if (data.categoryCounts) setQuickCategories(data.categoryCounts);
      if (data.countryCounts) setQuickCountries(data.countryCounts);
      if (data.vaultTotal != null) setVaultTotal(data.vaultTotal);
      if (data.topLiked?.length) setTopLiked(data.topLiked);
    } catch { /* silent */ }
    finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [searchDebounced, category, country, sortBy, groups.length]);

  useEffect(() => { loadGroups(true); }, [searchDebounced, category, country, sortBy]);

  useEffect(() => {
    if (!isPremium || groups.length === 0 || !token) return;
    const ids = groups.map(g => g._id).join(',');
    fetch(`/api/vault/vote?ids=${ids}`, { headers })
      .then(r => r.json())
      .then(data => { if (data.votes) setUserVotes(prev => ({ ...prev, ...data.votes })); })
      .catch(() => {});
  }, [isPremium, groups.length]);

  useEffect(() => {
    if (topLiked.length <= 4) return;
    const interval = setInterval(() => {
      setTopIdx(prev => (prev + 4) % topLiked.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [topLiked.length]);

  const visibleTop = topLiked.length > 0
    ? Array.from({ length: Math.min(4, topLiked.length) }, (_, i) => topLiked[(topIdx + i) % topLiked.length])
    : [];

  const [catEditId, setCatEditId] = useState<string | null>(null);

  const CATEGORIES = [
    'AI NSFW', 'Amateur', 'Anal', 'Anime', 'Argentina',
    'Asian', 'BDSM', 'Big Ass', 'Big Tits', 'Black', 'Blonde', 'Blowjob',
    'Brazil', 'Brunette', 'China', 'Colombia', 'Cosplay', 'Creampie',
    'Cuckold', 'Ebony', 'Fantasy', 'Feet', 'Fetish', 'France', 'Free-use',
    'Germany', 'Hardcore', 'Italy',
    'Japan', 'Latina', 'Lesbian', 'Masturbation', 'Mexico', 'MILF',
    'NSFW-Telegram', 'Onlyfans', 'Onlyfans Leaks', 'Petite', 'Philippines', 'Privacy', 'Public', 'Red Hair', 'Russian',
    'Spain', 'Telegram-Porn', 'Threesome', 'UK', 'Ukraine', 'USA', 'Vietnam',
  ];

  const saveGroupCats = async (groupId: string, newCats: string[]) => {
    const capped = newCats.slice(0, 3);
    try {
      await fetch(`/api/admin/groups/${groupId}`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ categories: capped, category: capped[0] || '' }),
      });
      setGroups(prev => prev.map(g => g._id === groupId ? { ...g, categories: capped, category: capped[0] || g.category } : g));
    } catch { /* silent */ }
  };

  const deleteGroup = async (group: VaultGroup) => {
    if (!confirm(`Remove "${group.name}" from the vault?`)) return;
    try {
      const res = await fetch('/api/admin/vault', {
        method: 'DELETE',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId: group._id }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(`Delete failed: ${err.message || res.statusText}`);
        return;
      }
      setGroups(prev => prev.filter(g => g._id !== group._id));
      setTopLiked(prev => prev.filter(g => g._id !== group._id));
      setTotal(prev => prev - 1);
      if (vaultTotal != null) setVaultTotal(prev => (prev ?? 0) - 1);
    } catch (e) {
      alert('Delete failed — check your connection.');
    }
  };

  const toggleFeatured = async (group: VaultGroup) => {
    const next = !group.showOnVaultTeaser;
    setGroups(prev => prev.map(g => g._id === group._id ? { ...g, showOnVaultTeaser: next } : g));
    if (next) setTopLiked(prev => [...prev, { ...group, showOnVaultTeaser: true }]);
    else setTopLiked(prev => prev.filter(g => g._id !== group._id));
    try {
      await fetch('/api/admin/vault', {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId: group._id, showOnVaultTeaser: next }),
      });
    } catch { /* silent */ }
  };

  const totalMembers = useMemo(() => groups.reduce((s, g) => s + (g.memberCount || 0), 0), [groups]);

  const formatNum = (n: number) => {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(n >= 10_000 ? 0 : 1) + 'K';
    return n.toLocaleString();
  };

  const formatDate = (s?: string) => {
    if (!s) return '';
    return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  /* ━━━ NON-PREMIUM LOCKED VIEW ━━━ */
  if (!isPremium) {
    const photoOnlyGroups = groups.filter(
      (group) =>
        !!group.image &&
        group.image !== '/assets/image.jpg' &&
        group.image !== '/assets/placeholder-no-image.png' &&
        group.country !== 'China'
    );
    const vaultLiveCount = vaultTotal ?? total;
    const totalGroupCount = 4000 + (vaultLiveCount || 0);
    const fmtTotal = totalGroupCount.toLocaleString();

    return (
      <div className="space-y-4 pb-24">
        <div
          className="relative rounded-2xl overflow-hidden px-5 py-5 text-center"
          style={{ background: 'linear-gradient(135deg, #111009 0%, #140f07 60%, #0e0d0b 100%)', border: '1px solid #2e2010' }}
        >
          <div className="absolute top-0 right-0 w-56 h-56 blur-3xl opacity-[0.12] rounded-full pointer-events-none" style={{ background: 'radial-gradient(ellipse, #c9973a 0%, transparent 60%)' }} />
          <div className="absolute bottom-0 left-0 w-40 h-40 blur-3xl opacity-[0.07] rounded-full pointer-events-none" style={{ background: 'radial-gradient(ellipse, #c9973a 0%, transparent 60%)' }} />
          <div className="relative">
            <div className="flex items-center justify-center gap-0.5 mb-2"><GoldStar /><GoldStar /><GoldStar /><GoldStar /><GoldStar /></div>
            <div className="w-14 h-14 mx-auto mb-3 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #c9973a, #e8ba5a)', boxShadow: '0 0 40px rgba(201,151,58,0.35)' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0d0c0a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <span className="text-[9px] font-black uppercase tracking-[0.3em] block mb-1" style={{ color: '#b8964e' }}>Private Vault · Members Only</span>
            <h2 className="text-lg sm:text-xl font-black text-white tracking-tight mb-1">Vault Locked</h2>
            <p className="text-[12px] font-bold" style={{ color: '#c9973a' }}>Unlock {fmtTotal} hand-picked groups in all categories</p>
          </div>
        </div>

        <a
          href="/premium"
          target="_blank"
          rel="noopener noreferrer"
          className="group block w-full rounded-2xl px-5 py-4 text-center transition-all duration-300 hover:scale-[1.01] active:scale-[0.98]"
          style={{
            background: 'linear-gradient(135deg, #d4a94c 0%, #e8c66a 30%, #c9973a 60%, #b8860b 100%)',
            border: '2px solid rgba(232,198,106,0.7)',
            color: '#1a1000',
            boxShadow: '0 0 30px rgba(201,151,58,0.35), 0 8px 20px rgba(0,0,0,0.25)',
          }}
        >
          <span className="block text-2xl font-black uppercase tracking-wide leading-none">UNLOCK THE VAULT</span>
          <span className="block text-[12px] sm:text-[13px] font-bold mt-1 opacity-85">
            Instant access to {fmtTotal} exclusive groups
          </span>
        </a>

        <div className="relative rounded-2xl overflow-hidden" style={{ border: '1px solid #2e2010' }}>
          {loading ? (
            <div className="py-20 text-center">
              <div className="w-8 h-8 border-2 border-[#c9973a]/30 border-t-[#c9973a] rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm" style={{ color: '#7a6040' }}>Loading preview...</p>
            </div>
          ) : (
            <div className="select-none pointer-events-none">
              <div className="grid grid-cols-8 gap-[2px] p-[2px]">
                {photoOnlyGroups.slice(0, 192).map((group, idx) => {
                  const row = Math.floor(idx / 8);
                  const totalRows = Math.ceil(Math.min(photoOnlyGroups.length, 192) / 8);
                  const progress = totalRows > 1 ? row / (totalRows - 1) : 0;
                  const blur = 2 + progress * 14;
                  const subs = group.memberCount
                    ? group.memberCount >= 1_000_000 ? (group.memberCount / 1_000_000).toFixed(1) + 'M'
                    : group.memberCount >= 1_000 ? (group.memberCount / 1_000).toFixed(group.memberCount >= 10_000 ? 0 : 1) + 'K'
                    : null : null;
                  return (
                    <div key={group._id} className="relative overflow-hidden" style={{ aspectRatio: '1' }}>
                      <img
                        src={group.image || '/assets/placeholder-no-image.png'}
                        alt=""
                        className="w-full h-full object-cover"
                        style={{ filter: `blur(${blur}px)`, transform: 'scale(1.05)' }}
                        onError={e => { (e.target as HTMLImageElement).src = '/assets/placeholder-no-image.png'; }}
                      />
                      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 15%, rgba(10,9,8,0.75) 100%)' }} />
                      <div className="absolute bottom-0 left-0 right-0 p-1">
                        <p className="text-[7px] sm:text-[8px] font-bold text-white/80 truncate leading-tight" style={{ opacity: 1 - progress * 0.6 }}>
                          {(group.name || '').slice(0, 5)}...
                        </p>
                        {subs && (
                          <p className="text-[7px] sm:text-[8px] font-black leading-none mt-px" style={{ color: '#c9973a', opacity: 1 - progress * 0.5 }}>{subs}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(180deg, transparent 50%, rgba(10,9,8,0.6) 75%, #0a0908 100%)' }} />

          <div className="absolute bottom-0 left-0 right-0 px-3 pb-3">
            <div className="rounded-xl px-3 py-2 text-center" style={{ background: 'rgba(10,9,8,0.78)', border: '1px solid #c9973a33' }}>
              <p className="text-[11px] font-black uppercase tracking-wide" style={{ color: '#c9973a' }}>
                Unlock {fmtTotal} hand-picked groups in all categories
              </p>
            </div>
          </div>
        </div>

        <div className="sticky bottom-3 z-20">
          <a
            href="/premium"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center justify-center gap-2 w-full rounded-2xl px-5 py-4 text-center transition-all duration-300 hover:scale-[1.01] active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #d4a94c 0%, #e8c66a 30%, #c9973a 60%, #b8860b 100%)',
              border: '2px solid rgba(232,198,106,0.75)',
              color: '#1a1000',
              boxShadow: '0 0 40px rgba(201,151,58,0.45), 0 8px 26px rgba(0,0,0,0.35)',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <span className="text-[18px] sm:text-[20px] font-black uppercase tracking-wide">Unlock Premium</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: T.bg }} className={lightMode ? 'rounded-2xl p-1' : ''}>

      {/* ── Theme toggle ── */}
      <div className="flex justify-end mb-2">
        <button
          onClick={() => { const next = !lightMode; setLightMode(next); localStorage.setItem('vault_theme', next ? 'light' : 'dark'); }}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all hover:scale-[1.03]"
          style={{ background: lightMode ? '#e8e0d0' : '#1a1408', border: `1px solid ${lightMode ? '#d0c4a8' : '#2e2010'}`, color: lightMode ? '#6a5a30' : '#7a6040' }}
          title={lightMode ? 'Switch to dark mode' : 'Switch to light mode'}
        >
          {lightMode ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
          )}
          {lightMode ? 'Dark' : 'Light'}
        </button>
      </div>

      {/* ── Header ── */}
      <div
        className="relative rounded-2xl overflow-hidden mb-5 px-5 py-3"
        style={{ background: T.headerBg, border: T.headerBorder }}
      >
        {/* Corner glow */}
        <div className="absolute top-0 right-0 w-56 h-56 blur-3xl opacity-[0.12] rounded-full" style={{ background: `radial-gradient(ellipse, ${T.glowColor} 0%, transparent 60%)` }} />
        <div className="absolute bottom-0 left-0 w-40 h-40 blur-3xl opacity-[0.07] rounded-full" style={{ background: `radial-gradient(ellipse, ${T.glowColor} 0%, transparent 60%)` }} />

        <div className="relative">
          {/* Top row: badge + stats */}
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <div className="flex gap-0.5"><GoldStar /><GoldStar /><GoldStar /><GoldStar /><GoldStar /></div>
                <span className="text-[8px] font-black uppercase tracking-[0.3em]" style={{ color: '#b8964e' }}>Private Vault · Members Only</span>
              </div>
              <h2 className="text-sm font-black tracking-tight" style={{ color: T.text }}>Your Exclusive Collection</h2>
              <p className="text-[10px]" style={{ color: T.textDim }}>Hand-curated. Not listed publicly. Updated regularly.</p>
            </div>
            <span
              className="inline-block px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-[0.2em]"
              style={{ background: 'linear-gradient(135deg, #1f1709, #241b0c)', border: '1px solid #c9973a33', color: '#c9973a' }}
            >✦ Elite Access</span>
          </div>
          {/* 4 featured icon cards */}
          {visibleTop.length > 0 ? (
            <div className="grid grid-cols-4 gap-2">
              {visibleTop.map(g => (
                <Link
                  key={g._id}
                  href={g.slug ? `/${g.slug}` : '#'}
                  className="group/top block rounded-xl overflow-hidden relative transition-all duration-500 hover:scale-[1.03] hover:shadow-lg"
                  style={{ aspectRatio: '1', border: '2px solid #c9973a33', boxShadow: '0 4px 20px #c9973a0a' }}
                >
                  <img
                    src={g.image || '/assets/placeholder-no-image.png'}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={e => { (e.target as HTMLImageElement).src = '/assets/placeholder-no-image.png'; }}
                  />
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 30%, #0a0908dd 75%, #0a0908 100%)' }} />
                  <div className="absolute bottom-0 left-0 right-0 p-1.5">
                    <p className="text-[10px] font-bold text-white leading-tight truncate">{g.name || '████████'}</p>
                    {g.memberCount ? (
                      <p className="text-[11px] font-black leading-none" style={{ color: '#c9973a' }}>
                        {formatNum(g.memberCount)} <span className="text-[9px] font-bold" style={{ color: '#7a6040' }}>subs</span>
                        {(() => {
                          const cats = g.categories?.length ? g.categories : (g.category ? [g.category] : []);
                          const topCat = cats[2] || cats[1] || cats[0] || '';
                          return topCat ? (
                            <span className="text-[9px] font-bold" style={{ color: '#7a604088' }}> · {topCat}</span>
                          ) : null;
                        })()}
                      </p>
                    ) : null}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center mt-1">
              <span className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-[0.2em]" style={{ background: 'linear-gradient(135deg, #1f1709, #241b0c)', border: '1px solid #c9973a33', color: '#c9973a' }}>✦ Elite Access</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Quick filters ── */}
      {(() => {
        return (
          <div className="mb-4">
            <div className="flex gap-1.5 flex-wrap mb-3">
              <button
                onClick={() => setCategory('All')}
                className="px-3 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wide transition-all"
                style={category === 'All'
                  ? { background: T.pillActive, color: T.pillActiveText }
                  : { background: T.pillBg, border: `1px solid ${T.pillBorder}`, color: T.pillText }}
              >All</button>
              {(() => {
                const EXTRA_CATS = ['Brazil', 'China', 'Colombia', 'Cosplay'];
                const HIDDEN = ['Blonde', 'Big Tits', 'Italy', 'Telegram-Porn', 'USA'];
                const TEASER_CATS = ['Threesome', 'Creampie', 'Fantasy', 'Hardcore', 'Cuckold', 'Free-use'];
                const filtered = quickCategories.filter(q => !HIDDEN.includes(q.category));
                const shown = filtered.filter(q => !TEASER_CATS.includes(q.category));
                const extraFromApi = EXTRA_CATS.filter(c => !shown.some(q => q.category === c));
                return (
                  <>
                    {shown.map(q => {
                      const isActive = category === q.category;
                      return (
                        <button
                          key={q.category}
                          onClick={() => setCategory(isActive ? 'All' : q.category)}
                          className="px-3 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wide transition-all hover:scale-[1.04]"
                          style={isActive
                            ? { background: T.pillActive, color: T.pillActiveText }
                            : { background: T.pillBg, border: `1px solid ${T.pillBorder}`, color: T.pillText }}
                        >{q.category}</button>
                      );
                    })}
                    {extraFromApi.map(c => {
                      const isActive = category === c;
                      return (
                        <button
                          key={c}
                          onClick={() => setCategory(isActive ? 'All' : c)}
                          className="px-3 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wide transition-all hover:scale-[1.04]"
                          style={isActive
                            ? { background: T.pillActive, color: T.pillActiveText }
                            : { background: T.pillBg, border: `1px solid ${T.pillBorder}`, color: T.pillText }}
                        >{c}</button>
                      );
                    })}
                    {TEASER_CATS.map(c => (
                      <span
                        key={c}
                        className="px-3 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wide cursor-not-allowed select-none"
                        style={{ background: T.pillBg, border: `1px solid ${T.pillBorder}`, color: T.pillText, filter: 'blur(3px)', opacity: 0.4 }}
                      >{c}</span>
                    ))}
                  </>
                );
              })()}
            </div>
            <div className="flex gap-2 flex-wrap">
              {isPremium ? (
                <div className="relative flex-1 min-w-[140px]">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={T.textDim} strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                  <input
                    type="text"
                    placeholder="Search the vault..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-sm outline-none rounded-xl"
                    style={{ background: T.inputBg, border: `1px solid ${T.inputBorder}`, color: T.text, ['--tw-placeholder-color' as any]: T.textMuted }}
                  />
                </div>
              ) : (
                <div className="relative flex-1 min-w-[140px] cursor-not-allowed" onClick={() => window.location.href = token ? '/premium' : '/login?redirect=/premium'}>
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={T.textMuted} strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                  <div className="w-full pl-8 pr-3 py-2 text-sm rounded-xl flex items-center gap-1" style={{ background: T.inputBg, border: `1px solid ${T.inputBorder}`, color: T.textMuted }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={T.textMuted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    Search — Premium only
                  </div>
                </div>
              )}

              {/* Country filter */}
              {quickCountries.length > 0 && (
                isPremium ? (
                  <select
                    value={country}
                    onChange={e => setCountry(e.target.value)}
                    className="px-2.5 py-2 text-[11px] font-bold rounded-xl outline-none cursor-pointer"
                    style={{ background: T.inputBg, border: `1px solid ${T.inputBorder}`, color: country !== 'All' ? T.gold : T.pillText, appearance: 'none', paddingRight: '24px', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='${encodeURIComponent(T.pillText)}' stroke-width='3' stroke-linecap='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}
                  >
                    <option value="All">All Countries</option>
                    {quickCountries.map(c => (
                      <option key={c.country} value={c.country}>{c.country} ({c.count})</option>
                    ))}
                  </select>
                ) : (
                  <div
                    onClick={() => window.location.href = token ? '/premium' : '/login?redirect=/premium'}
                    className="px-2.5 py-2 text-[11px] font-bold rounded-xl cursor-not-allowed flex items-center gap-1"
                    style={{ background: T.inputBg, border: `1px solid ${T.inputBorder}`, color: T.textMuted }}
                  >
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={T.textMuted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    All Countries
                  </div>
                )
              )}

              {/* Sort */}
              {isPremium ? (
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                  className="px-2.5 py-2 text-[11px] font-bold rounded-xl outline-none cursor-pointer"
                  style={{ background: T.inputBg, border: `1px solid ${T.inputBorder}`, color: sortBy !== 'random' ? T.gold : T.pillText, appearance: 'none', paddingRight: '24px', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='${encodeURIComponent(T.pillText)}' stroke-width='3' stroke-linecap='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}
                >
                  <option value="random">Shuffle</option>
                  <option value="newest">Newest</option>
                  <option value="members">Most Members</option>
                  <option value="name">A → Z</option>
                </select>
              ) : (
                <div
                  onClick={() => window.location.href = token ? '/premium' : '/login?redirect=/premium'}
                  className="px-2.5 py-2 text-[11px] font-bold rounded-xl cursor-not-allowed flex items-center gap-1"
                  style={{ background: T.inputBg, border: `1px solid ${T.inputBorder}`, color: T.textMuted }}
                >
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={T.textMuted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  Shuffle
                </div>
              )}

              {/* View toggle */}
              <div className="flex rounded-lg overflow-hidden" style={{ border: `1px solid ${T.pillBorder}` }}>
                <button
                  onClick={() => { setViewMode('list'); localStorage.setItem('vault_view', 'list'); }}
                  className="px-2.5 py-2 transition-all"
                  style={{ background: viewMode === 'list' ? T.gold : T.pillBg, color: viewMode === 'list' ? (lightMode ? '#fff' : '#0d0c0a') : T.pillText }}
                  title="List view"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>
                </button>
                <button
                  onClick={() => { setViewMode('grid'); localStorage.setItem('vault_view', 'grid'); }}
                  className="px-2.5 py-2 transition-all"
                  style={{ background: viewMode === 'grid' ? T.gold : T.pillBg, color: viewMode === 'grid' ? (lightMode ? '#fff' : '#0d0c0a') : T.pillText }}
                  title="Grid view"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
                </button>
              </div>
            </div>

            {/* Active filter label */}
            {(category !== 'All' || country !== 'All') && (
              <div className="mt-2 text-[11px] font-semibold" style={{ color: T.textDim }}>
                {category !== 'All' ? `Browsing "${category}"` : ''} {country !== 'All' ? `from ${country}` : ''}
              </div>
            )}
          </div>
        );
      })()}

      {/* ── Loading ── */}
      {loading ? (
        <div className="py-16 text-center">
          <div className="w-8 h-8 border-2 border-[#c9973a]/30 border-t-[#c9973a] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm" style={{ color: T.textDim }}>Opening the vault...</p>
        </div>
      ) : groups.length === 0 ? (
        <div className="py-16 text-center">
          <div className="text-3xl mb-3 opacity-30">🔒</div>
          <p className="text-sm" style={{ color: T.textDim }}>
            {searchDebounced || category !== 'All' ? 'No groups match your filters' : 'The vault is being stocked — check back soon'}
          </p>
        </div>
      ) : (() => {
        const visibleCount = !isPremium ? 12 : groups.length;
        const visibleGroups = groups.slice(0, visibleCount);
        const blurredGroups = !isPremium ? groups.slice(visibleCount) : [];

        return (
        <>
          {/* ── Group Cards ── */}
          {viewMode === 'list' ? (
            <div className="space-y-1.5">
              {visibleGroups.map(group => {
                const cats = (group.categories?.length ? group.categories : [group.category]).filter(Boolean);
                return (
                <div
                  key={group._id}
                  className={`group/card relative rounded-2xl overflow-hidden transition-all duration-300${!isPremium ? ' cursor-pointer' : ''}`}
                  style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}` }}
                  onClick={!isPremium ? () => { window.location.href = token ? '/premium' : '/login?redirect=/premium'; } : undefined}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.border = `1px solid ${T.cardHover}`; (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 40px ${T.glowColor}0d`; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.border = `1px solid ${T.cardBorder}`; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
                >
                  <div className="absolute left-0 top-0 bottom-0 w-px" style={{ background: `linear-gradient(180deg, transparent, ${T.gold}55, transparent)` }} />
                  <div className="flex items-center gap-3 px-3 py-2.5">
                    {/* Image */}
                    {isPremium ? (
                      <Link href={`/${group.slug}`} className="shrink-0">
                        <div className="w-12 h-12 rounded-xl overflow-hidden" style={{ border: `1px solid ${T.cardBorder}` }}>
                          <img src={group.image || '/assets/placeholder-no-image.png'} alt={group.name} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).src = '/assets/placeholder-no-image.png'; }} />
                        </div>
                      </Link>
                    ) : (
                      <div className="shrink-0 w-12 h-12 rounded-xl overflow-hidden" style={{ border: `1px solid ${T.cardBorder}` }}>
                        <img src={group.image || '/assets/placeholder-no-image.png'} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).src = '/assets/placeholder-no-image.png'; }} />
                      </div>
                    )}

                    {/* Name + categories */}
                    <div className="flex-1 min-w-0">
                      {isPremium ? (
                        <Link href={`/${group.slug}`} className="block font-bold text-[14px] truncate leading-tight transition-colors" style={{ color: T.text }} onMouseEnter={e => (e.currentTarget.style.color = T.gold)} onMouseLeave={e => (e.currentTarget.style.color = T.text)}>{group.name}</Link>
                      ) : (
                        <p className="font-bold text-[14px] truncate leading-tight" style={{ color: T.text }}>{(group.name || '').slice(0, 5)}<span style={{ filter: 'blur(5px)', color: '#ffffff', opacity: 0.7, userSelect: 'none' }}>{(group.name || '██████').slice(5) || '██████'}</span></p>
                      )}
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        {cats.map((cat, i) => (
                          isPremium && isAdmin ? (
                            <span
                              key={i}
                              className="text-[9px] font-black uppercase tracking-[0.12em] px-1.5 py-0.5 rounded cursor-pointer transition-colors hover:line-through hover:opacity-60 group/cat"
                              style={{ background: T.catBg, border: `1px solid ${T.catBorder}`, color: i === 0 ? T.catColor : T.catDim }}
                              title={`Remove "${cat}"`}
                              onClick={e => {
                                e.preventDefault(); e.stopPropagation();
                                saveGroupCats(group._id, cats.filter(c => c !== cat));
                              }}
                            >{cat}</span>
                          ) : (
                            <span key={i} className={`font-black uppercase tracking-[0.12em] px-1.5 py-0.5 rounded ${isPremium ? 'text-[9px]' : 'text-[10px]'}`} style={{ background: T.catBg, border: `1px solid ${T.catBorder}`, color: i === 0 ? T.catColor : T.catDim }}>{cat}</span>
                          )
                        ))}
                        {isPremium && isAdmin && cats.length < 3 && (
                          catEditId === group._id ? (
                            <select
                              autoFocus
                              className="text-[9px] font-bold rounded px-1 py-0.5 outline-none"
                              style={{ background: '#1a1408', border: '1px solid #c9973a44', color: '#c9973a' }}
                              value=""
                              onChange={e => {
                                if (!e.target.value) return;
                                if (!cats.includes(e.target.value)) saveGroupCats(group._id, [...cats, e.target.value]);
                                setCatEditId(null);
                              }}
                              onBlur={() => setCatEditId(null)}
                              onClick={e => e.stopPropagation()}
                            >
                              <option value="">+ Add...</option>
                              {CATEGORIES.filter(c => !cats.includes(c)).map(c => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                          ) : (
                            <button
                              onClick={e => { e.preventDefault(); e.stopPropagation(); setCatEditId(group._id); }}
                              className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded transition-colors"
                              style={{ background: '#1a1408', border: '1px dashed #c9973a33', color: '#7a604088' }}
                              title="Add category"
                            >+</button>
                          )
                        )}
                      </div>
                    </div>

                    {/* Right side: subs + actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {group.memberCount ? (
                        isPremium ? (
                          <div className="text-right mr-1">
                            <div className="text-[15px] font-black leading-none" style={{ color: T.gold }}>{formatNum(group.memberCount)}</div>
                            <div className="text-[8px] font-bold uppercase tracking-widest" style={{ color: T.textDim }}>subs</div>
                          </div>
                        ) : (
                          <div className="text-right mr-1 px-2.5 py-1 rounded-xl" style={{ background: T.subsBg, border: `1px solid ${T.catBorder}` }}>
                            <div className="text-[20px] font-black leading-none" style={{ color: T.gold }}>{formatNum(group.memberCount)}</div>
                            <div className="text-[9px] font-bold uppercase tracking-widest" style={{ color: T.textDim }}>subscribers</div>
                          </div>
                        )
                      ) : null}
                      {isPremium ? (
                        <>
                          <div className="w-px h-7" style={{ background: '#2e2010' }} />
                          <VoteButtons groupId={group._id} initialLikes={group.likes || 0} initialDislikes={group.dislikes || 0} userVote={userVotes[group._id] || null} size="sm" />
                          {group.telegramLink && (
                            <a href={group.telegramLink} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="px-3.5 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wide transition-all hover:scale-[1.04]" style={{ background: 'linear-gradient(135deg, #c9973a, #a67c2e)', color: '#0d0c0a' }}>Join ↗</a>
                          )}
                          <div onClick={e => e.stopPropagation()}><BookmarkButton itemId={group._id} itemType="group" size="sm" /></div>
                          {isAdmin && (
                            <button
                              onClick={e => { e.preventDefault(); e.stopPropagation(); toggleFeatured(group); }}
                              className={`flex items-center justify-center w-7 h-7 rounded-lg transition-all ${group.showOnVaultTeaser ? 'opacity-100 bg-amber-500/20' : 'opacity-40 hover:opacity-100 hover:bg-amber-500/10'}`}
                              title={group.showOnVaultTeaser ? 'Remove from Featured' : 'Add to Featured'}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill={group.showOnVaultTeaser ? '#f59e0b' : 'none'} stroke="#f59e0b" strokeWidth="2"><path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z"/></svg>
                            </button>
                          )}
                          {isAdmin && (
                            <button
                              onClick={e => { e.preventDefault(); e.stopPropagation(); deleteGroup(group); }}
                              className="flex items-center justify-center w-7 h-7 rounded-lg transition-all opacity-40 hover:opacity-100 hover:bg-red-500/20"
                              title="Delete group"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                            </button>
                          )}
                        </>
                      ) : (
                        <Link
                          href={token ? '/premium' : '/login?redirect=/premium'}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide transition-all hover:scale-[1.04]"
                          style={{ background: 'linear-gradient(135deg, #c9973a, #a67c2e)', color: '#0d0c0a' }}
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                          {token ? 'Unlock Premium' : 'Sign Up to Unlock'}
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
              })}

              {/* Blurred list items for free users */}
              {blurredGroups.length > 0 && (
                <div className="relative">
                  <div className="space-y-1.5 select-none pointer-events-none">
                    {blurredGroups.slice(0, 40).map((group, idx) => {
                      const progress = idx / 39;
                      const blur = 6 + progress * 18;
                      const opacity = 0.45 - progress * 0.4;
                      return (
                      <div
                        key={group._id}
                        className="rounded-2xl overflow-hidden"
                        style={{ background: 'linear-gradient(135deg, #0f0d08 0%, #120e09 100%)', border: '1px solid #2a1f0e', filter: `blur(${blur}px)`, opacity: Math.max(opacity, 0.05) }}
                      >
                        <div className="flex items-center gap-3 px-3 py-2.5">
                          <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0" style={{ border: '1px solid #2e2010' }}>
                            <img src={group.image || '/assets/placeholder-no-image.png'} alt="" className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-[14px] text-white truncate">{group.name}</p>
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded" style={{ background: '#1a1408', border: '1px solid #c9973a22', color: '#c9973a' }}>{group.category}</span>
                          </div>
                          {group.memberCount ? <span className="text-[15px] font-black" style={{ color: '#c9973a' }}>{formatNum(group.memberCount)}</span> : null}
                        </div>
                      </div>
                      );
                    })}
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Link
                      href={token ? '/premium' : '/login?redirect=/premium'}
                      className="flex flex-col items-center gap-2 px-8 py-5 rounded-2xl text-center transition-all hover:scale-105"
                      style={{
                        background: 'linear-gradient(135deg, #d4a94c, #e8c66a, #c9973a, #b8860b)',
                        border: '2px solid rgba(232,198,106,0.6)',
                        color: '#1a1000',
                        boxShadow: '0 0 40px rgba(201,151,58,0.4), 0 4px 20px rgba(0,0,0,0.3)',
                      }}
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                      <span className="font-black text-lg uppercase tracking-wide">{token ? 'Unlock Premium' : 'Sign Up to Unlock'}</span>
                      <span className="text-[11px] font-semibold opacity-75">See all groups instantly</span>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
              {visibleGroups.map(group => {
                const cats = (group.categories?.length ? group.categories : [group.category]).filter(Boolean).slice(0, 3);
                const Wrapper = isPremium ? Link : 'a';
                const wrapperProps = isPremium
                  ? { href: `/${group.slug}` }
                  : { href: token ? '/premium' : '/login?redirect=/premium' };
                return (
                  <div
                    key={group._id}
                    className="group/tile relative rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.03] cursor-pointer"
                    style={{ border: `1px solid ${T.cardBorder}` }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.border = `1px solid ${T.cardHover}`; (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 20px ${T.glowColor}15`; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.border = `1px solid ${T.cardBorder}`; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
                  >
                    <Wrapper {...wrapperProps as any} className="block aspect-square relative">
                      <img
                        src={group.image || '/assets/placeholder-no-image.png'}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={e => { (e.target as HTMLImageElement).src = '/assets/placeholder-no-image.png'; }}
                      />
                      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 30%, #0a0908dd 70%, #0a0908 100%)' }} />
                      <div className="absolute bottom-0 left-0 right-0 p-2">
                        <p className="text-[11px] font-bold text-white leading-tight truncate mb-1">{isPremium ? group.name : <>{(group.name || '').slice(0, 5)}<span style={{ filter: 'blur(5px)', color: '#ffffff', opacity: 0.7, userSelect: 'none' as const }}>{(group.name || '██████').slice(5) || '██████'}</span></>}</p>
                        <div className="flex flex-wrap gap-0.5 mb-1">
                          {cats.map((cat, i) => (
                            isPremium && isAdmin ? (
                              <span
                                key={i}
                                className="text-[7px] font-black uppercase tracking-wide px-1 py-px rounded cursor-pointer hover:line-through hover:opacity-60 transition-colors"
                                style={{ background: '#0a090866', color: i === 0 ? '#c9973a' : '#7a6040' }}
                                onClick={e => {
                                  e.preventDefault(); e.stopPropagation();
                                  saveGroupCats(group._id, cats.filter(c => c !== cat));
                                }}
                                title={`Remove "${cat}"`}
                              >{cat}</span>
                            ) : (
                              <span key={i} className={`font-black uppercase tracking-wide px-1 py-px rounded ${isPremium ? 'text-[7px]' : 'text-[8px]'}`} style={{ background: '#0a090866', border: isPremium ? 'none' : '1px solid #c9973a22', color: i === 0 ? '#c9973a' : '#7a6040' }}>{cat}</span>
                            )
                          ))}
                          {isPremium && isAdmin && cats.length < 3 && (
                            <span
                              className="text-[7px] font-black uppercase px-1 py-px rounded cursor-pointer transition-colors"
                              style={{ background: '#0a090866', color: '#7a604066', border: '1px dashed #c9973a22' }}
                              onClick={e => {
                                e.preventDefault(); e.stopPropagation();
                                setCatEditId(catEditId === group._id ? null : group._id);
                              }}
                              title="Add category"
                            >+</span>
                          )}
                        </div>
                        {isPremium && isAdmin && catEditId === group._id && (
                          <select
                            autoFocus
                            className="text-[8px] font-bold rounded px-1 py-0.5 outline-none w-full mb-1"
                            style={{ background: '#1a1408', border: '1px solid #c9973a44', color: '#c9973a' }}
                            value=""
                            onChange={e => {
                              if (!e.target.value) return;
                              if (!cats.includes(e.target.value)) saveGroupCats(group._id, [...cats, e.target.value]);
                              setCatEditId(null);
                            }}
                            onBlur={() => setCatEditId(null)}
                            onClick={e => { e.preventDefault(); e.stopPropagation(); }}
                          >
                            <option value="">+ Add...</option>
                            {CATEGORIES.filter(c => !cats.includes(c)).map(c => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        )}
                        {group.memberCount ? (
                          isPremium ? (
                            <p className="text-[9px] font-semibold" style={{ color: '#9a8060' }}>{formatNum(group.memberCount)} subs</p>
                          ) : (
                            <p className="text-[13px] font-black mt-0.5" style={{ color: '#c9973a' }}>{formatNum(group.memberCount)} <span className="text-[8px] font-bold uppercase tracking-wider" style={{ color: '#7a6040' }}>subs</span></p>
                          )
                        ) : null}
                      </div>
                    </Wrapper>
                    {isPremium && (
                      <div className="absolute top-1.5 right-1.5 z-10 flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
                        <VoteButtons groupId={group._id} initialLikes={group.likes || 0} initialDislikes={group.dislikes || 0} userVote={userVotes[group._id] || null} size="sm" compact />
                        <BookmarkButton itemId={group._id} itemType="group" size="sm" />
                      </div>
                    )}
                    {!isPremium && (
                      <div className="absolute top-1.5 right-1.5 z-10">
                        <span className="text-[7px] font-black uppercase tracking-wider px-1.5 py-1 rounded-md" style={{ background: '#0a0908cc', border: '1px solid #c9973a33', color: '#c9973a' }}>
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="inline mr-0.5 -mt-px"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                          Premium
                        </span>
                      </div>
                    )}
                    {isPremium && isAdmin && (
                      <div className="absolute top-1.5 left-1.5 z-10 flex flex-col gap-1">
                        <button
                          onClick={e => { e.preventDefault(); e.stopPropagation(); toggleFeatured(group); }}
                          className={`flex items-center justify-center w-6 h-6 rounded-lg transition-all ${group.showOnVaultTeaser ? 'opacity-100 bg-amber-500/30' : 'opacity-0 group-hover/tile:opacity-70 hover:!opacity-100 hover:bg-amber-500/20'}`}
                          title={group.showOnVaultTeaser ? 'Remove from Featured' : 'Add to Featured'}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill={group.showOnVaultTeaser ? '#f59e0b' : 'none'} stroke="#f59e0b" strokeWidth="2.5"><path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z"/></svg>
                        </button>
                        <button
                          onClick={e => { e.preventDefault(); e.stopPropagation(); deleteGroup(group); }}
                          className="flex items-center justify-center w-6 h-6 rounded-lg opacity-0 group-hover/tile:opacity-70 hover:!opacity-100 transition-all hover:bg-red-500/30"
                          title="Delete group"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Blurred grid items for free users */}
              {blurredGroups.length > 0 && (
                <div className="col-span-full relative">
                  <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3 select-none pointer-events-none">
                    {blurredGroups.slice(0, 40).map((group, idx) => {
                      const progress = idx / 39;
                      const blur = 6 + progress * 18;
                      const opacity = 0.45 - progress * 0.4;
                      return (
                      <div key={group._id} className="rounded-xl overflow-hidden relative" style={{ border: '1px solid #2a1f0e', filter: `blur(${blur}px)`, opacity: Math.max(opacity, 0.05) }}>
                        <div className="aspect-square relative">
                          <img src={group.image || '/assets/placeholder-no-image.png'} alt="" className="w-full h-full object-cover" />
                          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 30%, #0a0908dd 70%, #0a0908 100%)' }} />
                          <div className="absolute bottom-0 left-0 right-0 p-2">
                            <p className="text-[11px] font-bold text-white truncate mb-1">{group.name}</p>
                            <span className="text-[8px] font-black uppercase px-1 py-px rounded" style={{ background: '#0a090866', color: '#c9973a' }}>{group.category}</span>
                            {group.memberCount ? <p className="text-[9px] font-semibold mt-0.5" style={{ color: '#9a8060' }}>{formatNum(group.memberCount)} subs</p> : null}
                          </div>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Link
                      href={token ? '/premium' : '/login?redirect=/premium'}
                      className="flex flex-col items-center gap-2 px-8 py-5 rounded-2xl text-center transition-all hover:scale-105"
                      style={{
                        background: 'linear-gradient(135deg, #d4a94c, #e8c66a, #c9973a, #b8860b)',
                        border: '2px solid rgba(232,198,106,0.6)',
                        color: '#1a1000',
                        boxShadow: '0 0 40px rgba(201,151,58,0.4), 0 4px 20px rgba(0,0,0,0.3)',
                      }}
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                      <span className="font-black text-lg uppercase tracking-wide">{token ? 'Unlock Premium' : 'Sign Up to Unlock'}</span>
                      <span className="text-[11px] font-semibold opacity-75">See all groups instantly</span>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Load more */}
          {hasMore && isPremium && (
            <div className="mt-6 text-center">
              <button
                onClick={() => loadGroups(false)}
                disabled={loadingMore}
                className="px-8 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-50 hover:scale-[1.02]"
                style={{ background: T.pillBg, border: `1px solid ${T.pillBorder}`, color: T.pillText }}
              >
                {loadingMore ? 'Loading...' : 'Show more'}
              </button>
            </div>
          )}
        </>
        );
      })()}
    </div>
  );
}
