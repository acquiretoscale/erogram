import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { User, PremiumEvent } from '@/lib/models';
import { authenticateUser, MAX_PREMIUM_SLOTS } from '@/lib/auth';
import { getPremiumPricing, getStarsRate, usdToStars, isValidPlan, getPlanConfig } from '@/lib/premiumPricing';

const BOT_TOKEN = process.env.TELEGRAM_PAYMENT_BOT_TOKEN || '';

function logEvent(data: Record<string, any>) {
  PremiumEvent.create({ source: 'server', ...data }).catch(() => {});
}

export async function POST(req: NextRequest) {
  if (!BOT_TOKEN) {
    console.error('TELEGRAM_PAYMENT_BOT_TOKEN is not set — payments disabled to prevent routing money to wrong account');
    return NextResponse.json({ message: 'Payments are not configured. Contact admin.' }, { status: 503 });
  }

  const user = await authenticateUser(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  if (user.premium) {
    logEvent({ event: 'already_premium', userId: user._id, username: user.username });
    return NextResponse.json({ message: 'You are already a VIP member' }, { status: 400 });
  }

  await connectDB();
  const premiumCount = await User.countDocuments({
    premium: true,
    $or: [{ premiumExpiresAt: null }, { premiumExpiresAt: { $gt: new Date() } }],
  });
  if (premiumCount >= MAX_PREMIUM_SLOTS) {
    logEvent({ event: 'slots_full', userId: user._id, username: user.username });
    return NextResponse.json({ message: 'All VIP slots are taken. Check back later.', soldOut: true }, { status: 403 });
  }

  const { plan } = await req.json();
  if (!plan || !isValidPlan(plan)) {
    return NextResponse.json({ message: 'Invalid plan' }, { status: 400 });
  }

  const [pricing, rate] = await Promise.all([getPremiumPricing(), getStarsRate()]);
  const p = getPlanConfig(pricing, plan);
  const starsAmount = usdToStars(p.priceUsd, rate);

  try {
    const payload = JSON.stringify({
      title: p.label,
      description: p.description,
      payload: JSON.stringify({ userId: user._id, plan }),
      currency: 'XTR',
      prices: [{ label: p.label, amount: starsAmount }],
    });

    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/createInvoiceLink`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
    });

    const data = await res.json();

    if (!data.ok) {
      console.error('Telegram createInvoiceLink failed:', data);
      logEvent({ event: 'invoice_error', userId: user._id, username: user.username, plan, errorMessage: JSON.stringify(data) });
      return NextResponse.json({ message: 'Failed to create invoice' }, { status: 500 });
    }

    logEvent({ event: 'invoice_created', userId: user._id, username: user.username, plan, paymentMethod: 'stars' });
    return NextResponse.json({ url: data.result });
  } catch (err) {
    console.error('Payment error:', err);
    logEvent({ event: 'invoice_error', userId: user._id, username: user.username, plan, errorMessage: String(err), paymentMethod: 'stars' });
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
