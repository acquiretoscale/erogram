'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import axios from 'axios';
import UpgradeModal from '@/components/UpgradeModal';

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
    _type: string;
  } | null;
}

interface Folder {
  _id: string;
  name: string;
  sortOrder: number;
}

export default function SavedTab({ isPremium }: { isPremium: boolean }) {
  const [bookmarks, setBookmarks] = useState<BookmarkedItem[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [editingFolder, setEditingFolder] = useState<string | null>(null);
  const [editFolderName, setEditFolderName] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(() => {
    if (typeof window !== 'undefined') return (localStorage.getItem('saved_view') as 'list' | 'grid') || 'list';
    return 'list';
  });
  const [allBookmarks, setAllBookmarks] = useState<BookmarkedItem[]>([]);
  const [showInfoBox, setShowInfoBox] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const headers = { Authorization: `Bearer ${token}` };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [bkRes, flRes, allRes] = await Promise.all([
        axios.get('/api/bookmarks', { headers, params: activeFolder ? { folderId: activeFolder } : {} }),
        axios.get('/api/bookmarks/folders', { headers }),
        activeFolder ? axios.get('/api/bookmarks', { headers }) : Promise.resolve(null),
      ]);
      setBookmarks(bkRes.data);
      setFolders(flRes.data);
      setAllBookmarks(allRes ? allRes.data : bkRes.data);
    } catch { /* */ }
    finally { setLoading(false); }
  }, [activeFolder]);

  useEffect(() => { loadData(); }, [loadData]);

  const removeBookmark = async (id: string) => {
    try {
      await axios.delete(`/api/bookmarks/${id}`, { headers });
      setBookmarks(prev => prev.filter(b => b._id !== id));
      setAllBookmarks(prev => prev.filter(b => b._id !== id));
    } catch { /* */ }
  };

  const moveBookmark = async (bookmarkId: string, folderId: string | null) => {
    try {
      await axios.put(`/api/bookmarks/${bookmarkId}`, { folderId }, { headers });
      setBookmarks(prev => prev.map(b => b._id === bookmarkId ? { ...b, folderId } : b));
      setAllBookmarks(prev => prev.map(b => b._id === bookmarkId ? { ...b, folderId } : b));
      if (activeFolder && folderId !== activeFolder) {
        setBookmarks(prev => prev.filter(b => b._id !== bookmarkId));
      }
    } catch { /* */ }
  };

  const createFolder = async () => {
    if (!isPremium) { setShowUpgrade(true); return; }
    if (!newFolderName.trim()) return;
    try {
      const res = await axios.post('/api/bookmarks/folders', { name: newFolderName.trim() }, { headers });
      setFolders(prev => [...prev, { _id: res.data._id, name: res.data.name, sortOrder: prev.length }]);
      setNewFolderName('');
      setShowNewFolder(false);
    } catch { /* */ }
  };

  const renameFolder = async (id: string) => {
    if (!editFolderName.trim()) return;
    try {
      await axios.put(`/api/bookmarks/folders/${id}`, { name: editFolderName.trim() }, { headers });
      setFolders(prev => prev.map(f => f._id === id ? { ...f, name: editFolderName.trim() } : f));
      setEditingFolder(null);
    } catch { /* */ }
  };

  const deleteFolder = async (id: string) => {
    if (!confirm('Delete this folder? Bookmarks will be moved to All Saved.')) return;
    try {
      await axios.delete(`/api/bookmarks/folders/${id}`, { headers });
      setFolders(prev => prev.filter(f => f._id !== id));
      if (activeFolder === id) setActiveFolder(null);
      loadData();
    } catch { /* */ }
  };

  const formatNum = (n: number) => {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(n >= 10_000 ? 0 : 1) + 'K';
    return n.toLocaleString();
  };

  const getFolderPreviews = (folderId: string) => {
    return allBookmarks
      .filter(b => b.folderId === folderId && b.item?.image)
      .slice(0, 4)
      .map(b => b.item!.image);
  };

  const getFolderCount = (folderId: string) => allBookmarks.filter(b => b.folderId === folderId).length;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-black text-white">Your Collection</h2>
          <p className="text-[11px] text-white/30">{allBookmarks.length} saved {!isPremium && `(${allBookmarks.length}/4 free)`}</p>
        </div>
        <div className="flex items-center gap-1.5">
          {isPremium && (
            <button
              onClick={() => setShowInfoBox(v => !v)}
              className="flex items-center justify-center w-8 h-8 rounded-lg transition-all"
              style={{
                background: showInfoBox ? '#c9973a' : '#0d0c0a',
                color: showInfoBox ? '#0d0c0a' : '#7a6040',
                border: showInfoBox ? '1px solid #c9973a' : '1px solid #2e2010',
              }}
              title="How it works"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
            </button>
          )}
          <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid #2e2010' }}>
            <button
              onClick={() => { setViewMode('list'); localStorage.setItem('saved_view', 'list'); }}
              className="px-2.5 py-2 transition-all"
              style={{ background: viewMode === 'list' ? '#c9973a' : '#0d0c0a', color: viewMode === 'list' ? '#0d0c0a' : '#7a6040' }}
              title="List view"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>
            </button>
            <button
              onClick={() => { setViewMode('grid'); localStorage.setItem('saved_view', 'grid'); }}
              className="px-2.5 py-2 transition-all"
              style={{ background: viewMode === 'grid' ? '#c9973a' : '#0d0c0a', color: viewMode === 'grid' ? '#0d0c0a' : '#7a6040' }}
              title="Grid view"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
            </button>
          </div>
        </div>
      </div>

      {/* Info box — toggled by the (i) button */}
      {isPremium && showInfoBox && (
        <div
          className="mb-3 px-3 py-2 rounded-xl"
          style={{ background: '#1a150a', border: '1px solid #2e201066' }}
        >
          <ul className="text-[10px] text-white/40 leading-relaxed space-y-0.5">
            <li><span style={{ color: '#c9973a' }}>Bookmark</span> any group or bot to save it here.</li>
            <li>Create <span style={{ color: '#c9973a' }}>folders</span> to organize your collection.</li>
            <li>Switch between <span style={{ color: '#c9973a' }}>list</span> &amp; <span style={{ color: '#c9973a' }}>grid</span> view anytime.</li>
            <li>Move items between folders with the dropdown on each card.</li>
          </ul>
        </div>
      )}

      {/* Folders — compact horizontal row */}
      <div className="mb-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-hide">
          {/* All Saved */}
          <button
            onClick={() => setActiveFolder(null)}
            className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all"
            style={{
              background: activeFolder === null ? 'linear-gradient(135deg, #c9973a, #a67c2e)' : '#0d0c0a',
              color: activeFolder === null ? '#0d0c0a' : '#7a6040',
              border: activeFolder === null ? 'none' : '1px solid #2e2010',
            }}
          >
            <div className="flex -space-x-1.5">
              {allBookmarks.filter(b => b.item?.image).slice(0, 3).map((b, i) => (
                <img key={i} src={b.item!.image} alt="" className="w-5 h-5 rounded-full object-cover border border-black/50" onError={e => { (e.target as HTMLImageElement).src = '/assets/placeholder-no-image.png'; }} />
              ))}
              {allBookmarks.filter(b => b.item?.image).length === 0 && (
                <div className="w-5 h-5 rounded-full bg-white/10" />
              )}
            </div>
            <span className="text-[11px] font-bold whitespace-nowrap">All <span className="opacity-60">({allBookmarks.length})</span></span>
          </button>

          {/* User folders */}
          {folders.map(f => {
            const previews = getFolderPreviews(f._id);
            const count = getFolderCount(f._id);
            const isActive = activeFolder === f._id;
            return (
              <div key={f._id} className="shrink-0 group/f flex items-center gap-0.5">
                {editingFolder === f._id ? (
                  <div className="flex items-center gap-1">
                    <input
                      value={editFolderName}
                      onChange={e => setEditFolderName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && renameFolder(f._id)}
                      className="px-2 py-1 rounded-lg bg-white/10 text-white text-[11px] border border-white/20 outline-none w-24"
                      autoFocus
                    />
                    <button onClick={() => renameFolder(f._id)} className="text-green-400 text-[10px] font-bold px-1">OK</button>
                    <button onClick={() => setEditingFolder(null)} className="text-white/30 text-[10px] px-1">X</button>
                  </div>
                ) : (
                  <button
                    onClick={() => setActiveFolder(f._id)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all"
                    style={{
                      background: isActive ? 'linear-gradient(135deg, #c9973a, #a67c2e)' : '#0d0c0a',
                      color: isActive ? '#0d0c0a' : '#7a6040',
                      border: isActive ? 'none' : '1px solid #2e2010',
                    }}
                  >
                    <div className="flex -space-x-1.5">
                      {previews.slice(0, 2).map((img, i) => (
                        <img key={i} src={img} alt="" className="w-5 h-5 rounded-full object-cover border border-black/50" onError={e => { (e.target as HTMLImageElement).src = '/assets/placeholder-no-image.png'; }} />
                      ))}
                      {previews.length === 0 && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-40"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
                      )}
                    </div>
                    <span className="text-[11px] font-bold whitespace-nowrap">{f.name} <span className="opacity-60">({count})</span></span>
                  </button>
                )}
                {editingFolder !== f._id && (
                  <div className="hidden group-hover/f:flex items-center">
                    <button onClick={() => { setEditingFolder(f._id); setEditFolderName(f.name); }} className="text-white/20 hover:text-white/60 p-0.5" title="Rename">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button onClick={() => deleteFolder(f._id)} className="text-white/20 hover:text-red-400 p-0.5" title="Delete">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {/* New folder button */}
          {!showNewFolder ? (
            <button
              onClick={() => setShowNewFolder(true)}
              className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-all hover:bg-white/5"
              style={{ border: '1px dashed #2e2010', color: '#7a6040' }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
              <span className="text-[10px] font-bold whitespace-nowrap">Folder</span>
            </button>
          ) : (
            <div className="shrink-0 flex items-center gap-1">
              <input
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && createFolder()}
                placeholder="Name..."
                className="px-2 py-1 rounded-lg text-[11px] text-white outline-none w-24"
                style={{ background: '#0d0c0a', border: '1px solid #2e2010' }}
                autoFocus
              />
              <button onClick={createFolder} className="text-green-400 text-[10px] font-bold px-1">OK</button>
              <button onClick={() => { setShowNewFolder(false); setNewFolderName(''); }} className="text-white/30 text-[10px] px-1">X</button>
            </div>
          )}
        </div>
      </div>

      {/* Active folder name */}
      {activeFolder && (
        <div className="flex items-center gap-2 mb-3">
          <button onClick={() => setActiveFolder(null)} className="text-white/30 hover:text-white transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <h3 className="text-sm font-bold text-white">{folders.find(f => f._id === activeFolder)?.name || 'Folder'}</h3>
          <span className="text-[10px] text-white/20">{bookmarks.length} items</span>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="py-16 text-center">
          <div className="w-8 h-8 border-2 border-white/10 border-t-white/40 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/30 text-sm">Loading your collection...</p>
        </div>
      ) : bookmarks.length === 0 ? (
        <div className="py-16 text-center">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mx-auto text-white/10 mb-4">
            <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <p className="text-white/25 text-sm font-medium">{activeFolder ? 'This folder is empty' : 'No saved items yet'}</p>
          <p className="text-white/15 text-xs mt-1">Bookmark groups and bots to find them here</p>
        </div>
      ) : viewMode === 'list' ? (
        /* List View */
        <div className="space-y-1.5">
          {bookmarks.map(bk => bk.item && (
            <div
              key={bk._id}
              className="group/card relative rounded-2xl overflow-hidden transition-all duration-300"
              style={{ background: 'linear-gradient(135deg, #0f0d08, #120e09)', border: '1px solid #2a1f0e' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.border = '1px solid #c9973a44'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.border = '1px solid #2a1f0e'; }}
            >
              <div className="absolute left-0 top-0 bottom-0 w-px" style={{ background: 'linear-gradient(180deg, transparent, #c9973a55, transparent)' }} />
              <div className="flex items-center gap-3 px-3 py-2.5">
                <Link href={`/${bk.item.slug}`} className="shrink-0">
                  <div className="w-12 h-12 rounded-xl overflow-hidden" style={{ border: '1px solid #2e2010' }}>
                    <img src={bk.item.image || '/assets/placeholder-no-image.png'} alt={bk.item.name} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).src = '/assets/placeholder-no-image.png'; }} />
                  </div>
                </Link>
                <div className="flex-1 min-w-0">
                  <Link href={`/${bk.item.slug}`} className="block font-bold text-[14px] text-white truncate leading-tight transition-colors hover:text-[#c9973a]">{bk.item.name}</Link>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    {(bk.item.categories?.length ? bk.item.categories : [bk.item.category]).filter(Boolean).slice(0, 3).map((cat, i) => (
                      <span key={i} className="text-[9px] font-black uppercase tracking-[0.12em] px-1.5 py-0.5 rounded" style={{ background: '#1a1408', border: '1px solid #c9973a22', color: i === 0 ? '#c9973a' : '#7a6040' }}>{cat}</span>
                    ))}
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase" style={{ background: bk.itemType === 'bot' ? '#0088cc15' : '#c9973a10', color: bk.itemType === 'bot' ? '#4ab3f4' : '#7a6040' }}>{bk.itemType}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {bk.item.memberCount ? (
                    <div className="text-right mr-1">
                      <div className="text-[15px] font-black leading-none" style={{ color: '#c9973a' }}>{formatNum(bk.item.memberCount)}</div>
                      <div className="text-[8px] font-bold uppercase tracking-widest" style={{ color: '#7a6040' }}>subs</div>
                    </div>
                  ) : null}
                  <div className="w-px h-7" style={{ background: '#2e2010' }} />
                  {isPremium && folders.length > 0 && (
                    <select
                      value={bk.folderId || ''}
                      onChange={e => moveBookmark(bk._id, e.target.value || null)}
                      className="rounded-lg text-[9px] font-bold outline-none cursor-pointer px-1.5 py-1"
                      style={{ background: '#0d0c0a', border: '1px solid #2e2010', color: '#7a6040', maxWidth: '70px' }}
                      onClick={e => e.stopPropagation()}
                    >
                      <option value="">Unsorted</option>
                      {folders.map(f => <option key={f._id} value={f._id}>{f.name}</option>)}
                    </select>
                  )}
                  <Link href={`/${bk.item.slug}`} className="px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wide transition-all hover:scale-[1.04]" style={{ background: 'linear-gradient(135deg, #c9973a, #a67c2e)', color: '#0d0c0a' }}>
                    View
                  </Link>
                  <button
                    onClick={() => removeBookmark(bk._id)}
                    className="flex items-center justify-center w-7 h-7 rounded-lg transition-all opacity-40 hover:opacity-100 hover:bg-red-500/20"
                    title="Remove bookmark"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Grid View */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {bookmarks.map(bk => bk.item && (
            <div
              key={bk._id}
              className="group/tile relative rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.03] cursor-pointer"
              style={{ border: '1px solid #2a1f0e' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.border = '1px solid #c9973a66'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px #c9973a15'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.border = '1px solid #2a1f0e'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
            >
              <Link href={`/${bk.item.slug}`} className="block aspect-square relative">
                <img
                  src={bk.item.image || '/assets/placeholder-no-image.png'}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={e => { (e.target as HTMLImageElement).src = '/assets/placeholder-no-image.png'; }}
                />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 30%, #0a0908dd 70%, #0a0908 100%)' }} />
                <div className="absolute bottom-0 left-0 right-0 p-2">
                  <p className="text-[11px] font-bold text-white leading-tight truncate mb-1">{bk.item.name}</p>
                  <div className="flex flex-wrap gap-0.5 mb-1">
                    {(bk.item.categories?.length ? bk.item.categories : [bk.item.category]).filter(Boolean).slice(0, 2).map((cat, i) => (
                      <span key={i} className="text-[7px] font-black uppercase tracking-wide px-1 py-px rounded" style={{ background: '#0a090866', color: i === 0 ? '#c9973a' : '#7a6040' }}>{cat}</span>
                    ))}
                  </div>
                  {bk.item.memberCount ? (
                    <p className="text-[9px] font-semibold" style={{ color: '#9a8060' }}>{formatNum(bk.item.memberCount)} subs</p>
                  ) : null}
                </div>
              </Link>
              {/* Actions overlay */}
              <div className="absolute top-1.5 right-1.5 z-10 flex items-center gap-0.5 opacity-0 group-hover/tile:opacity-100 transition-opacity">
                {isPremium && folders.length > 0 && (
                  <select
                    value={bk.folderId || ''}
                    onChange={e => { e.stopPropagation(); moveBookmark(bk._id, e.target.value || null); }}
                    className="rounded-md text-[8px] font-bold outline-none cursor-pointer px-1 py-0.5"
                    style={{ background: '#0a0908cc', border: '1px solid #2e2010', color: '#c9973a', maxWidth: '60px' }}
                    onClick={e => { e.preventDefault(); e.stopPropagation(); }}
                  >
                    <option value="">Move...</option>
                    {folders.map(f => <option key={f._id} value={f._id}>{f.name}</option>)}
                  </select>
                )}
                <button
                  onClick={e => { e.preventDefault(); e.stopPropagation(); removeBookmark(bk._id); }}
                  className="flex items-center justify-center w-6 h-6 rounded-lg bg-black/60 backdrop-blur hover:bg-red-500/30 transition-all"
                  title="Remove"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
              </div>
              {/* Type badge */}
              {bk.itemType === 'bot' && (
                <div className="absolute top-1.5 left-1.5 z-10">
                  <span className="text-[7px] font-black uppercase tracking-wider px-1.5 py-1 rounded-md" style={{ background: '#0a0908cc', border: '1px solid #0088cc33', color: '#4ab3f4' }}>Bot</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <UpgradeModal isOpen={showUpgrade} onClose={() => setShowUpgrade(false)} reason="folder_create" />
    </div>
  );
}
