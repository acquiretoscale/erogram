'use client';

import { useEffect, useState, useRef } from 'react';
import { OF_CATEGORIES } from '@/app/onlyfans-search/constants';

interface TrendingSlot {
  _id: string;
  name: string;
  username: string;
  avatar: string;
  url: string;
  bio: string;
  categories: string[];
  position: number;
  active: boolean;
  clicks: number;
  note: string;
  dealPrice: number;
  createdAt: string;
}

interface SearchResult {
  _id: string;
  name: string;
  username: string;
  slug: string;
  avatar: string;
  bio: string;
  categories: string[];
  url: string;
  clicks: number;
  likesCount: number;
  price: number;
  isFree: boolean;
}

const MAX_SLOTS = 12;
const SLOTS = Array.from({ length: MAX_SLOTS }, (_, i) => i + 1);

export default function TrendingAdminPage() {
  const [slots, setSlots] = useState<(TrendingSlot | null)[]>(Array(MAX_SLOTS).fill(null));
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  // Add flow
  const [addSlot, setAddSlot] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedCreator, setSelectedCreator] = useState<SearchResult | null>(null);
  const [dealPrice, setDealPrice] = useState('');
  const [note, setNote] = useState('');
  const [active, setActive] = useState(true);
  const [addCategories, setAddCategories] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Edit flow
  const [editSlot, setEditSlot] = useState<TrendingSlot | null>(null);
  const [editDealPrice, setEditDealPrice] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editActive, setEditActive] = useState(true);
  const [editCategories, setEditCategories] = useState<string[]>([]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const load = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/OFM/trending', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data: TrendingSlot[] = await res.json();
      const mapped: (TrendingSlot | null)[] = Array(MAX_SLOTS).fill(null);
      for (const s of data) {
        if (s.position >= 1 && s.position <= MAX_SLOTS) mapped[s.position - 1] = s;
      }
      setSlots(mapped);
    } catch {
      showToast('Failed to load slots');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Search creators as user types
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    searchTimeout.current = setTimeout(async () => {
      const token = localStorage.getItem('token');
      try {
        const res = await fetch(`/api/OFM/creators/search?q=${encodeURIComponent(q)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setSearchResults(data.creators || []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  }, [searchQuery]);

  const openAdd = (pos: number) => {
    setAddSlot(pos);
    setSearchQuery('');
    setSearchResults([]);
    setSelectedCreator(null);
    setDealPrice('');
    setNote('');
    setActive(true);
    setAddCategories([]);
    setEditSlot(null);
  };

  const openEdit = (slot: TrendingSlot) => {
    setEditSlot(slot);
    setEditDealPrice(String(slot.dealPrice || ''));
    setEditNote(slot.note || '');
    setEditActive(slot.active);
    setEditCategories(slot.categories || []);
    setAddSlot(null);
  };

  const selectCreator = (c: SearchResult) => {
    setSelectedCreator(c);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleAdd = async () => {
    if (!selectedCreator || !addSlot) return;
    setSaving(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/OFM/trending', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: selectedCreator.name,
          username: selectedCreator.username,
          avatar: selectedCreator.avatar,
          url: selectedCreator.url,
          bio: selectedCreator.bio,
          categories: addCategories,
          position: addSlot,
          dealPrice: parseFloat(dealPrice) || 0,
          note: note.trim(),
          active,
        }),
      });
      if (!res.ok) throw new Error();
      showToast(`${selectedCreator.name} added to Slot #${addSlot}`);
      setAddSlot(null);
      setSelectedCreator(null);
      load();
    } catch {
      showToast('Failed to add creator');
    } finally {
      setSaving(false);
    }
  };

  const handleEditSave = async () => {
    if (!editSlot) return;
    setSaving(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/OFM/trending/${editSlot._id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealPrice: parseFloat(editDealPrice) || 0,
          note: editNote.trim(),
          active: editActive,
          categories: editCategories,
        }),
      });
      if (!res.ok) throw new Error();
      showToast('Slot updated');
      setEditSlot(null);
      load();
    } catch {
      showToast('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleReplaceSearch = async (slot: TrendingSlot) => {
    openAdd(slot.position);
  };

  const handleToggleActive = async (slot: TrendingSlot) => {
    const token = localStorage.getItem('token');
    await fetch(`/api/OFM/trending/${slot._id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !slot.active }),
    });
    showToast(slot.active ? 'Slot paused' : 'Slot activated');
    load();
  };

  const handleDelete = async (slot: TrendingSlot) => {
    if (!confirm(`Remove ${slot.name} from Slot #${slot.position}?`)) return;
    const token = localStorage.getItem('token');
    await fetch(`/api/OFM/trending/${slot._id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    showToast('Slot cleared');
    load();
  };

  return (
    <div className="space-y-8">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-5 py-3 bg-[#1a2a30] border border-[#00AFF0]/30 text-[#00AFF0] text-sm font-semibold rounded-xl shadow-xl">
          {toast}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-black text-white">Trending Creators</h1>
        <p className="text-white/40 text-sm mt-1">
          Manage up to 12 promoted spots. Assign categories so profiles appear on the right pages. 4 random profiles are shown each page load.
        </p>
      </div>

      {/* Aggregate stats */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
        {SLOTS.map((pos) => {
          const slot = slots[pos - 1];
          return (
            <div key={pos} className={`rounded-xl border p-3 text-center ${slot ? 'bg-[#00AFF0]/[0.05] border-[#00AFF0]/20' : 'bg-white/[0.02] border-white/[0.06] border-dashed'}`}>
              <div className="text-[10px] font-bold text-white/30 uppercase tracking-wider mb-0.5">#{pos}</div>
              {slot ? (
                <>
                  <div className="text-lg font-black text-[#00AFF0]">{slot.clicks.toLocaleString()}</div>
                  <div className={`mt-1 inline-block px-1.5 py-0.5 rounded-full text-[9px] font-bold ${slot.active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/5 text-white/30'}`}>
                    {slot.active ? 'Live' : 'Off'}
                  </div>
                </>
              ) : (
                <div className="text-lg font-black text-white/10">&mdash;</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Slots */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-[#00AFF0]" />
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {SLOTS.map((pos) => {
            const slot = slots[pos - 1];
            return (
              <div
                key={pos}
                className={`rounded-2xl border p-5 transition ${slot ? 'bg-white/[0.03] border-white/[0.07]' : 'bg-white/[0.015] border-white/[0.05] border-dashed'}`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black ${slot ? 'bg-[#00AFF0]/15 text-[#00AFF0]' : 'bg-white/5 text-white/20'}`}>
                      #{pos}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white/80">Spot {pos}</div>
                      {slot && (
                        <div className="text-xs text-white/30">
                          {slot.dealPrice > 0 ? `$${slot.dealPrice} deal` : 'no deal price'} &middot; added {new Date(slot.createdAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                  {slot ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleToggleActive(slot)}
                        title={slot.active ? 'Pause' : 'Activate'}
                        className={`p-1.5 rounded-lg text-xs transition ${slot.active ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20' : 'bg-white/5 text-white/30 hover:bg-white/10'}`}
                      >
                        {slot.active ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                        )}
                      </button>
                      <button
                        onClick={() => handleReplaceSearch(slot)}
                        className="p-1.5 rounded-lg text-white/30 hover:text-[#00AFF0] hover:bg-[#00AFF0]/10 transition"
                        title="Replace with different creator"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                          <path d="M3 3v5h5"/>
                          <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
                          <path d="M16 16h5v5"/>
                        </svg>
                      </button>
                      <button
                        onClick={() => openEdit(slot)}
                        className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/10 transition"
                        title="Edit deal details"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(slot)}
                        className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition"
                        title="Clear slot"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2"/>
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => openAdd(pos)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00AFF0]/10 hover:bg-[#00AFF0]/20 border border-[#00AFF0]/20 text-[#00AFF0] text-xs font-bold rounded-xl transition"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                      Add Creator
                    </button>
                  )}
                </div>

                {slot ? (
                  <div className="flex items-start gap-3">
                    {slot.avatar ? (
                      <img src={slot.avatar} alt={slot.name} className="w-12 h-12 rounded-xl object-cover bg-white/5 flex-shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-[#00AFF0]/10 border border-[#00AFF0]/20 flex items-center justify-center text-[#00AFF0] font-black text-lg flex-shrink-0">
                        {slot.name.charAt(0)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-white text-sm truncate">{slot.name}</div>
                      <div className="text-xs text-[#00AFF0]">@{slot.username}</div>
                      {slot.bio && <div className="text-xs text-white/30 mt-1 line-clamp-2">{slot.bio}</div>}
                      {slot.categories.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {slot.categories.map(c => (
                            <span key={c} className="px-1.5 py-0.5 bg-[#00AFF0]/10 text-[#00AFF0] text-[10px] rounded capitalize">{c}</span>
                          ))}
                        </div>
                      )}
                      {slot.note && (
                        <div className="mt-1.5 text-[11px] text-amber-400/60 italic">Note: {slot.note}</div>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-lg font-black text-[#00AFF0]">{slot.clicks.toLocaleString()}</div>
                      <div className="text-[10px] text-white/25">clicks</div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-20 text-white/15 text-sm">
                    Empty &mdash; click &quot;Add Creator&quot; to fill this spot
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ADD MODAL — search-based */}
      {addSlot !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0e1419] border border-white/10 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-white font-bold text-lg mb-1">
              Add to Slot #{addSlot}
            </h3>

            {!selectedCreator ? (
              <>
                <p className="text-white/30 text-xs mb-4">Search by name, username, or paste an OnlyFans link.</p>

                <div className="relative">
                  <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
                  </svg>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Type a name or paste https://onlyfans.com/..."
                    autoFocus
                    className="w-full pl-10 pr-4 py-3 bg-white/[0.06] border border-white/10 rounded-xl text-white text-sm placeholder:text-white/25 outline-none focus:border-[#00AFF0]/40 transition"
                  />
                  {searching && (
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-[#00AFF0]" />
                    </div>
                  )}
                </div>

                {/* Results */}
                {searchResults.length > 0 && (
                  <div className="mt-3 space-y-1.5 max-h-[50vh] overflow-y-auto">
                    {searchResults.map((c) => (
                      <button
                        key={c._id}
                        onClick={() => selectCreator(c)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] hover:bg-[#00AFF0]/10 border border-transparent hover:border-[#00AFF0]/20 transition text-left group"
                      >
                        {c.avatar ? (
                          <img src={c.avatar} alt="" className="w-11 h-11 rounded-xl object-cover bg-white/5 flex-shrink-0" />
                        ) : (
                          <div className="w-11 h-11 rounded-xl bg-white/5 flex items-center justify-center text-white/20 font-bold flex-shrink-0">
                            {c.name.charAt(0)}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-white truncate">{c.name}</div>
                          <div className="text-xs text-[#00AFF0]">@{c.username}</div>
                          <div className="text-[10px] text-white/25 mt-0.5">
                            {c.clicks > 0 ? `${c.clicks} clicks` : ''}
                            {c.clicks > 0 && c.likesCount > 0 ? ' · ' : ''}
                            {c.likesCount > 0 ? `${c.likesCount.toLocaleString()} likes` : ''}
                            {c.isFree ? ' · Free' : c.price > 0 ? ` · $${c.price}` : ''}
                          </div>
                        </div>
                        <div className="flex-shrink-0 text-xs text-[#00AFF0] font-bold opacity-0 group-hover:opacity-100 transition">
                          Select &rarr;
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
                  <div className="mt-4 text-center text-white/20 text-sm py-6">
                    No creators found for &ldquo;{searchQuery}&rdquo;
                  </div>
                )}

                <div className="mt-4">
                  <button
                    onClick={() => setAddSlot(null)}
                    className="w-full py-2.5 bg-white/[0.06] border border-white/10 rounded-xl text-white/60 text-sm font-semibold hover:bg-white/10 transition"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Selected creator preview */}
                <div className="flex items-center gap-3 p-4 rounded-xl bg-[#00AFF0]/[0.06] border border-[#00AFF0]/20 mt-3 mb-5">
                  {selectedCreator.avatar ? (
                    <img src={selectedCreator.avatar} alt="" className="w-14 h-14 rounded-xl object-cover bg-white/5 flex-shrink-0" />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-[#00AFF0]/10 flex items-center justify-center text-[#00AFF0] font-black text-xl flex-shrink-0">
                      {selectedCreator.name.charAt(0)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-white truncate">{selectedCreator.name}</div>
                    <div className="text-xs text-[#00AFF0]">@{selectedCreator.username}</div>
                    {selectedCreator.bio && (
                      <div className="text-[11px] text-white/30 mt-0.5 line-clamp-1">{selectedCreator.bio}</div>
                    )}
                  </div>
                  <button
                    onClick={() => { setSelectedCreator(null); setSearchQuery(''); }}
                    className="flex-shrink-0 px-2.5 py-1 bg-white/[0.06] hover:bg-white/10 border border-white/10 text-white/50 text-xs font-semibold rounded-lg transition"
                  >
                    Change
                  </button>
                </div>

                <p className="text-white/30 text-xs mb-4">All profile data will be pulled automatically. Just add deal details below (optional).</p>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-1.5">Deal Price ($)</label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={dealPrice}
                        onChange={(e) => setDealPrice(e.target.value)}
                        placeholder="e.g. 50"
                        className="w-full px-3 py-2.5 bg-white/[0.05] border border-white/10 rounded-xl text-white text-sm placeholder:text-white/20 outline-none focus:border-[#00AFF0]/40 transition"
                      />
                    </div>
                    <div className="flex flex-col justify-end pb-1">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={active}
                          onChange={(e) => setActive(e.target.checked)}
                          className="accent-[#00AFF0] w-4 h-4"
                        />
                        <span className="text-sm text-white/60">Active (visible)</span>
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-1.5">Internal Note</label>
                    <input
                      type="text"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="e.g. paid $50, expires Apr 2026"
                      className="w-full px-3 py-2.5 bg-white/[0.05] border border-white/10 rounded-xl text-white text-sm placeholder:text-white/20 outline-none focus:border-[#00AFF0]/40 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-1.5">Categories</label>
                    <p className="text-[10px] text-white/25 mb-2">Pick categories so this profile shows on matching category pages.</p>
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                      {OF_CATEGORIES.map(cat => (
                        <button
                          key={cat.slug}
                          type="button"
                          onClick={() => setAddCategories(prev => prev.includes(cat.slug) ? prev.filter(c => c !== cat.slug) : [...prev, cat.slug])}
                          className={`px-2 py-1 rounded-lg text-[11px] font-semibold border transition ${
                            addCategories.includes(cat.slug)
                              ? 'bg-[#00AFF0]/15 border-[#00AFF0]/40 text-[#00AFF0]'
                              : 'bg-white/[0.03] border-white/[0.08] text-white/40 hover:text-white/60'
                          }`}
                        >
                          {cat.emoji} {cat.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setAddSlot(null)}
                    className="flex-1 py-2.5 bg-white/[0.06] border border-white/10 rounded-xl text-white/60 text-sm font-semibold hover:bg-white/10 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAdd}
                    disabled={saving}
                    className="flex-1 py-2.5 bg-[#00AFF0] hover:bg-[#009dd9] rounded-xl text-white text-sm font-bold transition disabled:opacity-40"
                  >
                    {saving ? 'Adding...' : `Add to Slot #${addSlot}`}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* EDIT MODAL — deal details only */}
      {editSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0e1419] border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-white font-bold text-lg mb-1">Edit Slot #{editSlot.position}</h3>
            <div className="flex items-center gap-3 mt-3 mb-5">
              {editSlot.avatar ? (
                <img src={editSlot.avatar} alt="" className="w-11 h-11 rounded-xl object-cover bg-white/5 flex-shrink-0" />
              ) : (
                <div className="w-11 h-11 rounded-xl bg-[#00AFF0]/10 flex items-center justify-center text-[#00AFF0] font-black flex-shrink-0">
                  {editSlot.name.charAt(0)}
                </div>
              )}
              <div>
                <div className="font-bold text-white text-sm">{editSlot.name}</div>
                <div className="text-xs text-[#00AFF0]">@{editSlot.username}</div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-1.5">Deal Price ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={editDealPrice}
                    onChange={(e) => setEditDealPrice(e.target.value)}
                    placeholder="e.g. 50"
                    className="w-full px-3 py-2.5 bg-white/[0.05] border border-white/10 rounded-xl text-white text-sm placeholder:text-white/20 outline-none focus:border-[#00AFF0]/40 transition"
                  />
                </div>
                <div className="flex flex-col justify-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editActive}
                      onChange={(e) => setEditActive(e.target.checked)}
                      className="accent-[#00AFF0] w-4 h-4"
                    />
                    <span className="text-sm text-white/60">Active (visible)</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-1.5">Internal Note</label>
                <input
                  type="text"
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  placeholder="e.g. paid $50, expires Apr 2026"
                  className="w-full px-3 py-2.5 bg-white/[0.05] border border-white/10 rounded-xl text-white text-sm placeholder:text-white/20 outline-none focus:border-[#00AFF0]/40 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-1.5">Categories</label>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                  {OF_CATEGORIES.map(cat => (
                    <button
                      key={cat.slug}
                      type="button"
                      onClick={() => setEditCategories(prev => prev.includes(cat.slug) ? prev.filter(c => c !== cat.slug) : [...prev, cat.slug])}
                      className={`px-2 py-1 rounded-lg text-[11px] font-semibold border transition ${
                        editCategories.includes(cat.slug)
                          ? 'bg-[#00AFF0]/15 border-[#00AFF0]/40 text-[#00AFF0]'
                          : 'bg-white/[0.03] border-white/[0.08] text-white/40 hover:text-white/60'
                      }`}
                    >
                      {cat.emoji} {cat.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditSlot(null)}
                className="flex-1 py-2.5 bg-white/[0.06] border border-white/10 rounded-xl text-white/60 text-sm font-semibold hover:bg-white/10 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleEditSave}
                disabled={saving}
                className="flex-1 py-2.5 bg-[#00AFF0] hover:bg-[#009dd9] rounded-xl text-white text-sm font-bold transition disabled:opacity-40"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info box */}
      <div className="bg-[#00AFF0]/[0.05] border border-[#00AFF0]/15 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-[#00AFF0]/80 mb-2">How it works</h3>
        <ul className="text-xs text-white/40 space-y-1.5 list-disc list-inside">
          <li>Up to <strong className="text-white/60">12 slots</strong> — each page load shows <strong className="text-white/60">4 random</strong> from the pool so visitors always see a fresh mix.</li>
          <li><strong className="text-white/60">Assign categories</strong> to each profile — on category pages (e.g. Blonde, Big Ass) only matching trending profiles are shown.</li>
          <li>Every click is tracked. Share the click count with buyers as proof of exposure.</li>
          <li>Use the <strong className="text-white/60">Replace</strong> button to swap a creator without losing the slot.</li>
          <li>Toggle <strong className="text-white/60">Active</strong> to pause a slot without losing the data.</li>
        </ul>
      </div>
    </div>
  );
}
