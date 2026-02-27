import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import { Advertiser, Campaign, CampaignClick, Article, Group } from '@/lib/models';

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';

export const dynamic = 'force-dynamic';

async function authenticateAdvertiser(req: NextRequest) {
  const auth = req.headers.get('authorization');
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (!decoded.advertiserId) return null;
    await connectDB();
    const advertiser = await Advertiser.findById(decoded.advertiserId).lean() as any;
    if (!advertiser || advertiser.status !== 'active') return null;
    return advertiser;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const advertiser = await authenticateAdvertiser(req);
    if (!advertiser) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const advertiserId = advertiser._id.toString();
    await connectDB();

    const campaigns = await Campaign.find({ advertiserId })
      .sort({ createdAt: -1 })
      .lean() as any[];

    const campaignIds = campaigns.map((c: any) => c._id);

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [todayClicks, clicks7d, clicks30d, clicksByDay] = await Promise.all([
      CampaignClick.countDocuments({ campaignId: { $in: campaignIds }, clickedAt: { $gte: startOfToday } }),
      CampaignClick.countDocuments({ campaignId: { $in: campaignIds }, clickedAt: { $gte: last7d } }),
      CampaignClick.countDocuments({ campaignId: { $in: campaignIds }, clickedAt: { $gte: last30d } }),
      CampaignClick.aggregate([
        { $match: { campaignId: { $in: campaignIds }, clickedAt: { $gte: last30d } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$clickedAt' } }, clicks: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const clicksByDayMap = new Map((clicksByDay as any[]).map((r) => [r._id, r.clicks]));
    const chartData: { date: string; clicks: number }[] = [];
    const cur = new Date(last30d);
    while (cur <= now) {
      const dateStr = cur.toISOString().slice(0, 10);
      chartData.push({ date: dateStr, clicks: clicksByDayMap.get(dateStr) ?? 0 });
      cur.setDate(cur.getDate() + 1);
    }

    // Per-campaign click stats
    const perCampaignClicks = await CampaignClick.aggregate([
      { $match: { campaignId: { $in: campaignIds }, clickedAt: { $gte: last30d } } },
      { $group: { _id: '$campaignId', last30d: { $sum: 1 } } },
    ]);
    const perCampaignMap = new Map((perCampaignClicks as any[]).map((r) => [r._id.toString(), r.last30d]));

    const perCampaign7d = await CampaignClick.aggregate([
      { $match: { campaignId: { $in: campaignIds }, clickedAt: { $gte: last7d } } },
      { $group: { _id: '$campaignId', last7d: { $sum: 1 } } },
    ]);
    const perCampaign7dMap = new Map((perCampaign7d as any[]).map((r) => [r._id.toString(), r.last7d]));

    // Articles linked to this advertiser
    const articles = await Article.find({ advertiserId })
      .select('title slug views status publishedAt')
      .sort({ publishedAt: -1 })
      .lean() as any[];

    // Featured groups linked to this advertiser
    const featuredGroups = await Group.find({
      advertiserId,
      isAdvertisement: true,
    })
      .select('name slug clickCount views image')
      .lean() as any[];

    const totalClicks = campaigns.reduce((sum: number, c: any) => sum + (c.clicks ?? 0), 0);
    const totalImpressions = campaigns.reduce((sum: number, c: any) => sum + (c.impressions ?? 0), 0);

    const SLOT_LABELS: Record<string, string> = {
      'top-banner': 'Top Banner',
      'homepage-hero': 'Homepage Hero',
      feed: 'In-Feed Ad',
      'navbar-cta': 'Navbar CTA',
      'join-cta': 'Join Page CTA',
      'filter-cta': 'Filter CTA',
    };

    return NextResponse.json({
      advertiser: {
        _id: advertiserId,
        name: advertiser.name,
        email: advertiser.email,
        company: advertiser.company || '',
        logo: advertiser.logo || '',
      },
      stats: {
        totalClicks,
        totalImpressions,
        todayClicks,
        clicks7d,
        clicks30d,
        activeCampaigns: campaigns.filter((c: any) => c.status === 'active').length,
        totalCampaigns: campaigns.length,
      },
      chartData,
      campaigns: campaigns.map((c: any) => ({
        _id: c._id.toString(),
        name: c.name,
        slot: c.slot,
        slotLabel: SLOT_LABELS[c.slot] || c.slot,
        creative: c.creative || '',
        destinationUrl: c.destinationUrl,
        startDate: c.startDate?.toISOString() || '',
        endDate: c.endDate?.toISOString() || '',
        status: c.status,
        isVisible: c.isVisible,
        clicks: c.clicks || 0,
        impressions: c.impressions || 0,
        clicks7d: perCampaign7dMap.get(c._id.toString()) ?? 0,
        clicks30d: perCampaignMap.get(c._id.toString()) ?? 0,
        description: c.description || '',
        buttonText: c.buttonText || '',
        videoUrl: c.videoUrl || '',
        badgeText: c.badgeText || '',
        verified: Boolean(c.verified),
      })),
      articles: articles.map((a: any) => ({
        _id: a._id.toString(),
        title: a.title,
        slug: a.slug,
        views: a.views || 0,
        status: a.status,
        publishedAt: a.publishedAt?.toISOString() || '',
      })),
      featuredGroups: featuredGroups.map((g: any) => ({
        _id: g._id.toString(),
        name: g.name,
        slug: g.slug,
        clickCount: g.clickCount || 0,
        views: g.views || 0,
        image: g.image || '',
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || 'Server error' }, { status: 500 });
  }
}
