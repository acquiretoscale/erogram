import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Group, Bot } from '@/lib/models';
import { validateCoupon, recordCouponUsage } from '@/lib/actions/coupons';

const BOT_TOKEN = process.env.TELEGRAM_PAYMENT_BOT_TOKEN || '';

export type SubmissionType = 'normal_listing' | 'instant_approval' | 'boost_week' | 'boost_month';
export type EntityType = 'group' | 'bot';

const GROUP_PLANS: Partial<Record<SubmissionType, { title: string; description: string; amount: number }>> = {
  instant_approval: {
    title: 'Instant Approval',
    description: 'Skip the moderation queue — your group goes live immediately',
    amount: 600,
  },
  boost_week: {
    title: 'Instant + Boost (1 Week)',
    description: 'Instantly approved AND boosted in Top Groups for 7 days (40× more exposure)',
    amount: 2000,
  },
  boost_month: {
    title: 'Instant + Boost (1 Month)',
    description: 'Instantly approved AND boosted in Top Groups for 30 days (40× more exposure)',
    amount: 5000,
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
    title: 'Instant + Boost (1 Week)',
    description: 'Instantly approved AND boosted in Top Bots for 7 days — 40× more exposure',
    amount: 3000,
  },
  boost_month: {
    title: 'Instant + Boost (1 Month)',
    description: 'Instantly approved AND boosted in Most Popular Bots for 30 days',
    amount: 6000,
  },
};

export async function POST(req: NextRequest) {
  if (!BOT_TOKEN) {
    return NextResponse.json({ message: 'Payments are not configured. Contact admin.' }, { status: 503 });
  }

  let body: { groupId?: string; type?: SubmissionType; entityType?: EntityType; couponCode?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });
  }

  const { groupId, type, entityType = 'group', couponCode } = body;

  const plans = entityType === 'bot' ? BOT_PLANS : GROUP_PLANS;

  if (!groupId || !type || !plans[type]) {
    return NextResponse.json({ message: 'groupId and valid type are required' }, { status: 400 });
  }

  await connectDB();

  const Model = entityType === 'bot' ? Bot : Group;
  const entity = await Model.findById(groupId).lean();
  if (!entity) {
    return NextResponse.json({ message: 'Group/bot not found' }, { status: 404 });
  }

  const plan = plans[type];
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
    // 100% discount — skip Telegram invoice, approve directly
    if (finalAmount <= 0) {
      const now = new Date();
      const updateFields: Record<string, any> = { paidBoost: true, paidBoostStars: 0 };
      if (type === 'instant_approval' || type === 'boost_week' || type === 'boost_month') {
        updateFields.status = 'approved';
      }
      if (type === 'boost_week') {
        const exp = new Date(now); exp.setDate(exp.getDate() + 7);
        Object.assign(updateFields, { featured: true, featuredAt: now, boosted: true, boostExpiresAt: exp, boostDuration: '7d' });
      } else if (type === 'boost_month') {
        const exp = new Date(now); exp.setDate(exp.getDate() + 30);
        Object.assign(updateFields, { featured: true, featuredAt: now, boosted: true, boostExpiresAt: exp, boostDuration: '30d' });
      }
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

    const invoicePayload = JSON.stringify({ groupId, type, entityType, couponCode: couponCode || undefined, couponId: couponValidation?.couponId });
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

    if (!data.ok) {
      console.error('Telegram createInvoiceLink failed:', data);
      return NextResponse.json({ message: 'Failed to create invoice. Please try again.' }, { status: 500 });
    }

    return NextResponse.json({ url: data.result });
  } catch (err) {
    console.error('Group submission payment error:', err);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
