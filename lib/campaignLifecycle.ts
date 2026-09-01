import type { Types } from 'mongoose';
import connectDB from '@/lib/db/mongodb';
import { Campaign, Bot, Group } from '@/lib/models';

/** Start of local calendar day — matches campaignNotExpired() in ad queries. */
export function startOfTodayLocal(asOf = new Date()): Date {
  return new Date(asOf.getFullYear(), asOf.getMonth(), asOf.getDate());
}

/**
 * Hard-stop ads whose endDate has passed: flip status to 'ended' in DB.
 * endDate=null means lifetime / evergreen — never touched.
 * Fire-and-forget safe; idempotent.
 */
export async function expireStaleCampaigns(asOf = new Date()): Promise<number> {
  await connectDB();
  const cutoff = startOfTodayLocal(asOf);
  const res = await Campaign.updateMany(
    {
      status: 'active',
      endDate: { $ne: null, $lt: cutoff },
    },
    { $set: { status: 'ended' } },
  );
  return res.modifiedCount ?? 0;
}

/** Clear organic boosts past boostExpiresAt. Lifetime boosts (null expiry) are kept. */
export async function expireStaleBotBoosts(asOf = new Date()): Promise<number> {
  await connectDB();
  const stale = await Bot.find(
    { boosted: true, boostExpiresAt: { $ne: null, $lte: asOf } },
  ).select('_id').lean<{ _id: Types.ObjectId }[]>();

  const res = await Bot.updateMany(
    { boosted: true, boostExpiresAt: { $ne: null, $lte: asOf } },
    { $set: { boosted: false, boostExpiresAt: null, boostDuration: null, featured: false } },
  );

  if (stale.length > 0) {
    const markers = stale.map((b) => `boost-converted:bot:${b._id.toString()}`);
    await Campaign.updateMany(
      { internalName: { $in: markers }, status: 'active' },
      { $set: { status: 'ended', endDate: asOf } },
    );
  }

  return res.modifiedCount ?? 0;
}

export async function expireStaleGroupBoosts(asOf = new Date()): Promise<number> {
  await connectDB();
  const stale = await Group.find(
    { boosted: true, boostExpiresAt: { $ne: null, $lte: asOf } },
  ).select('_id').lean<{ _id: Types.ObjectId }[]>();

  const res = await Group.updateMany(
    { boosted: true, boostExpiresAt: { $ne: null, $lte: asOf } },
    { $set: { boosted: false, boostExpiresAt: null, boostDuration: null, featured: false } },
  );

  if (stale.length > 0) {
    const markers = stale.map((g) => `boost-converted:group:${g._id.toString()}`);
    await Campaign.updateMany(
      { internalName: { $in: markers }, status: 'active' },
      { $set: { status: 'ended', endDate: asOf } },
    );
  }

  return res.modifiedCount ?? 0;
}

/** Run all expiry sweeps before serving ads or Top Groups/Bots. */
export async function enforceAdAndBoostExpiry(asOf = new Date()): Promise<void> {
  await Promise.all([
    expireStaleCampaigns(asOf),
    expireStaleBotBoosts(asOf),
    expireStaleGroupBoosts(asOf),
  ]);
}
