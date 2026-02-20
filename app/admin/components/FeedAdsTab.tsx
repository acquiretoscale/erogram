'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';

const FEED_SLOT_MAX = 12;

type CampaignRow = {
  _id: string;
  name: string;
  slot: string;
  creative: string;
  destinationUrl: string;
  startDate: string;
  endDate: string;
  status: string;
  isVisible: boolean;
  clicks: number;
  position: number | null;
  feedTier: number | null;
  tierSlot: number | null;
  description: string;
  buttonText: string;
  advertiserId: string;
  advertiserName?: string;
  feedPlacement?: 'groups' | 'bots' | 'both';
};

function slotToPosition(slot: number): number {
  return Math.min(Math.max(1, slot), FEED_SLOT_MAX);
}

function positionToSlot(position: number | null): number {
  if (position == null || position < 1) return 1;
  return Math.min(position, FEED_SLOT_MAX);
}

export default function FeedAdsTab() {
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [advertisers, setAdvertisers] = useState<Array<{ _id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<CampaignRow | null | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    slot: 1,
    name: '',
    creative: '',
    destinationUrl: '',
    description: '',
    buttonText: 'Visit Site',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    status: 'active' as string,
    isVisible: true,
    feedPlacement: 'both' as 'groups' | 'bots' | 'both',
  });

  const authHeaders = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
  });

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get('/api/admin/advertisers-dashboard', authHeaders());
      const allCampaigns: CampaignRow[] = res.data.campaigns ?? [];
      const feedOnly = allCampaigns.filter((c) => c.slot === 'feed');
      feedOnly.sort((a, b) => (a.position ?? 999) - (b.position ?? 999));
      setCampaigns(feedOnly);
      setAdvertisers(res.data.advertisers ?? []);
    } catch (err: any) {
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        window.location.reload();
        return;
      }
      setError(err.response?.data?.message || err.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openEdit = (c: CampaignRow) => {
    setEditing(c);
    setForm({
      slot: positionToSlot(c.position),
      name: c.name,
      creative: c.creative || '',
      destinationUrl: c.destinationUrl || '',
      description: c.description || '',
      buttonText: c.buttonText || 'Visit Site',
      startDate: c.startDate?.slice(0, 10) || new Date().toISOString().slice(0, 10),
      endDate: c.endDate?.slice(0, 10) || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      status: c.status || 'active',
      isVisible: c.isVisible !== false,
      feedPlacement: (c.feedPlacement || 'both') as 'groups' | 'bots' | 'both',
    });
  };

  const openNew = () => {
    const usedSlots = new Set(campaigns.map((c) => positionToSlot(c.position)));
    let nextSlot = 1;
    while (usedSlots.has(nextSlot) && nextSlot <= FEED_SLOT_MAX) nextSlot++;
    setEditing(null);
    setForm({
      slot: nextSlot > FEED_SLOT_MAX ? 1 : nextSlot,
      name: '',
      creative: '',
      destinationUrl: '',
      description: '',
      buttonText: 'Visit Site',
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      status: 'active',
      isVisible: true,
    });
  };

  const closeForm = () => {
    setEditing(undefined);
  };

  const save = async () => {
    if (!form.name?.trim()) {
      alert('Name is required');
      return;
    }
    if (!form.destinationUrl?.trim().startsWith('http')) {
      alert('Destination URL must start with http:// or https://');
      return;
    }
    if (!form.creative?.trim() && !editing?.creative) {
      alert('Image is required');
      return;
    }
    setSaving(true);
    try {
      let position = slotToPosition(form.slot);
      const feedTier = Math.ceil(position / 4) as 1 | 2 | 3;
      const tierSlot = ((position - 1) % 4) + 1;
      const usedTierSlot = new Set(campaigns.filter((c) => c._id !== editing?._id).map((c) => `${c.feedTier}-${c.tierSlot}`));
      let key = `${feedTier}-${tierSlot}`;
      if (!editing && usedTierSlot.has(key)) {
        for (let p = 1; p <= FEED_SLOT_MAX; p++) {
          const t = Math.ceil(p / 4);
          const s = ((p - 1) % 4) + 1;
          if (!usedTierSlot.has(`${t}-${s}`)) {
            position = p;
            key = `${t}-${s}`;
            break;
          }
        }
      }
      const finalTier = Math.ceil(position / 4) as 1 | 2 | 3;
      const finalSlot = ((position - 1) % 4) + 1;
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        slot: 'feed',
        creative: form.creative?.trim() || (editing?.creative ?? ''),
        destinationUrl: form.destinationUrl.trim(),
        startDate: form.startDate,
        endDate: form.endDate,
        status: form.status,
        isVisible: form.isVisible,
        position,
        description: form.description?.trim() ?? '',
        buttonText: form.buttonText?.trim() || 'Visit Site',
        feedPlacement: form.feedPlacement || 'both',
      };
      // When editing, do NOT send feedTier/tierSlot so we don't hit the unique index; backend leaves them unchanged
      if (!editing) {
        payload.feedTier = finalTier;
        payload.tierSlot = finalSlot;
      }
      if (editing) {
        const res = await axios.put(`/api/admin/campaigns/${editing._id}`, payload, authHeaders());
        if (res.status !== 200) throw new Error(res.data?.message || 'Update failed');
      } else {
        const advertiserId = advertisers[0]?._id;
        if (!advertiserId) {
          alert('Create an Advertiser first (Advertisers tab).');
          setSaving(false);
          return;
        }
        await axios.post('/api/admin/campaigns', { ...payload, advertiserId }, authHeaders());
      }
      await fetchData();
      setEditing(undefined);
      alert('Saved. Refresh the Groups page (or open it in a new tab) to see changes.');
    } catch (err: any) {
      const msg = err.response?.data?.message ?? err.response?.data?.error ?? err.message ?? 'Save failed';
      console.error('Feed ad save error:', err.response?.data ?? err);
      alert(typeof msg === 'string' ? msg : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Remove this ad from the feed?')) return;
    try {
      await axios.delete(`/api/admin/campaigns/${id}`, authHeaders());
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Delete failed');
    }
  };

  const displayList = campaigns.slice(0, FEED_SLOT_MAX);

  if (loading) {
    return (
      <div className="p-6 text-center text-[#999]">Loading feed ads…</div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-white mb-1">Feed Ads</h1>
        <p className="text-[#999] text-sm">
          Feed ads show one ad every 5 entries on Groups and/or Bots (set “Show on” per ad). Slots 1–{FEED_SLOT_MAX} by priority. Edit → Save = updates on the site.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">{error}</div>
      )}

      {editing !== undefined && (
        <div className="glass rounded-2xl border border-white/10 p-6">
          <h2 className="text-xl font-bold text-white mb-4">{editing ? 'Edit feed ad' : 'New feed ad'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-[#999] mb-1">Slot (1–{FEED_SLOT_MAX}) *</label>
              <input
                type="number"
                min={1}
                max={FEED_SLOT_MAX}
                value={form.slot}
                onChange={(e) => setForm({ ...form, slot: Math.max(1, Math.min(FEED_SLOT_MAX, parseInt(e.target.value, 10) || 1)) })}
                className="w-full p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#999] mb-1">Name *</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white"
                placeholder="Ad title"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-[#999] mb-1">Image URL *</label>
              <input
                value={form.creative}
                onChange={(e) => setForm({ ...form, creative: e.target.value })}
                className="w-full p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white"
                placeholder="https://... or upload in Advertisers tab and paste URL"
              />
              {form.creative && (
                <img src={form.creative} alt="" className="mt-2 h-20 w-32 object-cover rounded-lg" />
              )}
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-[#999] mb-1">Destination URL *</label>
              <input
                value={form.destinationUrl}
                onChange={(e) => setForm({ ...form, destinationUrl: e.target.value })}
                className="w-full p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white"
                placeholder="https://..."
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-[#999] mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                className="w-full p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white resize-none"
                placeholder="Short text on the card"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#999] mb-1">Button text</label>
              <input
                value={form.buttonText}
                onChange={(e) => setForm({ ...form, buttonText: e.target.value })}
                className="w-full p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white"
                placeholder="Visit Site"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#999] mb-1">Show on</label>
              <select
                value={form.feedPlacement}
                onChange={(e) => setForm({ ...form, feedPlacement: e.target.value as 'groups' | 'bots' | 'both' })}
                className="w-full p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white"
              >
                <option value="both">Groups + Bots</option>
                <option value="groups">Groups only</option>
                <option value="bots">Bots only</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#999] mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white"
              >
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="ended">Ended</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#999] mb-1">Start date</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="w-full p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#999] mb-1">End date</label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className="w-full p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white"
              />
            </div>
          </div>
          <div className="flex items-center gap-3 mt-6">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="px-6 py-3 bg-[#b31b1b] hover:bg-[#c42b2b] disabled:opacity-50 text-white rounded-xl font-bold"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button type="button" onClick={closeForm} className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <p className="text-[#999] text-sm">Showing up to {FEED_SLOT_MAX} feed slots. Only these appear on Groups/Bots.</p>
        <button onClick={openNew} className="px-6 py-3 bg-[#b31b1b] hover:bg-[#c42b2b] text-white rounded-xl font-bold">
          + New feed ad
        </button>
      </div>

      <div className="rounded-xl border border-white/10 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-white/5">
            <tr>
              <th className="px-4 py-3 text-[#999] font-semibold">Slot</th>
              <th className="px-4 py-3 text-[#999] font-semibold">Image</th>
              <th className="px-4 py-3 text-[#999] font-semibold">Name</th>
              <th className="px-4 py-3 text-[#999] font-semibold">Show on</th>
              <th className="px-4 py-3 text-[#999] font-semibold">Button</th>
              <th className="px-4 py-3 text-[#999] font-semibold">Status</th>
              <th className="px-4 py-3 text-[#999] font-semibold text-right">Clicks</th>
              <th className="px-4 py-3 text-[#999] font-semibold"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {displayList.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-[#666]">
                  No feed ads yet. Click “New feed ad” to add one.
                </td>
              </tr>
            ) : (
              displayList.map((c) => (
                <tr key={c._id} className="hover:bg-white/5">
                  <td className="px-4 py-3 font-bold text-white">{positionToSlot(c.position)}</td>
                  <td className="px-4 py-3">
                    {c.creative ? (
                      <img src={c.creative} alt="" className="h-12 w-16 object-cover rounded" />
                    ) : (
                      <span className="text-[#666]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-white">{c.name}</td>
                  <td className="px-4 py-3 text-[#999]">{c.feedPlacement === 'both' ? 'Groups + Bots' : c.feedPlacement === 'groups' ? 'Groups' : 'Bots'}</td>
                  <td className="px-4 py-3 text-[#999]">{c.buttonText || 'Visit Site'}</td>
                  <td className="px-4 py-3">
                    <span className={c.status === 'active' ? 'text-green-400' : 'text-[#666]'}>{c.status}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-white">{(c.clicks ?? 0).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => openEdit(c)} className="text-[#b31b1b] hover:underline mr-3">Edit</button>
                    <button onClick={() => remove(c._id)} className="text-red-400 hover:underline">Delete</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
