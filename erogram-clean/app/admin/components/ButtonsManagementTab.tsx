'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';

const CTA_SLOTS = ['navbar-cta', 'join-cta', 'filter-cta'] as const;
type CtaSlot = (typeof CTA_SLOTS)[number];

const SLOT_LABELS: Record<CtaSlot, string> = {
  'navbar-cta': 'Menu bar (top of every page)',
  'join-cta': 'Join page (bottom CTA)',
  'filter-cta': 'Filter (Groups & Bots sidebar)',
};

const SLOT_WHERE: Record<CtaSlot, string> = {
  'navbar-cta': 'Shows in the top navbar next to Add / Advertisers.',
  'join-cta': 'Shows at the bottom of the Join page.',
  'filter-cta': 'Shows inside the filter panel, below Browse by Country (Groups and Bots pages).',
};

const SLOT_LIMITS: Record<CtaSlot, number> = {
  'navbar-cta': 1,
  'join-cta': 1,
  'filter-cta': 1,
};

interface AdvertiserRow {
  _id: string;
  name: string;
}

interface ButtonCampaign {
  _id: string;
  advertiserId: string;
  advertiserName: string;
  name: string;
  slot: CtaSlot;
  destinationUrl: string;
  startDate: string;
  endDate: string;
  status: string;
  description: string;
  buttonText: string;
  clicks: number;
}

interface SlotInfo {
  slot: string;
  max: number;
  active: number;
  remaining: number;
}

function getToken() {
  return localStorage.getItem('token') || '';
}

function authHeaders() {
  return { headers: { Authorization: `Bearer ${getToken()}` } };
}

function formatDate(iso: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function toInputDate(iso: string) {
  if (!iso) return '';
  return new Date(iso).toISOString().slice(0, 10);
}

export default function ButtonsManagementTab() {
  const [advertisers, setAdvertisers] = useState<AdvertiserRow[]>([]);
  const [campaigns, setCampaigns] = useState<ButtonCampaign[]>([]);
  const [slotCapacity, setSlotCapacity] = useState<SlotInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [formOpen, setFormOpen] = useState<'add' | 'edit' | null>(null);
  const [formSlot, setFormSlot] = useState<CtaSlot | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    slot: 'navbar-cta' as CtaSlot,
    advertiserId: '',
    name: '',
    buttonLabel: '',
    destinationUrl: '',
    startDate: toInputDate(new Date().toISOString()),
    endDate: toInputDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()),
  });

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get('/api/admin/advertisers-dashboard', authHeaders());
      const allCampaigns: ButtonCampaign[] = (res.data.campaigns || []).filter((c: { slot: string }) =>
        CTA_SLOTS.includes(c.slot as CtaSlot)
      );
      const allSlots: SlotInfo[] = (res.data.slots || []).filter((s: { slot: string }) =>
        CTA_SLOTS.includes(s.slot as CtaSlot)
      );
      setAdvertisers(res.data.advertisers || []);
      setCampaigns(allCampaigns);
      setSlotCapacity(allSlots.length > 0 ? allSlots : CTA_SLOTS.map((slot) => ({
        slot,
        max: SLOT_LIMITS[slot],
        active: allCampaigns.filter((c) => c.slot === slot).length,
        remaining: SLOT_LIMITS[slot] - allCampaigns.filter((c) => c.slot === slot).length,
      })));
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getRemaining = (slot: CtaSlot) => {
    const cap = slotCapacity.find((s) => s.slot === slot);
    if (cap) return cap.remaining;
    const used = campaigns.filter((c) => c.slot === slot).length;
    return SLOT_LIMITS[slot] - used;
  };

  const openAdd = (slot: CtaSlot) => {
    setEditingId(null);
    setFormSlot(slot);
    setForm({
      slot,
      advertiserId: advertisers[0]?._id ?? '',
      name: '',
      buttonLabel: '',
      destinationUrl: '',
      startDate: toInputDate(new Date().toISOString()),
      endDate: toInputDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()),
    });
    setFormOpen('add');
    setSaveError('');
  };

  const openEdit = (camp: ButtonCampaign) => {
    setEditingId(camp._id);
    setFormSlot(camp.slot);
    setForm({
      slot: camp.slot,
      advertiserId: camp.advertiserId,
      name: camp.name,
      buttonLabel: camp.description || camp.buttonText || '',
      destinationUrl: camp.destinationUrl || '',
      startDate: toInputDate(camp.startDate),
      endDate: toInputDate(camp.endDate),
    });
    setFormOpen('edit');
    setSaveError('');
  };

  const closeForm = () => {
    setFormOpen(null);
    setFormSlot(null);
    setEditingId(null);
    setSaveError('');
  };

  const saveButton = async () => {
    const label = (form.buttonLabel || '').trim();
    if (!label) {
      setSaveError('Button label is required.');
      return;
    }
    if (!(form.destinationUrl || '').trim()) {
      setSaveError('Destination URL is required.');
      return;
    }
    if (!form.advertiserId) {
      setSaveError('Advertiser is required.');
      return;
    }

    setSaving(true);
    setSaveError('');

    try {
      if (formOpen === 'edit' && editingId) {
        await axios.put(
          `/api/admin/campaigns/${editingId}`,
          {
            advertiserId: form.advertiserId,
            name: form.name.trim() || label,
            slot: form.slot,
            destinationUrl: form.destinationUrl.trim(),
            description: label,
            buttonText: label,
            startDate: form.startDate,
            endDate: form.endDate,
            creative: '',
          },
          authHeaders()
        );
      } else {
        await axios.post(
          '/api/admin/campaigns',
          {
            advertiserId: form.advertiserId,
            name: form.name.trim() || label,
            slot: form.slot,
            destinationUrl: form.destinationUrl.trim(),
            description: label,
            buttonText: label,
            startDate: form.startDate,
            endDate: form.endDate,
            creative: '',
          },
          authHeaders()
        );
      }
      closeForm();
      await fetchData();
    } catch (err: any) {
      setSaveError(err.response?.data?.message || err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const deleteButton = async (id: string) => {
    if (!confirm('Delete this button?')) return;
    try {
      await axios.delete(`/api/admin/campaigns/${id}`, authHeaders());
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Delete failed');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-[#999]">Loading buttons…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-red-400">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-white">Buttons Management</h1>
        <p className="text-[#999] mt-1">Text-only CTA buttons (no images). Each slot appears in a different place — set the one that matches where you want the button to show.</p>
      </div>

      {/* Three sections: Navbar, Join, Below filter */}
      <div className="grid gap-6">
        {CTA_SLOTS.map((slot) => {
          const list = campaigns.filter((c) => c.slot === slot);
          const remaining = getRemaining(slot);
          const max = SLOT_LIMITS[slot];

          return (
            <div key={slot} className="glass rounded-2xl border border-white/5 overflow-hidden">
              <div className="p-4 border-b border-white/5 bg-white/[0.02]">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-white">{SLOT_LABELS[slot]}</h2>
                  <span className="text-xs text-[#999]">
                    {list.length}/{max} used
                  </span>
                </div>
                <p className="text-xs text-[#888] mt-1.5">{SLOT_WHERE[slot]}</p>
              </div>
              <div className="p-4 space-y-3">
                {list.length === 0 && (
                  <p className="text-[#666] text-sm">No button set.</p>
                )}
                {list.map((camp) => (
                  <div
                    key={camp._id}
                    className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-[#1a1a1a] border border-white/5"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-white truncate">
                        {camp.description || camp.buttonText || 'Button'}
                      </p>
                      <p className="text-xs text-[#999] truncate" title={camp.destinationUrl}>
                        {camp.destinationUrl}
                      </p>
                      <p className="text-xs text-[#666] mt-0.5">
                        {formatDate(camp.startDate)} – {formatDate(camp.endDate)}
                        {camp.clicks != null && camp.clicks > 0 && ` · ${camp.clicks} clicks`}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEdit(camp)}
                        className="px-3 py-1.5 text-sm bg-white/10 hover:bg-white/20 text-white rounded-lg"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteButton(camp._id)}
                        className="px-3 py-1.5 text-sm bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
                {remaining > 0 && (
                  <button
                    type="button"
                    onClick={() => openAdd(slot)}
                    className="w-full py-3 rounded-xl border-2 border-dashed border-pink-500/40 text-pink-400 hover:bg-pink-500/10 text-sm font-medium transition-colors"
                  >
                    + Add button
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Form modal / panel */}
      {formOpen && formSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={closeForm}>
          <div
            className="glass rounded-2xl border border-white/10 p-6 w-full max-w-md shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-white mb-4">
              {formOpen === 'edit' ? 'Edit button' : 'Add button'} — {SLOT_LABELS[formSlot]}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#999] mb-1">Button label *</label>
                <input
                  type="text"
                  value={form.buttonLabel}
                  onChange={(e) => setForm({ ...form, buttonLabel: e.target.value })}
                  className="w-full p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:ring-2 focus:ring-pink-500 outline-none"
                  placeholder="e.g. Meet your AI"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#999] mb-1">Destination URL *</label>
                <input
                  type="url"
                  value={form.destinationUrl}
                  onChange={(e) => setForm({ ...form, destinationUrl: e.target.value })}
                  className="w-full p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:ring-2 focus:ring-pink-500 outline-none"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#999] mb-1">Advertiser *</label>
                <select
                  value={form.advertiserId}
                  onChange={(e) => setForm({ ...form, advertiserId: e.target.value })}
                  className="w-full p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-pink-500 outline-none"
                >
                  <option value="">Select</option>
                  {advertisers.map((a) => (
                    <option key={a._id} value={a._id}>{a.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#999] mb-1">Internal name (optional)</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:ring-2 focus:ring-pink-500 outline-none"
                  placeholder="e.g. Navbar CTA March"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-[#999] mb-1">Start date</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="w-full p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-pink-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#999] mb-1">End date</label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="w-full p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-pink-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {saveError && (
              <p className="mt-3 text-sm text-red-400">{saveError}</p>
            )}

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={closeForm}
                className="flex-1 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveButton}
                disabled={saving}
                className="flex-1 py-2.5 bg-pink-600 hover:bg-pink-500 text-white rounded-xl font-medium disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save button'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
