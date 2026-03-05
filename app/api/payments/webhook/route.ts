import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { User, PremiumEvent } from '@/lib/models';
import { MAX_PREMIUM_SLOTS } from '@/lib/auth';

function logEvent(data: Record<string, any>) {
  PremiumEvent.create({ source: 'server', ...data }).catch(() => {});
}

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

async function sendMessage(chatId: number | string, text: string) {
  if (!BOT_TOKEN) return;
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
    }),
  });
}

async function getStarTransactions(limit: number) {
  const l = Math.min(Math.max(limit, 1), 20);
  const res = await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/getStarTransactions?offset=0&limit=${l}`,
    { method: 'GET' }
  );
  return await res.json();
}

const VALID_PLANS = new Set(['monthly', 'yearly', 'lifetime']);

export async function POST(req: NextRequest) {
  try {
    // Always require webhook secret — refuse everything if not configured
    if (!WEBHOOK_SECRET) {
      console.error('TELEGRAM_WEBHOOK_SECRET not set — blocking all webhook requests');
      return NextResponse.json({ ok: false }, { status: 503 });
    }

    const secret = req.headers.get('x-telegram-bot-api-secret-token');
    if (secret !== WEBHOOK_SECRET) {
      return NextResponse.json({ ok: false }, { status: 403 });
    }

    const update = await req.json();

    // Basic /start handler so the bot "responds" in chat.
    // Payments are handled below via pre_checkout_query + successful_payment updates.
    if (update.message?.text && !update.message?.successful_payment) {
      const text = String(update.message.text || '').trim();
      const chatId = update.message.chat?.id;

      if (text === '/start' || text.startsWith('/start ')) {
        if (chatId !== undefined && chatId !== null) {
          await sendMessage(
            chatId,
            [
              'This bot is used for Erogram Premium payments via Telegram Stars.',
              '',
              'If you are trying to buy Premium: open the Premium page on the website and choose a plan.',
              '',
              'If you are trying to find Stars earnings: they are NOT added to your personal Stars balance. They belong to the bot revenue balance and may be hidden by Telegram UI in some regions/accounts.',
              '',
              'Commands:',
              '/transactions - show last 5 Stars payments to this bot',
            ].join('\n')
          );
        }
        return NextResponse.json({ ok: true });
      }

      if ((text === '/transactions' || text.startsWith('/transactions ')) && chatId !== undefined && chatId !== null) {
        const parts = text.split(/\s+/).filter(Boolean);
        const limit = Number(parts[1] || 5);
        const tg = await getStarTransactions(Number.isFinite(limit) ? limit : 5);
        if (!tg?.ok) {
          await sendMessage(chatId, 'Failed to fetch transactions from Telegram right now.');
          return NextResponse.json({ ok: true });
        }
        const txs = tg?.result?.transactions || [];
        if (!Array.isArray(txs) || txs.length === 0) {
          await sendMessage(chatId, 'No Stars transactions found for this bot yet.');
          return NextResponse.json({ ok: true });
        }
        const lines = txs.slice(0, 10).map((t: any) => {
          const when = t?.date ? new Date(Number(t.date) * 1000).toISOString().slice(0, 16).replace('T', ' ') : '—';
          const amount = Number(t?.amount || 0);
          const fromId = t?.source?.user?.id ? `user:${t.source.user.id}` : 'user:—';
          return `${when}  +${amount}★  ${fromId}`;
        });
        await sendMessage(chatId, `Latest Stars transactions:\n\n${lines.join('\n')}`);
        return NextResponse.json({ ok: true });
      }
    }

    if (update.pre_checkout_query) {
      const query = update.pre_checkout_query;
      try {
        const payload = JSON.parse(query.invoice_payload);
        if (!payload.userId || !payload.plan || !VALID_PLANS.has(payload.plan)) {
          await answerPreCheckoutQuery(query.id, false, 'Invalid payment data');
          return NextResponse.json({ ok: true });
        }

        await connectDB();

        const user = await User.findById(payload.userId).lean() as any;
        if (!user) {
          await answerPreCheckoutQuery(query.id, false, 'User not found');
          return NextResponse.json({ ok: true });
        }

        if (user.premium && (!user.premiumExpiresAt || new Date(user.premiumExpiresAt) > new Date())) {
          await answerPreCheckoutQuery(query.id, false, 'You are already a Premium member');
          return NextResponse.json({ ok: true });
        }

        const taken = await User.countDocuments({
          premium: true,
          $or: [{ premiumExpiresAt: null }, { premiumExpiresAt: { $gt: new Date() } }],
        });
        if (taken >= MAX_PREMIUM_SLOTS) {
          await answerPreCheckoutQuery(query.id, false, 'All Premium spots are taken');
          return NextResponse.json({ ok: true });
        }

        logEvent({ event: 'pre_checkout', userId: payload.userId, plan: payload.plan });
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

        if (!userId || !plan || !VALID_PLANS.has(plan)) {
          console.error('Webhook received invalid payload:', payload);
          return NextResponse.json({ ok: true });
        }

        await connectDB();

        const user = await User.findById(userId).lean() as any;
        if (!user) {
          console.error('Webhook payment for non-existent user:', userId);
          return NextResponse.json({ ok: true });
        }

        const chargeId = payment.provider_payment_charge_id || payment.telegram_payment_charge_id;
        if (!chargeId) {
          console.error('Webhook payment missing charge ID');
          return NextResponse.json({ ok: true });
        }

        const existing = await User.findOne({ lastPaymentChargeId: chargeId }).lean();
        if (existing) {
          return NextResponse.json({ ok: true });
        }

        const now = new Date();
        const updateData: Record<string, any> = {
          premium: true,
          premiumPlan: plan,
          premiumSince: now,
          lastPaymentChargeId: chargeId,
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

        await User.findByIdAndUpdate(userId, updateData);
        logEvent({ event: 'payment_success', userId, plan, chargeId });
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
