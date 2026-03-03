import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { User } from '@/lib/models';
import { authenticateUser, MAX_PREMIUM_SLOTS } from '@/lib/auth';

const BOT_TOKEN = process.env.TELEGRAM_PAYMENT_BOT_TOKEN || '';

const PLANS = {
  monthly: { title: 'Erogram VIP (Monthly)', description: 'Unlimited bookmarks, folders & exclusive unlisted groups for 30 days', amount: 600, days: 30 },
  yearly: { title: 'Erogram VIP (Yearly)', description: 'Unlimited bookmarks, folders & exclusive unlisted groups for 1 year — 72% OFF', amount: 2000, days: 365 },
  lifetime: { title: 'Erogram VIP (Lifetime)', description: 'Unlimited VIP access forever — all features, all updates, no renewals', amount: 10000, days: null },
} as const;

export async function POST(req: NextRequest) {
  if (!BOT_TOKEN) {
    console.error('TELEGRAM_PAYMENT_BOT_TOKEN is not set — payments disabled to prevent routing money to wrong account');
    return NextResponse.json({ message: 'Payments are not configured. Contact admin.' }, { status: 503 });
  }

  const user = await authenticateUser(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  if (user.premium) {
    return NextResponse.json({ message: 'You are already a VIP member' }, { status: 400 });
  }

  await connectDB();
  const premiumCount = await User.countDocuments({
    premium: true,
    $or: [{ premiumExpiresAt: null }, { premiumExpiresAt: { $gt: new Date() } }],
  });
  if (premiumCount >= MAX_PREMIUM_SLOTS) {
    return NextResponse.json({ message: 'All VIP slots are taken. Check back later.', soldOut: true }, { status: 403 });
  }

  const { plan } = await req.json();
  if (!plan || !PLANS[plan as keyof typeof PLANS]) {
    return NextResponse.json({ message: 'Invalid plan' }, { status: 400 });
  }

  const p = PLANS[plan as keyof typeof PLANS];

  try {
    const payload = JSON.stringify({
      title: p.title,
      description: p.description,
      payload: JSON.stringify({ userId: user._id, plan }),
      currency: 'XTR',
      prices: [{ label: p.title, amount: p.amount }],
    });

    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/createInvoiceLink`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
    });

    const data = await res.json();

    if (!data.ok) {
      console.error('Telegram createInvoiceLink failed:', data);
      return NextResponse.json({ message: 'Failed to create invoice' }, { status: 500 });
    }

    return NextResponse.json({ url: data.result });
  } catch (err) {
    console.error('Payment error:', err);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
