'use server';

import connectDB from '@/lib/db/mongodb';
import { User, Group, Bot, AINsfwSubmission, OnlyFansCreator, PremiumEvent } from '@/lib/models';
import { notifyAdminsOfSale } from '@/lib/utils/notifyAdmins';
import { getPremiumPricing } from '@/lib/premiumPricing';
import { buildBoostPaymentUpdate, cryptoUsdFromStars, BOOST_STARS, SCALE_USD, type BoostPaymentType } from '@/lib/boostPricing';
import { fulfillAINSFWListingPayment } from '@/lib/actions/ainsfwPayment';
import type { AINSFWPlan } from '@/lib/ainsfw/planPrices';

const AINSFW_USD: Record<string, number> = { basic: 49, boost: 147, startup: 297, platinum: 297 };
const FEATURED_CREATOR_USD = 197;

const VALID_PLANS = new Set(['monthly', 'quarterly', 'yearly', 'lifetime']);
const VALID_SUBMISSION_TIERS = new Set([
  'basic', 'instant', 'boost', 'startup', 'platinum',
  'normal_listing', 'instant_approval', 'boost_week', 'boost_month', 'scale_month',
]);
const ACTIVATE_ON = new Set(['finished', 'confirmed']);

export type NowPaymentPayload = {
  payment_status?: string;
  order_id?: string;
  payment_id?: string | number;
  actually_paid_at_fiat?: number | string;
  price_amount?: number | string;
};

export async function logCryptoEvent(data: Record<string, unknown>) {
  await PremiumEvent.create({ source: 'server', ...data });
}

async function handleSubmissionPayment(
  entityType: string,
  entityId: string,
  tier: string,
  paymentId: string,
) {
  if (!VALID_SUBMISSION_TIERS.has(tier)) {
    throw new Error(`Invalid submission tier: ${tier}`);
  }

  let Model: typeof Group | typeof Bot | typeof AINsfwSubmission;
  if (entityType === 'group') Model = Group;
  else if (entityType === 'bot') Model = Bot;
  else if (entityType === 'ainsfw') Model = AINsfwSubmission;
  else throw new Error(`Unknown entity type: ${entityType}`);

  const entity = await Model.findById(entityId);
  if (!entity) {
    throw new Error(`${entityType} not found: ${entityId}`);
  }

  if (entityType === 'ainsfw') {
    const plan = tier as AINSFWPlan;
    if (!['basic', 'boost', 'startup'].includes(plan)) {
      throw new Error(`Invalid ainsfw plan: ${tier}`);
    }
    const fulfilled = await fulfillAINSFWListingPayment(entityId, plan, paymentId);
    if (!fulfilled) {
      throw new Error(`ainsfw fulfill failed: ${entityId}`);
    }
    await logCryptoEvent({
      event: 'submission_payment_success',
      entityType,
      listingType: tier,
      paymentId,
      paymentMethod: 'crypto',
      username: fulfilled.name || 'Unknown',
      reason: `${entityType}:${tier}:${entityId}`,
    });
    await notifyAdminsOfSale({
      plan: `${entityType}_${tier}`,
      method: 'crypto',
      username: fulfilled.name || 'Unknown',
      usd: AINSFW_USD[tier] || 49,
    });
    return;
  }

  if (paymentId && (entity as any).lastPaymentChargeId === paymentId) {
    return;
  }

  const normalizedTier: BoostPaymentType =
    tier === 'boost' ? 'boost_week' : tier === 'platinum' ? 'boost_month' : tier as BoostPaymentType;

  if (!['normal_listing', 'instant_approval', 'boost_week', 'boost_month', 'scale_month'].includes(normalizedTier)) {
    throw new Error(`Unsupported boost tier: ${normalizedTier}`);
  }

  const update = buildBoostPaymentUpdate(
    entity as { boostExpiresAt?: Date | string | null },
    normalizedTier,
    entityType as 'group' | 'bot',
    { lastPaymentChargeId: paymentId },
  );

  await Model.findByIdAndUpdate(entityId, { $set: update });

  const entityName = (entity as any).name || 'Unknown';
  let usd = 0;
  if (normalizedTier === 'scale_month') usd = SCALE_USD;
  else if (normalizedTier === 'boost_week') usd = cryptoUsdFromStars(BOOST_STARS[entityType as 'group' | 'bot'].week);
  else if (normalizedTier === 'boost_month') usd = cryptoUsdFromStars(BOOST_STARS[entityType as 'group' | 'bot'].month);
  else if (normalizedTier === 'instant_approval') usd = cryptoUsdFromStars(entityType === 'bot' ? 1500 : 600);
  else if (normalizedTier === 'normal_listing') usd = cryptoUsdFromStars(1000);

  await logCryptoEvent({
    event: 'submission_payment_success',
    entityType,
    listingType: normalizedTier,
    paymentId,
    paymentMethod: 'crypto',
    username: entityName,
    reason: `${entityType}:${normalizedTier}:${entityId}`,
  });

  await notifyAdminsOfSale({
    plan: `${entityType}_${normalizedTier}`,
    method: 'crypto',
    username: entityName,
    usd,
  });
}

async function handleFeaturedCreatorPayment(creatorId: string, paymentId: string) {
  const creator = await OnlyFansCreator.findById(creatorId);
  if (!creator) {
    throw new Error(`Creator not found: ${creatorId}`);
  }
  if (creator.featuredPaymentId === paymentId) return;

  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + 7);

  await OnlyFansCreator.findByIdAndUpdate(creatorId, {
    featured: true,
    featuredAt: now,
    featuredExpiresAt: expiresAt,
    featuredPaymentId: paymentId,
  });

  await logCryptoEvent({
    event: 'featured_creator_payment_success',
    entityType: 'onlyfans_creator',
    entityId: creatorId,
    paymentId,
    paymentMethod: 'crypto',
    username: creator.name || creator.username || 'Unknown',
  });

  await notifyAdminsOfSale({
    plan: 'featured_creator',
    method: 'crypto',
    username: creator.name || creator.username || 'Unknown',
    usd: FEATURED_CREATOR_USD,
  });
}

async function handlePremiumPayment(userId: string, plan: string, paymentId: string) {
  if (!VALID_PLANS.has(plan)) {
    throw new Error(`Invalid premium plan: ${plan}`);
  }

  const user = await User.findById(userId).lean() as { lastPaymentChargeId?: string; username?: string } | null;
  if (!user) {
    throw new Error(`User not found: ${userId}`);
  }
  if (user.lastPaymentChargeId === paymentId) return;

  const now = new Date();
  const update: Record<string, unknown> = {
    premium: true,
    premiumPlan: plan,
    premiumSince: now,
    paymentMethod: 'crypto',
    lastPaymentChargeId: paymentId,
  };

  const pricing = await getPremiumPricing();
  if (plan === 'lifetime') {
    update.premiumExpiresAt = null;
  } else {
    const planConfig = plan === 'yearly' ? pricing.yearly : plan === 'quarterly' ? pricing.quarterly : pricing.monthly;
    const exp = new Date(now);
    exp.setDate(exp.getDate() + planConfig.days);
    update.premiumExpiresAt = exp;
  }

  await User.findByIdAndUpdate(userId, update);
  const usd =
    plan === 'lifetime' ? (pricing.lifetime?.priceUsd || 0)
    : plan === 'yearly' ? (pricing.yearly?.priceUsd || 0)
    : plan === 'quarterly' ? (pricing.quarterly?.priceUsd || 0)
    : (pricing.monthly?.priceUsd || 0);

  await logCryptoEvent({
    event: 'crypto_payment_success',
    userId,
    plan,
    paymentId,
    paymentMethod: 'crypto',
    username: user.username,
  });
  await notifyAdminsOfSale({ plan, method: 'crypto', username: user.username, usd });
}

/** Returns true if payment was fulfilled, false if skipped (already done / not activatable). */
export async function fulfillNowPayment(body: NowPaymentPayload): Promise<'fulfilled' | 'skipped'> {
  const payment_status = body.payment_status || '';
  const order_id = body.order_id || '';
  const payment_id = String(body.payment_id ?? '');

  if (!ACTIVATE_ON.has(payment_status)) {
    return 'skipped';
  }

  if (!order_id || !payment_id) {
    throw new Error('Missing order_id or payment_id');
  }

  // Log underpayment for ops — but NP "finished" is the source of truth; never block fulfillment.
  const paidFiat = body.actually_paid_at_fiat != null ? Number(body.actually_paid_at_fiat) : NaN;
  const expectedFiat = body.price_amount != null ? Number(body.price_amount) : NaN;
  if (Number.isFinite(paidFiat) && paidFiat > 0 && Number.isFinite(expectedFiat) && expectedFiat > 0) {
    if (paidFiat < expectedFiat * 0.95) {
      await logCryptoEvent({
        event: 'crypto_underpaid_but_finished',
        orderId: order_id,
        paymentId: payment_id,
        actually_paid_at_fiat: paidFiat,
        price_amount: expectedFiat,
      }).catch(() => {});
    }
  }

  const parts = order_id.split('__');
  if (parts.length < 2) {
    throw new Error(`Malformed order_id: ${order_id}`);
  }

  await connectDB();

  if (parts[0] === 'featured' && parts.length >= 3) {
    await handleFeaturedCreatorPayment(parts[1], payment_id);
    return 'fulfilled';
  }

  if (parts[0] === 'sub' && parts.length >= 4) {
    const [, entityType, entityId, tier] = parts;
    await handleSubmissionPayment(entityType, entityId, tier, payment_id);
    return 'fulfilled';
  }

  const [userId, plan] = parts;
  await handlePremiumPayment(userId, plan, payment_id);
  return 'fulfilled';
}

export async function isPaymentAlreadyFulfilled(body: NowPaymentPayload): Promise<boolean> {
  const order_id = body.order_id || '';
  const payment_id = String(body.payment_id ?? '');
  if (!order_id || !payment_id) return false;

  await connectDB();
  const parts = order_id.split('__');

  if (parts[0] === 'featured' && parts.length >= 3) {
    const c = await OnlyFansCreator.findById(parts[1]).select('featuredPaymentId').lean() as { featuredPaymentId?: string } | null;
    return c?.featuredPaymentId === payment_id;
  }

  if (parts[0] === 'sub' && parts.length >= 4) {
    const entityType = parts[1];
    const entityId = parts[2];
    let Model: typeof Group | typeof Bot | typeof AINsfwSubmission;
    if (entityType === 'group') Model = Group;
    else if (entityType === 'bot') Model = Bot;
    else if (entityType === 'ainsfw') Model = AINsfwSubmission;
    else return false;
    const e = await Model.findById(entityId).lean() as { lastPaymentChargeId?: string; paymentId?: string; paymentStatus?: string } | null;
    if (!e) return false;
    if (entityType === 'ainsfw') {
      return e.paymentId === payment_id && e.paymentStatus === 'paid';
    }
    return e.lastPaymentChargeId === payment_id;
  }

  const [userId] = parts;
  const u = await User.findById(userId).select('lastPaymentChargeId').lean() as { lastPaymentChargeId?: string } | null;
  return u?.lastPaymentChargeId === payment_id;
}
