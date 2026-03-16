import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db/mongodb';
import { authenticateUser } from '@/lib/auth';
import { Bot, CampaignClick, Group, ManualRevenue, Post, PremiumEvent, Report, User } from '@/lib/models';

type TrendPoint = { date: string; value: number };

const STARS_PAID_EVENT = 'payment_success';
const PAY_BOT_TOKEN = process.env.TELEGRAM_PAYMENT_BOT_TOKEN || '';

// ── Stars helpers (mirrors stars-metrics/route.ts exactly) ────────────────────

type StarTx = {
  id: string;
  date: number;
  amount: number;
  source?: { transaction_type?: string };
};

async function fetchStarsTxs(): Promise<StarTx[]> {
  if (!PAY_BOT_TOKEN) return [];
  const all: StarTx[] = [];
  let offset = '0';
  for (let page = 0; page < 200; page++) {
    let raw: { ok?: boolean; result?: { transactions?: StarTx[]; next_offset?: string } };
    try {
      const res = await fetch(
        `https://api.telegram.org/bot${PAY_BOT_TOKEN}/getStarTransactions?offset=${encodeURIComponent(offset)}&limit=100`,
        { method: 'GET', cache: 'no-store' }
      );
      raw = await res.json();
    } catch {
      break;
    }
    if (!raw?.ok) break;
    const txs: StarTx[] = raw?.result?.transactions ?? [];
    all.push(...txs);
    const next = raw?.result?.next_offset;
    if (typeof next === 'string' && next.length && next !== offset) {
      offset = next;
      if (txs.length === 0) break;
      continue;
    }
    const n = Number(offset);
    if (Number.isFinite(n) && txs.length === 100) { offset = String(n + 100); continue; }
    break;
  }
  return all;
}

async function fetchStarsUsdRate(): Promise<number> {
  try {
    const res = await fetch('https://bes-dev.github.io/telegram_stars_rates/api.json', {
      method: 'GET', cache: 'no-store',
    });
    const d = await res.json();
    if (typeof d?.usdt_per_star === 'number' && Number.isFinite(d.usdt_per_star)) {
      return d.usdt_per_star;
    }
  } catch { /* fall through */ }
  return 0.015;
}

function dayKeyUTC(unixSeconds: number): string {
  const d = new Date(unixSeconds * 1000);
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${d.getUTCFullYear()}-${mm}-${dd}`;
}

// ─────────────────────────────────────────────────────────────────────────────

function utcDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getLastNDaysUtc(n: number): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i));
    out.push(utcDayKey(d));
  }
  return out;
}

function mergeTrend(days: string[], rows: Array<{ _id: string; count: number }>): TrendPoint[] {
  const counts = new Map<string, number>();
  for (const row of rows) counts.set(row._id, row.count || 0);
  return days.map((date) => ({ date, value: counts.get(date) || 0 }));
}

export async function GET(req: NextRequest) {
  const user = await authenticateUser(req);
  if (!user?.isAdmin) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  await connectDB();

  const now = new Date();
  const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const last30Days = getLastNDaysUtc(30);
  const since30dUtc = new Date(`${last30Days[0]}T00:00:00.000Z`);

  const dbPingStart = Date.now();
  if (mongoose.connection.db) {
    await mongoose.connection.db.admin().command({ ping: 1 });
  }
  const dbLatencyMs = Date.now() - dbPingStart;

  // Fetch Stars txs + rate in parallel with DB queries — same source as Premium section
  const [starsTxs, starsUsdRate] = await Promise.all([
    fetchStarsTxs(),
    fetchStarsUsdRate(),
  ]);

  // Earnings from actual invoice_payment Stars transactions (identical to stars-metrics)
  const todayKey = dayKeyUTC(Math.floor(now.getTime() / 1000));
  let starsLifetime = 0;
  let starsToday = 0;
  for (const tx of starsTxs) {
    if (tx?.source?.transaction_type !== 'invoice_payment') continue;
    const stars = Number(tx.amount || 0);
    starsLifetime += stars;
    if (dayKeyUTC(Number(tx.date || 0)) === todayKey) starsToday += stars;
  }
  const earningsLifetimeUsd = starsLifetime * starsUsdRate;
  const earningsTodayUsd = starsToday * starsUsdRate;
  const earningsSource = PAY_BOT_TOKEN ? 'stars_api' : 'unavailable';

  // Manual revenue (partner deals, affiliates, ad sales)
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const manualEntries = await ManualRevenue.find({}).select('amount paidAt').lean() as any[];
  let manualRevenueLifetime = 0;
  let manualRevenueThisMonth = 0;
  for (const e of manualEntries) {
    manualRevenueLifetime += e.amount || 0;
    if (new Date(e.paidAt) >= startOfMonth) manualRevenueThisMonth += e.amount || 0;
  }

  const [
    paidSubs24h,
    paidSubsLifetime,
    paidSubs30Rows,
    users24h,
    usersLifetime,
    users30Rows,
    groups24h,
    groupsLifetime,
    groups30Rows,
    adClicks24h,
    adClicksLifetime,
    adClicks30Rows,
    totalViewsLifetimeRows,
    views30Rows,
    pendingGroups,
    pendingBots,
    pendingReviews,
    pendingReports,
  ] = await Promise.all([
    PremiumEvent.countDocuments({ event: STARS_PAID_EVENT, createdAt: { $gte: since24h } }),
    PremiumEvent.countDocuments({ event: STARS_PAID_EVENT }),
    PremiumEvent.aggregate([
      { $match: { event: STARS_PAID_EVENT, createdAt: { $gte: since30dUtc } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'UTC' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),

    User.countDocuments({ createdAt: { $gte: since24h } }),
    User.countDocuments({}),
    User.aggregate([
      { $match: { createdAt: { $gte: since30dUtc } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'UTC' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),

    Group.countDocuments({ status: { $ne: 'deleted' }, createdAt: { $gte: since24h } }),
    Group.countDocuments({ status: { $ne: 'deleted' } }),
    Group.aggregate([
      { $match: { status: { $ne: 'deleted' }, createdAt: { $gte: since30dUtc } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'UTC' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),

    CampaignClick.countDocuments({ clickedAt: { $gte: since24h } }),
    CampaignClick.countDocuments({}),
    CampaignClick.aggregate([
      { $match: { clickedAt: { $gte: since30dUtc } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$clickedAt', timezone: 'UTC' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),

    Group.aggregate([
      { $match: { status: { $ne: 'deleted' } } },
      { $group: { _id: null, total: { $sum: '$views' } } },
    ]),
    Group.aggregate([
      { $match: { status: { $ne: 'deleted' } } },
      { $project: { viewsDay: { $objectToArray: '$viewsByDay' } } },
      { $unwind: '$viewsDay' },
      { $match: { 'viewsDay.k': { $gte: last30Days[0], $lte: last30Days[last30Days.length - 1] } } },
      { $group: { _id: '$viewsDay.k', count: { $sum: '$viewsDay.v' } } },
      { $sort: { _id: 1 } },
    ]),

    Group.countDocuments({ status: 'pending' }),
    Bot.countDocuments({ status: 'pending' }),
    Post.countDocuments({ status: 'pending' }),
    Report.countDocuments({ status: 'pending' }),
  ]);

  const totalViewsLifetime = Number(totalViewsLifetimeRows?.[0]?.total || 0);

  const monitoringAlerts: Array<{
    level: 'critical' | 'warning' | 'info' | 'ok';
    title: string;
    description: string;
    actionUrl?: string;
  }> = [];

  const publicChannel = (process.env.TELEGRAM_CHANNEL_ID || '').trim();
  const plusChannel = (process.env.EROGRAM_PLUS_CHANNEL_ID || '').trim();

  if (!process.env.MONGODB_URI) {
    monitoringAlerts.push({
      level: 'critical',
      title: 'Database config missing',
      description: 'MONGODB_URI is not configured.',
      actionUrl: '/admin/settings',
    });
  }

  if (publicChannel && plusChannel && publicChannel === plusChannel) {
    monitoringAlerts.push({
      level: 'critical',
      title: 'Premium leak risk detected',
      description: 'Public and Premium Telegram channel IDs are identical.',
      actionUrl: '/admin/settings',
    });
  }

  const pendingTotal = pendingGroups + pendingBots + pendingReviews + pendingReports;
  if (pendingTotal >= 80) {
    monitoringAlerts.push({
      level: 'critical',
      title: 'Moderation backlog is high',
      description: `${pendingTotal} items are waiting moderation.`,
      actionUrl: '/admin/pending-groups',
    });
  } else if (pendingTotal >= 30) {
    monitoringAlerts.push({
      level: 'warning',
      title: 'Moderation backlog growing',
      description: `${pendingTotal} items are waiting moderation.`,
      actionUrl: '/admin/pending-groups',
    });
  }

  if (dbLatencyMs > 800) {
    monitoringAlerts.push({
      level: 'warning',
      title: 'Database latency elevated',
      description: `Current DB ping is ${dbLatencyMs}ms.`,
    });
  }

  if (paidSubs24h === 0) {
    monitoringAlerts.push({
      level: 'info',
      title: 'No premium payments in last 24h',
      description: 'Review premium funnel and checkout flow.',
      actionUrl: '/admin/premium',
    });
  }

  if (adClicks24h === 0) {
    monitoringAlerts.push({
      level: 'info',
      title: 'No ad clicks in last 24h',
      description: 'Check active campaigns and ad placement.',
      actionUrl: '/admin/adverts',
    });
  }

  if (monitoringAlerts.length === 0) {
    monitoringAlerts.push({
      level: 'ok',
      title: 'All systems look healthy',
      description: 'No urgent issues detected right now.',
    });
  }

  return NextResponse.json({
    generatedAt: now.toISOString(),
    headline: {
      totalPageviewsLifetime: totalViewsLifetime,
      earningsTodayUsd,
      earningsLifetimeUsd,
      starsLifetime,
      starsUsdRate,
      earningsSource,
      manualRevenueLifetime,
      manualRevenueThisMonth,
      totalEarningsLifetimeUsd: earningsLifetimeUsd + manualRevenueLifetime,
      totalEarningsThisMonthUsd: earningsTodayUsd + manualRevenueThisMonth,
    },
    kpis: {
      paidSubs: {
        last24h: paidSubs24h,
        lifetime: paidSubsLifetime,
        trend30d: mergeTrend(last30Days, paidSubs30Rows as Array<{ _id: string; count: number }>),
      },
      newUsers: {
        last24h: users24h,
        lifetime: usersLifetime,
        trend30d: mergeTrend(last30Days, users30Rows as Array<{ _id: string; count: number }>),
      },
      newGroups: {
        last24h: groups24h,
        lifetime: groupsLifetime,
        trend30d: mergeTrend(last30Days, groups30Rows as Array<{ _id: string; count: number }>),
      },
      adClicks: {
        last24h: adClicks24h,
        lifetime: adClicksLifetime,
        trend30d: mergeTrend(last30Days, adClicks30Rows as Array<{ _id: string; count: number }>),
      },
      totalViews: {
        lifetime: totalViewsLifetime,
        trend30d: mergeTrend(last30Days, views30Rows as Array<{ _id: string; count: number }>),
      },
    },
    pending: {
      groups: pendingGroups,
      bots: pendingBots,
      reviews: pendingReviews,
      reports: pendingReports,
      total: pendingTotal,
    },
    monitoring: {
      dbLatencyMs,
      alerts: monitoringAlerts,
    },
  });
}
