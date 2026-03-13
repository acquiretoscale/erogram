'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import { filterCategories, filterCountries } from '@/app/groups/constants';
import AiEnrichModal from './AiEnrichModal';
import AiBulkActions from './AiBulkActions';

interface ScheduledGroup {
  _id: string;
  name: string;
  slug: string;
  category: string;
  country: string;
  telegramLink: string;
  description: string;
  memberCount: number;
  image: string;
  premiumOnly: boolean;
  status: string;
  scheduledPublishAt?: string;
  importBatchId?: string;
}

export default function QueueTab() {
  const [groups, setGroups] = useState<ScheduledGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ totalScheduled: 0, nextPublish: '', pendingImages: 0 });

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [reschedulingGroup, setReschedulingGroup] = useState<string | null>(null);
  const [rescheduleValue, setRescheduleValue] = useState('');

  const [enrichGroups, setEnrichGroups] = useState<ScheduledGroup[]>([]);
  const [enrichOpen, setEnrichOpen] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const authHeader = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/admin/csv-import/schedule', { headers: authHeader });
      setGroups(res.data.groups || []);
      setStats({ totalScheduled: res.data.totalScheduled, nextPublish: res.data.nextPublish, pendingImages: res.data.pendingImages });
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [authHeader]);

  useEffect(() => { loadQueue(); }, [loadQueue]);

  const toggleSelect = (id: string) => {
    setSelected(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };

  const publishNow = async (groupId: string) => {
    try {
      await axios.put(`/api/admin/groups/${groupId}`, { status: 'approved' }, { headers: authHeader });
      setGroups(prev => prev.filter(g => g._id !== groupId));
      setStats(prev => ({ ...prev, totalScheduled: prev.totalScheduled - 1 }));
    } catch { alert('Failed to publish.'); }
  };

  const cancelGroup = async (groupId: string) => {
    if (!confirm('Remove from schedule?')) return;
    try {
      await axios.delete('/api/admin/csv-import/schedule', { headers: authHeader, data: { groupId } });
      setGroups(prev => prev.filter(g => g._id !== groupId));
      setStats(prev => ({ ...prev, totalScheduled: prev.totalScheduled - 1 }));
    } catch { /* ignore */ }
  };

  const cancelBatch = async (bid: string) => {
    if (!confirm('Cancel ALL groups from this batch?')) return;
    try {
      await axios.delete('/api/admin/csv-import/schedule', { headers: authHeader, data: { batchId: bid } });
      loadQueue();
    } catch { /* ignore */ }
  };

  const saveEdit = async (groupId: string) => {
    const group = groups.find(g => g._id === groupId);
    if (!group) { setEditingGroup(null); return; }
    const updates: Record<string, string> = {};
    if (editValues.name !== undefined && editValues.name !== group.name) updates.name = editValues.name;
    if (editValues.category && editValues.category !== group.category) updates.category = editValues.category;
    if (editValues.country && editValues.country !== group.country) updates.country = editValues.country;
    if (editValues.description !== undefined && editValues.description !== group.description) updates.description = editValues.description;
    if (Object.keys(updates).length === 0) { setEditingGroup(null); setEditValues({}); return; }
    try {
      await axios.put('/api/admin/csv-import/dispatch', { groupIds: [groupId], updates }, { headers: authHeader });
      setGroups(prev => prev.map(g => g._id === groupId ? { ...g, ...updates } : g));
    } catch { alert('Save failed.'); }
    setEditingGroup(null);
    setEditValues({});
  };

  const bulkVault = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    try {
      await axios.put('/api/admin/csv-import/dispatch', { groupIds: ids, updates: { premiumOnly: true, status: 'approved' } }, { headers: authHeader });
      setGroups(prev => prev.filter(g => !selected.has(g._id)));
      setSelected(new Set());
      alert(`${ids.length} group(s) moved to Premium Vault and published instantly.`);
    } catch { alert('Failed.'); }
  };

  const reschedule = async (groupId: string) => {
    if (!rescheduleValue) return;
    try {
      await axios.put('/api/admin/csv-import/reschedule', { groupId, scheduledPublishAt: new Date(rescheduleValue).toISOString() }, { headers: authHeader });
      setGroups(prev => {
        const updated = prev.map(g => g._id === groupId ? { ...g, scheduledPublishAt: new Date(rescheduleValue).toISOString() } : g);
        return updated.sort((a, b) => new Date(a.scheduledPublishAt || 0).getTime() - new Date(b.scheduledPublishAt || 0).getTime());
      });
      setReschedulingGroup(null);
      setRescheduleValue('');
    } catch { alert('Failed to reschedule.'); }
  };

  // Fetch member counts from Telegram
  const [fetchingUsers, setFetchingUsers] = useState(false);
  const [usersProgress, setUsersProgress] = useState<{ done: number; total: number; success: number } | null>(null);

  const fetchTelegramUsers = async () => {
    const target = selected.size > 0
      ? groups.filter(g => selected.has(g._id) && (g.memberCount || 0) === 0)
      : groups.filter(g => (g.memberCount || 0) === 0);

    if (target.length === 0) { alert('All groups already have member counts.'); return; }
    if (!confirm(`Fetch member counts for ${target.length} group(s)?`)) return;

    setFetchingUsers(true);
    setUsersProgress({ done: 0, total: target.length, success: 0 });
    let totalSuccess = 0;

    for (let i = 0; i < target.length; i += 10) {
      const batch = target.slice(i, i + 10).map(g => g._id);
      try {
        const res = await axios.post('/api/admin/csv-import/fetch-users', { groupIds: batch }, { headers: authHeader });
        const results = res.data?.results || [];
        for (const r of results) {
          if (r.status === 'success' && r.memberCount) {
            totalSuccess++;
            setGroups(prev => prev.map(g => g._id === r.id ? { ...g, memberCount: r.memberCount } : g));
          }
        }
      } catch { /* continue */ }
      setUsersProgress({ done: Math.min(i + 10, target.length), total: target.length, success: totalSuccess });
      if (i + 10 < target.length) await new Promise(r => setTimeout(r, 1500));
    }

    setFetchingUsers(false);
    setUsersProgress(null);
    alert(`Done! Fetched member counts for ${totalSuccess} of ${target.length} groups.`);
  };

  const openEnrich = (g: ScheduledGroup[]) => {
    setEnrichGroups(g);
    setEnrichOpen(true);
  };

  const grouped: Record<string, ScheduledGroup[]> = {};
  for (const g of groups) {
    const dateKey = g.scheduledPublishAt
      ? new Date(g.scheduledPublishAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      : 'Unscheduled';
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(g);
  }

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
          <div className="text-2xl font-black">{stats.totalScheduled}</div>
          <div className="text-xs text-[#666]">Total Scheduled</div>
        </div>
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
          <div className="text-2xl font-black text-amber-400">{groups.filter(g => g.premiumOnly).length}</div>
          <div className="text-xs text-[#666]">→ Premium Vault</div>
        </div>
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
          <div className="text-sm font-bold text-[#b31b1b]">{stats.nextPublish ? new Date(stats.nextPublish).toLocaleString() : 'None'}</div>
          <div className="text-xs text-[#666]">Next Publish</div>
        </div>
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
          <div className="text-2xl font-black text-yellow-400">{stats.pendingImages}</div>
          <div className="text-xs text-[#666]">Pending Images</div>
        </div>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="mb-4 rounded-xl bg-white/5 border border-white/10 overflow-hidden">
          <div className="p-3 flex flex-wrap items-center gap-3">
            <span className="text-sm font-bold text-white">{selected.size} selected</span>
            <div className="h-4 w-px bg-white/10" />
            <button onClick={bulkVault} className="px-3 py-1.5 bg-amber-500/20 text-amber-400 rounded-lg text-xs font-medium hover:bg-amber-500/30 transition-colors">→ Premium Vault</button>
            <button onClick={() => openEnrich(groups.filter(g => selected.has(g._id)))} className="px-3 py-1.5 bg-purple-500/20 text-purple-400 rounded-lg text-xs font-medium hover:bg-purple-500/30 transition-colors">✦ AI Enrich</button>
            <button
              onClick={fetchTelegramUsers}
              disabled={fetchingUsers}
              className="px-3 py-1.5 bg-cyan-500/20 text-cyan-400 rounded-lg text-xs font-medium hover:bg-cyan-500/30 disabled:opacity-50 transition-colors"
            >
              {fetchingUsers ? (usersProgress ? `${usersProgress.done}/${usersProgress.total}` : 'Fetching...') : 'Fetch Users'}
            </button>
            <button onClick={() => setSelected(new Set())} className="px-3 py-1.5 bg-white/5 text-[#999] rounded-lg text-xs font-medium hover:bg-white/10 transition-colors">Deselect</button>
          </div>
          <div className="px-3 pb-3">
            <AiBulkActions
              selectedIds={selected}
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
        </div>
      )}

      {/* Fetch Users standalone */}
      {!loading && groups.length > 0 && selected.size === 0 && (
        <div className="mb-4 flex gap-2">
          <button
            onClick={fetchTelegramUsers}
            disabled={fetchingUsers}
            className="px-4 py-2 rounded-lg text-xs font-bold bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-all disabled:opacity-50"
          >
            {fetchingUsers
              ? (usersProgress ? `Fetching users... ${usersProgress.done}/${usersProgress.total}` : 'Fetching users...')
              : `Fetch Users (${groups.filter(g => (g.memberCount || 0) === 0).length} missing)`
            }
          </button>
        </div>
      )}

      {/* Queue list */}
      {loading ? (
        <div className="text-center py-16 text-[#666]">Loading queue...</div>
      ) : groups.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">📭</div>
          <h3 className="text-lg font-bold text-[#666]">No scheduled groups</h3>
        </div>
      ) : (
        <>
          {Object.entries(grouped).map(([date, dateGroups]) => (
            <div key={date} className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-[#999]">{date} — {dateGroups.length} group{dateGroups.length !== 1 ? 's' : ''}</h3>
                {dateGroups[0]?.importBatchId && <button onClick={() => cancelBatch(dateGroups[0].importBatchId!)} className="text-xs text-red-400 hover:text-red-300 transition-colors">Cancel batch</button>}
              </div>
              <div className="space-y-2">
                {dateGroups.map(g => (
                  <div key={g._id} className={`rounded-xl border transition-colors ${g.premiumOnly ? 'bg-amber-500/[0.03] border-amber-500/10' : 'bg-white/[0.02] border-white/5'}`}>
                    <div className="flex items-center gap-2.5 p-3">
                      <input type="checkbox" checked={selected.has(g._id)} onChange={() => toggleSelect(g._id)} className="accent-[#b31b1b] shrink-0" />
                      <button
                        onClick={() => {
                          if (reschedulingGroup === g._id) { setReschedulingGroup(null); setRescheduleValue(''); }
                          else {
                            setReschedulingGroup(g._id);
                            const d = g.scheduledPublishAt ? new Date(g.scheduledPublishAt) : new Date();
                            const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                            setRescheduleValue(local);
                          }
                        }}
                        className={`text-xs font-mono min-w-[52px] transition-colors ${reschedulingGroup === g._id ? 'text-purple-400' : 'text-[#b31b1b] hover:text-white cursor-pointer'}`}
                        title="Click to reschedule"
                      >
                        {g.scheduledPublishAt ? new Date(g.scheduledPublishAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </button>
                      {g.image && g.image !== '/assets/image.jpg' ? (
                        <img src={g.image} alt="" className="w-8 h-8 rounded-full object-cover border border-white/10 shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] text-[#444] shrink-0">?</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">
                          {g.name}
                          {g.premiumOnly && <span className="ml-1.5 text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-bold">VAULT</span>}
                        </div>
                        <div className="text-xs text-[#666] truncate">
                          {g.category} · <span className={`font-medium ${(g.memberCount || 0) === 0 ? 'text-red-400/60' : (g.memberCount || 0) < 50 ? 'text-red-400' : (g.memberCount || 0) < 500 ? 'text-yellow-400' : 'text-green-400'}`}>{g.memberCount > 0 ? `${g.memberCount.toLocaleString()} members` : '0 members'}</span>
                          {g.description ? ` — ${g.description.slice(0, 60)}${g.description.length > 60 ? '...' : ''}` : ''}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {g.telegramLink && (
                          <a href={g.telegramLink} target="_blank" rel="noopener noreferrer" className="px-2 py-1 bg-blue-500/10 text-blue-400 rounded-lg text-[10px] font-medium hover:bg-blue-500/20 transition-colors" title={g.telegramLink}>↗</a>
                        )}
                        <button onClick={() => openEnrich([g])} className="px-2 py-1 text-[10px] text-purple-400 bg-purple-500/10 rounded-lg hover:bg-purple-500/20 transition-colors" title="AI Enrich">✦</button>
                        <button onClick={() => {
                          if (editingGroup === g._id) { setEditingGroup(null); setEditValues({}); }
                          else { setEditingGroup(g._id); setEditValues({ name: g.name, category: g.category, country: g.country, description: g.description }); }
                        }} className={`px-2 py-1 text-[10px] rounded-lg transition-colors ${editingGroup === g._id ? 'text-[#b31b1b] bg-[#b31b1b]/10' : 'text-[#666] bg-white/5 hover:bg-white/10 hover:text-white'}`} title="Edit">✎</button>
                        <button onClick={() => publishNow(g._id)} className="px-2.5 py-1 bg-green-500/15 text-green-400 rounded-lg text-[10px] font-medium hover:bg-green-500/25 transition-colors">Publish</button>
                        <button onClick={() => cancelGroup(g._id)} className="text-[10px] text-[#666] hover:text-red-400 transition-colors px-1.5 py-1">✕</button>
                      </div>
                    </div>

                    {reschedulingGroup === g._id && (
                      <div className="px-3 pb-3 flex items-center gap-2 border-t border-white/5 pt-2">
                        <span className="text-[10px] text-[#666] uppercase tracking-wider">Reschedule to:</span>
                        <input type="datetime-local" value={rescheduleValue} onChange={(e) => setRescheduleValue(e.target.value)} className="px-2 py-1 bg-[#1a1a1a] border border-white/10 rounded-lg text-xs text-white outline-none focus:border-purple-500/50 [color-scheme:dark]" />
                        <button onClick={() => reschedule(g._id)} className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-lg text-xs font-medium hover:bg-purple-500/30 transition-colors">Save</button>
                        <button onClick={() => { setReschedulingGroup(null); setRescheduleValue(''); }} className="text-xs text-[#666] hover:text-white transition-colors">Cancel</button>
                      </div>
                    )}

                    {editingGroup === g._id && (
                      <div className="px-3 pb-3 border-t border-white/5 pt-3">
                        <div className="grid grid-cols-3 gap-2 mb-2">
                          <div>
                            <label className="text-[10px] text-[#666] uppercase tracking-wider mb-0.5 block">Name</label>
                            <input value={editValues.name ?? g.name} onChange={(e) => setEditValues(prev => ({ ...prev, name: e.target.value }))} className="w-full px-2 py-1.5 bg-[#1a1a1a] border border-white/10 rounded-lg text-xs text-white outline-none focus:border-[#b31b1b]/50" />
                          </div>
                          <div>
                            <label className="text-[10px] text-[#666] uppercase tracking-wider mb-0.5 block">Category</label>
                            <select value={editValues.category || g.category} onChange={(e) => setEditValues(prev => ({ ...prev, category: e.target.value }))} className="w-full px-2 py-1.5 bg-[#1a1a1a] border border-white/10 rounded-lg text-xs text-white outline-none focus:border-[#b31b1b]/50">
                              <option value="">Category...</option>
                              {filterCategories.filter(c => c !== 'All').map(cat => <option key={cat} value={cat}>{cat}</option>)}
                            </select>
                          </div>
                        </div>
                        <div className="mb-2">
                          <label className="text-[10px] text-[#666] uppercase tracking-wider mb-0.5 block">Description</label>
                          <textarea value={editValues.description ?? g.description} onChange={(e) => setEditValues(prev => ({ ...prev, description: e.target.value }))} rows={3} className="w-full px-2 py-1.5 bg-[#1a1a1a] border border-white/10 rounded-lg text-xs text-white outline-none focus:border-[#b31b1b]/50 resize-y" />
                        </div>
                        <div className="flex justify-end gap-2">
                          <button onClick={() => { setEditingGroup(null); setEditValues({}); }} className="px-3 py-1 rounded-lg text-xs text-[#999] bg-white/5 hover:bg-white/10 transition-colors">Cancel</button>
                          <button onClick={() => saveEdit(g._id)} className="px-3 py-1 rounded-lg text-xs text-white bg-[#b31b1b] hover:bg-[#c42b2b] transition-colors font-medium">Save</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </>
      )}

      <div className="flex justify-center mt-6">
        <button onClick={loadQueue} className="px-4 py-2 rounded-xl text-sm font-medium bg-white/5 hover:bg-white/10 transition-colors">↻ Refresh Queue</button>
      </div>

      <AiEnrichModal
        isOpen={enrichOpen}
        onClose={() => { setEnrichOpen(false); setEnrichGroups([]); }}
        groups={enrichGroups}
        onSaved={(results) => {
          setGroups(prev => prev.map(g => {
            const enriched = results[g._id];
            return enriched ? { ...g, description: enriched } : g;
          }));
        }}
      />
    </div>
  );
}
