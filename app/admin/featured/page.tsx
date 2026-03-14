'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

interface FeaturedGroup {
  _id: string;
  name: string;
  slug: string;
  category: string;
  country: string;
  image: string;
  telegramLink: string;
  views: number;
  weeklyClicks: number;
  clickCount: number;
  memberCount: number;
  verified: boolean;
  featured: boolean;
  featuredOrder: number;
  featuredAt: string;
  boosted: boolean;
  boostExpiresAt: string | null;
  boostDuration: string | null;
  paidBoost: boolean;
  paidBoostStars: number | null;
  status: string;
}

interface SearchGroup {
  _id: string;
  name: string;
  slug: string;
  category: string;
  country: string;
  image: string;
  status: string;
}

const BOOST_DURATIONS = [
  { value: '1d', label: '1 Day' },
  { value: '7d', label: '7 Days' },
  { value: '14d', label: '14 Days' },
  { value: '30d', label: '1 Month' },
];

export default function FeaturedPage() {
  const [featured, setFeatured] = useState<FeaturedGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchGroup[]>([]);
  const [searching, setSearching] = useState(false);

  const [boostModal, setBoostModal] = useState<FeaturedGroup | null>(null);
  const [boostDuration, setBoostDuration] = useState('7d');
  const [saving, setSaving] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const authHeader = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const fetchFeatured = async () => {
    try {
      const res = await axios.get('/api/admin/featured', { headers: authHeader });
      setFeatured(res.data);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load featured groups');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFeatured();
  }, []);

  const searchGroups = async (q: string) => {
    if (!q || q.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await axios.get('/api/admin/groups', { headers: authHeader });
      const allGroups = res.data as SearchGroup[];
      const featuredIds = new Set(featured.map(f => f._id));
      const filtered = allGroups.filter(
        (g: SearchGroup) =>
          g.status === 'approved' &&
          !featuredIds.has(g._id) &&
          (g.name.toLowerCase().includes(q.toLowerCase()) ||
            g.category.toLowerCase().includes(q.toLowerCase()) ||
            (g.slug || '').toLowerCase().includes(q.toLowerCase()))
      );
      setSearchResults(filtered.slice(0, 20));
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => searchGroups(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleAddFeatured = async (groupId: string) => {
    setSaving(true);
    try {
      await axios.put(
        '/api/admin/featured',
        { groupId, featured: true, featuredOrder: featured.length },
        { headers: authHeader }
      );
      setShowAddModal(false);
      setSearchQuery('');
      setSearchResults([]);
      await fetchFeatured();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to add featured group');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveFeatured = async (groupId: string) => {
    if (!confirm('Remove this group from featured?')) return;
    try {
      await axios.delete(`/api/admin/featured/${groupId}`, { headers: authHeader });
      await fetchFeatured();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to remove');
    }
  };

  const handleToggleBoost = async (group: FeaturedGroup) => {
    if (group.boosted) {
      setSaving(true);
      try {
        await axios.put(
          '/api/admin/featured',
          { groupId: group._id, boosted: false },
          { headers: authHeader }
        );
        await fetchFeatured();
      } catch (err: any) {
        alert(err.response?.data?.message || 'Failed to remove boost');
      } finally {
        setSaving(false);
      }
    } else {
      setBoostModal(group);
      setBoostDuration('7d');
    }
  };

  const handleConfirmBoost = async () => {
    if (!boostModal) return;
    setSaving(true);
    try {
      await axios.put(
        '/api/admin/featured',
        { groupId: boostModal._id, boosted: true, boostDuration },
        { headers: authHeader }
      );
      setBoostModal(null);
      await fetchFeatured();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to boost');
    } finally {
      setSaving(false);
    }
  };

  const handleReorder = async (groupId: string, direction: 'up' | 'down') => {
    const idx = featured.findIndex(f => f._id === groupId);
    if (idx === -1) return;
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === featured.length - 1) return;

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;

    try {
      await Promise.all([
        axios.put(
          '/api/admin/featured',
          { groupId: featured[idx]._id, featuredOrder: swapIdx },
          { headers: authHeader }
        ),
        axios.put(
          '/api/admin/featured',
          { groupId: featured[swapIdx]._id, featuredOrder: idx },
          { headers: authHeader }
        ),
      ]);
      await fetchFeatured();
    } catch {
      alert('Failed to reorder');
    }
  };

  const formatTimeRemaining = (expiresAt: string | null) => {
    if (!expiresAt) return '';
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return 'Expired';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 0) return `${days}d ${hours}h left`;
    return `${hours}h left`;
  };

  const boostedCount = featured.filter(f => f.boosted).length;
  const paidCount = featured.filter(f => f.paidBoost).length;
  const totalStarsRevenue = featured.reduce((sum, f) => sum + (f.paidBoostStars || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-white mb-1">Featured Groups</h1>
          <p className="text-[#999] text-sm">
            Manage featured groups shown below Top Groups.
            {boostedCount > 0 && (
              <span className="ml-2 text-orange-400">{boostedCount} group{boostedCount > 1 ? 's' : ''} currently boosted to Top Groups</span>
            )}
            {paidCount > 0 && (
              <span className="ml-2 text-green-400">({paidCount} paid)</span>
            )}
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-colors flex items-center gap-2 text-sm shadow-lg shadow-purple-600/20"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Add Featured
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="glass rounded-xl border border-white/5 p-4">
          <div className="text-2xl font-black text-white">{featured.length}</div>
          <div className="text-xs text-[#666] font-medium">Featured Groups</div>
        </div>
        <div className="glass rounded-xl border border-white/5 p-4">
          <div className="text-2xl font-black text-orange-400">{boostedCount}</div>
          <div className="text-xs text-[#666] font-medium">Boosted to Top</div>
        </div>
        <div className="glass rounded-xl border border-white/5 p-4">
          <div className="text-2xl font-black text-yellow-400">{totalStarsRevenue.toLocaleString()}★</div>
          <div className="text-xs text-[#666] font-medium">Boost Revenue</div>
        </div>
        <div className="glass rounded-xl border border-white/5 p-4">
          <div className="text-2xl font-black text-green-400">{featured.reduce((sum, f) => sum + (f.weeklyClicks || 0), 0).toLocaleString()}</div>
          <div className="text-xs text-[#666] font-medium">Weekly Clicks</div>
        </div>
        <div className="glass rounded-xl border border-white/5 p-4">
          <div className="text-2xl font-black text-blue-400">{featured.reduce((sum, f) => sum + (f.views || 0), 0).toLocaleString()}</div>
          <div className="text-xs text-[#666] font-medium">Total Views</div>
        </div>
      </div>

      {/* Featured List */}
      <div className="glass rounded-2xl border border-white/5 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[#999]">Loading featured groups...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center text-red-400">{error}</div>
        ) : featured.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-5xl mb-4">⭐</div>
            <p className="text-[#999] text-lg mb-2">No featured groups yet</p>
            <p className="text-[#666] text-sm">Add groups to feature them below the Top Groups section</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {featured.map((group, idx) => (
              <div key={group._id} className="px-6 py-4 flex items-center gap-4 hover:bg-white/[0.02] transition-colors group/row">
                {/* Order controls */}
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => handleReorder(group._id, 'up')}
                    disabled={idx === 0}
                    className="p-1 text-[#555] hover:text-white disabled:opacity-20 transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="18 15 12 9 6 15" /></svg>
                  </button>
                  <span className="text-[10px] text-[#555] text-center font-bold">{idx + 1}</span>
                  <button
                    onClick={() => handleReorder(group._id, 'down')}
                    disabled={idx === featured.length - 1}
                    className="p-1 text-[#555] hover:text-white disabled:opacity-20 transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9" /></svg>
                  </button>
                </div>

                {/* Image */}
                <div className="w-12 h-12 rounded-xl bg-[#1a1a1a] overflow-hidden flex-shrink-0 border border-white/5">
                  <img
                    src={group.image || '/assets/placeholder-no-image.png'}
                    alt={group.name}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = '/assets/placeholder-no-image.png'; }}
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-white flex items-center gap-2 flex-wrap">
                    <span className="truncate">{group.name}</span>
                    {group.verified && (
                      <svg className="w-4 h-4 text-blue-500 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81C14.67.63 13.43-.25 12-.25S9.33.63 8.66 1.94c-1.39-.46-2.9-.2-3.91.81s-1.27 2.52-.81 3.91C2.63 7.33 1.75 8.57 1.75 12c0 1.43.88 2.67 2.19 3.34-.46 1.39-.2 2.9.81 3.91s2.52 1.27 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.67-.88 3.34-2.19c1.39.46 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z" /></svg>
                    )}
                    {group.boosted && (
                      <span className="text-[10px] bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded font-bold flex items-center gap-1">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
                        BOOSTED
                      </span>
                    )}
                    {group.paidBoost && (
                      <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded font-bold flex items-center gap-1">
                        ★ PAID {group.paidBoostStars ? `${group.paidBoostStars.toLocaleString()}★` : ''}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-[#666]">{group.category}</span>
                    <span className="text-xs text-[#555]">{group.country}</span>
                    {group.boosted && group.boostExpiresAt && (
                      <span className="text-[10px] text-orange-400/70">{formatTimeRemaining(group.boostExpiresAt)}</span>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="hidden md:flex items-center gap-6 text-sm">
                  <div className="text-center">
                    <div className="text-white font-bold tabular-nums">{(group.views || 0).toLocaleString()}</div>
                    <div className="text-[10px] text-[#555]">views</div>
                  </div>
                  <div className="text-center">
                    <div className="text-white font-bold tabular-nums">{(group.weeklyClicks || 0).toLocaleString()}</div>
                    <div className="text-[10px] text-[#555]">clicks/wk</div>
                  </div>
                  <div className="text-center">
                    <div className="text-white font-bold tabular-nums">{(group.memberCount || 0).toLocaleString()}</div>
                    <div className="text-[10px] text-[#555]">members</div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleBoost(group)}
                    disabled={saving}
                    className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      group.boosted
                        ? 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 border border-orange-500/20'
                        : 'bg-white/5 text-[#999] hover:bg-orange-500/10 hover:text-orange-400 border border-white/5 hover:border-orange-500/20'
                    }`}
                    title={group.boosted ? 'Remove boost' : 'Boost to Top Groups spot 1'}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill={group.boosted ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
                    {group.boosted ? 'Boosted' : 'Boost'}
                  </button>
                  <button
                    onClick={() => handleRemoveFeatured(group._id)}
                    className="px-3 py-2 rounded-lg text-xs font-bold bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-colors flex items-center gap-1.5"
                    title="Remove from featured"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* How it works */}
      <div className="glass rounded-2xl border border-white/5 p-6">
        <h3 className="text-sm font-bold text-white mb-3">How Featured & Boost works</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-[#888]">
          <div className="flex gap-3">
            <span className="text-purple-400 text-lg mt-0.5">⭐</span>
            <div>
              <div className="text-white font-medium mb-1">Featured</div>
              Groups appear in the &quot;Featured Groups&quot; section below Top Groups on the groups page. Reorder to control display priority.
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-orange-400 text-lg mt-0.5">⚡</span>
            <div>
              <div className="text-white font-medium mb-1">Boost</div>
              Boosted groups take Spot 1 in the Top Groups section for the boost duration. Top Groups stays organic otherwise.
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-green-400 text-lg mt-0.5">💰</span>
            <div>
              <div className="text-white font-medium mb-1">Paid Boosts (Live)</div>
              Users can pay via Telegram Stars when submitting groups: 1,000★ instant approval, 3,000★ instant + 1 week boost, 6,000★ instant + 1 month boost. Paid groups show a green &quot;PAID&quot; badge.
            </div>
          </div>
        </div>
      </div>

      {/* Add Featured Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl"
            >
              <div className="p-6 border-b border-white/10 flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">Add Featured Group</h2>
                <button onClick={() => { setShowAddModal(false); setSearchQuery(''); setSearchResults([]); }} className="text-[#666] hover:text-white transition-colors">
                  ✕
                </button>
              </div>

              <div className="p-4 border-b border-white/5">
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search approved groups by name..."
                    autoFocus
                    className="w-full pl-10 pr-4 py-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white placeholder:text-[#555] focus:ring-2 focus:ring-purple-500/50 outline-none text-sm"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                {searching && (
                  <div className="p-8 text-center text-[#666] text-sm">Searching...</div>
                )}
                {!searching && searchQuery.length >= 2 && searchResults.length === 0 && (
                  <div className="p-8 text-center text-[#666] text-sm">No matching approved groups found</div>
                )}
                {!searching && searchQuery.length < 2 && (
                  <div className="p-8 text-center text-[#666] text-sm">Type at least 2 characters to search</div>
                )}
                {searchResults.map((group) => (
                  <button
                    key={group._id}
                    onClick={() => handleAddFeatured(group._id)}
                    disabled={saving}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 transition-colors text-left disabled:opacity-50"
                  >
                    <div className="w-10 h-10 rounded-lg bg-[#1a1a1a] overflow-hidden flex-shrink-0 border border-white/5">
                      <img
                        src={group.image || '/assets/placeholder-no-image.png'}
                        alt={group.name}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).src = '/assets/placeholder-no-image.png'; }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white text-sm truncate">{group.name}</div>
                      <div className="text-xs text-[#666]">{group.category} · {group.country}</div>
                    </div>
                    <span className="text-purple-400 text-xs font-bold">+ Add</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Boost Duration Modal */}
      <AnimatePresence>
        {boostModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl"
            >
              <div className="p-6 border-b border-white/10">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-orange-400"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
                  Boost to Top Groups
                </h2>
                <p className="text-sm text-[#999] mt-1">
                  <span className="text-white font-medium">{boostModal.name}</span> will take Spot 1 in Top Groups for the selected duration.
                </p>
              </div>

              <div className="p-6">
                <label className="block text-xs font-bold text-[#666] uppercase mb-3">Boost Duration</label>
                <div className="grid grid-cols-2 gap-2">
                  {BOOST_DURATIONS.map(d => (
                    <button
                      key={d.value}
                      onClick={() => setBoostDuration(d.value)}
                      className={`px-4 py-3 rounded-xl text-sm font-bold transition-all border ${
                        boostDuration === d.value
                          ? 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                          : 'bg-white/5 text-[#999] border-white/5 hover:border-white/10'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-6 border-t border-white/10 flex justify-end gap-3 bg-[#0a0a0a] rounded-b-2xl">
                <button
                  onClick={() => setBoostModal(null)}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-[#999] hover:text-white hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmBoost}
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold bg-orange-500 text-white hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/20 disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
                  )}
                  Activate Boost
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
