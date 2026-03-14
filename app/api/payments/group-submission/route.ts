import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Group, Bot } from '@/lib/models';

const BOT_TOKEN = process.env.TELEGRAM_PAYMENT_BOT_TOKEN || '';

export type SubmissionType = 'instant_approval' | 'boost_week' | 'boost_month';
export type EntityType = 'group' | 'bot';

const PLANS: Record<SubmissionType, { title: string; description: string; amount: number }> = {
  instant_approval: {
    title: 'Instant Approval',
    description: 'Skip the moderation queue — your group/bot goes live immediately',
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

  if (!groupId || !type || !PLANS[type]) {
    return NextResponse.json({ message: 'groupId and valid type are required' }, { status: 400 });
  }

  await connectDB();

  const Model = entityType === 'bot' ? Bot : Group;
  const entity = await Model.findById(groupId).lean();
  if (!entity) {
    return NextResponse.json({ message: 'Group/bot not found' }, { status: 404 });
  }

  const plan = PLANS[type];

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
