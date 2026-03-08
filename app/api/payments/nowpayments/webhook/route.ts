import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import connectDB from '@/lib/db/mongodb';
import { User, PremiumEvent } from '@/lib/models';
import { notifyAdminsOfSale } from '@/lib/utils/notifyAdmins';

const IPN_SECRET = process.env.NOWPAYMENTS_IPN_SECRET || '';

const VALID_PLANS = new Set(['monthly', 'yearly', 'lifetime']);
const ACTIVATE_ON = new Set(['finished', 'confirmed']);

function logEvent(data: Record<string, any>) {
  PremiumEvent.create({ source: 'server', ...data }).catch(() => {});
}

function verifySignature(body: Record<string, any>, sigHeader: string | null): boolean {
  if (!sigHeader || !IPN_SECRET) return false;
  // NowPayments: HMAC-SHA512 of JSON with keys sorted alphabetically
  const sorted = JSON.stringify(body, Object.keys(body).sort());
  const expected = crypto.createHmac('sha512', IPN_SECRET).update(sorted).digest('hex');
  return expected === sigHeader;
}

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

  // order_id format: userId__plan__timestamp
  const parts = (order_id || '').split('__');
  if (parts.length < 2) {
    console.error('NowPayments webhook: malformed order_id', order_id);
    return NextResponse.json({ ok: true });
  }

  const [userId, plan] = parts;
  if (!VALID_PLANS.has(plan)) {
    console.error('NowPayments webhook: invalid plan in order_id', plan);
    return NextResponse.json({ ok: true });
  }

  // Guard: ensure user actually paid at least the expected amount
  if (actually_paid !== undefined && price_amount !== undefined) {
    if (Number(actually_paid) < Number(price_amount) * 0.95) {
      logEvent({ event: 'crypto_partial_payment', userId, plan, actually_paid, price_amount });
      return NextResponse.json({ ok: true });
    }
  }

  try {
    await connectDB();

    const user = await User.findById(userId).lean() as any;
    if (!user) {
      console.error('NowPayments webhook: user not found', userId);
      return NextResponse.json({ ok: true });
    }

    // Idempotency: skip if already premium from this same payment
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
    } else if (plan === 'yearly') {
      const exp = new Date(now);
      exp.setDate(exp.getDate() + 365);
      update.premiumExpiresAt = exp;
    } else {
      const exp = new Date(now);
      exp.setDate(exp.getDate() + 30);
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
