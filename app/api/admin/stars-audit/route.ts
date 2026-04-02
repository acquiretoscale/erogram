import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { PremiumEvent, User } from '@/lib/models';
import { authenticateUser } from '@/lib/auth';

const BOT_TOKEN = process.env.TELEGRAM_PAYMENT_BOT_TOKEN || '';

type TelegramStarTx = {
  id: string;
  date: number;
  amount: number;
  source?: {
    transaction_type?: string;
    type?: string;
    user?: { id?: number; first_name?: string; last_name?: string; username?: string };
    invoice_payload?: string;
  };
};

type NormalizedTx = {
  id: string;
  date: number;
  amount: number;
  transactionType: string | null;
  fromUser: { id: number | null; username: string | null; firstName: string | null; lastName: string | null } | null;
  invoicePayload: string | null;
  parsedPayload: any;
};

const VALID_PLANS = new Set(['monthly', 'quarterly', 'yearly']);

function safeJsonParse(s: unknown) {
  if (typeof s !== 'string' || !s.length) return null;
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function normalizeTx(t: TelegramStarTx): NormalizedTx {
  const invoicePayload = t?.source?.invoice_payload || null;
  const parsedPayload = safeJsonParse(invoicePayload);
  return {
    id: t.id,
    date: t.date,
    amount: t.amount,
    transactionType: t?.source?.transaction_type || null,
    fromUser: t?.source?.user
      ? {
          id: t.source.user.id || null,
          username: t.source.user.username || null,
          firstName: t.source.user.first_name || null,
          lastName: t.source.user.last_name || null,
        }
      : null,
    invoicePayload,
    parsedPayload,
  };
}

async function fetchTransactionsAll(maxPages: number, pageSize: number) {
  let offset: string = '0';
  const out: NormalizedTx[] = [];

  for (let page = 0; page < maxPages; page++) {
    const tgRes = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/getStarTransactions?offset=${encodeURIComponent(
        offset
      )}&limit=${pageSize}`,
      { method: 'GET' }
    );
    const raw = await tgRes.json();
    if (!raw?.ok) {
      const err = new Error('Telegram getStarTransactions failed');
      (err as any).telegram = raw;
      throw err;
    }

    const txs: TelegramStarTx[] = raw?.result?.transactions || [];
    for (const t of txs) out.push(normalizeTx(t));

    const nextOffset = raw?.result?.next_offset;
    if (typeof nextOffset === 'string' && nextOffset.length && nextOffset !== offset) {
      offset = nextOffset;
      if (txs.length === 0) break;
      continue;
    }

    // Fallback pagination: offset behaves like an index in some Bot API responses
    const numericOffset = Number(offset);
    if (Number.isFinite(numericOffset) && txs.length === pageSize) {
      offset = String(numericOffset + pageSize);
      continue;
    }

    break;
  }

  return out;
}

export async function GET(req: NextRequest) {
  const user = await authenticateUser(req);
  if (!user?.isAdmin) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  if (!BOT_TOKEN) {
    return NextResponse.json({ message: 'TELEGRAM_PAYMENT_BOT_TOKEN is not set' }, { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const days = Math.min(Math.max(Number(searchParams.get('days') || 365), 1), 3650);
  const maxPages = Math.min(Math.max(Number(searchParams.get('maxPages') || 30), 1), 200);

  try {
    const all = await fetchTransactionsAll(maxPages, 100);

    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceTs = Math.floor(since.getTime() / 1000);
    const txs = all.filter((t) => Number(t.date || 0) >= sinceTs);

    const totalStars = txs.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const invoicePayments = txs.filter((t) => t.transactionType === 'invoice_payment');

    // Extract {userId, plan} from invoice payloads (if present)
    const payloadRows = invoicePayments
      .map((t) => {
        const userId = t?.parsedPayload?.userId;
        const plan = t?.parsedPayload?.plan;
        if (typeof userId !== 'string' || !userId.length) return null;
        if (typeof plan !== 'string' || !VALID_PLANS.has(plan)) return null;
        return { tx: t, userId, plan };
      })
      .filter(Boolean) as Array<{ tx: NormalizedTx; userId: string; plan: string }>;

    const userIds = Array.from(new Set(payloadRows.map((r) => r.userId)));

    await connectDB();

    const [users, paymentEvents] = await Promise.all([
      User.find({ _id: { $in: userIds } })
        .select('username telegramUsername premium premiumPlan premiumSince premiumExpiresAt lastPaymentChargeId')
        .lean(),
      PremiumEvent.find({ event: 'payment_success', userId: { $in: userIds } })
        .select('userId plan createdAt chargeId')
        .lean(),
    ]);

    const userById = new Map<string, any>();
    for (const u of users as any[]) userById.set(String(u._id), u);

    const eventsByUserPlan = new Map<string, Date[]>();
    for (const ev of paymentEvents as any[]) {
      const key = `${String(ev.userId)}::${String(ev.plan || '')}`;
      const arr = eventsByUserPlan.get(key) || [];
      arr.push(new Date(ev.createdAt));
      eventsByUserPlan.set(key, arr);
    }

    function hasNearbyEvent(userId: string, plan: string, txDateSec: number) {
      const key = `${userId}::${plan}`;
      const evs = eventsByUserPlan.get(key) || [];
      if (evs.length === 0) return false;
      const txMs = txDateSec * 1000;
      const windowMs = 48 * 60 * 60 * 1000; // 48h safety window
      return evs.some((d) => Math.abs(d.getTime() - txMs) <= windowMs);
    }

    const paidButNotProcessed = payloadRows
      .map((r) => {
        const u = userById.get(r.userId) || null;
        const isPremium = u?.premium === true && (!u.premiumExpiresAt || new Date(u.premiumExpiresAt) > new Date());
        const premiumPlan = u?.premiumPlan || null;
        const premiumSince = u?.premiumSince ? new Date(u.premiumSince) : null;
        const txWhen = new Date(r.tx.date * 1000);

        const hasEvent = hasNearbyEvent(r.userId, r.plan, r.tx.date);
        const premiumLooksLikeThisPurchase =
          isPremium &&
          premiumPlan === r.plan &&
          premiumSince &&
          Math.abs(premiumSince.getTime() - txWhen.getTime()) <= 48 * 60 * 60 * 1000;

        const ok = hasEvent || premiumLooksLikeThisPurchase;

        return {
          ok,
          tx: {
            id: r.tx.id,
            date: r.tx.date,
            amount: r.tx.amount,
            fromUser: r.tx.fromUser,
          },
          payload: { userId: r.userId, plan: r.plan },
          user: u
            ? {
                id: String(u._id),
                username: u.username,
                telegramUsername: u.telegramUsername || null,
                premium: isPremium,
                premiumPlan: premiumPlan,
                premiumSince: u.premiumSince || null,
                premiumExpiresAt: u.premiumExpiresAt || null,
              }
            : null,
          matched: { hasPaymentEvent: hasEvent, premiumLooksLikeThisPurchase },
        };
      })
      .filter((r) => !r.ok);

    return NextResponse.json({
      ok: true,
      periodDays: days,
      totals: {
        allTransactions: txs.length,
        invoicePayments: invoicePayments.length,
        withValidPayload: payloadRows.length,
        totalStars,
      },
      issues: {
        paidButNotProcessedCount: paidButNotProcessed.length,
        paidButNotProcessed,
      },
      note:
        'This compares Telegram Stars invoice transactions to DB state. If paid-but-not-processed > 0, those are likely purchases that happened while webhook/processing was misconfigured.',
    });
  } catch (err: any) {
    console.error('Admin stars-audit error:', err);
    return NextResponse.json(
      {
        message: 'Failed to audit Stars transactions',
        telegram: err?.telegram || undefined,
      },
      { status: 500 }
    );
  }
}

