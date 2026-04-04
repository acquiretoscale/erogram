'use client';

import { useEffect, useState, useRef } from 'react';
import {
  getTrendingErogramAdmin,
  addTrendingErogramCreator,
  updateTrendingErogramCreator,
  deleteTrendingErogramCreator,
  searchOFMCreators,
} from '@/lib/actions/ofm';

interface TrendingEntry {
  _id: string;
  name: string;
  username: string;
  slug: string;
  avatar: string;
  points: number;
  pointsDelta: number;
  position: number;
  active: boolean;
  likesCount: number;
}

export default function TrendingAdminPage() {
  const [entries, setEntries] = useState<TrendingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  const [addOpen, setAddOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [addPoints, setAddPoints] = useState('300');
  const [addDelta, setAddDelta] = useState('15');
  const [selectedCreator, setSelectedCreator] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const [editId, setEditId] = useState<string | null>(null);
  const [editPoints, setEditPoints] = useState('');
  const [editDelta, setEditDelta] = useState('');

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const token = () => localStorage.getItem('token') || '';
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const load = async () => {
    setLoading(true);
    try {
      const data = await getTrendingErogramAdmin(token());
      setEntries(data);
    } catch (e: any) {
      showToast(e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

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

  const handleAdd = async () => {
    if (!selectedCreator) return;
    setSaving(true);
    try {
      await addTrendingErogramCreator(token(), {
        creatorSlug: selectedCreator.slug,
        points: parseInt(addPoints) || 300,
        pointsDelta: parseInt(addDelta) || 0,
      });
      showToast(`${selectedCreator.name} added to trending`);
      setAddOpen(false);
      setSelectedCreator(null);
      setSearchQuery('');
      load();
    } catch (e: any) {
      showToast(e.message || 'Failed');
    } finally { setSaving(false); }
  };

  const handleUpdate = async (id: string) => {
    setSaving(true);
    try {
      await updateTrendingErogramCreator(token(), id, {
        points: parseInt(editPoints) || 0,
        pointsDelta: parseInt(editDelta) || 0,
      });
      showToast('Updated');
      setEditId(null);
      load();
    } catch (e: any) {
      showToast(e.message || 'Failed');
    } finally { setSaving(false); }
  };

  const handleDelete = async (entry: TrendingEntry) => {
    if (!confirm(`Remove ${entry.name} from trending?`)) return;
    try {
      await deleteTrendingErogramCreator(token(), entry._id);
      showToast('Removed');
      load();
    } catch (e: any) {
      showToast(e.message || 'Failed');
    }
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-5 py-3 bg-[#1a2a30] border border-[#00AFF0]/30 text-[#00AFF0] text-sm font-semibold rounded-xl shadow-xl">
          {toast}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Trending on Erogram</h1>
          <p className="text-white/40 text-sm mt-1">{entries.length} creators on the chart</p>
        </div>
        <button
          onClick={() => { setAddOpen(true); setSelectedCreator(null); setSearchQuery(''); setSearchResults([]); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#00AFF0] hover:bg-[#009dd9] text-white text-sm font-bold rounded-xl transition"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
          Add Creator
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-[#00AFF0]" />
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-16 text-white/20">
          <p className="text-lg font-bold">No creators on trending yet</p>
          <p className="text-sm mt-1">Click &quot;Add Creator&quot; to populate the chart.</p>
        </div>
      ) : (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden divide-y divide-white/[0.04]">
          {entries.map((entry) => (
            <div key={entry._id} className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition">
              <div className="w-7 h-7 rounded-lg bg-white/[0.05] flex items-center justify-center text-[11px] font-black text-white/30 shrink-0">
                {entry.position}
              </div>
              {entry.avatar ? (
                <img src={entry.avatar} alt={entry.name} className="w-11 h-11 rounded-xl object-cover bg-white/5 shrink-0" />
              ) : (
                <div className="w-11 h-11 rounded-xl bg-[#00AFF0]/10 border border-[#00AFF0]/20 flex items-center justify-center text-[#00AFF0] font-black text-lg shrink-0">
                  {entry.name.charAt(0)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white truncate">{entry.name}</span>
                  <span className="text-xs text-[#00AFF0] shrink-0">@{entry.username}</span>
                  {entry.likesCount > 0 && (
                    <span className="text-[10px] text-white/30 shrink-0">{entry.likesCount >= 1000 ? `${(entry.likesCount / 1000).toFixed(0)}K` : entry.likesCount} likes</span>
                  )}
                </div>
                {editId === entry._id ? (
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="number"
                      value={editPoints}
                      onChange={(e) => setEditPoints(e.target.value)}
                      className="w-24 px-2 py-1 bg-white/[0.05] border border-white/10 rounded-lg text-white text-xs outline-none"
                      placeholder="Points"
                    />
                    <input
                      type="number"
                      value={editDelta}
                      onChange={(e) => setEditDelta(e.target.value)}
                      className="w-24 px-2 py-1 bg-white/[0.05] border border-white/10 rounded-lg text-white text-xs outline-none"
                      placeholder="+/- delta"
                    />
                    <button onClick={() => handleUpdate(entry._id)} disabled={saving} className="px-3 py-1 bg-[#00AFF0] text-white text-xs font-bold rounded-lg">
                      {saving ? '...' : 'Save'}
                    </button>
                    <button onClick={() => setEditId(null)} className="px-3 py-1 bg-white/[0.06] text-white/50 text-xs font-bold rounded-lg">
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-sm font-black text-[#00AFF0] tabular-nums">{entry.points.toLocaleString()} pts</span>
                    <span className={`text-xs font-bold tabular-nums ${entry.pointsDelta > 0 ? 'text-emerald-400' : entry.pointsDelta < 0 ? 'text-red-400' : 'text-white/30'}`}>
                      {entry.pointsDelta > 0 ? `▲ +${entry.pointsDelta}` : entry.pointsDelta < 0 ? `▼ ${entry.pointsDelta}` : '— 0'}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => { setEditId(entry._id); setEditPoints(String(entry.points)); setEditDelta(String(entry.pointsDelta)); }}
                  title="Edit points"
                  className="p-2 rounded-lg text-white/30 hover:text-white hover:bg-white/10 transition"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(entry)}
                  title="Remove"
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

      {/* Add Modal */}
      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setAddOpen(false)}>
          <div className="bg-[#0e1419] border border-white/10 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-white font-bold text-lg mb-4">Add to Trending</h3>

            {!selectedCreator ? (
              <>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name or username..."
                    autoFocus
                    className="w-full px-4 py-3 bg-white/[0.06] border border-white/10 rounded-xl text-white text-sm placeholder:text-white/25 outline-none focus:border-[#00AFF0]/40 transition"
                  />
                  {searching && (
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-[#00AFF0]" />
                    </div>
                  )}
                </div>

                {searchResults.length > 0 && (
                  <div className="mt-3 space-y-1.5 max-h-[50vh] overflow-y-auto">
                    {searchResults.map((c: any) => (
                      <button
                        key={c._id}
                        onClick={() => { setSelectedCreator(c); setSearchQuery(''); setSearchResults([]); }}
                        className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] hover:bg-[#00AFF0]/10 border border-transparent hover:border-[#00AFF0]/20 transition text-left group"
                      >
                        {c.avatar ? (
                          <img src={c.avatar} alt="" className="w-10 h-10 rounded-xl object-cover bg-white/5 shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/20 font-bold shrink-0">{c.name.charAt(0)}</div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-white truncate">{c.name}</div>
                          <div className="text-xs text-[#00AFF0]">@{c.username}</div>
                        </div>
                        <span className="text-xs text-[#00AFF0] font-bold opacity-0 group-hover:opacity-100 transition">Select →</span>
                      </button>
                    ))}
                  </div>
                )}

                <button onClick={() => setAddOpen(false)} className="w-full mt-4 py-2.5 bg-white/[0.06] border border-white/10 rounded-xl text-white/60 text-sm font-semibold hover:bg-white/10 transition">
                  Cancel
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 p-4 rounded-xl bg-[#00AFF0]/[0.06] border border-[#00AFF0]/20 mb-5">
                  {selectedCreator.avatar ? (
                    <img src={selectedCreator.avatar} alt="" className="w-12 h-12 rounded-xl object-cover bg-white/5 shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-[#00AFF0]/10 flex items-center justify-center text-[#00AFF0] font-black text-xl shrink-0">{selectedCreator.name.charAt(0)}</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-white truncate">{selectedCreator.name}</div>
                    <div className="text-xs text-[#00AFF0]">@{selectedCreator.username}</div>
                  </div>
                  <button onClick={() => setSelectedCreator(null)} className="px-2.5 py-1 bg-white/[0.06] hover:bg-white/10 border border-white/10 text-white/50 text-xs font-semibold rounded-lg transition">
                    Change
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="block text-xs font-bold text-white/40 mb-1">Total Points</label>
                    <input
                      type="number"
                      value={addPoints}
                      onChange={(e) => setAddPoints(e.target.value)}
                      placeholder="e.g. 300"
                      className="w-full px-3 py-2 bg-white/[0.05] border border-white/10 rounded-lg text-white text-sm placeholder:text-white/20 outline-none focus:border-[#00AFF0]/40 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-white/40 mb-1">Points +/- (trend)</label>
                    <input
                      type="number"
                      value={addDelta}
                      onChange={(e) => setAddDelta(e.target.value)}
                      placeholder="e.g. +15 or -10"
                      className="w-full px-3 py-2 bg-white/[0.05] border border-white/10 rounded-lg text-white text-sm placeholder:text-white/20 outline-none focus:border-[#00AFF0]/40 transition"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setAddOpen(false)} className="flex-1 py-2.5 bg-white/[0.06] border border-white/10 rounded-xl text-white/60 text-sm font-semibold hover:bg-white/10 transition">
                    Cancel
                  </button>
                  <button onClick={handleAdd} disabled={saving} className="flex-1 py-2.5 bg-[#00AFF0] hover:bg-[#009dd9] rounded-xl text-white text-sm font-bold transition disabled:opacity-40">
                    {saving ? 'Adding...' : 'Add to Trending'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
