import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { User } from '@/lib/models';
import { MAX_PREMIUM_SLOTS } from '../stars/route';

const BOT_TOKEN = process.env.TELEGRAM_PAYMENT_BOT_TOKEN || '';
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || '';

async function answerPreCheckoutQuery(id: string, ok: boolean, errorMessage?: string) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerPreCheckoutQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      pre_checkout_query_id: id,
      ok,
      ...(errorMessage ? { error_message: errorMessage } : {}),
    }),
  });
}

export async function POST(req: NextRequest) {
  try {
    // Verify webhook secret if configured
    if (WEBHOOK_SECRET) {
      const secret = req.headers.get('x-telegram-bot-api-secret-token');
      if (secret !== WEBHOOK_SECRET) {
        return NextResponse.json({ ok: false }, { status: 403 });
      }
    }

    const update = await req.json();

    if (update.pre_checkout_query) {
      const query = update.pre_checkout_query;
      try {
        const payload = JSON.parse(query.invoice_payload);
        if (!payload.userId || !payload.plan) {
          await answerPreCheckoutQuery(query.id, false, 'Invalid payment data');
          return NextResponse.json({ ok: true });
        }

        await connectDB();

        // Re-verify user is not already premium
        const user = await User.findById(payload.userId).lean() as any;
        if (user?.premium && (!user.premiumExpiresAt || new Date(user.premiumExpiresAt) > new Date())) {
          await answerPreCheckoutQuery(query.id, false, 'You are already a Premium member');
          return NextResponse.json({ ok: true });
        }

        // Re-verify slot availability
        const taken = await User.countDocuments({
          premium: true,
          $or: [{ premiumExpiresAt: null }, { premiumExpiresAt: { $gt: new Date() } }],
        });
        if (taken >= MAX_PREMIUM_SLOTS) {
          await answerPreCheckoutQuery(query.id, false, 'All Premium spots are taken');
          return NextResponse.json({ ok: true });
        }

        await answerPreCheckoutQuery(query.id, true);
      } catch {
        await answerPreCheckoutQuery(query.id, false, 'Error processing payment');
      }
      return NextResponse.json({ ok: true });
    }

    if (update.message?.successful_payment) {
      const payment = update.message.successful_payment;
      try {
        const payload = JSON.parse(payment.invoice_payload);
        const { userId, plan } = payload;

        await connectDB();

        // Idempotency: check if this charge was already processed
        const chargeId = payment.provider_payment_charge_id || payment.telegram_payment_charge_id;
        if (chargeId) {
          const existing = await User.findOne({ lastPaymentChargeId: chargeId }).lean();
          if (existing) {
            return NextResponse.json({ ok: true });
          }
        }

        const now = new Date();
        const updateData: Record<string, any> = {
          premium: true,
          premiumPlan: plan,
          premiumSince: now,
        };

        if (plan === 'lifetime') {
          updateData.premiumExpiresAt = null;
        } else if (plan === 'yearly') {
          const expiresAt = new Date(now);
          expiresAt.setDate(expiresAt.getDate() + 365);
          updateData.premiumExpiresAt = expiresAt;
        } else {
          const expiresAt = new Date(now);
          expiresAt.setDate(expiresAt.getDate() + 30);
          updateData.premiumExpiresAt = expiresAt;
        }

        if (chargeId) {
          updateData.lastPaymentChargeId = chargeId;
        }

        await User.findByIdAndUpdate(userId, updateData);
      } catch (err) {
        console.error('Failed to process successful payment:', err);
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Webhook error:', err);
    return NextResponse.json({ ok: true });
  }
}
