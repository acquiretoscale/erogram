'use client';

import { useState, useEffect, useCallback } from 'react';

interface CtaCampaign {
  _id: string;
  name: string;
  description: string;
  destinationUrl: string;
  status: 'active' | 'paused' | 'ended';
  clicks: number;
  clicksToday: number;
  clicks7d: number;
  clicks30d: number;
  startDate: string;
  endDate: string;
  advertiserId: string;
  createdAt: string;
}

interface Advertiser {
  _id: string;
  name: string;
}

const SLOT_META = {
  'join-cta': {
    label: 'Join Page CTA',
    icon: '💖',
    description: 'Shown on every individual group & bot page below the join button',
    color: 'from-purple-600 via-pink-600 to-rose-600',
    badge: 'bg-pink-500/15 text-pink-400 border-pink-500/20',
    defaultText: 'Build your own AI girlfriend 💖',
  },
  'navbar-cta': {
    label: 'Navbar CTA',
    icon: '📌',
    description: 'Shown in the top navigation bar on every page',
    color: 'from-pink-600 to-pink-500',
    badge: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
    defaultText: 'Meet your AI slut',
  },
} as const;

type Slot = keyof typeof SLOT_META;

function StatPill({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`flex flex-col items-center px-3 py-2 rounded-lg ${highlight ? 'bg-green-500/10 border border-green-500/20' : 'bg-white/[0.04] border border-white/[0.07]'}`}>
      <span className={`text-lg font-black tabular-nums ${highlight ? 'text-green-400' : 'text-white'}`}>{value.toLocaleString()}</span>
      <span className="text-[10px] text-white/30 font-medium uppercase tracking-wide">{label}</span>
    </div>
  );
}

function CampaignCard({
  campaign,
  slot,
  onEdit,
  onToggle,
  onDelete,
}: {
  campaign: CtaCampaign;
  slot: Slot;
  onEdit: (c: CtaCampaign) => void;
  onToggle: (id: string, status: string) => void;
  onDelete: (id: string) => void;
}) {
  const meta = SLOT_META[slot];
  const isActive = campaign.status === 'active';

  return (
    <div className={`rounded-xl border p-4 transition-all ${isActive ? 'border-white/10 bg-white/[0.03]' : 'border-white/5 bg-white/[0.01] opacity-60'}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${isActive ? 'bg-green-500/15 text-green-400 border-green-500/25' : 'bg-white/5 text-white/30 border-white/10'}`}>
              {campaign.status}
            </span>
            <span className="text-xs text-white/30 truncate">{campaign.name}</span>
          </div>

          {/* Button preview */}
          <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold text-white bg-gradient-to-r ${meta.color} mb-2`}>
            {campaign.description || meta.defaultText}
          </div>

          <div className="flex items-center gap-1.5 text-xs text-white/40 mt-1">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            <a href={campaign.destinationUrl} target="_blank" rel="noopener noreferrer" className="truncate max-w-[260px] hover:text-white/60 transition-colors">
              {campaign.destinationUrl}
            </a>
          </div>
        </div>

        <div className="flex gap-1.5 shrink-0">
          <button
            onClick={() => onToggle(campaign._id, campaign.status)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${isActive ? 'bg-yellow-500/15 text-yellow-400 hover:bg-yellow-500/25' : 'bg-green-500/15 text-green-400 hover:bg-green-500/25'}`}
          >
            {isActive ? 'Pause' : 'Activate'}
          </button>
          <button
            onClick={() => onEdit(campaign)}
            className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-white/5 text-white/60 hover:bg-white/10 transition-all"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(campaign._id)}
            className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-2">
        <StatPill label="Total" value={campaign.clicks} />
        <StatPill label="Today" value={campaign.clicksToday} highlight={campaign.clicksToday > 0} />
        <StatPill label="7d" value={campaign.clicks7d} />
        <StatPill label="30d" value={campaign.clicks30d} />
      </div>
    </div>
  );
}

function EditModal({
  campaign,
  slot,
  onSave,
  onClose,
}: {
  campaign: CtaCampaign | null;
  slot: Slot;
  onSave: (data: Partial<CtaCampaign>) => Promise<void>;
  onClose: () => void;
}) {
  const [description, setDescription] = useState(campaign?.description || '');
  const [url, setUrl] = useState(campaign?.destinationUrl || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDescription(campaign?.description || '');
    setUrl(campaign?.destinationUrl || '');
  }, [campaign]);

  if (!campaign) return null;
  const meta = SLOT_META[slot];

  const handleSave = async () => {
    setSaving(true);
    await onSave({ description, destinationUrl: url });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[#111] border border-white/10 rounded-2xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-white mb-1">Edit {meta.label}</h3>
        <p className="text-xs text-white/30 mb-5">{meta.description}</p>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-1.5 block">Button Text</label>
            <input
              className="w-full px-3 py-2.5 rounded-lg bg-[#1a1a1a] border border-white/10 text-white text-sm outline-none focus:border-pink-500/50 transition-colors"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={meta.defaultText}
            />
            {/* Live preview */}
            <div className="mt-2">
              <span className="text-[10px] text-white/20 mb-1 block">Preview:</span>
              <div className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-bold text-white bg-gradient-to-r ${meta.color}`}>
                {description || meta.defaultText}
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-1.5 block">Destination URL</label>
            <input
              className="w-full px-3 py-2.5 rounded-lg bg-[#1a1a1a] border border-white/10 text-white text-sm outline-none focus:border-pink-500/50 transition-colors font-mono"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-bold bg-white/5 text-white/60 hover:bg-white/10 transition-all">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !url.trim()}
            className="flex-1 px-4 py-2.5 rounded-lg text-sm font-bold bg-pink-600 text-white hover:bg-pink-500 transition-all disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateModal({
  slot,
  advertisers,
  onSave,
  onClose,
}: {
  slot: Slot;
  advertisers: Advertiser[];
  onSave: (data: any) => Promise<void>;
  onClose: () => void;
}) {
  const meta = SLOT_META[slot];
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [advertiserId, setAdvertiserId] = useState(advertisers[0]?._id || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!url.trim() || !advertiserId) return;
    setSaving(true);
    await onSave({ name: name || description || 'CTA', description, destinationUrl: url, advertiserId, slot });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[#111] border border-white/10 rounded-2xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-white mb-1">New {meta.label}</h3>
        <p className="text-xs text-white/30 mb-5">{meta.description}</p>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-1.5 block">Button Text</label>
            <input
              className="w-full px-3 py-2.5 rounded-lg bg-[#1a1a1a] border border-white/10 text-white text-sm outline-none focus:border-pink-500/50 transition-colors"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={meta.defaultText}
            />
            <div className="mt-2">
              <span className="text-[10px] text-white/20 mb-1 block">Preview:</span>
              <div className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-bold text-white bg-gradient-to-r ${meta.color}`}>
                {description || meta.defaultText}
              </div>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-1.5 block">Destination URL</label>
            <input
              className="w-full px-3 py-2.5 rounded-lg bg-[#1a1a1a] border border-white/10 text-white text-sm outline-none focus:border-pink-500/50 transition-colors font-mono"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
          {advertisers.length > 0 && (
            <div>
              <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-1.5 block">Advertiser</label>
              <select
                className="w-full px-3 py-2.5 rounded-lg bg-[#1a1a1a] border border-white/10 text-white text-sm outline-none"
                value={advertiserId}
                onChange={e => setAdvertiserId(e.target.value)}
              >
                {advertisers.map(a => <option key={a._id} value={a._id}>{a.name}</option>)}
              </select>
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-6">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-bold bg-white/5 text-white/60 hover:bg-white/10 transition-all">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !url.trim()}
            className="flex-1 px-4 py-2.5 rounded-lg text-sm font-bold bg-pink-600 text-white hover:bg-pink-500 transition-all disabled:opacity-50"
          >
            {saving ? 'Creating...' : 'Create & Activate'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CtaManagerClient() {
  const [slots, setSlots] = useState<Record<Slot, CtaCampaign[]>>({ 'join-cta': [], 'navbar-cta': [] });
  const [advertisers, setAdvertisers] = useState<Advertiser[]>([]);
  const [loading, setLoading] = useState(true);
  const [editTarget, setEditTarget] = useState<{ campaign: CtaCampaign; slot: Slot } | null>(null);
  const [createSlot, setCreateSlot] = useState<Slot | null>(null);
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/cta', { headers });
      const data = await res.json();
      setSlots(data.slots || { 'join-cta': [], 'navbar-cta': [] });
      setAdvertisers(data.advertisers || []);
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleEdit = async (data: Partial<CtaCampaign>) => {
    if (!editTarget) return;
    await fetch('/api/admin/cta', { method: 'PUT', headers, body: JSON.stringify({ id: editTarget.campaign._id, ...data }) });
    setEditTarget(null);
    fetchData();
  };

  const handleCreate = async (data: any) => {
    await fetch('/api/admin/cta', { method: 'POST', headers, body: JSON.stringify(data) });
    setCreateSlot(null);
    fetchData();
  };

  const handleToggle = async (id: string, currentStatus: string) => {
    const next = currentStatus === 'active' ? 'paused' : 'active';
    await fetch('/api/admin/cta', { method: 'PUT', headers, body: JSON.stringify({ id, status: next }) });
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this CTA campaign and all its click history?')) return;
    await fetch('/api/admin/cta', { method: 'DELETE', headers, body: JSON.stringify({ id }) });
    fetchData();
  };

  const totalClicks = (slot: Slot) => slots[slot].reduce((s, c) => s + c.clicks, 0);
  const totalToday = (slot: Slot) => slots[slot].reduce((s, c) => s + c.clicksToday, 0);

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-white flex items-center gap-2 mb-1">
          <span>🎯</span> CTA Manager
        </h1>
        <p className="text-sm text-white/30">Manage the affiliate/partner buttons shown across the site. Changes go live immediately.</p>
      </div>

      {loading ? (
        <div className="text-center py-20 text-white/30">Loading...</div>
      ) : (
        <div className="space-y-10">
          {(Object.keys(SLOT_META) as Slot[]).map(slot => {
            const meta = SLOT_META[slot];
            const campaigns = slots[slot];
            const active = campaigns.find(c => c.status === 'active');

            return (
              <section key={slot}>
                {/* Slot header */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xl">{meta.icon}</span>
                      <h2 className="text-lg font-black text-white">{meta.label}</h2>
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${meta.badge}`}>
                        {slot}
                      </span>
                    </div>
                    <p className="text-xs text-white/30 ml-7">{meta.description}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-white font-black text-lg">{totalClicks(slot).toLocaleString()}</div>
                      <div className="text-[10px] text-white/30">total clicks</div>
                    </div>
                    {totalToday(slot) > 0 && (
                      <div className="text-right">
                        <div className="text-green-400 font-black text-lg">+{totalToday(slot)}</div>
                        <div className="text-[10px] text-white/30">today</div>
                      </div>
                    )}
                    <button
                      onClick={() => setCreateSlot(slot)}
                      className="px-3 py-2 rounded-lg text-xs font-bold bg-pink-600/20 text-pink-400 hover:bg-pink-600/30 border border-pink-600/20 transition-all flex items-center gap-1"
                    >
                      <span>+</span> New
                    </button>
                  </div>
                </div>

                {/* Active CTA preview */}
                {active && (
                  <div className="mb-3 p-3 rounded-xl border border-green-500/15 bg-green-500/[0.04] flex items-center gap-3">
                    <span className="text-[10px] font-black uppercase text-green-400 tracking-wider bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20 shrink-0">Live</span>
                    <div className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-bold text-white bg-gradient-to-r ${meta.color}`}>
                      {active.description || meta.defaultText}
                    </div>
                    <span className="text-xs text-white/20 truncate">{active.destinationUrl}</span>
                  </div>
                )}

                {/* No active fallback notice */}
                {!active && (
                  <div className="mb-3 p-3 rounded-xl border border-dashed border-white/10 flex items-center gap-3">
                    <span className="text-[10px] font-black uppercase text-white/20 tracking-wider">Using hardcoded fallback:</span>
                    <div className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-bold text-white bg-gradient-to-r ${meta.color} opacity-50`}>
                      {meta.defaultText}
                    </div>
                  </div>
                )}

                {/* Campaign list */}
                <div className="space-y-2">
                  {campaigns.length === 0 ? (
                    <div className="text-center py-6 text-white/20 text-sm border border-dashed border-white/5 rounded-xl">
                      No campaigns yet — create one above
                    </div>
                  ) : (
                    campaigns.map(c => (
                      <CampaignCard
                        key={c._id}
                        campaign={c}
                        slot={slot}
                        onEdit={campaign => setEditTarget({ campaign, slot })}
                        onToggle={handleToggle}
                        onDelete={handleDelete}
                      />
                    ))
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* Edit modal */}
      {editTarget && (
        <EditModal
          campaign={editTarget.campaign}
          slot={editTarget.slot}
          onSave={handleEdit}
          onClose={() => setEditTarget(null)}
        />
      )}

      {/* Create modal */}
      {createSlot && (
        <CreateModal
          slot={createSlot}
          advertisers={advertisers}
          onSave={handleCreate}
          onClose={() => setCreateSlot(null)}
        />
      )}
    </div>
  );
}
