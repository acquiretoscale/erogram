'use server';

/**
 * UNIFIED OF-CREATOR SYNC (brain: ad-engine-unify).
 *
 * Keeps the Ad Network campaign (Campaign, adType 'onlyfans-creator') and the OFadmin
 * featured slot (TrendingOFCreator) in lockstep, matched by username. Launch / pause / end
 * from EITHER surface mirrors to the other, so the front end and admin never disagree.
 *
 * SAFETY (brain: featured creators are PAYING — never demote):
 *  - Ad Network launch only fills an EMPTY featured slot. Never bumps anyone.
 *  - A campaign ending only deactivates a featured slot WE created (source 'ad-network').
 *    OFadmin/paid slots are never auto-deactivated.
 *  - All sync is best-effort: a failure here never blocks the core admin action.
 */

import connectDB from '@/lib/db/mongodb';
import { Campaign, TrendingOFCreator, Advertiser, OnlyFansCreator } from '@/lib/models';
import { campaignOFStatus, trendingOFStatus, OF_NO_END_DATE, type OFStatus } from '@/lib/ofStatus';

/**
 * Next free featured position — UNLIMITED. Agencies bring 10/20/30+ creators, so there is NO
 * cap on featured slots (a hard limit would kill the business model). We fill the lowest gap if
 * one exists, otherwise append after the highest position. Never returns null.
 */
async function firstFreePosition(): Promise<number> {
  const rows = await TrendingOFCreator.find().select('position').lean() as unknown as Array<{ position: number }>;
  if (rows.length === 0) return 1;
  const taken = new Set(rows.map((s) => s.position));
  const max = Math.max(...rows.map((s) => s.position));
  for (let p = 1; p <= max; p++) if (!taken.has(p)) return p; // reuse a gap
  return max + 1; // otherwise append — no cap
}

/** Get (or lazily create) the system advertiser that owns OFadmin-originated OF campaigns. */
async function getOFSystemAdvertiserId(): Promise<string> {
  const existing = await Advertiser.findOne({ name: 'OnlyFans Creators' }).select('_id').lean() as unknown as { _id: unknown } | null;
  if (existing) return String(existing._id);
  const created = await Advertiser.create({ name: 'OnlyFans Creators', email: 'of-creators@erogram.internal', company: 'Erogram', status: 'active' });
  return String(created._id);
}

export interface OFSyncResult {
  ok: boolean;
  status: OFStatus | null;
  trendingId: string | null;
  filledSlot: number | null;
  note?: string;
}

/**
 * Mirror an Ad Network OF-creator campaign → its featured slot.
 * Called after createCampaign / updateCampaign for adType 'onlyfans-creator'.
 */
export async function syncCampaignToTrending(campaignId: string): Promise<OFSyncResult> {
  try {
    await connectDB();
    const c = await Campaign.findById(campaignId);
    if (!c || c.adType !== 'onlyfans-creator' || !c.ofUsername) {
      return { ok: false, status: null, trendingId: null, filledSlot: null, note: 'not an OF-creator campaign' };
    }
    const username = String(c.ofUsername).trim();
    const status = campaignOFStatus(c as { status?: string; startDate?: Date; endDate?: Date; isVisible?: boolean });

    // Resolve display fields (campaign creative first, then the scraped creator record).
    const ofDoc = await OnlyFansCreator.findOne({ username: new RegExp(`^${username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') })
      .select('name avatar url').lean() as unknown as { name?: string; avatar?: string; url?: string } | null;
    const name = c.name || ofDoc?.name || username;
    const avatar = c.creative || ofDoc?.avatar || '';
    const url = c.destinationUrl || ofDoc?.url || '';

    // Find the slot this campaign already owns, else an unlinked slot for the same username.
    let slot = c.ofTrendingId ? await TrendingOFCreator.findById(c.ofTrendingId) : null;
    if (!slot) {
      slot = await TrendingOFCreator.findOne({ linkedCampaignId: c._id });
    }
    if (!slot) {
      slot = await TrendingOFCreator.findOne({ username: new RegExp(`^${username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });
    }

    if (slot) {
      // Keep display fresh + ensure the link is recorded.
      slot.name = name;
      if (avatar) slot.avatar = avatar;
      if (url) slot.url = url;
      if (!slot.linkedCampaignId) slot.linkedCampaignId = c._id;
      // SAME-promotion model (brain decision): a LINKED slot fully mirrors its campaign's
      // lifecycle — running → live, paused/ended → pulled from the rail. The explicit link
      // is what makes this safe (we only ever touch the campaign's own slot).
      slot.active = status === 'running';
      await slot.save();
      if (!c.ofTrendingId || String(c.ofTrendingId) !== String(slot._id)) {
        c.ofTrendingId = slot._id;
        await c.save();
      }
      return { ok: true, status, trendingId: String(slot._id), filledSlot: slot.position };
    }

    // No slot yet — only create one when the campaign is actually live.
    if (status !== 'running') {
      return { ok: true, status, trendingId: null, filledSlot: null, note: 'not running — no slot created' };
    }
    const pos = await firstFreePosition();
    const created = await TrendingOFCreator.create({
      name,
      username,
      avatar,
      url,
      position: pos,
      active: true,
      source: 'ad-network',
      linkedCampaignId: c._id,
    });
    c.ofTrendingId = created._id;
    await c.save();
    return { ok: true, status, trendingId: String(created._id), filledSlot: pos };
  } catch (err) {
    console.error('[syncCampaignToTrending] failed:', err);
    return { ok: false, status: null, trendingId: null, filledSlot: null, note: 'sync error' };
  }
}

/**
 * Mirror an OFadmin featured slot → an Ad Network campaign, so it shows in the network too.
 * Called after createOFMTrendingSlot / updateOFMTrending.
 */
export async function syncTrendingToCampaign(trendingId: string): Promise<OFSyncResult> {
  try {
    await connectDB();
    const slot = await TrendingOFCreator.findById(trendingId);
    if (!slot) return { ok: false, status: null, trendingId, filledSlot: null, note: 'slot not found' };

    const status = trendingOFStatus(slot as { active?: boolean; clicks?: number; clickBudget?: number });

    // Find the linked campaign, else an existing OF campaign for the same username.
    let camp = slot.linkedCampaignId ? await Campaign.findById(slot.linkedCampaignId) : null;
    if (!camp) {
      camp = await Campaign.findOne({
        adType: 'onlyfans-creator',
        ofUsername: new RegExp(`^${String(slot.username).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
      });
    }

    if (camp) {
      camp.name = slot.name || camp.name;
      if (slot.avatar) camp.creative = slot.avatar;
      if (slot.url) camp.destinationUrl = slot.url;
      camp.status = status === 'running' ? 'active' : 'paused';
      if (!camp.ofTrendingId) camp.ofTrendingId = slot._id;
      await camp.save();
      if (!slot.linkedCampaignId) { slot.linkedCampaignId = camp._id; await slot.save(); }
      return { ok: true, status, trendingId, filledSlot: slot.position, note: 'campaign updated' };
    }

    // Create a mirror campaign so the Ad Network sees this OFadmin launch.
    // Assign the DEFAULT max-exposure placement set so a newly featured OF creator goes
    // live across the whole network immediately (Top Groups / In-Feed / Top Bots / AI NSFW /
    // Spotlight / Top-10 / OF category) — unifying "add to OF featured" with the Ad Network.
    const { DEFAULT_OF_CREATOR_PLACEMENTS } = await import('@/lib/adPlacements');
    const advertiserId = await getOFSystemAdvertiserId();
    const created = await Campaign.create({
      advertiserId,
      name: slot.name || slot.username,
      slot: 'feed',
      adType: 'onlyfans-creator',
      ofUsername: slot.username,
      creative: slot.avatar || '',
      destinationUrl: slot.url,
      startDate: new Date(),
      endDate: OF_NO_END_DATE, // OFadmin slots have no end — sentinel keeps it "running" until paused
      status: status === 'running' ? 'active' : 'paused',
      isVisible: true,
      feedTier: 1,
      tierSlot: 2,
      position: 2,
      placements: DEFAULT_OF_CREATOR_PLACEMENTS,
      buttonText: 'View Profile',
      ofTrendingId: slot._id,
    });
    slot.linkedCampaignId = created._id;
    await slot.save();
    return { ok: true, status, trendingId, filledSlot: slot.position, note: 'campaign created' };
  } catch (err) {
    console.error('[syncTrendingToCampaign] failed:', err);
    return { ok: false, status: null, trendingId, filledSlot: null, note: 'sync error' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// RECONCILIATION (brain: ad-engine-unify) — heal existing rows that predate the link.
// "ENDED wins": the Ad Network campaign is the source of truth. A live featured slot
// whose linked campaign is NOT running gets pulled. A featured slot with no campaign
// stays as-is (legacy OFadmin slot) until you launch one for it.
// ─────────────────────────────────────────────────────────────────────────────

const ESC = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export interface ReconcileRow {
  username: string;
  trendingId: string | null;
  position: number | null;
  featuredActive: boolean;
  campaignId: string | null;
  campaignStatus: OFStatus | 'no-campaign';
  /** What reconcile would DO: 'pull' (deactivate rail), 'keep', or 'no-campaign' (leave alone). */
  action: 'pull' | 'keep' | 'no-campaign';
}

/**
 * READ-ONLY: report what reconcile would change. Matches every featured slot to its
 * OF-creator campaign (by link, then by username) and computes the unified status.
 * Nothing is written. Run this first, eyeball it, THEN run reconcileOFPromotions.
 */
export async function previewReconcileOFPromotions(): Promise<ReconcileRow[]> {
  await connectDB();
  const slots = await TrendingOFCreator.find().sort({ position: 1 }).lean() as unknown as Array<{
    _id: unknown; username: string; position: number; active: boolean; linkedCampaignId?: unknown;
  }>;
  const rows: ReconcileRow[] = [];
  for (const s of slots) {
    let camp = s.linkedCampaignId
      ? await Campaign.findById(s.linkedCampaignId).select('status startDate endDate isVisible').lean() as any
      : null;
    if (!camp && s.username) {
      camp = await Campaign.findOne({
        adType: 'onlyfans-creator',
        ofUsername: new RegExp(`^${ESC(String(s.username))}$`, 'i'),
      }).select('status startDate endDate isVisible').lean() as any;
    }
    const campaignStatus: OFStatus | 'no-campaign' = camp ? campaignOFStatus(camp) : 'no-campaign';
    let action: ReconcileRow['action'] = 'no-campaign';
    if (camp) action = campaignStatus === 'running' ? 'keep' : (s.active ? 'pull' : 'keep');
    rows.push({
      username: s.username,
      trendingId: String(s._id),
      position: s.position ?? null,
      featuredActive: !!s.active,
      campaignId: camp ? String(camp._id) : null,
      campaignStatus,
      action,
    });
  }
  return rows;
}

export interface ReconcileResult {
  scanned: number;
  pulled: number;
  linked: number;
  mirrored: number;
  pulledUsernames: string[];
  mirroredUsernames: string[];
}

/**
 * WRITE: apply "ENDED wins" + true unification. For every featured slot:
 *  - linked campaign NOT running → deactivate the rail slot (ENDED wins).
 *  - no campaign + slot active   → create a mirror campaign so it lives in the Ad Network too.
 * Slots that are inactive with no campaign are left alone. Idempotent — safe to re-run.
 */
export async function reconcileOFPromotions(): Promise<ReconcileResult> {
  await connectDB();
  const preview = await previewReconcileOFPromotions();
  let pulled = 0;
  let linked = 0;
  let mirrored = 0;
  const pulledUsernames: string[] = [];
  const mirroredUsernames: string[] = [];
  for (const row of preview) {
    if (!row.trendingId) continue;
    const slot = await TrendingOFCreator.findById(row.trendingId);
    if (!slot) continue;

    if (row.campaignId && !slot.linkedCampaignId) {
      slot.linkedCampaignId = row.campaignId;
      linked++;
    }
    if (row.action === 'pull') {
      slot.active = false;
      pulled++;
      pulledUsernames.push(row.username);
    }
    await slot.save();

    // Unlinked + still live → backfill a mirror campaign into the network.
    if (row.action === 'no-campaign' && slot.active) {
      const res = await syncTrendingToCampaign(String(slot._id));
      if (res.ok) { mirrored++; mirroredUsernames.push(row.username); }
    }
  }
  return { scanned: preview.length, pulled, linked, mirrored, pulledUsernames, mirroredUsernames };
}
