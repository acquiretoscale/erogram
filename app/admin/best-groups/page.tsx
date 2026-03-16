'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { visibleCategories } from '@/app/groups/constants';

interface PickedGroup {
  _id: string;
  position: number;
  targetType: string;
  targetValue: string;
  group: {
    _id: string;
    name: string;
    slug: string;
    category: string;
    country: string;
    image: string;
    views: number;
    memberCount: number;
    verified: boolean;
    premiumOnly?: boolean;
    description: string;
  };
}

interface SearchGroup {
  _id: string;
  name: string;
  slug: string;
  category: string;
  country: string;
  image: string;
  views: number;
  memberCount: number;
  status: string;
  premiumOnly?: boolean;
  verified?: boolean;
}

const POSITIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
const filteredCategories = visibleCategories.filter(c => c !== 'All').sort();

export default function BestGroupsAdminPage() {
  const [selectedCategory, setSelectedCategory] = useState(filteredCategories[0] || '');
  const [picks, setPicks] = useState<PickedGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [browseCategory, setBrowseCategory] = useState('');
  const [browseResults, setBrowseResults] = useState<SearchGroup[]>([]);
  const [browsing, setBrowsing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const authHeader = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const fetchPicks = useCallback(async (cat: string) => {
    if (!cat) return;
    setIsLoading(true);
    try {
      const res = await axios.get('/api/admin/best-picks', {
        headers: authHeader,
        params: { targetType: 'category', targetValue: cat },
      });
      setPicks(res.data);
    } catch {
      setPicks([]);
    } finally {
      setIsLoading(false);
    }
  }, [authHeader]);

  useEffect(() => {
    fetchPicks(selectedCategory);
  }, [selectedCategory, fetchPicks]);

  const pickedGroupIds = useMemo(() => new Set(picks.map(p => p.group._id)), [picks]);

  const emptyPositions = useMemo(
    () => POSITIONS.filter(pos => !picks.find(p => p.position === pos)),
    [picks]
  );

  const fetchBrowseResults = useCallback(async (cat: string, q: string) => {
    if (!cat && q.length < 2) {
      setBrowseResults([]);
      return;
    }
    setBrowsing(true);
    try {
      const params: any = { status: 'approved', limit: '100' };
      if (cat) params.category = cat;
      if (q.length >= 2) params.search = q;

      const res = await axios.get('/api/admin/groups', { headers: authHeader, params });
      const groups = (res.data as SearchGroup[]).filter(
        (g) => !pickedGroupIds.has(g._id)
      );
      setBrowseResults(groups);
    } catch {
      setBrowseResults([]);
    } finally {
      setBrowsing(false);
    }
  }, [authHeader, pickedGroupIds]);

  useEffect(() => {
    if (!modalOpen) return;
    const timer = setTimeout(() => fetchBrowseResults(browseCategory, searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery, browseCategory, modalOpen, fetchBrowseResults]);

  const openModal = () => {
    setSearchQuery('');
    setBrowseCategory(selectedCategory);
    setBrowseResults([]);
    setSelectedIds(new Set());
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSearchQuery('');
    setBrowseResults([]);
    setSelectedIds(new Set());
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size >= emptyPositions.length) return prev;
        next.add(id);
      }
      return next;
    });
  };

  const handleBulkAdd = async () => {
    if (selectedIds.size === 0) return;
    setSaving(true);
    try {
      const ids = Array.from(selectedIds);
      const slots = [...emptyPositions];
      const promises = ids.map((groupId, i) => {
        if (i >= slots.length) return null;
        return axios.post(
          '/api/admin/best-picks',
          {
            targetType: 'category',
            targetValue: selectedCategory,
            groupId,
            position: slots[i],
          },
          { headers: authHeader }
        );
      }).filter(Boolean);
      await Promise.all(promises);
      closeModal();
      await fetchPicks(selectedCategory);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to add picks');
    } finally {
      setSaving(false);
    }
  };

  const handleRemovePick = async (pickId: string) => {
    if (!confirm('Remove this group from best picks?')) return;
    try {
      await axios.delete(`/api/admin/best-picks?id=${pickId}`, { headers: authHeader });
      await fetchPicks(selectedCategory);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to remove');
    }
  };

  const getPickForPosition = (pos: number) => picks.find(p => p.position === pos);
  const filledCount = picks.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-white mb-1">Best Groups Curation</h1>
          <p className="text-[#999] text-sm">
            Pick up to 10 groups per category. The remaining 5 spots are auto-filled by most-viewed.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="glass rounded-xl border border-white/5 px-4 py-2">
            <span className="text-2xl font-black text-white">{filledCount}</span>
            <span className="text-xs text-[#666] ml-1">/ 10 slots</span>
          </div>
          {emptyPositions.length > 0 && (
            <button
              onClick={openModal}
              className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-colors flex items-center gap-2 text-sm shadow-lg shadow-red-600/20"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              Add Groups
            </button>
          )}
        </div>
      </div>

      {/* Category Selector */}
      <div className="glass rounded-2xl border border-white/5 p-4">
        <label className="block text-xs font-bold text-[#666] uppercase mb-3 tracking-wider">Select Category</label>
        <div className="flex flex-wrap gap-2">
          {filteredCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                selectedCategory === cat
                  ? 'bg-red-600 text-white border-red-500'
                  : 'bg-white/5 text-[#999] border-white/5 hover:border-white/10 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Slots Grid */}
      <div className="glass rounded-2xl border border-white/5 overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">
            Curated Picks for <span className="text-red-500">{selectedCategory}</span>
          </h2>
          {emptyPositions.length > 0 && (
            <button
              onClick={openModal}
              className="text-xs text-red-400 hover:text-red-300 font-bold transition-colors"
            >
              + Fill empty slots
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="p-12 text-center">
            <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-[#999] text-sm">Loading picks...</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {POSITIONS.map((pos) => {
              const pick = getPickForPosition(pos);
              return (
                <div
                  key={pos}
                  className={`px-6 py-3 flex items-center gap-4 transition-colors ${
                    pick ? 'hover:bg-white/[0.02]' : 'hover:bg-white/[0.03] cursor-pointer'
                  }`}
                  onClick={() => {
                    if (!pick) openModal();
                  }}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm flex-shrink-0 ${
                    pick ? 'bg-red-600 text-white' : 'bg-white/5 text-[#444] border border-dashed border-white/10'
                  }`}>
                    {pos}
                  </div>

                  {pick ? (
                    <>
                      <div className="w-10 h-10 rounded-lg bg-[#1a1a1a] overflow-hidden flex-shrink-0 border border-white/5">
                        <img
                          src={pick.group.image || '/assets/placeholder-no-image.png'}
                          alt={pick.group.name}
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).src = '/assets/placeholder-no-image.png'; }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-white text-sm flex items-center gap-2">
                          <span className="truncate">{pick.group.name}</span>
                          {pick.group.premiumOnly && (
                            <span className="flex-shrink-0 text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-black uppercase tracking-wide border border-amber-500/20">Vault</span>
                          )}
                          {pick.group.verified && (
                            <svg className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81C14.67.63 13.43-.25 12-.25S9.33.63 8.66 1.94c-1.39-.46-2.9-.2-3.91.81s-1.27 2.52-.81 3.91C2.63 7.33 1.75 8.57 1.75 12c0 1.43.88 2.67 2.19 3.34-.46 1.39-.2 2.9.81 3.91s2.52 1.27 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.67-.88 3.34-2.19c1.39.46 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z" /></svg>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs text-[#666]">{pick.group.category}</span>
                          <span className="text-xs text-[#555]">{pick.group.country}</span>
                          <span className="text-xs text-[#555]">{(pick.group.views || 0).toLocaleString()} views</span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRemovePick(pick._id); }}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-colors flex items-center gap-1.5"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        Remove
                      </button>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center gap-3 text-[#444]">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-[#333]"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                      <span className="text-xs font-medium">Empty — click to add groups</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* How it works */}
      <div className="glass rounded-2xl border border-white/5 p-6">
        <h3 className="text-sm font-bold text-white mb-3">How Best Groups Curation works</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-[#888]">
          <div className="flex gap-3">
            <span className="text-red-400 text-lg mt-0.5">🎯</span>
            <div>
              <div className="text-white font-medium mb-1">Curated Slots (1-10)</div>
              Pick up to 10 groups per category. These appear first on the Best page, in your chosen order.
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-blue-400 text-lg mt-0.5">📊</span>
            <div>
              <div className="text-white font-medium mb-1">Auto-Filled (5 more)</div>
              After your picks, 5 more groups auto-fill by highest views. Total: up to 15 groups.
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-green-400 text-lg mt-0.5">🔗</span>
            <div>
              <div className="text-white font-medium mb-1">SEO Safe</div>
              URLs and page structure stay the same. No broken links or indexing issues.
            </div>
          </div>
        </div>
      </div>

      {/* Add Groups Modal — always multi-select */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={closeModal}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-white/10 flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold text-white">Add Groups to {selectedCategory}</h2>
                  <p className="text-xs text-[#666] mt-0.5">
                    Select up to {emptyPositions.length} group{emptyPositions.length !== 1 ? 's' : ''} — they&apos;ll fill slots {emptyPositions.join(', ')}
                  </p>
                </div>
                <button onClick={closeModal} className="text-[#666] hover:text-white transition-colors text-lg">✕</button>
              </div>

              {/* Category filter pills */}
              <div className="px-5 pt-4 pb-2">
                <div className="flex flex-wrap gap-1.5 mb-3 max-h-[72px] overflow-y-auto custom-scrollbar">
                  <button
                    onClick={() => setBrowseCategory('')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all border ${
                      browseCategory === ''
                        ? 'bg-white/10 text-white border-white/20'
                        : 'bg-white/[0.03] text-[#666] border-white/5 hover:text-white'
                    }`}
                  >
                    All Categories
                  </button>
                  {filteredCategories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setBrowseCategory(cat)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all border ${
                        browseCategory === cat
                          ? 'bg-red-600/80 text-white border-red-500/50'
                          : 'bg-white/[0.03] text-[#666] border-white/5 hover:text-white'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name..."
                    autoFocus
                    className="w-full pl-10 pr-4 py-2.5 bg-[#1a1a1a] border border-white/10 rounded-xl text-white placeholder:text-[#555] focus:ring-2 focus:ring-red-500/50 outline-none text-sm"
                  />
                </div>
              </div>

              {/* Results list — always checkboxes */}
              <div className="flex-1 overflow-y-auto px-2 pb-2 custom-scrollbar">
                {browsing && (
                  <div className="p-8 text-center text-[#666] text-sm">Loading groups...</div>
                )}
                {!browsing && !browseCategory && searchQuery.length < 2 && (
                  <div className="p-8 text-center text-[#666] text-sm">Pick a category above or type to search</div>
                )}
                {!browsing && (browseCategory || searchQuery.length >= 2) && browseResults.length === 0 && (
                  <div className="p-8 text-center text-[#666] text-sm">No approved groups found</div>
                )}
                {browseResults.map((group) => {
                  const isSelected = selectedIds.has(group._id);
                  const maxReached = selectedIds.size >= emptyPositions.length;
                  const isDisabled = !isSelected && maxReached;
                  return (
                    <button
                      key={group._id}
                      onClick={() => { if (!isDisabled) toggleSelect(group._id); }}
                      disabled={isDisabled}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left ${
                        isSelected
                          ? 'bg-red-600/10 border border-red-500/20'
                          : isDisabled
                            ? 'opacity-30 cursor-not-allowed border border-transparent'
                            : 'hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        isSelected ? 'bg-red-600 border-red-500' : 'border-white/20 bg-transparent'
                      }`}>
                        {isSelected && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                        )}
                      </div>

                      <div className="w-9 h-9 rounded-lg bg-[#1a1a1a] overflow-hidden flex-shrink-0 border border-white/5">
                        <img
                          src={group.image || '/assets/placeholder-no-image.png'}
                          alt={group.name}
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).src = '/assets/placeholder-no-image.png'; }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-white text-sm flex items-center gap-1.5">
                          <span className="truncate">{group.name}</span>
                          {group.premiumOnly && (
                            <span className="flex-shrink-0 text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-black uppercase tracking-wide border border-amber-500/20">Vault</span>
                          )}
                          {group.verified && (
                            <svg className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81C14.67.63 13.43-.25 12-.25S9.33.63 8.66 1.94c-1.39-.46-2.9-.2-3.91.81s-1.27 2.52-.81 3.91C2.63 7.33 1.75 8.57 1.75 12c0 1.43.88 2.67 2.19 3.34-.46 1.39-.2 2.9.81 3.91s2.52 1.27 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.67-.88 3.34-2.19c1.39.46 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z" /></svg>
                          )}
                        </div>
                        <div className="text-[11px] text-[#666]">
                          {group.category} · {group.country} · {(group.views || 0).toLocaleString()} views
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Footer — confirm button */}
              <div className="p-4 border-t border-white/10 flex justify-between items-center bg-[#0a0a0a] rounded-b-2xl">
                <span className="text-sm text-[#999]">
                  {selectedIds.size > 0
                    ? <><span className="text-white font-bold">{selectedIds.size}</span> group{selectedIds.size > 1 ? 's' : ''} selected</>
                    : 'Select groups with checkboxes, then confirm'}
                </span>
                <div className="flex gap-3">
                  <button
                    onClick={closeModal}
                    className="px-4 py-2 rounded-xl text-sm font-bold text-[#999] hover:text-white hover:bg-white/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBulkAdd}
                    disabled={selectedIds.size === 0 || saving}
                    className="px-5 py-2 rounded-xl text-sm font-bold bg-red-600 text-white hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20 disabled:opacity-40 flex items-center gap-2"
                  >
                    {saving ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                    )}
                    Add {selectedIds.size > 0 ? `${selectedIds.size} ` : ''}Group{selectedIds.size !== 1 ? 's' : ''}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
