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

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const headers = { Authorization: `Bearer ${token}` };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [bkRes, flRes] = await Promise.all([
        axios.get('/api/bookmarks', { headers, params: activeFolder ? { folderId: activeFolder } : {} }),
        axios.get('/api/bookmarks/folders', { headers }),
      ]);
      setBookmarks(bkRes.data);
      setFolders(flRes.data);
    } catch {
      /* */
    } finally {
      setLoading(false);
    }
  }, [activeFolder]);

  useEffect(() => { loadData(); }, [loadData]);

  const removeBookmark = async (id: string) => {
    try {
      await axios.delete(`/api/bookmarks/${id}`, { headers });
      setBookmarks(prev => prev.filter(b => b._id !== id));
    } catch { /* */ }
  };

  const moveBookmark = async (bookmarkId: string, folderId: string | null) => {
    try {
      await axios.put(`/api/bookmarks/${bookmarkId}`, { folderId }, { headers });
      setBookmarks(prev => prev.map(b => b._id === bookmarkId ? { ...b, folderId } : b));
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

  return (
    <div className="space-y-6">
      {/* Folder bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <button
          onClick={() => setActiveFolder(null)}
          className={`shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeFolder === null
              ? 'bg-white text-black'
              : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
          }`}
        >
          All Saved
        </button>
        {folders.map(f => (
          <div key={f._id} className="shrink-0 flex items-center gap-1 group/folder">
            {editingFolder === f._id ? (
              <div className="flex items-center gap-1">
                <input
                  value={editFolderName}
                  onChange={e => setEditFolderName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && renameFolder(f._id)}
                  className="px-3 py-1.5 rounded-lg bg-white/10 text-white text-sm border border-white/20 outline-none w-28"
                  autoFocus
                />
                <button onClick={() => renameFolder(f._id)} className="text-green-400 text-xs font-bold px-1">OK</button>
                <button onClick={() => setEditingFolder(null)} className="text-white/30 text-xs px-1">X</button>
              </div>
            ) : (
              <button
                onClick={() => setActiveFolder(f._id)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  activeFolder === f._id
                    ? 'bg-white text-black'
                    : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                }`}
              >
                {f.name}
              </button>
            )}
            {editingFolder !== f._id && (
              <div className="hidden group-hover/folder:flex items-center gap-0.5">
                <button onClick={() => { setEditingFolder(f._id); setEditFolderName(f.name); }} className="text-white/20 hover:text-white/60 text-[10px]" title="Rename">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button onClick={() => deleteFolder(f._id)} className="text-white/20 hover:text-red-400 text-[10px]" title="Delete">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                </button>
              </div>
            )}
          </div>
        ))}

        {showNewFolder ? (
          <div className="flex items-center gap-1 shrink-0">
            <input
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createFolder()}
              placeholder="Folder name"
              className="px-3 py-1.5 rounded-lg bg-white/10 text-white text-sm border border-white/20 outline-none w-28"
              autoFocus
            />
            <button onClick={createFolder} className="text-green-400 text-xs font-bold px-1">Create</button>
            <button onClick={() => setShowNewFolder(false)} className="text-white/30 text-xs px-1">X</button>
          </div>
        ) : (
          <button
            onClick={() => { if (!isPremium) { setShowUpgrade(true); return; } setShowNewFolder(true); }}
            className="shrink-0 px-3 py-2 rounded-xl text-sm font-medium bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/70 transition-all flex items-center gap-1"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
            Folder
            {!isPremium && <span className="ml-1 text-amber-400 text-[9px] font-bold">PRO</span>}
          </button>
        )}
      </div>

      {/* Bookmarks count */}
      <div className="flex items-center justify-between">
        <p className="text-white/40 text-sm">
          {bookmarks.length} saved {!isPremium && <span className="text-white/20">({bookmarks.length}/4 free)</span>}
        </p>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 rounded-xl bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : bookmarks.length === 0 ? (
        <div className="text-center py-16">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto text-white/15 mb-4">
            <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <p className="text-white/30 text-sm font-medium">No saved items yet</p>
          <p className="text-white/15 text-xs mt-1">Bookmark groups and bots to find them here</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {bookmarks.map(bk => bk.item && (
            <div key={bk._id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/10 transition group/card">
              <Link href={`/${bk.item.slug}`} className="shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-white/5">
                <img src={bk.item.image} alt={bk.item.name} className="w-full h-full object-cover" />
              </Link>
              <div className="flex-1 min-w-0">
                <Link href={`/${bk.item.slug}`} className="text-white font-semibold text-sm truncate block hover:text-blue-400 transition">
                  {bk.item.name}
                </Link>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.06] text-white/40 font-medium uppercase">{bk.itemType}</span>
                  <span className="text-white/30 text-[11px]">{bk.item.category}</span>
                  {bk.item.memberCount && bk.item.memberCount > 0 && (
                    <span className="text-white/20 text-[11px]">{bk.item.memberCount.toLocaleString()} members</span>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-1.5 shrink-0">
                {/* Move to folder */}
                {isPremium && folders.length > 0 && (
                  <select
                    value={bk.folderId || ''}
                    onChange={e => moveBookmark(bk._id, e.target.value || null)}
                    className="bg-white/5 border border-white/10 rounded-md text-[10px] text-white/50 px-1 py-0.5 outline-none max-w-[80px]"
                  >
                    <option value="">Unsorted</option>
                    {folders.map(f => <option key={f._id} value={f._id}>{f.name}</option>)}
                  </select>
                )}
                <button onClick={() => removeBookmark(bk._id)} className="text-white/20 hover:text-red-400 transition" title="Remove">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <UpgradeModal isOpen={showUpgrade} onClose={() => setShowUpgrade(false)} reason="folder_create" />
    </div>
  );
}
