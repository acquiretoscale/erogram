'use client';

import { useEffect, useState } from 'react';

interface Group {
  _id: string;
  name: string;
  channelId: string;
  mediaFolder: string;
  defaultTemplate: any;
  enabled: boolean;
  botToken: string;
  creatorNiche?: string;
}

interface Template {
  _id: string;
  name: string;
}

interface GroupStat {
  _id: string;
  memberCount: number | null;
  isAdminOk: boolean | null;
  weekDelta: number | null;
  lastPostAt: string | null;
}

interface ScheduleSummary {
  groupId: string;
  mediaCount: number;
  promoCount: number;
  creatorCount: number;
  nextTimes: string[];
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [editing, setEditing] = useState<Partial<Group> | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Record<string, GroupStat>>({});
  const [folderCounts, setFolderCounts] = useState<Record<string, number>>({});
  const [scheduleSummary, setScheduleSummary] = useState<Record<string, ScheduleSummary>>({});
  const [fetchingInfo, setFetchingInfo] = useState(false);

  async function loadData() {
    const data = await fetch('/api/groups-page-data').then(r => r.json());
    setGroups(data.groups || []);
    setTemplates(data.templates || []);
    const rawFolders = data.folders || [];
    setFolders(Array.isArray(rawFolders) && rawFolders[0]?.name != null ? rawFolders.map((f: any) => f.name) : rawFolders);
    setStats(data.stats || {});
    setFolderCounts(data.folderCounts || {});

    const summaryMap: Record<string, ScheduleSummary> = {};
    for (const schedule of (data.schedules || [])) {
      const gIds = (schedule.groupIds || []).map((x: any) => x._id || x);
      const times = schedule.times?.length ? schedule.times : [schedule.time];
      for (const gid of gIds) {
        if (!summaryMap[gid]) summaryMap[gid] = { groupId: gid, mediaCount: 0, promoCount: 0, creatorCount: 0, nextTimes: [] };
        if (schedule.postType === 'media') summaryMap[gid].mediaCount += times.length;
        else if (schedule.postType === 'creator') summaryMap[gid].creatorCount += times.length;
        else summaryMap[gid].promoCount += times.length;
        summaryMap[gid].nextTimes.push(...times);
      }
    }
    setScheduleSummary(summaryMap);
    setLoading(false);
  }

  async function fetchLiveInfo() {
    setFetchingInfo(true);
    const s = await fetch('/api/stats?live=1').then(r => r.json());
    const statsMap: Record<string, GroupStat> = {};
    for (const stat of (s.groups || [])) statsMap[stat._id] = stat;
    setStats(statsMap);
    setFetchingInfo(false);
  }

  useEffect(() => { loadData(); }, []);

  async function handleSave() {
    if (!editing) return;
    const isNew = !editing._id;
    const method = isNew ? 'POST' : 'PUT';
    await fetch('/api/groups', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editing) });
    setEditing(null);
    loadData();
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this group?')) return;
    await fetch(`/api/groups?id=${id}`, { method: 'DELETE' });
    loadData();
  }

  async function handleTestPost(group: Group) {
    if (!confirm(`Send a test post to "${group.name}"?`)) return;
    const res = await fetch('/api/post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupId: group._id, postType: 'media' }),
    });
    const data = await res.json();
    const r = data.results?.[0];
    alert(r?.status === 'success' ? `Posted to ${group.name}!` : `Error: ${r?.error || 'Unknown'}`);
  }

  if (loading) return <p className="text-[#888]">Loading...</p>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold">Groups / Channels</h2>
        <div className="flex gap-2">
          <button
            onClick={fetchLiveInfo}
            disabled={fetchingInfo}
            className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-[#111] border border-white/10 text-white rounded-lg text-sm hover:bg-white/5 transition disabled:opacity-50"
          >
            {fetchingInfo ? 'Fetching...' : '↻ Live Stats'}
          </button>
          <button
            onClick={() => setEditing({ _id: undefined as any, name: '', channelId: '', mediaFolder: '', enabled: true, botToken: '', creatorNiche: '' })}
            className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-[#b31b1b] text-white rounded-lg text-sm font-medium hover:bg-[#d42020] transition"
          >
            + Add Group
          </button>
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/60 flex items-start sm:items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-4 sm:p-6 w-full max-w-md my-4 sm:my-8">
            <h3 className="text-lg font-semibold mb-4">{editing._id ? 'Edit Group' : 'New Group'}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-[#888] mb-1">Channel Name</label>
                <input
                  className="w-full p-2.5 bg-[#111] border border-white/10 rounded-lg text-white text-sm outline-none focus:ring-2 focus:ring-[#b31b1b]"
                  value={editing.name || ''}
                  onChange={e => setEditing({ ...editing, name: e.target.value })}
                  placeholder="e.g. Booty Bazaar"
                />
              </div>
              <div>
                <label className="block text-xs text-[#888] mb-1">Channel ID</label>
                <input
                  className="w-full p-2.5 bg-[#111] border border-white/10 rounded-lg text-white text-sm outline-none focus:ring-2 focus:ring-[#b31b1b]"
                  value={editing.channelId || ''}
                  onChange={e => setEditing({ ...editing, channelId: e.target.value })}
                  placeholder="e.g. -1001234567890"
                />
                <p className="text-xs text-[#666] mt-1">Get this from @userinfobot — forward any message from the channel to that bot</p>
              </div>
              <div>
                <label className="block text-xs text-[#888] mb-1">Media Folder</label>
                {!editing._id ? (
                  <>
                    <div className="flex gap-2 items-center">
                      <input
                        className="flex-1 p-2.5 bg-[#111] border border-white/10 rounded-lg text-white text-sm outline-none focus:ring-2 focus:ring-[#b31b1b] font-mono"
                        value={editing.mediaFolder || (editing.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}
                        onChange={e => setEditing({ ...editing, mediaFolder: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                        placeholder="auto-generated from name"
                      />
                    </div>
                    <p className="text-xs text-emerald-400/60 mt-1">A folder will be created automatically when you save</p>
                  </>
                ) : (
                  <>
                    <select
                      className="w-full p-2.5 bg-[#111] border border-white/10 rounded-lg text-white text-sm outline-none focus:ring-2 focus:ring-[#b31b1b]"
                      value={editing.mediaFolder || ''}
                      onChange={e => setEditing({ ...editing, mediaFolder: e.target.value })}
                    >
                      <option value="">— No folder assigned —</option>
                      {folders.map(f => (
                        <option key={f} value={f}>{f}/ {folderCounts[f] != null ? `(${folderCounts[f]} files)` : ''}</option>
                      ))}
                    </select>
                    <p className="text-xs text-[#666] mt-1">Media from this folder will be posted sequentially to this channel</p>
                  </>
                )}
              </div>
              <div>
                <label className="block text-xs text-[#888] mb-1">Creator niche <span className="text-[#555]">(OF category slug)</span></label>
                <input
                  className="w-full p-2.5 bg-[#111] border border-white/10 rounded-lg text-white text-sm outline-none focus:ring-2 focus:ring-[#b31b1b]"
                  value={editing.creatorNiche || ''}
                  onChange={e => setEditing({ ...editing, creatorNiche: e.target.value.toLowerCase().trim() })}
                  placeholder="e.g. asian, milf, latina, big-ass"
                />
                <p className="text-xs text-[#666] mt-1">Used for Creator schedules. Must match an Erogram category slug.</p>
              </div>
              <div>
                <label className="block text-xs text-[#888] mb-1">Bot Token <span className="text-[#555]">(override)</span></label>
                <input
                  className="w-full p-2.5 bg-[#111] border border-white/10 rounded-lg text-white text-sm font-mono outline-none focus:ring-2 focus:ring-[#b31b1b]"
                  value={editing.botToken || ''}
                  onChange={e => setEditing({ ...editing, botToken: e.target.value })}
                  placeholder="Leave empty to use default bot"
                  type="password"
                  autoComplete="off"
                />
                <p className="text-xs text-[#666] mt-1">
                  Optional — set a different bot token for this group. If empty, uses the default EroGroupManagerBot.
                </p>
              </div>
              <div>
                <label className="block text-xs text-[#888] mb-1">Default Template <span className="text-[#555]">(for Promo posts)</span></label>
                <select
                  className="w-full p-2.5 bg-[#111] border border-white/10 rounded-lg text-white text-sm outline-none focus:ring-2 focus:ring-[#b31b1b]"
                  value={editing.defaultTemplate?._id || editing.defaultTemplate || ''}
                  onChange={e => setEditing({ ...editing, defaultTemplate: e.target.value || null })}
                >
                  <option value="">— None —</option>
                  {templates.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                </select>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editing.enabled !== false}
                  onChange={e => setEditing({ ...editing, enabled: e.target.checked })}
                  className="accent-[#b31b1b]"
                />
                <span className="text-sm">Enabled</span>
              </label>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditing(null)} className="flex-1 py-2.5 border border-white/10 rounded-lg text-sm hover:bg-white/5 transition">Cancel</button>
              <button onClick={handleSave} className="flex-1 py-2.5 bg-[#b31b1b] rounded-lg text-sm font-medium hover:bg-[#d42020] transition">Save</button>
            </div>
          </div>
        </div>
      )}

      {groups.length === 0 ? (
        <div className="text-center py-16 text-[#888]">
          <p className="text-lg mb-2">No groups yet</p>
          <p className="text-sm">Click "+ Add Group" to add your Telegram channels</p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map(g => {
            const stat = stats[g._id];
            const members = stat?.memberCount;
            const isAdmin = stat?.isAdminOk;
            const delta = stat?.weekDelta;
            const schSum = scheduleSummary[g._id];
            return (
            <div key={g._id} className="bg-[#111] border border-white/10 rounded-xl p-3 sm:p-4">
              <div className="flex items-start sm:items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${g.enabled ? 'bg-green-500' : 'bg-gray-500'}`} />
                  <h3 className="font-semibold text-sm truncate">{g.name}</h3>
                  {isAdmin === false && (
                    <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 text-xs rounded shrink-0">Not admin</span>
                  )}
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button onClick={() => handleTestPost(g)} className="px-2 sm:px-3 py-1.5 text-xs bg-green-600/20 text-green-400 rounded-lg hover:bg-green-600/30 transition">Test</button>
                  <button onClick={() => setEditing(g)} className="px-2 sm:px-3 py-1.5 text-xs bg-white/5 rounded-lg hover:bg-white/10 transition">Edit</button>
                  <button onClick={() => handleDelete(g._id)} className="px-2 sm:px-3 py-1.5 text-xs bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition hidden sm:block">Del</button>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap text-xs text-[#888] items-center">
                {members != null && (
                  <span className="text-white font-semibold">
                    {members >= 1000 ? (members / 1000).toFixed(1) + 'K' : members.toLocaleString()} members
                    {delta !== null && delta !== undefined && (
                      <span className={`ml-1 font-normal ${delta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {delta >= 0 ? '+' : ''}{delta}
                      </span>
                    )}
                  </span>
                )}
                <span className="hidden sm:inline">ID: <span className="text-[#aaa]">{g.channelId}</span></span>
                {g.mediaFolder ? (
                  <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-400 rounded">
                    📁 {g.mediaFolder}/ <span className="text-blue-300 font-semibold">{folderCounts[g.mediaFolder] ?? '?'}</span>
                  </span>
                ) : (
                  <span className="text-[#555]">no folder</span>
                )}
                {g.creatorNiche && (
                  <span className="px-1.5 py-0.5 bg-pink-500/10 text-pink-400 rounded">
                    niche: {g.creatorNiche}
                  </span>
                )}
                {g.botToken && (
                  <span className="px-1.5 py-0.5 bg-cyan-500/10 text-cyan-400 rounded">Custom bot</span>
                )}
                {schSum ? (
                  <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 rounded">
                    {schSum.mediaCount + schSum.promoCount + schSum.creatorCount}x/day
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 bg-yellow-500/10 text-yellow-500/60 rounded">no schedule</span>
                )}
              </div>
            </div>
          );
          })}
        </div>
      )}
    </div>
  );
}
