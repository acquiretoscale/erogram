'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import AiBulkActions from '../components/AiBulkActions';

interface VaultGroup {
  _id: string;
  name: string;
  slug: string;
  image: string;
  category: string;
  categories?: string[];
  country: string;
  description: string;
  description_de?: string;
  description_es?: string;
  memberCount: number;
  showOnVaultTeaser: boolean;
  vaultTeaserOrder: number;
  vaultCategories: string[];
  telegramLink?: string;
  createdAt?: string;
  status?: string;
}

interface CategoryConfig {
  name: string;
  visible: boolean;
  order: number;
}

const ALL_CATEGORIES = [
  'Adult', 'AI NSFW', 'Amateur', 'Anal', 'Anime', 'Argentina',
  'Asian', 'BDSM', 'Big Ass', 'Big Tits', 'Black', 'Blonde', 'Blowjob',
  'Brazil', 'Brunette', 'China', 'Colombia', 'Cosplay', 'Creampie',
  'Cuckold', 'Ebony', 'Fantasy', 'Feet', 'Fetish', 'France', 'Free-use',
  'Germany', 'Hardcore', 'Italy',
  'Japan', 'Latina', 'Lesbian', 'Masturbation', 'Mexico', 'MILF',
  'NSFW-Telegram', 'Onlyfans', 'Onlyfans Leaks', 'Petite', 'Philippines', 'Privacy', 'Public', 'Red Hair', 'Russian',
  'Spain', 'Telegram-Porn', 'Threesome', 'UK', 'Ukraine', 'USA', 'Vietnam',
];

export default function AdminVaultPage({ isActive }: { isActive?: boolean }) {
  const [groups, setGroups] = useState<VaultGroup[]>([]);
  const [catConfig, setCatConfig] = useState<CategoryConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('All');
  const [editGroup, setEditGroup] = useState<VaultGroup | null>(null);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<'groups' | 'categories'>('groups');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [perPage, setPerPage] = useState(50);
  const [page, setPage] = useState(0);
  const [showFeatured, setShowFeatured] = useState(false);
  const [inlineCatEdit, setInlineCatEdit] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'default' | 'newest' | 'oldest' | 'members' | 'name'>('default');
  const lastCheckedRef = useRef<number | null>(null);
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const res = await fetch(`/api/admin/vault?${params}`, { headers });
      const data = await res.json();
      setGroups(data.groups || []);
      if (data.vaultTeaserCategories?.length) setCatConfig(data.vaultTeaserCategories);
      else {
        const cats = new Set<string>();
        (data.groups || []).forEach((g: VaultGroup) => {
          if (g.category) cats.add(g.category);
          g.categories?.forEach(c => { if (c) cats.add(c); });
        });
        setCatConfig(Array.from(cats).map((name, i) => ({ name, visible: true, order: i })));
      }
    } catch { /* silent */ }
    setLoading(false);
  }, [search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (isActive) fetchData();
  }, [isActive]);

  const allCategories = useMemo(() => {
    const catCounts = new Map<string, number>();
    groups.forEach(g => {
      const cats = g.categories?.length ? g.categories : (g.category ? [g.category] : []);
      cats.forEach(c => { if (c) catCounts.set(c, (catCounts.get(c) || 0) + 1); });
    });
    return [...catCounts.entries()].sort((a, b) => b[1] - a[1]);
  }, [groups]);

  const filteredGroups = useMemo(() => {
    const hasImg = (g: VaultGroup) => g.image && g.image !== '/assets/image.jpg' && g.image !== '/assets/placeholder-no-image.png';
    const list = filterCat === 'All'
      ? groups
      : groups.filter(g => {
          const cats = g.categories?.length ? g.categories : (g.category ? [g.category] : []);
          return cats.some(c => c?.toLowerCase() === filterCat.toLowerCase());
        });
    return [...list].sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      if (sortBy === 'oldest') return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      if (sortBy === 'members') return (b.memberCount || 0) - (a.memberCount || 0);
      if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
      return (hasImg(b) ? 1 : 0) - (hasImg(a) ? 1 : 0);
    });
  }, [groups, filterCat, sortBy]);

  const toggleTeaser = async (g: VaultGroup) => {
    const next = !g.showOnVaultTeaser;
    setGroups(prev => prev.map(x => x._id === g._id ? { ...x, showOnVaultTeaser: next } : x));
    await fetch('/api/admin/vault', { method: 'PUT', headers, body: JSON.stringify({ groupId: g._id, showOnVaultTeaser: next }) });
  };

  const [uploading, setUploading] = useState(false);
  const [newCat, setNewCat] = useState('');
  const [fetchingPhoto, setFetchingPhoto] = useState<string | null>(null);
  const [bulkFetching, setBulkFetching] = useState(false);
  const [fetchingUsers, setFetchingUsers] = useState(false);

  const fetchPhotoFromTelegram = async (groupId: string, force = false) => {
    setFetchingPhoto(groupId);
    try {
      const res = await fetch('/api/admin/csv-import/fetch-photos', { method: 'POST', headers, body: JSON.stringify({ groupIds: [groupId], force }) });
      const data = await res.json();
      const result = data.results?.[0];
      if (result?.status === 'success' && result.url) {
        setGroups(prev => prev.map(g => g._id === groupId ? { ...g, image: result.url } : g));
      }
    } catch { /* silent */ }
    setFetchingPhoto(null);
  };

  const fetchAllMissingPhotos = async () => {
    const missing = groups.filter(g => !g.image || g.image === '/assets/image.jpg' || g.image === '/assets/placeholder-no-image.png');
    if (missing.length === 0) return;
    setBulkFetching(true);
    for (let i = 0; i < missing.length; i += 5) {
      const batch = missing.slice(i, i + 5).map(g => g._id);
      try {
        const res = await fetch('/api/admin/csv-import/fetch-photos', { method: 'POST', headers, body: JSON.stringify({ groupIds: batch }) });
        const data = await res.json();
        (data.results || []).forEach((r: any) => {
          if (r.status === 'success' && r.url) {
            setGroups(prev => prev.map(g => g._id === r.id ? { ...g, image: r.url } : g));
          }
        });
      } catch { /* silent */ }
    }
    setBulkFetching(false);
  };

  const fetchAllMissingUsers = async () => {
    const target = selectedIds.size > 0
      ? groups.filter(g => selectedIds.has(g._id) && (g.memberCount || 0) === 0)
      : groups.filter(g => (g.memberCount || 0) === 0);
    if (target.length === 0) { alert('All groups already have member counts.'); return; }
    setFetchingUsers(true);
    let totalSuccess = 0;
    for (let i = 0; i < target.length; i += 10) {
      const batch = target.slice(i, i + 10).map(g => g._id);
      try {
        const res = await fetch('/api/admin/csv-import/fetch-users', { method: 'POST', headers, body: JSON.stringify({ groupIds: batch }) });
        const data = await res.json();
        (data.results || []).forEach((r: any) => {
          if (r.status === 'success' && r.memberCount) {
            totalSuccess++;
            setGroups(prev => prev.map(g => g._id === r.id ? { ...g, memberCount: r.memberCount } : g));
          }
        });
      } catch { /* silent */ }
      if (i + 10 < target.length) await new Promise(r => setTimeout(r, 1500));
    }
    setFetchingUsers(false);
    alert(`Done! Fetched member counts for ${totalSuccess} of ${target.length} groups.`);
  };

  const deleteFromVault = async (g: VaultGroup) => {
    if (!confirm(`Remove "${g.name}" from the Secret Vault? It will become a regular public group.`)) return;
    setGroups(prev => prev.filter(x => x._id !== g._id));
    await fetch('/api/admin/vault', { method: 'DELETE', headers, body: JSON.stringify({ groupId: g._id }) });
  };

  const approveGroup = async (g: VaultGroup) => {
    try {
      await fetch(`/api/admin/groups/${g._id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ status: 'approved', premiumOnly: true }),
      });
      setGroups(prev => prev.map(x => x._id === g._id ? { ...x, status: 'approved' } : x));
    } catch { /* silent */ }
  };

  const bulkApproveAll = async () => {
    const pending = groups.filter(g => g.status !== 'approved');
    if (pending.length === 0) return;
    if (!confirm(`Approve ${pending.length} pending vault groups?`)) return;
    for (const g of pending) {
      await fetch(`/api/admin/groups/${g._id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ status: 'approved', premiumOnly: true }),
      });
    }
    setGroups(prev => prev.map(g => ({ ...g, status: 'approved' })));
  };

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
      const data = await res.json();
      if (data.url && editGroup) setEditGroup({ ...editGroup, image: data.url });
    } catch { /* silent */ }
    setUploading(false);
  };

  const addVaultCategory = () => {
    if (!editGroup || !newCat.trim()) return;
    if (editGroup.vaultCategories.length >= 4) return;
    if (editGroup.vaultCategories.includes(newCat.trim())) return;
    setEditGroup({ ...editGroup, vaultCategories: [...editGroup.vaultCategories, newCat.trim()] });
    setNewCat('');
  };

  const removeVaultCategory = (cat: string) => {
    if (!editGroup) return;
    setEditGroup({ ...editGroup, vaultCategories: editGroup.vaultCategories.filter(c => c !== cat) });
  };

  const saveEdit = async () => {
    if (!editGroup) return;
    setSaving(true);
    await fetch('/api/admin/vault', {
      method: 'PUT', headers,
      body: JSON.stringify({
        groupId: editGroup._id,
        name: editGroup.name,
        category: editGroup.category,
        categories: editGroup.categories,
        country: editGroup.country,
        image: editGroup.image,
        description: editGroup.description,
        showOnVaultTeaser: editGroup.showOnVaultTeaser,
        vaultTeaserOrder: editGroup.vaultTeaserOrder,
        vaultCategories: editGroup.vaultCategories,
      }),
    });
    setGroups(prev => prev.map(x => x._id === editGroup._id ? editGroup : x));
    setEditGroup(null);
    setSaving(false);
  };

  const saveInlineCats = async (groupId: string, newCats: string[]) => {
    const capped = newCats.slice(0, 3);
    try {
      await fetch(`/api/admin/groups/${groupId}`, {
        method: 'PUT', headers,
        body: JSON.stringify({ categories: capped, category: capped[0] || '' }),
      });
      setGroups(prev => prev.map(g => g._id === groupId ? { ...g, categories: capped, category: capped[0] || g.category } : g));
    } catch { /* silent */ }
  };

  // Teaser groups sorted by order
  const teaserGroups = groups.filter(g => g.showOnVaultTeaser).sort((a, b) => a.vaultTeaserOrder - b.vaultTeaserOrder);
  const teaserCount = teaserGroups.length;

  const saveTeaserOrder = async (reordered: VaultGroup[]) => {
    const order = reordered.map((g, i) => ({ _id: g._id, vaultTeaserOrder: i }));
    setGroups(prev => {
      const map = new Map(order.map(o => [o._id, o.vaultTeaserOrder]));
      return prev.map(g => map.has(g._id) ? { ...g, vaultTeaserOrder: map.get(g._id)! } : g);
    });
    await fetch('/api/admin/vault', { method: 'PUT', headers, body: JSON.stringify({ order }) });
  };

  const handleDragStart = (idx: number) => { dragItem.current = idx; };
  const handleDragEnter = (idx: number) => { dragOverItem.current = idx; };
  const handleDragEnd = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    const copy = [...teaserGroups];
    const [removed] = copy.splice(dragItem.current, 1);
    copy.splice(dragOverItem.current, 0, removed);
    dragItem.current = null;
    dragOverItem.current = null;
    saveTeaserOrder(copy);
  };

  // Category section ordering
  const saveCatConfig = async (updated: CategoryConfig[]) => {
    setCatConfig(updated);
    await fetch('/api/admin/vault', { method: 'PUT', headers, body: JSON.stringify({ vaultTeaserCategories: updated }) });
  };

  const toggleCatVisible = (name: string) => {
    saveCatConfig(catConfig.map(c => c.name === name ? { ...c, visible: !c.visible } : c));
  };

  const catDragItem = useRef<number | null>(null);
  const catDragOver = useRef<number | null>(null);
  const handleCatDragEnd = () => {
    if (catDragItem.current === null || catDragOver.current === null) return;
    const copy = [...catConfig].sort((a, b) => a.order - b.order);
    const [removed] = copy.splice(catDragItem.current, 1);
    copy.splice(catDragOver.current, 0, removed);
    catDragItem.current = null;
    catDragOver.current = null;
    saveCatConfig(copy.map((c, i) => ({ ...c, order: i })));
  };

  const inputCls = 'w-full px-3 py-2 rounded-lg bg-[#1a1a1a] border border-white/10 text-white text-sm outline-none focus:border-amber-500/50';

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <span style={{ color: '#c9973a' }}>&#128274;</span> Secret Vault Manager
          </h1>
          <p className="text-sm text-white/40 mt-1">
            {groups.length} vault groups · <span className="text-amber-400 font-bold">{teaserCount}</span> featured{teaserCount > 12 && ' (12 shown randomly)'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        <button
          onClick={() => setTab('groups')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${tab === 'groups' ? 'bg-amber-500 text-black' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
        >Groups ({groups.length})</button>
        <button
          onClick={() => setTab('categories')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${tab === 'categories' ? 'bg-amber-500 text-black' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
        >Teaser Sections</button>
      </div>

      {tab === 'groups' && (
        <>
          {/* Filters */}
          <div className="flex gap-2 mb-3 flex-wrap">
            <input
              type="text" placeholder="Search groups..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 min-w-[200px] px-3 py-2 rounded-lg bg-[#1a1a1a] border border-white/10 text-white text-sm outline-none"
            />
            <select
              value={filterCat} onChange={e => { setFilterCat(e.target.value); setPage(0); }}
              className="px-3 py-2 rounded-lg bg-[#1a1a1a] border border-white/10 text-white text-sm outline-none"
            >
              <option value="All">All Categories ({groups.length})</option>
              {allCategories.map(([cat, count]) => <option key={cat} value={cat}>{cat} ({count})</option>)}
            </select>
            <select
              value={sortBy} onChange={e => { setSortBy(e.target.value as any); setPage(0); }}
              className="px-3 py-2 rounded-lg bg-[#1a1a1a] border border-white/10 text-white text-sm outline-none"
            >
              <option value="default">Sort: Images first</option>
              <option value="newest">Sort: Newest first</option>
              <option value="oldest">Sort: Oldest first</option>
              <option value="members">Sort: Most members</option>
              <option value="name">Sort: A → Z</option>
            </select>
          </div>
          {/* Quick category filters */}
          <div className="flex gap-1 mb-4 flex-wrap">
            <button
              onClick={() => { setFilterCat('All'); setPage(0); }}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${filterCat === 'All' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-white/5 border border-white/10 text-[#666] hover:text-white'}`}
            >All ({groups.length})</button>
            {allCategories.slice(0, 30).map(([cat, count]) => (
              <button
                key={cat}
                onClick={() => { setFilterCat(filterCat === cat ? 'All' : cat); setPage(0); }}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${filterCat === cat ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-white/5 border border-white/10 text-[#666] hover:text-white'}`}
              >{cat} <span className="opacity-50">({count})</span></button>
            ))}
          </div>

          {/* Featured / Teaser — collapsible */}
          {teaserCount > 0 && (
            <div className="mb-4 rounded-xl border border-amber-500/20 bg-amber-500/[0.03] overflow-hidden">
              <button
                onClick={() => setShowFeatured(!showFeatured)}
                className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-amber-500/[0.05] transition-colors"
              >
                <span className="text-sm font-bold text-amber-400">Featured ({teaserCount}){teaserCount > 12 ? ' · 12 shown randomly' : ''}</span>
                <span className="text-amber-400/60 text-xs">{showFeatured ? '▲ Collapse' : '▼ Expand'}</span>
              </button>
              {showFeatured && (
                <div className="px-4 pb-3 space-y-1">
                  {teaserGroups.map((g, idx) => (
                    <div
                      key={g._id}
                      draggable
                      onDragStart={() => handleDragStart(idx)}
                      onDragEnter={() => handleDragEnter(idx)}
                      onDragEnd={handleDragEnd}
                      onDragOver={e => e.preventDefault()}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#111] border border-white/5 cursor-grab active:cursor-grabbing hover:border-amber-500/30 transition-all"
                    >
                      <span className="text-white/20 text-xs font-mono w-5 text-right">{idx + 1}</span>
                      <span className="text-white/30 cursor-grab">&#9776;</span>
                      <img src={g.image || '/assets/placeholder-no-image.png'} alt="" className="w-6 h-6 rounded object-cover" />
                      <span className="text-white text-sm font-semibold truncate flex-1">{g.name}</span>
                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400">{g.category}</span>
                      <button onClick={() => toggleTeaser(g)} className="text-red-400 text-xs hover:text-red-300">Remove</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Bulk actions */}
          <div className="flex gap-2 mb-3 flex-wrap items-center">
            <button
              onClick={fetchAllMissingPhotos}
              disabled={bulkFetching}
              className="px-4 py-2 rounded-lg text-xs font-bold bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-all disabled:opacity-50"
            >
              {bulkFetching ? 'Fetching photos...' : 'Fetch All Missing Photos from Telegram'}
            </button>
            <button
              onClick={fetchAllMissingUsers}
              disabled={fetchingUsers}
              className="px-4 py-2 rounded-lg text-xs font-bold bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-all disabled:opacity-50"
            >
              {fetchingUsers ? 'Fetching users...' : `Fetch Users (${groups.filter(g => (g.memberCount || 0) === 0).length} missing)`}
            </button>
            {filteredGroups.some(g => g.status === 'pending') && (
              <button
                onClick={bulkApproveAll}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-all"
              >
                Approve All Pending ({filteredGroups.filter(g => g.status === 'pending').length})
              </button>
            )}
            {filteredGroups.length > 0 && (
              <>
                <button
                  onClick={() => {
                    const allIds = filteredGroups.map(g => g._id);
                    setSelectedIds(prev => prev.size === allIds.length ? new Set() : new Set(allIds));
                  }}
                  className="px-3 py-2 rounded-lg text-xs font-bold bg-white/5 text-[#999] hover:text-white transition-colors"
                >
                  {selectedIds.size === filteredGroups.length ? 'Deselect All' : `Select All (${filteredGroups.length})`}
                </button>
                {selectedIds.size > 0 && (
                  <button
                    onClick={() => setSelectedIds(new Set())}
                    className="px-3 py-2 rounded-lg text-xs font-bold bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                  >
                    Clear Selection ({selectedIds.size})
                  </button>
                )}
              </>
            )}
          </div>

          {/* Smart filter / select */}
          <div className="flex gap-1.5 mb-3 flex-wrap items-center">
            <span className="text-[10px] font-bold text-[#666] uppercase mr-1">Quick select:</span>
            <button
              onClick={() => { const ids = filteredGroups.filter(g => (g.categories?.length || 0) < 3).map(g => g._id); setSelectedIds(new Set(ids)); }}
              className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 transition-colors"
            >&lt;3 Cats ({filteredGroups.filter(g => (g.categories?.length || 0) < 3).length})</button>
            <button
              onClick={() => { const ids = filteredGroups.filter(g => (g.categories?.length || 0) < 2).map(g => g._id); setSelectedIds(new Set(ids)); }}
              className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors"
            >&lt;2 Cats ({filteredGroups.filter(g => (g.categories?.length || 0) < 2).length})</button>
            <button
              onClick={() => { const ids = filteredGroups.filter(g => !g.description || g.description.length < 20).map(g => g._id); setSelectedIds(new Set(ids)); }}
              className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-orange-500/10 border border-orange-500/20 text-orange-400 hover:bg-orange-500/20 transition-colors"
            >No Desc ({filteredGroups.filter(g => !g.description || g.description.length < 20).length})</button>
            <button
              onClick={() => { const ids = filteredGroups.filter(g => !g.description_de).map(g => g._id); setSelectedIds(new Set(ids)); }}
              className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 transition-colors"
            >No DE ({filteredGroups.filter(g => !g.description_de).length})</button>
            <button
              onClick={() => { const ids = filteredGroups.filter(g => !g.description_es).map(g => g._id); setSelectedIds(new Set(ids)); }}
              className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/20 transition-colors"
            >No ES ({filteredGroups.filter(g => !g.description_es).length})</button>
            <button
              onClick={() => { const ids = filteredGroups.filter(g => (g.memberCount || 0) >= 1000).map(g => g._id); setSelectedIds(new Set(ids)); }}
              className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-colors"
            >1K+ ({filteredGroups.filter(g => (g.memberCount || 0) >= 1000).length})</button>
          </div>

          {/* AI Bulk Actions — always visible */}
          <div className="mb-3 p-3 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold text-amber-400">AI Actions</span>
              {selectedIds.size > 0 ? (
                <>
                  <span className="text-sm font-bold text-white">{selectedIds.size} selected</span>
                  <button onClick={() => setSelectedIds(new Set())} className="text-xs text-[#666] hover:text-white transition-colors">Clear</button>
                </>
              ) : (
                <span className="text-xs text-[#666]">Select groups below to use AI actions</span>
              )}
            </div>
            <AiBulkActions
              selectedIds={selectedIds}
              groups={groups}
              compact
              onGroupsUpdated={(updates) => {
                setGroups(prev => prev.map(g => {
                  const u = updates.find(u => u._id === g._id);
                  return u ? { ...g, ...u.changes } : g;
                }));
              }}
            />
          </div>

          {/* Pagination controls */}
          {(() => {
            const pageGroups = filteredGroups.slice(page * perPage, (page + 1) * perPage);
            const allPageSelected = pageGroups.length > 0 && pageGroups.every(g => selectedIds.has(g._id));
            const totalPages = Math.max(1, Math.ceil(filteredGroups.length / perPage));
            return (
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <input
                  type="checkbox"
                  checked={allPageSelected}
                  onChange={() => {
                    setSelectedIds(prev => {
                      const next = new Set(prev);
                      if (allPageSelected) pageGroups.forEach(g => next.delete(g._id));
                      else pageGroups.forEach(g => next.add(g._id));
                      return next;
                    });
                  }}
                  className="accent-amber-500"
                  title="Toggle page selection"
                />
                <span className="text-xs text-[#666]">Show:</span>
                {[50, 100].map(n => (
                  <button key={n} onClick={() => { setPerPage(n); setPage(0); }}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${perPage === n ? 'bg-amber-500/20 text-amber-400' : 'bg-white/5 text-[#666] hover:text-white'}`}
                  >{n}</button>
                ))}
                <button onClick={() => { setPerPage(999999); setPage(0); }}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${perPage >= 999999 ? 'bg-amber-500/20 text-amber-400' : 'bg-white/5 text-[#666] hover:text-white'}`}
                >All</button>
                {selectedIds.size > 0 && (
                  <span className="text-xs font-bold text-amber-400 ml-1">{selectedIds.size} selected</span>
                )}
                <span className="text-xs text-[#666] ml-auto">
                  {filteredGroups.length > 0 ? Math.min(page * perPage + 1, filteredGroups.length) : 0}–{Math.min((page + 1) * perPage, filteredGroups.length)} of {filteredGroups.length}{filterCat !== 'All' ? ` in "${filterCat}"` : ''}
                </span>
                {perPage < filteredGroups.length && (
                  <div className="flex items-center gap-1">
                    <button onClick={() => setPage(0)} disabled={page === 0} className="px-2 py-1 rounded text-[10px] font-bold bg-white/5 text-[#666] disabled:opacity-30 hover:text-white">«</button>
                    <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="px-2 py-1 rounded text-[10px] font-bold bg-white/5 text-[#666] disabled:opacity-30 hover:text-white">‹</button>
                    <span className="text-xs text-white font-bold px-2">{page + 1}/{totalPages}</span>
                    <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={(page + 1) * perPage >= filteredGroups.length} className="px-2 py-1 rounded text-[10px] font-bold bg-white/5 text-[#666] disabled:opacity-30 hover:text-white">›</button>
                    <button onClick={() => setPage(totalPages - 1)} disabled={(page + 1) * perPage >= filteredGroups.length} className="px-2 py-1 rounded text-[10px] font-bold bg-white/5 text-[#666] disabled:opacity-30 hover:text-white">»</button>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Groups table */}
          {loading ? (
            <div className="text-center py-12 text-white/40">Loading vault groups...</div>
          ) : filteredGroups.length === 0 ? (
            <div className="text-center py-12 text-white/30">No groups in "{filterCat}"</div>
          ) : (
            <div className="space-y-1">
              {filteredGroups.slice(page * perPage, (page + 1) * perPage).map((g, visIdx) => {
                const globalIdx = page * perPage + visIdx;
                const isMissingImg = !g.image || g.image === '/assets/image.jpg' || g.image === '/assets/placeholder-no-image.png';
                const descSnippet = g.description ? (g.description.length > 80 ? g.description.slice(0, 80) + '…' : g.description) : '';
                return (
                  <div key={g._id} className="flex items-start gap-3 px-3 py-2.5 rounded-lg bg-[#111] border border-white/5 hover:border-white/10 transition-all">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(g._id)}
                      onChange={(e) => {
                        const shiftKey = (e.nativeEvent as MouseEvent).shiftKey;
                        setSelectedIds(prev => {
                          const next = new Set(prev);
                          if (shiftKey && lastCheckedRef.current !== null) {
                            const start = Math.min(lastCheckedRef.current, globalIdx);
                            const end = Math.max(lastCheckedRef.current, globalIdx);
                            for (let k = start; k <= end; k++) {
                              if (filteredGroups[k]) next.add(filteredGroups[k]._id);
                            }
                          } else {
                            if (next.has(g._id)) next.delete(g._id);
                            else next.add(g._id);
                          }
                          return next;
                        });
                        lastCheckedRef.current = globalIdx;
                      }}
                      className="accent-amber-500 shrink-0 mt-1"
                    />
                    <div className="relative shrink-0">
                      <img src={g.image || '/assets/placeholder-no-image.png'} alt="" className={`w-10 h-10 rounded-lg object-cover ${isMissingImg ? 'opacity-40' : ''}`} />
                      {isMissingImg && <div className="absolute inset-0 flex items-center justify-center"><span className="text-[8px] text-red-400 font-bold">No img</span></div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-white text-sm font-semibold truncate">{g.name}</span>
                        {g.status === 'pending' && <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 shrink-0">Pending</span>}
                        <a href={`/${g.slug}`} target="_blank" rel="noopener noreferrer" className="text-blue-400/60 hover:text-blue-400 transition-colors shrink-0" title="View on site">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                        </a>
                        {g.telegramLink && (
                          <a href={g.telegramLink} target="_blank" rel="noopener noreferrer" className="text-sky-400/60 hover:text-sky-400 transition-colors shrink-0" title="Open in Telegram">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.5 1.201-.82 1.23-.697.064-1.226-.461-1.901-.903-1.056-.692-1.653-1.123-2.678-1.799-1.185-.781-.417-1.21.258-1.911.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.492-1.302.484-.429-.008-1.252-.242-1.865-.44-.751-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635.099-.002.321.023.465.141.12.098.153.229.169.339.016.11.036.317.02.489z"/></svg>
                          </a>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                        {(g.categories?.length ? g.categories : [g.category]).filter(Boolean).map((cat, i) => (
                          <span
                            key={i}
                            className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 cursor-pointer hover:bg-red-500/20 hover:text-red-400 transition-colors group/cat"
                            style={{ opacity: i === 0 ? 1 : 0.6 }}
                            title={`Click to remove "${cat}"`}
                            onClick={() => {
                              const current = (g.categories?.length ? g.categories : [g.category]).filter(Boolean);
                              const updated = current.filter(c => c !== cat);
                              saveInlineCats(g._id, updated);
                            }}
                          >{cat} <span className="opacity-0 group-hover/cat:opacity-100 ml-0.5">✕</span></span>
                        ))}
                        {((g.categories?.length || 0) < 3) && (
                          inlineCatEdit === g._id ? (
                            <select
                              autoFocus
                              className="text-[9px] font-bold rounded bg-[#111] border border-amber-500/30 text-amber-400 outline-none px-1 py-0.5"
                              value=""
                              onChange={e => {
                                if (!e.target.value) return;
                                const current = (g.categories?.length ? g.categories : [g.category]).filter(Boolean);
                                if (!current.includes(e.target.value)) {
                                  saveInlineCats(g._id, [...current, e.target.value]);
                                }
                                setInlineCatEdit(null);
                              }}
                              onBlur={() => setInlineCatEdit(null)}
                            >
                              <option value="">+ Add...</option>
                              {ALL_CATEGORIES.filter(c => !(g.categories?.length ? g.categories : [g.category]).includes(c)).map(c => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                          ) : (
                            <button
                              onClick={() => setInlineCatEdit(g._id)}
                              className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-white/5 text-white/30 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                              title="Add category"
                            >+</button>
                          )
                        )}
                        {g.country && <span className="text-[10px] text-white/30 ml-1">{g.country}</span>}
                        <span className={`text-[10px] font-medium ${(g.memberCount || 0) === 0 ? 'text-red-400/60' : (g.memberCount || 0) < 50 ? 'text-red-400' : (g.memberCount || 0) < 500 ? 'text-yellow-400' : 'text-white/30'}`}>{(g.memberCount || 0) > 0 ? `${g.memberCount.toLocaleString()} members` : '0 members'}</span>
                        {g.createdAt && <span className="text-[9px] text-white/20">{new Date(g.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
                        {g.description_de && <span className="text-[8px] font-bold px-1 py-0.5 rounded bg-green-500/10 text-green-400">DE</span>}
                        {g.description_es && <span className="text-[8px] font-bold px-1 py-0.5 rounded bg-orange-500/10 text-orange-400">ES</span>}
                      </div>
                      {descSnippet && (
                        <p className="text-[11px] text-white/25 mt-1 leading-tight truncate">{descSnippet}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => fetchPhotoFromTelegram(g._id, true)}
                        disabled={fetchingPhoto === g._id}
                        className="px-2 py-1.5 rounded-lg text-[10px] font-bold bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-all disabled:opacity-50"
                        title="Fetch photo from Telegram"
                      >
                        {fetchingPhoto === g._id ? '...' : '📷'}
                      </button>
                      <button
                        onClick={() => toggleTeaser(g)}
                        className={`px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                          g.showOnVaultTeaser
                            ? 'bg-amber-500 text-black hover:bg-amber-400'
                            : 'bg-white/5 text-white/60 hover:bg-white/10'
                        }`}
                        title={g.showOnVaultTeaser ? 'On Teaser' : 'Add to Teaser'}
                      >
                        {g.showOnVaultTeaser ? '★' : '☆'}
                      </button>
                      {g.status === 'pending' && (
                        <button
                          onClick={() => approveGroup(g)}
                          className="px-2 py-1.5 rounded-lg text-[10px] font-bold bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-all"
                          title="Approve"
                        >✓</button>
                      )}
                      <button
                        onClick={() => setEditGroup({ ...g, vaultCategories: g.vaultCategories || [] })}
                        className="px-2 py-1.5 rounded-lg text-[10px] font-bold bg-white/5 text-white/60 hover:bg-white/10 transition-all"
                        title="Edit"
                      >✎</button>
                      <button
                        onClick={() => deleteFromVault(g)}
                        className="px-2 py-1.5 rounded-lg text-[10px] font-bold bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
                        title="Remove from vault"
                      >✕</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {tab === 'categories' && (
        <div>
          <p className="text-sm text-white/40 mb-4">Drag to reorder category sections. Toggle visibility to show/hide on the teaser block. These appear as blurred section labels on the frontend.</p>
          <div className="space-y-1.5">
            {[...catConfig].sort((a, b) => a.order - b.order).map((cat, idx) => (
              <div
                key={cat.name}
                draggable
                onDragStart={() => { catDragItem.current = idx; }}
                onDragEnter={() => { catDragOver.current = idx; }}
                onDragEnd={handleCatDragEnd}
                onDragOver={e => e.preventDefault()}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-grab active:cursor-grabbing transition-all ${
                  cat.visible ? 'bg-[#111] border-amber-500/20' : 'bg-[#0a0a0a] border-white/5 opacity-50'
                }`}
              >
                <span className="text-white/30 cursor-grab text-lg">&#9776;</span>
                <span className="text-xs font-mono text-white/20 w-5">{idx + 1}</span>
                <span className="text-white font-bold text-sm flex-1">{cat.name}</span>
                <span className="text-[10px] text-white/30">{groups.filter(g => {
                  const cats = g.categories?.length ? g.categories : (g.category ? [g.category] : []);
                  return cats.includes(cat.name);
                }).length} groups</span>
                <button
                  onClick={() => toggleCatVisible(cat.name)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    cat.visible ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-white/30'
                  }`}
                >
                  {cat.visible ? 'Visible' : 'Hidden'}
                </button>
              </div>
            ))}
          </div>

          {/* Add missing categories */}
          {(() => {
            const configured = new Set(catConfig.map(c => c.name));
            const catNames = allCategories.map(([c]) => c);
            const missing = catNames.filter(c => !configured.has(c));
            if (missing.length === 0) return null;
            return (
              <div className="mt-4 p-3 rounded-lg border border-dashed border-white/10">
                <p className="text-xs text-white/30 mb-2">Unconfigured categories (click to add):</p>
                <div className="flex gap-1.5 flex-wrap">
                  {missing.map(name => (
                    <button
                      key={name}
                      onClick={() => saveCatConfig([...catConfig, { name, visible: true, order: catConfig.length }])}
                      className="px-3 py-1 rounded-lg text-xs font-bold bg-white/5 text-white/60 hover:bg-white/10 transition-all"
                    >+ {name}</button>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Edit modal */}
      {editGroup && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setEditGroup(null)}>
          <div className="bg-[#111] border border-white/10 rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-4">Edit Vault Group</h3>

            {/* Image with upload */}
            <div className="flex items-center gap-3 mb-4">
              <div className="relative group/img shrink-0">
                <img src={editGroup.image || '/assets/placeholder-no-image.png'} alt="" className="w-16 h-16 rounded-xl object-cover" />
                <label className="absolute inset-0 bg-black/60 rounded-xl flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity cursor-pointer">
                  {uploading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span className="text-white text-[10px] font-bold">Upload</span>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }} />
                </label>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white font-bold truncate">{editGroup.name}</div>
                <div className="text-white/30 text-xs">{editGroup.slug}</div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-white/50 font-semibold mb-1 block">Name</label>
                <input className={inputCls} value={editGroup.name} onChange={e => setEditGroup({ ...editGroup, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/50 font-semibold mb-1 block">Primary Category</label>
                  <input className={inputCls} value={editGroup.category} onChange={e => setEditGroup({ ...editGroup, category: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-white/50 font-semibold mb-1 block">Country</label>
                  <input className={inputCls} value={editGroup.country} onChange={e => setEditGroup({ ...editGroup, country: e.target.value })} />
                </div>
              </div>

              {/* Group Categories (AI-assigned, up to 3) */}
              <div>
                <label className="text-xs text-white/50 font-semibold mb-1 block">Categories (up to 3)</label>
                <div className="flex gap-1.5 flex-wrap mb-2">
                  {(editGroup.categories || []).map(cat => (
                    <span key={cat} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold bg-purple-500/20 text-purple-400">
                      {cat}
                      <button onClick={() => setEditGroup({ ...editGroup, categories: (editGroup.categories || []).filter(c => c !== cat) })} className="text-purple-400/60 hover:text-red-400 ml-0.5">&times;</button>
                    </span>
                  ))}
                  {(editGroup.categories || []).length === 0 && (
                    <span className="text-xs text-white/20">No categories assigned</span>
                  )}
                </div>
                {(editGroup.categories || []).length < 3 && (
                  <div className="flex gap-1 flex-wrap">
                    {allCategories.map(([c]) => c).filter(c => !(editGroup.categories || []).includes(c)).slice(0, 20).map(c => (
                      <button
                        key={c}
                        onClick={() => setEditGroup({ ...editGroup, categories: [...(editGroup.categories || []), c].slice(0, 3) })}
                        className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/5 text-white/40 hover:bg-purple-500/20 hover:text-purple-400 transition-all"
                      >+ {c}</button>
                    ))}
                  </div>
                )}
              </div>

              {/* Vault Categories (multi, up to 4) */}
              <div>
                <label className="text-xs text-white/50 font-semibold mb-1 block">Vault Categories (up to 4 — appears in these sections on the teaser)</label>
                <div className="flex gap-1.5 flex-wrap mb-2">
                  {(editGroup.vaultCategories || []).map(cat => (
                    <span key={cat} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-400">
                      {cat}
                      <button onClick={() => removeVaultCategory(cat)} className="text-amber-400/60 hover:text-red-400 ml-0.5">&times;</button>
                    </span>
                  ))}
                  {(editGroup.vaultCategories || []).length === 0 && (
                    <span className="text-xs text-white/20">Falls back to primary category: {editGroup.category}</span>
                  )}
                </div>
                {(editGroup.vaultCategories || []).length < 4 && (
                  <div className="flex gap-1.5">
                    <input
                      className={inputCls + ' flex-1'}
                      placeholder="Add category..."
                      value={newCat}
                      onChange={e => setNewCat(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addVaultCategory(); } }}
                    />
                    <button onClick={addVaultCategory} className="px-3 py-2 rounded-lg text-xs font-bold bg-amber-500 text-black hover:bg-amber-400 transition-all">Add</button>
                  </div>
                )}
                {/* Quick-add from existing categories */}
                <div className="flex gap-1 flex-wrap mt-2">
                  {allCategories.map(([c]) => c).filter(c => !(editGroup.vaultCategories || []).includes(c) && (editGroup.vaultCategories || []).length < 4).map(c => (
                    <button
                      key={c}
                      onClick={() => setEditGroup({ ...editGroup, vaultCategories: [...(editGroup.vaultCategories || []), c] })}
                      className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/5 text-white/40 hover:bg-white/10 transition-all"
                    >+ {c}</button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-white/50 font-semibold mb-1 block">Description</label>
                <textarea className={inputCls + ' h-20 resize-none'} value={editGroup.description} onChange={e => setEditGroup({ ...editGroup, description: e.target.value })} />
              </div>
              <div className="flex items-center gap-3">
                <label className="text-xs text-white/50 font-semibold">Show on Teaser</label>
                <button
                  onClick={() => setEditGroup({ ...editGroup, showOnVaultTeaser: !editGroup.showOnVaultTeaser })}
                  className={`w-10 h-5 rounded-full transition-all relative ${editGroup.showOnVaultTeaser ? 'bg-amber-500' : 'bg-white/10'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all`}
                    style={{ left: editGroup.showOnVaultTeaser ? '22px' : '2px' }} />
                </button>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button onClick={() => setEditGroup(null)} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-bold bg-white/5 text-white/60 hover:bg-white/10 transition-all">Cancel</button>
              <button onClick={saveEdit} disabled={saving} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-bold bg-amber-500 text-black hover:bg-amber-400 transition-all disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
