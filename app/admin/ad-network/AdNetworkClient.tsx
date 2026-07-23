'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getCampaigns, updateCampaign, deleteCampaign, getCampaignPeriodClicks } from '@/lib/actions/campaigns';
import { getBoostCampaigns, setBoostLifecycle, convertBoostToPlacedCampaign, type BoostCampaign } from '@/lib/actions/paidCampaigns';
import { getAdvertisers, updateAdvertiser } from '@/lib/actions/advertisers';
import { PLACEMENTS, RESERVED_PLACEMENTS, AD_KEYWORDS, canonicalKeyword, type PlacementDef } from '@/lib/adPlacements';

type Campaign = {
  _id: string;
  name: string;
  advertiserId: string;
  advertiserName: string;
  slot: string;
  status: string;
  adType: string;
  creative: string;
  destinationUrl: string;
  clicks: number;
  placements: string[];
  targetKeywords: string[];
  priority: 'normal' | 'boost';
  dailyClickCap: number | null;
  blockFormat?: 'banner' | 'card';
  startDate: string;
  endDate: string | null;
  isVisible: boolean;
  // Virtual-boost fields (present only on read-through boost rows, never real Campaigns).
  isVirtualBoost?: boolean;
  listingId?: string;
  entityType?: 'group' | 'bot' | 'ainsfw';
};

/** Normalize a virtual boost into the Campaign row shape the list/buckets already understand. */
function boostToRow(b: BoostCampaign): Campaign {
  return {
    _id: b._id,
    name: b.name,
    advertiserId: '',
    advertiserName: 'Boosted listing',
    slot: b.slot,
    status: b.status === 'ended' ? 'ended' : 'active',
    adType: b.adType,
    creative: b.creative,
    destinationUrl: '',
    clicks: b.clicks,
    placements: [],
    targetKeywords: [],
    priority: 'normal',
    dailyClickCap: null,
    startDate: b.startDate,
    endDate: b.endDate,
    isVisible: true,
    isVirtualBoost: true,
    listingId: b.listingId,
    entityType: b.entityType,
  };
}

type PeriodClicks = Record<string, { today: number; last7d: number; last30d: number }>;
type ClickPeriod = 'today' | '7d' | '30d' | 'lifetime';

// Map placement IDs → short labels so rows can show where an ad runs without opening it.
const PLACEMENT_LABEL = new Map<string, string>(
  [...PLACEMENTS, ...RESERVED_PLACEMENTS].map((p) => [p.id, p.label]),
);

/** Live run-status from status + start/end dates (a past end date = Ended even if 'active'). */
function runStatus(c: Campaign): { label: string; cls: string } {
  const now = Date.now();
  const start = c.startDate ? new Date(c.startDate).getTime() : null;
  const end = c.endDate ? new Date(c.endDate).getTime() : null;
  if (c.status === 'ended') return { label: 'Ended', cls: 'bg-red-500/15 text-red-300 border-red-500/30' };
  if (c.status === 'paused') return { label: 'Paused', cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30' };
  if (end && end < now) return { label: 'Ended', cls: 'bg-red-500/15 text-red-300 border-red-500/30' };
  if (start && start > now) return { label: 'Scheduled', cls: 'bg-sky-500/15 text-sky-300 border-sky-500/30' };
  if (c.status === 'active' && c.isVisible !== false) return { label: 'Running', cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' };
  if (c.isVisible === false) return { label: 'Hidden', cls: 'bg-white/10 text-white/50 border-white/15' };
  return { label: c.status || 'Unknown', cls: 'bg-white/10 text-white/50 border-white/15' };
}

const PLACEMENT_GROUPS = [
  'Top Groups',
  'In-Feed',
  'Top Bots',
  'Join Pages',
  'AI NSFW',
  'Home',
  'Best Groups',
  'OnlyFans',
  'Banners',
  'Trending on Erogram',
] as const;

// Top-level buckets shown as filter pills. Each maps to one PlacementDef.group.
// These are the surfaces the owner thinks in: Top Groups / Top AI NSFW / Top Bots / In feed / In-page.
const CATEGORY_PILLS: { id: string; label: string; group: PlacementDef['group'] | 'House' }[] = [
  { id: 'Top Groups', label: 'Top Groups', group: 'Top Groups' },
  { id: 'AI NSFW', label: 'Top AI NSFW', group: 'AI NSFW' },
  { id: 'Top Bots', label: 'Top Bots', group: 'Top Bots' },
  { id: 'In-Feed', label: 'In feed', group: 'In-Feed' },
  { id: 'Home', label: 'TRENDING (Main)', group: 'Home' },
  { id: 'Best Groups', label: 'Top 10s', group: 'Best Groups' },
  { id: 'OnlyFans', label: 'OF Search', group: 'OnlyFans' },
  { id: 'Join Pages', label: 'CTA / In-page', group: 'Join Pages' },
  { id: 'Banners', label: 'Banners', group: 'Banners' },
  { id: 'Trending on Erogram', label: 'Trending on Erogram', group: 'Trending on Erogram' },
  // House ad: Erogram Premium self-promo (adType 'premium'). 'House' matches no placement,
  // so the bucket is driven purely by adType in campaignGroups() below.
  { id: 'Erogram Premium', label: 'Erogram Premium', group: 'House' },
];

// The owner's mental model: launch/manage ads organized into THREE tiers so the page never
// overwhelms. Each tier holds the category pills that belong to it. Best Groups / OnlyFans
// (Top-10 integrated surfaces) live in Mid tier.
const TIERS: { id: string; label: string; hint: string; pills: string[] }[] = [
  { id: 'top', label: 'Top Tier', hint: 'Highest-value spots', pills: ['Top Groups', 'Top Bots', 'AI NSFW'] },
  { id: 'mid', label: 'Mid Tier', hint: 'In-feed, blocks & Top-10s', pills: ['In-Feed', 'Home', 'Best Groups', 'OnlyFans', 'Trending on Erogram'] },
  { id: 'other', label: 'Other', hint: 'CTA, banners & house', pills: ['Join Pages', 'Banners', 'Erogram Premium'] },
];

// Placement IDs belonging to each category bucket (for filtering by group).
const PLACEMENTS_IN_GROUP = new Map<string, string[]>(
  CATEGORY_PILLS.map((cat) => [cat.id, PLACEMENTS.filter((p) => p.group === cat.group).map((p) => p.id)]),
);

/**
 * Which category bucket a campaign belongs to. Uses NEW placements[] when present,
 * otherwise falls back to the LEGACY slot/tierSlot/adType so existing campaigns
 * (which have no placements assigned yet) still show up in the right pill.
 */
function campaignGroups(c: Campaign): Set<string> {
  const groups = new Set<string>();
  // New engine: explicit placements.
  for (const pid of c.placements || []) {
    for (const [groupId, ids] of PLACEMENTS_IN_GROUP) {
      if (ids.includes(pid)) groups.add(groupId);
    }
  }
  // Legacy fallback (no placements assigned): infer from slot/tierSlot/adType.
  if (groups.size === 0) {
    if (c.adType === 'boost-group') groups.add('Top Groups');
    else if (c.adType === 'boost-bot') groups.add('Top Bots');
    else if (c.adType === 'boost-ainsfw') groups.add('AI NSFW');
    else if (c.adType === 'featured-nsfw') groups.add('AI NSFW');
    else if (c.adType === 'featured-bot') { groups.add('Top Bots'); groups.add('In-Feed'); }
    else if (c.slot === 'feed') groups.add('In-Feed');
    else if (c.slot === 'join-cta') groups.add('Join Pages');
    else if (c.slot === 'top-banner' || c.slot === 'navbar-cta' || c.slot === 'homepage-hero') groups.add('Banners');
    else if (c.slot === 'ainsfw') groups.add('AI NSFW');
  }
  // Erogram Premium house ads are always findable under their own pill, regardless of placement.
  if (c.adType === 'premium') groups.add('Erogram Premium');
  return groups;
}

function fmt(n: number): string {
  return n.toLocaleString('en-US');
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return 'Evergreen';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  if (d.getFullYear() >= 2099) return 'no end';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Small creative thumbnail with a typed fallback so the list is scannable at a glance.
function Thumb({ c }: { c: Campaign }) {
  const [broken, setBroken] = useState(false);
  const initial = (c.adType?.[0] || c.name?.[0] || '?').toUpperCase();
  const tint =
    c.adType === 'onlyfans-creator' ? 'from-pink-500/40 to-rose-600/30'
    : c.adType === 'featured-nsfw' ? 'from-fuchsia-500/40 to-purple-600/30'
    : c.adType === 'premium' ? 'from-amber-500/40 to-orange-600/30'
    : c.adType === 'featured-bot' ? 'from-sky-500/40 to-blue-600/30'
    : 'from-white/15 to-white/5';
  if (c.creative && !broken) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={c.creative}
        alt=""
        onError={() => setBroken(true)}
        className="w-12 h-12 rounded-lg object-cover shrink-0 border border-white/10"
      />
    );
  }
  return (
    <div className={`w-12 h-12 rounded-lg shrink-0 border border-white/10 bg-gradient-to-br ${tint} grid place-items-center text-sm font-black text-white/70`}>
      {initial}
    </div>
  );
}

export default function AdNetworkClient() {
  const [token, setToken] = useState('');
  const [toast, setToast] = useState('');

  // Placement manager
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [boosts, setBoosts] = useState<Campaign[]>([]);
  const [periodClicks, setPeriodClicks] = useState<PeriodClicks>({});
  const [clickPeriod, setClickPeriod] = useState<ClickPeriod>('7d');
  const [campLoading, setCampLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);

  // Placement Manager filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused' | 'ended'>('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [placedFilter, setPlacedFilter] = useState<'all' | 'placed' | 'unplaced'>('all');
  const [groupFilter, setGroupFilter] = useState('all'); // category bucket: Top Groups / AI NSFW / …
  const [ofOnly, setOfOnly] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null); // campaign currently running a lifecycle action
  const [sortBy, setSortBy] = useState<'clicks' | 'recent' | 'name'>('clicks');

  const [draftPlacements, setDraftPlacements] = useState<string[]>([]);
  const [draftKeywords, setDraftKeywords] = useState('');
  const [draftPriority, setDraftPriority] = useState<'normal' | 'boost'>('normal');
  const [draftBlockFormat, setDraftBlockFormat] = useState<'banner' | 'card'>('card');
  // Per-advertiser daily cap (applies to ALL the advertiser's ads platform-wide).
  const [advCapMap, setAdvCapMap] = useState<Record<string, number>>({});
  const [draftAdvCap, setDraftAdvCap] = useState('');
  const [saving, setSaving] = useState(false);
  // After converting a boost, open the resulting campaign once it appears in the reloaded list.
  const [pendingEditId, setPendingEditId] = useState<string | null>(null);

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(''), 3000); };

  useEffect(() => {
    setToken(typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '');
  }, []);

  const loadCampaigns = useCallback(async () => {
    if (!token) return;
    setCampLoading(true);
    try {
      const [res, advs, periods, boostRows] = await Promise.all([
        getCampaigns(token) as Promise<Campaign[]>,
        getAdvertisers(token) as Promise<{ _id: string; dailyClickCap: number }[]>,
        getCampaignPeriodClicks(token) as Promise<PeriodClicks>,
        getBoostCampaigns(token),
      ]);
      setCampaigns(res);
      setBoosts(boostRows.map(boostToRow));
      setPeriodClicks(periods);
      const capMap: Record<string, number> = {};
      for (const a of advs) capMap[a._id] = a.dailyClickCap || 0;
      setAdvCapMap(capMap);
    } catch {
      flash('Failed to load campaigns');
    }
    setCampLoading(false);
  }, [token]);

  useEffect(() => { if (token) loadCampaigns(); }, [token, loadCampaigns]);

  // Once a just-converted campaign lands in the list, open it in the placement editor.
  useEffect(() => {
    if (!pendingEditId) return;
    const c = campaigns.find((x) => x._id === pendingEditId);
    if (c) { startEdit(c); setPendingEditId(null); }
  }, [pendingEditId, campaigns]); // eslint-disable-line react-hooks/exhaustive-deps

  const startEdit = (c: Campaign) => {
    setEditing(c._id);
    setDraftPlacements(c.placements || []);
    setDraftKeywords((c.targetKeywords || []).join(', '));
    setDraftPriority(c.priority || 'normal');
    setDraftBlockFormat((c.blockFormat as 'banner' | 'card') || 'card');
    // Prefill the per-campaign cap; fall back to the advertiser cap only for non-OF single-campaign advertisers.
    const perCampaign = c.dailyClickCap || 0;
    const advCap = c.adType === 'onlyfans-creator' ? 0 : (advCapMap[c.advertiserId] || 0);
    const cap = perCampaign > 0 ? perCampaign : advCap;
    setDraftAdvCap(cap > 0 ? String(cap) : '');
  };

  const togglePlacement = (id: string) => {
    setDraftPlacements((prev) => prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]);
  };

  const saveEdit = async (id: string) => {
    setSaving(true);
    try {
      const keywords = [...new Set(draftKeywords.split(',').map((k) => canonicalKeyword(k)).filter(Boolean))];
      const camp = campaigns.find((c) => c._id === id);
      const newCap = draftAdvCap.trim() === '' ? 0 : Math.max(0, Math.floor(Number(draftAdvCap) || 0));
      const targetsHomeBlock = draftPlacements.some((p) => p === 'home-block-1' || p === 'home-block-2');
      await updateCampaign(token, id, {
        placements: draftPlacements,
        targetKeywords: keywords,
        priority: draftPriority,
        // Cap is PER-CAMPAIGN (0 = uncapped). OF creators share one system advertiser,
        // so a per-advertiser cap would wrongly bleed across every creator — never do that here.
        dailyClickCap: newCap > 0 ? newCap : null,
        // Home block format only matters when the ad targets a SPOTLIGHT adspace.
        ...(targetsHomeBlock ? { blockFormat: draftBlockFormat } : {}),
      });
      // Per-advertiser cap ONLY for advertisers that own a single campaign (real sponsors),
      // and NEVER for OnlyFans creators (they share the system advertiser).
      if (camp?.advertiserId && camp.adType !== 'onlyfans-creator') {
        const sharesAdvertiser = campaigns.filter((c) => c.advertiserId === camp.advertiserId).length > 1;
        if (!sharesAdvertiser && newCap !== (advCapMap[camp.advertiserId] || 0)) {
          await updateAdvertiser(token, camp.advertiserId, { dailyClickCap: newCap });
        }
      }
      flash('Saved');
      setEditing(null);
      await loadCampaigns();
    } catch {
      flash('Save failed');
    }
    setSaving(false);
  };

  // ── Lifecycle actions (apply immediately; OF-creator changes sync to the rail server-side) ──
  const pauseResume = async (c: Campaign) => {
    const isRunning = runStatus(c).label === 'Running';
    setActingId(c._id);
    try {
      if (isRunning) {
        await updateCampaign(token, c._id, { status: 'paused', isVisible: true });
        flash('Paused');
      } else {
        // Resume must actually go live: revive expired/scheduled dates so it isn't stuck "Ended".
        const now = Date.now();
        const patch: Record<string, unknown> = { status: 'active', isVisible: true };
        if (c.startDate && new Date(c.startDate).getTime() > now) patch.startDate = new Date().toISOString();
        if (c.endDate && new Date(c.endDate).getTime() < now) {
          patch.endDate = new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString();
        }
        await updateCampaign(token, c._id, patch);
        flash('Resumed');
      }
      await loadCampaigns();
    } catch { flash('Action failed'); }
    setActingId(null);
  };

  const launchForLifetime = async (c: Campaign) => {
    setActingId(c._id);
    try {
      await updateCampaign(token, c._id, {
        status: 'active', isVisible: true,
        startDate: new Date().toISOString(), endDate: null,
      });
      flash('Launched evergreen');
      await loadCampaigns();
    } catch { flash('Launch failed'); }
    setActingId(null);
  };

  const launchFor = async (c: Campaign, days: number) => {
    setActingId(c._id);
    try {
      const start = new Date();
      const end = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
      await updateCampaign(token, c._id, {
        status: 'active', isVisible: true,
        startDate: start.toISOString(), endDate: end.toISOString(),
      });
      flash(`Launched for ${days} days`);
      await loadCampaigns();
    } catch { flash('Launch failed'); }
    setActingId(null);
  };

  const removeCampaign = async (c: Campaign) => {
    if (!confirm(`Delete "${c.name}"? This removes it from the network${c.adType === 'onlyfans-creator' ? ' and pulls it from the OnlyFans featured rail' : ''}. This cannot be undone.`)) return;
    setActingId(c._id);
    try {
      await deleteCampaign(token, c._id);
      flash('Deleted');
      setEditing(null);
      await loadCampaigns();
    } catch { flash('Delete failed'); }
    setActingId(null);
  };

  const adTypes = useMemo(
    () => Array.from(new Set([...campaigns, ...boosts].map((c) => c.adType).filter(Boolean))).sort(),
    [campaigns, boosts],
  );

  // ── Boost lifecycle (virtual rows) — writes straight back to the listing ──
  const boostAction = async (c: Campaign, action: 'pause' | 'resume' | 'end' | 'extend' | 'lifetime', days?: number) => {
    if (!c.listingId || !c.entityType) return;
    if (action === 'end' && !confirm(`End the boost for "${c.name}"? It stops ranking as boosted.`)) return;
    setActingId(c._id);
    try {
      await setBoostLifecycle(token, c.entityType, c.listingId, action, days);
      flash(
        action === 'lifetime' ? 'Boost set to lifetime'
        : action === 'extend' ? `Boosted for ${days} days`
        : action === 'pause' ? 'Boost paused'
        : action === 'resume' ? 'Boost resumed'
        : 'Boost ended'
      );
      await loadCampaigns();
    } catch { flash('Action failed'); }
    setActingId(null);
  };

  // Convert a boost into a real, placeable Campaign (organic ranking stays). After it's created we
  // reload and open the new campaign so the placement editor is ready to assign slots.
  const convertBoost = async (c: Campaign) => {
    if (!c.listingId || !c.entityType) return;
    setActingId(c._id);
    try {
      const res = await convertBoostToPlacedCampaign(token, c.entityType, c.listingId);
      if (res.error || !res.campaignId) { flash(res.error || 'Convert failed'); setActingId(null); return; }
      flash(res.existed ? 'Already a placed ad — opening it' : 'Converted — now assign slots');
      setEditing(null);
      await loadCampaigns();
      setPendingEditId(res.campaignId);
    } catch { flash('Convert failed'); }
    setActingId(null);
  };

  // Clicks for the currently selected period (lifetime lives on the campaign; rest from periodClicks).
  // Virtual boosts only track lifetime clicks on the listing, so we show that figure for any period.
  const clicksFor = useCallback((c: Campaign): number => {
    if (c.isVirtualBoost) return c.clicks || 0;
    if (clickPeriod === 'lifetime') return c.clicks || 0;
    const p = periodClicks[c._id];
    if (!p) return 0;
    return clickPeriod === 'today' ? p.today : clickPeriod === '7d' ? p.last7d : p.last30d;
  }, [clickPeriod, periodClicks]);

  // Real campaigns + virtual boosts, as one list the filters/buckets operate on.
  const allRows = useMemo(() => [...campaigns, ...boosts], [campaigns, boosts]);

  const periodLabel = clickPeriod === 'today' ? 'today' : clickPeriod === '7d' ? 'last 7d' : clickPeriod === '30d' ? 'last 30d' : 'lifetime';

  const filteredCampaigns = useMemo(() => {
    const q = search.trim().toLowerCase();
    const out = allRows.filter((c) => {
      if (ofOnly && c.adType !== 'onlyfans-creator') return false;
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (typeFilter !== 'all' && c.adType !== typeFilter) return false;
      if (placedFilter === 'placed' && !(c.placements?.length > 0)) return false;
      if (placedFilter === 'unplaced' && c.placements?.length > 0) return false;
      if (groupFilter !== 'all' && !campaignGroups(c).has(groupFilter)) return false;
      if (q && !(`${c.name} ${c.advertiserName}`.toLowerCase().includes(q))) return false;
      return true;
    });
    out.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'recent') return new Date(b.startDate || 0).getTime() - new Date(a.startDate || 0).getTime();
      return clicksFor(b) - clicksFor(a); // 'clicks'
    });
    return out;
  }, [allRows, search, statusFilter, typeFilter, placedFilter, groupFilter, ofOnly, sortBy, clicksFor]);

  // Count of campaigns assigned to each category bucket (for the pill badges).
  const groupCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const cat of CATEGORY_PILLS) counts[cat.id] = 0;
    for (const c of allRows) {
      for (const g of campaignGroups(c)) counts[g] = (counts[g] || 0) + 1;
    }
    return counts;
  }, [allRows]);

  return (
    <div className="text-white">
      <div className="max-w-6xl">
          <div>
            <div className="flex items-center justify-between gap-3 mb-5">
              <p className="text-sm text-white/50">
                Manage all campaigns: placements, caps, pause/resume.
              </p>
              <a
                href="/admin/ad-network/launch"
                className="shrink-0 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-sm font-semibold transition-colors"
              >
                + New Campaign
              </a>
            </div>

            {/* Filter bar */}
            {!campLoading && allRows.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search campaign or advertiser…"
                  className="flex-1 min-w-[200px] rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-sm focus:border-red-500 outline-none"
                />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                  className="rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-sm focus:border-red-500 outline-none"
                >
                  <option value="all">All statuses</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="ended">Ended</option>
                </select>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-sm focus:border-red-500 outline-none"
                >
                  <option value="all">All types</option>
                  {adTypes.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <select
                  value={placedFilter}
                  onChange={(e) => setPlacedFilter(e.target.value as typeof placedFilter)}
                  className="rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-sm focus:border-red-500 outline-none"
                >
                  <option value="all">Placed & unplaced</option>
                  <option value="placed">Has placements</option>
                  <option value="unplaced">No placements</option>
                </select>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-sm focus:border-red-500 outline-none"
                >
                  <option value="clicks">Sort: Most clicks</option>
                  <option value="recent">Sort: Newest</option>
                  <option value="name">Sort: Name A–Z</option>
                </select>
                <button
                  onClick={() => setOfOnly((v) => !v)}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold border transition-colors ${
                    ofOnly ? 'bg-pink-600 text-white border-pink-500' : 'bg-black/40 text-white/60 border-white/10 hover:text-white'
                  }`}
                >
                  OnlyFans only
                </button>
                <span className="text-xs text-white/40 px-1">{filteredCampaigns.length} of {allRows.length}</span>
              </div>
            )}

            {/* Surfaces organized into TIERS (Top / Mid / Other) so the page never overwhelms.
                Each tier groups the category pills that belong to it. */}
            {!campLoading && allRows.length > 0 && (
              <div className="space-y-2.5 mb-4">
                <button
                  onClick={() => setGroupFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    groupFilter === 'all' ? 'bg-red-600 text-white' : 'bg-white/[0.06] text-white/50 hover:text-white'
                  }`}
                >
                  All surfaces <span className="ml-1 text-white/40">{allRows.length}</span>
                </button>
                {TIERS.map((tier) => {
                  const pills = tier.pills
                    .map((id) => CATEGORY_PILLS.find((c) => c.id === id))
                    .filter(Boolean) as typeof CATEGORY_PILLS;
                  if (pills.length === 0) return null;
                  return (
                    <div key={tier.id} className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-white/30 w-16 shrink-0">{tier.label}</span>
                      {pills.map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => setGroupFilter(cat.id)}
                          title={tier.hint}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            groupFilter === cat.id ? 'bg-red-600 text-white' : 'bg-white/[0.06] text-white/50 hover:text-white'
                          }`}
                        >
                          {cat.label}
                          <span className="ml-1.5 text-white/40">{groupCounts[cat.id] ?? 0}</span>
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Period selector — controls which click count is shown per row */}
            {!campLoading && allRows.length > 0 && (
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs text-white/40">Clicks shown:</span>
                {([
                  { id: 'today', label: 'Today' },
                  { id: '7d', label: '7 days' },
                  { id: '30d', label: '30 days' },
                  { id: 'lifetime', label: 'Lifetime' },
                ] as { id: ClickPeriod; label: string }[]).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setClickPeriod(p.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      clickPeriod === p.id ? 'bg-emerald-600 text-white' : 'bg-white/[0.06] text-white/50 hover:text-white'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}

            {campLoading ? (
              <div className="text-white/40 py-12 text-center">Loading campaigns…</div>
            ) : (
              <div className="space-y-2">
                {filteredCampaigns.map((c) => {
                  const st = runStatus(c);
                  return (
                  <div key={c._id} className="rounded-xl bg-white/[0.04] border border-white/10 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <Thumb c={c} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold border ${st.cls}`}>{st.label}</span>
                            <span className="font-semibold truncate">{c.name}</span>
                          </div>
                          <div className="text-xs text-white/40 truncate mt-1">
                            {c.advertiserName} · {c.slot} · {c.adType}
                            {c.priority === 'boost' ? ' · ⚡ boost' : ''}
                            {advCapMap[c.advertiserId] > 0 ? ` · cap ${fmt(advCapMap[c.advertiserId])}/day` : ''}
                          </div>
                          {c.placements?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {c.placements.map((p) => (
                                <span key={p} className="px-1.5 py-0.5 rounded-md bg-red-500/10 text-red-300 border border-red-500/20 text-[10px] font-semibold">
                                  {PLACEMENT_LABEL.get(p) || p}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <div className="text-lg font-bold text-emerald-400 leading-none">{fmt(clicksFor(c))}</div>
                          <div className="text-[10px] text-white/40 mt-0.5">clicks · {periodLabel}</div>
                        </div>
                        <button
                          onClick={() => (editing === c._id ? setEditing(null) : startEdit(c))}
                          className="px-3 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.15] text-xs font-semibold"
                        >
                          {editing === c._id ? 'Close' : 'Manage'}
                        </button>
                      </div>
                    </div>

                    {editing === c._id && c.isVirtualBoost && (
                      <div className="border-t border-white/10 p-4 bg-black/30">
                        {/* Boost lifecycle — writes straight back to the listing (boosts rank organically; no placements) */}
                        <div className="rounded-lg bg-white/[0.03] border border-white/10 p-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${st.cls}`}>{st.label}</span>
                            <span className="text-xs text-white/40">
                              {c.endDate ? `boost ends ${fmtDate(c.endDate)}` : 'boost · Evergreen'}
                            </span>
                            <div className="flex-1" />
                            <button
                              onClick={() => boostAction(c, st.label === 'Running' ? 'pause' : 'resume')}
                              disabled={actingId === c._id}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50 ${
                                st.label === 'Running' ? 'bg-amber-600/80 hover:bg-amber-500 text-white' : 'bg-emerald-600/80 hover:bg-emerald-500 text-white'
                              }`}
                            >
                              {st.label === 'Running' ? 'Pause boost' : 'Resume boost'}
                            </button>
                            <button onClick={() => boostAction(c, 'extend', 7)} disabled={actingId === c._id} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/[0.08] hover:bg-white/[0.15] disabled:opacity-50">Boost 1 week</button>
                            <button onClick={() => boostAction(c, 'extend', 30)} disabled={actingId === c._id} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/[0.08] hover:bg-white/[0.15] disabled:opacity-50">Boost 1 month</button>
                            <button onClick={() => boostAction(c, 'lifetime')} disabled={actingId === c._id} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-600/60 hover:bg-purple-500/80 text-white disabled:opacity-50">Boost lifetime</button>
                            <button onClick={() => boostAction(c, 'end')} disabled={actingId === c._id} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-900/40 hover:bg-red-800/60 text-red-200 border border-red-500/30 disabled:opacity-50">End boost</button>
                          </div>
                          <div className="text-[11px] text-white/30 mt-2">
                            Boosted {c.entityType} listing — ranks organically, not a placed ad. Manage it here or on /admin/paid-campaigns; changes reflect on both.
                          </div>
                        </div>
                        {/* Give the boost real ad-slot visibility: create a placeable campaign (boost ranking stays). */}
                        <div className="mt-3 rounded-lg bg-red-500/[0.06] border border-red-500/20 p-3 flex flex-wrap items-center gap-2">
                          <div className="flex-1 min-w-[12rem]">
                            <div className="text-sm font-semibold text-white/90">Place in ad slots</div>
                            <div className="text-[11px] text-white/40 mt-0.5">Convert into a placeable ad to assign Top Bots / In-Feed / niche slots. Organic boost stays live.</div>
                          </div>
                          <button
                            onClick={() => convertBoost(c)}
                            disabled={actingId === c._id}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-600/80 hover:bg-red-500 text-white disabled:opacity-50"
                          >
                            {actingId === c._id ? 'Working…' : 'Convert to placed ad'}
                          </button>
                        </div>
                      </div>
                    )}

                    {editing === c._id && !c.isVirtualBoost && (
                      <div className="border-t border-white/10 p-4 bg-black/30">
                        {/* Lifecycle controls — pause/resume, quick launch, delete (apply immediately) */}
                        <div className="rounded-lg bg-white/[0.03] border border-white/10 p-3 mb-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${st.cls}`}>{st.label}</span>
                            <span className="text-xs text-white/40">{fmtDate(c.startDate)} → {fmtDate(c.endDate)}</span>
                            <div className="flex-1" />
                            <button
                              onClick={() => pauseResume(c)}
                              disabled={actingId === c._id}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50 ${
                                st.label === 'Running' ? 'bg-amber-600/80 hover:bg-amber-500 text-white' : 'bg-emerald-600/80 hover:bg-emerald-500 text-white'
                              }`}
                            >
                              {st.label === 'Running' ? 'Pause' : 'Resume'}
                            </button>
                            <button onClick={() => launchFor(c, 7)} disabled={actingId === c._id} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/[0.08] hover:bg-white/[0.15] disabled:opacity-50">Launch 1 week</button>
                            <button onClick={() => launchFor(c, 30)} disabled={actingId === c._id} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/[0.08] hover:bg-white/[0.15] disabled:opacity-50">Launch 1 month</button>
                            <button onClick={() => launchForLifetime(c)} disabled={actingId === c._id} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-600/60 hover:bg-purple-500/80 text-white disabled:opacity-50">Launch lifetime</button>
                            <button onClick={() => removeCampaign(c)} disabled={actingId === c._id} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-900/40 hover:bg-red-800/60 text-red-200 border border-red-500/30 disabled:opacity-50">Delete</button>
                          </div>
                          {c.adType === 'onlyfans-creator' && (
                            <div className="text-[11px] text-pink-300/70 mt-2">Synced with OnlyFans featured rail + Advertisers — changes reflect everywhere.</div>
                          )}
                        </div>

                        {/* Placement groups */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {PLACEMENT_GROUPS.map((g) => {
                            const items = PLACEMENTS.filter((p) => p.group === g);
                            if (!items.length) return null;
                            return (
                              <div key={g}>
                                <div className="text-xs font-bold uppercase tracking-wider text-white/40 mb-2">{g}</div>
                                <div className="space-y-1.5">
                                  {items.map((p: PlacementDef) => (
                                    <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={draftPlacements.includes(p.id)}
                                        onChange={() => togglePlacement(p.id)}
                                        className="accent-red-500"
                                      />
                                      <span className="text-white/80">{p.label}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Home (SPOTLIGHT) block format — only when a SPOTLIGHT adspace is selected */}
                        {(draftPlacements.includes('home-block-1') || draftPlacements.includes('home-block-2')) && (
                          <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/[0.04] p-3">
                            <div className="text-xs font-bold uppercase tracking-wider text-red-300/80 mb-2">TRENDING block format</div>
                            <div className="flex gap-2">
                              {([['card', 'Card (part of 4-up grid)'], ['banner', 'Banner (1 wide image/video)']] as const).map(([val, lbl]) => (
                                <button
                                  key={val}
                                  type="button"
                                  onClick={() => setDraftBlockFormat(val)}
                                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${draftBlockFormat === val ? 'bg-red-600 text-white border-red-500' : 'bg-white/[0.04] text-white/60 border-white/10 hover:text-white'}`}
                                >
                                  {lbl}
                                </button>
                              ))}
                            </div>
                            <div className="text-[11px] text-white/30 mt-2">Banner = one wide image/video. Card = appears in the 4-up grid. Each adspace rotates between every banner and the grid per visit.</div>
                          </div>
                        )}

                        {/* Reserved (disabled) */}
                        <div className="mt-4">
                          <div className="text-xs font-bold uppercase tracking-wider text-white/30 mb-2">Reserved (coming soon — not wired yet)</div>
                          <div className="flex flex-wrap gap-2">
                            {RESERVED_PLACEMENTS.map((p) => (
                              <span key={p.id} className="px-2 py-1 rounded-md bg-white/[0.04] text-xs text-white/30 border border-white/5">
                                {p.label}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Unified keyword picker — appears when a keyword-targeted surface is selected.
                            ONE shared keyword list (OF + Groups). A keyword targets EVERY related page
                            (e.g. "milf" → OF MILF page + Groups MILF page). Empty = all pages of that type. */}
                        {(draftPlacements.includes('best-of') || draftPlacements.includes('best-groups') || draftPlacements.includes('of-cat')) && (() => {
                          const selected = new Set(
                            draftKeywords.split(',').map((k) => canonicalKeyword(k)).filter(Boolean),
                          );
                          const setKw = (slugs: string[]) => setDraftKeywords([...new Set(slugs)].join(', '));
                          const toggleKw = (slug: string) => {
                            const next = new Set(selected);
                            if (next.has(slug)) next.delete(slug); else next.add(slug);
                            setKw([...next]);
                          };
                          const allSelected = selected.size >= AD_KEYWORDS.length;
                          return (
                            <div className="mt-4 rounded-lg border border-[#00AFF0]/20 bg-[#00AFF0]/[0.04] p-3">
                              <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                                <div className="text-xs font-bold uppercase tracking-wider text-[#00AFF0]/80">
                                  Keyword targeting — pick category pages (none = all pages of the selected type)
                                </div>
                                <div className="flex gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setKw(allSelected ? [] : AD_KEYWORDS.map((k) => k.slug))}
                                    className="px-2 py-1 rounded-md text-[11px] font-bold border border-[#00AFF0]/50 text-[#00AFF0] hover:bg-[#00AFF0]/10"
                                  >
                                    {allSelected ? 'Clear all' : 'Select ALL'}
                                  </button>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {AD_KEYWORDS.map((kw) => {
                                  const on = selected.has(kw.slug);
                                  return (
                                    <button
                                      key={kw.slug}
                                      type="button"
                                      onClick={() => toggleKw(kw.slug)}
                                      className={`px-2 py-1 rounded-md text-xs font-semibold border transition-colors ${
                                        on
                                          ? 'bg-[#00AFF0] text-white border-[#00AFF0]'
                                          : 'bg-white/[0.04] text-white/60 border-white/10 hover:border-[#00AFF0]/50'
                                      }`}
                                    >
                                      {kw.label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()}

                        {/* Keyword targeting + priority + cap */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5">
                          <div>
                            <label className="block text-xs font-semibold text-white/50 mb-1">Keyword targeting</label>
                            <input
                              value={draftKeywords}
                              onChange={(e) => setDraftKeywords(e.target.value)}
                              placeholder="milf, asian, latina"
                              className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-sm focus:border-red-500 outline-none"
                            />
                            <div className="text-[11px] text-white/30 mt-1">Category slugs (comma-separated). Empty = shows on ALL category pages of the selected type.</div>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-white/50 mb-1">Priority</label>
                            <select
                              value={draftPriority}
                              onChange={(e) => setDraftPriority(e.target.value as 'normal' | 'boost')}
                              className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-sm focus:border-red-500 outline-none"
                            >
                              <option value="normal">Normal</option>
                              <option value="boost">⚡ Boost (wins its slot)</option>
                            </select>
                            <div className="text-[11px] text-white/30 mt-1">Live in feed/Top Groups. Boosted ad wins its slot.</div>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-white/50 mb-1">Daily click cap</label>
                            <input
                              value={draftAdvCap}
                              onChange={(e) => setDraftAdvCap(e.target.value.replace(/[^0-9]/g, ''))}
                              placeholder="Uncapped"
                              className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-sm focus:border-red-500 outline-none"
                            />
                            <div className="text-[11px] text-white/30 mt-1">
                              {c.adType === 'onlyfans-creator'
                                ? 'Per this creator only. When hit today, this creator yields its slot.'
                                : `Per this campaign. When hit today, it yields its slot to others.`}
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 mt-5">
                          <button
                            onClick={() => setEditing(null)}
                            className="px-4 py-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-sm font-semibold"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => saveEdit(c._id)}
                            disabled={saving}
                            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 text-sm font-semibold"
                          >
                            {saving ? 'Saving…' : 'Save placements'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  );
                })}
                {!allRows.length && <div className="text-white/40 py-12 text-center">No campaigns found.</div>}
                {allRows.length > 0 && !filteredCampaigns.length && <div className="text-white/40 py-12 text-center">No campaigns match your filters.</div>}
              </div>
            )}
          </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white text-black px-5 py-2.5 rounded-full text-sm font-semibold shadow-xl z-50">
          {toast}
        </div>
      )}
    </div>
  );
}

