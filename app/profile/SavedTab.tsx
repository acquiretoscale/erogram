'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import UpgradeModal from '@/components/UpgradeModal';
import ReportModal from '@/app/groups/ReportModal';
import { useToast } from '@/components/Toast';

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

export default function SavedTab({
  isPremium,
  showOnboardingHint = false,
}: {
  isPremium: boolean;
  showOnboardingHint?: boolean;
}) {
  const FREE_BOOKMARK_LIMIT = 20;
  const FREE_FOLDER_LIMIT = 2;
  const router = useRouter();
  const { toast } = useToast();
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
  const [reportGroup, setReportGroup] = useState<{ _id: string; name: string; category: string; country: string } | null>(null);

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
    } catch {
      toast('Failed to load saved items', 'error');
    }
    finally { setLoading(false); }
  }, [activeFolder]);

  useEffect(() => { loadData(); }, [loadData]);

  const removeBookmark = async (id: string) => {
    try {
      await axios.delete(`/api/bookmarks/${id}`, { headers });
      setBookmarks(prev => prev.filter(b => b._id !== id));
      setAllBookmarks(prev => prev.filter(b => b._id !== id));
      toast('Removed from saved', 'success');
    } catch {
      toast('Failed to remove item', 'error');
    }
  };

  const moveBookmark = async (bookmarkId: string, folderId: string | null) => {
    try {
      await axios.put(`/api/bookmarks/${bookmarkId}`, { folderId }, { headers });
      setBookmarks(prev => prev.map(b => b._id === bookmarkId ? { ...b, folderId } : b));
      setAllBookmarks(prev => prev.map(b => b._id === bookmarkId ? { ...b, folderId } : b));
      if (activeFolder && folderId !== activeFolder) {
        setBookmarks(prev => prev.filter(b => b._id !== bookmarkId));
      }
      const folderName = folderId ? folders.find(f => f._id === folderId)?.name : 'Unsorted';
      toast(`Moved to ${folderName}`, 'success');
    } catch {
      toast('Failed to move item', 'error');
    }
  };

  const createFolder = async () => {
    if (!isPremium && folders.length >= FREE_FOLDER_LIMIT) {
      router.push('/premium');
      return;
    }
    if (!newFolderName.trim()) return;
    try {
      const res = await axios.post('/api/bookmarks/folders', { name: newFolderName.trim() }, { headers });
      setFolders(prev => [...prev, { _id: res.data._id, name: res.data.name, sortOrder: prev.length }]);
      setNewFolderName('');
      setShowNewFolder(false);
      toast(`Folder "${res.data.name}" created`, 'success');
    } catch (err: any) {
      if (err?.response?.status === 403 && err?.response?.data?.upgrade) {
        router.push('/premium');
      } else {
        toast(err?.response?.data?.message || 'Failed to create folder', 'error');
      }
    }
  };

  const renameFolder = async (id: string) => {
    if (!editFolderName.trim()) return;
    try {
      await axios.put(`/api/bookmarks/folders/${id}`, { name: editFolderName.trim() }, { headers });
      setFolders(prev => prev.map(f => f._id === id ? { ...f, name: editFolderName.trim() } : f));
      setEditingFolder(null);
      toast('Folder renamed', 'success');
    } catch {
      toast('Failed to rename folder', 'error');
    }
  };

  const deleteFolder = async (id: string) => {
    if (!confirm('Delete this folder? Saved items will be moved to All Saved.')) return;
    try {
      await axios.delete(`/api/bookmarks/folders/${id}`, { headers });
      setFolders(prev => prev.filter(f => f._id !== id));
      if (activeFolder === id) setActiveFolder(null);
      loadData();
      toast('Folder deleted', 'success');
    } catch {
      toast('Failed to delete folder', 'error');
    }
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
  const freeBookmarksRemaining = Math.max(FREE_BOOKMARK_LIMIT - allBookmarks.length, 0);
  const freeFoldersRemaining = Math.max(FREE_FOLDER_LIMIT - folders.length, 0);
  const canCreateFolder = isPremium || freeFoldersRemaining > 0;

  const t = isPremium ? {
    accent: '#c9973a',
    accentDim: '#7a6040',
    activeBg: 'linear-gradient(135deg, #c9973a, #a67c2e)',
    activeTxt: '#0d0c0a',
    cardBg: 'linear-gradient(135deg, #0f0d08, #120e09)',
    cardBorder: '#2a1f0e',
    cardHover: '#c9973a44',
    tagBg: '#1a1408',
    tagBorder: '#c9973a22',
    divider: '#2e2010',
    pillBg: '#0d0c0a',
    pillBorder: '#2e2010',
    leftAccent: 'linear-gradient(180deg, transparent, #c9973a55, transparent)',
    viewBtnBg: '#c9973a',
    viewBtnTxt: '#0d0c0a',
  } : {
    accent: '#b31b1b',
    accentDim: '#999',
    activeBg: 'rgba(255,255,255,0.12)',
    activeTxt: '#fff',
    cardBg: '#1a1a1a',
    cardBorder: 'rgba(255,255,255,0.08)',
    cardHover: 'rgba(255,255,255,0.15)',
    tagBg: 'rgba(255,255,255,0.06)',
    tagBorder: 'rgba(255,255,255,0.08)',
    divider: 'rgba(255,255,255,0.08)',
    pillBg: '#1a1a1a',
    pillBorder: 'rgba(255,255,255,0.1)',
    leftAccent: 'linear-gradient(180deg, transparent, rgba(255,255,255,0.06), transparent)',
    viewBtnBg: 'rgba(255,255,255,0.15)',
    viewBtnTxt: '#fff',
  };
  const hasAnyBookmarks = allBookmarks.length > 0;
  const hasAnyFolders = folders.length > 0;
  const hasOrganizedBookmark = allBookmarks.some(b => !!b.folderId);
  const checklistCompleted = [hasAnyBookmarks, hasAnyFolders, hasOrganizedBookmark].filter(Boolean).length;
  const showActivationChecklist = showOnboardingHint || !hasOrganizedBookmark;

  function ThreeDotMenu({ bk }: { bk: BookmarkedItem }) {
    const [open, setOpen] = useState(false);
    const [showMoveMenu, setShowMoveMenu] = useState(false);
    const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
    const btnRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (!open) return;
      const handler = (e: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(e.target as Node) &&
            btnRef.current && !btnRef.current.contains(e.target as Node)) {
          setOpen(false);
          setShowMoveMenu(false);
        }
      };
      document.addEventListener('mousedown', handler);
      return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const handleToggle = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (open) {
        setOpen(false);
        setShowMoveMenu(false);
        return;
      }
      if (btnRef.current) {
        const rect = btnRef.current.getBoundingClientRect();
        const menuWidth = 176;
        const menuHeight = 100;
        const spaceBelow = window.innerHeight - rect.bottom;
        const openUp = spaceBelow < menuHeight && rect.top > menuHeight;
        setPos({
          top: openUp ? rect.top - 4 : rect.bottom + 4,
          left: Math.max(8, rect.right - menuWidth),
        });
      }
      setOpen(true);
      setShowMoveMenu(false);
    };

    const dropdown = open && pos ? createPortal(
      <div
        ref={menuRef}
        className="fixed w-44 rounded-xl overflow-hidden shadow-2xl"
        style={{
          top: pos.top,
          left: pos.left,
          transform: pos.top < (btnRef.current?.getBoundingClientRect().top ?? 0) ? 'translateY(-100%)' : undefined,
          background: isPremium ? '#1a150a' : '#222',
          border: `1px solid ${t.divider}`,
          zIndex: 9999,
        }}
      >
        {!showMoveMenu ? (
          <>
            <button
              onClick={e => { e.preventDefault(); e.stopPropagation(); removeBookmark(bk._id); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left text-[12px] font-semibold text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              Remove
            </button>
            {isPremium && folders.length > 0 && (
              <button
                onClick={e => { e.preventDefault(); e.stopPropagation(); setShowMoveMenu(true); }}
                className="w-full flex items-center justify-between gap-2.5 px-3.5 py-2.5 text-left text-[12px] font-semibold hover:bg-white/5 transition-colors"
                style={{ color: t.accent }}
              >
                <span className="flex items-center gap-2.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
                  Move to folder
                </span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            )}
            {bk.item && (
              <button
                onClick={e => {
                  e.preventDefault(); e.stopPropagation(); setOpen(false);
                  setReportGroup({ _id: bk.item!._id, name: bk.item!.name, category: bk.item!.category || '', country: bk.item!.country || '' });
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left text-[12px] font-semibold text-white/40 hover:text-orange-400 hover:bg-orange-500/10 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
                Report
              </button>
            )}
          </>
        ) : (
          <>
            <button
              onClick={e => { e.preventDefault(); e.stopPropagation(); setShowMoveMenu(false); }}
              className="w-full flex items-center gap-2 px-3.5 py-2 text-left text-[11px] font-bold text-white/40 hover:bg-white/5 transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              Back
            </button>
            <div className="h-px" style={{ background: t.divider }} />
            <button
              onClick={e => { e.preventDefault(); e.stopPropagation(); moveBookmark(bk._id, null); setOpen(false); setShowMoveMenu(false); }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left text-[12px] font-semibold transition-colors"
              style={{ color: !bk.folderId ? t.accent : 'rgba(255,255,255,0.6)' }}
            >
              Unsorted
              {!bk.folderId && <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>}
            </button>
            {folders.map(f => (
              <button
                key={f._id}
                onClick={e => { e.preventDefault(); e.stopPropagation(); moveBookmark(bk._id, f._id); setOpen(false); setShowMoveMenu(false); }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left text-[12px] font-semibold transition-colors hover:bg-white/5"
                style={{ color: bk.folderId === f._id ? t.accent : 'rgba(255,255,255,0.6)' }}
              >
                {f.name}
                {bk.folderId === f._id && <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>}
              </button>
            ))}
          </>
        )}
      </div>,
      document.body
    ) : null;

    return (
      <div className="relative">
        <button
          ref={btnRef}
          onClick={handleToggle}
          className="flex items-center justify-center w-8 h-8 rounded-lg transition-all hover:bg-white/10"
          title="More actions"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill={t.accentDim}>
            <circle cx="12" cy="5" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="12" cy="19" r="2" />
          </svg>
        </button>
        {dropdown}
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-black text-white tracking-wide">SAVED</h2>
          <p className="text-[11px] text-white/30">
            {allBookmarks.length} saved{' '}
            {!isPremium && (
              <>
                <span>(remaining: {freeBookmarksRemaining}/{FREE_BOOKMARK_LIMIT})</span>
                <span className="mx-1 text-white/20">|</span>
                <span>folders: {freeFoldersRemaining}/{FREE_FOLDER_LIMIT}</span>
                <span className="mx-1 text-white/20">-</span>
                <Link href="/premium" className="text-amber-400 hover:text-amber-300 underline underline-offset-2 font-semibold">
                  Upgrade to Premium
                </Link>
                <span className="ml-1 text-white/40">for unlimited saves and folders</span>
              </>
            )}
          </p>
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
          <div className="flex rounded-lg overflow-hidden" style={{ border: `1px solid ${t.pillBorder}` }}>
            <button
              onClick={() => { setViewMode('list'); localStorage.setItem('saved_view', 'list'); }}
              className="px-2.5 py-2 transition-all"
              style={{ background: viewMode === 'list' ? t.viewBtnBg : t.pillBg, color: viewMode === 'list' ? t.viewBtnTxt : t.accentDim }}
              title="List view"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>
            </button>
            <button
              onClick={() => { setViewMode('grid'); localStorage.setItem('saved_view', 'grid'); }}
              className="px-2.5 py-2 transition-all"
              style={{ background: viewMode === 'grid' ? t.viewBtnBg : t.pillBg, color: viewMode === 'grid' ? t.viewBtnTxt : t.accentDim }}
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
            <li><span style={{ color: '#c9973a' }}>Save</span> any group or bot to keep it here.</li>
            <li>Create <span style={{ color: '#c9973a' }}>folders</span> to organize your collection.</li>
            <li>Switch between <span style={{ color: '#c9973a' }}>list</span> &amp; <span style={{ color: '#c9973a' }}>grid</span> view anytime.</li>
            <li>Use the <span style={{ color: '#c9973a' }}>three-dot menu</span> to remove or move items between folders.</li>
          </ul>
        </div>
      )}

      {showActivationChecklist && (
        <div className="mb-3 rounded-xl p-3" style={{ background: isPremium ? '#12100a' : '#1a1a1a', border: `1px solid ${t.divider}` }}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-wider text-white/80">Quick Start</p>
              <p className="text-[11px] text-white/40">Save your first favorites and organize them.</p>
            </div>
            <span className="text-[11px] font-bold" style={{ color: t.accent }}>
              {checklistCompleted}/3
            </span>
          </div>
          <div className="mt-2.5 space-y-1.5 text-[11px]">
            <div className={`flex items-center gap-2 ${hasAnyBookmarks ? 'text-green-300' : 'text-white/55'}`}>
              <span>{hasAnyBookmarks ? '✓' : '○'}</span>
              <span>Save your first group or bot</span>
            </div>
            <div className={`flex items-center gap-2 ${hasAnyFolders ? 'text-green-300' : 'text-white/55'}`}>
              <span>{hasAnyFolders ? '✓' : '○'}</span>
              <span>Create your first folder</span>
            </div>
            <div className={`flex items-center gap-2 ${hasOrganizedBookmark ? 'text-green-300' : 'text-white/55'}`}>
              <span>{hasOrganizedBookmark ? '✓' : '○'}</span>
              <span>Move one saved item into a folder</span>
            </div>
          </div>
        </div>
      )}

      {!loading && allBookmarks.length === 0 && (
        <div
          className="mb-3 rounded-xl p-3.5"
          style={{
            background: isPremium ? 'linear-gradient(135deg, #1a1408, #120f09)' : '#1a1a1a',
            border: `1px solid ${t.cardBorder}`,
          }}
        >
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <p className="text-[12px] font-black uppercase tracking-wide text-white">Start saving now</p>
              <p className="text-[11px] text-white/45 mt-0.5">
                Save your first favorite so it appears here.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/groups"
                className="px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wide transition-all hover:scale-[1.03]"
                style={isPremium
                  ? { background: 'linear-gradient(135deg, #c9973a, #a67c2e)', color: '#0d0c0a' }
                  : { background: '#b31b1b', color: '#fff' }
                }
              >
                Save a Group
              </Link>
              <Link
                href="/bots"
                className="px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wide transition-all hover:scale-[1.03]"
                style={{ background: t.pillBg, color: isPremium ? '#c9973a' : '#fff', border: `1px solid ${t.pillBorder}` }}
              >
                Save a Bot
              </Link>
            </div>
          </div>
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
              background: activeFolder === null ? t.activeBg : t.pillBg,
              color: activeFolder === null ? t.activeTxt : t.accentDim,
              border: activeFolder === null ? 'none' : `1px solid ${t.pillBorder}`,
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
                      background: isActive ? t.activeBg : t.pillBg,
                      color: isActive ? t.activeTxt : t.accentDim,
                      border: isActive ? 'none' : `1px solid ${t.pillBorder}`,
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
            canCreateFolder ? (
              <button
                onClick={() => setShowNewFolder(true)}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all hover:scale-[1.04] active:scale-[0.97]"
                style={isPremium
                  ? { background: 'linear-gradient(135deg, #c9973a, #a67c2e)', color: '#0d0c0a' }
                  : { background: '#b31b1b', color: '#fff', border: '1px solid #d22' }
                }
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
                <span className="text-[11px] font-black whitespace-nowrap uppercase tracking-wide">New Folder</span>
                {!isPremium && <span className="text-[9px] font-black opacity-70">({freeFoldersRemaining} left)</span>}
              </button>
            ) : (
              <button
                onClick={() => router.push('/premium')}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all hover:scale-[1.04] active:scale-[0.97]"
                style={{ background: 'linear-gradient(135deg, #c9973a33, #a67c2e33)', color: '#c9973a', border: '1px solid #c9973a44' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
                <span className="text-[11px] font-black whitespace-nowrap uppercase tracking-wide">New Folder</span>
                <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md ml-0.5" style={{ background: 'linear-gradient(135deg, #c9973a, #a67c2e)', color: '#0d0c0a' }}>Premium</span>
              </button>
            )
          ) : (
            <div className="shrink-0 flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ background: t.pillBg, border: `1px solid ${t.divider}` }}>
              <input
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && createFolder()}
                placeholder="Folder name..."
                className="px-2 py-1 rounded-lg text-[11px] text-white outline-none w-28"
                style={{ background: isPremium ? '#0d0c0a' : '#111', border: `1px solid ${t.divider}` }}
                autoFocus
              />
              <button onClick={createFolder} className="px-2 py-1 rounded-md text-[10px] font-black transition-all hover:scale-105" style={isPremium ? { background: '#c9973a', color: '#0d0c0a' } : { background: '#b31b1b', color: '#fff' }}>Create</button>
              <button onClick={() => { setShowNewFolder(false); setNewFolderName(''); }} className="text-white/30 hover:text-white/60 text-[10px] px-1 transition-colors">X</button>
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
          <p className="text-white/30 text-sm">Loading your saved items...</p>
        </div>
      ) : bookmarks.filter(bk => bk.item).length === 0 ? (
        <div className="py-16 text-center">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mx-auto text-white/10 mb-4">
            <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <p className="text-white/25 text-sm font-medium">{activeFolder ? 'This folder is empty' : 'No saved items yet'}</p>
          <p className="text-white/15 text-xs mt-1">
            {activeFolder ? 'Try another folder or save more items.' : 'Tap the save icon on any card to save it here.'}
          </p>
          {!activeFolder && (
            <div className="mt-4 flex items-center justify-center gap-2 flex-wrap">
              <Link
                href="/groups"
                className="px-3.5 py-2 rounded-lg text-[11px] font-black uppercase tracking-wide transition-all hover:scale-[1.03]"
                style={isPremium
                  ? { background: 'linear-gradient(135deg, #c9973a, #a67c2e)', color: '#0d0c0a' }
                  : { background: '#b31b1b', color: '#fff' }
                }
              >
                Go to Groups
              </Link>
              <Link
                href="/bots"
                className="px-3.5 py-2 rounded-lg text-[11px] font-black uppercase tracking-wide transition-all hover:scale-[1.03]"
                style={{ background: t.pillBg, color: isPremium ? '#c9973a' : '#fff', border: `1px solid ${t.pillBorder}` }}
              >
                Go to Bots
              </Link>
            </div>
          )}
        </div>
      ) : viewMode === 'list' ? (
        /* List View */
        <div className="space-y-1.5">
          {bookmarks.map(bk => !bk.item ? (
            <div
              key={bk._id}
              className="relative rounded-2xl overflow-hidden"
              style={{ background: isPremium ? '#0f0d08' : '#1a1a1a', border: `1px solid ${t.cardBorder}` }}
            >
              <div className="flex items-center gap-3 px-3 py-2.5">
                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center" style={{ border: `1px solid ${t.divider}` }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/15"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-white/30">Item no longer available</p>
                  <p className="text-[10px] text-white/15 mt-0.5">This {bk.itemType} may have been removed.</p>
                </div>
                <button
                  onClick={() => removeBookmark(bk._id)}
                  className="shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-bold text-red-400 hover:bg-red-500/10 transition-all"
                  style={{ border: '1px solid #ef444422' }}
                >
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <div
              key={bk._id}
              className="group/card relative rounded-2xl overflow-hidden transition-all duration-300"
              style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}` }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.border = `1px solid ${t.cardHover}`; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.border = `1px solid ${t.cardBorder}`; }}
            >
              <div className="absolute left-0 top-0 bottom-0 w-px" style={{ background: t.leftAccent }} />
              <div className="flex items-center gap-3 px-3 py-2.5">
                <Link href={`/${bk.item.slug}`} className="shrink-0">
                  <div className="w-12 h-12 rounded-xl overflow-hidden" style={{ border: `1px solid ${t.divider}` }}>
                    <img src={bk.item.image || '/assets/placeholder-no-image.png'} alt={bk.item.name} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).src = '/assets/placeholder-no-image.png'; }} />
                  </div>
                </Link>
                <div className="flex-1 min-w-0">
                  <Link href={`/${bk.item.slug}`} className={`block font-bold text-[14px] text-white truncate leading-tight transition-colors ${isPremium ? 'hover:text-[#c9973a]' : 'hover:text-white/70'}`}>{bk.item.name}</Link>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    {(bk.item.categories?.length ? bk.item.categories : [bk.item.category]).filter(Boolean).slice(0, 3).map((cat, i) => (
                      <span key={i} className="text-[9px] font-black uppercase tracking-[0.12em] px-1.5 py-0.5 rounded" style={{ background: t.tagBg, border: `1px solid ${t.tagBorder}`, color: i === 0 ? t.accent : t.accentDim }}>{cat}</span>
                    ))}
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase" style={{ background: bk.itemType === 'bot' ? '#0088cc15' : `${t.accent}10`, color: bk.itemType === 'bot' ? '#4ab3f4' : t.accentDim }}>{bk.itemType}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {bk.item.memberCount ? (
                    <div className="text-right mr-1">
                      <div className="text-[15px] font-black leading-none" style={{ color: t.accent }}>{formatNum(bk.item.memberCount)}</div>
                      <div className="text-[8px] font-bold uppercase tracking-widest" style={{ color: t.accentDim }}>subs</div>
                    </div>
                  ) : null}
                  <div className="w-px h-7" style={{ background: t.divider }} />
                  {bk.item.telegramLink && (
                    <a
                      href={bk.item.telegramLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wide transition-all hover:scale-[1.04]"
                      style={{ background: 'linear-gradient(135deg, #0088cc, #0077b5)', color: '#fff' }}
                      title="Open in Telegram"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                      Telegram
                    </a>
                  )}
                  <Link href={`/${bk.item.slug}`} className="px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wide transition-all hover:scale-[1.04]" style={isPremium ? { background: 'linear-gradient(135deg, #c9973a, #a67c2e)', color: '#0d0c0a' } : { background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)' }}>
                    View
                  </Link>
                  <ThreeDotMenu bk={bk} />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Grid View */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {bookmarks.map(bk => !bk.item ? (
            <div
              key={bk._id}
              className="relative rounded-xl overflow-hidden aspect-square flex flex-col items-center justify-center text-center p-3"
              style={{ background: isPremium ? '#0f0d08' : '#1a1a1a', border: `1px solid ${t.cardBorder}` }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/10 mb-2"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>
              <p className="text-[10px] text-white/25 font-medium">Item removed</p>
              <button
                onClick={() => removeBookmark(bk._id)}
                className="mt-2 px-2.5 py-1 rounded-lg text-[9px] font-bold text-red-400 hover:bg-red-500/10 transition-all"
                style={{ border: '1px solid #ef444422' }}
              >
                Remove
              </button>
            </div>
          ) : (
            <div
              key={bk._id}
              className="group/tile relative rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.03]"
              style={{ border: `1px solid ${t.cardBorder}` }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.border = `1px solid ${t.cardHover}`; (e.currentTarget as HTMLElement).style.boxShadow = isPremium ? '0 4px 20px #c9973a15' : '0 4px 20px rgba(0,0,0,0.3)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.border = `1px solid ${t.cardBorder}`; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
            >
              <Link href={`/${bk.item.slug}`} className="block aspect-square relative">
                <img
                  src={bk.item.image || '/assets/placeholder-no-image.png'}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={e => { (e.target as HTMLImageElement).src = '/assets/placeholder-no-image.png'; }}
                />
                <div className="absolute inset-0" style={{ background: isPremium ? 'linear-gradient(180deg, transparent 30%, #0a0908dd 70%, #0a0908 100%)' : 'linear-gradient(180deg, transparent 30%, #111d 70%, #111 100%)' }} />
                <div className="absolute bottom-0 left-0 right-0 p-2">
                  <p className="text-[11px] font-bold text-white leading-tight truncate mb-1">{bk.item.name}</p>
                  <div className="flex flex-wrap gap-0.5 mb-1">
                    {(bk.item.categories?.length ? bk.item.categories : [bk.item.category]).filter(Boolean).slice(0, 2).map((cat, i) => (
                      <span key={i} className="text-[7px] font-black uppercase tracking-wide px-1 py-px rounded" style={{ background: isPremium ? '#0a090866' : 'rgba(0,0,0,0.4)', color: i === 0 ? t.accent : t.accentDim }}>{cat}</span>
                    ))}
                  </div>
                  {bk.item.memberCount ? (
                    <p className="text-[9px] font-semibold" style={{ color: isPremium ? '#9a8060' : 'rgba(255,255,255,0.5)' }}>{formatNum(bk.item.memberCount)} subs</p>
                  ) : null}
                </div>
              </Link>
              {/* 3-dot menu */}
              <div className="absolute top-1.5 right-1.5 z-10">
                <ThreeDotMenu bk={bk} />
              </div>
              {/* Telegram shortcut */}
              {bk.item.telegramLink && (
                <div className="absolute top-1.5 left-1.5 z-10 flex items-center gap-1">
                  {bk.itemType === 'bot' && (
                    <span className="text-[7px] font-black uppercase tracking-wider px-1.5 py-1 rounded-md" style={{ background: '#0a0908cc', border: '1px solid #0088cc33', color: '#4ab3f4' }}>Bot</span>
                  )}
                  <a
                    href={bk.item.telegramLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="flex items-center justify-center w-7 h-7 rounded-lg backdrop-blur transition-all hover:scale-110"
                    style={{ background: '#0088cccc' }}
                    title="Open in Telegram"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                  </a>
                </div>
              )}
              {/* Type badge (only when no telegram link) */}
              {bk.itemType === 'bot' && !bk.item.telegramLink && (
                <div className="absolute top-1.5 left-1.5 z-10">
                  <span className="text-[7px] font-black uppercase tracking-wider px-1.5 py-1 rounded-md" style={{ background: '#0a0908cc', border: '1px solid #0088cc33', color: '#4ab3f4' }}>Bot</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!isPremium && (
        <section
          className="mt-6 rounded-2xl p-4 sm:p-5"
          style={{ background: '#ffffff', border: '1px solid #e5e7eb' }}
        >
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">Compare Plans</p>
              <h3 className="text-[18px] sm:text-[20px] font-black text-gray-900 leading-tight mt-1">
                Free vs Premium Vault
              </h3>
              <p className="text-[12px] text-gray-600 mt-1">
                See exactly what you unlock with Premium.
              </p>
            </div>
            <Link
              href="/premium"
              className="shrink-0 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wide transition-all hover:scale-[1.03]"
              style={{ background: 'linear-gradient(135deg, #c9973a, #a67c2e)', color: '#0d0c0a' }}
            >
              Upgrade
            </Link>
          </div>

          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <div className="grid grid-cols-3 bg-gray-50 text-[9px] font-black uppercase tracking-wider">
              <div className="px-2 py-1.5 text-gray-500">Feature</div>
              <div className="px-2 py-1.5 text-gray-600 border-l border-gray-200">Free</div>
              <div className="px-2 py-1.5 text-amber-700 border-l border-gray-200">Premium</div>
            </div>
            {[
              { feature: 'Catalog', free: '1,000+ public', premium: '4,000+ hand-picked' },
              { feature: 'Search', free: 'Standard', premium: 'Advanced filters' },
              { feature: 'Access', free: 'Public feed', premium: 'Instant + updates' },
              { feature: 'Niches', free: 'Public only', premium: 'Exclusive groups' },
              { feature: 'Saved', free: `${FREE_BOOKMARK_LIMIT} max`, premium: 'Unlimited' },
              { feature: 'Folders', free: `${FREE_FOLDER_LIMIT} max`, premium: 'Unlimited' },
            ].map((row) => (
              <div key={row.feature} className="grid grid-cols-3 text-[11px] border-t border-gray-200">
                <div className="px-2 py-1.5 font-semibold text-gray-800">{row.feature}</div>
                <div className="px-2 py-1.5 text-gray-700 border-l border-gray-200">{row.free}</div>
                <div className="px-2 py-1.5 font-semibold text-gray-900 border-l border-gray-200" style={{ background: '#fff8e8' }}>
                  {row.premium}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-2 rounded-lg p-2.5" style={{ background: 'linear-gradient(135deg, #fff8e8, #fff2d1)', border: '1px solid #f3d9a6' }}>
            <p className="text-[10px] font-black uppercase tracking-wider mb-1" style={{ color: '#8a6115' }}>Premium Highlights</p>
            <div className="space-y-1 text-[11px] text-gray-900">
              <p>👩🏻 4,000+ hand-picked channels</p>
              <p>🔥 Advanced filters to find faster</p>
              <p>⚡ Immediate access + free updates</p>
              <p>🎯 Exclusive non-public niches</p>
            </div>
          </div>

          <Link
            href="/premium"
            className="mt-2.5 w-full flex items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-[12px] font-black uppercase tracking-wide transition-all hover:scale-[1.01] active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #c9973a, #a67c2e)', color: '#0d0c0a' }}
          >
            Unlock Premium Vault
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </Link>
        </section>
      )}

      <UpgradeModal isOpen={showUpgrade} onClose={() => setShowUpgrade(false)} reason="folder_create" />
      {reportGroup && (
        <ReportModal group={reportGroup} onClose={() => setReportGroup(null)} />
      )}
    </div>
  );
}
