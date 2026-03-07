import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, MAX_PREMIUM_SLOTS } from '@/lib/auth';
import connectDB from '@/lib/db/mongodb';
import { User, PremiumEvent } from '@/lib/models';

const API_KEY = process.env.NOWPAYMENTS_API_KEY || '';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://erogram.pro';
const NP_BASE = 'https://api.nowpayments.io/v1';

const PLANS = {
  monthly:  { label: 'Erogram VIP (Monthly)',  description: '30-day unlimited access — Secret Vault, bookmarks & more', price: 12.00,  days: 30   },
  lifetime: { label: 'Erogram VIP (Lifetime)', description: 'Lifetime access — pay once, own it forever',                price: 89.00, days: null },
} as const;

function logEvent(data: Record<string, any>) {
  PremiumEvent.create({ source: 'server', ...data }).catch(() => {});
}

export async function POST(req: NextRequest) {
  if (!API_KEY) {
    return NextResponse.json({ message: 'Crypto payments are not configured.' }, { status: 503 });
  }

  const user = await authenticateUser(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  if (user.premium) {
    return NextResponse.json({ message: 'You are already a VIP member.' }, { status: 400 });
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
    return NextResponse.json({ message: 'Invalid plan.' }, { status: 400 });
  }

  const p = PLANS[plan as keyof typeof PLANS];
  // Encode userId + plan in order_id so the webhook can activate the right account
  const orderId = `${user._id}__${plan}__${Date.now()}`;

  try {
    const res = await fetch(`${NP_BASE}/invoice`, {
      method: 'POST',
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        price_amount: p.price,
        price_currency: 'usd',
        order_id: orderId,
        order_description: p.description,
        ipn_callback_url: `${SITE_URL}/api/payments/nowpayments/webhook`,
        success_url: `${SITE_URL}/premium?payment=crypto_success`,
        cancel_url: `${SITE_URL}/premium`,
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.invoice_url) {
      console.error('NowPayments invoice error:', data);
      logEvent({ event: 'crypto_invoice_error', userId: user._id, username: user.username, plan, errorMessage: JSON.stringify(data) });
      return NextResponse.json({ message: data?.message || 'Failed to create crypto invoice.' }, { status: 500 });
    }

    logEvent({ event: 'crypto_invoice_created', userId: user._id, username: user.username, plan, orderId });
    return NextResponse.json({ url: data.invoice_url });
  } catch (err) {
    console.error('NowPayments error:', err);
    logEvent({ event: 'crypto_invoice_error', userId: user._id, username: user.username, plan, errorMessage: String(err) });
    return NextResponse.json({ message: 'Server error.' }, { status: 500 });
  }
}
