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
  feedPlacement?: 'groups' | 'bots' | 'both';
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
  'top-banner': 'Top Banner',
  'homepage-hero': 'Homepage Hero',
  feed: 'In-Feed',
  'navbar-cta': 'Navbar CTA',
  'join-cta': 'Join CTA',
  'filter-cta': 'Filter CTA',
  'featured-groups': 'Featured Groups',
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
  const [globalStats, setGlobalStats] = useState<{ totalClicks: number; todayClicks?: number; last24h?: number; last7Days: number; last30Days: number } | null>(null);
  const [slotTotals, setSlotTotals] = useState<Array<{ slot: string; totalClicks: number; campaignCount: number }>>([]);
  const [clicksByAdvertiser, setClicksByAdvertiser] = useState<Array<{ advertiserId: string; advertiserName: string; totalClicks: number; last7Days: number; last30Days: number }>>([]);
  const [feedClickStats, setFeedClickStats] = useState<Record<string, { total: number; last24h: number; last7d: number; last30d: number }>>({});
  // Filtered dashboard (Overview KPIs + charts)
  const [dashboardRange, setDashboardRange] = useState<'today' | '7d' | '30d' | 'custom' | 'lifetime'>('30d');
  const [dashboardSlots, setDashboardSlots] = useState<string[]>([]);
  const [dashboardAdvertiserIds, setDashboardAdvertiserIds] = useState<string[]>([]);
  const [dashboardFrom, setDashboardFrom] = useState('');
  const [dashboardTo, setDashboardTo] = useState('');
  const [dashboardStats, setDashboardStats] = useState<{
    kpis: { totalClicks: number; todayClicks: number; last24h: number; last7d: number; last30d: number };
    clicksByDay: { date: string; clicks: number }[];
    clicksByDayByAdvertiser?: { date: string; advertisers: { advertiserId: string; advertiserName: string; clicks: number }[] }[];
    byAdvertiser: { advertiserId: string; advertiserName: string; totalClicks: number; last7d: number; last30d: number }[];
    bySlot: { slot: string; totalClicks: number; campaignCount: number }[];
    articleClicksByAdvertiser: { advertiserId: string; advertiserName: string; articleClicks: number }[];
    prevPeriodClicksByDay?: { date: string; clicks: number }[];
    prevPeriodTotal?: number;
    advertiserSlotBreakdown?: { advertiserId: string; advertiserName: string; slots: { slot: string; clicks: number }[] }[];
    featuredGroups?: { groupId: string; name: string; advertiserId: string; advertiserName: string; clickCount: number; lastClickedAt?: string }[];
  } | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [feedAdsFilterAdvertiser, setFeedAdsFilterAdvertiser] = useState<string>('all');
  const [feedAdsFilterStatus, setFeedAdsFilterStatus] = useState<string>('all');
  const [feedAdsSortBy, setFeedAdsSortBy] = useState<'position' | 'clicks' | 'status'>('position');
  const [feedAdsDateRange, setFeedAdsDateRange] = useState<'24h' | '7d' | '30d' | 'all'>('30d');
  const [feedAdsCustomFrom, setFeedAdsCustomFrom] = useState('');
  const [feedAdsCustomTo, setFeedAdsCustomTo] = useState('');
  const [allAdsFilterSlot, setAllAdsFilterSlot] = useState<string>('all');
  const [managedSlot, setManagedSlot] = useState<string | null>(null);
  const [sectionTab, setSectionTab] = useState<'overview' | 'slots' | 'buttonsBanners' | 'advertisers' | 'feedAds'>('overview');
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
    feedPlacement: 'both' as 'groups' | 'bots' | 'both',
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
      setClicksByAdvertiser(res.data.clicksByAdvertiser ?? []);
      setFeedClickStats(res.data.feedClickStats ?? {});
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load data');
    } finally {
      if (!skipLoading) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchDashboardStats = async () => {
    if (sectionTab !== 'overview') return;
    setDashboardLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('range', dashboardRange);
      if (dashboardSlots.length) params.set('slots', dashboardSlots.join(','));
      if (dashboardAdvertiserIds.length) params.set('advertiserIds', dashboardAdvertiserIds.join(','));
      if (dashboardRange === 'custom' && dashboardFrom) params.set('from', dashboardFrom);
      if (dashboardRange === 'custom' && dashboardTo) params.set('to', dashboardTo);
      const res = await axios.get(`/api/admin/advertiser-dashboard-stats?${params.toString()}`, authHeaders());
      setDashboardStats(res.data);
    } catch {
      setDashboardStats(null);
    } finally {
      setDashboardLoading(false);
    }
  };

  useEffect(() => {
    if (sectionTab === 'overview') fetchDashboardStats();
  }, [sectionTab, dashboardRange, dashboardSlots.join(','), dashboardAdvertiserIds.join(','), dashboardFrom, dashboardTo]);

  // When creating a new campaign, auto-select first advertiser if none selected (e.g. form opened before advertisers loaded)
  useEffect(() => {
    if (view === 'editCampaign' && !editingCampaign && !campForm.advertiserId && advertisers.length > 0) {
      setCampForm((prev) => ({ ...prev, advertiserId: advertisers[0]._id }));
    }
  }, [view, editingCampaign, advertisers, campForm.advertiserId]);

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
      feedPlacement: 'both',
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
      position: camp.slot === 'feed'
        ? (camp.position ?? (camp.feedTier != null && camp.tierSlot != null ? (camp.feedTier - 1) * 4 + camp.tierSlot : 1))
        : camp.position,
      feedTier: camp.feedTier ?? null,
      tierSlot: camp.tierSlot ?? null,
      description: camp.description || '',
      category: camp.category || 'All',
      country: camp.country || 'All',
      buttonText: camp.buttonText || 'Visit Site',
      feedPlacement: (camp.feedPlacement || 'both') as 'groups' | 'bots' | 'both',
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
    const feedPosition = campForm.slot === 'feed' ? (campForm.position != null ? Number(campForm.position) : 0) : 0;
    if (campForm.slot === 'feed' && feedPosition < 1) {
      alert('Position (1 or higher) is required for feed ads');
      return;
    }
    if (isFeed && !campForm.advertiserId) {
      alert('Please select an Advertiser (required for feed ads).');
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
      const descriptionVal = isCta ? (campForm.description || campForm.buttonText || 'Visit Site').trim() : (campForm.description ?? '').trim();
      const buttonTextVal = (campForm.buttonText ?? 'Visit Site').trim();
      const feedPos = campForm.slot === 'feed' ? Math.max(1, Math.floor(Number(campForm.position) || 1)) : null;
      const payload: Record<string, unknown> = {
        name: (campForm.name ?? '').trim() || (isCta ? ctaLabel : 'Campaign'),
        slot: String(campForm.slot ?? ''),
        creative: isCta ? '' : String(campForm.creative ?? ''),
        destinationUrl: String((campForm.destinationUrl ?? '').trim()),
        startDate: campForm.startDate,
        endDate: campForm.endDate,
        status: campForm.status ?? 'active',
        isVisible: campForm.isVisible !== false,
        position: isFeed ? feedPos : null,
        description: isFeed ? (campForm.description ?? '').trim() : (isCta ? descriptionVal : ''),
        category: isFeed ? (campForm.category ?? 'All') : 'All',
        country: isFeed ? (campForm.country ?? 'All') : 'All',
        buttonText: isFeed ? buttonTextVal : (isCta ? descriptionVal : 'Visit Site'),
        feedPlacement: isFeed ? (campForm.feedPlacement || 'both') : undefined,
      };
      if (isFeed && !editingCampaign) {
        payload.feedTier = Math.ceil((feedPos ?? 1) / 4);
        payload.tierSlot = ((feedPos ?? 1) - 1) % 4 + 1;
      }
      const assignableSlots = FEED_SLOTS.includes(campForm.slot) || CTA_SLOTS.includes(campForm.slot) || ['homepage-hero', 'top-banner'].includes(campForm.slot);
      if (assignableSlots && campForm.advertiserId) payload.advertiserId = String(campForm.advertiserId).trim();
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
        feedPlacement: 'both',
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
          {/* Assign to advertiser: feed, navbar/join/filter CTAs, homepage hero, top banner */}
          {(FEED_SLOTS.includes(campForm.slot) || CTA_SLOTS.includes(campForm.slot) || ['homepage-hero', 'top-banner'].includes(campForm.slot)) && (
            <div className="pb-4 border-b border-white/10">
              <h3 className="text-sm font-bold text-white/80 uppercase tracking-wider mb-2">Assign to advertiser</h3>
              <select value={campForm.advertiserId || ''} onChange={(e) => setCampForm({ ...campForm, advertiserId: e.target.value })} className="w-full p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-[#b31b1b] outline-none">
                <option value="">Select advertiser</option>
                {advertisers.map((a) => (
                  <option key={a._id} value={a._id}>{a.name}</option>
                ))}
              </select>
              {advertisers.length === 0 && <p className="text-amber-400/80 text-xs mt-1">No advertisers yet. Add one in the Advertisers tab first.</p>}
            </div>
          )}
          {/* Advertiser for other slots (e.g. from By slot): only on create */}
          {!FEED_SLOTS.includes(campForm.slot) && !CTA_SLOTS.includes(campForm.slot) && !['homepage-hero', 'top-banner'].includes(campForm.slot) && !editingCampaign && (
            <div>
              <label className="block text-sm font-semibold text-[#999] mb-2">Advertiser *</label>
              <select value={campForm.advertiserId || ''} onChange={(e) => setCampForm({ ...campForm, advertiserId: e.target.value })} className="w-full p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-[#b31b1b] outline-none">
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
            {/* Slot: hidden for feed ads (fixed In-Feed); show for other campaign types */}
            {!FEED_SLOTS.includes(campForm.slot) ? (
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
            ) : (
              <div>
                <label className="block text-sm font-semibold text-[#999] mb-2">Placement</label>
                <div className="w-full p-3 bg-[#1a1a1a]/50 border border-white/10 rounded-xl text-[#999]">In-Feed</div>
              </div>
            )}
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
              {campForm.slot === 'feed' && (
                <div className="border-t border-white/10 pt-4 mt-2">
                  <label className="block text-sm font-semibold text-[#999] mb-2">Position *</label>
                  <input
                    type="number"
                    min={1}
                    value={campForm.position ?? ''}
                    onChange={(e) => setCampForm({ ...campForm, position: e.target.value ? Math.max(1, Math.floor(Number(e.target.value))) : null })}
                    className="w-full p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-[#b31b1b] outline-none"
                    placeholder="1"
                  />
                  <p className="text-xs text-[#666] mt-1">Order in feed: 1 = first, higher numbers = later. One ad every 5 entries on Groups/Bots.</p>
                </div>
              )}

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
              <div>
                <label className="block text-sm font-semibold text-[#999] mb-2">Show on</label>
                <select
                  value={campForm.feedPlacement || 'both'}
                  onChange={(e) => setCampForm({ ...campForm, feedPlacement: e.target.value as 'groups' | 'bots' | 'both' })}
                  className="w-full p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-[#b31b1b] outline-none"
                >
                  <option value="both">Groups + Bots</option>
                  <option value="groups">Groups only</option>
                  <option value="bots">Bots only</option>
                </select>
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
            <>
              <div className="text-sm text-[#999]">
                <span className="font-semibold">Total clicks:</span>{' '}
                <span className="text-white font-bold">{(editingCampaign.clicks ?? 0).toLocaleString()}</span>
              </div>
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
            </>
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
          <button type="button" onClick={() => setSectionTab('buttonsBanners')} className={tabClass('buttonsBanners')}>Buttons & Banners</button>
          <button type="button" onClick={() => setSectionTab('advertisers')} className={tabClass('advertisers')}>Advertisers</button>
          <button type="button" onClick={() => setSectionTab('feedAds')} className={tabClass('feedAds')}>Feed Ads</button>
        </div>
      </div>

      {/* ─── Overview tab: comprehensive KPI dashboard ─────────────────────────────────────── */}
      {sectionTab === 'overview' && (
        <div className="rounded-2xl bg-white p-5 sm:p-6 space-y-5" style={{ color: '#1e293b' }}>

          {/* ── ROW 1: Filters ── */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider shrink-0">Advertiser</span>
              <button type="button" onClick={() => setDashboardAdvertiserIds([])} className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${dashboardAdvertiserIds.length === 0 ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'}`}>
                All
              </button>
              {advertisers.map((a) => {
                const sel = dashboardAdvertiserIds.includes(a._id);
                return (
                  <button key={a._id} type="button" onClick={() => {
                    setDashboardAdvertiserIds((prev) => sel ? prev.filter((id) => id !== a._id) : [...prev, a._id]);
                  }} className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${sel ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600'}`}>
                    {a.name}
                  </button>
                );
              })}
              {advertisers.length > 2 && dashboardAdvertiserIds.length !== advertisers.length && (
                <button type="button" onClick={() => setDashboardAdvertiserIds(advertisers.map((a) => a._id))} className="text-[11px] text-gray-400 hover:text-blue-500 underline">Select all</button>
              )}
              {dashboardAdvertiserIds.length > 0 && (
                <button type="button" onClick={() => setDashboardAdvertiserIds([])} className="text-[11px] text-gray-400 hover:text-blue-500 underline">Clear</button>
              )}
              <span className="text-[10px] text-gray-300 ml-1">{dashboardAdvertiserIds.length === 0 ? 'Showing all campaigns incl. unassigned' : `${dashboardAdvertiserIds.length} selected`}</span>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider shrink-0">Ad space</span>
              <button type="button" onClick={() => setDashboardSlots([])} className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${dashboardSlots.length === 0 ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'}`}>All</button>
              {[...displaySlots.map((s) => s.slot), 'featured-groups'].map((sl) => {
                const sel = dashboardSlots.includes(sl);
                return (
                  <button key={sl} type="button" onClick={() => setDashboardSlots((prev) => sel ? prev.filter((x) => x !== sl) : [...prev, sl])} className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${sel ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600'}`}>
                    {SLOT_LABELS[sl] || sl}
                  </button>
                );
              })}
              {dashboardSlots.length > 0 && (
                <button type="button" onClick={() => setDashboardSlots([])} className="text-[11px] text-gray-400 hover:text-blue-500 underline">Clear</button>
              )}
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider shrink-0">Period</span>
              {(['today', '7d', '30d', 'lifetime'] as const).map((r) => {
                const labels: Record<string, string> = { today: 'Today', '7d': '7 days', '30d': '30 days', lifetime: 'Lifetime' };
                return (
                  <button key={r} type="button" onClick={() => setDashboardRange(r)} className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${dashboardRange === r ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'}`}>
                    {labels[r]}
                  </button>
                );
              })}
              <button type="button" onClick={() => setDashboardRange('custom')} className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${dashboardRange === 'custom' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'}`}>Custom</button>
              {dashboardRange === 'custom' && (
                <>
                  <input type="date" value={dashboardFrom} onChange={(e) => setDashboardFrom(e.target.value)} className="rounded-lg border border-gray-200 bg-gray-50 text-gray-700 px-2 py-1 text-xs" />
                  <span className="text-gray-300">-</span>
                  <input type="date" value={dashboardTo} onChange={(e) => setDashboardTo(e.target.value)} className="rounded-lg border border-gray-200 bg-gray-50 text-gray-700 px-2 py-1 text-xs" />
                </>
              )}
            </div>
          </div>

          {dashboardLoading && <div className="py-16 text-center text-gray-400 text-sm">Loading dashboard...</div>}

          {!dashboardLoading && dashboardStats && (() => {
            const kpi = dashboardStats.kpis;
            const prevTotal = dashboardStats.prevPeriodTotal ?? 0;
            const currentTotal = dashboardStats.clicksByDay.reduce((s, d) => s + d.clicks, 0);
            const periodDelta = prevTotal > 0 ? ((currentTotal - prevTotal) / prevTotal) * 100 : 0;
            const selectedNames = dashboardAdvertiserIds.map((id) => advertisers.find((a) => a._id === id)?.name).filter(Boolean);
            const isSingle = dashboardAdvertiserIds.length === 1;
            const isCompare = dashboardAdvertiserIds.length >= 2 || (dashboardAdvertiserIds.length === 0 && (dashboardStats.byAdvertiser?.length ?? 0) >= 2);
            const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16', '#e11d48'];

            return (
            <>
              {/* ── Advertiser focus header (when one is selected) ── */}
              {isSingle && (
                <div className="rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 p-5 text-white">
                  <div className="text-blue-100 text-xs font-medium uppercase tracking-wider mb-1">Client report</div>
                  <div className="text-2xl font-bold mb-3">{selectedNames[0]}</div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {[
                      { label: 'All time', value: kpi.totalClicks },
                      { label: 'Today', value: kpi.todayClicks },
                      { label: 'Last 24h', value: kpi.last24h },
                      { label: 'Last 7d', value: kpi.last7d },
                      { label: 'Last 30d', value: kpi.last30d },
                    ].map((k) => (
                      <div key={k.label} className="bg-white/15 rounded-lg p-3">
                        <div className="text-xl font-bold tabular-nums">{k.value.toLocaleString()}</div>
                        <div className="text-[11px] text-blue-100">{k.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── KPI cards (global or multi-select) ── */}
              {!isSingle && (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {[
                    { label: 'All time', value: kpi.totalClicks, icon: '=', color: 'bg-gray-50' },
                    { label: 'Today', value: kpi.todayClicks, icon: '+', color: 'bg-blue-600 text-white' },
                    { label: 'Last 24h', value: kpi.last24h, icon: '', color: 'bg-gray-50' },
                    { label: 'Last 7 days', value: kpi.last7d, icon: '', color: 'bg-gray-50' },
                    { label: 'Last 30 days', value: kpi.last30d, icon: '', color: 'bg-gray-50' },
                  ].map((k) => (
                    <div key={k.label} className={`rounded-xl p-4 ${k.color}`}>
                      <div className={`text-2xl font-bold tabular-nums ${k.color.includes('blue-600') ? 'text-white' : 'text-gray-900'}`}>{k.value.toLocaleString()}</div>
                      <div className={`text-[11px] mt-0.5 ${k.color.includes('blue-600') ? 'text-blue-100' : 'text-gray-500'}`}>{k.label}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Period comparison badge ── */}
              {dashboardStats.prevPeriodTotal !== undefined && dashboardRange !== 'lifetime' && dashboardRange !== 'custom' && (
                <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-gray-50 border border-gray-100 text-sm">
                  <span className="text-gray-500">This period</span>
                  <span className="font-bold text-gray-900 tabular-nums">{currentTotal.toLocaleString()}</span>
                  <span className="text-gray-300">vs</span>
                  <span className="text-gray-500">Previous period</span>
                  <span className="font-bold text-gray-900 tabular-nums">{prevTotal.toLocaleString()}</span>
                  {prevTotal > 0 && (
                    <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-semibold ${periodDelta >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                      {periodDelta >= 0 ? '+' : ''}{periodDelta.toFixed(1)}%
                    </span>
                  )}
                </div>
              )}

              {/* ── Clicks over time (area chart + prev period overlay) ── */}
              <div className="rounded-xl border border-gray-100 p-5">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-semibold text-gray-700">
                    {isSingle ? `${selectedNames[0]} — Clicks over time` : 'Clicks over time'}
                  </h3>
                  {dashboardRange === 'lifetime' && <span className="text-[11px] text-gray-400">Trend: last 90 days</span>}
                </div>
                {dashboardStats.prevPeriodClicksByDay && (
                  <div className="flex gap-4 mb-2 text-[11px] text-gray-400">
                    <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-blue-500 inline-block rounded" /> Current</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-gray-300 inline-block rounded" /> Previous</span>
                  </div>
                )}
                {dashboardStats.clicksByDay.length === 0 ? (
                  <div className="h-44 flex items-center justify-center text-gray-400 text-sm">No click data for this period</div>
                ) : (() => {
                  const data = dashboardStats.clicksByDay;
                  const prev = dashboardStats.prevPeriodClicksByDay;
                  const allVals = [...data.map((x) => x.clicks), ...(prev?.map((x) => x.clicks) ?? [])];
                  const maxVal = Math.max(1, ...allVals);
                  const ch = 180;
                  const w = data.length * 24;
                  const yTicks = maxVal <= 4 ? Array.from({ length: maxVal + 1 }, (_, i) => i) : [0, Math.round(maxVal / 4), Math.round(maxVal / 2), Math.round(maxVal * 3 / 4), maxVal];
                  const showEveryN = data.length > 14 ? Math.ceil(data.length / 10) : 1;
                  const toY = (v: number) => ch - (maxVal ? (v / maxVal) * (ch - 8) : 0) - 4;
                  return (
                    <div className="relative" style={{ height: ch + 28 }}>
                      {yTicks.map((t) => (
                        <div key={t} className="absolute left-0 right-0 flex items-center" style={{ bottom: (maxVal ? (t / maxVal) * ch : 0) + 24 }}>
                          <span className="text-[10px] text-gray-400 tabular-nums w-8 text-right pr-2 shrink-0">{t}</span>
                          <div className="flex-1 border-t border-dashed border-gray-100" />
                        </div>
                      ))}
                      <svg viewBox={`0 0 ${w} ${ch}`} className="w-full" style={{ height: ch, marginLeft: 32 }} preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
                            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.01" />
                          </linearGradient>
                        </defs>
                        {prev && prev.length === data.length && (
                          <polyline points={prev.map((d, i) => `${i * 24 + 12},${toY(d.clicks)}`).join(' ')} fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeDasharray="4 3" strokeLinejoin="round" />
                        )}
                        <path d={`M0,${ch} ` + data.map((d, i) => `L${i * 24 + 12},${toY(d.clicks)}`).join(' ') + ` L${(data.length - 1) * 24 + 12},${ch} Z`} fill="url(#areaGrad)" />
                        <polyline points={data.map((d, i) => `${i * 24 + 12},${toY(d.clicks)}`).join(' ')} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
                        {data.map((d, i) => (
                          <circle key={d.date} cx={i * 24 + 12} cy={toY(d.clicks)} r="3" fill="white" stroke="#3b82f6" strokeWidth="2">
                            <title>{d.date}: {d.clicks} clicks</title>
                          </circle>
                        ))}
                      </svg>
                      <div className="flex" style={{ marginLeft: 32 }}>
                        {data.map((d, i) => <div key={d.date} className="text-center text-[10px] text-gray-400" style={{ width: 24 }}>{i % showEveryN === 0 ? d.date.slice(5) : ''}</div>)}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* ── Advertiser comparison chart (2+ selected) ── */}
              {isCompare && dashboardStats.clicksByDayByAdvertiser && dashboardStats.clicksByDayByAdvertiser.length > 0 && (() => {
                const allAdvs = dashboardStats.byAdvertiser;
                const data = dashboardStats.clicksByDayByAdvertiser;
                const globalMax = Math.max(1, ...data.flatMap((d) => d.advertisers.map((a) => a.clicks)));
                const ch = 160;
                const showEveryN = data.length > 14 ? Math.ceil(data.length / 10) : 1;
                const toY = (v: number) => ch - (globalMax ? (v / globalMax) * (ch - 8) : 0) - 4;
                return (
                  <div className="rounded-xl border border-gray-100 p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-gray-700">Advertiser comparison</h3>
                      <div className="flex flex-wrap gap-3">
                        {allAdvs.map((a, i) => (
                          <span key={a.advertiserId} className="flex items-center gap-1.5 text-[11px] text-gray-500">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />{a.advertiserName}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="relative" style={{ height: ch + 24 }}>
                      <svg viewBox={`0 0 ${data.length * 24} ${ch}`} className="w-full" style={{ height: ch }} preserveAspectRatio="none">
                        {allAdvs.map((adv, ai) => (
                          <polyline key={adv.advertiserId} points={data.map((d, i) => {
                            const m = d.advertisers.find((a) => a.advertiserId === adv.advertiserId);
                            return `${i * 24 + 12},${toY(m?.clicks ?? 0)}`;
                          }).join(' ')} fill="none" stroke={CHART_COLORS[ai % CHART_COLORS.length]} strokeWidth="2" strokeLinejoin="round" />
                        ))}
                      </svg>
                      <div className="flex">
                        {data.map((d, i) => <div key={d.date} className="text-center text-[10px] text-gray-400" style={{ width: 24 }}>{i % showEveryN === 0 ? d.date.slice(5) : ''}</div>)}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* ── Two columns row ── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                {/* Clicks by ad space — donut + list */}
                {dashboardStats.bySlot.length > 0 && (() => {
                  const slotColors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];
                  const totalSlotClicks = dashboardStats.bySlot.reduce((s, r) => s + r.totalClicks, 0);
                  let cumAngle = 0;
                  const arcs = dashboardStats.bySlot.map((row, i) => {
                    const pct = totalSlotClicks ? row.totalClicks / totalSlotClicks : 0;
                    const start = cumAngle;
                    cumAngle += pct * 360;
                    return { ...row, pct, start, end: cumAngle, color: slotColors[i % slotColors.length] };
                  });
                  const r = 60;
                  const ir = 38;
                  const cx = 70;
                  const cy = 70;
                  const toPath = (startAngle: number, endAngle: number, outerR: number, innerR: number) => {
                    const s1 = ((startAngle - 90) * Math.PI) / 180;
                    const e1 = ((endAngle - 90) * Math.PI) / 180;
                    const x1 = cx + outerR * Math.cos(s1);
                    const y1 = cy + outerR * Math.sin(s1);
                    const x2 = cx + outerR * Math.cos(e1);
                    const y2 = cy + outerR * Math.sin(e1);
                    const x3 = cx + innerR * Math.cos(e1);
                    const y3 = cy + innerR * Math.sin(e1);
                    const x4 = cx + innerR * Math.cos(s1);
                    const y4 = cy + innerR * Math.sin(s1);
                    const large = endAngle - startAngle > 180 ? 1 : 0;
                    return `M${x1},${y1} A${outerR},${outerR} 0 ${large} 1 ${x2},${y2} L${x3},${y3} A${innerR},${innerR} 0 ${large} 0 ${x4},${y4} Z`;
                  };
                  return (
                    <div className="rounded-xl border border-gray-100 p-4">
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">Click distribution by ad space</h3>
                      <div className="flex items-center gap-4">
                        <svg width={140} height={140} viewBox="0 0 140 140">
                          {arcs.map((a) => a.pct > 0 && (
                            <path key={a.slot} d={toPath(a.start, Math.min(a.end, a.start + 359.99), r, ir)} fill={a.color}>
                              <title>{SLOT_LABELS[a.slot] || a.slot}: {a.totalClicks} ({(a.pct * 100).toFixed(1)}%)</title>
                            </path>
                          ))}
                          <text x={cx} y={cy - 6} textAnchor="middle" className="text-lg font-bold fill-gray-900" style={{ fontSize: 18 }}>{totalSlotClicks.toLocaleString()}</text>
                          <text x={cx} y={cy + 10} textAnchor="middle" className="text-xs fill-gray-400" style={{ fontSize: 10 }}>total</text>
                        </svg>
                        <div className="flex-1 space-y-1.5">
                          {arcs.map((a) => (
                            <div key={a.slot} className="flex items-center gap-2 text-xs">
                              <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: a.color }} />
                              <span className="text-gray-600 truncate flex-1">{SLOT_LABELS[a.slot] || a.slot}</span>
                              <span className="font-semibold text-gray-900 tabular-nums">{a.totalClicks.toLocaleString()}</span>
                              <span className="text-gray-400 tabular-nums w-10 text-right">{(a.pct * 100).toFixed(0)}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Clicks by advertiser — table */}
                {dashboardStats.byAdvertiser.length > 0 && (
                  <div className="rounded-xl border border-gray-100 p-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Performance by advertiser</h3>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-[10px] text-gray-400 uppercase border-b border-gray-100">
                          <th className="text-left py-1.5 font-medium">Advertiser</th>
                          <th className="text-right py-1.5 font-medium">Period</th>
                          <th className="text-right py-1.5 font-medium">7d</th>
                          <th className="text-right py-1.5 font-medium">30d</th>
                          <th className="text-right py-1.5 font-medium">Share</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const total = Math.max(1, dashboardStats.byAdvertiser.reduce((s, r) => s + r.totalClicks, 0));
                          return dashboardStats.byAdvertiser.map((row, i) => (
                            <tr key={row.advertiserId} className={`${i % 2 === 0 ? '' : 'bg-gray-50/50'} ${row.advertiserId === '__unassigned__' ? 'border-t border-gray-200' : ''}`}>
                              <td className="py-1.5 text-gray-800 font-medium flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: row.advertiserId === '__unassigned__' ? '#9ca3af' : CHART_COLORS[i % CHART_COLORS.length] }} />
                                <span className={row.advertiserId === '__unassigned__' ? 'text-gray-400 italic' : ''}>
                                  {row.advertiserName}
                                  {row.advertiserName === 'Unknown' && <span className="ml-1 text-[9px] px-1 py-0.5 rounded bg-amber-50 text-amber-600 font-normal">orphaned</span>}
                                </span>
                              </td>
                              <td className="py-1.5 text-right font-semibold text-gray-900 tabular-nums">{row.totalClicks.toLocaleString()}</td>
                              <td className="py-1.5 text-right text-gray-500 tabular-nums">{row.last7d.toLocaleString()}</td>
                              <td className="py-1.5 text-right text-gray-500 tabular-nums">{row.last30d.toLocaleString()}</td>
                              <td className="py-1.5 text-right tabular-nums">
                                <span className="inline-block px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 text-[10px] font-semibold">{((row.totalClicks / total) * 100).toFixed(1)}%</span>
                              </td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* ── Per-advertiser slot breakdown (when advertiser(s) selected) ── */}
              {dashboardStats.advertiserSlotBreakdown && dashboardStats.advertiserSlotBreakdown.length > 0 && (
                <div className="rounded-xl border border-gray-100 p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Click breakdown by slot per advertiser</h3>
                  <div className={`grid gap-4 ${dashboardStats.advertiserSlotBreakdown.length === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
                    {dashboardStats.advertiserSlotBreakdown.map((adv) => {
                      const total = Math.max(1, adv.slots.reduce((s, sl) => s + sl.clicks, 0));
                      return (
                        <div key={adv.advertiserId} className="bg-gray-50 rounded-lg p-3">
                          <div className="text-xs font-semibold text-gray-700 mb-2">{adv.advertiserName}</div>
                          <div className="space-y-1.5">
                            {adv.slots.map((sl) => (
                              <div key={sl.slot} className="flex items-center gap-2 text-xs">
                                <span className="text-gray-600 truncate flex-1">{SLOT_LABELS[sl.slot] || sl.slot}</span>
                                <span className="font-semibold text-gray-900 tabular-nums">{sl.clicks.toLocaleString()}</span>
                                <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden shrink-0">
                                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(sl.clicks / total) * 100}%` }} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Featured Groups (ad placements) ── */}
              {dashboardStats.featuredGroups && dashboardStats.featuredGroups.length > 0 && (
                <div className="rounded-xl border border-gray-100 p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-0.5">Featured Groups (ad placements)</h3>
                  <p className="text-[11px] text-gray-400 mb-3">Top 2 pinned slots on the Groups page. Clicks tracked via redirect page.</p>
                  <div className="space-y-2.5">
                    {dashboardStats.featuredGroups.map((fg, i) => (
                      <div key={fg.groupId} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-lg">
                        <span className="w-6 h-6 flex items-center justify-center rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold shrink-0">#{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-gray-800 truncate">{fg.name}</div>
                          <div className="text-[10px] text-gray-400">{fg.advertiserName}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-sm font-bold text-gray-900 tabular-nums">{fg.clickCount.toLocaleString()}</div>
                          <div className="text-[10px] text-gray-400">clicks</div>
                        </div>
                        {fg.lastClickedAt && (
                          <div className="text-[10px] text-gray-300 shrink-0">Last: {new Date(fg.lastClickedAt).toLocaleDateString()}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Article views ── */}
              <div className="rounded-xl border border-gray-100 p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-0.5">Article views by advertiser</h3>
                <p className="text-[11px] text-gray-400 mb-3">Views counted each time a user opens an article. Assign advertisers to articles in the Articles tab.</p>
                {dashboardStats.articleClicksByAdvertiser.length > 0 ? (
                  <div className="space-y-2">
                    {dashboardStats.articleClicksByAdvertiser.map((row) => {
                      const max = Math.max(1, ...dashboardStats.articleClicksByAdvertiser.map((r) => r.articleClicks));
                      return (
                        <div key={row.advertiserId}>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-gray-700 font-medium">{row.advertiserName}</span>
                            <span className="font-semibold text-gray-900 tabular-nums">{row.articleClicks.toLocaleString()}</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-indigo-400 transition-all" style={{ width: `${(row.articleClicks / max) * 100}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 py-1">No articles assigned to advertisers yet.</p>
                )}
              </div>
            </>
            );
          })()}
        </div>
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
                      setSectionTab('buttonsBanners');
                    } else {
                      openNewCampaignForSlot(s.slot);
                    }
                  }}
                  className="w-full py-2 text-xs font-bold bg-[#b31b1b]/80 hover:bg-[#b31b1b] text-white rounded-lg transition-colors"
                >
                  {isTextOnlySlot(s.slot) ? 'Buttons & Banners' : '+ Add ad'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Focused "Manage ads" for one slot (when user clicks Manage ads on a slot card) */}
      {managedSlot !== null && (
        <div className="glass rounded-xl border border-white/10 overflow-hidden mb-6">
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
                    setSectionTab('buttonsBanners');
                  } else {
                    openNewCampaignForSlot(managedSlot);
                  }
                }}
                className="px-4 py-2 text-sm font-bold bg-[#b31b1b] hover:bg-[#c42b2b] text-white rounded-lg transition-colors"
              >
                {isTextOnlySlot(managedSlot) ? 'Buttons & Banners' : '+ Add ad to this slot'}
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

      {/* ─── Buttons & Banners tab ───────────────────────────────── */}
      {sectionTab === 'buttonsBanners' && !isLoading && !error && (
        <div className="space-y-8">
          {/* Buttons: Navbar CTA + Filter CTA (text only) */}
          <div className="glass rounded-xl border border-white/5 overflow-hidden">
            <h2 className="text-lg font-bold text-white p-4 border-b border-white/5">Buttons (text only)</h2>
            <p className="text-[#999] text-sm px-4 pb-3">Navbar and sidebar CTAs. Edit label and link; clicks are tracked.</p>
            <div className="divide-y divide-white/5">
              {(['navbar-cta', 'filter-cta'] as const).map((slot) => {
                const camp = campaigns.filter((c) => c.slot === slot)[0];
                const slotLabel = SLOT_LABELS[slot] || slot;
                return (
                  <div key={slot} className="p-4 flex flex-wrap items-center justify-between gap-4 hover:bg-white/[0.02]">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-white">{slotLabel}</div>
                      {camp ? (
                        <>
                          <div className="text-sm text-[#999] mt-0.5">Label: {(camp.description || camp.buttonText || '—').trim() || '—'}</div>
                          <div className="text-sm text-[#999] truncate max-w-md" title={camp.destinationUrl}>URL: {camp.destinationUrl || '—'}</div>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-xs text-[#666]">Clicks: <span className="font-semibold text-white">{(camp.clicks ?? 0).toLocaleString()}</span></span>
                            <span className={`px-2 py-0.5 rounded text-xs ${camp.status === 'active' ? 'bg-green-500/20 text-green-400' : 'text-[#666]'}`}>{camp.status}</span>
                          </div>
                        </>
                      ) : (
                        <div className="text-sm text-[#666] mt-0.5">No button set. Add one to show this CTA.</div>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {camp ? (
                        <>
                          <button type="button" onClick={() => openEditCampaign(camp)} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold">Edit</button>
                          <button type="button" onClick={() => toggleCampaignStatus(camp)} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm">{camp.status === 'active' ? 'Pause' : 'Start'}</button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setCampaignType('text');
                            setCampForm({
                              ...campForm,
                              slot,
                              advertiserId: advertisers[0]?._id ?? '',
                              name: slotLabel,
                              creative: '',
                              destinationUrl: '',
                              description: '',
                              buttonText: 'Visit',
                              startDate: toInputDate(new Date().toISOString()),
                              endDate: toInputDate(new Date(Date.now() + 90 * 86400000).toISOString()),
                              status: 'active',
                              isVisible: true,
                              position: null,
                              feedTier: null,
                              tierSlot: null,
                              feedPlacement: 'both',
                            });
                            setEditingCampaign(null);
                            setView('editCampaign');
                          }}
                          className="px-4 py-2 bg-[#b31b1b] hover:bg-[#c42b2b] text-white rounded-lg text-sm font-semibold"
                        >
                          Add button
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Banners: Homepage Hero + Top Banner */}
          <div className="glass rounded-xl border border-white/5 overflow-hidden">
            <h2 className="text-lg font-bold text-white p-4 border-b border-white/5">Banners</h2>
            <p className="text-[#999] text-sm px-4 pb-3">Homepage Hero and Top Banner (Bots & Groups). Edit image and link; clicks are tracked.</p>
            <div className="divide-y divide-white/5">
              {(['homepage-hero', 'top-banner'] as const).map((slot) => {
                const slotCamps = campaigns.filter((c) => c.slot === slot);
                const slotLabel = SLOT_LABELS[slot] || slot;
                return (
                  <div key={slot} className="p-4">
                    <div className="font-semibold text-white mb-3">{slotLabel}</div>
                    {slotCamps.length === 0 ? (
                      <div className="flex flex-wrap items-center justify-between gap-4 py-2">
                        <div className="text-sm text-[#666]">No banner set. Add one to show in this slot.</div>
                        <button
                          type="button"
                          onClick={() => openNewCampaignForSlot(slot, advertisers[0]?._id)}
                          className="px-4 py-2 bg-[#b31b1b] hover:bg-[#c42b2b] text-white rounded-lg text-sm font-semibold"
                        >
                          Add banner
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {slotCamps.map((camp) => (
                          <div key={camp._id} className="flex flex-wrap items-center gap-4 p-3 rounded-xl bg-white/5 border border-white/10">
                            {camp.creative && (
                              <img src={camp.creative} alt="" className="h-14 w-24 object-cover rounded-lg shrink-0" />
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="text-sm text-[#999] truncate max-w-md" title={camp.destinationUrl}>URL: {camp.destinationUrl || '—'}</div>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-xs text-[#666]">Clicks: <span className="font-semibold text-white">{(camp.clicks ?? 0).toLocaleString()}</span></span>
                                <span className={`px-2 py-0.5 rounded text-xs ${camp.status === 'active' ? 'bg-green-500/20 text-green-400' : 'text-[#666]'}`}>{camp.status}</span>
                              </div>
                            </div>
                            <div className="flex gap-2 shrink-0">
                              <button type="button" onClick={() => openEditCampaign(camp)} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold">Edit</button>
                              <button type="button" onClick={() => toggleCampaignStatus(camp)} className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm">{camp.status === 'active' ? 'Pause' : 'Start'}</button>
                            </div>
                          </div>
                        ))}
                        {slots.find((s) => s.slot === slot) && (slots.find((s) => s.slot === slot)?.remaining ?? 0) > 0 && (
                          <button
                            type="button"
                            onClick={() => openNewCampaignForSlot(slot, advertisers[0]?._id)}
                            className="text-sm text-blue-400 hover:underline"
                          >
                            + Add another banner for this slot
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
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
                              {camp.slot === 'feed'
                                ? (() => {
                                    const p = camp.position ?? (camp.feedTier != null && camp.tierSlot != null ? (camp.feedTier - 1) * 4 + camp.tierSlot : null);
                                    return p != null ? `#${p}` : '—';
                                  })()
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

      {/* ─── Feed Ads tab ─────────────────────────────────────── */}
      {sectionTab === 'feedAds' && !isLoading && !error && (
        <>
          {(() => {
            const feedCampaigns = campaigns.filter((c) => c.slot === 'feed');
            const filteredByAdvertiser = feedAdsFilterAdvertiser === 'all' ? feedCampaigns : feedCampaigns.filter((c) => c.advertiserId === feedAdsFilterAdvertiser);
            const filteredByStatus = feedAdsFilterStatus === 'all' ? filteredByAdvertiser : filteredByAdvertiser.filter((c) => c.status === feedAdsFilterStatus);
            const sorted = [...filteredByStatus].sort((a, b) => {
              if (feedAdsSortBy === 'position') return (a.position ?? 99) - (b.position ?? 99);
              if (feedAdsSortBy === 'clicks') return (b.clicks ?? 0) - (a.clicks ?? 0);
              return String(a.status).localeCompare(String(b.status));
            });
            const feedTotals = Object.values(feedClickStats).reduce(
              (acc, s) => ({ total: acc.total + s.total, last24h: acc.last24h + s.last24h, last7d: acc.last7d + s.last7d, last30d: acc.last30d + s.last30d }),
              { total: 0, last24h: 0, last7d: 0, last30d: 0 }
            );
            return (
              <>
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-white mb-2">Feed Ads</h2>
                  <p className="text-[#999] text-sm">One ad every 5 entries on Groups/Bots. Assign to advertiser and monitor performance.</p>
                </div>

                {/* KPI row */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
                  <div className="glass rounded-lg p-4 border border-white/5">
                    <div className="text-lg font-black text-white">{feedTotals.total.toLocaleString()}</div>
                    <div className="text-[10px] text-[#999] uppercase">Total clicks</div>
                  </div>
                  <div className="glass rounded-lg p-4 border border-white/5">
                    <div className="text-lg font-black text-green-400">{feedTotals.last24h.toLocaleString()}</div>
                    <div className="text-[10px] text-[#999] uppercase">Last 24h</div>
                  </div>
                  <div className="glass rounded-lg p-4 border border-white/5">
                    <div className="text-lg font-black text-white">{feedTotals.last7d.toLocaleString()}</div>
                    <div className="text-[10px] text-[#999] uppercase">Last 7 days</div>
                  </div>
                  <div className="glass rounded-lg p-4 border border-white/5">
                    <div className="text-lg font-black text-white">{feedTotals.last30d.toLocaleString()}</div>
                    <div className="text-[10px] text-[#999] uppercase">Last 30 days</div>
                  </div>
                </div>

                {/* Filters + New button */}
                <div className="flex flex-wrap items-center gap-4 mb-4">
                  <select
                    value={feedAdsFilterAdvertiser}
                    onChange={(e) => setFeedAdsFilterAdvertiser(e.target.value)}
                    className="bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                  >
                    <option value="all">All advertisers</option>
                    {advertisers.map((a) => (
                      <option key={a._id} value={a._id}>{a.name}</option>
                    ))}
                  </select>
                  <select
                    value={feedAdsFilterStatus}
                    onChange={(e) => setFeedAdsFilterStatus(e.target.value)}
                    className="bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                  >
                    <option value="all">All statuses</option>
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="ended">Ended</option>
                  </select>
                  <span className="text-[#666] text-sm">Sort by:</span>
                  <select
                    value={feedAdsSortBy}
                    onChange={(e) => setFeedAdsSortBy(e.target.value as 'position' | 'clicks' | 'status')}
                    className="bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                  >
                    <option value="position">Position (default)</option>
                    <option value="clicks">Clicks</option>
                    <option value="status">Status</option>
                  </select>
                  <button
                    onClick={() => {
                      setCampForm({ ...campForm, slot: 'feed', advertiserId: advertisers[0]?._id || '', name: '', creative: '', destinationUrl: '', description: '', category: 'All', country: 'All', buttonText: 'Visit Site', feedTier: 1, tierSlot: 1, position: 1, feedPlacement: 'both' });
                      setEditingCampaign(null);
                      setView('editCampaign');
                    }}
                    className="ml-auto px-4 py-2 bg-[#b31b1b] hover:bg-[#c42b2b] text-white rounded-lg font-semibold text-sm"
                  >
                    + New feed ad
                  </button>
                </div>

                <div className="rounded-xl border border-white/10 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-white/5">
                      <tr>
                        <th className="px-3 py-2 text-left font-bold text-[#999] text-xs uppercase">#</th>
                        <th className="px-3 py-2 text-left font-bold text-[#999] text-xs uppercase">Advertiser</th>
                        <th className="px-3 py-2 text-left font-bold text-[#999] text-xs uppercase">Image</th>
                        <th className="px-3 py-2 text-left font-bold text-[#999] text-xs uppercase">Name</th>
                        <th className="px-3 py-2 text-left font-bold text-[#999] text-xs uppercase">Show on</th>
                        <th className="px-3 py-2 text-right font-bold text-[#999] text-xs uppercase">24h</th>
                        <th className="px-3 py-2 text-right font-bold text-[#999] text-xs uppercase">7d</th>
                        <th className="px-3 py-2 text-right font-bold text-[#999] text-xs uppercase">30d</th>
                        <th className="px-3 py-2 text-right font-bold text-[#999] text-xs uppercase">Total</th>
                        <th className="px-3 py-2 text-left font-bold text-[#999] text-xs uppercase">Status</th>
                        <th className="px-3 py-2 text-left font-bold text-[#999] text-xs uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {sorted.map((c) => {
                        const stats = feedClickStats[c._id] || { total: c.clicks ?? 0, last24h: 0, last7d: 0, last30d: 0 };
                        return (
                          <tr key={c._id} className="hover:bg-white/5">
                            <td className="px-3 py-2 font-bold text-white">{c.position ?? (c.feedTier != null && c.tierSlot != null ? (c.feedTier - 1) * 4 + c.tierSlot : '—')}</td>
                            <td className="px-3 py-2 text-white">{c.advertiserName || advertisers.find((a) => a._id === c.advertiserId)?.name || '—'}</td>
                            <td className="px-3 py-2">
                              {c.creative ? <img src={c.creative} alt="" className="h-10 w-14 object-cover rounded" /> : <span className="text-[#666]">—</span>}
                            </td>
                            <td className="px-3 py-2 text-white font-medium">{c.name}</td>
                            <td className="px-3 py-2 text-[#999]">{c.feedPlacement === 'both' ? 'Groups + Bots' : c.feedPlacement === 'groups' ? 'Groups' : c.feedPlacement === 'bots' ? 'Bots' : 'Both'}</td>
                            <td className="px-3 py-2 text-right text-green-400">{stats.last24h.toLocaleString()}</td>
                            <td className="px-3 py-2 text-right text-[#999]">{stats.last7d.toLocaleString()}</td>
                            <td className="px-3 py-2 text-right text-[#999]">{stats.last30d.toLocaleString()}</td>
                            <td className="px-3 py-2 text-right font-semibold text-white">{stats.total.toLocaleString()}</td>
                            <td className="px-3 py-2">
                              <span className={`px-2 py-0.5 rounded text-xs ${c.status === 'active' ? 'bg-green-500/20 text-green-400' : 'text-[#666]'}`}>{c.status}</span>
                            </td>
                            <td className="px-3 py-2">
                              <button onClick={() => openEditCampaign(c)} className="text-blue-400 hover:underline mr-2">Edit</button>
                              <button onClick={() => handleDeleteCampaign(c._id)} className="text-red-400 hover:underline">Delete</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {sorted.length === 0 && (
                  <div className="p-8 text-center text-[#666]">No feed ads. Create one with &quot;+ New feed ad&quot; or add a campaign with slot In-Feed in By slot.</div>
                )}
              </>
            );
          })()}
        </>
      )}

    </div>
  );
}
