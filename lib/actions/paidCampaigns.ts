'use server';

import connectDB from '@/lib/db/mongodb';
import { Group, Bot, AINsfwSubmission, User } from '@/lib/models';
import { getR2PublicUrl } from '@/lib/r2';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || '';
const STAR_RATE = 0.013; // $/star — matches brain financials

function verifyAdmin(token: string): boolean {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return !!decoded.isAdmin;
  } catch {
    return false;
  }
}

function resolveImage(stored: string | undefined): string {
  if (!stored || typeof stored !== 'string') return '';
  if (stored.startsWith('https://') || stored.startsWith('/')) return stored;
  const r2 = getR2PublicUrl();
  if (r2) return `${r2.replace(/\/$/, '')}/${stored}`;
  return '';
}

export interface PaidCampaignRow {
  _id: string;
  entityType: 'group' | 'bot' | 'ainsfw';
  name: string;
  slug: string;
  image: string;
  status: string;
  tier: string;
  paid: boolean;
  amountStars: number | null;
  amountUsd: number | null;
  boosted: boolean;
  boostExpiresAt: string | null;
  daysLeft: number | null;
  createdAt: string;
  views: number;
  clicks: number;
  contactEmail: string;
  contactTelegram: string;
  ownerId: string | null;
  ownerName: string;
}

// USD value: AI NSFW prices are USD natively; groups/bots are Stars.
const AINSFW_USD: Record<string, number> = { basic: 49, instant: 49, boost: 297, platinum: 297 };

export async function getPaidCampaigns(token: string): Promise<{ rows?: PaidCampaignRow[]; error?: string }> {
  if (!verifyAdmin(token)) return { error: 'Unauthorized' };
  await connectDB();

  const now = new Date();
  const daysLeft = (exp: Date | null) => {
    if (!exp) return null;
    const d = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return d > 0 ? d : 0;
  };

  // Groups + bots: any that paid (paidBoost or paidBoostStars), or boosted
  const groupFilter = { $or: [{ paidBoost: true }, { paidBoostStars: { $gt: 0 } }, { boosted: true }] };

  const [groups, bots, ainsfw] = await Promise.all([
    Group.find(groupFilter)
      .select('name slug image status paidBoost paidBoostStars boosted boostExpiresAt boostDuration views clickCount contactEmail contactTelegram createdBy createdByUsername createdAt')
      .sort({ createdAt: -1 })
      .lean(),
    Bot.find(groupFilter)
      .select('name slug image status paidBoost paidBoostStars boosted boostExpiresAt boostDuration views clickCount contactEmail contactTelegram createdBy createdByUsername createdAt')
      .sort({ createdAt: -1 })
      .lean(),
    AINsfwSubmission.find({ $or: [{ paymentStatus: 'paid' }, { boosted: true }, { submissionTier: { $in: ['basic', 'instant', 'boost', 'platinum'] } }] })
      .select('name slug image status submissionTier paymentStatus boosted boostExpiresAt views clickCount contactEmail contactTelegram createdBy createdByUsername createdAt')
      .sort({ createdAt: -1 })
      .lean(),
  ]);

  const rows: PaidCampaignRow[] = [];

  for (const g of groups as any[]) {
    const exp = g.boostExpiresAt ? new Date(g.boostExpiresAt) : null;
    const stars = g.paidBoostStars ?? null;
    rows.push({
      _id: g._id.toString(),
      entityType: 'group',
      name: g.name,
      slug: g.slug,
      image: resolveImage(g.image),
      status: g.status,
      tier: g.boostDuration || (g.paidBoost ? 'paid' : 'boost'),
      paid: !!g.paidBoost || (g.paidBoostStars ?? 0) > 0,
      amountStars: stars,
      amountUsd: stars != null ? Math.round(stars * STAR_RATE * 100) / 100 : null,
      boosted: !!g.boosted,
      boostExpiresAt: exp ? exp.toISOString() : null,
      daysLeft: daysLeft(exp),
      createdAt: g.createdAt ? new Date(g.createdAt).toISOString() : new Date().toISOString(),
      views: g.views || 0,
      clicks: g.clickCount || 0,
      contactEmail: g.contactEmail || '',
      contactTelegram: g.contactTelegram || '',
      ownerId: g.createdBy ? g.createdBy.toString() : null,
      ownerName: g.createdByUsername || '',
    });
  }

  for (const b of bots as any[]) {
    const exp = b.boostExpiresAt ? new Date(b.boostExpiresAt) : null;
    const stars = b.paidBoostStars ?? null;
    rows.push({
      _id: b._id.toString(),
      entityType: 'bot',
      name: b.name,
      slug: b.slug,
      image: resolveImage(b.image),
      status: b.status,
      tier: b.boostDuration || (b.paidBoost ? 'paid' : 'boost'),
      paid: !!b.paidBoost || (b.paidBoostStars ?? 0) > 0,
      amountStars: stars,
      amountUsd: stars != null ? Math.round(stars * STAR_RATE * 100) / 100 : null,
      boosted: !!b.boosted,
      boostExpiresAt: exp ? exp.toISOString() : null,
      daysLeft: daysLeft(exp),
      createdAt: b.createdAt ? new Date(b.createdAt).toISOString() : new Date().toISOString(),
      views: b.views || 0,
      clicks: b.clickCount || 0,
      contactEmail: b.contactEmail || '',
      contactTelegram: b.contactTelegram || '',
      ownerId: b.createdBy ? b.createdBy.toString() : null,
      ownerName: b.createdByUsername || '',
    });
  }

  for (const a of ainsfw as any[]) {
    const exp = a.boostExpiresAt ? new Date(a.boostExpiresAt) : null;
    const usd = AINSFW_USD[a.submissionTier] ?? null;
    rows.push({
      _id: a._id.toString(),
      entityType: 'ainsfw',
      name: a.name,
      slug: a.slug,
      image: resolveImage(a.image),
      status: a.status,
      tier: a.submissionTier || 'basic',
      paid: a.paymentStatus === 'paid',
      amountStars: null,
      amountUsd: usd,
      boosted: !!a.boosted,
      boostExpiresAt: exp ? exp.toISOString() : null,
      daysLeft: daysLeft(exp),
      createdAt: a.createdAt ? new Date(a.createdAt).toISOString() : new Date().toISOString(),
      views: a.views || 0,
      clicks: a.clickCount || 0,
      contactEmail: a.contactEmail || '',
      contactTelegram: a.contactTelegram || '',
      ownerId: a.createdBy ? a.createdBy.toString() : null,
      ownerName: a.createdByUsername || '',
    });
  }

  rows.sort((x, y) => new Date(y.createdAt).getTime() - new Date(x.createdAt).getTime());
  return { rows };
}

function modelFor(entityType: string): any {
  if (entityType === 'bot') return Bot;
  if (entityType === 'ainsfw') return AINsfwSubmission;
  return Group;
}

export async function setCampaignStatus(
  token: string,
  entityType: string,
  id: string,
  status: 'approved' | 'pending' | 'rejected',
): Promise<{ ok?: boolean; error?: string }> {
  if (!verifyAdmin(token)) return { error: 'Unauthorized' };
  await connectDB();
  const Model = modelFor(entityType);
  await Model.findByIdAndUpdate(id, { $set: { status } });
  return { ok: true };
}

export async function markCampaignPaid(
  token: string,
  entityType: string,
  id: string,
): Promise<{ ok?: boolean; error?: string }> {
  if (!verifyAdmin(token)) return { error: 'Unauthorized' };
  await connectDB();
  const Model = modelFor(entityType);
  if (entityType === 'ainsfw') {
    await Model.findByIdAndUpdate(id, { $set: { paymentStatus: 'paid', status: 'approved' } });
  } else {
    await Model.findByIdAndUpdate(id, { $set: { paidBoost: true, status: 'approved' } });
  }
  return { ok: true };
}

// Find users to assign as owner (search by username or email)
export async function searchUsersForAssign(
  token: string,
  query: string,
): Promise<{ users?: { _id: string; username: string; email: string }[]; error?: string }> {
  if (!verifyAdmin(token)) return { error: 'Unauthorized' };
  await connectDB();
  const q = query.trim();
  if (q.length < 2) return { users: [] };
  const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const users = await User.find({ $or: [{ username: rx }, { email: rx }] })
    .select('username email')
    .limit(10)
    .lean();
  return {
    users: (users as any[]).map((u) => ({
      _id: u._id.toString(),
      username: u.username || '',
      email: u.email || '',
    })),
  };
}

export async function assignCampaignOwner(
  token: string,
  entityType: string,
  id: string,
  userId: string,
): Promise<{ ok?: boolean; ownerName?: string; error?: string }> {
  if (!verifyAdmin(token)) return { error: 'Unauthorized' };
  await connectDB();
  const user = await User.findById(userId).select('username').lean() as any;
  if (!user) return { error: 'User not found' };
  const Model = modelFor(entityType);
  await Model.findByIdAndUpdate(id, {
    $set: { createdBy: userId, createdByUsername: user.username || '' },
  });
  return { ok: true, ownerName: user.username || '' };
}

// ─────────────────────────────────────────────────────────────────────────────
// AD-NETWORK ADAPTER (brain: ad-engine-unify) — boosts as virtual campaigns.
//
// Boosted Groups/Bots/AI NSFW are NOT Campaign records (no creative, no ad slot —
// they rank organically). Rather than polluting the Campaign collection, we expose
// ACTIVE boosts to the Ad Network as read-through "virtual campaigns" and write
// lifecycle changes straight back to the underlying listing. This keeps reporting
// AND management unified without a schema migration or risky doc creation.
// ─────────────────────────────────────────────────────────────────────────────

export interface BoostCampaign {
  _id: string;           // `boost:<entityType>:<listingId>` — namespaced so it never collides with a real Campaign
  listingId: string;
  entityType: 'group' | 'bot' | 'ainsfw';
  name: string;
  creative: string;
  adType: 'boost-group' | 'boost-bot' | 'boost-ainsfw';
  slot: string;          // human label for the row's second line
  status: 'active' | 'ended';
  startDate: string;
  endDate: string;
  clicks: number;
  isVirtualBoost: true;  // tells the Ad Network UI this is read-through, not a real Campaign
}

/** ACTIVE boosts only (boosted=true and not expired), as virtual campaigns for the Ad Network. */
export async function getBoostCampaigns(token: string): Promise<BoostCampaign[]> {
  if (!verifyAdmin(token)) return [];
  await connectDB();
  const now = new Date();
  const liveFilter = { boosted: true, $or: [{ boostExpiresAt: null }, { boostExpiresAt: { $gt: now } }] };
  const sel = 'name slug image boosted boostExpiresAt clickCount createdAt';

  const [groups, bots, ainsfw] = await Promise.all([
    Group.find(liveFilter).select(sel).sort({ createdAt: -1 }).lean(),
    Bot.find(liveFilter).select(sel).sort({ createdAt: -1 }).lean(),
    AINsfwSubmission.find(liveFilter).select(sel).sort({ createdAt: -1 }).lean(),
  ]);

  const map = (rows: any[], entityType: BoostCampaign['entityType'], adType: BoostCampaign['adType'], slotLabel: string): BoostCampaign[] =>
    rows.map((r) => {
      const exp = r.boostExpiresAt ? new Date(r.boostExpiresAt) : null;
      return {
        _id: `boost:${entityType}:${r._id.toString()}`,
        listingId: r._id.toString(),
        entityType,
        name: r.name || r.slug || 'Untitled',
        creative: resolveImage(r.image),
        adType,
        slot: slotLabel,
        status: (!exp || exp > now) ? 'active' : 'ended',
        startDate: r.createdAt ? new Date(r.createdAt).toISOString() : '',
        endDate: exp ? exp.toISOString() : '',
        clicks: r.clickCount || 0,
        isVirtualBoost: true,
      };
    });

  return [
    ...map(groups as any[], 'group', 'boost-group', 'Boosted group'),
    ...map(bots as any[], 'bot', 'boost-bot', 'Boosted bot'),
    ...map(ainsfw as any[], 'ainsfw', 'boost-ainsfw', 'Boosted AI NSFW'),
  ];
}

/**
 * Lifecycle for a virtual boost — writes straight back to the listing.
 *  - 'pause'  → boosted=false (drops it from boosted ranking; reversible)
 *  - 'end'    → boosted=false + boostExpiresAt=now
 *  - 'extend' → boosted=true + boostExpiresAt=now+days (launch/extend 1 week / 1 month)
 */
export async function setBoostLifecycle(
  token: string,
  entityType: string,
  listingId: string,
  action: 'pause' | 'resume' | 'end' | 'extend',
  days?: number,
): Promise<{ ok?: boolean; error?: string }> {
  if (!verifyAdmin(token)) return { error: 'Unauthorized' };
  await connectDB();
  const Model = modelFor(entityType);
  const now = new Date();
  let update: Record<string, unknown>;
  if (action === 'pause') update = { boosted: false };
  else if (action === 'resume') update = { boosted: true };
  else if (action === 'end') update = { boosted: false, boostExpiresAt: now };
  else update = { boosted: true, boostExpiresAt: new Date(now.getTime() + (days || 7) * 24 * 60 * 60 * 1000) }; // extend
  await Model.findByIdAndUpdate(listingId, { $set: update });
  return { ok: true };
}

/**
 * Convert a boosted listing into a REAL, placeable ad-network Campaign so the owner can assign it
 * to ad slots (placements) like any other ad. The organic boost is left intact (max visibility:
 * it keeps ranking AND can run in placed slots). Idempotent — re-converting returns the existing
 * campaign. The campaign is self-contained (creative + destinationUrl); placements are assigned
 * afterwards via the normal ad-network placement editor.
 *
 * adType: bot → 'featured-bot', ainsfw → 'featured-nsfw', group → 'advertiser'.
 * Owned by the "EROGRAM" ad-network advertiser (all in-house ads roll up there).
 */
export async function convertBoostToPlacedCampaign(
  token: string,
  entityType: string,
  listingId: string,
): Promise<{ ok?: boolean; campaignId?: string; existed?: boolean; error?: string }> {
  if (!verifyAdmin(token)) return { error: 'Unauthorized' };
  await connectDB();
  const { Campaign, Advertiser } = await import('@/lib/models');

  const Model = modelFor(entityType);
  const listing: any = await Model.findById(listingId).lean();
  if (!listing) return { error: 'Listing not found' };

  // Idempotent: one placed campaign per listing, tagged via internalName so we never duplicate.
  const marker = `boost-converted:${entityType}:${listingId}`;
  const existing: any = await Campaign.findOne({ internalName: marker }).select('_id').lean();
  if (existing) return { ok: true, campaignId: String(existing._id), existed: true };

  const adType = entityType === 'bot' ? 'featured-bot' : entityType === 'ainsfw' ? 'featured-nsfw' : 'advertiser';
  const basePath = entityType === 'bot' ? 'bots' : entityType === 'ainsfw' ? 'ai-nsfw' : 'groups';
  const destinationUrl = listing.telegramLink || (listing.slug ? `https://erogram.pro/${basePath}/${listing.slug}` : 'https://erogram.pro');

  const adnet: any = await Advertiser.findOne({ name: 'EROGRAM' }).select('_id').lean();
  if (!adnet) return { error: 'Ad-network advertiser "EROGRAM" not found' };

  const now = new Date();
  const created: any = await Campaign.create({
    advertiserId: adnet._id,
    name: listing.name || listing.slug || 'Boosted listing',
    internalName: marker,
    slot: 'feed',
    creative: resolveImage(listing.image),
    destinationUrl,
    startDate: now,
    endDate: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
    status: 'active',
    isVisible: true,
    adType,
    feedPlacement: entityType === 'ainsfw' ? 'ainsfw' : 'bots',
    placements: [],
    priority: 'normal',
  });

  return { ok: true, campaignId: String(created._id), existed: false };
}
