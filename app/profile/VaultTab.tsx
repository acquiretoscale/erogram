'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { filterCategories } from '@/app/groups/constants';
import BookmarkButton from '@/components/BookmarkButton';

interface VaultGroup {
  _id: string;
  name: string;
  slug: string;
  image: string;
  category: string;
  country: string;
  description: string;
  memberCount?: number;
  telegramLink?: string;
  createdAt?: string;
}

const GoldStar = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="#b8964e">
    <path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z"/>
  </svg>
);

export default function VaultTab({ isPremium }: { isPremium: boolean }) {
  const [groups, setGroups] = useState<VaultGroup[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [searchDebounced, setSearchDebounced] = useState('');

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const loadGroups = useCallback(async (reset = true) => {
    if (!isPremium) return;
    if (reset) setLoading(true);
    else setLoadingMore(true);
    try {
      const skip = reset ? 0 : groups.length;
      const params = new URLSearchParams({ skip: String(skip), limit: '50' });
      if (searchDebounced) params.set('search', searchDebounced);
      if (category !== 'All') params.set('category', category);
      const res = await fetch(`/api/vault?${params}`, { headers });
      const data = await res.json();
      if (reset) setGroups(data.groups || []);
      else setGroups(prev => [...prev, ...(data.groups || [])]);
      setTotal(data.total || 0);
      setHasMore(data.hasMore || false);
    } catch { /* silent */ }
    finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [isPremium, searchDebounced, category, groups.length]);

  useEffect(() => { loadGroups(true); }, [isPremium, searchDebounced, category]);

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

  if (!isPremium) {
    return (
      <div
        className="relative rounded-2xl overflow-hidden text-center py-20 px-6"
        style={{ background: 'linear-gradient(180deg, #0d0c0a 0%, #110f0a 100%)', border: '1px solid #2a2118' }}
      >
        {/* Gold radial glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-48 blur-3xl opacity-20 rounded-full" style={{ background: 'radial-gradient(ellipse, #c9973a 0%, transparent 70%)' }} />
        <div className="relative">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1a1408, #241b0c)', border: '1px solid #c9973a44', boxShadow: '0 0 40px #c9973a22' }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#b8964e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#b8964e]/60 mb-3">Members Only</p>
          <h3 className="text-white font-black text-2xl mb-3 tracking-tight">The Private Vault</h3>
          <p className="text-white/30 text-sm mb-8 max-w-xs mx-auto leading-relaxed">
            Exclusive, hand-curated Telegram groups. Not listed publicly. Not searchable. Reserved for Premium members only.
          </p>
          <Link
            href="/premium"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-sm transition-all hover:scale-[1.02]"
            style={{ background: 'linear-gradient(135deg, #c9973a, #a67c2e)', color: '#0d0c0a', boxShadow: '0 8px 32px #c9973a33' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z"/></svg>
            Request Premium Access
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: 'transparent' }}>

      {/* ── Header ── */}
      <div
        className="relative rounded-2xl overflow-hidden mb-5 p-6"
        style={{ background: 'linear-gradient(135deg, #111009 0%, #140f07 60%, #0e0d0b 100%)', border: '1px solid #2e2010' }}
      >
        {/* Corner glow */}
        <div className="absolute top-0 right-0 w-56 h-56 blur-3xl opacity-[0.12] rounded-full" style={{ background: 'radial-gradient(ellipse, #c9973a 0%, transparent 60%)' }} />
        <div className="absolute bottom-0 left-0 w-40 h-40 blur-3xl opacity-[0.07] rounded-full" style={{ background: 'radial-gradient(ellipse, #c9973a 0%, transparent 60%)' }} />

        <div className="relative">
          {/* Top badge */}
          <div className="flex items-center gap-2 mb-4">
            <div className="flex gap-0.5">
              <GoldStar /><GoldStar /><GoldStar /><GoldStar /><GoldStar />
            </div>
            <span className="text-[9px] font-black uppercase tracking-[0.35em]" style={{ color: '#b8964e' }}>Private Vault · Members Only</span>
          </div>

          <h2 className="text-xl font-black text-white tracking-tight mb-1">Your Exclusive Collection</h2>
          <p className="text-[12px] mb-5" style={{ color: '#7a6040' }}>Hand-curated. Not listed publicly. Updated regularly.</p>

          {/* Stats row */}
          <div className="flex items-center gap-6">
            <div>
              <div className="text-2xl font-black" style={{ color: '#c9973a' }}>100s</div>
              <div className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: '#7a6040' }}>of Groups</div>
            </div>
            <div className="w-px h-10" style={{ background: '#2e2010' }} />
            <div>
              <div className="text-2xl font-black text-white">Live</div>
              <div className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: '#7a6040' }}>Ongoing Updates</div>
            </div>
            <div className="ml-auto">
              <span
                className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-[0.2em]"
                style={{ background: 'linear-gradient(135deg, #1f1709, #241b0c)', border: '1px solid #c9973a33', color: '#c9973a' }}
              >
                ✦ Elite Access
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Quick filters ── */}
      {(() => {
        const QUICK = ['Russian', 'Asian', 'Onlyfans', 'Chinese', 'Milf', 'Latina', 'Threesome', 'Brasil', 'Others'];
        return (
          <div className="mb-4">
            <div className="flex gap-1.5 flex-wrap mb-3">
              <button
                onClick={() => setCategory('All')}
                className="px-3 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wide transition-all"
                style={category === 'All'
                  ? { background: 'linear-gradient(135deg, #c9973a, #a67c2e)', color: '#0d0c0a' }
                  : { background: '#0d0c0a', border: '1px solid #2e2010', color: '#7a6040' }}
              >All</button>
              {QUICK.map(q => {
                const isActive = category === q;
                return (
                  <button
                    key={q}
                    onClick={() => setCategory(isActive ? 'All' : q)}
                    className="px-3 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wide transition-all hover:scale-[1.04]"
                    style={isActive
                      ? { background: 'linear-gradient(135deg, #c9973a, #a67c2e)', color: '#0d0c0a' }
                      : { background: '#0d0c0a', border: '1px solid #2e2010', color: '#7a6040' }}
                  >{q}</button>
                );
              })}
            </div>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#7a6040" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
              <input
                type="text"
                placeholder="Search the vault..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-white text-sm placeholder:text-[#4a3820] outline-none rounded-xl"
                style={{ background: '#0d0c0a', border: '1px solid #2e2010' }}
              />
            </div>
          </div>
        );
      })()}

      {/* ── Loading ── */}
      {loading ? (
        <div className="py-16 text-center">
          <div className="w-8 h-8 border-2 border-[#c9973a]/30 border-t-[#c9973a] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#7a6040] text-sm">Opening the vault...</p>
        </div>
      ) : groups.length === 0 ? (
        <div className="py-16 text-center">
          <div className="text-3xl mb-3 opacity-30">🔒</div>
          <p className="text-[#7a6040] text-sm">
            {searchDebounced || category !== 'All' ? 'No groups match your filters' : 'The vault is being stocked — check back soon'}
          </p>
        </div>
      ) : (
        <>
          {/* ── Group Cards ── */}
          <div className="space-y-1.5">
            {groups.map(group => (
              <div
                key={group._id}
                className="group/card relative rounded-2xl overflow-hidden transition-all duration-300"
                style={{ background: 'linear-gradient(135deg, #0f0d08 0%, #120e09 100%)', border: '1px solid #2a1f0e' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.border = '1px solid #c9973a44'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 40px #c9973a0d'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.border = '1px solid #2a1f0e'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
              >
                {/* Subtle gold left accent */}
                <div className="absolute left-0 top-0 bottom-0 w-px" style={{ background: 'linear-gradient(180deg, transparent, #c9973a55, transparent)' }} />

                <div className="flex items-center gap-3 px-3 py-2.5">
                  {/* Image */}
                  <Link href={`/${group.slug}`} className="shrink-0">
                    <div className="w-12 h-12 rounded-xl overflow-hidden" style={{ border: '1px solid #2e2010' }}>
                      <img
                        src={group.image || '/assets/placeholder-no-image.png'}
                        alt={group.name}
                        className="w-full h-full object-cover"
                        onError={e => { (e.target as HTMLImageElement).src = '/assets/placeholder-no-image.png'; }}
                      />
                    </div>
                  </Link>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/${group.slug}`}
                      className="block font-bold text-[14px] text-white truncate leading-tight transition-colors hover:text-[#c9973a]"
                    >
                      {group.name}
                    </Link>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className="text-[9px] font-black uppercase tracking-[0.12em] px-1.5 py-0.5 rounded"
                        style={{ background: '#1a1408', border: '1px solid #c9973a22', color: '#c9973a' }}
                      >
                        {group.category}
                      </span>
                      {group.memberCount ? (
                        <span className="text-[11px] font-semibold" style={{ color: '#7a6040' }}>
                          {formatNum(group.memberCount)} members
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Actions — inline */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {group.telegramLink && (
                      <a
                        href={group.telegramLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="px-3.5 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wide transition-all hover:scale-[1.04]"
                        style={{ background: 'linear-gradient(135deg, #c9973a, #a67c2e)', color: '#0d0c0a' }}
                      >
                        Join ↗
                      </a>
                    )}
                    <div onClick={e => e.stopPropagation()}>
                      <BookmarkButton itemId={group._id} itemType="group" size="sm" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Load more */}
          {hasMore && (
            <div className="mt-6 text-center">
              <button
                onClick={() => loadGroups(false)}
                disabled={loadingMore}
                className="px-8 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-50 hover:scale-[1.02]"
                style={{ background: '#0d0c0a', border: '1px solid #2e2010', color: '#7a6040' }}
              >
                {loadingMore ? 'Loading...' : `Show more (${groups.length} of ${total})`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
