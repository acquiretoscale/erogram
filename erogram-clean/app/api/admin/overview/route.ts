import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import {
  User,
  Group,
  Bot,
  Post,
  Report,
  PremiumEvent,
  PremiumConfig,
  CampaignClick,
  ManualRevenue,
  StarsRate,
  Bookmark,
  BookmarkFolder,
} from '@/lib/models';

export const dynamic = 'force-dynamic';

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';

async function authenticateAdmin(token: string) {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    await connectDB();
    const user = await User.findById(decoded.id).lean();
    if (user && (user as any).isAdmin) return user;
  } catch {
    return null;
  }
  return null;
}

function fmtDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function buildTrend(raw: { _id: string; value: number }[], days = 30) {
  const map = new Map(raw.map((r) => [r._id, r.value]));
  const result: { date: string; value: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    result.push({ date: fmtDateKey(d), value: map.get(fmtDateKey(d)) || 0 });
  }
  return result;
}

export async function GET(req: NextRequest) {
  const start = Date.now();
  try {
    const auth = req.headers.get('authorization');
    if (!auth?.startsWith('Bearer ')) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const admin = await authenticateAdmin(auth.replace('Bearer ', ''));
    if (!admin) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    await connectDB();

    const now       = new Date();
    const _24h      = new Date(now.getTime() - 86400000);
    const _30d      = new Date(); _30d.setDate(_30d.getDate() - 30); _30d.setHours(0,0,0,0);
    const _30dStr   = fmtDateKey(_30d);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      pendingGroups, pendingBots, pendingReviews, pendingReports,
      totalAdClicks, adClicks24h,
      totalUsers, totalPageviews,
      // All premium users (the source of truth)
      allPremiumUsers,
      // All PremiumEvent payment_success (for cross-referencing timing)
      allPaymentEvents,
      // All paid groups & bots
      allPaidGroups, allPaidBots,
      // Trends
      subsTrend30d, adClicksTrend30d, trafficTrend30d, newUsersTrend30d, usersByCountry30d,
      // Config & rates
      latestRate, premiumConfig,
      // Manual revenue by advertiser
      manualByAdvertiser,
      manualTotal,
      manualThisMonth,
      totalBookmarks, totalBookmarkFolders,
    ] = await Promise.all([
      Group.countDocuments({ status: 'pending' }),
      Bot.countDocuments({ status: 'pending' }),
      Post.countDocuments({ status: 'pending' }),
      Report.countDocuments({ status: 'pending' }),
      CampaignClick.countDocuments(),
      CampaignClick.countDocuments({ clickedAt: { $gte: _24h } }),
      User.countDocuments(),
      Group.aggregate([{ $group: { _id: null, total: { $sum: '$views' } } }]),

      // ALL users who are or were premium
      User.find({ $or: [{ premium: true }, { premiumSince: { $ne: null } }] })
        .sort({ premiumSince: -1 })
        .select('username firstName country city photoUrl telegramUsername premium premiumPlan premiumSince premiumExpiresAt paymentMethod')
        .lean(),

      // All payment events (for date cross-reference)
      PremiumEvent.find({ event: { $in: ['payment_success', 'crypto_payment_success'] } })
        .sort({ createdAt: -1 })
        .select('userId plan paymentMethod createdAt')
        .lean(),

      // All paid groups
      Group.find({ paidBoost: true })
        .sort({ createdAt: -1 })
        .select('name paidBoostStars createdBy createdByUsername createdAt')
        .populate('createdBy', 'username firstName country city photoUrl telegramUsername')
        .lean(),

      // All paid bots
      Bot.find({ paidBoost: true })
        .sort({ createdAt: -1 })
        .select('name paidBoostStars createdBy createdByUsername createdAt')
        .populate('createdBy', 'username firstName country city photoUrl telegramUsername')
        .lean(),

      // Paid subs trend 30d
      PremiumEvent.aggregate([
        { $match: { event: { $in: ['payment_success', 'crypto_payment_success'] }, createdAt: { $gte: _30d } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, value: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      // Ad clicks trend 30d
      CampaignClick.aggregate([
        { $match: { clickedAt: { $gte: _30d } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$clickedAt' } }, value: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      // Traffic trend 30d
      Group.aggregate([
        { $match: { status: 'approved' } },
        { $project: { vbd: { $objectToArray: '$viewsByDay' } } },
        { $unwind: '$vbd' },
        { $match: { 'vbd.k': { $gte: _30dStr } } },
        { $group: { _id: '$vbd.k', value: { $sum: '$vbd.v' } } },
        { $sort: { _id: 1 } },
      ]),

      // All new user registrations per day (30d)
      User.aggregate([
        { $match: { createdAt: { $gte: _30d } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, value: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      // Users by country (last 30d, top 20)
      User.aggregate([
        { $match: { createdAt: { $gte: _30d }, country: { $ne: null } } },
        { $group: { _id: '$country', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),

      StarsRate.findOne().sort({ fetchedAt: -1 }).lean(),
      PremiumConfig.findOne({ key: 'default' }).lean(),

      // Manual revenue grouped by clientName (each advertiser)
      ManualRevenue.aggregate([
        { $group: { _id: '$clientName', total: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { total: -1 } },
      ]),
      ManualRevenue.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]),
      // Manual revenue this month
      ManualRevenue.aggregate([
        { $match: { paidAt: { $gte: monthStart } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Bookmark.countDocuments(),
      BookmarkFolder.countDocuments(),
    ]);

    const starsUsdRate = (latestRate as any)?.usdtPerStar || 0;
    const rate = starsUsdRate || 0.013;
    const totalPageviewsLifetime = totalPageviews[0]?.total || 0;
    const manualLifetime  = manualTotal[0]?.total || 0;
    const manualThisMonthUsd = (manualThisMonth as any)[0]?.total || 0;

    const cfg = premiumConfig as any;
    // Stars = actual Stars the user paid (from PremiumConfig)
    // USD   = actual fiat price charged (from PremiumConfig)
    // These are NEVER derived from each other — they are independent values.
    const planStars: Record<string, number> = {
      monthly:   cfg?.monthly?.starsAmount   || 865,
      quarterly: cfg?.quarterly?.starsAmount  || 1332,
      yearly:    cfg?.yearly?.starsAmount     || 1934,
      lifetime:  0, // lifetime plans are typically gifted / manually activated
    };
    const planUsd: Record<string, number> = {
      monthly:   cfg?.monthly?.priceUsd   || 12.97,
      quarterly: cfg?.quarterly?.priceUsd  || 19.97,
      yearly:    cfg?.yearly?.priceUsd     || 29,
      lifetime:  cfg?.lifetime?.priceUsd   || 0,
    };

    // Build event lookup: userId -> earliest payment event date
    const eventsByUser = new Map<string, { createdAt: Date; plan: string; paymentMethod: string }[]>();
    for (const ev of allPaymentEvents as any[]) {
      if (!ev.userId) continue;
      const uid = ev.userId.toString();
      if (!eventsByUser.has(uid)) eventsByUser.set(uid, []);
      eventsByUser.get(uid)!.push({ createdAt: ev.createdAt, plan: ev.plan, paymentMethod: ev.paymentMethod });
    }

    type SaleEntry = {
      _id: string;
      type: 'subscription' | 'group_boost' | 'bot_boost';
      label: string;
      plan: string | null;
      paymentMethod: string;
      stars: number;
      usd: number;
      createdAt: string;
      buyer: {
        username: string;
        firstName: string | null;
        country: string | null;
        city: string | null;
        photoUrl: string | null;
        telegramUsername: string | null;
      };
    };

    const sales: SaleEntry[] = [];
    const seenUserIds = new Set<string>();

    // 1) Premium users — the source of truth
    for (const u of allPremiumUsers as any[]) {
      const uid = u._id.toString();
      seenUserIds.add(uid);

      const plan = u.premiumPlan || 'monthly';
      const events = eventsByUser.get(uid);

      // Use premiumSince (the real activation date), fallback to event date
      let saleDate: Date;
      if (u.premiumSince) {
        saleDate = new Date(u.premiumSince);
      } else if (events?.length) {
        saleDate = new Date(events[0].createdAt);
      } else {
        saleDate = new Date(u.createdAt || Date.now());
      }

      const method = u.paymentMethod || events?.[0]?.paymentMethod || 'stars';
      const stars  = planStars[plan] || 0;
      const usd    = planUsd[plan] || stars * rate;

      sales.push({
        _id: uid,
        type: 'subscription',
        label: `Premium ${plan}`,
        plan,
        paymentMethod: method,
        stars,
        usd,
        createdAt: saleDate.toISOString(),
        buyer: {
          username:          u.username || 'Unknown',
          firstName:         u.firstName || null,
          country:           u.country || null,
          city:              u.city || null,
          photoUrl:          u.photoUrl || null,
          telegramUsername:   u.telegramUsername || null,
        },
      });
    }

    // 2) Payment events for users who DON'T appear in premium users (edge case: expired, cancelled)
    for (const ev of allPaymentEvents as any[]) {
      if (!ev.userId) continue;
      const uid = ev.userId.toString();
      if (seenUserIds.has(uid)) continue;
      seenUserIds.add(uid);
      // Fetch user info
      const u = await User.findById(uid).select('username firstName country city photoUrl telegramUsername').lean() as any;
      const plan = ev.plan || 'monthly';
      sales.push({
        _id: uid + '_ev',
        type: 'subscription',
        label: `Premium ${plan}`,
        plan,
        paymentMethod: ev.paymentMethod || 'stars',
        stars: planStars[plan] || 0,
        usd: planUsd[plan] || 0,
        createdAt: new Date(ev.createdAt).toISOString(),
        buyer: {
          username:          u?.username || 'Unknown',
          firstName:         u?.firstName || null,
          country:           u?.country || null,
          city:              u?.city || null,
          photoUrl:          u?.photoUrl || null,
          telegramUsername:   u?.telegramUsername || null,
        },
      });
    }

    // 3) Paid group insertions
    for (const g of allPaidGroups as any[]) {
      const starsAmt = g.paidBoostStars || 0;
      const buyer = g.createdBy || {};
      sales.push({
        _id: g._id.toString(),
        type: 'group_boost',
        label: g.name || 'Group',
        plan: null,
        paymentMethod: 'stars',
        stars: starsAmt,
        usd: starsAmt * rate,
        createdAt: new Date(g.createdAt).toISOString(),
        buyer: {
          username:        buyer.username || g.createdByUsername || 'Unknown',
          firstName:       buyer.firstName || null,
          country:         buyer.country || null,
          city:            buyer.city || null,
          photoUrl:        buyer.photoUrl || null,
          telegramUsername: buyer.telegramUsername || null,
        },
      });
    }

    // 4) Paid bot boosts
    for (const b of allPaidBots as any[]) {
      const starsAmt = b.paidBoostStars || 0;
      const buyer = b.createdBy || {};
      sales.push({
        _id: b._id.toString(),
        type: 'bot_boost',
        label: b.name || 'Bot',
        plan: null,
        paymentMethod: 'stars',
        stars: starsAmt,
        usd: starsAmt * rate,
        createdAt: new Date(b.createdAt).toISOString(),
        buyer: {
          username:        buyer.username || b.createdByUsername || 'Unknown',
          firstName:       buyer.firstName || null,
          country:         buyer.country || null,
          city:            buyer.city || null,
          photoUrl:        buyer.photoUrl || null,
          telegramUsername: buyer.telegramUsername || null,
        },
      });
    }

    sales.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const salesTotalStars = sales.reduce((s, x) => s + x.stars, 0);
    const salesTotalUsd   = sales.reduce((s, x) => s + x.usd, 0);
    const sales24h        = sales.filter((s) => new Date(s.createdAt).getTime() >= _24h.getTime());
    const sales24hUsd     = sales24h.reduce((s, x) => s + x.usd, 0);
    const salesThisMonth  = sales.filter((s) => new Date(s.createdAt).getTime() >= monthStart.getTime());
    const starsThisMonthUsd = salesThisMonth
      .filter(s => s.type === 'subscription').reduce((a, s) => a + s.usd, 0)
      + salesThisMonth.filter(s => s.type !== 'subscription').reduce((a, s) => a + s.stars * rate, 0);
    const totalThisMonthUsd = starsThisMonthUsd + manualThisMonthUsd;

    // Pie data: individual advertisers from ManualRevenue
    const advertisers = (manualByAdvertiser as any[]).map((a) => ({
      name:  a._id || 'Unnamed',
      total: a.total || 0,
      count: a.count || 0,
    }));

    const subRevenue = sales.filter(s => s.type === 'subscription').reduce((a, s) => a + s.usd, 0);
    const groupRevenue = sales.filter(s => s.type === 'group_boost').reduce((a, s) => a + s.usd, 0);
    const botRevenue = sales.filter(s => s.type === 'bot_boost').reduce((a, s) => a + s.usd, 0);

    const pendingTotal = pendingGroups + pendingBots + pendingReviews + pendingReports;
    const dbLatencyMs  = Date.now() - start;

    const alerts: { level: string; title: string; description: string; actionUrl?: string }[] = [];
    if (pendingGroups > 20) alerts.push({ level: 'warning', title: 'High Pending Groups', description: `${pendingGroups} groups waiting`, actionUrl: '/admin/groups?tab=pending' });
    if (pendingReports > 5) alerts.push({ level: 'critical', title: 'Unresolved Reports', description: `${pendingReports} reports`, actionUrl: '/admin/reports' });
    if (pendingTotal === 0) alerts.push({ level: 'ok', title: 'All Clear', description: 'Queue is empty' });

    // earningsLifetimeUsd uses per-sale USD values:
    //   subscriptions → planUsd[plan]   (fixed price, e.g. $12.97)
    //   boosts        → paidBoostStars × rate
    // Never re-derive from Stars total to avoid rate-conversion drift.
    const starsEarningsUsd = sales
      .filter(s => s.type === 'subscription')
      .reduce((a, s) => a + s.usd, 0)
      + sales.filter(s => s.type !== 'subscription').reduce((a, s) => a + s.stars * rate, 0);

    return NextResponse.json({
      generatedAt: now.toISOString(),
      headline: {
        totalPageviewsLifetime,
        earningsLifetimeUsd: starsEarningsUsd,
        starsLifetime: salesTotalStars,   // actual Stars paid by users
        starsUsdRate,
        manualRevenueLifetime: manualLifetime,
        totalEarningsLifetimeUsd: starsEarningsUsd + manualLifetime,
        totalRevenueThisMonth: totalThisMonthUsd,
        starsRevenueThisMonth: starsThisMonthUsd,
        manualRevenueThisMonth: manualThisMonthUsd,
      },
      kpis: {
        paidSubs:  { last24h: sales24h.filter(s => s.type === 'subscription').length, lifetime: allPremiumUsers.length, trend30d: buildTrend(subsTrend30d) },
        adClicks:  { last24h: adClicks24h, lifetime: totalAdClicks, trend30d: buildTrend(adClicksTrend30d) },
        traffic:   { lifetime: totalPageviewsLifetime, trend30d: buildTrend(trafficTrend30d) },
        users:     {
          total: totalUsers - 20,
          free: totalUsers - 20 - allPremiumUsers.length,
          newUsersTrend30d: buildTrend(
            (newUsersTrend30d as {_id:string;value:number}[]).map(d =>
              d._id === '2026-03-14' ? { ...d, value: Math.max(0, d.value - 20) } : d
            )
          ),
          byCountry30d: (usersByCountry30d as {_id:string;count:number}[]).map(c => ({ country: c._id, count: c.count })),
        },
        engagement: { bookmarks: totalBookmarks, folders: totalBookmarkFolders },
      },
      pending: { groups: pendingGroups, bots: pendingBots, reviews: pendingReviews, reports: pendingReports, total: pendingTotal },
      recentSales: sales,
      salesSummary: {
        count: sales.length,
        totalStars: salesTotalStars,
        totalUsd: salesTotalUsd,
        last24hCount: sales24h.length,
        last24hUsd: sales24hUsd,
      },
      earningsByCategory: {
        subscriptions: subRevenue,
        groups: groupRevenue,
        bots: botRevenue,
        advertisers,
      },
      monitoring: { dbLatencyMs, alerts },
    });
  } catch (err: any) {
    console.error('[admin/overview]', err);
    return NextResponse.json({ message: err.message || 'Internal error' }, { status: 500 });
  }
}
