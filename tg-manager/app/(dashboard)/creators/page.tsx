'use client';

import { useEffect, useState } from 'react';

interface QueueItem { username: string; name: string }
interface Queue {
  _id: string;
  niche: string;
  items: QueueItem[];
  cursor: number;
}
interface Group {
  _id: string;
  name: string;
  creatorNiche?: string;
  enabled: boolean;
}

export default function CreatorsPage() {
  const [queues, setQueues] = useState<Queue[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [upcoming, setUpcoming] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [niche, setNiche] = useState('');
  const [usernamesText, setUsernamesText] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  async function load() {
    const data = await fetch('/api/creators').then(r => r.json());
    setQueues(data.queues || []);
    setGroups(data.groups || []);
    setUpcoming(data.upcoming || {});
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleAdd(mode: 'append' | 'replace') {
    if (!niche.trim()) {
      setMsg('Enter a niche slug first');
      return;
    }
    setSaving(true);
    setMsg('');
    const res = await fetch('/api/creators', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ niche, usernamesText, mode }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setMsg(data.error || 'Failed');
      return;
    }
    const parts = [`Added ${data.added}`];
    if (data.missing?.length) parts.push(`missing: ${data.missing.join(', ')}`);
    if (data.thinPhotos?.length) parts.push(`under 2 photos: ${data.thinPhotos.join(', ')}`);
    setMsg(parts.join(' · '));
    setUsernamesText('');
    load();
  }

  async function removeUsername(qNiche: string, username: string) {
    await fetch(`/api/creators?niche=${encodeURIComponent(qNiche)}&username=${encodeURIComponent(username)}`, {
      method: 'DELETE',
    });
    load();
  }

  async function resetCursor(qNiche: string) {
    await fetch('/api/creators', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ niche: qNiche, resetCursor: true }),
    });
    load();
  }

  async function deleteQueue(qNiche: string) {
    if (!confirm(`Delete curated list for ${qNiche}?`)) return;
    await fetch(`/api/creators?niche=${encodeURIComponent(qNiche)}`, { method: 'DELETE' });
    load();
  }

  if (loading) return <p className="text-[#888]">Loading...</p>;

  const nichesFromGroups = [...new Set(
    groups.map(g => (g.creatorNiche || '').trim().toLowerCase()).filter(Boolean)
  )];

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl sm:text-2xl font-bold">Creator Queues</h2>
        <p className="text-xs sm:text-sm text-[#888] mt-1">
          Curated lists per niche. Daily creator schedules pull the next username in order.
          If a niche has no list, it picks a random eligible creator from the Erogram DB.
        </p>
      </div>

      <div className="bg-[#111] border border-white/10 rounded-xl p-4 mb-6 space-y-3">
        <h3 className="font-semibold text-sm">Add to curated list</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-[#888] mb-1">Niche slug</label>
            <input
              list="niche-suggestions"
              className="w-full p-2.5 bg-[#0a0a0a] border border-white/10 rounded-lg text-white text-sm outline-none focus:ring-2 focus:ring-[#b31b1b]"
              value={niche}
              onChange={e => setNiche(e.target.value.toLowerCase().trim())}
              placeholder="asian"
            />
            <datalist id="niche-suggestions">
              {nichesFromGroups.map(n => <option key={n} value={n} />)}
              {queues.map(q => <option key={q.niche} value={q.niche} />)}
            </datalist>
          </div>
          <div>
            <label className="block text-xs text-[#888] mb-1">Usernames (one per line)</label>
            <textarea
              className="w-full p-2.5 bg-[#0a0a0a] border border-white/10 rounded-lg text-white text-sm outline-none focus:ring-2 focus:ring-[#b31b1b] min-h-[88px]"
              value={usernamesText}
              onChange={e => setUsernamesText(e.target.value)}
              placeholder={'creator1\ncreator2'}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            disabled={saving}
            onClick={() => handleAdd('append')}
            className="px-3 py-2 bg-[#b31b1b] text-white rounded-lg text-sm hover:bg-[#d42020] disabled:opacity-50"
          >
            Append
          </button>
          <button
            disabled={saving}
            onClick={() => handleAdd('replace')}
            className="px-3 py-2 bg-white/5 text-white rounded-lg text-sm hover:bg-white/10 disabled:opacity-50"
          >
            Replace list
          </button>
        </div>
        {msg && <p className="text-xs text-[#aaa]">{msg}</p>}
      </div>

      {queues.length === 0 ? (
        <div className="bg-[#111] border border-dashed border-white/10 rounded-xl p-8 text-center text-[#666] text-sm">
          No curated lists yet. Add usernames above, or leave empty to use random from DB.
        </div>
      ) : (
        <div className="space-y-4">
          {queues.map(q => {
            const next = upcoming[q.niche];
            const linked = groups.filter(g => (g.creatorNiche || '').toLowerCase() === q.niche);
            return (
              <div key={q._id} className="bg-[#111] border border-white/10 rounded-xl p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div>
                    <h3 className="font-semibold text-pink-300">{q.niche}</h3>
                    <p className="text-xs text-[#666]">
                      {q.items.length} creators · cursor {q.cursor}
                      {next?.username ? ` · next @${next.username}` : ''}
                      {linked.length ? ` · groups: ${linked.map(g => g.name).join(', ')}` : ''}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => resetCursor(q.niche)} className="px-2 py-1 text-xs bg-white/5 rounded hover:bg-white/10">
                      Reset cursor
                    </button>
                    <button onClick={() => deleteQueue(q.niche)} className="px-2 py-1 text-xs bg-red-500/10 text-red-400 rounded hover:bg-red-500/20">
                      Delete
                    </button>
                  </div>
                </div>
                <ol className="space-y-1 max-h-64 overflow-y-auto">
                  {q.items.map((item, i) => (
                    <li
                      key={`${item.username}-${i}`}
                      className={`flex items-center justify-between gap-2 text-sm px-2 py-1.5 rounded ${
                        i === (q.cursor % Math.max(q.items.length, 1)) ? 'bg-pink-500/10 text-pink-200' : 'text-[#ccc]'
                      }`}
                    >
                      <span>
                        <span className="text-[#555] mr-2">{i + 1}.</span>
                        @{item.username}
                        {item.name && item.name !== item.username ? (
                          <span className="text-[#666] ml-2">{item.name}</span>
                        ) : null}
                        {i === (q.cursor % Math.max(q.items.length, 1)) ? (
                          <span className="ml-2 text-[10px] uppercase tracking-wide text-pink-400">next</span>
                        ) : null}
                      </span>
                      <button
                        onClick={() => removeUsername(q.niche, item.username)}
                        className="text-xs text-red-400/80 hover:text-red-300"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ol>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
