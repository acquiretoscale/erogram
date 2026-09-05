import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Group, Bot, PremiumEvent } from '@/lib/models';
import { validateCoupon, recordCouponUsage } from '@/lib/actions/coupons';
import { authenticateUser } from '@/lib/auth';
import { buildBoostPaymentUpdate, cryptoUsdFromStars, SCALE_STARS, SCALE_USD } from '@/lib/boostPricing';

const BOT_TOKEN = process.env.TELEGRAM_PAYMENT_BOT_TOKEN || '';
const NP_API_KEY = process.env.NOWPAYMENTS_API_KEY || '';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://erogramx.com';
const NP_BASE = 'https://api.nowpayments.io/v1';

function logSubmission(data: Record<string, unknown>) {
  PremiumEvent.create({ source: 'server', ...data }).catch(() => {});
}

export type SubmissionType = 'normal_listing' | 'instant_approval' | 'boost_week' | 'boost_month' | 'scale_month';
export type EntityType = 'group' | 'bot';

const GROUP_PLANS: Partial<Record<SubmissionType, { title: string; description: string; amount: number }>> = {
  instant_approval: {
    title: 'Instant Approval',
    description: 'Skip the moderation queue — your group goes live immediately',
    amount: 600,
  },
  boost_week: {
    title: 'Boost Extension (1 Week)',
    description: 'Boost in Top Groups for 7 days (40× more exposure)',
    amount: 2000,
  },
  boost_month: {
    title: 'Boost Extension (1 Month)',
    description: 'Boost in Top Groups for 30 days (40× more exposure)',
    amount: 5000,
  },
  scale_month: {
    title: 'Scale (1 Month)',
    description: 'Scale placement for 30 days (4× more exposure than Boost)',
    amount: SCALE_STARS,
  },
};

const BOT_PLANS: Record<SubmissionType, { title: string; description: string; amount: number }> = {
  normal_listing: {
    title: 'Normal Listing',
    description: 'Submit your bot to the directory — up to 7 days for approval',
    amount: 1000,
  },
  instant_approval: {
    title: 'Instant Approval',
    description: 'Skip the moderation queue — your bot goes live immediately',
    amount: 1500,
  },
  boost_week: {
    title: 'Boost Extension (1 Week)',
    description: 'Boost in Top Bots for 7 days. 40× more exposure',
    amount: 3000,
  },
  boost_month: {
    title: 'Boost Extension (1 Month)',
    description: 'Boost in Most Popular Bots for 30 days',
    amount: 6000,
  },
  scale_month: {
    title: 'Scale (1 Month)',
    description: 'Scale placement for 30 days (4× more exposure than Boost)',
    amount: SCALE_STARS,
  },
};

export async function POST(req: NextRequest) {
  let body: {
    groupId?: string;
    type?: SubmissionType;
    entityType?: EntityType;
    couponCode?: string;
    paymentMethod?: 'stars' | 'crypto';
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });
  }

  const { groupId, type, entityType = 'group', couponCode, paymentMethod = 'stars' } = body;

  const plans = entityType === 'bot' ? BOT_PLANS : GROUP_PLANS;

  if (!groupId || !type || !plans[type]) {
    return NextResponse.json({ message: 'groupId and valid type are required' }, { status: 400 });
  }

  await connectDB();

  const Model = entityType === 'bot' ? Bot : Group;
  const entity = await Model.findById(groupId).lean() as any;
  if (!entity) {
    return NextResponse.json({ message: 'Group/bot not found' }, { status: 404 });
  }

  const plan = plans[type]!;

  if (paymentMethod === 'crypto') {
    if (!NP_API_KEY) {
      return NextResponse.json({ message: 'Crypto payments are not configured.' }, { status: 503 });
    }
    if (type !== 'boost_week' && type !== 'boost_month' && type !== 'scale_month') {
      return NextResponse.json({ message: 'Crypto is only available for boost renewals.' }, { status: 400 });
    }

    const user = await authenticateUser(req);
    if (!user) {
      return NextResponse.json({ message: 'Login required for crypto payment.' }, { status: 401 });
    }
    if (entity.createdBy?.toString() !== user._id && !user.isAdmin) {
      return NextResponse.json({ message: 'You can only renew your own listings.' }, { status: 403 });
    }

    const priceUsd = type === 'scale_month' ? SCALE_USD : cryptoUsdFromStars(plan.amount);
    const orderId = `sub__${entityType}__${groupId}__${type}__${Date.now()}`;

    try {
      const res = await fetch(`${NP_BASE}/invoice`, {
        method: 'POST',
        headers: {
          'x-api-key': NP_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          price_amount: priceUsd,
          price_currency: 'usd',
          order_id: orderId,
          order_description: `${plan.title} | ${entity.name || entityType}`,
          ipn_callback_url: `${SITE_URL}/api/payments/nowpayments/webhook`,
          success_url: `${SITE_URL}/profile?tab=listings&renewed=1`,
          cancel_url: `${SITE_URL}/profile?tab=listings`,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.invoice_url) {
        console.error('NowPayments boost renewal invoice error:', data);
        logSubmission({
          event: 'submission_crypto_invoice_error',
          username: entity.name || null,
          userId: user._id,
          paymentMethod: 'crypto',
          entityType,
          listingType: type,
          orderId,
          reason: `${entityType}:${type}:${groupId}`,
          errorMessage: JSON.stringify(data),
        });
        return NextResponse.json({ message: data?.message || 'Failed to create crypto invoice.' }, { status: 500 });
      }

      logSubmission({
        event: 'submission_crypto_invoice_created',
        username: entity.name || null,
        userId: user._id,
        paymentMethod: 'crypto',
        entityType,
        listingType: type,
        orderId,
        reason: `${entityType}:${type}:${groupId}`,
      });
      return NextResponse.json({ url: data.invoice_url, paymentMethod: 'crypto' });
    } catch (err) {
      console.error('NowPayments boost renewal error:', err);
      logSubmission({
        event: 'submission_crypto_invoice_error',
        username: entity.name || null,
        userId: user._id,
        paymentMethod: 'crypto',
        entityType,
        listingType: type,
        orderId,
        reason: `${entityType}:${type}:${groupId}`,
        errorMessage: String(err),
      });
      return NextResponse.json({ message: 'Server error' }, { status: 500 });
    }
  }

  if (!BOT_TOKEN) {
    return NextResponse.json({ message: 'Payments are not configured. Contact admin.' }, { status: 503 });
  }

  let finalAmount = plan.amount;
  let couponValidation: any = null;

  if (couponCode) {
    const service = entityType === 'bot' ? 'bots' : 'groups';
    couponValidation = await validateCoupon(couponCode, service, plan.amount);
    if (!couponValidation.valid) {
      return NextResponse.json({ message: couponValidation.error }, { status: 400 });
    }
    finalAmount = couponValidation.discountedStars;
  }

  try {
    if (finalAmount <= 0) {
      const updateFields = buildBoostPaymentUpdate(entity, type, entityType, { paidBoostStars: 0 });
      await Model.findByIdAndUpdate(groupId, { $set: updateFields });

      if (couponValidation?.couponId) {
        await recordCouponUsage(couponValidation.couponId, {
          service: entityType === 'bot' ? 'bots' : 'groups',
          entityId: groupId,
          originalStars: plan.amount,
          discountedStars: 0,
          savedStars: plan.amount,
          couponCode: couponCode!,
        });
      }

      return NextResponse.json({ url: null, freeApproval: true });
    }

    const invoicePayload = JSON.stringify({
      groupId,
      type,
      entityType,
      couponCode: couponCode || undefined,
      couponId: couponValidation?.couponId,
    });
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/createInvoiceLink`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: plan.title,
        description: couponCode ? `${plan.description} (Coupon: ${couponCode})` : plan.description,
        payload: invoicePayload,
        provider_token: '',
        currency: 'XTR',
        prices: [{ label: plan.title, amount: finalAmount }],
      }),
    });

    const data = await res.json();
    const payer = await authenticateUser(req);

    if (!data.ok) {
      console.error('Telegram createInvoiceLink failed:', data);
      logSubmission({
        event: 'submission_invoice_error',
        username: entity.name || null,
        userId: payer?._id || null,
        paymentMethod: 'stars',
        entityType,
        listingType: type,
        reason: `${entityType}:${type}:${groupId}`,
        errorMessage: JSON.stringify(data),
      });
      return NextResponse.json({ message: 'Failed to create invoice. Please try again.' }, { status: 500 });
    }

    logSubmission({
      event: 'submission_invoice_created',
      username: entity.name || null,
      userId: payer?._id || null,
      paymentMethod: 'stars',
      entityType,
      listingType: type,
      reason: `${entityType}:${type}:${groupId}`,
    });
    return NextResponse.json({ url: data.result, paymentMethod: 'stars' });
  } catch (err) {
    console.error('Group submission payment error:', err);
    logSubmission({
      event: 'submission_invoice_error',
      username: entity.name || null,
      paymentMethod: 'stars',
      entityType,
      listingType: type,
      reason: `${entityType}:${type}:${groupId}`,
      errorMessage: String(err),
    });
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
