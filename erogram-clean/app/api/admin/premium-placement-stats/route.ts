import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import { User, Campaign, CampaignClick, CampaignImpressionDaily, PremiumEvent, Advertiser } from '@/lib/models';

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';

export const dynamic = 'force-dynamic';

async function authenticateAdmin(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    const decoded = jwt.verify(auth.slice(7), JWT_SECRET) as any;
    await connectDB();
    const user = await User.findById(decoded.id);
    return user?.isAdmin ? user : null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const admin = await authenticateAdmin(req);
    if (!admin) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const days = parseInt(req.nextUrl.searchParams.get('days') || '30') || 30;
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceDate = since.toISOString().slice(0, 10);

    await connectDB();

    // 1. EROGRAM-owned feed campaigns (Premium Vault in-feed ads)
    const erogramAdvertiser = await Advertiser.findOne({ name: 'EROGRAM' }).lean() as any;
    let feedAds: any[] = [];
    let vaultStats = { impressions: 0, clicks: 0, ctr: '0', dailyImpressions: [] as any[], dailyClicks: [] as any[] };

    if (erogramAdvertiser) {
      const eroCampaigns = await Campaign.find({
        advertiserId: erogramAdvertiser._id,
        slot: 'feed',
      }).lean() as any[];

      feedAds = eroCampaigns.map((c: any) => ({
        _id: c._id.toString(),
        name: c.name,
        slot: c.slot,
        status: c.status,
        impressions: c.impressions || 0,
        clicks: c.clicks || 0,
        ctr: (c.impressions || 0) > 0 ? (((c.clicks || 0) / c.impressions) * 100).toFixed(2) : '0',
        position: c.position,
        feedTier: c.feedTier,
        tierSlot: c.tierSlot,
        createdAt: c.createdAt,
      }));

      // Aggregate daily stats across all EROGRAM feed campaigns
      const eroIds = eroCampaigns.map((c: any) => c._id);
      if (eroIds.length > 0) {
        const totalImp = eroCampaigns.reduce((s: number, c: any) => s + (c.impressions || 0), 0);
        const totalClk = eroCampaigns.reduce((s: number, c: any) => s + (c.clicks || 0), 0);
        vaultStats.impressions = totalImp;
        vaultStats.clicks = totalClk;
        vaultStats.ctr = totalImp > 0 ? ((totalClk / totalImp) * 100).toFixed(2) : '0';

        const [dailyImp, dailyClk] = await Promise.all([
          CampaignImpressionDaily.aggregate([
            { $match: { campaignId: { $in: eroIds }, date: { $gte: sinceDate } } },
            { $group: { _id: '$date', count: { $sum: '$count' } } },
            { $sort: { _id: 1 } },
          ]),
          CampaignClick.aggregate([
            { $match: { campaignId: { $in: eroIds }, clickedAt: { $gte: since } } },
            { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$clickedAt' } }, count: { $sum: 1 } } },
            { $sort: { _id: 1 } },
          ]),
        ]);

        vaultStats.dailyImpressions = dailyImp.map((d: any) => ({ date: d._id, count: d.count }));
        vaultStats.dailyClicks = dailyClk.map((d: any) => ({ date: d._id, count: d.count }));
      }
    }

    // 2. Navbar CTA campaign (Premium button near Trending Categories)
    const navbarCtaCampaign = await Campaign.findOne({ slot: 'navbar-cta', status: 'active' }).lean() as any;
    let navbarCtaStats = { name: '', impressions: 0, clicks: 0, ctr: '0', destinationUrl: '' };

    if (navbarCtaCampaign) {
      navbarCtaStats = {
        name: navbarCtaCampaign.name || 'Navbar CTA',
        impressions: navbarCtaCampaign.impressions || 0,
        clicks: navbarCtaCampaign.clicks || 0,
        ctr: (navbarCtaCampaign.impressions || 0) > 0
          ? (((navbarCtaCampaign.clicks || 0) / navbarCtaCampaign.impressions) * 100).toFixed(2)
          : '0',
        destinationUrl: navbarCtaCampaign.destinationUrl || '',
      };
    }

    // 3. Premium funnel events
    const premiumFunnelAgg = await PremiumEvent.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: '$event', count: { $sum: 1 } } },
    ]);

    const funnelMap: Record<string, number> = {};
    premiumFunnelAgg.forEach((r: any) => { funnelMap[r._id] = r.count; });

    const premiumFunnel = {
      pageViews: funnelMap['page_view'] || 0,
      modalOpens: funnelMap['modal_open'] || 0,
      planClicks: (funnelMap['plan_click'] || 0) + (funnelMap['crypto_plan_click'] || 0),
      invoicesCreated: (funnelMap['invoice_created'] || 0) + (funnelMap['crypto_invoice_created'] || 0),
      payments: funnelMap['payment_success'] || 0,
    };

    return NextResponse.json({
      period: days,
      vault: vaultStats,
      navbarCta: navbarCtaStats,
      premiumFunnel,
      feedAds,
    });
  } catch (err: any) {
    console.error('Premium placement stats error:', err);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
