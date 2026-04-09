'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';

/* ─── Types ─── */
interface BookmarkedItem {
  _id: string;
  itemType: 'group' | 'bot';
  itemId: string;
  folderId: string | null;
  createdAt: string;
  item: {
    _id: string;
    name: string;
    slug: string;
    image: string;
    category: string;
    categories?: string[];
    country: string;
    memberCount?: number;
    description?: string;
    telegramLink?: string;
    _type: string;
  } | null;
}

interface Folder {
  _id: string;
  name: string;
  sortOrder: number;
}

interface SimGroup {
  _id: string;
  name: string;
  slug: string;
  image: string;
  category: string;
  categories?: string[];
  country?: string;
  memberCount?: number;
}

type ViewMode = 'mosaic' | 'list' | 'fullwidth';
type MosaicSize = 'big' | 'small';

const FREE_BOOKMARK_LIMIT = 20;
const FREE_FOLDER_LIMIT = 1;

const fmtNum = (n: number) => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(n >= 10_000 ? 0 : 1) + 'K';
  return n > 0 ? String(n) : '';
};

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
function IconTelegram() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0h-.056zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

/* ─── Main Component ─── */
export default function SavedGroupsTab1({
  isPremium,
  simData,
}: {
  isPremium: boolean;
  simData: SimGroup[] | null;
}) {
  const isSimulation = !!simData;

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined') return (localStorage.getItem('sg_view') as ViewMode) || 'mosaic';
    return 'mosaic';
  });
  const [mosaicSize, setMosaicSize] = useState<MosaicSize>(() => {
    if (typeof window !== 'undefined') return (localStorage.getItem('sg_size') as MosaicSize) || 'small';
    return 'small';
  });

  const [bookmarks, setBookmarks] = useState<BookmarkedItem[]>([]);
  const [allBookmarks, setAllBookmarks] = useState<BookmarkedItem[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [loading, setLoading] = useState(!isSimulation);

  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [editingFolder, setEditingFolder] = useState<string | null>(null);
  const [editFolderName, setEditFolderName] = useState('');

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const headers = { Authorization: `Bearer ${token}` };

  const persistView = (v: ViewMode) => { setViewMode(v); localStorage.setItem('sg_view', v); };
  const persistSize = (s: MosaicSize) => { setMosaicSize(s); localStorage.setItem('sg_size', s); };

  /* ── Data loading ── */
  const loadData = useCallback(async () => {
    if (isSimulation) return;
    try {
      setLoading(true);
      const params = activeFolder ? `?folderId=${activeFolder}` : '';
      const [bkRes, flRes, allRes] = await Promise.all([
        fetch(`/api/bookmarks${params}`, { headers }).then(r => r.json()),
        fetch('/api/bookmarks/folders', { headers }).then(r => r.json()),
        activeFolder ? fetch('/api/bookmarks', { headers }).then(r => r.json()) : Promise.resolve(null),
      ]);
      setBookmarks(Array.isArray(bkRes) ? bkRes : []);
      setFolders(Array.isArray(flRes) ? flRes : []);
      setAllBookmarks(allRes ? (Array.isArray(allRes) ? allRes : []) : (Array.isArray(bkRes) ? bkRes : []));
    } catch {}
    finally { setLoading(false); }
  }, [activeFolder, isSimulation]);

  useEffect(() => { loadData(); }, [loadData]);

  /* ── Folder CRUD ── */
  const createFolder = async () => {
    if (!isPremium && folders.length >= FREE_FOLDER_LIMIT) return;
    if (!newFolderName.trim()) return;
    try {
      const res = await fetch('/api/bookmarks/folders', {
        method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFolderName.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setFolders(prev => [...prev, { _id: data._id, name: data.name, sortOrder: prev.length }]);
        setNewFolderName('');
        setShowNewFolder(false);
      }
    } catch {}
  };

  const renameFolder = async (id: string) => {
    if (!editFolderName.trim()) return;
    try {
      await fetch(`/api/bookmarks/folders/${id}`, {
        method: 'PUT', headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editFolderName.trim() }),
      });
      setFolders(prev => prev.map(f => f._id === id ? { ...f, name: editFolderName.trim() } : f));
      setEditingFolder(null);
    } catch {}
  };

  const deleteFolder = async (id: string) => {
    if (!confirm('Delete this folder? Items will move to All Saved.')) return;
    try {
      await fetch(`/api/bookmarks/folders/${id}`, { method: 'DELETE', headers });
      setFolders(prev => prev.filter(f => f._id !== id));
      if (activeFolder === id) setActiveFolder(null);
      loadData();
    } catch {}
  };

  const removeBookmark = async (id: string) => {
    try {
      await fetch(`/api/bookmarks/${id}`, { method: 'DELETE', headers });
      setBookmarks(prev => prev.filter(b => b._id !== id));
      setAllBookmarks(prev => prev.filter(b => b._id !== id));
    } catch {}
  };

  const moveBookmark = async (bookmarkId: string, folderId: string | null) => {
    try {
      await fetch(`/api/bookmarks/${bookmarkId}`, {
        method: 'PUT', headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId }),
      });
      setBookmarks(prev => prev.map(b => b._id === bookmarkId ? { ...b, folderId } : b));
      setAllBookmarks(prev => prev.map(b => b._id === bookmarkId ? { ...b, folderId } : b));
      if (activeFolder && folderId !== activeFolder) {
        setBookmarks(prev => prev.filter(b => b._id !== bookmarkId));
      }
    } catch {}
  };

  /* ── Derived ── */
  const canCreateFolder = isPremium || folders.length < FREE_FOLDER_LIMIT;
  const items: BookmarkedItem[] = isSimulation
    ? (simData || []).map((g, i) => ({
        _id: g._id || String(i),
        itemType: 'group' as const,
        itemId: g._id,
        folderId: null,
        createdAt: new Date().toISOString(),
        item: { _id: g._id, name: g.name, slug: g.slug, image: g.image, category: g.category, categories: g.categories, country: g.country || '', memberCount: g.memberCount, _type: 'group' },
      }))
    : bookmarks.filter(b => b.item);

  const gridCols = viewMode === 'fullwidth'
    ? 'grid-cols-4 sm:grid-cols-6 md:grid-cols-8'
    : viewMode === 'mosaic'
      ? mosaicSize === 'big' ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5' : 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6'
      : '';

  return (
    <div>
      {/* ── Header + toolbar ── */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <div>
            <h2 className="text-base font-black text-white tracking-wide uppercase">Saved Groups</h2>
            <p className="text-[10px] text-white/30">
              {isSimulation ? `${items.length} groups (simulated)` : `${allBookmarks.length} saved`}
              {!isPremium && !isSimulation && (
                <span className="ml-1">
                  · <a href="/premium" target="_blank" rel="noopener noreferrer" className="text-[#00aff0] font-semibold hover:underline">Upgrade</a> for unlimited
                </span>
              )}
            </p>
          </div>

          {/* New Folder — always visible, prominent */}
          {!isSimulation && !showNewFolder && (
            isPremium ? (
              <button onClick={() => setShowNewFolder(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all hover:brightness-110"
                style={{ background: 'rgba(0,175,240,0.15)', color: '#00aff0', border: '1px solid rgba(0,175,240,0.3)' }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
                New Folder
              </button>
            ) : (
              <button onClick={() => window.open('/premium', '_blank', 'noopener,noreferrer')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all hover:brightness-110"
                style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
                New Folder
                <span className="px-1.5 py-0.5 rounded text-[8px] font-black text-white" style={{ background: '#00aff0' }}>VIP</span>
              </button>
            )
          )}
          {!isSimulation && showNewFolder && (
            <div className="flex items-center gap-1.5 px-2 py-1" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8 }}>
              <input value={newFolderName} onChange={e => setNewFolderName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && createFolder()}
                placeholder="Folder name..." autoFocus
                className="px-2 py-1 rounded-lg text-[11px] text-white outline-none w-28 bg-white/5" style={{ border: '1px solid rgba(255,255,255,0.08)' }} />
              <button onClick={createFolder} className="px-2 py-1 rounded-md text-[10px] font-bold text-white" style={{ background: '#00aff0' }}>Create</button>
              <button onClick={() => { setShowNewFolder(false); setNewFolderName(''); }} className="text-white/30 hover:text-white/60 text-[10px] px-1">✕</button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Size toggle (only for mosaic) */}
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

          {/* View mode toggle */}
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

      {/* ── Folders bar ── */}
      {!isSimulation && (
        <div className="mb-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-hide">
            <button onClick={() => setActiveFolder(null)}
              className="shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap"
              style={{
                background: activeFolder === null ? 'rgba(0,175,240,0.15)' : 'rgba(255,255,255,0.04)',
                color: activeFolder === null ? '#00aff0' : 'rgba(255,255,255,0.4)',
                border: activeFolder === null ? '1px solid rgba(0,175,240,0.3)' : '1px solid rgba(255,255,255,0.06)',
              }}>
              All ({allBookmarks.length})
            </button>

            {folders.map(f => {
              const isActive = activeFolder === f._id;
              const count = allBookmarks.filter(b => b.folderId === f._id).length;
              return (
                <div key={f._id} className="shrink-0 group/f flex items-center gap-0.5">
                  {editingFolder === f._id ? (
                    <div className="flex items-center gap-1">
                      <input value={editFolderName} onChange={e => setEditFolderName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && renameFolder(f._id)}
                        className="px-2 py-1 rounded-lg bg-white/10 text-white text-[11px] border border-white/20 outline-none w-24" autoFocus />
                      <button onClick={() => renameFolder(f._id)} className="text-emerald-400 text-[10px] font-bold px-1">OK</button>
                      <button onClick={() => setEditingFolder(null)} className="text-white/30 text-[10px] px-1">X</button>
                    </div>
                  ) : (
                    <button onClick={() => setActiveFolder(f._id)}
                      className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap"
                      style={{
                        background: isActive ? 'rgba(0,175,240,0.15)' : 'rgba(255,255,255,0.04)',
                        color: isActive ? '#00aff0' : 'rgba(255,255,255,0.4)',
                        border: isActive ? '1px solid rgba(0,175,240,0.3)' : '1px solid rgba(255,255,255,0.06)',
                      }}>
                      {f.name} ({count})
                    </button>
                  )}
                  {editingFolder !== f._id && (
                    <div className="hidden group-hover/f:flex items-center">
                      <button onClick={() => { setEditingFolder(f._id); setEditFolderName(f.name); }} className="text-white/20 hover:text-white/60 p-0.5" title="Rename">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                      </button>
                      <button onClick={() => deleteFolder(f._id)} className="text-white/20 hover:text-red-400 p-0.5" title="Delete">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {/* New folder button is in the header — nothing here */}
          </div>
        </div>
      )}

      {/* ── Active folder header ── */}
      {activeFolder && (
        <div className="flex items-center gap-2 mb-3">
          <button onClick={() => setActiveFolder(null)} className="text-white/30 hover:text-white transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
          </button>
          <h3 className="text-sm font-bold text-white">{folders.find(f => f._id === activeFolder)?.name}</h3>
        </div>
      )}

      {/* ── Loading ── */}
      {loading ? (
        <div className="py-16 text-center">
          <div className="w-8 h-8 border-2 border-white/10 border-t-[#00aff0] rounded-full animate-spin mx-auto mb-3" />
          <p className="text-white/30 text-sm">Loading saved groups...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="py-16 text-center">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mx-auto text-white/10 mb-3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z" />
          </svg>
          <p className="text-white/25 text-sm font-medium">{activeFolder ? 'This folder is empty' : 'No saved groups yet'}</p>
          <p className="text-white/15 text-xs mt-1">Browse groups and tap save to collect them here.</p>
          {!activeFolder && (
            <button onClick={() => window.open('/', '_blank', 'noopener,noreferrer')}
              className="mt-4 px-4 py-2 rounded-lg text-[11px] font-bold text-white" style={{ background: '#00aff0' }}>
              Browse Groups
            </button>
          )}
        </div>
      ) : viewMode === 'list' ? (
        /* ─── LIST VIEW ─── */
        <div className="space-y-1.5">
          {items.map(bk => (
            <div key={bk._id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all hover:bg-white/[0.03]"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 cursor-pointer"
                onClick={() => window.open(`/${bk.item!.slug}`, '_blank', 'noopener,noreferrer')}
                style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                <img src={bk.item!.image || '/assets/placeholder-no-image.png'} alt="" className="w-full h-full object-cover"
                  onError={e => { (e.target as HTMLImageElement).src = '/assets/placeholder-no-image.png'; }} />
              </div>
              <div className="flex-1 min-w-0">
                <button onClick={() => window.open(`/${bk.item!.slug}`, '_blank', 'noopener,noreferrer')}
                  className="block text-[13px] font-bold text-white truncate leading-tight hover:text-[#00aff0] transition-colors text-left">
                  {bk.item!.name}
                </button>
                <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                  {(bk.item!.categories?.length ? bk.item!.categories : [bk.item!.category]).filter(Boolean).slice(0, 3).map((cat, i) => (
                    <span key={i} className="text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
                      style={{ background: 'rgba(0,175,240,0.08)', color: 'rgba(0,175,240,0.6)', border: '1px solid rgba(0,175,240,0.1)' }}>{cat}</span>
                  ))}
                  {bk.item!.memberCount ? (
                    <span className="text-[9px] text-white/25 font-medium tabular-nums ml-1">{fmtNum(bk.item!.memberCount)} members</span>
                  ) : null}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {bk.item!.telegramLink && (
                  <a href={bk.item!.telegramLink} target="_blank" rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-white transition-all hover:scale-[1.04]"
                    style={{ background: '#0088cc' }} title="Open in Telegram">
                    <IconTelegram /> Open
                  </a>
                )}
                <button onClick={() => window.open(`/${bk.item!.slug}`, '_blank', 'noopener,noreferrer')}
                  className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-white/50 hover:text-white transition-all"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  View
                </button>
                {!isSimulation && <ThreeDotMenu bk={bk} isPremium={isPremium} folders={folders} onRemove={removeBookmark} onMove={moveBookmark} />}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ─── MOSAIC / FULL-WIDTH VIEW ─── */
        <div className={`grid gap-1.5 ${gridCols}`}>
          {items.map(bk => (
            <div key={bk._id} className="group relative rounded-xl overflow-hidden transition-all duration-200 hover:scale-[1.02]"
              style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className={viewMode === 'fullwidth' ? 'aspect-square' : mosaicSize === 'big' ? 'aspect-[3/4]' : 'aspect-square'}>
                <img src={bk.item!.image || '/assets/placeholder-no-image.png'} alt="" className="w-full h-full object-cover cursor-pointer"
                  onClick={() => window.open(`/${bk.item!.slug}`, '_blank', 'noopener,noreferrer')}
                  loading="lazy"
                  onError={e => { (e.target as HTMLImageElement).src = '/assets/placeholder-no-image.png'; }} />
              </div>

              <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.1) 50%, transparent 70%)' }} />

              {/* Telegram shortcut (top-left) */}
              {bk.item!.telegramLink && (
                <a href={bk.item!.telegramLink} target="_blank" rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="absolute top-1.5 left-1.5 z-10 flex items-center justify-center w-7 h-7 rounded-lg text-white transition-all hover:scale-110"
                  style={{ background: '#0088cccc', backdropFilter: 'blur(4px)' }} title="Open in Telegram">
                  <IconTelegram />
                </a>
              )}

              {/* 3-dot menu (top-right) */}
              {!isSimulation && (
                <div className="absolute top-1.5 right-1.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ThreeDotMenu bk={bk} isPremium={isPremium} folders={folders} onRemove={removeBookmark} onMove={moveBookmark} />
                </div>
              )}

              {/* Info overlay (bottom) */}
              <div className="absolute bottom-0 left-0 right-0 px-2 pb-2 pointer-events-none">
                {viewMode !== 'fullwidth' && (
                  <>
                    <p className="text-[10px] font-bold text-white truncate leading-tight drop-shadow-sm">{bk.item!.name}</p>
                    <div className="flex flex-wrap gap-0.5 mt-0.5">
                      {(bk.item!.categories?.length ? bk.item!.categories : [bk.item!.category]).filter(Boolean).slice(0, 2).map((cat, i) => (
                        <span key={i} className="px-1 py-[1px] rounded text-[7px] font-semibold text-white/70" style={{ background: 'rgba(0,175,240,0.3)' }}>{cat}</span>
                      ))}
                    </div>
                    {bk.item!.memberCount ? (
                      <p className="text-[8px] text-white/40 mt-0.5 tabular-nums">{fmtNum(bk.item!.memberCount)} members</p>
                    ) : null}
                  </>
                )}
                {viewMode === 'fullwidth' && (
                  <p className="text-[8px] font-bold text-white truncate leading-tight drop-shadow-sm">{bk.item!.name}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Premium upsell for free users */}
      {!isPremium && !isSimulation && allBookmarks.length > 0 && (
        <div className="mt-4 rounded-xl px-4 py-3 flex items-center gap-3"
          style={{ background: 'rgba(0,175,240,0.05)', border: '1px solid rgba(0,175,240,0.12)' }}>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold text-white/60">
              {FREE_BOOKMARK_LIMIT - allBookmarks.length > 0
                ? `${FREE_BOOKMARK_LIMIT - allBookmarks.length} saves remaining`
                : 'Save limit reached'}
            </p>
            <p className="text-[9px] text-white/25 mt-0.5">Upgrade to VIP for unlimited saves & folders</p>
          </div>
          <a href="/premium" target="_blank" rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-lg text-[10px] font-bold text-white shrink-0" style={{ background: '#00aff0' }}>
            Upgrade
          </a>
        </div>
      )}
    </div>
  );
}

/* ─── Three-dot context menu ─── */
function ThreeDotMenu({ bk, isPremium, folders, onRemove, onMove }: {
  bk: BookmarkedItem; isPremium: boolean; folders: Folder[];
  onRemove: (id: string) => void; onMove: (id: string, folderId: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [showMove, setShowMove] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) && btnRef.current && !btnRef.current.contains(e.target as Node)) {
        setOpen(false); setShowMove(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const toggle = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (open) { setOpen(false); setShowMove(false); return; }
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: Math.max(8, rect.right - 176) });
    }
    setOpen(true);
  };

  const dropdown = open && pos ? createPortal(
    <div ref={menuRef} className="fixed w-44 rounded-xl overflow-hidden shadow-2xl"
      style={{ top: pos.top, left: pos.left, background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', zIndex: 9999 }}>
      {!showMove ? (
        <>
          <button onClick={e => { e.preventDefault(); e.stopPropagation(); onRemove(bk._id); setOpen(false); }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left text-[12px] font-semibold text-red-400 hover:bg-red-500/10 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
            Remove
          </button>
          {isPremium && folders.length > 0 && (
            <button onClick={e => { e.preventDefault(); e.stopPropagation(); setShowMove(true); }}
              className="w-full flex items-center justify-between gap-2.5 px-3.5 py-2.5 text-left text-[12px] font-semibold text-[#00aff0] hover:bg-white/5 transition-colors">
              <span className="flex items-center gap-2.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" /></svg>
                Move to folder
              </span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
            </button>
          )}
        </>
      ) : (
        <>
          <button onClick={e => { e.preventDefault(); e.stopPropagation(); setShowMove(false); }}
            className="w-full flex items-center gap-2 px-3.5 py-2 text-left text-[11px] font-bold text-white/40 hover:bg-white/5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
            Back
          </button>
          <div className="h-px bg-white/5" />
          <button onClick={e => { e.preventDefault(); e.stopPropagation(); onMove(bk._id, null); setOpen(false); setShowMove(false); }}
            className="w-full px-3.5 py-2.5 text-left text-[12px] font-semibold transition-colors hover:bg-white/5"
            style={{ color: !bk.folderId ? '#00aff0' : 'rgba(255,255,255,0.6)' }}>
            Unsorted {!bk.folderId && '✓'}
          </button>
          {folders.map(f => (
            <button key={f._id}
              onClick={e => { e.preventDefault(); e.stopPropagation(); onMove(bk._id, f._id); setOpen(false); setShowMove(false); }}
              className="w-full px-3.5 py-2.5 text-left text-[12px] font-semibold transition-colors hover:bg-white/5"
              style={{ color: bk.folderId === f._id ? '#00aff0' : 'rgba(255,255,255,0.6)' }}>
              {f.name} {bk.folderId === f._id && '✓'}
            </button>
          ))}
        </>
      )}
    </div>,
    document.body
  ) : null;

  return (
    <div className="relative">
      <button ref={btnRef} onClick={toggle}
        className="flex items-center justify-center w-7 h-7 rounded-lg transition-all hover:bg-white/10" title="More">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="rgba(255,255,255,0.4)">
          <circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" />
        </svg>
      </button>
      {dropdown}
    </div>
  );
}
