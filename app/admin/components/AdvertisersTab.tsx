'use client';

import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { compressImage } from '@/lib/utils/compressImage';

interface AdvertiserRow {
  _id: string;
  name: string;
  email: string;
  company: string;
  logo: string;
  notes: string;
  status: string;
  campaignCount: number;
  createdAt: string;
}

interface CampaignRow {
  _id: string;
  advertiserId: string;
  advertiserName: string;
  name: string;
  slot: string;
  creative: string;
  destinationUrl: string;
  startDate: string;
  endDate: string;
  status: string;
  isVisible: boolean;
  impressions: number;
  clicks: number;
  createdAt: string;
  position: number | null;
  feedTier: number | null;
  tierSlot: number | null;
  description: string;
  category: string;
  country: string;
  buttonText: string;
}

interface SlotInfo {
  slot: string;
  max: number;
  active: number;
  remaining: number;
}

interface FeedTierInfo {
  tier: number;
  label: string;
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
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function toInputDate(iso: string) {
  if (!iso) return '';
  return new Date(iso).toISOString().slice(0, 10);
}

const SLOT_LABELS: Record<string, string> = {
  'top-banner': 'Top Banner (Bots & Groups page)',
  'homepage-hero': 'Homepage Hero',
  feed: 'In-Feed (Groups page)',
  'navbar-cta': 'Navbar CTA (Meet your AI… link)',
  'join-cta': 'Join page CTA (Build your AI girlfriend…)',
  'filter-cta': 'Filter CTA (Groups & Bots sidebar)',
};

const FEED_SLOTS = ['feed'];
const CTA_SLOTS = ['navbar-cta', 'join-cta', 'filter-cta'];

/** Only these slots are text-only (no image). Case-insensitive so DB/casing never shows image by mistake. */
function isTextOnlySlot(slot: string): boolean {
  const s = String(slot || '').trim().toLowerCase();
  return s === 'navbar-cta' || s === 'join-cta' || s === 'filter-cta';
}

interface AdvertisersTabProps {
  setActiveTab?: (tab: string) => void;
}

export default function AdvertisersTab({ setActiveTab }: AdvertisersTabProps = {}) {
  const [advertisers, setAdvertisers] = useState<AdvertiserRow[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [slots, setSlots] = useState<SlotInfo[]>([]);
  const [feedTierCapacity, setFeedTierCapacity] = useState<FeedTierInfo[]>([]);
  const [globalStats, setGlobalStats] = useState<{ totalClicks: number; last7Days: number; last30Days: number } | null>(null);
  const [slotTotals, setSlotTotals] = useState<Array<{ slot: string; totalClicks: number; campaignCount: number }>>([]);
  const [chartData, setChartData] = useState<Array<{ date: string; clicks: number }>>([]);
  const [chartDays, setChartDays] = useState<7 | 30>(30);
  const [allAdsFilterSlot, setAllAdsFilterSlot] = useState<string>('all');
  const [managedSlot, setManagedSlot] = useState<string | null>(null);
  const [sectionTab, setSectionTab] = useState<'overview' | 'slots' | 'campaigns' | 'advertisers'>('overview');
  // Slots from API = top-banner, homepage-hero, feed, navbar-cta, join-cta, filter-cta
  const displaySlots = slots;
  const [campaignStatusFilter, setCampaignStatusFilter] = useState<'all' | 'live' | 'ended' | 'paused'>('all');
  const [campaignSortBy, setCampaignSortBy] = useState<'startDate' | 'endDate' | 'clicks' | 'impressions'>('startDate');
  const [campaignSortOrder, setCampaignSortOrder] = useState<'desc' | 'asc'>('desc');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [view, setView] = useState<'list' | 'editAdvertiser' | 'editCampaign'>('list');
  const [expandedAdvertiser, setExpandedAdvertiser] = useState<string | null>(null);

  // Advertiser form
  const [editingAdvertiser, setEditingAdvertiser] = useState<AdvertiserRow | null>(null);
  const [advForm, setAdvForm] = useState({ name: '', email: '', company: '', logo: '', notes: '', status: 'active' });
  const [isSaving, setIsSaving] = useState(false);

  // Campaign form: type drives whether we show text+link or image+link
  const [campaignType, setCampaignType] = useState<'text' | 'image'>('image');
  const [editingCampaign, setEditingCampaign] = useState<CampaignRow | null>(null);
  const [campForm, setCampForm] = useState({
    advertiserId: '',
    name: '',
    slot: 'homepage-hero',
    creative: '',
    destinationUrl: '',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    status: 'active',
    isVisible: true,
    position: null as number | null,
    feedTier: null as number | null,
    tierSlot: null as number | null,
    description: '',
    category: 'All',
    country: 'All',
    buttonText: 'Visit Site',
  });
  const [isUploading, setIsUploading] = useState(false);
  const savingRef = useRef(false);

  // Data fetching. skipLoading=true = refresh without full-page loading (e.g. after save).
  const fetchAll = async (skipLoading = false) => {
    if (!skipLoading) setIsLoading(true);
    try {
      const res = await axios.get('/api/admin/advertisers-dashboard', authHeaders());
      setAdvertisers(res.data.advertisers ?? []);
      setCampaigns(res.data.campaigns ?? []);
      setSlots(res.data.slots ?? []);
      setFeedTierCapacity(res.data.feedTierCapacity ?? []);
      setGlobalStats(res.data.globalStats ?? null);
      setSlotTotals(res.data.slotTotals ?? []);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load data');
    } finally {
      if (!skipLoading) setIsLoading(false);
    }
  };

  const loadChart = async (days: 7 | 30) => {
    try {
      const res = await axios.get(`/api/admin/click-stats-by-day?days=${days}`, authHeaders());
      setChartData(Array.isArray(res.data) ? res.data : []);
    } catch {
      setChartData([]);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  // When creating a new campaign, auto-select first advertiser if none selected (e.g. form opened before advertisers loaded)
  useEffect(() => {
    if (view === 'editCampaign' && !editingCampaign && !campForm.advertiserId && advertisers.length > 0) {
      setCampForm((prev) => ({ ...prev, advertiserId: advertisers[0]._id }));
    }
  }, [view, editingCampaign, advertisers, campForm.advertiserId]);

  useEffect(() => {
    if (!isLoading) loadChart(chartDays);
  }, [chartDays, isLoading]);

  // Advertiser CRUD
  const openNewAdvertiser = () => {
    setEditingAdvertiser(null);
    setAdvForm({ name: '', email: '', company: '', logo: '', notes: '', status: 'active' });
    setView('editAdvertiser');
  };

  const openEditAdvertiser = (adv: AdvertiserRow) => {
    setEditingAdvertiser(adv);
    setAdvForm({
      name: adv.name,
      email: adv.email,
      company: adv.company,
      logo: adv.logo,
      notes: adv.notes,
      status: adv.status,
    });
    setView('editAdvertiser');
  };

  const saveAdvertiser = async () => {
    if (!advForm.name || !advForm.email) {
      alert('Name and email are required');
      return;
    }
    setIsSaving(true);
    try {
      if (editingAdvertiser) {
        await axios.put(`/api/admin/advertisers/${editingAdvertiser._id}`, advForm, authHeaders());
      } else {
        await axios.post('/api/admin/advertisers', advForm, authHeaders());
      }
      setView('list');
      await fetchAll();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAdvertiser = async (id: string) => {
    if (!confirm('Delete this advertiser and ALL their campaigns?')) return;
    try {
      await axios.delete(`/api/admin/advertisers/${id}`, authHeaders());
      await fetchAll();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to delete');
    }
  };

  // Campaign CRUD
  const openNewCampaign = (advertiserId: string) => {
    openNewCampaignForSlot('homepage-hero', advertiserId);
  };

  /** Open campaign form with slot pre-selected (add ad by location). Sets type from slot. */
  const openNewCampaignForSlot = (slot: string, preselectedAdvertiserId?: string) => {
    setEditingCampaign(null);
    const isCtaSlot = isTextOnlySlot(slot);
    setCampaignType(isCtaSlot ? 'text' : 'image');
    const start = new Date();
    const end = new Date(Date.now() + 30 * 86400000);
    setCampForm({
      advertiserId: preselectedAdvertiserId || (advertisers[0]?._id ?? ''),
      name: '',
      slot,
      creative: isCtaSlot ? '' : '',
      destinationUrl: '',
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
      status: 'active',
      isVisible: true,
      position: null,
      feedTier: null,
      tierSlot: null,
      description: '',
      category: 'All',
      country: 'All',
      buttonText: 'Visit Site',
    });
    setView('editCampaign');
  };

  /** Open edit form; type is set from campaign slot (CTA = text, else image). */
  const openEditCampaign = (camp: CampaignRow) => {
    setEditingCampaign(camp);
    const isCta = isTextOnlySlot(camp.slot);
    setCampaignType(isCta ? 'text' : 'image');
    const normalizedSlot = isCta ? (String(camp.slot).trim().toLowerCase() as 'navbar-cta' | 'join-cta' | 'filter-cta') : camp.slot;
    setCampForm({
      advertiserId: camp.advertiserId,
      name: camp.name,
      slot: normalizedSlot,
      creative: camp.creative,
      destinationUrl: camp.destinationUrl,
      startDate: toInputDate(camp.startDate),
      endDate: toInputDate(camp.endDate),
      status: camp.status,
      isVisible: camp.isVisible,
      position: camp.position,
      feedTier: camp.feedTier ?? null,
      tierSlot: camp.tierSlot ?? null,
      description: camp.description || '',
      category: camp.category || 'All',
      country: camp.country || 'All',
      buttonText: camp.buttonText || 'Visit Site',
    });
    setView('editCampaign');
  };

  const saveCampaign = async () => {
    const token = getToken();
    if (!token) {
      alert('Please log in again. Your session may have expired.');
      return;
    }
    const isCta = isTextOnlySlot(campForm.slot) || (editingCampaign ? isTextOnlySlot(editingCampaign.slot) : false) || ['navbar-cta', 'join-cta', 'filter-cta'].includes(campForm.slot?.trim() ?? '');
    if (!campForm.name || !campForm.destinationUrl) {
      alert('Name and destination URL are required');
      return;
    }
    if (!isCta && !campForm.creative) {
      alert('Creative image is required for this slot');
      return;
    }
    const ctaLabel = (campForm.description || campForm.buttonText || '').trim();
    if (isCta && !ctaLabel) {
      alert('Button label is required for text (CTA) campaigns.');
      return;
    }
    if (!editingCampaign && !campForm.advertiserId) {
      alert('Please select an Advertiser above (required for new campaigns).');
      return;
    }
    const isFeed = FEED_SLOTS.includes(campForm.slot);
    if (campForm.slot === 'feed' && (campForm.feedTier == null || campForm.tierSlot == null)) {
      alert('Tier and Slot are required for in-feed campaigns');
      return;
    }
    if (!campForm.destinationUrl.startsWith('http://') && !campForm.destinationUrl.startsWith('https://')) {
      alert('Destination URL must start with http:// or https://');
      return;
    }
    if (savingRef.current) return;
    savingRef.current = true;
    setIsSaving(true);
    try {
      const descriptionVal = isFeed || isCta ? (campForm.description || campForm.buttonText || 'Visit Site').trim() : '';
        const payload = {
        name: (campForm.name ?? '').trim() || (isCta ? ctaLabel : 'Campaign'),
        slot: String(campForm.slot ?? ''),
        creative: isCta ? '' : String(campForm.creative ?? ''),
        destinationUrl: String((campForm.destinationUrl ?? '').trim()),
        startDate: campForm.startDate,
        endDate: campForm.endDate,
        status: campForm.status ?? 'active',
        isVisible: campForm.isVisible !== false,
        position: null,
        feedTier: campForm.slot === 'feed' ? campForm.feedTier : null,
        tierSlot: campForm.slot === 'feed' ? campForm.tierSlot : null,
        description: isFeed || isCta ? descriptionVal : '',
        category: isFeed ? (campForm.category ?? 'All') : 'All',
        country: isFeed ? (campForm.country ?? 'All') : 'All',
        buttonText: isFeed || isCta ? descriptionVal : 'Visit Site',
      };
      if (editingCampaign) {
        const { data: updated } = await axios.put(`/api/admin/campaigns/${editingCampaign._id}`, payload, authHeaders());
        if (updated && updated._id) {
          setCampaigns((prev) => prev.map((c) => (c._id === updated._id ? { ...c, ...updated } : c)));
        }
      } else {
        const advertiserId = String(campForm.advertiserId ?? '').trim();
        if (!advertiserId) {
          alert('Please select an Advertiser.');
          setIsSaving(false);
          savingRef.current = false;
          return;
        }
        const postPayload = { ...payload, advertiserId };
        await axios.post('/api/admin/campaigns', postPayload, authHeaders());
      }
      await fetchAll(true);
      setEditingCampaign(null);
      setCampaignType('image');
      setCampForm({
        advertiserId: campForm.advertiserId,
        name: '',
        slot: 'homepage-hero',
        creative: '',
        destinationUrl: '',
        startDate: new Date().toISOString().slice(0, 10),
        endDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
        status: 'active',
        isVisible: true,
        position: null,
        feedTier: null,
        tierSlot: null,
        description: '',
        category: 'All',
        country: 'All',
        buttonText: 'Visit Site',
      });
      setView('list');
      alert('Campaign saved successfully.');
    } catch (err: any) {
      const data = err.response?.data;
      const msg = data?.message ?? data?.error ?? err?.message;
      const message = typeof msg === 'string' ? msg : 'Failed to save campaign';
      console.error('Save campaign error:', message, data || err);
      alert(`Save failed: ${message}`);
    } finally {
      setIsSaving(false);
      savingRef.current = false;
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    if (!confirm('Delete this campaign?')) return;
    try {
      await axios.delete(`/api/admin/campaigns/${id}`, authHeaders());
      await fetchAll();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to delete');
    }
  };

  const toggleCampaignStatus = async (camp: CampaignRow) => {
    const next = camp.status === 'active' ? 'paused' : 'active';
    try {
      await axios.put(`/api/admin/campaigns/${camp._id}`, { status: next }, authHeaders());
      await fetchAll();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to update');
    }
  };

  const isCampaignEnded = (c: CampaignRow) => {
    if (c.status === 'ended') return true;
    if (c.endDate) {
      try { return new Date(c.endDate) < new Date(); } catch { return false; }
    }
    return false;
  };
  const isCampaignLive = (c: CampaignRow) => c.status === 'active' && !isCampaignEnded(c);

  let campaignsForList = allAdsFilterSlot === 'all' ? campaigns : campaigns.filter((c) => c.slot === allAdsFilterSlot);
  if (campaignStatusFilter === 'live') campaignsForList = campaignsForList.filter(isCampaignLive);
  else if (campaignStatusFilter === 'ended') campaignsForList = campaignsForList.filter(isCampaignEnded);
  else if (campaignStatusFilter === 'paused') campaignsForList = campaignsForList.filter((c) => c.status === 'paused');

  const sortCampaigns = (list: CampaignRow[]) =>
    [...list].sort((a, b) => {
      const mul = campaignSortOrder === 'desc' ? 1 : -1;
      if (campaignSortBy === 'startDate') return mul * (new Date(b.startDate || 0).getTime() - new Date(a.startDate || 0).getTime());
      if (campaignSortBy === 'endDate') return mul * (new Date(b.endDate || 0).getTime() - new Date(a.endDate || 0).getTime());
      if (campaignSortBy === 'clicks') return mul * ((b.clicks || 0) - (a.clicks || 0));
      if (campaignSortBy === 'impressions') return mul * ((b.impressions || 0) - (a.impressions || 0));
      return 0;
    });

  const allCampaignsFiltered = sortCampaigns(campaignsForList);

  let slotPanelCampaigns = managedSlot === null ? [] : campaigns.filter((c) => c.slot === managedSlot);
  if (managedSlot !== null) {
    if (campaignStatusFilter === 'live') slotPanelCampaigns = slotPanelCampaigns.filter(isCampaignLive);
    else if (campaignStatusFilter === 'ended') slotPanelCampaigns = slotPanelCampaigns.filter(isCampaignEnded);
    else if (campaignStatusFilter === 'paused') slotPanelCampaigns = slotPanelCampaigns.filter((c) => c.status === 'paused');
    slotPanelCampaigns = sortCampaigns(slotPanelCampaigns);
  }

  // Image upload (reuses existing /api/upload endpoint)
  const handleCreativeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { alert('Max 10 MB'); return; }
    if (!file.type.startsWith('image/')) { alert('Image files only'); return; }

    setIsUploading(true);
    try {
      const compressed = await compressImage(file);
      const formData = new FormData();
      formData.append('file', compressed);

      const token = getToken();
      const res = await axios.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` },
      });
      setCampForm({ ...campForm, creative: res.data.url });
    } catch (err: any) {
      alert(err.response?.data?.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('Max 5 MB'); return; }
    if (!file.type.startsWith('image/')) { alert('Image files only'); return; }

    setIsUploading(true);
    try {
      const compressed = await compressImage(file);
      const formData = new FormData();
      formData.append('file', compressed);

      const token = getToken();
      const res = await axios.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` },
      });
      setAdvForm({ ...advForm, logo: res.data.url });
    } catch (err: any) {
      alert(err.response?.data?.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  // Helper: campaigns for a specific advertiser
  const campaignsFor = (advId: string) => campaigns.filter((c) => c.advertiserId === advId);

  // ─── Edit Advertiser View ─────────────────────────────────────
  if (view === 'editAdvertiser') {
    return (
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-black text-white">
            {editingAdvertiser ? 'Edit Advertiser' : 'New Advertiser'}
          </h1>
          <div className="flex gap-4">
            <button onClick={() => setView('list')} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors">
              Cancel
            </button>
            <button onClick={saveAdvertiser} disabled={isSaving || isUploading} className="px-4 py-2 bg-[#b31b1b] hover:bg-[#c42b2b] text-white rounded-xl transition-colors disabled:opacity-50">
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        <div className="glass rounded-2xl p-6 border border-white/5 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-[#999] mb-2">Name *</label>
              <input type="text" value={advForm.name} onChange={(e) => setAdvForm({ ...advForm, name: e.target.value })} className="w-full p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:ring-2 focus:ring-[#b31b1b] outline-none" placeholder="Company or person name" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#999] mb-2">Email *</label>
              <input type="email" value={advForm.email} onChange={(e) => setAdvForm({ ...advForm, email: e.target.value })} className="w-full p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:ring-2 focus:ring-[#b31b1b] outline-none" placeholder="contact@example.com" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-[#999] mb-2">Company</label>
              <input type="text" value={advForm.company} onChange={(e) => setAdvForm({ ...advForm, company: e.target.value })} className="w-full p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:ring-2 focus:ring-[#b31b1b] outline-none" placeholder="Optional company name" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#999] mb-2">Status</label>
              <select value={advForm.status} onChange={(e) => setAdvForm({ ...advForm, status: e.target.value })} className="w-full p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-[#b31b1b] outline-none">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#999] mb-2">Logo</label>
            <input type="file" accept="image/*" onChange={handleLogoUpload} className="w-full p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#b31b1b] file:text-white hover:file:bg-[#c42b2b]" />
            {advForm.logo && <img src={advForm.logo} alt="Logo" className="h-16 mt-2 rounded-lg object-cover" />}
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#999] mb-2">Internal Notes</label>
            <textarea value={advForm.notes} onChange={(e) => setAdvForm({ ...advForm, notes: e.target.value })} className="w-full p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:ring-2 focus:ring-[#b31b1b] outline-none resize-none" rows={3} placeholder="Private admin notes..." />
          </div>
        </div>
      </div>
    );
  }

  // ─── Edit Campaign View ───────────────────────────────────────
  if (view === 'editCampaign') {
    const advName = advertisers.find((a) => a._id === campForm.advertiserId)?.name || 'Unknown';
    return (
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-black text-white">
              {editingCampaign ? 'Edit Campaign' : 'New Campaign'}
            </h1>
            {editingCampaign ? (
              <p className="text-[#999] text-sm mt-1">Advertiser: {advName}</p>
            ) : (
              <p className="text-[#999] text-sm mt-1">Slot: {SLOT_LABELS[campForm.slot] || campForm.slot}</p>
            )}
          </div>
          <div className="flex gap-4">
            <button type="button" onClick={() => setView('list')} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors">
              Cancel
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                saveCampaign();
              }}
              disabled={isSaving || isUploading}
              className="px-4 py-2 bg-[#b31b1b] hover:bg-[#c42b2b] text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : isUploading ? 'Uploading...' : 'Save Campaign'}
            </button>
          </div>
        </div>

        <div className="glass rounded-2xl p-6 border border-white/5 space-y-6">
          {!editingCampaign && (
            <div>
              <label className="block text-sm font-semibold text-[#999] mb-2">Advertiser *</label>
              <select value={campForm.advertiserId} onChange={(e) => setCampForm({ ...campForm, advertiserId: e.target.value })} className="w-full p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-[#b31b1b] outline-none">
                <option value="">Select advertiser</option>
                {advertisers.map((a) => (
                  <option key={a._id} value={a._id}>{a.name}</option>
                ))}
              </select>
            </div>
          )}
          {/* Type: Text button (CTA) = label + link only. Image ad = image + link. */}
          <div>
            <label className="block text-sm font-semibold text-[#999] mb-2">Ad type *</label>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="campaignType"
                  checked={campaignType === 'text'}
                  onChange={() => {
                    setCampaignType('text');
                    setCampForm({ ...campForm, slot: 'navbar-cta', creative: '' });
                  }}
                  className="w-4 h-4 text-pink-500 focus:ring-pink-500"
                />
                <span className="text-white">Text button (CTA)</span>
                <span className="text-xs text-[#666]">— label + link only, no image</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="campaignType"
                  checked={campaignType === 'image'}
                  onChange={() => {
                    setCampaignType('image');
                    setCampForm({ ...campForm, slot: 'homepage-hero' });
                  }}
                  className="w-4 h-4 text-[#b31b1b] focus:ring-[#b31b1b]"
                />
                <span className="text-white">Image ad</span>
                <span className="text-xs text-[#666]">— upload image + link</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-[#999] mb-2">Campaign Name *</label>
              <input type="text" value={campForm.name} onChange={(e) => setCampForm({ ...campForm, name: e.target.value })} className="w-full p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:ring-2 focus:ring-[#b31b1b] outline-none" placeholder="e.g. February Top Banner" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#999] mb-2">Slot *</label>
              <select
                value={campForm.slot}
                onChange={(e) => {
                  const newSlot = e.target.value;
                  setCampForm({
                    ...campForm,
                    slot: newSlot,
                    creative: isTextOnlySlot(newSlot) ? '' : campForm.creative,
                  });
                }}
                className="w-full p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-[#b31b1b] outline-none"
              >
                {campaignType === 'text'
                  ? CTA_SLOTS.map((slot) => (
                      <option key={slot} value={slot}>
                        {SLOT_LABELS[slot] || slot}
                      </option>
                    ))
                  : (['top-banner', 'homepage-hero', 'feed'] as const).map((slot) => (
                      <option key={slot} value={slot}>
                        {SLOT_LABELS[slot] || slot} {slots.length > 0 ? `(${(slots.find((s) => s.slot === slot)?.remaining ?? 0)}/${slots.find((s) => s.slot === slot)?.max ?? 0} available)` : ''}
                      </option>
                    ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#999] mb-2">Destination URL *</label>
            <input type="url" value={campForm.destinationUrl} onChange={(e) => setCampForm({ ...campForm, destinationUrl: e.target.value })} className="w-full p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:ring-2 focus:ring-[#b31b1b] outline-none" placeholder="https://advertiser-site.com" />
          </div>

          {campaignType === 'text' ? (
            /* --- TEXT BUTTON (CTA): only button label + URL (no image) --- */
            <div className="rounded-xl bg-pink-500/10 border border-pink-500/30 p-4 space-y-4">
              <p className="text-sm font-semibold text-pink-200">Text button only — enter the label and URL above. No image.</p>
              <div>
                <label className="block text-sm font-semibold text-[#999] mb-2">Button label *</label>
                <textarea
                  value={campForm.description || campForm.buttonText}
                  onChange={(e) => {
                    const v = e.target.value;
                    setCampForm({ ...campForm, description: v, buttonText: v });
                  }}
                  className="w-full p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:ring-2 focus:ring-[#b31b1b] outline-none resize-none"
                  rows={2}
                  placeholder="e.g. Visit, Meet your AI, Join now"
                />
              </div>
            </div>
          ) : (
            /* --- IMAGE AD: only image upload + URL (no CTA text block here) --- */
            <div>
              <label className="block text-sm font-semibold text-[#999] mb-2">Creative Image *</label>
              <input type="file" accept="image/*" onChange={handleCreativeUpload} className="w-full p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#b31b1b] file:text-white hover:file:bg-[#c42b2b]" />
              {isUploading && <p className="text-amber-400/80 text-xs mt-1">Uploading…</p>}
              {campForm.creative && <img src={campForm.creative} alt="Creative" className="h-24 mt-2 rounded-lg object-cover" />}
            </div>
          )}

          {/* Feed-specific fields (only when slot is feed) */}
          {FEED_SLOTS.includes(campForm.slot) && (
            <>
              <div className="border-t border-white/10 pt-4 mt-2">
                <h3 className="text-sm font-bold text-white/70 uppercase tracking-wider mb-4">
                  {campForm.slot === 'feed' ? 'In-Feed: Tier + Slot (12 max: 4 top, 4 middle, 4 bottom)' : 'Sidebar: 4 slots, rotating'}
                </h3>
              </div>

              {campForm.slot === 'feed' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-[#999] mb-2">Tier *</label>
                    <select
                      value={campForm.feedTier ?? ''}
                      onChange={(e) => setCampForm({ ...campForm, feedTier: e.target.value ? Number(e.target.value) : null })}
                      className="w-full p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-[#b31b1b] outline-none"
                    >
                      <option value="">Select tier</option>
                      {feedTierCapacity.map((t) => (
                        <option key={t.tier} value={t.tier}>
                          Tier {t.tier} – {t.label} ({t.remaining}/{t.max} free)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#999] mb-2">Slot within tier * (1–4)</label>
                    <select
                      value={campForm.tierSlot ?? ''}
                      onChange={(e) => setCampForm({ ...campForm, tierSlot: e.target.value ? Number(e.target.value) : null })}
                      className="w-full p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-[#b31b1b] outline-none"
                    >
                      <option value="">Select slot</option>
                      {[1, 2, 3, 4].map((s) => {
                        const taken = campaigns.some(
                          (c) => c.slot === 'feed' && c.feedTier === campForm.feedTier && c.tierSlot === s && c._id !== editingCampaign?._id
                        );
                        return (
                          <option key={s} value={s} disabled={taken}>
                            Slot {s} {taken ? '(taken)' : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-[#999] mb-2">Category Tag</label>
                  <input
                    type="text"
                    value={campForm.category}
                    onChange={(e) => setCampForm({ ...campForm, category: e.target.value })}
                    className="w-full p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:ring-2 focus:ring-[#b31b1b] outline-none"
                    placeholder="e.g. Trans, Dating, All"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#999] mb-2">Country Tag</label>
                  <input
                    type="text"
                    value={campForm.country}
                    onChange={(e) => setCampForm({ ...campForm, country: e.target.value })}
                    className="w-full p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:ring-2 focus:ring-[#b31b1b] outline-none"
                    placeholder="e.g. All, USA"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#999] mb-2">Ad Description</label>
                <textarea
                  value={campForm.description}
                  onChange={(e) => setCampForm({ ...campForm, description: e.target.value })}
                  className="w-full p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:ring-2 focus:ring-[#b31b1b] outline-none resize-none"
                  rows={2}
                  placeholder="Short ad copy shown on the card..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#999] mb-2">Button Text</label>
                <input
                  type="text"
                  value={campForm.buttonText}
                  onChange={(e) => setCampForm({ ...campForm, buttonText: e.target.value })}
                  className="w-full p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:ring-2 focus:ring-[#b31b1b] outline-none"
                  placeholder="e.g. Visit Site, Join Now"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-semibold text-[#999] mb-2">Duration</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {[
                { label: '1 week', days: 7 },
                { label: '1 month', days: 30 },
                { label: '3 months', days: 90 },
              ].map(({ label, days }) => {
                const start = new Date();
                const end = new Date(Date.now() + days * 86400000);
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setCampForm({ ...campForm, startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) })}
                    className="px-3 py-1.5 text-xs font-medium bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs text-[#666] mb-1">Start Date</label>
                <input type="date" value={campForm.startDate} onChange={(e) => setCampForm({ ...campForm, startDate: e.target.value })} className="w-full p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-[#b31b1b] outline-none" />
              </div>
              <div>
                <label className="block text-xs text-[#666] mb-1">End Date</label>
                <input type="date" value={campForm.endDate} onChange={(e) => setCampForm({ ...campForm, endDate: e.target.value })} className="w-full p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-[#b31b1b] outline-none" />
              </div>
            </div>
          </div>

          {editingCampaign && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-[#999] mb-2">Status</label>
                <select value={campForm.status} onChange={(e) => setCampForm({ ...campForm, status: e.target.value })} className="w-full p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-[#b31b1b] outline-none">
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="ended">Ended</option>
                </select>
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={campForm.isVisible} onChange={(e) => setCampForm({ ...campForm, isVisible: e.target.checked })} className="w-5 h-5 text-[#b31b1b] rounded focus:ring-[#b31b1b]" />
                  <span className="text-white">Visible</span>
                </label>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Main List View ───────────────────────────────────────────
  const tabClass = (tab: typeof sectionTab) =>
    `px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${sectionTab === tab ? 'bg-[#b31b1b] text-white' : 'bg-white/5 text-[#999] hover:bg-white/10 hover:text-white'}`;

  return (
    <div className="space-y-6">
      {/* CTA Buttons: direct link so users always find the Buttons tab */}
      {setActiveTab && (
        <div className="rounded-xl bg-pink-500/15 border border-pink-500/40 p-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-pink-200 text-sm font-medium">
            Navbar &amp; Join page <strong>text buttons</strong> (no image) → manage in the <strong>CTA Buttons</strong> tab.
          </p>
          <button
            type="button"
            onClick={() => setActiveTab('buttons')}
            className="shrink-0 px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-xl font-semibold text-sm"
          >
            Open CTA Buttons →
          </button>
        </div>
      )}
      {/* Header + Section tabs */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap justify-between items-center gap-3">
          <div>
            <h1 className="text-3xl font-black text-white mb-1">Advertisers</h1>
            <p className="text-[#999] text-sm">{advertisers.length} advertisers, {campaigns.length} campaigns</p>
          </div>
          {(sectionTab === 'advertisers' || sectionTab === 'overview') && (
            <button onClick={openNewAdvertiser} className="px-6 py-3 bg-[#b31b1b] hover:bg-[#c42b2b] text-white rounded-xl font-bold transition-all shadow-lg shadow-[#b31b1b]/20">
              + New Advertiser
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-2">
          <button type="button" onClick={() => setSectionTab('overview')} className={tabClass('overview')}>Overview</button>
          <button type="button" onClick={() => setSectionTab('slots')} className={tabClass('slots')}>By slot</button>
          <button type="button" onClick={() => setSectionTab('campaigns')} className={tabClass('campaigns')}>All campaigns</button>
          <button type="button" onClick={() => setSectionTab('advertisers')} className={tabClass('advertisers')}>Advertisers</button>
        </div>
      </div>

      {/* ─── Overview tab ─────────────────────────────────────── */}
      {sectionTab === 'overview' && (
        <>
      {/* Global click stats */}
      {globalStats && (
        <div className="glass rounded-xl p-4 border border-white/5 mb-6">
          <div className="text-xs font-bold text-[#666] uppercase tracking-wider mb-3">Click stats</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <div className="text-2xl font-black text-white">{globalStats.totalClicks.toLocaleString()}</div>
              <div className="text-xs text-[#999]">Total (all time)</div>
            </div>
            <div>
              <div className="text-2xl font-black text-white">{globalStats.last7Days.toLocaleString()}</div>
              <div className="text-xs text-[#999]">Last 7 days</div>
            </div>
            <div>
              <div className="text-2xl font-black text-white">{globalStats.last30Days.toLocaleString()}</div>
              <div className="text-xs text-[#999]">Last 30 days</div>
            </div>
          </div>
        </div>
      )}

      {/* Top performing slots */}
      {slotTotals.length > 0 && (
        <div className="glass rounded-xl p-4 border border-white/5 mb-6">
          <div className="text-xs font-bold text-[#666] uppercase tracking-wider mb-3">Top slots by clicks (price accordingly)</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[#666]">
                <tr>
                  <th className="text-left py-1 font-bold">Slot</th>
                  <th className="text-right py-1 font-bold">Total clicks</th>
                  <th className="text-right py-1 font-bold"># Ads</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {slotTotals.map((row) => (
                  <tr key={row.slot}>
                    <td className="py-2 text-white">{SLOT_LABELS[row.slot] || row.slot}</td>
                    <td className="py-2 text-right font-semibold text-white">{row.totalClicks.toLocaleString()}</td>
                    <td className="py-2 text-right text-[#999]">{row.campaignCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Clicks over time chart */}
      {chartData.length > 0 && (
        <div className="glass rounded-xl p-4 border border-white/5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-bold text-[#666] uppercase tracking-wider">Clicks over time</div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setChartDays(7)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${chartDays === 7 ? 'bg-[#b31b1b] text-white' : 'bg-white/10 text-[#999] hover:bg-white/15'}`}
              >
                7 days
              </button>
              <button
                type="button"
                onClick={() => setChartDays(30)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${chartDays === 30 ? 'bg-[#b31b1b] text-white' : 'bg-white/10 text-[#999] hover:bg-white/15'}`}
              >
                30 days
              </button>
            </div>
          </div>
          <div className="flex items-end gap-0.5 sm:gap-1 h-32">
            {chartData.map((d) => {
              const max = Math.max(1, ...chartData.map((x) => x.clicks));
              const h = max ? (d.clicks / max) * 100 : 0;
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group" title={`${d.date}: ${d.clicks} clicks`}>
                  <span className="text-[10px] text-[#666] opacity-0 group-hover:opacity-100 transition-opacity">{d.clicks}</span>
                  <div
                    className="w-full min-w-[4px] bg-[#b31b1b]/80 hover:bg-[#b31b1b] rounded-t transition-all"
                    style={{ height: `${Math.max(h, 2)}%` }}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-1 text-[10px] text-[#666]">
            <span>{chartData[0]?.date}</span>
            <span>{chartData[chartData.length - 1]?.date}</span>
          </div>
        </div>
      )}
        </>
      )}

      {/* ─── By slot tab ───────────────────────────────────────── */}
      {sectionTab === 'slots' && (
        <>
      {/* Slot capacity overview + Add ad by slot */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {displaySlots.map((s) => (
          <div key={s.slot} className="glass rounded-xl p-4 border border-white/5 flex flex-col">
            <div className="text-xs font-bold text-[#666] uppercase tracking-wider mb-1">{SLOT_LABELS[s.slot] || s.slot}</div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white">{s.active}</span>
              <span className="text-sm text-[#999]">/ {s.max} slots filled</span>
            </div>
            <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${s.active >= s.max ? 'bg-red-500' : s.active > 0 ? 'bg-green-500' : 'bg-white/20'}`}
                style={{ width: `${(s.active / s.max) * 100}%` }}
              />
            </div>
            <div className="mt-3 flex flex-col gap-2">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setManagedSlot(s.slot); }}
                className="w-full py-2 text-xs font-bold bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors border border-white/10"
              >
                {s.active > 0 ? `Manage ads (${s.active})` : 'Manage ads'}
              </button>
              {s.active < s.max && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isTextOnlySlot(s.slot) && setActiveTab) {
                      setActiveTab('buttons');
                    } else {
                      openNewCampaignForSlot(s.slot);
                    }
                  }}
                  className="w-full py-2 text-xs font-bold bg-[#b31b1b]/80 hover:bg-[#b31b1b] text-white rounded-lg transition-colors"
                >
                  {isTextOnlySlot(s.slot) ? 'Open CTA Buttons →' : '+ Add ad'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Focused "Manage ads" for one slot (when user clicks Manage ads on a slot card) */}
      {managedSlot !== null && (
        <div className="glass rounded-xl border border-white/10 overflow-hidden mb-6">
          {setActiveTab && isTextOnlySlot(managedSlot) && (
            <div className="rounded-xl bg-pink-500/15 border border-pink-500/40 p-3 flex flex-wrap items-center justify-between gap-3 mx-4 mt-4">
              <p className="text-pink-200 text-sm">Edit button label and URL in <strong>CTA Buttons</strong> or use Edit below (no image required).</p>
              <button type="button" onClick={() => setActiveTab('buttons')} className="shrink-0 px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-xl font-semibold text-sm">Open CTA Buttons →</button>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-white/10 bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setManagedSlot(null)}
                className="p-2 hover:bg-white/10 rounded-lg text-[#999] hover:text-white transition-colors"
                title="Back to overview"
              >
                ← Back
              </button>
              <h2 className="text-lg font-bold text-white">
                Manage ads: {SLOT_LABELS[managedSlot] || managedSlot}
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={campaignStatusFilter}
                onChange={(e) => setCampaignStatusFilter(e.target.value as typeof campaignStatusFilter)}
                className="bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:ring-2 focus:ring-[#b31b1b] outline-none"
              >
                <option value="all">All statuses</option>
                <option value="live">Live</option>
                <option value="ended">Ended</option>
                <option value="paused">Paused</option>
              </select>
              <select
                value={campaignSortBy}
                onChange={(e) => setCampaignSortBy(e.target.value as typeof campaignSortBy)}
                className="bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:ring-2 focus:ring-[#b31b1b] outline-none"
              >
                <option value="startDate">Date started</option>
                <option value="endDate">End date</option>
                <option value="clicks">Clicks</option>
                <option value="impressions">Impressions</option>
              </select>
              <select
                value={campaignSortOrder}
                onChange={(e) => setCampaignSortOrder(e.target.value as 'desc' | 'asc')}
                className="bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:ring-2 focus:ring-[#b31b1b] outline-none"
              >
                <option value="desc">Newest / Highest first</option>
                <option value="asc">Oldest / Lowest first</option>
              </select>
            {(() => {
              const slotInfo = slots.find((s) => s.slot === managedSlot);
              const active = slotInfo?.active ?? 0;
              const max = slotInfo?.max ?? 0;
              return active < max;
            })() && (
              <button
                type="button"
                onClick={() => {
                  if (isTextOnlySlot(managedSlot) && setActiveTab) {
                    setActiveTab('buttons');
                  } else {
                    openNewCampaignForSlot(managedSlot);
                  }
                }}
                className="px-4 py-2 text-sm font-bold bg-[#b31b1b] hover:bg-[#c42b2b] text-white rounded-lg transition-colors"
              >
                {isTextOnlySlot(managedSlot) ? 'Open CTA Buttons →' : '+ Add ad to this slot'}
              </button>
            )}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-[#666]">
                <tr>
                  <th className="px-4 py-2 text-left font-bold text-xs uppercase">Advertiser</th>
                  <th className="px-4 py-2 text-left font-bold text-xs uppercase">Name</th>
                  <th className="px-4 py-2 text-left font-bold text-xs uppercase">Link / CTA</th>
                  <th className="px-4 py-2 text-left font-bold text-xs uppercase">Dates</th>
                  <th className="px-4 py-2 text-left font-bold text-xs uppercase">Status</th>
                  <th className="px-4 py-2 text-right font-bold text-xs uppercase">Clicks</th>
                  <th className="px-4 py-2 text-left font-bold text-xs uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {slotPanelCampaigns.map((camp) => (
                  <tr key={camp._id} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 text-white">{advertisers.find((a) => a._id === camp.advertiserId)?.name || '—'}</td>
                    <td className="px-4 py-3 text-white font-medium">{camp.name}</td>
                    <td className="px-4 py-3 text-[#999] max-w-[180px] truncate" title={CTA_SLOTS.includes(camp.slot) ? (camp.description || camp.buttonText || '') : camp.destinationUrl}>
                      {CTA_SLOTS.includes(camp.slot) ? (camp.description || camp.buttonText || 'CTA') : camp.destinationUrl}
                    </td>
                    <td className="px-4 py-3 text-[#999] whitespace-nowrap">{formatDate(camp.startDate)} – {formatDate(camp.endDate)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                        camp.status === 'active' ? 'bg-green-500/10 text-green-400 border-green-500/20'
                          : camp.status === 'paused' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                            : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                      }`}>
                        {camp.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-white">{camp.clicks.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => toggleCampaignStatus(camp)} className="p-1.5 hover:bg-white/10 text-[#999] rounded-lg transition-colors text-xs" title={camp.status === 'active' ? 'Pause' : 'Start'}>
                          {camp.status === 'active' ? '⏸ Pause' : '▶ Start'}
                        </button>
                        <button onClick={() => openEditCampaign(camp)} className="p-1.5 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-colors text-xs" title="Edit">&#9998;</button>
                        <button onClick={() => handleDeleteCampaign(camp._id)} className="p-1.5 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors text-xs" title="Delete">&#128465;</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {slotPanelCampaigns.length === 0 && (
            <div className="p-8 text-center text-[#666] text-sm">
              {campaigns.filter((c) => c.slot === managedSlot).length === 0
                ? 'No ads in this slot yet. Use &quot;+ Add ad to this slot&quot; above or &quot;+ Add ad&quot; on the card.'
                : 'No campaigns match the current filters.'}
            </div>
          )}
        </div>
      )}
        </>
      )}

      {/* ─── All campaigns tab (with filters) ─────────────────── */}
      {sectionTab === 'campaigns' && (
        <div className="glass rounded-xl border border-white/5 overflow-hidden mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-white/5">
            <h2 className="text-lg font-bold text-white">All campaigns</h2>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#666]">Status:</span>
                <select
                  value={campaignStatusFilter}
                  onChange={(e) => setCampaignStatusFilter(e.target.value as typeof campaignStatusFilter)}
                  className="bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:ring-2 focus:ring-[#b31b1b] outline-none"
                >
                  <option value="all">All</option>
                  <option value="live">Live</option>
                  <option value="ended">Ended</option>
                  <option value="paused">Paused</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#666]">Slot:</span>
                <select
                  value={allAdsFilterSlot}
                  onChange={(e) => setAllAdsFilterSlot(e.target.value)}
                  className="bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:ring-2 focus:ring-[#b31b1b] outline-none"
                >
                  <option value="all">All slots</option>
                  {displaySlots.map((s) => (
                    <option key={s.slot} value={s.slot}>{SLOT_LABELS[s.slot] || s.slot}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#666]">Sort by:</span>
                <select
                  value={campaignSortBy}
                  onChange={(e) => setCampaignSortBy(e.target.value as typeof campaignSortBy)}
                  className="bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:ring-2 focus:ring-[#b31b1b] outline-none"
                >
                  <option value="startDate">Date started</option>
                  <option value="endDate">End date</option>
                  <option value="clicks">Clicks</option>
                  <option value="impressions">Impressions</option>
                </select>
                <select
                  value={campaignSortOrder}
                  onChange={(e) => setCampaignSortOrder(e.target.value as 'desc' | 'asc')}
                  className="bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:ring-2 focus:ring-[#b31b1b] outline-none"
                >
                  <option value="desc">Newest / Highest first</option>
                  <option value="asc">Oldest / Lowest first</option>
                </select>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-[#666]">
                <tr>
                  <th className="px-4 py-2 text-left font-bold text-xs uppercase">Slot</th>
                  <th className="px-4 py-2 text-left font-bold text-xs uppercase">Advertiser</th>
                  <th className="px-4 py-2 text-left font-bold text-xs uppercase">Name</th>
                  <th className="px-4 py-2 text-left font-bold text-xs uppercase">Link / CTA</th>
                  <th className="px-4 py-2 text-left font-bold text-xs uppercase">Dates</th>
                  <th className="px-4 py-2 text-left font-bold text-xs uppercase">Status</th>
                  <th className="px-4 py-2 text-right font-bold text-xs uppercase">Clicks</th>
                  <th className="px-4 py-2 text-left font-bold text-xs uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {allCampaignsFiltered.map((camp) => (
                  <tr key={camp._id} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 text-[#999] whitespace-nowrap">{SLOT_LABELS[camp.slot] || camp.slot}</td>
                    <td className="px-4 py-3 text-white">{advertisers.find((a) => a._id === camp.advertiserId)?.name || '—'}</td>
                    <td className="px-4 py-3 text-white font-medium">{camp.name}</td>
                    <td className="px-4 py-3 text-[#999] max-w-[180px] truncate" title={CTA_SLOTS.includes(camp.slot) ? (camp.description || camp.buttonText || '') : camp.destinationUrl}>
                      {CTA_SLOTS.includes(camp.slot) ? (camp.description || camp.buttonText || 'CTA') : camp.destinationUrl}
                    </td>
                    <td className="px-4 py-3 text-[#999] whitespace-nowrap">{formatDate(camp.startDate)} – {formatDate(camp.endDate)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                        camp.status === 'active' ? 'bg-green-500/10 text-green-400 border-green-500/20'
                          : camp.status === 'paused' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                            : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                      }`}>
                        {camp.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-white">{camp.clicks.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => toggleCampaignStatus(camp)} className="p-1.5 hover:bg-white/10 text-[#999] rounded-lg transition-colors text-xs" title={camp.status === 'active' ? 'Pause' : 'Start'}>
                          {camp.status === 'active' ? '⏸ Pause' : '▶ Start'}
                        </button>
                        <button onClick={() => openEditCampaign(camp)} className="p-1.5 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-colors text-xs" title="Edit">&#9998;</button>
                        <button onClick={() => handleDeleteCampaign(camp._id)} className="p-1.5 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors text-xs" title="Delete">&#128465;</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {allCampaignsFiltered.length === 0 && (
            <div className="p-6 text-center text-[#666] text-sm">No campaigns match the filters.</div>
          )}
        </div>
      )}

      {/* Error / Loading */}
      {isLoading && (
        <div className="p-12 text-center">
          <div className="w-12 h-12 border-4 border-[#b31b1b] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#999]">Loading...</p>
        </div>
      )}
      {error && <div className="p-6 text-center text-red-400 glass rounded-2xl border border-red-500/20">{error}</div>}

      {/* ─── Advertisers tab ──────────────────────────────────── */}
      {sectionTab === 'advertisers' && !isLoading && !error && (
        <>
      {advertisers.length === 0 ? (
        <div className="p-12 text-center text-[#999] glass rounded-2xl border border-white/5">
          No advertisers yet. Click &quot;+ New Advertiser&quot; to add one.
        </div>
      ) : (
      <>
      {advertisers.map((adv) => {
        const isExpanded = expandedAdvertiser === adv._id;
        const advCampaigns = campaignsFor(adv._id);

        return (
          <div key={adv._id} className="glass rounded-2xl border border-white/5 overflow-hidden">
            {/* Advertiser row */}
            <div
              className="flex items-center gap-4 p-5 cursor-pointer hover:bg-white/5 transition-colors"
              onClick={() => setExpandedAdvertiser(isExpanded ? null : adv._id)}
            >
              {adv.logo ? (
                <img src={adv.logo} alt={adv.name || 'Logo'} className="w-10 h-10 rounded-lg object-cover border border-white/10" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-lg font-bold text-white/40">
                  {(adv.name || '?').charAt(0).toUpperCase()}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="font-semibold text-white truncate">{adv.name || 'Unnamed'}</div>
                <div className="text-xs text-[#999] truncate">{(adv.email || '')}{adv.company ? ` - ${adv.company}` : ''}</div>
              </div>

              <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${(adv.status || 'inactive') === 'active' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-gray-500/10 text-gray-400 border-gray-500/20'}`}>
                {adv.status || 'inactive'}
              </span>

              <span className="text-sm text-[#999] hidden sm:inline">
                {adv.campaignCount} campaign{adv.campaignCount !== 1 ? 's' : ''}
              </span>

              <div className="flex gap-2">
                <button onClick={(e) => { e.stopPropagation(); openEditAdvertiser(adv); }} className="p-2 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-colors" title="Edit">
                  &#9998;
                </button>
                <button onClick={(e) => { e.stopPropagation(); handleDeleteAdvertiser(adv._id); }} className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors" title="Delete">
                  &#128465;
                </button>
              </div>

              <span className={`text-[#999] transition-transform ${isExpanded ? 'rotate-180' : ''}`}>&#9660;</span>
            </div>

            {/* Expanded campaigns */}
            {isExpanded && (
              <div className="border-t border-white/5 bg-white/[0.02]">
                <div className="flex items-center justify-between px-5 py-3">
                  <span className="text-sm font-bold text-[#999]">Campaigns</span>
                  <button onClick={() => openNewCampaign(adv._id)} className="px-4 py-1.5 text-sm bg-[#b31b1b] hover:bg-[#c42b2b] text-white rounded-lg font-semibold transition-colors">
                    + Campaign
                  </button>
                </div>

                {advCampaigns.length === 0 ? (
                  <div className="px-5 pb-5 text-sm text-[#666]">No campaigns yet.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-white/5 text-[#666]">
                        <tr>
                          <th className="px-5 py-2 text-left font-bold text-xs uppercase">Creative</th>
                          <th className="px-5 py-2 text-left font-bold text-xs uppercase">Name</th>
                          <th className="px-5 py-2 text-left font-bold text-xs uppercase">Slot</th>
                          <th className="px-5 py-2 text-left font-bold text-xs uppercase">Tier/Slot</th>
                          <th className="px-5 py-2 text-left font-bold text-xs uppercase">Dates</th>
                          <th className="px-5 py-2 text-left font-bold text-xs uppercase">Status</th>
                          <th className="px-5 py-2 text-left font-bold text-xs uppercase">Impr.</th>
                          <th className="px-5 py-2 text-left font-bold text-xs uppercase">Clicks</th>
                          <th className="px-5 py-2 text-left font-bold text-xs uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {advCampaigns.map((camp) => (
                          <tr key={camp._id} className="hover:bg-white/5 transition-colors">
                            <td className="px-5 py-3">
                              {CTA_SLOTS.includes(camp.slot) ? (
                                <div className="w-20 min-h-[3rem] rounded-lg bg-white/5 border border-white/10 flex items-center justify-center p-1.5">
                                  <span className="text-[10px] text-[#999] text-center leading-tight line-clamp-2" title={camp.description || camp.buttonText || 'CTA'}>
                                    {camp.description || camp.buttonText || 'CTA'}
                                  </span>
                                </div>
                              ) : camp.creative ? (
                                <img src={camp.creative} alt={camp.name} className="w-20 h-12 rounded-lg object-cover border border-white/10" />
                              ) : (
                                <div className="w-20 h-12 rounded-lg bg-white/10" />
                              )}
                            </td>
                            <td className="px-5 py-3 text-white font-medium">{camp.name}</td>
                            <td className="px-5 py-3 text-[#999]">{SLOT_LABELS[camp.slot] || camp.slot}</td>
                            <td className="px-5 py-3 text-[#999]">
                              {camp.slot === 'feed' && camp.feedTier != null && camp.tierSlot != null
                                ? `T${camp.feedTier}/${camp.tierSlot}`
                                : camp.slot === 'sidebar-feed'
                                  ? '—'
                                  : camp.position != null
                                    ? `#${camp.position}`
                                    : '-'}
                            </td>
                            <td className="px-5 py-3 text-[#999] whitespace-nowrap">
                              {formatDate(camp.startDate)} - {formatDate(camp.endDate)}
                            </td>
                            <td className="px-5 py-3">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                                camp.status === 'active' ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                  : camp.status === 'paused' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                                    : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                              }`}>
                                {camp.status}{!camp.isVisible ? ' (hidden)' : ''}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-[#999]">{camp.impressions.toLocaleString()}</td>
                            <td className="px-5 py-3 font-semibold text-white">{camp.clicks.toLocaleString()}</td>
                            <td className="px-5 py-3">
                              <div className="flex gap-2">
                                <button onClick={() => openEditCampaign(camp)} className="p-1.5 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-colors text-xs" title="Edit">
                                  &#9998;
                                </button>
                                <button onClick={() => handleDeleteCampaign(camp._id)} className="p-1.5 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors text-xs" title="Delete">
                                  &#128465;
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
      </>
      )}
        </>
      )}
    </div>
  );
}
