'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import UpgradeModal from '@/components/UpgradeModal';
import ReportModal from '@/app/groups/ReportModal';
import { useToast } from '@/components/Toast';
import PremiumCompareBlock from '@/components/PremiumCompareBlock';
import { FREE_BOOKMARK_LIMIT, FREE_FOLDER_LIMIT } from '@/lib/premiumLimits';
import { AI_NSFW_TOOLS } from '@/app/ainsfw/data';
import ProfileGridDensityToggle from './ProfileGridDensityToggle';
import {
  loadProfileGridDensity,
  profileGridClass,
  profileGridGapClass,
  type ProfileGridDensity,
} from './profileGridDensity';
import { ofCreatorProfileUrl } from '@/lib/onlyfanssearch/creatorUrls';

type BookmarkFilter = 'all' | 'group' | 'bot' | 'ainsfw' | 'creator';

interface BookmarkedUnified {
  id: string;
  kind: 'group' | 'bot' | 'ainsfw' | 'creator';
  name: string;
  image: string;
  slug: string;
  href: string;
  categories: string[];
  memberCount?: number;
  telegramLink?: string;
  priceLabel?: string;
  bookmark?: BookmarkedItem;
  ainsfwSlug?: string;
  creatorId?: string;
}

interface SavedCreator {
  _id: string;
  name: string;
  username: string;
  slug: string;
  avatar: string;
  price: number;
  isFree: boolean;
  categories?: string[];
}

function loadAinsfwBookmarkSlugs(): string[] {
  if (typeof window === 'undefined') return [];
  const slugs: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('ainsfw_bookmark_') && localStorage.getItem(key) === '1') {
        slugs.push(key.replace('ainsfw_bookmark_', ''));
      }
    }
  } catch { /* ignore */ }
  return slugs;
}

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

import { getProfileTabColors, isProfileThemedMode, type ProfileThemeId } from './profileTheme';
import { useProfileTheme } from './ProfileThemeContext';
import { getSavedLikesOrder, saveSavedLikesOrder, saveOnlyFansCreatorFromLink, getBookmarkCreatorLikeStatus, toggleBookmarkCreatorLikes } from '@/lib/actions/userProfile';

function normalizeBookmarkOrderKey(k: string): string {
  if (k.startsWith('creator:')) return `onlyfans:${k.slice('creator:'.length)}`;
  return k;
}

function bookmarkOrderKey(item: BookmarkedUnified): string {
  return item.kind === 'creator' ? `onlyfans:${item.id}` : `${item.kind}:${item.id}`;
}

function applyLikesOrder(items: BookmarkedUnified[], order: string[]): BookmarkedUnified[] {
  const map = new Map(items.map((i) => [bookmarkOrderKey(i), i]));
  const out: BookmarkedUnified[] = [];
  for (const raw of order) {
    const k = normalizeBookmarkOrderKey(raw);
    const item = map.get(k);
    if (item) {
      out.push(item);
      map.delete(k);
    }
  }
  for (const item of items) {
    const k = bookmarkOrderKey(item);
    if (map.has(k)) out.push(item);
  }
  return out;
}

function mergeReorderedKeys(fullOrder: string[], visibleKeys: string[], newVisibleOrder: string[]): string[] {
  const visibleSet = new Set(visibleKeys);
  const result: string[] = [];
  let vi = 0;
  for (const k of fullOrder) {
    if (visibleSet.has(k)) {
      if (vi < newVisibleOrder.length) result.push(newVisibleOrder[vi++]);
    } else {
      result.push(k);
    }
  }
  for (const k of newVisibleOrder) {
    if (!result.includes(k)) result.push(k);
  }
  return result;
}

function dragKindLabel(kind: BookmarkedUnified['kind']) {
  if (kind === 'ainsfw') return 'AI NSFW';
  if (kind === 'creator') return 'OnlyFans';
  return kind;
}

function dragKindBadgeBg(kind: BookmarkedUnified['kind']) {
  if (kind === 'ainsfw') return 'rgba(124,58,237,0.9)';
  if (kind === 'creator') return 'rgba(0,175,240,0.9)';
  return 'rgba(38,165,228,0.9)';
}

function DragHint() {
  return (
    <span
      className="absolute bottom-2 left-2 z-[2] pointer-events-none flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide opacity-0 transition-opacity group-hover/drag:opacity-100 group-active/drag:opacity-100"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)', color: 'rgba(255,255,255,0.92)' }}
    >
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M18 11V6a2 2 0 0 0-4 0" /><path d="M14 10V4a2 2 0 0 0-4 0v2" /><path d="M10 10.5V5a2 2 0 0 0-4 0v8" />
        <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.7-2.3" />
      </svg>
      Drag
    </span>
  );
}

export default function SavedTab({
  isPremium,
  editorial = false,
  themeMode,
}: {
  isPremium: boolean;
  editorial?: boolean;
  themeMode?: ProfileThemeId;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const { tokens: profileTokens } = useProfileTheme();
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
  const [gridDensity, setGridDensity] = useState<ProfileGridDensity>(() => loadProfileGridDensity());
  const [allBookmarks, setAllBookmarks] = useState<BookmarkedItem[]>([]);
  const [ainsfwSlugs, setAinsfwSlugs] = useState<string[]>([]);
  const [savedCreators, setSavedCreators] = useState<SavedCreator[]>([]);
  const [typeFilter, setTypeFilter] = useState<BookmarkFilter>('all');
  const [showInfoBox, setShowInfoBox] = useState(false);
  const [reportGroup, setReportGroup] = useState<{ _id: string; name: string; category: string; country: string } | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [deletingSelected, setDeletingSelected] = useState(false);
  const [likesOrder, setLikesOrder] = useState<string[]>([]);
  const [creatorLinkInput, setCreatorLinkInput] = useState('');
  const [savingCreatorLink, setSavingCreatorLink] = useState(false);
  const [likedCreatorIds, setLikedCreatorIds] = useState<Set<string>>(new Set());
  const [togglingCreatorLikeId, setTogglingCreatorLikeId] = useState<string | null>(null);
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const headers = { Authorization: `Bearer ${token}` };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setAinsfwSlugs(loadAinsfwBookmarkSlugs());
      const [bkRes, flRes, allRes, orderRes, creatorsRes] = await Promise.all([
        axios.get('/api/bookmarks', { headers, params: activeFolder ? { folderId: activeFolder } : {} }),
        axios.get('/api/bookmarks/folders', { headers }),
        activeFolder ? axios.get('/api/bookmarks', { headers }) : Promise.resolve(null),
        token ? getSavedLikesOrder(token).catch(() => []) : Promise.resolve([]),
        fetch('/api/onlyfans/save/creators', { headers }).then((r) => (r.ok ? r.json() : { creators: [] })).catch(() => ({ creators: [] })),
      ]);
      setBookmarks(bkRes.data);
      setFolders(flRes.data);
      setAllBookmarks(allRes ? allRes.data : bkRes.data);
      setSavedCreators(Array.isArray(creatorsRes?.creators) ? creatorsRes.creators : []);
      setLikesOrder(Array.isArray(orderRes) ? orderRes.map(normalizeBookmarkOrderKey) : []);
      const creators = Array.isArray(creatorsRes?.creators) ? creatorsRes.creators : [];
      if (token && creators.length) {
        const likeRes = await getBookmarkCreatorLikeStatus(token, creators.map((c: SavedCreator) => c._id));
        if (likeRes.ok) {
          setLikedCreatorIds(new Set(
            Object.entries(likeRes.likedByCreatorId)
              .filter(([, liked]) => liked)
              .map(([id]) => id),
          ));
        }
      } else {
        setLikedCreatorIds(new Set());
      }
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

  const itemKey = (item: BookmarkedUnified) => `${item.kind}-${item.id}`;
  const orderKey = bookmarkOrderKey;

  const kindLabel = dragKindLabel;
  const kindBadgeBg = dragKindBadgeBg;

  const exitEditMode = () => {
    setEditMode(false);
    setSelectedKeys(new Set());
  };

  const toggleSelected = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const deleteSelected = async () => {
    if (selectedKeys.size === 0) return;
    setDeletingSelected(true);
    try {
      const toDelete = filteredItems.filter((item) => selectedKeys.has(itemKey(item)));
      for (const item of toDelete) {
        if (item.bookmark) {
          await axios.delete(`/api/bookmarks/${item.bookmark._id}`, { headers });
          setBookmarks((prev) => prev.filter((b) => b._id !== item.bookmark!._id));
          setAllBookmarks((prev) => prev.filter((b) => b._id !== item.bookmark!._id));
        } else if (item.ainsfwSlug) {
          try { localStorage.setItem(`ainsfw_bookmark_${item.ainsfwSlug}`, '0'); } catch { /* ignore */ }
          setAinsfwSlugs((prev) => prev.filter((s) => s !== item.ainsfwSlug));
        } else if (item.creatorId) {
          await fetch('/api/onlyfans/save', {
            method: 'DELETE',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ creatorId: item.creatorId }),
          });
          setSavedCreators((prev) => prev.filter((c) => c._id !== item.creatorId));
        }
      }
      exitEditMode();
      const selectedOrderKeys = new Set(toDelete.map(orderKey));
      const nextOrder = likesOrder.filter((k) => !selectedOrderKeys.has(normalizeBookmarkOrderKey(k)));
      setLikesOrder(nextOrder);
      if (token) await saveSavedLikesOrder(token, nextOrder);
      toast(`Removed ${toDelete.length} item${toDelete.length === 1 ? '' : 's'}`, 'success');
    } catch {
      toast('Failed to remove items', 'error');
    } finally {
      setDeletingSelected(false);
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

  const ainsfwLikes = useMemo(
    () => ainsfwSlugs
      .map((slug) => AI_NSFW_TOOLS.find((t) => t.slug === slug))
      .filter((t): t is (typeof AI_NSFW_TOOLS)[number] => !!t),
    [ainsfwSlugs],
  );

  const { filteredItems, typeCounts, totalLikesCount, showFolders } = useMemo(() => {
    const bookmarkItems: BookmarkedUnified[] = bookmarks
      .filter((bk) => bk.item)
      .map((bk) => ({
        id: bk._id,
        kind: bk.itemType,
        name: bk.item!.name,
        image: bk.item!.image || '/assets/placeholder-no-image.png',
        slug: bk.item!.slug,
        href: `/${bk.item!.slug}`,
        categories: (bk.item!.categories?.length ? bk.item!.categories : [bk.item!.category]).filter(Boolean) as string[],
        memberCount: bk.item!.memberCount,
        telegramLink: bk.item!.telegramLink,
        bookmark: bk,
      }));

    const ainsfwItems: BookmarkedUnified[] = activeFolder ? [] : ainsfwLikes.map((tool) => ({
      id: tool.slug,
      kind: 'ainsfw' as const,
      name: tool.name,
      image: tool.image?.startsWith('http') || tool.image?.startsWith('/') ? tool.image : '/assets/image.jpg',
      slug: tool.slug,
      href: `/ainsfw/${tool.slug}`,
      categories: [tool.category].filter(Boolean),
      ainsfwSlug: tool.slug,
    }));

    const creatorItems: BookmarkedUnified[] = activeFolder ? [] : savedCreators.map((creator) => ({
      id: creator._id,
      kind: 'creator' as const,
      name: creator.name,
      image: creator.avatar || '/assets/placeholder-no-image.png',
      slug: creator.slug || creator.username,
      href: ofCreatorProfileUrl(creator.username),
      categories: (creator.categories?.length ? creator.categories : ['OnlyFans']).filter(Boolean),
      priceLabel: creator.isFree ? 'Free' : `$${creator.price}`,
      creatorId: creator._id,
    }));

    const allBookmarkItems = [...bookmarkItems, ...ainsfwItems, ...creatorItems];
    const counts = {
      all: allBookmarks.filter((b) => b.item).length + ainsfwLikes.length + savedCreators.length,
      group: allBookmarks.filter((b) => b.item && b.itemType === 'group').length,
      bot: allBookmarks.filter((b) => b.item && b.itemType === 'bot').length,
      ainsfw: ainsfwLikes.length,
      creator: savedCreators.length,
    };

    return {
      filteredItems: applyLikesOrder(
        typeFilter === 'all' ? allBookmarkItems : allBookmarkItems.filter((item) => item.kind === typeFilter),
        likesOrder,
      ),
      typeCounts: counts,
      totalLikesCount: counts.all,
      showFolders: !activeFolder && (typeFilter === 'all' || typeFilter === 'group' || typeFilter === 'bot'),
    };
  }, [bookmarks, ainsfwLikes, savedCreators, activeFolder, typeFilter, allBookmarks, likesOrder]);

  const orderedItems = filteredItems;

  const persistOrder = async (nextVisibleOrder: BookmarkedUnified[]) => {
    if (!token) return;
    const newVisibleOrderKeys = nextVisibleOrder.map(orderKey);
    const visibleKeys = orderedItems.map(orderKey);
    const merged = mergeReorderedKeys(likesOrder, visibleKeys, newVisibleOrderKeys);
    setLikesOrder(merged);
    await saveSavedLikesOrder(token, merged);
  };

  const handleSaveCreatorLink = async () => {
    const trimmed = creatorLinkInput.trim();
    if (!trimmed || !token) return;
    setSavingCreatorLink(true);
    try {
      const res = await saveOnlyFansCreatorFromLink(token, trimmed);
      if (!res.ok) {
        toast(res.message || 'Could not save creator', 'error');
        return;
      }
      setCreatorLinkInput('');
      await loadData();
      toast('Saved', 'success');
    } catch {
      toast('Could not save creator', 'error');
    } finally {
      setSavingCreatorLink(false);
    }
  };

  const handleToggleCreatorLike = async (creatorId: string) => {
    if (!token || togglingCreatorLikeId) return;
    const wasLiked = likedCreatorIds.has(creatorId);
    setTogglingCreatorLikeId(creatorId);
    setLikedCreatorIds((prev) => {
      const next = new Set(prev);
      if (wasLiked) next.delete(creatorId);
      else next.add(creatorId);
      return next;
    });
    try {
      const res = await toggleBookmarkCreatorLikes(token, creatorId);
      if (!res.ok) throw new Error(res.message || 'Like failed');
      setLikedCreatorIds((prev) => {
        const next = new Set(prev);
        if (res.liked) next.add(creatorId);
        else next.delete(creatorId);
        return next;
      });
      toast(res.liked ? 'Added to likes' : 'Removed from likes', 'success');
    } catch {
      setLikedCreatorIds((prev) => {
        const next = new Set(prev);
        if (wasLiked) next.add(creatorId);
        else next.delete(creatorId);
        return next;
      });
      toast('Could not update like', 'error');
    } finally {
      setTogglingCreatorLikeId(null);
    }
  };

  const handleDragStart = (idx: number, e?: React.DragEvent) => {
    dragItem.current = idx;
    dragOverItem.current = idx;
    if (e?.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(idx));
    }
  };

  const handleDragEnter = (idx: number) => {
    dragOverItem.current = idx;
  };

  const handleDragEnd = () => {
    const from = dragItem.current;
    const to = dragOverItem.current;
    dragItem.current = null;
    dragOverItem.current = null;
    if (from === null || to === null || from === to) return;
    const copy = [...orderedItems];
    const [removed] = copy.splice(from, 1);
    copy.splice(to, 0, removed);
    void persistOrder(copy);
  };

  const TYPE_FILTERS: { key: BookmarkFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'group', label: 'Groups' },
    { key: 'bot', label: 'Bots' },
    { key: 'creator', label: 'OnlyFans' },
    { key: 'ainsfw', label: 'AI NSFW' },
  ];

  const profileThemed = isProfileThemedMode(themeMode) || editorial;
  const t = profileThemed && themeMode
    ? getProfileTabColors(themeMode)
    : editorial || themeMode === 'light' ? getProfileTabColors('light') : isPremium ? {
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
    text: '#fff',
    textMuted: 'rgba(255,255,255,0.4)',
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
    text: '#fff',
    textMuted: 'rgba(255,255,255,0.4)',
  };
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
    <div className="min-w-0 max-w-full overflow-x-hidden -mx-2 px-0 sm:mx-0 sm:px-0">
      {!isPremium && <PremiumCompareBlock className="mb-4 sm:mb-6" />}

      {/* Header */}
      <div className="mb-3 sm:mb-4">
        <div className="flex items-start justify-between gap-2">
          <h2 className="min-w-0 text-base font-black tracking-wide sm:text-lg" style={{ color: t.text }}>My Bookmarks</h2>
          <div className="flex shrink-0 items-center gap-1">
          {orderedItems.length > 0 && (
            <>
              {editMode && selectedKeys.size > 0 && (
                <button
                  type="button"
                  onClick={deleteSelected}
                  disabled={deletingSelected}
                  className="px-2.5 py-2 rounded-lg text-[10px] font-black uppercase tracking-wide transition-all disabled:opacity-50"
                  style={{ background: '#ef4444', color: '#fff' }}
                >
                  {deletingSelected ? 'Deleting...' : `Delete (${selectedKeys.size})`}
                </button>
              )}
              <button
                type="button"
                onClick={() => editMode ? exitEditMode() : setEditMode(true)}
                className="px-2.5 py-2 rounded-lg text-[10px] font-black uppercase tracking-wide transition-all"
                style={
                  editMode
                    ? { background: t.viewBtnBg, color: t.viewBtnTxt }
                    : { background: t.pillBg, color: t.accentDim, border: `1px solid ${t.pillBorder}` }
                }
              >
                {editMode ? 'Done' : 'Edit'}
              </button>
            </>
          )}
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
          {viewMode === 'grid' && (
            <ProfileGridDensityToggle
              value={gridDensity}
              onChange={setGridDensity}
              tokens={{
                pillBorder: t.pillBorder,
                pillBg: t.pillBg,
                viewBtnBg: t.viewBtnBg,
                viewBtnTxt: t.viewBtnTxt,
                accentDim: t.accentDim,
              }}
            />
          )}
          </div>
        </div>
        <p className="mt-1 text-[10px] leading-relaxed sm:text-[11px]" style={{ color: t.textMuted }}>
          {totalLikesCount} bookmarked{' '}
          {!isPremium && (
            <>
              <span>(remaining: {freeBookmarksRemaining}/{FREE_BOOKMARK_LIMIT})</span>
              <span className="mx-1 text-white/20">|</span>
              <span>folders: {freeFoldersRemaining}/{FREE_FOLDER_LIMIT}</span>
              <span className="mx-1 text-white/20">-</span>
              <Link href="/premium" className="text-amber-400 hover:text-amber-300 underline underline-offset-2 font-semibold">
                Upgrade
              </Link>
            </>
          )}
        </p>
      </div>

      {!activeFolder && (
        <div className="mb-3 flex flex-col gap-2 sm:mb-4 sm:flex-row sm:items-center">
          <input
            type="text"
            value={creatorLinkInput}
            onChange={(e) => setCreatorLinkInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !savingCreatorLink) void handleSaveCreatorLink();
            }}
            placeholder="e.g. SophieRaiin or onlyfans.com/sophieraiin"
            className="min-w-0 flex-1 rounded-lg px-3 py-2 text-[12px] outline-none sm:text-[13px]"
            style={{ background: t.pillBg, border: `1px solid ${t.pillBorder}`, color: t.text }}
            disabled={savingCreatorLink}
          />
          <button
            type="button"
            onClick={() => void handleSaveCreatorLink()}
            disabled={savingCreatorLink || !creatorLinkInput.trim()}
            className="shrink-0 rounded-lg px-4 py-2 text-[10px] font-black uppercase tracking-wide transition-all disabled:opacity-50 sm:text-[11px]"
            style={{ background: t.viewBtnBg, color: t.viewBtnTxt }}
          >
            Save creator
          </button>
        </div>
      )}

      <div className="mb-3 overflow-x-auto pb-0.5 scrollbar-hide sm:mb-4">
        <div
          className="inline-flex min-w-max gap-0 overflow-hidden rounded-lg border"
          style={{ borderColor: t.pillBorder }}
        >
        {TYPE_FILTERS.map((item) => {
          const active = typeFilter === item.key;
          const count = typeCounts[item.key];
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setTypeFilter(item.key)}
              className="px-2.5 py-2 text-[10px] font-bold uppercase tracking-[0.06em] transition-colors border-r last:border-r-0 sm:px-3 sm:tracking-[0.08em]"
              style={{
                borderColor: t.pillBorder,
                backgroundColor: active ? t.activeBg : t.pillBg,
                color: active ? t.activeTxt : t.accentDim,
              }}
            >
              {item.label} ({count})
            </button>
          );
        })}
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
            <li>Drag cards by the grip to reorder.</li>
            <li>Use <span style={{ color: '#c9973a' }}>Edit</span> to select and remove items.</li>
            <li>Create <span style={{ color: '#c9973a' }}>folders</span> to organize your collection.</li>
            <li>Switch between <span style={{ color: '#c9973a' }}>list</span> &amp; <span style={{ color: '#c9973a' }}>grid</span> view anytime.</li>
          </ul>
        </div>
      )}

      {!loading && totalLikesCount === 0 && (
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
              <Link
                href="/ainsfw"
                className="px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wide transition-all hover:scale-[1.03]"
                style={{ background: t.pillBg, color: isPremium ? '#c9973a' : '#fff', border: `1px solid ${t.pillBorder}` }}
              >
                Save an AI Tool
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Folders — compact horizontal row */}
      {showFolders && (
      <div className="mb-2 sm:mb-3">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-hide">
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
      )}

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
          <div className="w-8 h-8 border-2 rounded-full animate-spin mx-auto mb-4" style={{ borderColor: `${t.divider}`, borderTopColor: t.textMuted }} />
          <p className="text-sm" style={{ color: t.textMuted }}>Loading your saved items...</p>
        </div>
      ) : orderedItems.length === 0 && bookmarks.filter((bk) => !bk.item).length === 0 ? (
        <div className="py-16 text-center">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mx-auto mb-4" style={{ color: t.textMuted, opacity: 0.35 }}>
            <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <p className="text-sm font-medium" style={{ color: t.textMuted }}>
            {activeFolder ? 'This folder is empty' : typeFilter === 'all' ? 'No bookmarks yet' : `No ${TYPE_FILTERS.find(f => f.key === typeFilter)?.label.toLowerCase()} bookmarked yet`}
          </p>
          <p className="text-xs mt-1" style={{ color: t.textMuted, opacity: 0.7 }}>
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
        <div className="space-y-1 sm:space-y-1.5">
          {bookmarks.filter((bk) => !bk.item).map((bk) => (
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
          ))}
          {orderedItems.map((item, idx) => {
            const key = itemKey(item);
            const selected = selectedKeys.has(key);
            return (
            <div
              key={key}
              onDragEnter={() => handleDragEnter(idx)}
              onDragOver={(e) => e.preventDefault()}
              className="group/card relative overflow-hidden rounded-xl transition-all duration-300 sm:rounded-2xl"
              style={{
                background: t.cardBg,
                border: `1px solid ${selected ? '#ef4444' : t.cardBorder}`,
                boxShadow: selected ? '0 0 0 1px #ef444488' : undefined,
              }}
              onMouseEnter={e => { if (!editMode) (e.currentTarget as HTMLElement).style.border = `1px solid ${t.cardHover}`; }}
              onMouseLeave={e => { if (!editMode && !selected) (e.currentTarget as HTMLElement).style.border = `1px solid ${t.cardBorder}`; }}
            >
              <div className="absolute left-0 top-0 bottom-0 w-px" style={{ background: t.leftAccent }} />
              <div className="flex flex-col gap-1.5 px-1 py-2 sm:flex-row sm:gap-2 sm:px-2 sm:py-2.5">
                <div className="flex min-w-0 items-start gap-2">
                  <div
                    draggable
                    onDragStart={(e) => handleDragStart(idx, e)}
                    onDragEnd={handleDragEnd}
                    className="shrink-0 cursor-grab touch-none p-0.5 opacity-40 transition-opacity active:cursor-grabbing group-hover/card:opacity-100"
                    style={{ color: t.textMuted }}
                    title="Drag to reorder"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M18 11V6a2 2 0 0 0-4 0" /><path d="M14 10V4a2 2 0 0 0-4 0v2" /><path d="M10 10.5V5a2 2 0 0 0-4 0v8" />
                      <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.7-2.3" />
                    </svg>
                  </div>
                  {editMode && (
                    <button
                      type="button"
                      onClick={() => toggleSelected(key)}
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all"
                      style={{
                        borderColor: selected ? '#ef4444' : t.divider,
                        backgroundColor: selected ? '#ef4444' : 'transparent',
                      }}
                      aria-label={selected ? 'Deselect' : 'Select'}
                    >
                      {selected && (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><path d="M5 13l4 4L19 7"/></svg>
                      )}
                    </button>
                  )}
                  <Link href={editMode ? '#' : item.href} onClick={editMode ? (e) => { e.preventDefault(); toggleSelected(key); } : undefined} className="shrink-0" {...(item.kind === 'creator' && !editMode ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
                    <div className="h-11 w-11 overflow-hidden rounded-xl sm:h-12 sm:w-12" style={{ border: `1px solid ${t.divider}` }}>
                      <img src={item.image} alt={item.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" onError={e => { (e.target as HTMLImageElement).src = '/assets/placeholder-no-image.png'; }} />
                    </div>
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link href={editMode ? '#' : item.href} onClick={editMode ? (e) => e.preventDefault() : undefined} className={`block truncate text-[13px] font-bold leading-tight transition-colors sm:text-[14px] ${isPremium ? 'hover:text-[#c9973a]' : 'hover:opacity-70'}`} style={{ color: t.text }} {...(item.kind === 'creator' && !editMode ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{item.name}</Link>
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      {item.categories.slice(0, 3).map((cat, i) => (
                        <span key={i} className="rounded px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.1em] sm:text-[9px] sm:tracking-[0.12em]" style={{ background: t.tagBg, border: `1px solid ${t.tagBorder}`, color: i === 0 ? t.accent : t.accentDim }}>{cat}</span>
                      ))}
                      <span className="rounded px-1.5 py-0.5 text-[8px] font-bold uppercase sm:text-[9px]" style={{
                        background: item.kind === 'bot' ? '#0088cc15' : item.kind === 'ainsfw' ? '#7C3AED15' : item.kind === 'creator' ? '#00AFF015' : `${t.accent}10`,
                        color: item.kind === 'bot' ? '#4ab3f4' : item.kind === 'ainsfw' ? '#a78bfa' : item.kind === 'creator' ? '#00AFF0' : t.accentDim,
                      }}>
                        {kindLabel(item.kind)}
                      </span>
                      {item.priceLabel ? (
                        <span className="rounded px-1.5 py-0.5 text-[8px] font-bold uppercase sm:text-[9px]" style={{ background: '#00AFF015', color: '#00AFF0' }}>{item.priceLabel}</span>
                      ) : null}
                    </div>
                  </div>
                </div>
                {!editMode && (
                  <div className="flex flex-wrap items-center gap-1.5 pl-9 sm:pl-0">
                    {item.memberCount ? (
                      <div className="mr-0.5 text-right">
                        <div className="text-[13px] font-black leading-none sm:text-[15px]" style={{ color: t.accent }}>{formatNum(item.memberCount)}</div>
                        <div className="text-[7px] font-bold uppercase tracking-widest sm:text-[8px]" style={{ color: t.accentDim }}>subs</div>
                      </div>
                    ) : null}
                    {item.telegramLink && (
                      <a href={item.telegramLink} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="flex items-center rounded-lg px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wide transition-all hover:scale-[1.04] sm:gap-1.5 sm:px-3 sm:text-[11px]" style={{ background: 'linear-gradient(135deg, #0088cc, #0077b5)', color: '#fff' }} title="Open in Telegram">
                        <span className="sm:hidden">TG</span>
                        <span className="hidden sm:inline">Telegram</span>
                      </a>
                    )}
                    {item.kind === 'creator' && item.creatorId && (
                      <button
                        type="button"
                        onClick={() => void handleToggleCreatorLike(item.creatorId!)}
                        disabled={togglingCreatorLikeId === item.creatorId}
                        className="flex h-8 w-8 items-center justify-center rounded-lg transition-all hover:scale-[1.04] disabled:opacity-50"
                        style={{
                          background: likedCreatorIds.has(item.creatorId) ? '#ef444422' : 'rgba(255,255,255,0.06)',
                          border: `1px solid ${likedCreatorIds.has(item.creatorId) ? '#ef444466' : 'rgba(255,255,255,0.12)'}`,
                          color: likedCreatorIds.has(item.creatorId) ? '#ef4444' : t.accentDim,
                        }}
                        aria-label={likedCreatorIds.has(item.creatorId) ? 'Remove from likes' : 'Add to likes'}
                        title={likedCreatorIds.has(item.creatorId) ? 'Remove from likes' : 'Add to likes'}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill={likedCreatorIds.has(item.creatorId) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                        </svg>
                      </button>
                    )}
                    <Link href={item.href} className="rounded-lg px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wide transition-all hover:scale-[1.04] sm:px-3 sm:text-[11px]" style={isPremium ? { background: 'linear-gradient(135deg, #c9973a, #a67c2e)', color: '#0d0c0a' } : { background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)' }} {...(item.kind === 'creator' ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
                      View
                    </Link>
                    {item.bookmark ? <ThreeDotMenu bk={item.bookmark} /> : null}
                  </div>
                )}
              </div>
            </div>
            );
          })}
        </div>
      ) : (
        /* Grid View */
        <div className={`grid ${profileGridClass(gridDensity)} ${profileGridGapClass(gridDensity)}`}>
          {bookmarks.filter((bk) => !bk.item).map((bk) => (
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
          ))}
          {orderedItems.map((item, idx) => {
            const key = itemKey(item);
            const selected = selectedKeys.has(key);
            const subtitle = item.memberCount
              ? `${formatNum(item.memberCount)} subs`
              : item.priceLabel || item.categories[0] || kindLabel(item.kind);

            if (editMode) {
              return (
                <div
                  key={key}
                  onDragEnter={() => handleDragEnter(idx)}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => toggleSelected(key)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSelected(key); } }}
                  className="group rounded-xl overflow-hidden border transition-all"
                  style={{
                    borderColor: selected ? '#ef4444' : profileTokens.border,
                    backgroundColor: profileTokens.card,
                    boxShadow: selected ? '0 0 0 1px #ef444488' : undefined,
                  }}
                >
                  <div
                    draggable
                    onDragStart={(e) => { e.stopPropagation(); handleDragStart(idx, e); }}
                    onDragEnd={handleDragEnd}
                    onClick={(e) => e.stopPropagation()}
                    className="relative overflow-hidden group/drag cursor-grab active:cursor-grabbing touch-none aspect-square"
                  >
                    <img
                      src={item.image}
                      alt=""
                      className="w-full h-full object-cover pointer-events-none"
                      referrerPolicy="no-referrer"
                      onError={e => { (e.target as HTMLImageElement).src = '/assets/placeholder-no-image.png'; }}
                    />
                    <span
                      className="absolute bottom-2 right-2 z-[2] pointer-events-none text-[9px] font-bold tracking-[0.14em] uppercase px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: kindBadgeBg(item.kind), color: '#fff' }}
                    >
                      {kindLabel(item.kind)}
                    </span>
                    <span
                      className="absolute top-2 right-2 z-[3] w-6 h-6 rounded-full border-2 flex items-center justify-center pointer-events-none"
                      style={{
                        borderColor: selected ? '#ef4444' : 'rgba(255,255,255,0.8)',
                        backgroundColor: selected ? '#ef4444' : 'rgba(0,0,0,0.35)',
                      }}
                    >
                      {selected && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><path d="M5 13l4 4L19 7"/></svg>
                      )}
                    </span>
                    <DragHint />
                  </div>
                  <div className="p-2.5 pointer-events-none">
                    <p className="text-xs font-bold truncate" style={{ color: profileTokens.text }}>{item.name}</p>
                    <p className="text-[10px] truncate mt-0.5" style={{ color: profileTokens.muted }}>{subtitle}</p>
                  </div>
                </div>
              );
            }

            return (
            <div
              key={key}
              onDragEnter={() => handleDragEnter(idx)}
              onDragOver={(e) => e.preventDefault()}
              className="group rounded-xl overflow-hidden border transition-all hover:opacity-95"
              style={{ borderColor: profileTokens.border, backgroundColor: profileTokens.card }}
            >
              <div
                draggable
                onDragStart={(e) => { e.stopPropagation(); handleDragStart(idx, e); }}
                onDragEnd={handleDragEnd}
                className="relative overflow-hidden group/drag cursor-grab active:cursor-grabbing touch-none aspect-square"
                title="Drag to reorder"
              >
                <Link href={item.href} className="block w-full h-full" draggable={false} {...(item.kind === 'creator' ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
                  <img
                    src={item.image}
                    alt=""
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 pointer-events-none"
                    referrerPolicy="no-referrer"
                    onError={e => { (e.target as HTMLImageElement).src = '/assets/placeholder-no-image.png'; }}
                  />
                </Link>
                {item.kind === 'creator' && item.creatorId && !editMode && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      void handleToggleCreatorLike(item.creatorId!);
                    }}
                    disabled={togglingCreatorLikeId === item.creatorId}
                    className="absolute top-2 left-2 z-[3] flex h-7 w-7 items-center justify-center rounded-full transition-all disabled:opacity-50"
                    style={{
                      background: likedCreatorIds.has(item.creatorId) ? '#ef4444' : 'rgba(0,0,0,0.55)',
                      color: likedCreatorIds.has(item.creatorId) ? '#fff' : '#fff',
                      border: `1px solid ${likedCreatorIds.has(item.creatorId) ? '#ef4444' : 'rgba(255,255,255,0.25)'}`,
                    }}
                    aria-label={likedCreatorIds.has(item.creatorId) ? 'Remove from likes' : 'Add to likes'}
                    title={likedCreatorIds.has(item.creatorId) ? 'Remove from likes' : 'Add to likes'}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill={likedCreatorIds.has(item.creatorId) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                  </button>
                )}
                <span
                  className="absolute bottom-2 right-2 z-[2] pointer-events-none text-[9px] font-bold tracking-[0.14em] uppercase px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: kindBadgeBg(item.kind), color: '#fff' }}
                >
                  {kindLabel(item.kind)}
                </span>
                <DragHint />
              </div>
              <Link href={item.href} className="block p-2.5">
                <p className="text-xs font-bold truncate" style={{ color: profileTokens.text }}>{item.name}</p>
                <p className="text-[10px] truncate mt-0.5" style={{ color: profileTokens.muted }}>{subtitle}</p>
              </Link>
            </div>
            );
          })}
        </div>
      )}

      <UpgradeModal isOpen={showUpgrade} onClose={() => setShowUpgrade(false)} reason="folder_create" />
      {reportGroup && (
        <ReportModal group={reportGroup} onClose={() => setReportGroup(null)} />
      )}
    </div>
  );
}
