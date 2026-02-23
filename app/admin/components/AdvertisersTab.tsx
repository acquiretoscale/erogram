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

function FeedAdsBulkBar({
  selectedCount,
  onClear,
  onBulkStatus,
  onBulkShowOn,
  onBulkLink,
  saving,
}: {
  selectedCount: number;
  onClear: () => void;
  onBulkStatus: (status: string) => Promise<void>;
  onBulkShowOn: (feedPlacement: 'groups' | 'bots' | 'both') => Promise<void>;
  onBulkLink: (destinationUrl: string) => Promise<void>;
  saving: boolean;
}) {
  const [bulkStatus, setBulkStatus] = useState<string>('');
  const [bulkShowOn, setBulkShowOn] = useState<'groups' | 'bots' | 'both' | ''>('');
  const [bulkLinkUrl, setBulkLinkUrl] = useState<string>('');
  const isValidUrl = bulkLinkUrl.trim().startsWith('http://') || bulkLinkUrl.trim().startsWith('https://');
  return (
    <div className="flex flex-wrap items-center gap-4 p-4 mb-4 rounded-xl border border-[#b31b1b]/40 bg-[#b31b1b]/10">
      <span className="font-semibold text-white">{selectedCount} selected</span>
      <select
        value={bulkStatus}
        onChange={(e) => setBulkStatus(e.target.value)}
        className="bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
      >
        <option value="">Set status…</option>
        <option value="active">Active</option>
        <option value="paused">Paused</option>
        <option value="ended">Ended</option>
      </select>
      <button
        type="button"
        disabled={saving || !bulkStatus}
        onClick={() => bulkStatus && onBulkStatus(bulkStatus)}
        className="px-3 py-2 bg-[#b31b1b] hover:bg-[#c42b2b] disabled:opacity-50 text-white rounded-lg text-sm font-medium"
      >
        {saving ? 'Saving…' : 'Apply status'}
      </button>
      <select
        value={bulkShowOn}
        onChange={(e) => setBulkShowOn(e.target.value as 'groups' | 'bots' | 'both' | '')}
        className="bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
      >
        <option value="">Set Show on…</option>
        <option value="groups">Groups</option>
        <option value="bots">Bots</option>
        <option value="both">Both</option>
      </select>
      <button
        type="button"
        disabled={saving || !bulkShowOn}
        onClick={() => bulkShowOn && onBulkShowOn(bulkShowOn)}
        className="px-3 py-2 bg-[#b31b1b] hover:bg-[#c42b2b] disabled:opacity-50 text-white rounded-lg text-sm font-medium"
      >
        {saving ? 'Saving…' : 'Apply Show on'}
      </button>
      <div className="flex items-center gap-2">
        <input
          type="url"
          value={bulkLinkUrl}
          onChange={(e) => setBulkLinkUrl(e.target.value)}
          placeholder="New link (https://…)"
          className="bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white min-w-[200px] placeholder:text-[#666] focus:ring-2 focus:ring-[#b31b1b] focus:border-[#b31b1b] outline-none"
        />
        <button
          type="button"
          disabled={saving || !isValidUrl}
          onClick={() => {
            const url = bulkLinkUrl.trim();
            if (url && isValidUrl) onBulkLink(url);
          }}
          className="px-3 py-2 bg-[#b31b1b] hover:bg-[#c42b2b] disabled:opacity-50 text-white rounded-lg text-sm font-medium"
        >
          {saving ? 'Saving…' : 'Apply link'}
        </button>
      </div>
      <button type="button" onClick={onClear} className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm">
        Clear selection
      </button>
    </div>
  );
}

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
  const [overviewAdvSortBy, setOverviewAdvSortBy] = useState<'period' | '7d' | '30d' | 'share'>('period');
  const [overviewAdvSortOrder, setOverviewAdvSortOrder] = useState<'asc' | 'desc'>('desc');
  const [trendHoverIdx, setTrendHoverIdx] = useState<number | null>(null);
  const [compareHoverInfo, setCompareHoverInfo] = useState<{ dayIdx: number; advIdx: number } | null>(null);
  const [feedAdsFilterAdvertiser, setFeedAdsFilterAdvertiser] = useState<string>('all');
  const [feedAdsFilterStatus, setFeedAdsFilterStatus] = useState<string>('all');
  const [feedAdsFilterShowOn, setFeedAdsFilterShowOn] = useState<string>('all');
  const [feedAdsSortBy, setFeedAdsSortBy] = useState<'position' | 'clicks' | 'status' | 'feedPlacement' | 'last24h' | 'last7d' | 'last30d' | 'total'>('position');
  const [feedAdsSortOrder, setFeedAdsSortOrder] = useState<'asc' | 'desc'>('asc');
  const [feedAdsSelectedIds, setFeedAdsSelectedIds] = useState<Set<string>>(new Set());
  const [feedAdsBulkSaving, setFeedAdsBulkSaving] = useState(false);
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
    videoUrl: '',
    badgeText: '',
    verified: false,
  });
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
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
      videoUrl: '',
      badgeText: '',
      verified: false,
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
      videoUrl: (camp as any).videoUrl || '',
      badgeText: (camp as any).badgeText || '',
      verified: Boolean((camp as any).verified),
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
        videoUrl: isFeed ? ((campForm as any).videoUrl || '') : '',
        badgeText: isFeed ? ((campForm as any).badgeText || '') : '',
        verified: isFeed ? Boolean(campForm.verified) : false,
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
        videoUrl: '',
        badgeText: '',
        verified: false,
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

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['video/mp4', 'video/webm', 'video/quicktime'];
    if (!allowed.includes(file.type)) {
      alert('Use MP4, WebM, or MOV.');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      alert('Max 50 MB.');
      return;
    }
    e.target.value = '';
    setIsUploadingVideo(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const token = getToken();
      const res = await axios.post('/api/upload/video', formData, {
        headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` },
      });
      setCampForm({ ...campForm, videoUrl: res.data.url } as any);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Video upload failed');
    } finally {
      setIsUploadingVideo(false);
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

              {campForm.slot === 'feed' && (
                <div className="border border-orange-500/30 rounded-xl p-4 bg-orange-500/5">
                  <label className="block text-sm font-semibold text-orange-400 mb-1">
                    🎬 Video <span className="text-[#666] font-normal">(optional — use link or upload to R2)</span>
                  </label>
                  <input
                    type="url"
                    value={(campForm as any).videoUrl || ''}
                    onChange={(e) => setCampForm({ ...campForm, videoUrl: e.target.value } as any)}
                    className="w-full p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:ring-2 focus:ring-orange-500 outline-none mb-2"
                    placeholder="https://example.com/video.mp4"
                  />
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-[#666] text-sm">Or upload:</span>
                    <label className="cursor-pointer px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-white text-sm font-medium hover:bg-white/15 transition-colors">
                      <input type="file" accept="video/mp4,video/webm,video/quicktime" className="hidden" onChange={handleVideoUpload} disabled={isUploadingVideo} />
                      {isUploadingVideo ? 'Uploading…' : 'Choose video (MP4/WebM/MOV, max 50 MB)'}
                    </label>
                  </div>
                  <p className="text-xs text-[#666] mt-2">
                    When set, shows a video card with video as full background. Link or R2 upload — both work. Video loads lazily (no impact on page speed or SEO).
                  </p>
                </div>
              )}

              {campForm.slot === 'feed' && (
                <div>
                  <label className="block text-sm font-semibold text-[#999] mb-1">
                    🏷️ Badge Label <span className="text-[#666] font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={(campForm as any).badgeText || ''}
                    onChange={(e) => setCampForm({ ...campForm, badgeText: e.target.value } as any)}
                    className="w-full p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:ring-2 focus:ring-[#b31b1b] outline-none"
                    placeholder="e.g. Trending, Hot, New, Premium, Verified..."
                  />
                  <p className="text-xs text-[#666] mt-1">
                    Replaces "Sponsored" with a custom badge. Presets: Trending, Hot, New, Premium, Verified, Best Value, Editor&apos;s Pick, Featured, Popular, Exclusive, Limited. Leave empty for default "Sponsored" label.
                  </p>
                </div>
              )}

              {campForm.slot === 'feed' && (
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={campForm.verified}
                      onChange={(e) => setCampForm({ ...campForm, verified: e.target.checked })}
                      className="w-5 h-5 rounded border-white/10 bg-[#1a1a1a] text-blue-500 focus:ring-blue-500"
                    />
                    <span className="text-white font-medium flex items-center gap-2">
                      <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="currentColor"><path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81C14.67.63 13.43-.25 12-.25S9.33.63 8.66 1.94c-1.39-.46-2.9-.2-3.91.81s-1.27 2.52-.81 3.91C2.63 7.33 1.75 8.57 1.75 12c0 1.43.88 2.67 2.19 3.34-.46 1.39-.2 2.9.81 3.91s2.52 1.27 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.67-.88 3.34-2.19c1.39.46 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z"/></svg>
                      Verified checkmark
                    </span>
                  </label>
                  <span className="text-xs text-[#666]">Shows a blue verified badge next to the ad title</span>
                </div>
              )}
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

      {/* ─── Overview tab: marketer-first dashboard ─────────────────────────────────────── */}
      {sectionTab === 'overview' && (
        <div className="rounded-2xl bg-white p-5 sm:p-6 space-y-5" style={{ color: '#1e293b' }}>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Advertiser Performance Overview</h2>
              <p className="text-sm text-slate-500">Top-line results first, then trend and breakdowns.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-2">
              <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Advertisers</div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setDashboardAdvertiserIds([])}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${dashboardAdvertiserIds.length === 0 ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'}`}
                >
                  All
                </button>
                {advertisers.map((a) => {
                  const sel = dashboardAdvertiserIds.includes(a._id);
                  return (
                    <button
                      key={a._id}
                      type="button"
                      onClick={() => setDashboardAdvertiserIds((prev) => (sel ? prev.filter((id) => id !== a._id) : [...prev, a._id]))}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${sel ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600'}`}
                    >
                      {a.name}
                    </button>
                  );
                })}
                {advertisers.length > 2 && dashboardAdvertiserIds.length !== advertisers.length && (
                  <button type="button" onClick={() => setDashboardAdvertiserIds(advertisers.map((a) => a._id))} className="text-[11px] text-gray-400 hover:text-blue-500 underline">
                    Select all
                  </button>
                )}
                {dashboardAdvertiserIds.length > 0 && (
                  <button type="button" onClick={() => setDashboardAdvertiserIds([])} className="text-[11px] text-gray-400 hover:text-blue-500 underline">
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-2">
              <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Ad spaces</div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setDashboardSlots([])}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${dashboardSlots.length === 0 ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'}`}
                >
                  All
                </button>
                {[...displaySlots.map((s) => s.slot).filter((sl) => sl !== 'filter-cta'), 'featured-groups'].map((sl) => {
                  const sel = dashboardSlots.includes(sl);
                  return (
                    <button
                      key={sl}
                      type="button"
                      onClick={() => setDashboardSlots((prev) => (sel ? prev.filter((x) => x !== sl) : [...prev, sl]))}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${sel ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600'}`}
                    >
                      {SLOT_LABELS[sl] || sl}
                    </button>
                  );
                })}
                {dashboardSlots.length > 0 && (
                  <button type="button" onClick={() => setDashboardSlots([])} className="text-[11px] text-gray-400 hover:text-blue-500 underline">
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-2">
              <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Period</div>
              <div className="flex items-center gap-2 flex-wrap">
                {(['today', '7d', '30d', 'lifetime'] as const).map((r) => {
                  const labels: Record<string, string> = { today: 'Today', '7d': '7 days', '30d': '30 days', lifetime: 'Lifetime' };
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setDashboardRange(r)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${dashboardRange === r ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'}`}
                    >
                      {labels[r]}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setDashboardRange('custom')}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${dashboardRange === 'custom' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'}`}
                >
                  Custom
                </button>
                {dashboardRange === 'custom' && (
                  <>
                    <input type="date" value={dashboardFrom} onChange={(e) => setDashboardFrom(e.target.value)} className="rounded-lg border border-gray-200 bg-white text-gray-700 px-2 py-1 text-xs" />
                    <span className="text-gray-300">-</span>
                    <input type="date" value={dashboardTo} onChange={(e) => setDashboardTo(e.target.value)} className="rounded-lg border border-gray-200 bg-white text-gray-700 px-2 py-1 text-xs" />
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800">
            {`Active filters: ${dashboardAdvertiserIds.length === 0 ? 'All advertisers (including unassigned)' : `${dashboardAdvertiserIds.length} advertiser${dashboardAdvertiserIds.length > 1 ? 's' : ''}`} · ${dashboardSlots.length === 0 ? 'All ad spaces' : dashboardSlots.map((s) => SLOT_LABELS[s] || s).join(', ')} · ${dashboardRange === 'custom' ? (dashboardFrom && dashboardTo ? `${dashboardFrom} to ${dashboardTo}` : 'Custom range') : ({ today: 'Today', '7d': 'Last 7 days', '30d': 'Last 30 days', lifetime: 'Lifetime' } as Record<string, string>)[dashboardRange]}`}
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
            const totalByAdvertiser = Math.max(1, dashboardStats.byAdvertiser.reduce((s, r) => s + r.totalClicks, 0));
            const sortedAdvertisers = [...dashboardStats.byAdvertiser].sort((a, b) => {
              const aShare = (a.totalClicks / totalByAdvertiser) * 100;
              const bShare = (b.totalClicks / totalByAdvertiser) * 100;
              const factor = overviewAdvSortOrder === 'asc' ? 1 : -1;
              if (overviewAdvSortBy === 'period') return (a.totalClicks - b.totalClicks) * factor;
              if (overviewAdvSortBy === '7d') return (a.last7d - b.last7d) * factor;
              if (overviewAdvSortBy === '30d') return (a.last30d - b.last30d) * factor;
              return (aShare - bShare) * factor;
            });
            const toggleAdvSort = (col: 'period' | '7d' | '30d' | 'share') => {
              if (overviewAdvSortBy === col) {
                setOverviewAdvSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
              } else {
                setOverviewAdvSortBy(col);
                setOverviewAdvSortOrder('desc');
              }
            };

            return (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                  {[
                    { title: 'Selected period clicks', value: currentTotal, helper: 'Primary KPI for selected filters', tone: 'bg-blue-600 text-white border-blue-600' },
                    { title: 'Period vs previous', value: `${prevTotal > 0 ? (periodDelta >= 0 ? '+' : '') + periodDelta.toFixed(1) : '0.0'}%`, helper: `Prev: ${prevTotal.toLocaleString()} clicks`, tone: periodDelta >= 0 ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200' },
                    { title: 'Today clicks', value: kpi.todayClicks, helper: 'Since today 00:00', tone: 'bg-white text-gray-900 border-gray-200' },
                    { title: 'Last 7 days', value: kpi.last7d, helper: 'Rolling 7-day click volume', tone: 'bg-white text-gray-900 border-gray-200' },
                    { title: 'Last 30 days', value: kpi.last30d, helper: 'Rolling 30-day click volume', tone: 'bg-white text-gray-900 border-gray-200' },
                    { title: 'Lifetime clicks', value: kpi.totalClicks, helper: 'All-time clicks on selected scope', tone: 'bg-gray-50 text-gray-900 border-gray-200' },
                  ].map((card) => (
                    <div key={card.title} className={`rounded-xl border p-3 ${card.tone}`}>
                      <div className={`text-[11px] font-medium ${card.tone.includes('text-white') ? 'text-blue-100' : 'text-gray-500'}`}>{card.title}</div>
                      <div className="text-2xl font-bold tabular-nums mt-1">{typeof card.value === 'number' ? card.value.toLocaleString() : card.value}</div>
                      <div className={`text-[10px] mt-1 ${card.tone.includes('text-white') ? 'text-blue-100' : 'text-gray-400'}`}>{card.helper}</div>
                    </div>
                  ))}
                </div>

                {isSingle && (
                  <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                    <div className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider mb-1">Single advertiser focus</div>
                    <div className="text-lg font-bold text-blue-900">{selectedNames[0]}</div>
                    <p className="text-xs text-blue-700 mt-1">Focused view for client reporting, with all summary metrics above already filtered to this advertiser.</p>
                  </div>
                )}

                <div className="rounded-xl border border-gray-100 p-5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700">{isSingle ? `${selectedNames[0]} — Clicks trend` : 'Clicks trend'}</h3>
                      <p className="text-[11px] text-gray-400">Current period vs previous period for quick momentum checks.</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          const rows = [['Date', 'Clicks'], ...dashboardStats.clicksByDay.map((d) => [d.date, String(d.clicks)])];
                          const csv = rows.map((r) => r.join(',')).join('\n');
                          const blob = new Blob([csv], { type: 'text/csv' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `clicks-trend-${dashboardRange}.csv`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-200 text-xs font-medium text-gray-600 transition-colors"
                        title="Export chart data as CSV"
                      >
                        ↓ CSV
                      </button>
                      <div className="text-right">
                        {dashboardRange === 'lifetime' && <div className="text-[11px] text-gray-400">Trend uses full lifetime range</div>}
                        {dashboardStats.prevPeriodTotal !== undefined && dashboardRange !== 'lifetime' && dashboardRange !== 'custom' && (
                          <div className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${periodDelta >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                            {periodDelta >= 0 ? '+' : ''}{periodDelta.toFixed(1)}% vs previous
                          </div>
                        )}
                      </div>
                    </div>
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
                    const ch = 190;
                    const w = data.length * 26;
                    const yTicks = maxVal <= 4 ? Array.from({ length: maxVal + 1 }, (_, i) => i) : [0, Math.round(maxVal / 4), Math.round(maxVal / 2), Math.round((maxVal * 3) / 4), maxVal];
                    const showEveryN = data.length > 16 ? Math.ceil(data.length / 10) : 1;
                    const toY = (v: number) => ch - (maxVal ? (v / maxVal) * (ch - 8) : 0) - 4;
                    const hovered = trendHoverIdx !== null ? data[trendHoverIdx] : null;
                    return (
                      <div className="relative" style={{ height: ch + 30 }}>
                        {yTicks.map((t) => (
                          <div key={t} className="absolute left-0 right-0 flex items-center" style={{ bottom: (maxVal ? (t / maxVal) * ch : 0) + 24 }}>
                            <span className="text-[10px] text-gray-400 tabular-nums w-8 text-right pr-2 shrink-0">{t}</span>
                            <div className="flex-1 border-t border-dashed border-gray-100" />
                          </div>
                        ))}
                        {/* Hover tooltip */}
                        {hovered && trendHoverIdx !== null && (() => {
                          const xPct = ((trendHoverIdx * 26 + 12) / w) * 100;
                          const flip = xPct > 70;
                          return (
                            <div
                              className="absolute z-20 pointer-events-none"
                              style={{ left: `calc(32px + ${xPct}%)`, top: 0, transform: flip ? 'translateX(calc(-100% - 8px))' : 'translateX(8px)' }}
                            >
                              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.13)', padding: '10px 14px', minWidth: 120, fontSize: 12 }}>
                                <div style={{ fontWeight: 600, color: '#6b7280', marginBottom: 6, fontSize: 11 }}>{hovered.date}</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6', flexShrink: 0 }} />
                                  <span style={{ fontWeight: 700, fontSize: 16, color: '#111827', fontVariantNumeric: 'tabular-nums' }}>{hovered.clicks.toLocaleString()}</span>
                                  <span style={{ color: '#9ca3af', fontSize: 11 }}>clicks</span>
                                </div>
                                {prev && prev[trendHoverIdx] != null && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 6, paddingTop: 6, borderTop: '1px solid #f3f4f6' }}>
                                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#d1d5db', flexShrink: 0 }} />
                                    <span style={{ fontWeight: 600, color: '#6b7280', fontVariantNumeric: 'tabular-nums' }}>{prev[trendHoverIdx].clicks.toLocaleString()}</span>
                                    <span style={{ color: '#9ca3af', fontSize: 11 }}>prev</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                        <svg
                          viewBox={`0 0 ${w} ${ch}`}
                          className="w-full cursor-crosshair"
                          style={{ height: ch, marginLeft: 32 }}
                          preserveAspectRatio="none"
                          onMouseLeave={() => setTrendHoverIdx(null)}
                          onMouseMove={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const x = ((e.clientX - rect.left) / rect.width) * w;
                            const idx = Math.round((x - 12) / 26);
                            setTrendHoverIdx(idx >= 0 && idx < data.length ? idx : null);
                          }}
                        >
                          <defs>
                            <linearGradient id="overviewAreaGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.18" />
                              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.02" />
                            </linearGradient>
                          </defs>
                          {prev && prev.length === data.length && (
                            <polyline points={prev.map((d, i) => `${i * 26 + 12},${toY(d.clicks)}`).join(' ')} fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeDasharray="4 3" strokeLinejoin="round" />
                          )}
                          <path d={`M0,${ch} ` + data.map((d, i) => `L${i * 26 + 12},${toY(d.clicks)}`).join(' ') + ` L${(data.length - 1) * 26 + 12},${ch} Z`} fill="url(#overviewAreaGrad)" />
                          <polyline points={data.map((d, i) => `${i * 26 + 12},${toY(d.clicks)}`).join(' ')} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
                          {/* Hover vertical line + dot */}
                          {trendHoverIdx !== null && data[trendHoverIdx] && (
                            <>
                              <line
                                x1={trendHoverIdx * 26 + 12} y1={0}
                                x2={trendHoverIdx * 26 + 12} y2={ch}
                                stroke="#3b82f6" strokeWidth="1" strokeDasharray="3 2" opacity="0.5"
                              />
                              <circle cx={trendHoverIdx * 26 + 12} cy={toY(data[trendHoverIdx].clicks)} r={4} fill="#3b82f6" stroke="white" strokeWidth="2" />
                            </>
                          )}
                        </svg>
                        <div className="flex" style={{ marginLeft: 32 }}>
                          {data.map((d, i) => (
                            <div
                              key={d.date}
                              className={`text-center text-[10px] transition-colors ${trendHoverIdx === i ? 'text-blue-500 font-semibold' : 'text-gray-400'}`}
                              style={{ width: 26 }}
                            >
                              {i % showEveryN === 0 ? d.date.slice(5) : ''}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
                        <h3 className="text-sm font-semibold text-gray-700 mb-1">Clicks by ad space</h3>
                        <p className="text-[11px] text-gray-400 mb-3">Distribution of clicks across placements for selected filters.</p>
                        <div className="flex items-center gap-4">
                          <svg width={140} height={140} viewBox="0 0 140 140">
                            {arcs.map((a) => a.pct > 0 && (
                              <path key={a.slot} d={toPath(a.start, Math.min(a.end, a.start + 359.99), r, ir)} fill={a.color}>
                                <title>{SLOT_LABELS[a.slot] || a.slot}: {a.totalClicks} ({(a.pct * 100).toFixed(1)}%)</title>
                              </path>
                            ))}
                            <text x={cx} y={cy - 6} textAnchor="middle" className="text-lg font-bold fill-gray-900" style={{ fontSize: 18 }}>{totalSlotClicks.toLocaleString()}</text>
                            <text x={cx} y={cy + 10} textAnchor="middle" className="text-xs fill-gray-400" style={{ fontSize: 10 }}>clicks</text>
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

                  {dashboardStats.byAdvertiser.length > 0 && (
                    <div className="rounded-xl border border-gray-100 p-4">
                      <h3 className="text-sm font-semibold text-gray-700 mb-1">Top advertisers</h3>
                      <p className="text-[11px] text-gray-400 mb-3">Click ranking with sortable period columns.</p>
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-[10px] text-gray-400 uppercase border-b border-gray-100">
                            <th className="text-left py-1.5 font-medium">Advertiser</th>
                            <th className="text-right py-1.5 font-medium cursor-pointer hover:text-gray-600" onClick={() => toggleAdvSort('period')}>Period {overviewAdvSortBy === 'period' && (overviewAdvSortOrder === 'asc' ? '↑' : '↓')}</th>
                            <th className="text-right py-1.5 font-medium cursor-pointer hover:text-gray-600" onClick={() => toggleAdvSort('7d')}>7d {overviewAdvSortBy === '7d' && (overviewAdvSortOrder === 'asc' ? '↑' : '↓')}</th>
                            <th className="text-right py-1.5 font-medium cursor-pointer hover:text-gray-600" onClick={() => toggleAdvSort('30d')}>30d {overviewAdvSortBy === '30d' && (overviewAdvSortOrder === 'asc' ? '↑' : '↓')}</th>
                            <th className="text-right py-1.5 font-medium cursor-pointer hover:text-gray-600" onClick={() => toggleAdvSort('share')}>Share {overviewAdvSortBy === 'share' && (overviewAdvSortOrder === 'asc' ? '↑' : '↓')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedAdvertisers.map((row, i) => (
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
                                <span className="inline-block px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 text-[10px] font-semibold">{((row.totalClicks / totalByAdvertiser) * 100).toFixed(1)}%</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {isCompare && dashboardStats.clicksByDayByAdvertiser && dashboardStats.clicksByDayByAdvertiser.length > 0 && (() => {
                  const allAdvs = dashboardStats.byAdvertiser;
                  const data = dashboardStats.clicksByDayByAdvertiser;
                  const globalMax = Math.max(1, ...data.flatMap((d) => d.advertisers.map((a) => a.clicks)));
                  const ch = 160;
                  const cw = 24;
                  const showEveryN = data.length > 14 ? Math.ceil(data.length / 10) : 1;
                  const toY = (v: number) => ch - (globalMax ? (v / globalMax) * (ch - 8) : 0) - 4;
                  const hoveredDay = compareHoverInfo !== null ? data[compareHoverInfo.dayIdx] : null;
                  return (
                    <div className="rounded-xl border border-gray-100 p-5">
                      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
                        <div>
                          <h3 className="text-sm font-semibold text-gray-700">Advertiser comparison over time</h3>
                          <p className="text-[11px] text-gray-400">Use this to compare selected advertisers directly.</p>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                          <button
                            type="button"
                            onClick={() => {
                              const headers = ['Date', ...allAdvs.map((a) => a.advertiserName)];
                              const rows = data.map((d) => [d.date, ...allAdvs.map((a) => { const m = d.advertisers.find((x) => x.advertiserId === a.advertiserId); return String(m?.clicks ?? 0); })]);
                              const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
                              const blob = new Blob([csv], { type: 'text/csv' });
                              const url = URL.createObjectURL(blob);
                              const a2 = document.createElement('a');
                              a2.href = url;
                              a2.download = `advertiser-comparison-${dashboardRange}.csv`;
                              a2.click();
                              URL.revokeObjectURL(url);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-200 text-xs font-medium text-gray-600 transition-colors"
                          >
                            ↓ CSV
                          </button>
                          <div className="flex flex-wrap gap-3">
                            {allAdvs.map((a, i) => (
                              <span key={a.advertiserId} className="flex items-center gap-1.5 text-[11px] text-gray-500">
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />{a.advertiserName}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="relative" style={{ height: ch + 24 }}>
                        {/* Hover tooltip */}
                        {hoveredDay && compareHoverInfo !== null && (() => {
                          const xPct = ((compareHoverInfo.dayIdx * cw + 12) / (data.length * cw)) * 100;
                          const flip = xPct > 65;
                          const advEntries = allAdvs.map((a, i) => {
                            const m = hoveredDay.advertisers.find((x) => x.advertiserId === a.advertiserId);
                            return { name: a.advertiserName, clicks: m?.clicks ?? 0, color: CHART_COLORS[i % CHART_COLORS.length] };
                          }).sort((a, b) => b.clicks - a.clicks);
                          return (
                            <div
                              className="absolute z-20 pointer-events-none"
                              style={{ left: `${xPct}%`, top: 0, transform: flip ? 'translateX(calc(-100% - 6px))' : 'translateX(6px)' }}
                            >
                              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.13)', padding: '10px 14px', minWidth: 160, fontSize: 12 }}>
                                <div style={{ fontWeight: 600, color: '#6b7280', marginBottom: 8, paddingBottom: 7, borderBottom: '1px solid #f3f4f6', fontSize: 11 }}>{hoveredDay.date}</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                  {advEntries.map((e) => (
                                    <div key={e.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: e.color, flexShrink: 0 }} />
                                      <span style={{ flex: 1, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 100 }}>{e.name}</span>
                                      <span style={{ fontWeight: 700, color: '#111827', fontVariantNumeric: 'tabular-nums' }}>{e.clicks.toLocaleString()}</span>
                                    </div>
                                  ))}
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 7, paddingTop: 7, borderTop: '1px solid #f3f4f6', fontSize: 11, color: '#6b7280' }}>
                                  <span>Total</span>
                                  <span style={{ fontWeight: 700, color: '#111827', fontVariantNumeric: 'tabular-nums' }}>{advEntries.reduce((s, e) => s + e.clicks, 0).toLocaleString()}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                        <svg
                          viewBox={`0 0 ${data.length * cw} ${ch}`}
                          className="w-full cursor-crosshair"
                          style={{ height: ch }}
                          preserveAspectRatio="none"
                          onMouseLeave={() => setCompareHoverInfo(null)}
                          onMouseMove={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const x = ((e.clientX - rect.left) / rect.width) * (data.length * cw);
                            const dayIdx = Math.round((x - 12) / cw);
                            if (dayIdx >= 0 && dayIdx < data.length) {
                              setCompareHoverInfo({ dayIdx, advIdx: 0 });
                            } else {
                              setCompareHoverInfo(null);
                            }
                          }}
                        >
                          {allAdvs.map((adv, ai) => (
                            <polyline key={adv.advertiserId} points={data.map((d, i) => {
                              const m = d.advertisers.find((a) => a.advertiserId === adv.advertiserId);
                              return `${i * cw + 12},${toY(m?.clicks ?? 0)}`;
                            }).join(' ')} fill="none" stroke={CHART_COLORS[ai % CHART_COLORS.length]} strokeWidth="2" strokeLinejoin="round" />
                          ))}
                          {/* Hover vertical rule + dots */}
                          {compareHoverInfo !== null && hoveredDay && (
                            <>
                              <line
                                x1={compareHoverInfo.dayIdx * cw + 12} y1={0}
                                x2={compareHoverInfo.dayIdx * cw + 12} y2={ch}
                                stroke="#6b7280" strokeWidth="1" strokeDasharray="3 2" opacity="0.5"
                              />
                              {allAdvs.map((adv, ai) => {
                                const m = hoveredDay.advertisers.find((a) => a.advertiserId === adv.advertiserId);
                                return (
                                  <circle
                                    key={adv.advertiserId}
                                    cx={compareHoverInfo.dayIdx * cw + 12}
                                    cy={toY(m?.clicks ?? 0)}
                                    r={3.5}
                                    fill={CHART_COLORS[ai % CHART_COLORS.length]}
                                    stroke="white"
                                    strokeWidth="1.5"
                                  />
                                );
                              })}
                            </>
                          )}
                        </svg>
                        <div className="flex">
                          {data.map((d, i) => (
                            <div
                              key={d.date}
                              className={`text-center text-[10px] transition-colors ${compareHoverInfo?.dayIdx === i ? 'text-gray-700 font-semibold' : 'text-gray-400'}`}
                              style={{ width: cw }}
                            >
                              {i % showEveryN === 0 ? d.date.slice(5) : ''}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <div className="rounded-xl border border-gray-100 p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-1">Secondary insights</h3>
                  <p className="text-[11px] text-gray-400 mb-4">Support metrics for placement optimization and content performance.</p>

                  {dashboardStats.advertiserSlotBreakdown && dashboardStats.advertiserSlotBreakdown.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-xs font-semibold text-gray-600 mb-2">Slot mix by advertiser</h4>
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

                  {dashboardStats.featuredGroups && dashboardStats.featuredGroups.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-xs font-semibold text-gray-600 mb-2">Featured groups placements</h4>
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

                  <div>
                    <h4 className="text-xs font-semibold text-gray-600 mb-2">Article views by advertiser</h4>
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
                              videoUrl: '',
                              badgeText: '',
                            } as any);
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
            const filteredByShowOn = feedAdsFilterShowOn === 'all' ? filteredByStatus : filteredByStatus.filter((c) => (c.feedPlacement || 'both') === feedAdsFilterShowOn);
            const getStats = (cid: string, c: CampaignRow) => {
              const s = feedClickStats[cid] || { total: c.clicks ?? 0, last24h: 0, last7d: 0, last30d: 0 };
              return s;
            };
            const sorted = [...filteredByShowOn].sort((a, b) => {
              const order = feedAdsSortOrder === 'asc' ? 1 : -1;
              let cmp = 0;
              if (feedAdsSortBy === 'position') cmp = (a.position ?? 99) - (b.position ?? 99);
              else if (feedAdsSortBy === 'clicks' || feedAdsSortBy === 'total') {
                const sa = getStats(a._id, a);
                const sb = getStats(b._id, b);
                cmp = sa.total - sb.total;
              } else if (feedAdsSortBy === 'last24h') {
                const sa = getStats(a._id, a);
                const sb = getStats(b._id, b);
                cmp = sa.last24h - sb.last24h;
              } else if (feedAdsSortBy === 'last7d') {
                const sa = getStats(a._id, a);
                const sb = getStats(b._id, b);
                cmp = sa.last7d - sb.last7d;
              } else if (feedAdsSortBy === 'last30d') {
                const sa = getStats(a._id, a);
                const sb = getStats(b._id, b);
                cmp = sa.last30d - sb.last30d;
              } else if (feedAdsSortBy === 'status') cmp = String(a.status).localeCompare(String(b.status));
              else if (feedAdsSortBy === 'feedPlacement') cmp = String(a.feedPlacement || 'both').localeCompare(String(b.feedPlacement || 'both'));
              else cmp = 0;
              return cmp * order;
            });
            const feedTotals = Object.values(feedClickStats).reduce(
              (acc, s) => ({ total: acc.total + s.total, last24h: acc.last24h + s.last24h, last7d: acc.last7d + s.last7d, last30d: acc.last30d + s.last30d }),
              { total: 0, last24h: 0, last7d: 0, last30d: 0 }
            );
            const handleFeedAdsSort = (key: typeof feedAdsSortBy) => {
              if (feedAdsSortBy === key) setFeedAdsSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
              else {
                setFeedAdsSortBy(key);
                setFeedAdsSortOrder(key === 'position' || key === 'feedPlacement' || key === 'status' ? 'asc' : 'desc');
              }
            };
            const toggleFeedAdsSelect = (id: string) => {
              setFeedAdsSelectedIds((prev) => {
                const next = new Set(prev);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                return next;
              });
            };
            const toggleFeedAdsSelectAll = () => {
              if (feedAdsSelectedIds.size >= sorted.length) setFeedAdsSelectedIds(new Set());
              else setFeedAdsSelectedIds(new Set(sorted.map((c) => c._id)));
            };
            const clearFeedAdsSelection = () => setFeedAdsSelectedIds(new Set());
            return (
              <>
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-white mb-2">Feed Ads</h2>
                  <p className="text-[#999] text-sm">One ad every 5 entries on Groups/Bots. Assign to advertiser and monitor performance. Click column headers to sort; select rows for bulk edit.</p>
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

                {/* Filters: Advertiser, Status, Show on + New button */}
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
                  <div className="flex items-center gap-2">
                    <span className="text-[#666] text-sm">Show on:</span>
                    {['all', 'both', 'groups', 'bots'].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setFeedAdsFilterShowOn(v)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${feedAdsFilterShowOn === v ? 'bg-[#b31b1b] text-white border-[#b31b1b]' : 'bg-white/5 text-[#999] border-white/10 hover:border-white/20'}`}
                      >
                        {v === 'all' ? 'All' : v === 'both' ? 'Both' : v === 'groups' ? 'Groups' : 'Bots'}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => {
                      setCampForm({ ...campForm, slot: 'feed', advertiserId: advertisers[0]?._id || '', name: '', creative: '', destinationUrl: '', description: '', category: 'All', country: 'All', buttonText: 'Visit Site', feedTier: 1, tierSlot: 1, position: 1, feedPlacement: 'both', videoUrl: '', badgeText: '' } as any);
                      setEditingCampaign(null);
                      setView('editCampaign');
                    }}
                    className="ml-auto px-4 py-2 bg-[#b31b1b] hover:bg-[#c42b2b] text-white rounded-lg font-semibold text-sm"
                  >
                    + New feed ad
                  </button>
                </div>

                {/* Bulk action bar */}
                {feedAdsSelectedIds.size > 0 && (
                  <FeedAdsBulkBar
                    selectedCount={feedAdsSelectedIds.size}
                    onClear={clearFeedAdsSelection}
                    onBulkStatus={async (status: string) => {
                      setFeedAdsBulkSaving(true);
                      try {
                        for (const id of feedAdsSelectedIds) {
                          await axios.put(`/api/admin/campaigns/${id}`, { status }, authHeaders());
                        }
                        await fetchAll();
                        clearFeedAdsSelection();
                      } catch (err: any) {
                        alert(err.response?.data?.message || err.message || 'Bulk update failed');
                      } finally {
                        setFeedAdsBulkSaving(false);
                      }
                    }}
                    onBulkShowOn={async (feedPlacement: 'groups' | 'bots' | 'both') => {
                      setFeedAdsBulkSaving(true);
                      try {
                        for (const id of feedAdsSelectedIds) {
                          await axios.put(`/api/admin/campaigns/${id}`, { feedPlacement }, authHeaders());
                        }
                        await fetchAll();
                        clearFeedAdsSelection();
                      } catch (err: any) {
                        alert(err.response?.data?.message || err.message || 'Bulk update failed');
                      } finally {
                        setFeedAdsBulkSaving(false);
                      }
                    }}
                    onBulkLink={async (destinationUrl: string) => {
                      setFeedAdsBulkSaving(true);
                      try {
                        for (const id of feedAdsSelectedIds) {
                          await axios.put(`/api/admin/campaigns/${id}`, { destinationUrl }, authHeaders());
                        }
                        await fetchAll();
                        clearFeedAdsSelection();
                      } catch (err: any) {
                        alert(err.response?.data?.message || err.message || 'Bulk link update failed');
                      } finally {
                        setFeedAdsBulkSaving(false);
                      }
                    }}
                    saving={feedAdsBulkSaving}
                  />
                )}

                <div className="rounded-xl border border-white/10 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-white/5">
                      <tr>
                        <th className="px-3 py-2 w-10">
                          <input
                            type="checkbox"
                            checked={sorted.length > 0 && feedAdsSelectedIds.size === sorted.length}
                            onChange={toggleFeedAdsSelectAll}
                            className="rounded border-white/30 text-[#b31b1b] focus:ring-[#b31b1b]"
                          />
                        </th>
                        <th className="px-3 py-2 text-left font-bold text-[#999] text-xs uppercase cursor-pointer hover:text-white select-none" title="Every 5th entry. Active ads fill slots 5, 10, 15… in order." onClick={() => handleFeedAdsSort('position')}>
                          Slot {feedAdsSortBy === 'position' && (feedAdsSortOrder === 'asc' ? '↑' : '↓')}
                        </th>
                        <th className="px-3 py-2 text-left font-bold text-[#999] text-xs uppercase">Advertiser</th>
                        <th className="px-3 py-2 text-left font-bold text-[#999] text-xs uppercase">Image</th>
                        <th className="px-3 py-2 text-left font-bold text-[#999] text-xs uppercase">Name</th>
                        <th className="px-3 py-2 text-left font-bold text-[#999] text-xs uppercase cursor-pointer hover:text-white select-none" onClick={() => handleFeedAdsSort('feedPlacement')}>
                          Show on {feedAdsSortBy === 'feedPlacement' && (feedAdsSortOrder === 'asc' ? '↑' : '↓')}
                        </th>
                        <th className="px-3 py-2 text-right font-bold text-[#999] text-xs uppercase cursor-pointer hover:text-white select-none" onClick={() => handleFeedAdsSort('last24h')}>
                          24h {feedAdsSortBy === 'last24h' && (feedAdsSortOrder === 'asc' ? '↑' : '↓')}
                        </th>
                        <th className="px-3 py-2 text-right font-bold text-[#999] text-xs uppercase cursor-pointer hover:text-white select-none" onClick={() => handleFeedAdsSort('last7d')}>
                          7d {feedAdsSortBy === 'last7d' && (feedAdsSortOrder === 'asc' ? '↑' : '↓')}
                        </th>
                        <th className="px-3 py-2 text-right font-bold text-[#999] text-xs uppercase cursor-pointer hover:text-white select-none" onClick={() => handleFeedAdsSort('last30d')}>
                          30d {feedAdsSortBy === 'last30d' && (feedAdsSortOrder === 'asc' ? '↑' : '↓')}
                        </th>
                        <th className="px-3 py-2 text-right font-bold text-[#999] text-xs uppercase cursor-pointer hover:text-white select-none" onClick={() => handleFeedAdsSort('total')}>
                          Total {feedAdsSortBy === 'total' && (feedAdsSortOrder === 'asc' ? '↑' : '↓')}
                        </th>
                        <th className="px-3 py-2 text-left font-bold text-[#999] text-xs uppercase cursor-pointer hover:text-white select-none" onClick={() => handleFeedAdsSort('status')}>
                          Status {feedAdsSortBy === 'status' && (feedAdsSortOrder === 'asc' ? '↑' : '↓')}
                        </th>
                        <th className="px-3 py-2 text-left font-bold text-[#999] text-xs uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {sorted.map((c) => {
                        const stats = getStats(c._id, c);
                        return (
                          <tr key={c._id} className="hover:bg-white/5">
                            <td className="px-3 py-2">
                              <input
                                type="checkbox"
                                checked={feedAdsSelectedIds.has(c._id)}
                                onChange={() => toggleFeedAdsSelect(c._id)}
                                className="rounded border-white/30 text-[#b31b1b] focus:ring-[#b31b1b]"
                              />
                            </td>
                            <td className="px-3 py-2 font-bold tabular-nums">
                              {(() => {
                                const rank = c.position ?? (c.feedTier != null && c.tierSlot != null ? (c.feedTier - 1) * 4 + c.tierSlot : null);
                                if (rank == null) return <span className="text-[#666]">—</span>;
                                if (c.status === 'active') {
                                  // compute display slot within the active-only sorted list
                                  const activeRank = sorted.filter((x) => x.status === 'active').findIndex((x) => x._id === c._id);
                                  const displaySlot = activeRank >= 0 ? (activeRank + 1) * 5 : rank * 5;
                                  return <span className="text-white" title={`Priority ${rank} → shows at every ${displaySlot}th entry`}>{displaySlot}th</span>;
                                }
                                return <span className="text-[#666]" title={`Priority ${rank} (inactive)`}>#{rank}</span>;
                              })()}
                            </td>
                            <td className="px-3 py-2 text-white">{c.advertiserName || advertisers.find((a) => a._id === c.advertiserId)?.name || '—'}</td>
                            <td className="px-3 py-2">
                              {c.creative ? <img src={c.creative} alt="" className="h-10 w-14 object-cover rounded" /> : <span className="text-[#666]">—</span>}
                            </td>
                            <td className="px-3 py-2 text-white font-medium">{c.name}</td>
                            <td className="px-3 py-2 text-[#999]">{c.feedPlacement === 'both' ? 'Groups + Bots' : c.feedPlacement === 'groups' ? 'Groups' : c.feedPlacement === 'bots' ? 'Bots' : 'Both'}</td>
                            <td className="px-3 py-2 text-right text-green-400 tabular-nums">{stats.last24h.toLocaleString()}</td>
                            <td className="px-3 py-2 text-right text-[#999] tabular-nums">{stats.last7d.toLocaleString()}</td>
                            <td className="px-3 py-2 text-right text-[#999] tabular-nums">{stats.last30d.toLocaleString()}</td>
                            <td className="px-3 py-2 text-right font-semibold text-white tabular-nums">{stats.total.toLocaleString()}</td>
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
