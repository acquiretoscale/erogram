'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import BookmarkButton from '@/components/BookmarkButton';
import ReportModal from '@/app/groups/ReportModal';
import { useToast } from '@/components/Toast';
import { useProfileTheme } from './ProfileThemeContext';
import { getVaultTabColors } from './profileTheme';

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

const PREMIUM_BADGE_GOLD = {
  background: 'linear-gradient(135deg, #f5d061 0%, #c9973a 45%, #a67c00 100%)',
  color: '#2a1f00',
  border: '1px solid #e8c547',
  boxShadow: '0 0 20px rgba(201,151,58,0.45)',
};

function VaultUnlockButton({ onClick, className = '' }: { onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center w-full px-10 py-5 rounded-2xl text-center transition-all hover:scale-[1.03] active:scale-[0.98] ${className}`}
      style={PREMIUM_BADGE_GOLD}
    >
      <span className="text-[18px] sm:text-[22px] font-black uppercase tracking-[0.08em]">UNLOCK WITH PREMIUM</span>
    </button>
  );
}

const FREE_BLUR_IMG = 'blur(14px)';
const FREE_BLUR_TEXT = 'blur(10px)';

const VaultStar = ({ fill }: { fill: string }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill={fill}>
    <path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z"/>
  </svg>
);

export default function VaultTab({ isPremium, isAdmin, onUpgrade }: { isPremium: boolean; isAdmin?: boolean; onUpgrade?: () => void }) {
  const { toast } = useToast();
  const { theme } = useProfileTheme();
  const router = useRouter();
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
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [searchDebounced, setSearchDebounced] = useState('');
  const [quickCategories, setQuickCategories] = useState<{ category: string; count: number }[]>([]);
  const [quickCountries, setQuickCountries] = useState<{ country: string; count: number }[]>([]);
  const [topLiked, setTopLiked] = useState<VaultGroup[]>([]);
  const [topIdx, setTopIdx] = useState(0);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(() => {
    if (typeof window !== 'undefined') return (localStorage.getItem('vault_view') as 'list' | 'grid') || 'list';
    return 'list';
  });

  const [reportGroup, setReportGroup] = useState<VaultGroup | null>(null);
  const T = useMemo(() => getVaultTabColors(theme, false), [theme]);
  const Stars = () => (
    <>
      <VaultStar fill={T.gold} /><VaultStar fill={T.gold} /><VaultStar fill={T.gold} /><VaultStar fill={T.gold} /><VaultStar fill={T.gold} />
    </>
  );

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
  const groupsRef = useRef<VaultGroup[]>([]);
  groupsRef.current = groups;

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const loadGroups = useCallback(async (reset = true) => {
    if (reset) setLoading(true);
    else setLoadingMore(true);
    try {
      const skip = reset ? 0 : groupsRef.current.length;
      const fetchLimit = isPremium ? 50 : 200;
      const params = new URLSearchParams({ skip: String(skip), limit: String(fetchLimit) });
      if (searchDebounced) params.set('search', searchDebounced);
      if (category !== 'All') params.set('category', category);
      if (country !== 'All') params.set('country', country);
      if (featuredOnly) params.set('featured', '1');
      if (sortBy !== 'random') params.set('sort', sortBy);
      else {
        params.set('sort', 'random');
        if (!reset && groupsRef.current.length > 0) {
          params.set('exclude', groupsRef.current.map(g => g._id).join(','));
        }
      }
      const res = await fetch(`/api/vault?${params}`, { headers });
      if (!res.ok) throw new Error('Vault request failed');
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
    } catch {
      toast('Failed to load vault groups', 'error');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [searchDebounced, category, country, sortBy, featuredOnly, isPremium, token]);

  useEffect(() => {
    void loadGroups(true);
  }, [loadGroups]);

  

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
    } catch {
      toast('Failed to update categories', 'error');
    }
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
    } catch {
      toast('Failed to update featured status', 'error');
    }
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

  /* ━━━ PREMIUM + FREE PREVIEW VIEW ━━━ */
  const goUpgrade = () => {
    if (onUpgrade) onUpgrade();
    else router.push('/premium');
  };

  return (
    <div style={{ background: T.bg }}>

      {/* ── Header ── */}
      <div
        className={`relative rounded-2xl overflow-hidden mb-5 px-5 py-3${!isPremium ? ' cursor-pointer' : ''}`}
        style={{ background: T.headerBg, border: T.headerBorder }}
        onClick={!isPremium ? goUpgrade : undefined}
        onKeyDown={!isPremium ? (e) => { if (e.key === 'Enter' || e.key === ' ') goUpgrade(); } : undefined}
        role={!isPremium ? 'button' : undefined}
        tabIndex={!isPremium ? 0 : undefined}
      >
        {/* Corner glow */}
        <div className="absolute top-0 right-0 w-56 h-56 blur-3xl opacity-[0.12] rounded-full" style={{ background: `radial-gradient(ellipse, ${T.glowColor} 0%, transparent 60%)` }} />
        <div className="absolute bottom-0 left-0 w-40 h-40 blur-3xl opacity-[0.07] rounded-full" style={{ background: `radial-gradient(ellipse, ${T.glowColor} 0%, transparent 60%)` }} />

        <div className="relative">
          {/* Top row: badge + stats */}
          <div className="mb-2">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <div className="flex gap-0.5"><Stars /></div>
                <span className="text-[8px] font-black uppercase tracking-[0.3em]" style={{ color: T.goldText }}>Private Vault · Members Only</span>
              </div>
              <h2 className="text-sm font-black tracking-tight select-none" style={{ color: T.text, filter: !isPremium ? FREE_BLUR_TEXT : undefined }}>Your Exclusive Collection</h2>
              <p className="text-[10px]" style={{ color: T.textDim }}>Hand-curated. Not listed publicly. Updated regularly.</p>
            </div>
          </div>
          {/* 4 featured icon cards */}
          {visibleTop.length > 0 ? (
            <div className="grid grid-cols-4 gap-2">
              {visibleTop.map(g => (
                isPremium ? (
                <Link
                  key={g._id}
                  href={g.slug ? `/${g.slug}` : '#'}
                  className="group/top block rounded-xl overflow-hidden relative transition-all duration-500 hover:scale-[1.03] hover:shadow-lg"
                  style={{ aspectRatio: '1', border: `2px solid ${T.badgeBorder}`, boxShadow: `0 4px 20px ${T.gold}0a` }}
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
                      <p className="text-[11px] font-black leading-none" style={{ color: T.gold }}>
                        {formatNum(g.memberCount)} <span className="text-[9px] font-bold" style={{ color: T.catDim }}>subs</span>
                        {(() => {
                          const cats = g.categories?.length ? g.categories : (g.category ? [g.category] : []);
                          const topCat = cats[2] || cats[1] || cats[0] || '';
                          return topCat ? (
                            <span className="text-[9px] font-bold" style={{ color: `${T.catDim}88` }}> · {topCat}</span>
                          ) : null;
                        })()}
                      </p>
                    ) : null}
                  </div>
                </Link>
                ) : (
                <div
                  key={g._id}
                  className="block rounded-xl overflow-hidden relative"
                  style={{ aspectRatio: '1', border: `2px solid ${T.badgeBorder}`, boxShadow: `0 4px 20px ${T.gold}0a` }}
                >
                  <img
                    src={g.image || '/assets/placeholder-no-image.png'}
                    alt=""
                    className="w-full h-full object-cover scale-110"
                    style={{ filter: FREE_BLUR_IMG }}
                    onError={e => { (e.target as HTMLImageElement).src = '/assets/placeholder-no-image.png'; }}
                  />
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 30%, #0a0908dd 75%, #0a0908 100%)' }} />
                  <div className="absolute bottom-0 left-0 right-0 p-1.5">
                    <p className="text-[10px] font-bold text-white leading-tight truncate select-none" style={{ filter: FREE_BLUR_TEXT }}>{g.name || '████████'}</p>
                  </div>
                </div>
                )
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {/* ── Quick filters ── */}
      {(() => {
        return (
          <div className="mb-4">
            <div className="flex gap-1.5 flex-wrap mb-3">
              <button
                onClick={() => { setCategory('All'); setFeaturedOnly(false); }}
                className="px-3 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wide transition-all"
                style={category === 'All' && !featuredOnly
                  ? { background: T.pillActive, color: T.pillActiveText }
                  : { background: T.pillBg, border: `1px solid ${T.pillBorder}`, color: T.pillText }}
              >All</button>
              {isAdmin && (
                <button
                  onClick={() => setFeaturedOnly(!featuredOnly)}
                  className="px-3 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wide transition-all hover:scale-[1.04]"
                  style={featuredOnly
                    ? { background: T.accent, color: T.ink }
                    : { background: T.pillBg, border: `1px solid ${T.badgeBorder}`, color: T.gold }}
                >★ Featured</button>
              )}
              {(() => {
                const EXTRA_CATS = [
                  'Brazil', 'China', 'Colombia', 'Cosplay',
                  'Anal', 'Masturbation', 'Big Ass', 'UK', 'Japan', 'Glory Hole',
                ];
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
                    {TEASER_CATS.map(c => {
                      const isActive = category === c;
                      return isPremium ? (
                        <button
                          key={c}
                          onClick={() => setCategory(isActive ? 'All' : c)}
                          className="px-3 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wide transition-all hover:scale-[1.04]"
                          style={isActive
                            ? { background: T.pillActive, color: T.pillActiveText }
                            : { background: T.pillBg, border: `1px solid ${T.pillBorder}`, color: T.pillText }}
                        >{c}</button>
                      ) : (
                        <span
                          key={c}
                          className="px-3 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wide cursor-not-allowed select-none"
                          style={{ background: T.pillBg, border: `1px solid ${T.pillBorder}`, color: T.pillText, filter: 'blur(3px)', opacity: 0.4 }}
                        >{c}</span>
                      );
                    })}
                  </>
                );
              })()}
            </div>
            <div className="flex gap-2 flex-wrap">
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
                    onClick={goUpgrade}
                    className="px-2.5 py-2 text-[11px] font-bold rounded-xl cursor-pointer flex items-center gap-1"
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
                    onClick={goUpgrade}
                    className="px-2.5 py-2 text-[11px] font-bold rounded-xl cursor-pointer flex items-center gap-1"
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
                  style={{ background: viewMode === 'list' ? T.gold : T.pillBg, color: viewMode === 'list' ? T.ink : T.pillText }}
                  title="List view"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>
                </button>
                <button
                  onClick={() => { setViewMode('grid'); localStorage.setItem('vault_view', 'grid'); }}
                  className="px-2.5 py-2 transition-all"
                  style={{ background: viewMode === 'grid' ? T.gold : T.pillBg, color: viewMode === 'grid' ? T.ink : T.pillText }}
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
          <div className="w-8 h-8 border-2 rounded-full animate-spin mx-auto mb-4" style={{ borderColor: `${T.gold}44`, borderTopColor: T.gold }} />
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
        const visibleCount = isPremium ? groups.length : 3;
        const visibleGroups = groups.slice(0, visibleCount);
        const blurredGroups = !isPremium ? groups.slice(visibleCount) : [];

        return (
        <>
          {/* ── Group Cards ── */}
          {viewMode === 'list' ? (
            <div className="space-y-1.5">
              <div className={!isPremium && visibleGroups.length > 0 ? 'relative' : ''}>
                <div className="space-y-1.5">
              {visibleGroups.map(group => {
                const cats = (group.categories?.length ? group.categories : [group.category]).filter(Boolean);
                return (
                <div
                  key={group._id}
                  className={`group/card relative rounded-2xl overflow-hidden transition-all duration-300${!isPremium ? ' cursor-pointer' : ''}`}
                  style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}` }}
                  onClick={!isPremium ? goUpgrade : undefined}
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
                        <img src={group.image || '/assets/placeholder-no-image.png'} alt="" className="w-full h-full object-cover scale-110" style={{ filter: FREE_BLUR_IMG }} onError={e => { (e.target as HTMLImageElement).src = '/assets/placeholder-no-image.png'; }} />
                      </div>
                    )}

                    {/* Name + categories */}
                    <div className="flex-1 min-w-0">
                      {isPremium ? (
                        <Link href={`/${group.slug}`} className="block font-bold text-[14px] truncate leading-tight transition-colors" style={{ color: T.text }} onMouseEnter={e => (e.currentTarget.style.color = T.gold)} onMouseLeave={e => (e.currentTarget.style.color = T.text)}>{group.name}</Link>
                      ) : (
                        <p className="font-bold text-[14px] truncate leading-tight select-none" style={{ color: T.text, filter: FREE_BLUR_TEXT }}>{group.name}</p>
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
                              style={{ background: T.adminSelectBg, border: `1px solid ${T.badgeBorder}`, color: T.gold }}
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
                              style={{ background: T.adminSelectBg, border: `1px dashed ${T.badgeBorder}`, color: `${T.catDim}88` }}
                              title="Add category"
                            >+</button>
                          )
                        )}
                      </div>
                    </div>

                    {/* Right side: subs + actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {group.memberCount ? (
                        <div className="text-right mr-1 select-none" style={!isPremium ? { filter: FREE_BLUR_TEXT } : undefined}>
                          <div className="text-[15px] font-black leading-none" style={{ color: T.gold }}>{formatNum(group.memberCount)}</div>
                          <div className="text-[8px] font-bold uppercase tracking-widest" style={{ color: T.textDim }}>subs</div>
                        </div>
                      ) : null}
                      {isPremium ? (
                        <>
                          <div className="w-px h-7" style={{ background: '#2e2010' }} />
                          <button
                            onClick={e => { e.preventDefault(); e.stopPropagation(); setReportGroup(group); }}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all"
                            title="Report"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
                            Report
                          </button>
                          {group.telegramLink && (
                            <a href={group.telegramLink} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="px-3.5 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wide transition-all hover:scale-[1.04] hover:brightness-105" style={PREMIUM_BADGE_GOLD}>Join ↗</a>
                          )}
                          <div onClick={e => e.stopPropagation()}><BookmarkButton itemId={group._id} itemType="group" size="sm" /></div>
                          {isAdmin && (
                            <button
                              onClick={e => { e.preventDefault(); e.stopPropagation(); toggleFeatured(group); }}
                              className={`flex items-center justify-center w-7 h-7 rounded-lg transition-all ${group.showOnVaultTeaser ? 'opacity-100 bg-amber-500/20' : 'opacity-40 hover:opacity-100 hover:bg-amber-500/10'}`}
                              title={group.showOnVaultTeaser ? 'Remove from Featured' : 'Add to Featured'}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill={group.showOnVaultTeaser ? T.gold : 'none'} stroke={T.gold} strokeWidth="2"><path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z"/></svg>
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
                      ) : null}
                    </div>
                  </div>
                </div>
              );
              })}

                </div>
                {!isPremium && visibleGroups.length > 0 && (
                  <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                    <div className="pointer-events-auto w-full max-w-md px-4">
                      <VaultUnlockButton onClick={goUpgrade} />
                    </div>
                  </div>
                )}
              </div>

              {/* Blurred list items for free users */}
              {blurredGroups.length > 0 && (
                <div className="relative cursor-pointer" onClick={goUpgrade} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') goUpgrade(); }} role="button" tabIndex={0}>
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
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded" style={{ background: T.adminSelectBg, border: `1px solid ${T.badgeBorder}`, color: T.gold }}>{group.category}</span>
                          </div>
                          {group.memberCount ? <span className="text-[15px] font-black" style={{ color: T.gold }}>{formatNum(group.memberCount)}</span> : null}
                        </div>
                      </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
              <div className={!isPremium && visibleGroups.length > 0 ? 'col-span-full relative' : 'contents'}>
                <div className={!isPremium && visibleGroups.length > 0 ? 'grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3' : 'contents'}>
              {visibleGroups.map(group => {
                const cats = (group.categories?.length ? group.categories : [group.category]).filter(Boolean).slice(0, 3);
                return (
                  <div
                    key={group._id}
                    className={`group/tile relative rounded-xl overflow-hidden transition-all duration-300${!isPremium ? ' cursor-pointer' : ''}`}
                    style={{ border: `1px solid ${T.cardBorder}` }}
                    onClick={!isPremium ? goUpgrade : undefined}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.border = `1px solid ${T.cardHover}`; (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 20px ${T.glowColor}15`; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.border = `1px solid ${T.cardBorder}`; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
                  >
                    {isPremium ? (
                      <Link href={`/${group.slug}`} className="block aspect-square relative">
                        <img
                          src={group.image || '/assets/placeholder-no-image.png'}
                          alt=""
                          className="w-full h-full object-cover"
                          onError={e => { (e.target as HTMLImageElement).src = '/assets/placeholder-no-image.png'; }}
                        />
                        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 30%, #0a0908dd 70%, #0a0908 100%)' }} />
                        <div className="absolute bottom-0 left-0 right-0 p-2">
                          <p className="text-[11px] font-bold text-white leading-tight truncate mb-1">{group.name}</p>
                          <div className="flex flex-wrap gap-0.5 mb-1">
                            {cats.map((cat, i) => (
                              isAdmin ? (
                                <span
                                  key={i}
                                  className="text-[7px] font-black uppercase tracking-wide px-1 py-px rounded cursor-pointer hover:line-through hover:opacity-60 transition-colors"
                                  style={{ background: '#0a090866', color: i === 0 ? T.gold : T.catDim }}
                                  onClick={e => {
                                    e.preventDefault(); e.stopPropagation();
                                    saveGroupCats(group._id, cats.filter(c => c !== cat));
                                  }}
                                  title={`Remove "${cat}"`}
                                >{cat}</span>
                              ) : (
                                <span key={i} className="text-[7px] font-black uppercase tracking-wide px-1 py-px rounded" style={{ background: '#0a090866', color: i === 0 ? T.gold : T.catDim }}>{cat}</span>
                              )
                            ))}
                          </div>
                          {group.memberCount ? (
                            <p className="text-[9px] font-semibold" style={{ color: '#9a8060' }}>{formatNum(group.memberCount)} subs</p>
                          ) : null}
                        </div>
                      </Link>
                    ) : (
                      <div className="block aspect-square relative overflow-hidden">
                        <img
                          src={group.image || '/assets/placeholder-no-image.png'}
                          alt=""
                          className="w-full h-full object-cover scale-110"
                          style={{ filter: FREE_BLUR_IMG }}
                          onError={e => { (e.target as HTMLImageElement).src = '/assets/placeholder-no-image.png'; }}
                        />
                        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 30%, #0a0908dd 70%, #0a0908 100%)' }} />
                        <div className="absolute bottom-0 left-0 right-0 p-2">
                          <p className="text-[11px] font-bold text-white leading-tight truncate mb-1 select-none" style={{ filter: FREE_BLUR_TEXT }}>{group.name}</p>
                          <div className="flex flex-wrap gap-0.5 mb-1">
                            {cats.map((cat, i) => (
                              <span key={i} className="text-[8px] font-black uppercase tracking-wide px-1 py-px rounded" style={{ background: '#0a090866', border: `1px solid ${T.badgeBorder}`, color: i === 0 ? T.gold : T.catDim }}>{cat}</span>
                            ))}
                          </div>
                          {group.memberCount ? (
                            <p className="text-[9px] font-semibold select-none" style={{ color: '#9a8060', filter: FREE_BLUR_TEXT }}>{formatNum(group.memberCount)} subs</p>
                          ) : null}
                        </div>
                      </div>
                    )}
                    {isPremium && (
                      <div className="absolute top-1.5 right-1.5 z-10 flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={e => { e.preventDefault(); e.stopPropagation(); setReportGroup(group); }}
                          className="flex items-center justify-center w-7 h-7 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/20 transition-all"
                          title="Report"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
                        </button>
                        <BookmarkButton itemId={group._id} itemType="group" size="sm" />
                      </div>
                    )}
                    {isPremium && isAdmin && (
                      <div className="absolute top-1.5 left-1.5 z-10 flex flex-col gap-1">
                        <button
                          onClick={e => { e.preventDefault(); e.stopPropagation(); toggleFeatured(group); }}
                          className={`flex items-center justify-center w-6 h-6 rounded-lg transition-all ${group.showOnVaultTeaser ? 'opacity-100 bg-amber-500/30' : 'opacity-0 group-hover/tile:opacity-70 hover:!opacity-100 hover:bg-amber-500/20'}`}
                          title={group.showOnVaultTeaser ? 'Remove from Featured' : 'Add to Featured'}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill={group.showOnVaultTeaser ? T.gold : 'none'} stroke={T.gold} strokeWidth="2.5"><path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z"/></svg>
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
                </div>
                {!isPremium && visibleGroups.length > 0 && (
                  <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                    <div className="pointer-events-auto w-full max-w-md px-4">
                      <VaultUnlockButton onClick={goUpgrade} />
                    </div>
                  </div>
                )}
              </div>

              {/* Blurred grid items for free users */}
              {blurredGroups.length > 0 && (
                <div className="col-span-full relative cursor-pointer" onClick={goUpgrade} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') goUpgrade(); }} role="button" tabIndex={0}>
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
                            <span className="text-[8px] font-black uppercase px-1 py-px rounded" style={{ background: '#0a090866', color: T.gold }}>{group.category}</span>
                            {group.memberCount ? <p className="text-[9px] font-semibold mt-0.5" style={{ color: '#9a8060' }}>{formatNum(group.memberCount)} subs</p> : null}
                          </div>
                        </div>
                      </div>
                      );
                    })}
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

      {reportGroup && (
        <ReportModal group={reportGroup} onClose={() => setReportGroup(null)} />
      )}
    </div>
  );
}
