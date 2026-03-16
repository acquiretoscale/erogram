import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Group, Bot } from '@/lib/models';

const BOT_TOKEN = process.env.TELEGRAM_PAYMENT_BOT_TOKEN || '';

export type SubmissionType = 'normal_listing' | 'instant_approval' | 'boost_week' | 'boost_month';
export type EntityType = 'group' | 'bot';

const GROUP_PLANS: Partial<Record<SubmissionType, { title: string; description: string; amount: number }>> = {
  instant_approval: {
    title: 'Instant Approval',
    description: 'Skip the moderation queue — your group goes live immediately',
    amount: 1000,
  },
  boost_week: {
    title: 'Instant + Boost (1 Week)',
    description: 'Instantly approved AND boosted in Top Groups for 7 days (40× more exposure)',
    amount: 3000,
  },
  boost_month: {
    title: 'Instant + Boost (1 Month)',
    description: 'Instantly approved AND boosted in Top Groups for 30 days (40× more exposure)',
    amount: 6000,
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

  let body: { groupId?: string; type?: SubmissionType; entityType?: EntityType };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });
  }

  const { groupId, type, entityType = 'group' } = body;

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

  try {
    const invoicePayload = JSON.stringify({ groupId, type, entityType });
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/createInvoiceLink`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: plan.title,
        description: plan.description,
        payload: invoicePayload,
        provider_token: '',
        currency: 'XTR',
        prices: [{ label: plan.title, amount: plan.amount }],
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
