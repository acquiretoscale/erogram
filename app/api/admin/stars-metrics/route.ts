import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/auth';
import connectDB from '@/lib/db/mongodb';
import { StarsRate, Bookmark, BookmarkFolder, User } from '@/lib/models';
import mongoose from 'mongoose';

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

function safeJsonParse(s: unknown) {
  if (typeof s !== 'string' || !s.length) return null;
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

async function fetchTransactionsAll(maxPages: number, pageSize: number) {
  let offset: string = '0';
  const out: TelegramStarTx[] = [];

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
    out.push(...txs);

    const nextOffset = raw?.result?.next_offset;
    if (typeof nextOffset === 'string' && nextOffset.length && nextOffset !== offset) {
      offset = nextOffset;
      if (txs.length === 0) break;
      continue;
    }

    const numericOffset = Number(offset);
    if (Number.isFinite(numericOffset) && txs.length === pageSize) {
      offset = String(numericOffset + pageSize);
      continue;
    }

    break;
  }

  return out;
}

function dayKeyUTC(unixSeconds: number) {
  const d = new Date(unixSeconds * 1000);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

type RateApi = {
  usdt_per_star: number;
  ton_per_star?: number;
  usdt_per_ton?: number;
  timestamp?: string;
};

async function fetchStarsUsdRate() {
  const res = await fetch('https://bes-dev.github.io/telegram_stars_rates/api.json', {
    method: 'GET',
    cache: 'no-store',
  });
  const data = (await res.json()) as RateApi;
  if (!data || typeof data.usdt_per_star !== 'number' || !Number.isFinite(data.usdt_per_star)) {
    throw new Error('Invalid Stars rate response');
  }
  return data;
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
  const days = Math.min(Math.max(Number(searchParams.get('days') || 30), 1), 3650);
  const maxPages = Math.min(Math.max(Number(searchParams.get('maxPages') || 30), 1), 200);

  try {
    await connectDB();

    // Fetch latest Stars→USD(USDT) rate and store one value per UTC day.
    const rate = await fetchStarsUsdRate();
    const nowSec = Math.floor(Date.now() / 1000);
    const today = dayKeyUTC(nowSec);
    await StarsRate.findOneAndUpdate(
      { date: today },
      {
        date: today,
        usdtPerStar: rate.usdt_per_star,
        tonPerStar: typeof rate.ton_per_star === 'number' ? rate.ton_per_star : null,
        usdtPerTon: typeof rate.usdt_per_ton === 'number' ? rate.usdt_per_ton : null,
        source: 'telegram_stars_rates',
        fetchedAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const all = await fetchTransactionsAll(maxPages, 100);
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - days);
    const sinceTs = Math.floor(since.getTime() / 1000);

    const txs = all
      .filter((t) => Number(t?.date || 0) >= sinceTs)
      .sort((a, b) => Number(b.date || 0) - Number(a.date || 0));

    const dayMap = new Map<string, { date: string; stars: number; payments: number }>();
    for (const t of txs) {
      const k = dayKeyUTC(Number(t.date || 0));
      const row = dayMap.get(k) || { date: k, stars: 0, payments: 0 };
      row.stars += Number(t.amount || 0);
      if (t?.source?.transaction_type === 'invoice_payment') row.payments += 1;
      dayMap.set(k, row);
    }

    const dailyBase = Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    const dayKeys = dailyBase.map((d) => d.date);

    const storedRates = await StarsRate.find({ date: { $in: dayKeys } })
      .select('date usdtPerStar')
      .lean();
    const rateByDay = new Map<string, number>();
    for (const r of storedRates as any[]) {
      if (typeof r?.date === 'string' && typeof r?.usdtPerStar === 'number') {
        rateByDay.set(r.date, r.usdtPerStar);
      }
    }

    const daily = dailyBase.map((d) => {
      // If we didn't store that day's rate yet (older days), fall back to today's rate.
      const usdtPerStar = rateByDay.get(d.date) ?? rate.usdt_per_star;
      const usd = d.stars * usdtPerStar;
      return { ...d, usd, usdtPerStar };
    });

    const totalStars = txs.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const payments = txs.filter((t) => t?.source?.transaction_type === 'invoice_payment').length;
    const avgStarsPerPayment = payments > 0 ? totalStars / payments : 0;
    const avgStarsPerDay = days > 0 ? totalStars / days : 0;
    const totalUsd = daily.reduce((sum, d) => sum + (Number(d.usd) || 0), 0);
    const avgUsdPerDay = days > 0 ? totalUsd / days : 0;
    const avgUsdPerPayment = payments > 0 ? totalUsd / payments : 0;

    const buyerTxs = txs
      .filter((t) => t?.source?.transaction_type === 'invoice_payment')
      .slice(0, 200);

    // Collect valid siteUserIds so we can join DB data
    const siteUserIds = buyerTxs
      .map((t) => safeJsonParse(t?.source?.invoice_payload)?.userId)
      .filter((id): id is string => typeof id === 'string' && mongoose.isValidObjectId(id));
    const uniqueUserIds = Array.from(new Set(siteUserIds));

    const [dbUsers, bkCounts, folderCounts] = await Promise.all([
      User.find({ _id: { $in: uniqueUserIds } })
        .select('username telegramUsername firstName lastName telegramId premiumPlan premiumExpiresAt')
        .lean(),
      Bookmark.aggregate([
        { $match: { userId: { $in: uniqueUserIds.map((id) => new mongoose.Types.ObjectId(id)) } } },
        { $group: { _id: '$userId', count: { $sum: 1 } } },
      ]),
      BookmarkFolder.aggregate([
        { $match: { userId: { $in: uniqueUserIds.map((id) => new mongoose.Types.ObjectId(id)) } } },
        { $group: { _id: '$userId', count: { $sum: 1 } } },
      ]),
    ]);

    const dbUserById = new Map<string, any>();
    for (const u of dbUsers as any[]) dbUserById.set(String(u._id), u);

    const bkByUser = new Map<string, number>();
    for (const r of bkCounts) bkByUser.set(String(r._id), r.count);

    const folderByUser = new Map<string, number>();
    for (const r of folderCounts) folderByUser.set(String(r._id), r.count);

    const buyers = buyerTxs.map((t) => {
      const invoicePayload = t?.source?.invoice_payload || null;
      const parsed = safeJsonParse(invoicePayload);
      const whenDay = dayKeyUTC(Number(t.date || 0));
      const usdtPerStar = rateByDay.get(whenDay) ?? rate.usdt_per_star;
      const usd = Number(t.amount || 0) * usdtPerStar;
      const siteUserId: string | null = parsed?.userId || null;
      const dbUser = siteUserId ? dbUserById.get(siteUserId) : null;

      const nameParts = dbUser ? [dbUser.firstName, dbUser.lastName].filter(Boolean).join(' ') : null;
      const expiresAt = dbUser?.premiumExpiresAt ? new Date(dbUser.premiumExpiresAt) : null;
      const daysLeft = expiresAt ? Math.ceil((expiresAt.getTime() - Date.now()) / 86_400_000) : null;

      return {
        txId: t.id,
        date: t.date,
        amount: Number(t.amount || 0),
        usd,
        // Telegram identity (from Stars invoice)
        fromUser: t?.source?.user
          ? {
              id: t.source.user.id || null,
              username: t.source.user.username || null,
              firstName: t.source.user.first_name || null,
              lastName: t.source.user.last_name || null,
            }
          : null,
        plan: parsed?.plan || null,
        siteUserId,
        // DB-enriched fields
        siteUsername: dbUser?.username || null,
        displayName: nameParts || null,
        telegramUsername: dbUser?.telegramUsername || null,
        telegramId: dbUser?.telegramId || null,
        premiumPlan: dbUser?.premiumPlan || null,
        daysLeft,
        bookmarks: siteUserId ? (bkByUser.get(siteUserId) ?? 0) : 0,
        folders: siteUserId ? (folderByUser.get(siteUserId) ?? 0) : 0,
      };
    });

    return NextResponse.json({
      ok: true,
      periodDays: days,
      totals: {
        totalStars,
        payments,
        avgStarsPerPayment,
        avgStarsPerDay,
        totalUsd,
        avgUsdPerDay,
        avgUsdPerPayment,
        usdtPerStarCurrent: rate.usdt_per_star,
      },
      daily,
      buyers,
    });
  } catch (err: any) {
    console.error('Admin stars-metrics error:', err);
    return NextResponse.json(
      { message: 'Failed to load Stars metrics', telegram: err?.telegram || undefined },
      { status: 500 }
    );
  }
}

