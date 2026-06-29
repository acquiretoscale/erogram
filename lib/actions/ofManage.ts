'use server';

import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import { User, OFClient, TrendingOFCreator, OnlyFansCreator, CampaignClick, CampaignImpressionDaily } from '@/lib/models';
import { addCreatorAlbumPhoto, removeCreatorAlbumPhoto } from '@/lib/actions/creatorImages';

/**
 * Slug for the scraped creator, matching how OnlyFansCreator.slug is stored
 * ({username}-onlyfans). Used to load/modify the creator album (avatar + extraPhotos).
 */
function creatorSlug(username: string): string {
  return `${(username || '').toLowerCase()}-onlyfans`;
}

/** Resolve the ONE creator album for a username: [avatar, ...extraPhotos]. Index = album position. */
async function getCreatorAlbum(username: string): Promise<{ slug: string; album: string[] }> {
  const doc = await OnlyFansCreator.findOne(
    { username: { $regex: new RegExp(`^${(username || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
    'slug avatar extraPhotos',
  ).lean() as any;
  if (!doc) return { slug: creatorSlug(username), album: [] };
  const album = [doc.avatar, ...((doc.extraPhotos as string[]) || [])].filter(Boolean);
  return { slug: doc.slug || creatorSlug(username), album };
}

/** Slugify an agency/model name for clean URLs (e.g. "OF Colombia" -> "of-colombia"). */
function slugify(s: string): string {
  return (s || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';

async function adminAuth(token: string) {
  if (!token) throw new Error('Unauthorized');
  try {
    const d = jwt.verify(token, JWT_SECRET) as any;
    await connectDB();
    const u = await User.findById(d.id);
    if (u?.isAdmin) return u;
  } catch { /* */ }
  throw new Error('Unauthorized');
}

/** Period click counts (24h/48h/7d/30d/total) for a set of campaign ids. */
async function periodClicks(campaignIds: any[]) {
  if (!campaignIds.length) return { total: 0, last24h: 0, last48h: 0, last7d: 0, last30d: 0 };
  const now = Date.now();
  const d24 = new Date(now - 24 * 3600e3);
  const d48 = new Date(now - 48 * 3600e3);
  const d7 = new Date(now - 7 * 24 * 3600e3);
  const d30 = new Date(now - 30 * 24 * 3600e3);
  const [total, last24h, last48h, last7d, last30d] = await Promise.all([
    CampaignClick.countDocuments({ campaignId: { $in: campaignIds } }),
    CampaignClick.countDocuments({ campaignId: { $in: campaignIds }, clickedAt: { $gte: d24 } }),
    CampaignClick.countDocuments({ campaignId: { $in: campaignIds }, clickedAt: { $gte: d48 } }),
    CampaignClick.countDocuments({ campaignId: { $in: campaignIds }, clickedAt: { $gte: d7 } }),
    CampaignClick.countDocuments({ campaignId: { $in: campaignIds }, clickedAt: { $gte: d30 } }),
  ]);
  return { total, last24h, last48h, last7d, last30d };
}

/** Total impressions for campaign ids. */
async function totalImpressions(campaignIds: any[]) {
  if (!campaignIds.length) return 0;
  const r = await CampaignImpressionDaily.aggregate([
    { $match: { campaignId: { $in: campaignIds } } },
    { $group: { _id: null, total: { $sum: '$count' } } },
  ]);
  return r[0]?.total ?? 0;
}

type PeriodStat = { total: number; last24h: number; last48h: number; last7d: number; last30d: number };
const EMPTY_STAT = (): PeriodStat => ({ total: 0, last24h: 0, last48h: 0, last7d: 0, last30d: 0 });

/**
 * A/B SPLIT-TEST PER-IMAGE STATS — the ONE source of truth.
 *
 * Every click on a creator's ad lives in CampaignClick with a `placement` string. When the surface
 * knows which album image was shown it stamps a ":v{idx}" suffix (idx = position in the full album
 * [avatar, ...extraPhotos], 0 = Default). Clicks WITHOUT a ":v" tag (old history, or any surface that
 * didn't pass an index) were shown the Default image → they are credited to image index 0.
 *
 * Result: every click maps to exactly one album image, so the per-image rows ALWAYS sum to the
 * creator's overall total. No second store, no read-time merge, no contradictions.
 */
async function imageClicks(campaignIds: any[], albumSize: number): Promise<Map<number, PeriodStat>> {
  const out = new Map<number, PeriodStat>();
  if (!campaignIds.length || albumSize <= 0) return out;
  const now = Date.now();
  const d24 = new Date(now - 24 * 3600e3);
  const d48 = new Date(now - 48 * 3600e3);
  const d7 = new Date(now - 7 * 86400e3);
  const d30 = new Date(now - 30 * 86400e3);
  const maxIdx = albumSize - 1;

  const rows = await CampaignClick.aggregate([
    { $match: { campaignId: { $in: campaignIds } } },
    {
      $project: {
        clickedAt: 1,
        v: {
          $let: {
            // Read everything AFTER ":v" and coerce to an int. Untagged → idx < 0 below.
            vars: { p: { $indexOfBytes: ['$placement', ':v'] } },
            in: {
              $cond: [
                { $gte: ['$$p', 0] },
                {
                  // substr to end (length = remaining bytes), then toInt; "" → 0 handled by guard below.
                  $convert: {
                    input: { $substrBytes: ['$placement', { $add: ['$$p', 2] }, 8] },
                    to: 'int', onError: -1, onNull: -1,
                  },
                },
                -1,
              ],
            },
          },
        },
      },
    },
    {
      $group: {
        _id: '$v',
        total: { $sum: 1 },
        last24h: { $sum: { $cond: [{ $gte: ['$clickedAt', d24] }, 1, 0] } },
        last48h: { $sum: { $cond: [{ $gte: ['$clickedAt', d48] }, 1, 0] } },
        last7d: { $sum: { $cond: [{ $gte: ['$clickedAt', d7] }, 1, 0] } },
        last30d: { $sum: { $cond: [{ $gte: ['$clickedAt', d30] }, 1, 0] } },
      },
    },
  ]);

  for (let i = 0; i < albumSize; i++) out.set(i, EMPTY_STAT());
  for (const r of rows as any[]) {
    // Untagged (-1) OR out-of-range index → fold into Default (0). Everything lands on a real image.
    const raw = typeof r._id === 'number' ? r._id : -1;
    const idx = raw >= 0 && raw <= maxIdx ? raw : 0;
    const cur = out.get(idx) || EMPTY_STAT();
    cur.total += r.total || 0;
    cur.last24h += r.last24h || 0;
    cur.last48h += r.last48h || 0;
    cur.last7d += r.last7d || 0;
    cur.last30d += r.last30d || 0;
    out.set(idx, cur);
  }
  return out;
}

/** Return all creators for one OFClient as a COMPACT list with period stats. */
export async function getOFMCreators(token: string, clientId: string) {
  await adminAuth(token);
  await connectDB();

  const client = await OFClient.findById(clientId, 'name').lean() as any;
  const agencySlug = client ? slugify(client.name) : '';

  const creators = await TrendingOFCreator.find(
    { ofClientId: clientId },
    'name username avatar url active liveHourStart liveHourEnd liveOnly pausedImageUrls linkedCampaignId',
  ).lean();

  const enriched = await Promise.all((creators as any[]).map(async (cr) => {
    const ids = cr.linkedCampaignId ? [cr.linkedCampaignId] : [];
    const [periods, impressions, { album }] = await Promise.all([
      periodClicks(ids),
      totalImpressions(ids),
      getCreatorAlbum(cr.username),
    ]);
    const ctr = impressions > 0 ? Number(((periods.total / impressions) * 100).toFixed(2)) : 0;

    // ONE album: [avatar, ...extraPhotos]. Index = album position = the ":v{i}" click tag.
    const pausedUrls: string[] = cr.pausedImageUrls ?? [];
    // Per-image A/B stats from the ONE store. Every click maps to an image, so rows sum to the total.
    const byImg = ids.length ? await imageClicks(ids, album.length) : new Map<number, PeriodStat>();
    const pictures = album.map((url, i) => {
      const s = byImg.get(i) || EMPTY_STAT();
      return { index: i, label: i === 0 ? 'Default' : `#${i}`, url, paused: pausedUrls.includes(url), ...s };
    });
    // Leader = most clicks among ACTIVE (not paused) pictures.
    const ranked = [...pictures].filter((p) => !p.paused && p.total > 0).sort((a, b) => b.total - a.total);
    const winnerIndex = ranked.length ? ranked[0].index : null;
    const activeCount = album.filter((u) => !pausedUrls.includes(u)).length;

    return {
      _id: cr._id.toString(),
      name: cr.name,
      username: cr.username,
      slug: slugify(cr.username || cr.name),
      avatar: cr.avatar || '',
      url: cr.url || '',
      active: cr.active,
      liveOnly: cr.liveOnly ?? false,
      liveHourStart: cr.liveHourStart ?? -1,
      liveHourEnd: cr.liveHourEnd ?? -1,
      imageCount: album.length,
      activeCount,
      pictures,
      winnerIndex,
      ...periods,
      impressions,
      ctr,
    };
  }));

  enriched.sort((a, b) => b.total - a.total);
  return JSON.parse(JSON.stringify({ agencySlug, agencyName: client?.name || '', creators: enriched }));
}

/**
 * Full detail for ONE model: period click stats, total impressions/CTR,
 * and PER-PICTURE breakdown (clicks + impressions + CTR per image variant).
 * Resolved by agency slug + model slug so it powers /ofm/[agency]/[model].
 */
export async function getOFMModelDetail(token: string, agencySlug: string, modelSlug: string) {
  await adminAuth(token);
  await connectDB();

  // Find the client by slug
  const clients = await OFClient.find({}, 'name').lean();
  const client = (clients as any[]).find((c) => slugify(c.name) === agencySlug);
  if (!client) return null;

  // Find the creator by slug within that client
  const creators = await TrendingOFCreator.find(
    { ofClientId: client._id },
    'name username avatar url active liveHourStart liveHourEnd liveOnly pausedImageUrls splitTestStartedAt linkedCampaignId',
  ).lean();
  const cr = (creators as any[]).find((c) => slugify(c.username || c.name) === modelSlug);
  if (!cr) return null;

  const ids = cr.linkedCampaignId ? [cr.linkedCampaignId] : [];
  const [periods, impressions, { album }] = await Promise.all([
    periodClicks(ids),
    totalImpressions(ids),
    getCreatorAlbum(cr.username),
  ]);
  const ctr = impressions > 0 ? Number(((periods.total / impressions) * 100).toFixed(2)) : 0;

  const pausedUrls: string[] = cr.pausedImageUrls ?? [];

  // Per-image A/B stats from the ONE store. Every click maps to an image → rows sum to the total.
  const byImg = ids.length ? await imageClicks(ids, album.length) : new Map<number, PeriodStat>();

  // The ONE creator album: index 0 = scraped avatar, 1..n = uploaded photos. Each has paused + stats.
  const pictures = album.map((url, i) => {
    const s = byImg.get(i) || EMPTY_STAT();
    return { index: i, label: i === 0 ? 'Default' : `#${i}`, url, paused: pausedUrls.includes(url), ...s };
  });

  // Leader = most clicks among ACTIVE (not paused) pictures.
  const ranked = [...pictures].filter((p) => !p.paused && p.total > 0).sort((a, b) => b.total - a.total);
  const winnerIndex: number | null = ranked.length ? ranked[0].index : null;
  const activeCount = pictures.filter((p) => !p.paused).length;

  return JSON.parse(JSON.stringify({
    agencyName: client.name,
    agencySlug,
    model: {
      _id: cr._id.toString(),
      name: cr.name,
      username: cr.username,
      slug: slugify(cr.username || cr.name),
      avatar: cr.avatar || '',
      url: cr.url || '',
      active: cr.active,
      liveOnly: cr.liveOnly ?? false,
      liveHourStart: cr.liveHourStart ?? -1,
      liveHourEnd: cr.liveHourEnd ?? -1,
      album,
      pausedImageUrls: pausedUrls,
      splitTestStartedAt: cr.splitTestStartedAt ? new Date(cr.splitTestStartedAt).toISOString() : null,
    },
    ...periods,
    impressions,
    ctr,
    pictures,
    winnerIndex,
    activeCount,
  }));
}

/** Update a creator's URL, live settings, or liveOnly flag. */
export async function updateOFMCreatorSettings(
  token: string,
  creatorId: string,
  patch: {
    url?: string;
    liveHourStart?: number;
    liveHourEnd?: number;
    liveOnly?: boolean;
    active?: boolean;
  },
) {
  await adminAuth(token);
  await connectDB();
  const allowed = ['url', 'liveHourStart', 'liveHourEnd', 'liveOnly', 'active'];
  const safe: Record<string, unknown> = {};
  for (const k of allowed) {
    if (patch[k as keyof typeof patch] !== undefined) safe[k] = patch[k as keyof typeof patch];
  }
  await TrendingOFCreator.findByIdAndUpdate(creatorId, { $set: safe });
  return { ok: true };
}

/**
 * Add a NEW photo to the creator's ALBUM (the real OnlyFansCreator.extraPhotos), going through
 * the SAME R2 + EXIF branding pipeline as the scraped image. The new photo joins the album and
 * starts rotating in ads immediately. Max 4 total (avatar + 3 uploads) keeps the test focused.
 */
export async function addSplitTestImage(token: string, creatorId: string, file: File) {
  await adminAuth(token);
  await connectDB();
  const cr = await TrendingOFCreator.findById(creatorId);
  if (!cr) throw new Error('Creator not found');
  const { slug, album } = await getCreatorAlbum(cr.username);
  if (album.length >= 4) throw new Error('Max 4 album images for split test');
  const res = await addCreatorAlbumPhoto(slug, file);
  if ('error' in res) throw new Error(res.error);
  if (!cr.splitTestStartedAt) {
    await TrendingOFCreator.findByIdAndUpdate(creatorId, { $set: { splitTestStartedAt: new Date() } });
  }
  return { ok: true, url: res.url };
}

/** Remove a photo from the creator's album by URL (and clear any paused flag on it). */
export async function removeSplitTestImage(token: string, creatorId: string, url: string) {
  await adminAuth(token);
  await connectDB();
  const cr = await TrendingOFCreator.findById(creatorId);
  if (!cr) throw new Error('Creator not found');
  const { slug } = await getCreatorAlbum(cr.username);
  await removeCreatorAlbumPhoto(slug, url);
  await TrendingOFCreator.findByIdAndUpdate(creatorId, { $pull: { pausedImageUrls: url } });
  return { ok: true };
}

/**
 * Pause or resume a single album image BY URL. Paused images do NOT rotate in ads but stay in the
 * album (and on the public profile). This is the whole split-test control: pause the ones you don't
 * want running, keep the rest rotating. "Winner" = pause everything except one. No image is special.
 */
export async function toggleVariantPause(token: string, creatorId: string, url: string, paused: boolean) {
  await adminAuth(token);
  await connectDB();
  if (paused) {
    await TrendingOFCreator.findByIdAndUpdate(creatorId, { $addToSet: { pausedImageUrls: url } });
  } else {
    await TrendingOFCreator.findByIdAndUpdate(creatorId, { $pull: { pausedImageUrls: url } });
  }
  return { ok: true };
}

/** Resume ALL album images (clear every pause) + reset the test clock. Does NOT delete photos. */
export async function resetSplitTest(token: string, creatorId: string) {
  await adminAuth(token);
  await connectDB();
  await TrendingOFCreator.findByIdAndUpdate(creatorId, {
    $set: { pausedImageUrls: [], splitTestStartedAt: null },
  });
  return { ok: true };
}

/** List all OFClients (id + name) for the switcher. */
export async function listOFClientsForManage(token: string) {
  await adminAuth(token);
  await connectDB();
  const clients = await OFClient.find({}, 'name active').sort({ createdAt: -1 }).lean();
  return JSON.parse(JSON.stringify((clients as any[]).map((c) => ({ _id: c._id.toString(), name: c.name, active: c.active }))));
}
