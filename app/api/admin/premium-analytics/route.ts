import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { PremiumEvent, User } from '@/lib/models';
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
      .select('username telegramUsername premiumPlan premiumSince premiumExpiresAt')
      .sort({ premiumSince: -1 })
      .lean(),
  ]);

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

  // Conversion funnel
  const funnel = {
    pageViews: (countsMap['page_view'] || 0) + (countsMap['modal_open'] || 0),
    planClicks: countsMap['plan_click'] || 0,
    invoicesCreated: countsMap['invoice_created'] || 0,
    invoiceErrors: countsMap['invoice_error'] || 0,
    preCheckouts: countsMap['pre_checkout'] || 0,
    payments: countsMap['payment_success'] || 0,
    slotsFull: countsMap['slots_full'] || 0,
    alreadyPremium: countsMap['already_premium'] || 0,
  };

  return NextResponse.json({
    funnel,
    daily,
    plans,
    recentEvents,
    premiumUsers,
    period: days,
  });
}
