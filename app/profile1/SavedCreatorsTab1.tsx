'use client';

import { useState, useEffect } from 'react';

/* ─── Types ─── */
interface SavedCreator {
  _id: string;
  name: string;
  username: string;
  slug: string;
  avatar: string;
  bio?: string;
  price?: number;
  isFree?: boolean;
  url?: string;
  clicks?: number;
  categories?: string[];
  likesCount?: number;
}

interface SimCreator {
  _id: string;
  name: string;
  username: string;
  slug?: string;
  avatar: string;
  categories?: string[];
}

type ViewMode = 'mosaic' | 'list' | 'fullwidth';
type MosaicSize = 'big' | 'small';

/* ─── Icons ─── */
function IconMosaic({ active }: { active: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={active ? '#fff' : 'currentColor'} strokeWidth="2.5" strokeLinecap="round">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
    </svg>
  );
}
function IconList({ active }: { active: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={active ? '#fff' : 'currentColor'} strokeWidth="2.5" strokeLinecap="round">
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  );
}
function IconFullWidth({ active }: { active: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={active ? '#fff' : 'currentColor'} strokeWidth="2" strokeLinecap="round">
      <rect x="2" y="3" width="4" height="18" rx="1" /><rect x="7.5" y="3" width="4" height="18" rx="1" /><rect x="13" y="3" width="4" height="18" rx="1" /><rect x="18.5" y="3" width="4" height="18" rx="1" />
    </svg>
  );
}

/* ─── Main Component ─── */
export default function SavedCreatorsTab1({
  isPremium,
  simData,
}: {
  isPremium: boolean;
  simData: SimCreator[] | null;
}) {
  const isSimulation = !!simData;

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined') return (localStorage.getItem('sc_view') as ViewMode) || 'mosaic';
    return 'mosaic';
  });
  const [mosaicSize, setMosaicSize] = useState<MosaicSize>(() => {
    if (typeof window !== 'undefined') return (localStorage.getItem('sc_size') as MosaicSize) || 'small';
    return 'small';
  });

  const [creators, setCreators] = useState<SavedCreator[]>([]);
  const [loading, setLoading] = useState(!isSimulation);

  const persistView = (v: ViewMode) => { setViewMode(v); localStorage.setItem('sc_view', v); };
  const persistSize = (s: MosaicSize) => { setMosaicSize(s); localStorage.setItem('sc_size', s); };

  useEffect(() => {
    if (isSimulation) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch('/api/onlyfans/save/creators', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data.creators)) setCreators(data.creators); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isSimulation]);

  const handleUnsave = async (creatorId: string) => {
    setCreators(prev => prev.filter(c => c._id !== creatorId));
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      await fetch('/api/onlyfans/save', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ creatorId }),
      });
    } catch {}
  };

  const openCreator = (c: SavedCreator | SimCreator) => {
    const slug = ('slug' in c && c.slug) ? c.slug : c.username;
    window.open(`/${slug}-onlyfans`, '_blank', 'noopener,noreferrer');
  };

  const items: (SavedCreator | SimCreator)[] = isSimulation ? (simData || []) : creators;

  const gridCols = viewMode === 'fullwidth'
    ? 'grid-cols-4 sm:grid-cols-6 md:grid-cols-8'
    : viewMode === 'mosaic'
      ? mosaicSize === 'big' ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5' : 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6'
      : '';

  return (
    <div>
      {/* ── Header + toolbar ── */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div>
          <h2 className="text-base font-black text-white tracking-wide uppercase">Saved OF Creators</h2>
          <p className="text-[10px] text-white/30">
            {items.length} creator{items.length !== 1 ? 's' : ''} {isSimulation && '(simulated)'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {viewMode === 'mosaic' && (
            <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
              <button onClick={() => persistSize('big')} className="px-2 py-1.5 text-[9px] font-bold uppercase transition-all"
                style={{ background: mosaicSize === 'big' ? 'rgba(0,175,240,0.2)' : 'transparent', color: mosaicSize === 'big' ? '#00aff0' : 'rgba(255,255,255,0.3)' }}>
                Big
              </button>
              <button onClick={() => persistSize('small')} className="px-2 py-1.5 text-[9px] font-bold uppercase transition-all"
                style={{ background: mosaicSize === 'small' ? 'rgba(0,175,240,0.2)' : 'transparent', color: mosaicSize === 'small' ? '#00aff0' : 'rgba(255,255,255,0.3)' }}>
                Small
              </button>
            </div>
          )}

          <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
            {([
              { mode: 'mosaic' as ViewMode, icon: <IconMosaic active={viewMode === 'mosaic'} />, title: 'Mosaic' },
              { mode: 'list' as ViewMode, icon: <IconList active={viewMode === 'list'} />, title: 'List' },
              { mode: 'fullwidth' as ViewMode, icon: <IconFullWidth active={viewMode === 'fullwidth'} />, title: 'Compact' },
            ]).map(v => (
              <button key={v.mode} onClick={() => persistView(v.mode)} title={v.title}
                className="px-2.5 py-1.5 transition-all"
                style={{ background: viewMode === v.mode ? 'rgba(0,175,240,0.2)' : 'transparent', color: viewMode === v.mode ? '#fff' : 'rgba(255,255,255,0.3)' }}>
                {v.icon}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Loading ── */}
      {loading ? (
        <div className="py-16 text-center">
          <div className="w-8 h-8 border-2 border-white/10 border-t-[#00aff0] rounded-full animate-spin mx-auto mb-3" />
          <p className="text-white/30 text-sm">Loading saved creators...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="py-16 text-center">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mx-auto text-white/10 mb-3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          <p className="text-white/25 text-sm font-medium">No saved creators yet</p>
          <p className="text-white/15 text-xs mt-1">Browse the OnlyFans directory and tap the heart to save.</p>
          <button onClick={() => window.open('/onlyfanssearch', '_blank', 'noopener,noreferrer')}
            className="mt-4 px-4 py-2 rounded-lg text-[11px] font-bold text-white" style={{ background: '#00aff0' }}>
            Browse Creators
          </button>
        </div>
      ) : viewMode === 'list' ? (
        /* ─── LIST VIEW ─── */
        <div className="space-y-1.5">
          {items.map(c => (
            <div key={c._id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all hover:bg-white/[0.03]"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 cursor-pointer"
                onClick={() => openCreator(c)}
                style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                <img src={c.avatar || '/assets/placeholder-no-image.png'} alt="" className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={e => { (e.target as HTMLImageElement).src = '/assets/placeholder-no-image.png'; }} />
              </div>
              <div className="flex-1 min-w-0">
                <button onClick={() => openCreator(c)}
                  className="block text-[13px] font-bold text-white truncate leading-tight hover:text-[#00aff0] transition-colors text-left">
                  {c.name}
                </button>
                <p className="text-[10px] text-white/30 truncate">@{c.username}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {'likesCount' in c && (c as SavedCreator).likesCount ? (
                    <span className="text-[9px] text-white/35 flex items-center gap-0.5">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="none" className="text-pink-400/60"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                      {((c as SavedCreator).likesCount! >= 1000 ? `${((c as SavedCreator).likesCount! / 1000).toFixed(1)}k` : (c as SavedCreator).likesCount)}
                    </span>
                  ) : null}
                  {c.categories && c.categories.length > 0 && (
                    <div className="flex flex-wrap gap-0.5">
                      {c.categories.slice(0, 3).map((cat, i) => (
                        <span key={i} className="text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded capitalize"
                          style={{ background: 'rgba(0,175,240,0.08)', color: 'rgba(0,175,240,0.6)', border: '1px solid rgba(0,175,240,0.1)' }}>{cat}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {'url' in c && (c as SavedCreator).url && (
                  <button onClick={e => { e.stopPropagation(); window.open((c as SavedCreator).url!, '_blank', 'noopener,noreferrer'); }}
                    className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-white transition-all hover:brightness-110"
                    style={{ background: '#00aff0' }}>
                    Visit OF
                  </button>
                )}
                {!isSimulation && (
                  <button onClick={() => handleUnsave(c._id)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-500/10 transition-all"
                    title="Remove from saved">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ─── MOSAIC / FULL-WIDTH VIEW ─── */
        <div className={`grid gap-1.5 ${gridCols}`}>
          {items.map(c => (
            <div key={c._id} className="group relative rounded-xl overflow-hidden transition-all duration-200 hover:scale-[1.02] cursor-pointer"
              onClick={() => openCreator(c)}
              style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className={viewMode === 'fullwidth' ? 'aspect-square' : mosaicSize === 'big' ? 'aspect-[3/4]' : 'aspect-square'}>
                <img src={c.avatar || '/assets/placeholder-no-image.png'} alt="" className="w-full h-full object-cover"
                  loading="lazy" referrerPolicy="no-referrer"
                  onError={e => { (e.target as HTMLImageElement).src = '/assets/placeholder-no-image.png'; }} />
              </div>

              <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.1) 50%, transparent 70%)' }} />

              {/* Unsave button (top-right — always visible on mobile, hover on desktop) */}
              {!isSimulation && (
                <button onClick={e => { e.stopPropagation(); handleUnsave(c._id); }}
                  className="absolute top-1.5 right-1.5 z-10 w-7 h-7 rounded-full flex items-center justify-center sm:opacity-0 sm:group-hover:opacity-100 transition-all hover:bg-red-500/80"
                  style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
                  title="Remove">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="#f87171" stroke="none">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                </button>
              )}

              {/* Price badge (top-left) */}
              {'isFree' in c && viewMode !== 'fullwidth' && (
                <div className="absolute top-1.5 left-1.5 z-10">
                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${c.isFree ? 'bg-emerald-500 text-white' : 'bg-[#00aff0] text-white'}`}
                    style={{ backdropFilter: 'blur(4px)' }}>
                    {c.isFree ? 'Free' : `$${c.price}`}
                  </span>
                </div>
              )}

              {/* Info overlay (bottom) */}
              <div className="absolute bottom-0 left-0 right-0 px-2 pb-2">
                {viewMode !== 'fullwidth' ? (
                  <>
                    <p className="text-[10px] font-bold text-white truncate leading-tight drop-shadow-sm">{c.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {'likesCount' in c && (c as SavedCreator).likesCount ? (
                        <span className="text-[8px] text-white/50 flex items-center gap-0.5">
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="#f472b6" stroke="none"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                          {((c as SavedCreator).likesCount! >= 1000 ? `${((c as SavedCreator).likesCount! / 1000).toFixed(1)}k` : (c as SavedCreator).likesCount)}
                        </span>
                      ) : null}
                      {c.categories && c.categories.length > 0 && c.categories.slice(0, 2).map((cat, i) => (
                        <span key={i} className="px-1 py-[1px] rounded text-[7px] font-semibold text-white/70 capitalize" style={{ background: 'rgba(0,175,240,0.3)' }}>{cat}</span>
                      ))}
                    </div>
                    {'url' in c && (c as SavedCreator).url && (
                      <button onClick={e => { e.stopPropagation(); window.open((c as SavedCreator).url!, '_blank', 'noopener,noreferrer'); }}
                        className="pointer-events-auto mt-1 w-full py-1 rounded text-[8px] font-bold text-white text-center transition-all hover:brightness-110"
                        style={{ background: 'rgba(0,175,240,0.8)' }}>
                        Visit OnlyFans ↗
                      </button>
                    )}
                  </>
                ) : (
                  <p className="text-[8px] font-bold text-white truncate leading-tight drop-shadow-sm pointer-events-none">{c.name}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Browse more CTA ── */}
      {items.length > 0 && (
        <div className="mt-4 text-center">
          <button onClick={() => window.open('/onlyfanssearch', '_blank', 'noopener,noreferrer')}
            className="text-[11px] font-semibold text-[#00aff0] hover:text-[#00aff0]/70 transition-colors">
            Browse more creators →
          </button>
        </div>
      )}
    </div>
  );
}
