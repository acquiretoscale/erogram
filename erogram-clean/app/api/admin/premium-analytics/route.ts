import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { PremiumEvent, User, Bookmark, BookmarkFolder } from '@/lib/models';
import { authenticateUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = await authenticateUser(req);
  if (!user?.isAdmin) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  await connectDB();

  const { searchParams } = new URL(req.url);
  const days = parseInt(searchParams.get('days') || '30', 10);
  const since = new Date();
  since.setDate(since.getDate() - days);

  const [
    eventCounts,
    dailyBreakdown,
    planBreakdown,
    recentEvents,
    premiumUsers,
  ] = await Promise.all([
    // Aggregate counts per event type
    PremiumEvent.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: '$event', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),

    // Daily event counts for chart
    PremiumEvent.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            event: '$event',
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.date': 1 } },
    ]),

    // Plan click breakdown
    PremiumEvent.aggregate([
      { $match: { createdAt: { $gte: since }, event: 'plan_click', plan: { $ne: null } } },
      { $group: { _id: '$plan', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),

    // Recent events (last 50)
    PremiumEvent.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .lean(),

    // Current premium users
    User.find({
      premium: true,
      $or: [{ premiumExpiresAt: null }, { premiumExpiresAt: { $gt: new Date() } }],
    })
      .select('username telegramUsername firstName lastName telegramId premiumPlan premiumSince premiumExpiresAt paymentMethod lastPaymentChargeId')
      .sort({ premiumSince: -1 })
      .lean(),
  ]);

  // Collect user IDs so we can fetch bookmark/folder counts in one aggregation each
  const premiumUserIds = (premiumUsers as any[]).map((u: any) => u._id);

  const [bookmarkCounts, folderCounts] = await Promise.all([
    Bookmark.aggregate([
      { $match: { userId: { $in: premiumUserIds } } },
      { $group: { _id: '$userId', count: { $sum: 1 } } },
    ]),
    BookmarkFolder.aggregate([
      { $match: { userId: { $in: premiumUserIds } } },
      { $group: { _id: '$userId', count: { $sum: 1 } } },
    ]),
  ]);

  const bookmarksByUser = new Map<string, number>();
  for (const row of bookmarkCounts) bookmarksByUser.set(String(row._id), row.count);

  const foldersByUser = new Map<string, number>();
  for (const row of folderCounts) foldersByUser.set(String(row._id), row.count);

  const countsMap: Record<string, number> = {};
  for (const e of eventCounts) {
    countsMap[e._id] = e.count;
  }

  // Build daily data as { date, page_view, plan_click, ... }
  const dailyMap: Record<string, Record<string, number>> = {};
  for (const row of dailyBreakdown) {
    const d = row._id.date;
    if (!dailyMap[d]) dailyMap[d] = {};
    dailyMap[d][row._id.event] = row.count;
  }
  const daily = Object.entries(dailyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, events]) => ({ date, ...events }));

  const plans: Record<string, number> = {};
  for (const p of planBreakdown) {
    plans[p._id] = p.count;
  }

  // Conversion funnel (combined + per-method)
  const funnel = {
    pageViews: (countsMap['page_view'] || 0) + (countsMap['modal_open'] || 0),
    planClicks: (countsMap['plan_click'] || 0) + (countsMap['crypto_plan_click'] || 0),
    invoicesCreated: (countsMap['invoice_created'] || 0) + (countsMap['crypto_invoice_created'] || 0),
    invoiceErrors: (countsMap['invoice_error'] || 0) + (countsMap['crypto_invoice_error'] || 0),
    preCheckouts: countsMap['pre_checkout'] || 0,
    payments: (countsMap['payment_success'] || 0) + (countsMap['crypto_payment_success'] || 0),
    slotsFull: countsMap['slots_full'] || 0,
    alreadyPremium: countsMap['already_premium'] || 0,
    // Per-method breakdown
    starsPlanClicks: countsMap['plan_click'] || 0,
    starsInvoices: countsMap['invoice_created'] || 0,
    starsPayments: countsMap['payment_success'] || 0,
    cryptoPlanClicks: countsMap['crypto_plan_click'] || 0,
    cryptoInvoices: countsMap['crypto_invoice_created'] || 0,
    cryptoPayments: countsMap['crypto_payment_success'] || 0,
  };

  const premiumUsersWithUsage = (premiumUsers as any[]).map((u: any) => {
    const uid = String(u._id);
    const expiresAt = u.premiumExpiresAt ? new Date(u.premiumExpiresAt) : null;
    const msLeft = expiresAt ? expiresAt.getTime() - Date.now() : null;
    const daysLeft = msLeft !== null ? Math.ceil(msLeft / 86_400_000) : null;
    const nameParts = [u.firstName, u.lastName].filter(Boolean).join(' ');
    return {
      _id: uid,
      username: u.username,
      displayName: nameParts || null,
      telegramUsername: u.telegramUsername || null,
      telegramId: u.telegramId || null,
      premiumPlan: u.premiumPlan || null,
      premiumSince: u.premiumSince || null,
      premiumExpiresAt: u.premiumExpiresAt || null,
      paymentMethod: u.paymentMethod || null,
      daysLeft,
      isExpiringSoon: daysLeft !== null && daysLeft <= 7,
      bookmarks: bookmarksByUser.get(uid) ?? 0,
      folders: foldersByUser.get(uid) ?? 0,
    };
  });

  return NextResponse.json({
    funnel,
    daily,
    plans,
    recentEvents,
    premiumUsers: premiumUsersWithUsage,
    period: days,
  });
}
