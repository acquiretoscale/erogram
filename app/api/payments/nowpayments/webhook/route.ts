import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import connectDB from '@/lib/db/mongodb';
import { User, Group, Bot, AINsfwSubmission, PremiumEvent } from '@/lib/models';
import { notifyAdminsOfSale } from '@/lib/utils/notifyAdmins';
import { getPremiumPricing } from '@/lib/premiumPricing';

const IPN_SECRET = process.env.NOWPAYMENTS_IPN_SECRET || '';

const VALID_PLANS = new Set(['monthly', 'quarterly', 'yearly', 'lifetime']);
const VALID_SUBMISSION_TIERS = new Set(['instant', 'boost', 'platinum']);
const ACTIVATE_ON = new Set(['finished', 'confirmed']);

function logEvent(data: Record<string, any>) {
  PremiumEvent.create({ source: 'server', ...data }).catch(() => {});
}

function verifySignature(body: Record<string, any>, sigHeader: string | null): boolean {
  if (!sigHeader || !IPN_SECRET) return false;
  const sorted = JSON.stringify(body, Object.keys(body).sort());
  const expected = crypto.createHmac('sha512', IPN_SECRET).update(sorted).digest('hex');
  return expected === sigHeader;
}

// ─── Handle listing submission payments (groups, bots, AI NSFW) ───

async function handleSubmissionPayment(
  entityType: string,
  entityId: string,
  tier: string,
  paymentId: string,
) {
  if (!VALID_SUBMISSION_TIERS.has(tier)) return;

  let Model: any;
  if (entityType === 'group') Model = Group;
  else if (entityType === 'bot') Model = Bot;
  else if (entityType === 'ainsfw') Model = AINsfwSubmission;
  else return;

  const entity = await Model.findById(entityId);
  if (!entity) {
    console.error(`NowPayments submission webhook: ${entityType} not found`, entityId);
    return;
  }

  const now = new Date();
  const update: Record<string, any> = { status: 'approved' };

  if (tier === 'boost' || tier === 'platinum') {
    update.boosted = true;
    update.paidBoost = true;
    const boostDays = tier === 'platinum' ? 30 : 7;
    const exp = new Date(now);
    exp.setDate(exp.getDate() + boostDays);
    update.boostExpiresAt = exp;
    update.boostDuration = boostDays === 30 ? '30d' : '7d';
  }

  if (tier === 'platinum') {
    update.featured = true;
    update.featuredAt = now;
    if (entityType === 'ainsfw') {
      const exp = new Date(now);
      exp.setDate(exp.getDate() + 30);
      update.featuredExpiresAt = exp;
    }
  }

  if (entityType === 'ainsfw') {
    update.paymentStatus = 'paid';
    update.paymentId = String(paymentId);
  }

  await Model.findByIdAndUpdate(entityId, update);

  logEvent({
    event: 'submission_payment_success',
    entityType,
    entityId,
    tier,
    paymentId,
    paymentMethod: 'crypto',
  });

  notifyAdminsOfSale({
    plan: `${entityType}_${tier}`,
    method: 'crypto',
    username: entity.name || 'Unknown',
  }).catch(() => {});
}

// ─── Main webhook handler ───

export async function POST(req: NextRequest) {
  if (!IPN_SECRET) {
    console.error('NOWPAYMENTS_IPN_SECRET not set — rejecting webhook');
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  let body: Record<string, any>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const sig = req.headers.get('x-nowpayments-sig');
  if (!verifySignature(body, sig)) {
    console.error('NowPayments webhook: invalid signature');
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const { payment_status, order_id, payment_id, actually_paid, price_amount } = body;

  logEvent({ event: `crypto_webhook_${payment_status}`, orderId: order_id, paymentId: payment_id });

  if (!ACTIVATE_ON.has(payment_status)) {
    return NextResponse.json({ ok: true });
  }

  // Guard: ensure user actually paid at least the expected amount
  if (actually_paid !== undefined && price_amount !== undefined) {
    if (Number(actually_paid) < Number(price_amount) * 0.95) {
      logEvent({ event: 'crypto_partial_payment', orderId: order_id, actually_paid, price_amount });
      return NextResponse.json({ ok: true });
    }
  }

  const parts = (order_id || '').split('__');
  if (parts.length < 2) {
    console.error('NowPayments webhook: malformed order_id', order_id);
    return NextResponse.json({ ok: true });
  }

  try {
    await connectDB();

    // ─── Submission payments: order_id = sub__entityType__entityId__tier__ts ───
    if (parts[0] === 'sub' && parts.length >= 4) {
      const [, entityType, entityId, tier] = parts;
      await handleSubmissionPayment(entityType, entityId, tier, payment_id);
      return NextResponse.json({ ok: true });
    }

    // ─── Premium subscription payments: order_id = userId__plan__ts ───
    const [userId, plan] = parts;
    if (!VALID_PLANS.has(plan)) {
      console.error('NowPayments webhook: invalid plan in order_id', plan);
      return NextResponse.json({ ok: true });
    }

    const user = await User.findById(userId).lean() as any;
    if (!user) {
      console.error('NowPayments webhook: user not found', userId);
      return NextResponse.json({ ok: true });
    }

    if (user.lastPaymentChargeId === String(payment_id)) {
      return NextResponse.json({ ok: true });
    }

    const now = new Date();
    const update: Record<string, any> = {
      premium: true,
      premiumPlan: plan,
      premiumSince: now,
      paymentMethod: 'crypto',
      lastPaymentChargeId: String(payment_id),
    };

    if (plan === 'lifetime') {
      update.premiumExpiresAt = null;
    } else {
      const pricing = await getPremiumPricing();
      const planConfig = plan === 'yearly' ? pricing.yearly : plan === 'quarterly' ? pricing.quarterly : pricing.monthly;
      const planDays = planConfig.days;
      const exp = new Date(now);
      exp.setDate(exp.getDate() + planDays);
      update.premiumExpiresAt = exp;
    }

    await User.findByIdAndUpdate(userId, update);
    logEvent({ event: 'crypto_payment_success', userId, plan, paymentId: payment_id, paymentMethod: 'crypto' });

    const userDoc = await User.findById(userId).lean() as any;
    notifyAdminsOfSale({ plan, method: 'crypto', username: userDoc?.username }).catch(() => {});
  } catch (err) {
    console.error('NowPayments webhook processing error:', err);
  }

  return NextResponse.json({ ok: true });
}
