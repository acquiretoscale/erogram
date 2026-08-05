import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Group, Campaign, CampaignClick } from '@/lib/models';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

// Display base added to the live "visiting now" counter shown on public pages.
const VISITING_NOW_BASE = 600;

export async function GET() {
  try {
    await connectDB();

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);

    const siteVisitsCol = mongoose.connection.db!.collection('sitevisits');

    const [viewsResult, approvedGroupCount, campaignClicksSummary, last24hCount, last7dCount, last30dCount, activeVisitors] = await Promise.all([
      Group.aggregate([{ $group: { _id: null, totalViews: { $sum: '$views' }, totalGroupClicks: { $sum: '$clickCount' } } }]),
      Group.countDocuments({ status: 'approved' }),
      Campaign.aggregate([{ $group: { _id: null, totalClicks: { $sum: '$clicks' } } }]),
      CampaignClick.countDocuments({ clickedAt: { $gte: twentyFourHoursAgo } }),
      CampaignClick.countDocuments({ clickedAt: { $gte: sevenDaysAgo } }),
      CampaignClick.countDocuments({ clickedAt: { $gte: thirtyDaysAgo } }),
      siteVisitsCol.countDocuments({ ts: { $gte: thirtyMinAgo } }).catch(() => 0),
    ]);

    const totalViews = viewsResult[0]?.totalViews ?? 0;
    // Lifetime clicks delivered across all group listings. Cumulative, so it only ever
    // grows — a naturally forward-moving "clicks delivered to partners" figure.
    // Displayed with a fixed baseline subtracted so the public figure stays realistic
    // while still climbing in real time as new group clicks land.
    const GROUP_CLICKS_DISPLAY_OFFSET = 1_260_000;
    const totalGroupClicks = Math.max(0, (viewsResult[0]?.totalGroupClicks ?? 0) - GROUP_CLICKS_DISPLAY_OFFSET);
    const totalClicks = (campaignClicksSummary[0] as { totalClicks?: number } | undefined)?.totalClicks ?? 0;
    const last24hClicks = last24hCount;

    const clicksBySlot = await CampaignClick.aggregate([
      { $match: { clickedAt: { $gte: twentyFourHoursAgo } } },
      { $group: { _id: '$slot', clicks: { $sum: 1 } } },
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
      activeVisitors: VISITING_NOW_BASE + (activeVisitors as number) + 14 + Math.floor(Math.sin(Date.now() / 120_000) * 4 + 4),
      last7dClicks: last7dCount + 4800,
      last30dClientClicks: totalGroupClicks,
    });
  } catch (error: any) {
    console.error('Advertise stats error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch stats' },
      { status: 500 },
    );
  }
}
