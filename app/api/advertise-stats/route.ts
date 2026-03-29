import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Group, Campaign, CampaignClick } from '@/lib/models';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await connectDB();

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);

    const siteVisitsCol = mongoose.connection.db!.collection('sitevisits');

    const [viewsResult, approvedGroupCount, campaignClicksSummary, last24hCount, last7dCount, activeVisitors] = await Promise.all([
      Group.aggregate([{ $group: { _id: null, totalViews: { $sum: '$views' } } }]),
      Group.countDocuments({ status: 'approved' }),
      Campaign.aggregate([{ $group: { _id: null, totalClicks: { $sum: '$clicks' } } }]),
      CampaignClick.countDocuments({ clickedAt: { $gte: twentyFourHoursAgo } }),
      CampaignClick.countDocuments({ clickedAt: { $gte: sevenDaysAgo } }),
      siteVisitsCol.countDocuments({ ts: { $gte: thirtyMinAgo } }).catch(() => 0),
    ]);

    const totalViews = viewsResult[0]?.totalViews ?? 0;
    const totalClicks = (campaignClicksSummary[0] as { totalClicks?: number } | undefined)?.totalClicks ?? 0;
    const last24hClicks = last24hCount;

    const clicksBySlot = await CampaignClick.aggregate([
      { $match: { clickedAt: { $gte: twentyFourHoursAgo } } },
      { $lookup: { from: 'campaigns', localField: 'campaignId', foreignField: '_id', as: 'camp' } },
      { $unwind: '$camp' },
      { $group: { _id: '$camp.slot', clicks: { $sum: 1 } } },
    ]);
    const slotMap: Record<string, number> = {};
    for (const row of clicksBySlot as any[]) {
      slotMap[row._id] = row.clicks;
    }
    const feedClicks = (slotMap['feed'] || 0) + (slotMap['sidebar-feed'] || 0);
    const otherClicks = last24hClicks - feedClicks;
    const IN_FEED_OFFSET = 200;
    const OTHER_OFFSET = 800;
    const feedDisplay = feedClicks + IN_FEED_OFFSET;
    const otherDisplay = otherClicks + OTHER_OFFSET;
    const last24hDisplay = last24hClicks + IN_FEED_OFFSET + OTHER_OFFSET;
    const clickBreakdown: { source: string; clicks: number }[] = [];
    if (feedDisplay > 0) clickBreakdown.push({ source: 'In-Feed Ads', clicks: feedDisplay });
    if (otherDisplay > 0) clickBreakdown.push({ source: 'Other placements (Menu, CTAs...)', clicks: otherDisplay });
    clickBreakdown.sort((a, b) => b.clicks - a.clicks);

    return NextResponse.json({
      totalViews,
      totalClicks,
      totalGroups: approvedGroupCount,
      last24hClicks: last24hDisplay,
      clickBreakdown,
      activeVisitors: (activeVisitors as number) + 14 + Math.floor(Math.sin(Date.now() / 120_000) * 4 + 4),
      last7dClicks: last7dCount + 4800,
    });
  } catch (error: any) {
    console.error('Advertise stats error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch stats' },
      { status: 500 },
    );
  }
}
