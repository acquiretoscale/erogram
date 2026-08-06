'use server';

import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import { User, OFClient, TrendingOFCreator, CampaignClick, CampaignImpressionDaily } from '@/lib/models';

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';

function slugify(s: string): string {
  return (s || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/** Virtual bucket for unassigned free-slot creators. */
const OFM_CREATORS_SLUG = 'ofm-creators';
const OFM_CREATORS_NAME = 'Individual Creators';

async function authenticateAdmin(token: string) {
  if (!token) return null;
  try {
    const d = jwt.verify(token, JWT_SECRET) as any;
    await connectDB();
    const u = await User.findById(d.id);
    if (u && u.isAdmin) return u;
  } catch {
    return null;
  }
  return null;
}

function ymd(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

async function periodClicksForCampaigns(campaignIds: any[]) {
  if (!campaignIds.length) return { total: 0, last24h: 0, last48h: 0 };
  const now = Date.now();
  const d24 = new Date(now - 24 * 3600e3);
  const d48 = new Date(now - 48 * 3600e3);
  const [total, last24h, last48h] = await Promise.all([
    CampaignClick.countDocuments({ campaignId: { $in: campaignIds } }),
    CampaignClick.countDocuments({ campaignId: { $in: campaignIds }, clickedAt: { $gte: d24 } }),
    CampaignClick.countDocuments({ campaignId: { $in: campaignIds }, clickedAt: { $gte: d48 } }),
  ]);
  return { total, last24h, last48h };
}

/** List all agency clients (id + name) for the dashboard switcher. */
export async function listOFClients(token: string) {
  if (!(await authenticateAdmin(token))) throw new Error('Unauthorized');
  await connectDB();
  const clients = await OFClient.find({}, 'name goalClicks startDate endDate active').sort({ createdAt: -1 }).lean();
  return JSON.parse(JSON.stringify(clients.map((c: any) => ({ ...c, _id: c._id.toString() }))));
}

/** Home page: paying agencies + one OFM Creators bucket for free slot fillers. */
export async function listOFMHome(token: string) {
  if (!(await authenticateAdmin(token))) throw new Error('Unauthorized');
  await connectDB();

  const [clients, soloSlots] = await Promise.all([
    OFClient.find({}, 'name goalClicks startDate endDate active createdAt').sort({ createdAt: 1 }).lean(),
    TrendingOFCreator.find(
      { ofClientId: null, linkedCampaignId: { $ne: null } },
      'linkedCampaignId',
    ).lean(),
  ]);

  const agencies = await Promise.all(
    (clients as any[]).map(async (c) => {
      const creators = await TrendingOFCreator.find({ ofClientId: c._id }, 'linkedCampaignId').lean();
      const campaignIds = (creators as any[]).map((cr) => cr.linkedCampaignId).filter(Boolean);
      const clicks = await periodClicksForCampaigns(campaignIds);
      return {
        kind: 'agency' as const,
        _id: c._id.toString(),
        name: c.name,
        slug: slugify(c.name),
        goalClicks: c.goalClicks || 0,
        creatorCount: creators.length,
        totalClicks: clicks.total,
        last24h: clicks.last24h,
        last48h: clicks.last48h,
      };
    }),
  );

  let ofmCreators = null as {
    kind: 'ofm-creators';
    name: string;
    slug: string;
    creatorCount: number;
    totalClicks: number;
    last24h: number;
    last48h: number;
  } | null;

  if (soloSlots.length > 0) {
    const campaignIds = (soloSlots as any[]).map((s) => s.linkedCampaignId).filter(Boolean);
    const clicks = await periodClicksForCampaigns(campaignIds);
    ofmCreators = {
      kind: 'ofm-creators',
      name: OFM_CREATORS_NAME,
      slug: OFM_CREATORS_SLUG,
      creatorCount: soloSlots.length,
      totalClicks: clicks.total,
      last24h: clicks.last24h,
      last48h: clicks.last48h,
    };
  }

  return JSON.parse(JSON.stringify({ agencies, ofmCreators }));
}

/** Resolve slug → agency client or OFM Creators bucket. */
async function resolveOFMSlug(slug: string) {
  if (slug === OFM_CREATORS_SLUG) return { type: 'free' as const };

  const clients = await OFClient.find({}).lean();
  const client = (clients as any[]).find((c) => slugify(c.name) === slug);
  if (client) return { type: 'agency' as const, client };

  return null;
}

/** Dashboard by URL slug — agency or OFM Creators bucket. */
export async function getOFMDashboardBySlug(token: string, slug: string) {
  if (!(await authenticateAdmin(token))) throw new Error('Unauthorized');
  await connectDB();

  const resolved = await resolveOFMSlug(slug);
  if (!resolved) return null;
  if (resolved.type === 'agency') {
    return buildClientDashboard(resolved.client);
  }
  return buildFreeCreatorsDashboard();
}

/**
 * Full tracking dashboard for ONE agency client:
 *  - per-creator + combined totals = ALL clicks on each linked campaign (lifetime),
 *    same source as the home cards and /ofm/[agency]/[model] detail page.
 *    Do NOT filter by OFClient.startDate — creators often run (and accumulate clicks)
 *    before the agency record / deal dates are formalized in admin.
 *  - per-hour (last 24h) and per-day (first click → today) click series
 * All from CampaignClick on linked campaigns. No new infra.
 */
export async function getOFClientDashboard(token: string, clientId?: string) {
  if (!(await authenticateAdmin(token))) throw new Error('Unauthorized');
  await connectDB();

  const client = clientId
    ? await OFClient.findById(clientId).lean()
    : await OFClient.findOne({ active: true }).sort({ createdAt: -1 }).lean();
  if (!client) return null;
  return buildClientDashboard(client);
}

async function buildClientDashboard(client: any) {
  const c = client;

  const creators = await TrendingOFCreator.find({ ofClientId: c._id }, 'name username avatar url linkedCampaignId createdAt').lean();
  const campaignIds = (creators as any[]).map((cr) => cr.linkedCampaignId).filter(Boolean);

  const start = new Date(c.startDate);
  const end = new Date(c.endDate);
  const now = new Date();
  const campaignEnded = now.getTime() > end.getTime();

  const perCreator = await Promise.all(
    (creators as any[]).map(async (cr) => {
      let clicks = 0;
      if (cr.linkedCampaignId) {
        clicks = await CampaignClick.countDocuments({ campaignId: cr.linkedCampaignId });
      }
      return {
        name: cr.name || cr.username,
        username: cr.username,
        avatar: cr.avatar || '',
        url: cr.url || '',
        clicks,
      };
    }),
  );
  perCreator.sort((a, b) => b.clicks - a.clicks);
  const totalClicks = perCreator.reduce((s, p) => s + p.clicks, 0);

  const impRows = campaignIds.length
    ? await CampaignImpressionDaily.aggregate([
        { $match: { campaignId: { $in: campaignIds } } },
        { $group: { _id: null, total: { $sum: '$count' } } },
      ])
    : [];
  const totalImpressions = (impRows[0]?.total ?? 0);
  const ctr = totalImpressions > 0 ? Number(((totalClicks / totalImpressions) * 100).toFixed(2)) : 0;

  const since24 = new Date(now.getTime() - 24 * 3600 * 1000);
  const hourRows = campaignIds.length
    ? await CampaignClick.aggregate([
        { $match: { campaignId: { $in: campaignIds }, clickedAt: { $gte: since24 } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%dT%H', date: '$clickedAt' } }, count: { $sum: 1 } } },
      ])
    : [];
  const hourMap = new Map<string, number>();
  for (const r of hourRows as any[]) hourMap.set(r._id, r.count);
  const hourly: { label: string; clicks: number }[] = [];
  for (let i = 23; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 3600 * 1000);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}T${String(d.getUTCHours()).padStart(2, '0')}`;
    hourly.push({ label: `${String(d.getUTCHours()).padStart(2, '0')}h`, clicks: hourMap.get(key) || 0 });
  }

  const dayRows = campaignIds.length
    ? await CampaignClick.aggregate([
        { $match: { campaignId: { $in: campaignIds } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$clickedAt' } }, count: { $sum: 1 } } },
      ])
    : [];
  const dayMap = new Map<string, number>();
  for (const r of dayRows as any[]) dayMap.set(r._id, r.count);
  let chartStart = start;
  if (dayRows.length) {
    const firstDay = (dayRows as any[]).map((r) => r._id as string).sort()[0];
    const firstClick = new Date(`${firstDay}T00:00:00.000Z`);
    if (firstClick < chartStart) chartStart = firstClick;
  }
  for (const cr of creators as any[]) {
    if (cr.createdAt) {
      const attached = new Date(cr.createdAt);
      if (attached < chartStart) chartStart = attached;
    }
  }
  const daily: { label: string; clicks: number }[] = [];
  for (let d = new Date(Date.UTC(chartStart.getUTCFullYear(), chartStart.getUTCMonth(), chartStart.getUTCDate())); d <= now; d.setUTCDate(d.getUTCDate() + 1)) {
    const key = ymd(d);
    daily.push({ label: key.slice(5), clicks: dayMap.get(key) || 0 });
  }

  const sectionRows = campaignIds.length
    ? await CampaignClick.aggregate([
        { $match: { campaignId: { $in: campaignIds } } },
        { $group: { _id: '$placement', n: { $sum: 1 } } },
      ])
    : [];
  const sections = buildSections(sectionRows);

  const goalProgress = c.goalClicks > 0 ? totalClicks / c.goalClicks : 0;
  const onPace = goalProgress >= 1 || (campaignEnded ? totalClicks >= c.goalClicks : totalClicks >= Math.round(c.goalClicks * Math.min(Math.max((now.getTime() - start.getTime()) / Math.max(end.getTime() - start.getTime(), 1), 0), 1)));
  const msLeft = Math.max(end.getTime() - now.getTime(), 0);

  return JSON.parse(JSON.stringify({
    kind: 'agency',
    slug: slugify(c.name),
    client: {
      _id: c._id.toString(),
      name: c.name,
      goalClicks: c.goalClicks,
      dealPrice: c.dealPrice || 0,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    },
    campaignEnded,
    totalClicks,
    goalClicks: c.goalClicks,
    goalProgress,
    remainingClicks: Math.max(c.goalClicks - totalClicks, 0),
    onPace,
    timeProgress: campaignEnded ? 1 : Math.min(Math.max((now.getTime() - start.getTime()) / Math.max(end.getTime() - start.getTime(), 1), 0), 1),
    hoursLeft: Math.floor(msLeft / 3600000),
    daysLeft: Math.floor(msLeft / 86400000),
    totalImpressions,
    ctr,
    perCreator,
    sections,
    hourly,
    daily,
  }));
}

/** OFM Creators bucket — all free-slot fillers, lifetime stats combined. */
async function buildFreeCreatorsDashboard() {
  const creators = await TrendingOFCreator.find(
    { ofClientId: null, linkedCampaignId: { $ne: null } },
    'name username avatar url linkedCampaignId createdAt',
  ).lean();
  const campaignIds = (creators as any[]).map((cr) => cr.linkedCampaignId).filter(Boolean);

  const now = new Date();
  const earliest = (creators as any[]).reduce((min: Date, cr) => {
    const d = cr.createdAt ? new Date(cr.createdAt) : now;
    return d < min ? d : min;
  }, now);
  const start = earliest;
  const end = new Date(now.getTime() + 365 * 86400000);
  const startDay = ymd(start);
  const todayDay = ymd(now);

  const perCreator = await Promise.all(
    (creators as any[]).map(async (cr) => {
      let clicks = 0;
      if (cr.linkedCampaignId) {
        clicks = await CampaignClick.countDocuments({ campaignId: cr.linkedCampaignId });
      }
      return {
        name: cr.name || cr.username,
        username: cr.username,
        avatar: cr.avatar || '',
        url: cr.url || '',
        clicks,
      };
    }),
  );
  perCreator.sort((a, b) => b.clicks - a.clicks);
  const totalClicks = perCreator.reduce((s, p) => s + p.clicks, 0);

  const impRows = campaignIds.length
    ? await CampaignImpressionDaily.aggregate([
        { $match: { campaignId: { $in: campaignIds }, date: { $gte: startDay, $lte: todayDay } } },
        { $group: { _id: null, total: { $sum: '$count' } } },
      ])
    : [];
  const totalImpressions = (impRows[0]?.total ?? 0);
  const ctr = totalImpressions > 0 ? Number(((totalClicks / totalImpressions) * 100).toFixed(2)) : 0;

  const since24 = new Date(now.getTime() - 24 * 3600 * 1000);
  const hourRows = campaignIds.length
    ? await CampaignClick.aggregate([
        { $match: { campaignId: { $in: campaignIds }, clickedAt: { $gte: since24 } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%dT%H', date: '$clickedAt' } }, count: { $sum: 1 } } },
      ])
    : [];
  const hourMap = new Map<string, number>();
  for (const r of hourRows as any[]) hourMap.set(r._id, r.count);
  const hourly: { label: string; clicks: number }[] = [];
  for (let i = 23; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 3600 * 1000);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}T${String(d.getUTCHours()).padStart(2, '0')}`;
    hourly.push({ label: `${String(d.getUTCHours()).padStart(2, '0')}h`, clicks: hourMap.get(key) || 0 });
  }

  const dayRows = campaignIds.length
    ? await CampaignClick.aggregate([
        { $match: { campaignId: { $in: campaignIds } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$clickedAt' } }, count: { $sum: 1 } } },
      ])
    : [];
  const dayMap = new Map<string, number>();
  for (const r of dayRows as any[]) dayMap.set(r._id, r.count);
  const daily: { label: string; clicks: number }[] = [];
  for (let d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate())); d <= now; d.setUTCDate(d.getUTCDate() + 1)) {
    const key = ymd(d);
    daily.push({ label: key.slice(5), clicks: dayMap.get(key) || 0 });
  }

  const sectionRows = campaignIds.length
    ? await CampaignClick.aggregate([
        { $match: { campaignId: { $in: campaignIds } } },
        { $group: { _id: '$placement', n: { $sum: 1 } } },
      ])
    : [];
  const sections = buildSections(sectionRows);

  return JSON.parse(JSON.stringify({
    kind: 'ofm-creators',
    slug: OFM_CREATORS_SLUG,
    client: {
      _id: OFM_CREATORS_SLUG,
      name: OFM_CREATORS_NAME,
      goalClicks: 0,
      dealPrice: 0,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    },
    campaignEnded: false,
    totalClicks,
    goalClicks: 0,
    goalProgress: 0,
    remainingClicks: 0,
    onPace: true,
    timeProgress: 0,
    hoursLeft: 0,
    daysLeft: 0,
    totalImpressions,
    ctr,
    perCreator,
    sections,
    hourly,
    daily,
  }));
}

function buildSections(sectionRows: any[]) {
  const SECTION_TOTALS: Record<string, number> = {
    'OnlyFans Search': 0, 'AI NSFW': 0, 'Telegram Bots': 0, 'Telegram Groups': 0,
    'Main': 0, 'Individual Pages': 0, 'Top 10s': 0, 'Trending Block': 0, 'Articles': 0, 'Other': 0,
  };
  const sectionOf = (p: string): string => {
    if (!p) return 'Telegram Groups';
    if (p.startsWith('trending-')) return 'Trending Block';
    if (p.startsWith('top-bots-')) return 'Telegram Bots';
    if (p.startsWith('top-groups-') || p.startsWith('feed-')) return 'Telegram Groups';
    if (p.startsWith('ainsfw')) return 'AI NSFW';
    if (p === 'home-block-1' || p === 'home-block-2' || p === 'top-banner' || p === 'navbar-cta') return 'Main';
    if (p.startsWith('group-sidebar') || p === 'join-cta') return 'Individual Pages';
    if (p === 'best-of' || p === 'best-groups') return 'Top 10s';
    if (p.startsWith('article:')) return 'Articles';
    if (p === 'of-cat' || p.startsWith('of-') || p === 'trending-grid') return 'OnlyFans Search';
    return 'Other';
  };
  for (const r of sectionRows) SECTION_TOTALS[sectionOf(r._id)] += r.n;
  return Object.entries(SECTION_TOTALS)
    .filter(([, n]) => n > 0)
    .map(([label, clicks]) => ({ label, clicks }))
    .sort((a, b) => b.clicks - a.clicks);
}

/** Create a new paying agency client. */
export async function createOFMAgency(
  token: string,
  data: { name: string; goalClicks?: number; weeks?: number },
) {
  if (!(await authenticateAdmin(token))) throw new Error('Unauthorized');
  await connectDB();

  const name = data.name?.trim();
  if (!name) throw new Error('Agency name is required');

  const dup = await OFClient.findOne({ name }).lean();
  if (dup) throw new Error('An agency with this name already exists');

  const start = new Date();
  const weeks = data.weeks && data.weeks > 0 ? data.weeks : 4;
  const end = new Date(start.getTime() + weeks * 7 * 86400000);

  const client = await OFClient.create({
    name,
    goalClicks: data.goalClicks || 0,
    startDate: start,
    endDate: end,
    dealPrice: 0,
    active: true,
  });

  return JSON.parse(JSON.stringify({
    _id: client._id.toString(),
    name: client.name,
    slug: slugify(client.name),
  }));
}

/** Scrape/import a creator and attach to an agency (or OFM Creators free bucket). */
export async function importCreatorToOFMAgency(
  token: string,
  data: { username: string; clientId?: string; categories?: string[]; defaultPlacements?: string[] },
) {
  if (!(await authenticateAdmin(token))) throw new Error('Unauthorized');

  const cleaned = data.username
    ?.trim()
    .replace(/^@/, '')
    .replace(/^https?:\/\/(www\.)?onlyfans\.com\//i, '')
    .replace(/[/?#].*$/, '')
    .trim();
  if (!cleaned) throw new Error('Enter a username or OnlyFans URL');

  let agencyId: string | null = data.clientId?.trim() || null;
  if (!agencyId || agencyId === OFM_CREATORS_SLUG) agencyId = null;
  else {
    await connectDB();
    const client = await OFClient.findById(agencyId).lean();
    if (!client) throw new Error('Agency not found');
  }

  const { importOFMCreator } = await import('@/lib/actions/ofmAdmin');
  const imported = await importOFMCreator(token, {
    username: cleaned,
    categories: data.categories,
  });
  const creator = imported.creator as any;
  if (!creator?.username) throw new Error('Import failed');

  await connectDB();

  const esc = creator.username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  let slot = await TrendingOFCreator.findOne({
    username: new RegExp(`^${esc}$`, 'i'),
  });

  if (!slot) {
    const rows = await TrendingOFCreator.find().select('position').lean() as any[];
    const nextPos = rows.length ? Math.max(...rows.map((r) => r.position || 0)) + 1 : 1;
    slot = await TrendingOFCreator.create({
      name: creator.name || creator.username,
      username: creator.username,
      avatar: creator.avatar || '',
      url: creator.url || `https://onlyfans.com/${creator.username}`,
      bio: creator.bio || '',
      categories: creator.categories || [],
      position: nextPos,
      active: true,
      clicks: 0,
      source: 'ofadmin',
      ofClientId: agencyId,
    });
  } else {
    slot.ofClientId = agencyId as any;
    if (creator.name) slot.name = creator.name;
    if (creator.avatar) slot.avatar = creator.avatar;
    if (creator.url) slot.url = creator.url;
    await slot.save();
  }

  let syncWarning: string | null = imported.warning || null;
  try {
    const { syncTrendingToCampaign } = await import('@/lib/actions/ofSync');
    const sync = await syncTrendingToCampaign(slot._id.toString(), {
      initialPlacements: data.defaultPlacements,
    });
    if (!sync.ok) syncWarning = sync.note || syncWarning;
  } catch {
    syncWarning = syncWarning || 'Ad sync failed — check /admin/ad-network';
  }

  const agencySlug = agencyId
    ? slugify((await OFClient.findById(agencyId).lean() as any)?.name || '')
    : OFM_CREATORS_SLUG;

  return JSON.parse(JSON.stringify({
    creator: {
      name: creator.name,
      username: creator.username,
      avatar: creator.avatar || '',
      slug: slugify(creator.username),
    },
    source: imported.source || 'import',
    agencySlug,
    syncWarning,
  }));
}
