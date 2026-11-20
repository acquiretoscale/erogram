import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import connectDB from '@/lib/db/mongodb';
import { CustomCheckout, PremiumEvent } from '@/lib/models';

const API_KEY = process.env.NOWPAYMENTS_API_KEY || '';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://erogramx.com';
const NP_BASE = 'https://api.nowpayments.io/v1';
const MAX_USD = 100000;

function logEvent(data: Record<string, unknown>) {
  PremiumEvent.create({ source: 'server', ...data }).catch(() => {});
}

// Public: one shared link. The client types the amount and the tool name, then pays.
export async function POST(req: NextRequest) {
  if (!API_KEY) {
    return NextResponse.json({ message: 'Crypto payments are not configured.' }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  const toolName = (body?.toolName ?? '').toString().trim().slice(0, 120);
  const email = (body?.email ?? '').toString().trim().slice(0, 160).toLowerCase();
  const note = (body?.note ?? '').toString().trim().slice(0, 500);
  const amountUsd = Math.round(Number(body?.amountUsd) * 100) / 100;

  if (!toolName) {
    return NextResponse.json({ message: 'Enter the tool name.' }, { status: 400 });
  }
  if (!email.includes('@') || !email.includes('.')) {
    return NextResponse.json({ message: 'Enter a valid email.' }, { status: 400 });
  }
  if (!Number.isFinite(amountUsd) || amountUsd < 1 || amountUsd > MAX_USD) {
    return NextResponse.json({ message: 'Enter an amount between $1 and $100,000.' }, { status: 400 });
  }

  await connectDB();
  const publicId = crypto.randomBytes(9).toString('base64url');
  await CustomCheckout.create({
    publicId,
    description: toolName,
    amountUsd,
    clientEmail: email,
    note,
  });

  const orderId = `custom__${publicId}__${Date.now()}`;

  try {
    const res = await fetch(`${NP_BASE}/invoice`, {
      method: 'POST',
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        price_amount: amountUsd,
        price_currency: 'usd',
        order_id: orderId,
        order_description: note ? `${toolName} — ${note}` : toolName,
        ipn_callback_url: `${SITE_URL}/api/payments/nowpayments/webhook`,
        success_url: `${SITE_URL}/checkout/${publicId}`,
        cancel_url: `${SITE_URL}/checkout`,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.invoice_url) {
      console.error('Custom checkout invoice error:', data);
      logEvent({ event: 'custom_checkout_invoice_error', orderId, reason: publicId, paymentMethod: 'crypto', errorMessage: JSON.stringify(data) });
      return NextResponse.json({ message: data?.message || 'Failed to start payment.' }, { status: 500 });
    }

    logEvent({ event: 'custom_checkout_invoice_created', orderId, reason: publicId, paymentMethod: 'crypto' });
    return NextResponse.json({ url: data.invoice_url });
  } catch (err) {
    console.error('Custom checkout error:', err);
    logEvent({ event: 'custom_checkout_invoice_error', orderId, reason: publicId, paymentMethod: 'crypto', errorMessage: String(err) });
    return NextResponse.json({ message: 'Server error.' }, { status: 500 });
  }
}
