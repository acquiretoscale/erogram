'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { OF_CATEGORIES } from '@/app/onlyfanssearch/constants';
import {
  getOFMTrending,
  createOFMTrendingSlot,
  updateOFMTrending,
  deleteOFMTrending,
  searchOFMCreators,
  getTrendingDailyClicks,
  resetTrendingClicks,
} from '@/lib/actions/ofm';

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
  clickBudget: number;
  dailyClickCap: number;
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

interface DailyClick {
  date: string;
  clicks: number;
}

// ---------------------------------------------------------------------------
// Mini bar chart — pure SVG, no deps
// ---------------------------------------------------------------------------
function DailyClicksChart({ data }: { data: DailyClick[] }) {
  const max = Math.max(...data.map((d) => d.clicks), 1);
  const total = data.reduce((s, d) => s + d.clicks, 0);
  const barW = Math.max(4, Math.min(14, Math.floor(680 / data.length) - 2));
  const chartH = 120;

  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5">
      <div className="flex items-baseline justify-between mb-4">
        <div>
          <h2 className="text-sm font-bold text-white/70">Daily Clicks (30 days)</h2>
          <p className="text-[11px] text-white/30 mt-0.5">All creators combined</p>
        </div>
        <div className="text-right">
          <div className="text-xl font-black text-[#00AFF0]">{total.toLocaleString()}</div>
          <div className="text-[10px] text-white/30">total</div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <svg
          width={data.length * (barW + 2) + 20}
          height={chartH + 24}
          style={{ display: 'block', margin: '0 auto' }}
        >
          {data.map((d, i) => {
            const h = (d.clicks / max) * chartH;
            const x = i * (barW + 2) + 10;
            const isWeekend = [0, 6].includes(new Date(d.date + 'T00:00:00').getDay());
            const fill =
              d.clicks === 0
                ? 'rgba(255,255,255,0.05)'
                : isWeekend
                  ? 'rgba(0,175,240,0.45)'
                  : '#00AFF0';
            return (
              <g key={d.date}>
                <title>{d.date}: {d.clicks} clicks</title>
                <rect
                  x={x}
                  y={chartH - h}
                  width={barW}
                  height={Math.max(h, 2)}
                  rx={2}
                  fill={fill}
                />
                {i % 7 === 0 && (
                  <text
                    x={x + barW / 2}
                    y={chartH + 16}
                    textAnchor="middle"
                    fontSize={9}
                    fill="rgba(255,255,255,0.25)"
                  >
                    {d.date.slice(5)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function TrendingAdminPage() {
  const [creators, setCreators] = useState<TrendingSlot[]>([]);
  const [dailyClicks, setDailyClicks] = useState<DailyClick[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  // Add
  const [addOpen, setAddOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedCreator, setSelectedCreator] = useState<SearchResult | null>(null);
  const [dealPrice, setDealPrice] = useState('');
  const [note, setNote] = useState('');
  const [active, setActive] = useState(true);
  const [addCategories, setAddCategories] = useState<string[]>([]);
  const [clickBudget, setClickBudget] = useState('');
  const [dailyClickCap, setDailyClickCap] = useState('');
  const [saving, setSaving] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Edit
  const [editSlot, setEditSlot] = useState<TrendingSlot | null>(null);
  const [editDealPrice, setEditDealPrice] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editActive, setEditActive] = useState(true);
  const [editCategories, setEditCategories] = useState<string[]>([]);
  const [editClickBudget, setEditClickBudget] = useState('');
  const [editDailyClickCap, setEditDailyClickCap] = useState('');

  const token = () => localStorage.getItem('token') || '';
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const load = async () => {
    setLoading(true);
    try {
      const [slots, chart] = await Promise.all([
        getOFMTrending(token()),
        getTrendingDailyClicks(token()),
      ]);
      setCreators(slots as TrendingSlot[]);
      setDailyClicks(chart as DailyClick[]);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced search
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    const q = searchQuery.trim();
    if (q.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const data = await searchOFMCreators(token(), q);
        setSearchResults(data.creators || []);
      } catch { setSearchResults([]); }
      finally { setSearching(false); }
    }, 300);
  }, [searchQuery]);

  const nextPosition = useMemo(() => {
    const used = new Set(creators.map((c) => c.position));
    for (let i = 1; i <= 12; i++) if (!used.has(i)) return i;
    return null;
  }, [creators]);

  // --- Add ---
  const openAdd = () => {
    setAddOpen(true);
    setSearchQuery('');
    setSearchResults([]);
    setSelectedCreator(null);
    setDealPrice('');
    setNote('');
    setActive(true);
    setAddCategories([]);
    setClickBudget('');
    setDailyClickCap('');
    setEditSlot(null);
  };

  const handleAdd = async () => {
    if (!selectedCreator || nextPosition === null) return;
    setSaving(true);
    try {
      await createOFMTrendingSlot(token(), {
        name: selectedCreator.name,
        username: selectedCreator.username,
        avatar: selectedCreator.avatar,
        url: selectedCreator.url,
        bio: selectedCreator.bio,
        categories: addCategories,
        position: nextPosition,
        dealPrice: parseFloat(dealPrice) || 0,
        note: note.trim(),
        active,
        clickBudget: parseInt(clickBudget) || 0,
        dailyClickCap: parseInt(dailyClickCap) || 0,
      });
      showToast(`${selectedCreator.name} added to Slot #${nextPosition}`);
      setAddOpen(false);
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to add');
    } finally { setSaving(false); }
  };

  // --- Edit ---
  const openEdit = (slot: TrendingSlot) => {
    setEditSlot(slot);
    setEditDealPrice(String(slot.dealPrice || ''));
    setEditNote(slot.note || '');
    setEditActive(slot.active);
    setEditCategories(slot.categories || []);
    setEditClickBudget(String(slot.clickBudget || ''));
    setEditDailyClickCap(String(slot.dailyClickCap || ''));
    setAddOpen(false);
  };

  const handleEditSave = async () => {
    if (!editSlot) return;
    setSaving(true);
    try {
      await updateOFMTrending(token(), editSlot._id, {
        dealPrice: parseFloat(editDealPrice) || 0,
        note: editNote.trim(),
        active: editActive,
        categories: editCategories,
        clickBudget: parseInt(editClickBudget) || 0,
        dailyClickCap: parseInt(editDailyClickCap) || 0,
      });
      showToast('Saved');
      setEditSlot(null);
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save');
    } finally { setSaving(false); }
  };

  const handleToggle = async (slot: TrendingSlot) => {
    try {
      await updateOFMTrending(token(), slot._id, { active: !slot.active });
      showToast(slot.active ? 'Paused' : 'Activated');
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed');
    }
  };

  const handleDelete = async (slot: TrendingSlot) => {
    if (!confirm(`Remove ${slot.name}?`)) return;
    try {
      await deleteOFMTrending(token(), slot._id);
      showToast('Removed');
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed');
    }
  };

  const handleResetClicks = async (slot: TrendingSlot) => {
    if (!confirm(`Reset all clicks for ${slot.name}? This cannot be undone.`)) return;
    try {
      await resetTrendingClicks(token(), slot._id);
      showToast('Clicks reset');
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed');
    }
  };

  // --- Budget bar helper ---
  const BudgetBar = ({ clicks, budget }: { clicks: number; budget: number }) => {
    if (!budget) return null;
    const pct = Math.min((clicks / budget) * 100, 100);
    const exhausted = clicks >= budget;
    return (
      <div className="mt-1.5 w-full">
        <div className="flex items-center justify-between text-[10px] mb-0.5">
          <span className={exhausted ? 'text-red-400 font-bold' : 'text-white/30'}>
            {clicks.toLocaleString()} / {budget.toLocaleString()} clicks
          </span>
          <span className={exhausted ? 'text-red-400 font-bold' : 'text-white/25'}>
            {pct.toFixed(0)}%
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${exhausted ? 'bg-red-500' : pct > 80 ? 'bg-amber-500' : 'bg-[#00AFF0]'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-5 py-3 bg-[#1a2a30] border border-[#00AFF0]/30 text-[#00AFF0] text-sm font-semibold rounded-xl shadow-xl">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Featured Creators</h1>
          <p className="text-white/40 text-sm mt-1">
            {creators.length} creators &middot; CPC campaigns auto-pause when budget is reached
          </p>
        </div>
        {nextPosition !== null && (
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#00AFF0] hover:bg-[#009dd9] text-white text-sm font-bold rounded-xl transition"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
            Add Creator
          </button>
        )}
      </div>

      {/* Chart */}
      {dailyClicks.length > 0 && <DailyClicksChart data={dailyClicks} />}

      {/* Creator list */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-[#00AFF0]" />
        </div>
      ) : creators.length === 0 ? (
        <div className="text-center py-16 text-white/20">
          <p className="text-lg font-bold">No creators yet</p>
          <p className="text-sm mt-1">Click &quot;Add Creator&quot; to fill your first slot.</p>
        </div>
      ) : (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden divide-y divide-white/[0.04]">
          {creators
            .sort((a, b) => a.position - b.position)
            .map((slot) => (
              <div
                key={slot._id}
                className={`flex items-center gap-4 px-5 py-4 transition hover:bg-white/[0.02] ${!slot.active ? 'opacity-50' : ''}`}
              >
                {/* Position badge */}
                <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-white/[0.05] flex items-center justify-center text-[11px] font-black text-white/30">
                  {slot.position}
                </div>

                {/* Avatar */}
                {slot.avatar ? (
                  <img
                    src={slot.avatar}
                    alt={slot.name}
                    className="w-11 h-11 rounded-xl object-cover bg-white/5 flex-shrink-0"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-xl bg-[#00AFF0]/10 border border-[#00AFF0]/20 flex items-center justify-center text-[#00AFF0] font-black text-lg flex-shrink-0">
                    {slot.name.charAt(0)}
                  </div>
                )}

                {/* Name + meta */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white truncate">{slot.name}</span>
                    <span className="text-xs text-[#00AFF0] flex-shrink-0">@{slot.username}</span>
                    {!slot.active && (
                      <span className="px-1.5 py-0.5 bg-white/5 text-white/30 text-[9px] font-bold rounded-full flex-shrink-0">
                        PAUSED
                      </span>
                    )}
                    {slot.clickBudget > 0 && slot.clicks >= slot.clickBudget && (
                      <span className="px-1.5 py-0.5 bg-red-500/10 text-red-400 text-[9px] font-bold rounded-full flex-shrink-0">
                        BUDGET HIT
                      </span>
                    )}
                  </div>
                  {/* Category badges */}
                  {slot.categories.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {slot.categories.map((c) => (
                        <span
                          key={c}
                          className="px-1.5 py-0.5 bg-[#00AFF0]/8 text-[#00AFF0]/70 text-[10px] rounded capitalize"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  )}
                  {/* Budget bar */}
                  <BudgetBar clicks={slot.clicks} budget={slot.clickBudget} />
                </div>

                {/* Clicks */}
                <div className="flex-shrink-0 text-right min-w-[70px]">
                  <div className="text-lg font-black text-[#00AFF0]">{slot.clicks.toLocaleString()}</div>
                  <div className="text-[10px] text-white/25">
                    {slot.clickBudget > 0 ? `/ ${slot.clickBudget.toLocaleString()}` : 'clicks'}
                  </div>
                  {slot.dailyClickCap > 0 && (
                    <div className="text-[9px] text-amber-400/60">{slot.dailyClickCap}/day cap</div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleToggle(slot)}
                    title={slot.active ? 'Pause' : 'Activate'}
                    className={`p-2 rounded-lg text-xs transition ${
                      slot.active
                        ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                        : 'bg-white/5 text-white/30 hover:bg-white/10'
                    }`}
                  >
                    {slot.active ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                    )}
                  </button>
                  <button
                    onClick={() => openEdit(slot)}
                    title="Edit"
                    className="p-2 rounded-lg text-white/30 hover:text-white hover:bg-white/10 transition"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  <button
                    onClick={() => handleResetClicks(slot)}
                    title="Reset clicks"
                    className="p-2 rounded-lg text-white/30 hover:text-amber-400 hover:bg-amber-500/10 transition"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                      <path d="M3 3v5h5"/>
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(slot)}
                    title="Delete"
                    className="p-2 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2"/>
                    </svg>
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* ADD MODAL                                                          */}
      {/* ------------------------------------------------------------------ */}
      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setAddOpen(false)}>
          <div className="bg-[#0e1419] border border-white/10 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-white font-bold text-lg mb-1">
              Add Creator &rarr; Slot #{nextPosition}
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

                {searchResults.length > 0 && (
                  <div className="mt-3 space-y-1.5 max-h-[50vh] overflow-y-auto">
                    {searchResults.map((c) => (
                      <button
                        key={c._id}
                        onClick={() => { setSelectedCreator(c); setSearchQuery(''); setSearchResults([]); }}
                        className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] hover:bg-[#00AFF0]/10 border border-transparent hover:border-[#00AFF0]/20 transition text-left group"
                      >
                        {c.avatar ? (
                          <img src={c.avatar} alt="" className="w-10 h-10 rounded-xl object-cover bg-white/5 flex-shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/20 font-bold flex-shrink-0">{c.name.charAt(0)}</div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-white truncate">{c.name}</div>
                          <div className="text-xs text-[#00AFF0]">@{c.username}</div>
                        </div>
                        <span className="text-xs text-[#00AFF0] font-bold opacity-0 group-hover:opacity-100 transition">Select &rarr;</span>
                      </button>
                    ))}
                  </div>
                )}

                {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
                  <div className="mt-4 text-center text-white/20 text-sm py-6">
                    No creators found for &ldquo;{searchQuery}&rdquo;
                  </div>
                )}

                <button onClick={() => setAddOpen(false)} className="w-full mt-4 py-2.5 bg-white/[0.06] border border-white/10 rounded-xl text-white/60 text-sm font-semibold hover:bg-white/10 transition">
                  Cancel
                </button>
              </>
            ) : (
              <>
                {/* Selected preview */}
                <div className="flex items-center gap-3 p-4 rounded-xl bg-[#00AFF0]/[0.06] border border-[#00AFF0]/20 mt-3 mb-5">
                  {selectedCreator.avatar ? (
                    <img src={selectedCreator.avatar} alt="" className="w-12 h-12 rounded-xl object-cover bg-white/5 flex-shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-[#00AFF0]/10 flex items-center justify-center text-[#00AFF0] font-black text-xl flex-shrink-0">{selectedCreator.name.charAt(0)}</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-white truncate">{selectedCreator.name}</div>
                    <div className="text-xs text-[#00AFF0]">@{selectedCreator.username}</div>
                  </div>
                  <button onClick={() => { setSelectedCreator(null); setSearchQuery(''); }} className="px-2.5 py-1 bg-white/[0.06] hover:bg-white/10 border border-white/10 text-white/50 text-xs font-semibold rounded-lg transition">
                    Change
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Campaign fields */}
                  <div className="p-4 bg-[#00AFF0]/[0.04] border border-[#00AFF0]/10 rounded-xl space-y-3">
                    <p className="text-[11px] font-bold text-[#00AFF0]/60 uppercase tracking-wider">CPC Campaign</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-white/40 mb-1">Click Budget</label>
                        <input
                          type="number" min="0" step="100"
                          value={clickBudget}
                          onChange={(e) => setClickBudget(e.target.value)}
                          placeholder="e.g. 1000 (0 = unlimited)"
                          className="w-full px-3 py-2 bg-white/[0.05] border border-white/10 rounded-lg text-white text-sm placeholder:text-white/20 outline-none focus:border-[#00AFF0]/40 transition"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-white/40 mb-1">Daily Cap</label>
                        <input
                          type="number" min="0" step="10"
                          value={dailyClickCap}
                          onChange={(e) => setDailyClickCap(e.target.value)}
                          placeholder="e.g. 100 (0 = unlimited)"
                          className="w-full px-3 py-2 bg-white/[0.05] border border-white/10 rounded-lg text-white text-sm placeholder:text-white/20 outline-none focus:border-[#00AFF0]/40 transition"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-white/40 mb-1">Deal Price ($)</label>
                      <input
                        type="number" min="0" step="1"
                        value={dealPrice}
                        onChange={(e) => setDealPrice(e.target.value)}
                        placeholder="e.g. 50"
                        className="w-full px-3 py-2 bg-white/[0.05] border border-white/10 rounded-lg text-white text-sm placeholder:text-white/20 outline-none focus:border-[#00AFF0]/40 transition"
                      />
                    </div>
                    <div className="flex flex-col justify-end pb-1">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="accent-[#00AFF0] w-4 h-4" />
                        <span className="text-sm text-white/60">Active (visible)</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-white/40 mb-1">Internal Note</label>
                    <input
                      type="text"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="e.g. paid $50 for 1000 clicks, agency: XYZ"
                      className="w-full px-3 py-2 bg-white/[0.05] border border-white/10 rounded-lg text-white text-sm placeholder:text-white/20 outline-none focus:border-[#00AFF0]/40 transition"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-white/40">Categories</label>
                      <span className={`text-[10px] font-bold ${addCategories.length >= 6 ? 'text-amber-400' : 'text-white/25'}`}>
                        {addCategories.length}/6
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                      {OF_CATEGORIES.map((cat) => {
                        const selected = addCategories.includes(cat.slug);
                        const atLimit = addCategories.length >= 6 && !selected;
                        return (
                          <button
                            key={cat.slug}
                            type="button"
                            disabled={atLimit}
                            onClick={() => setAddCategories((prev) => selected ? prev.filter((c) => c !== cat.slug) : prev.length >= 6 ? prev : [...prev, cat.slug])}
                            className={`px-2 py-1 rounded-lg text-[11px] font-semibold border transition ${
                              selected
                                ? 'bg-[#00AFF0]/15 border-[#00AFF0]/40 text-[#00AFF0]'
                                : atLimit
                                  ? 'bg-white/[0.01] border-white/[0.04] text-white/15 cursor-not-allowed'
                                  : 'bg-white/[0.03] border-white/[0.08] text-white/40 hover:text-white/60'
                            }`}
                          >
                            {cat.emoji} {cat.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button onClick={() => setAddOpen(false)} className="flex-1 py-2.5 bg-white/[0.06] border border-white/10 rounded-xl text-white/60 text-sm font-semibold hover:bg-white/10 transition">
                    Cancel
                  </button>
                  <button onClick={handleAdd} disabled={saving} className="flex-1 py-2.5 bg-[#00AFF0] hover:bg-[#009dd9] rounded-xl text-white text-sm font-bold transition disabled:opacity-40">
                    {saving ? 'Adding...' : `Add to Slot #${nextPosition}`}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* EDIT MODAL                                                         */}
      {/* ------------------------------------------------------------------ */}
      {editSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setEditSlot(null)}>
          <div className="bg-[#0e1419] border border-white/10 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-white font-bold text-lg mb-1">Edit &mdash; {editSlot.name}</h3>
            <div className="flex items-center gap-3 mt-2 mb-5">
              {editSlot.avatar ? (
                <img src={editSlot.avatar} alt="" className="w-10 h-10 rounded-xl object-cover bg-white/5 flex-shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-[#00AFF0]/10 flex items-center justify-center text-[#00AFF0] font-black flex-shrink-0">{editSlot.name.charAt(0)}</div>
              )}
              <div>
                <div className="font-bold text-white text-sm">{editSlot.name}</div>
                <div className="text-xs text-[#00AFF0]">@{editSlot.username}</div>
              </div>
              <div className="ml-auto text-right">
                <div className="text-lg font-black text-[#00AFF0]">{editSlot.clicks.toLocaleString()}</div>
                <div className="text-[10px] text-white/25">total clicks</div>
              </div>
            </div>

            <div className="space-y-4">
              {/* CPC */}
              <div className="p-4 bg-[#00AFF0]/[0.04] border border-[#00AFF0]/10 rounded-xl space-y-3">
                <p className="text-[11px] font-bold text-[#00AFF0]/60 uppercase tracking-wider">CPC Campaign</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-white/40 mb-1">Click Budget</label>
                    <input
                      type="number" min="0" step="100"
                      value={editClickBudget}
                      onChange={(e) => setEditClickBudget(e.target.value)}
                      placeholder="0 = unlimited"
                      className="w-full px-3 py-2 bg-white/[0.05] border border-white/10 rounded-lg text-white text-sm placeholder:text-white/20 outline-none focus:border-[#00AFF0]/40 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-white/40 mb-1">Daily Cap</label>
                    <input
                      type="number" min="0" step="10"
                      value={editDailyClickCap}
                      onChange={(e) => setEditDailyClickCap(e.target.value)}
                      placeholder="0 = unlimited"
                      className="w-full px-3 py-2 bg-white/[0.05] border border-white/10 rounded-lg text-white text-sm placeholder:text-white/20 outline-none focus:border-[#00AFF0]/40 transition"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-white/40 mb-1">Deal Price ($)</label>
                  <input
                    type="number" min="0" step="1"
                    value={editDealPrice}
                    onChange={(e) => setEditDealPrice(e.target.value)}
                    placeholder="e.g. 50"
                    className="w-full px-3 py-2 bg-white/[0.05] border border-white/10 rounded-lg text-white text-sm placeholder:text-white/20 outline-none focus:border-[#00AFF0]/40 transition"
                  />
                </div>
                <div className="flex flex-col justify-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={editActive} onChange={(e) => setEditActive(e.target.checked)} className="accent-[#00AFF0] w-4 h-4" />
                    <span className="text-sm text-white/60">Active (visible)</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-white/40 mb-1">Internal Note</label>
                <input
                  type="text"
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  placeholder="e.g. paid $50 for 1000 clicks"
                  className="w-full px-3 py-2 bg-white/[0.05] border border-white/10 rounded-lg text-white text-sm placeholder:text-white/20 outline-none focus:border-[#00AFF0]/40 transition"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-white/40">Categories</label>
                  <span className={`text-[10px] font-bold ${editCategories.length >= 6 ? 'text-amber-400' : 'text-white/25'}`}>
                    {editCategories.length}/6
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                  {OF_CATEGORIES.map((cat) => {
                    const selected = editCategories.includes(cat.slug);
                    const atLimit = editCategories.length >= 6 && !selected;
                    return (
                      <button
                        key={cat.slug}
                        type="button"
                        disabled={atLimit}
                        onClick={() => setEditCategories((prev) => selected ? prev.filter((c) => c !== cat.slug) : prev.length >= 6 ? prev : [...prev, cat.slug])}
                        className={`px-2 py-1 rounded-lg text-[11px] font-semibold border transition ${
                          selected
                            ? 'bg-[#00AFF0]/15 border-[#00AFF0]/40 text-[#00AFF0]'
                            : atLimit
                              ? 'bg-white/[0.01] border-white/[0.04] text-white/15 cursor-not-allowed'
                              : 'bg-white/[0.03] border-white/[0.08] text-white/40 hover:text-white/60'
                        }`}
                      >
                        {cat.emoji} {cat.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditSlot(null)} className="flex-1 py-2.5 bg-white/[0.06] border border-white/10 rounded-xl text-white/60 text-sm font-semibold hover:bg-white/10 transition">
                Cancel
              </button>
              <button onClick={handleEditSave} disabled={saving} className="flex-1 py-2.5 bg-[#00AFF0] hover:bg-[#009dd9] rounded-xl text-white text-sm font-bold transition disabled:opacity-40">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
