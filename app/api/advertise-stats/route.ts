import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Group, Campaign, CampaignClick, Bot, Article, StorySlideContent } from '@/lib/models';
import mongoose from 'mongoose';
import { syncPublicAdClickCounter } from '@/lib/adClicksPublicCounter';

export const dynamic = 'force-dynamic';

// Display base added to the live "visiting now" counter shown on public pages.
const VISITING_NOW_BASE = 600;

// Trim the public ad-clicks number down so it reads less inflated while still
// ticking up live with every real click. Subtracted from the true 30d total.
const AD_CLICKS_DISPLAY_TRIM = 100_000;

/** Sum a Group/Bot clickCountByDay Map for day keys on/after startKey (YYYY-MM-DD, UTC). */
function sumClicksSince(map: unknown, startKey: string): number {
  if (!map) return 0;
  const entries = map instanceof Map ? Array.from(map.entries()) : Object.entries(map as Record<string, number>);
  let n = 0;
  for (const [k, v] of entries as Array<[string, number]>) {
    if (k >= startKey) n += Number(v) || 0;
  }
  return n;
}

export async function GET() {
  try {
    await connectDB();

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgoKey = thirtyDaysAgo.toISOString().slice(0, 10);
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);
    const sixtyMinAgo = new Date(Date.now() - 60 * 60 * 1000);

    const siteVisitsCol = mongoose.connection.db!.collection('sitevisits');
    const siteVisitEventsCol = mongoose.connection.db!.collection('sitevisit_events');

    const [groupViewsResult, botViewsResult, articleViewsResult, storyViewsResult, approvedGroupCount, campaignClicksSummary, last24hCount, last7dCount, last30dCount, activeVisitors, last60MinVisits, recentCountryRows, recentEventRows, trackedEvents30m, botDocs, groupDocs] = await Promise.all([
      Group.aggregate([{ $group: { _id: null, totalViews: { $sum: '$views' } } }]),
      Bot.aggregate([{ $group: { _id: null, totalViews: { $sum: '$views' } } }]),
      Article.aggregate([{ $group: { _id: null, totalViews: { $sum: '$views' } } }]),
      StorySlideContent.aggregate([{ $group: { _id: null, totalViews: { $sum: '$views' } } }]),
      Group.countDocuments({ status: 'approved' }),
      Campaign.aggregate([{ $group: { _id: null, totalClicks: { $sum: '$clicks' } } }]),
      CampaignClick.countDocuments({ clickedAt: { $gte: twentyFourHoursAgo } }),
      CampaignClick.countDocuments({ clickedAt: { $gte: sevenDaysAgo } }),
      CampaignClick.countDocuments({ clickedAt: { $gte: thirtyDaysAgo } }),
      siteVisitsCol.countDocuments({ ts: { $gte: thirtyMinAgo } }).catch(() => 0),
      siteVisitsCol.countDocuments({ ts: { $gte: sixtyMinAgo } }).catch(() => 0),
      siteVisitsCol
        .find({ ts: { $gte: thirtyMinAgo }, country: { $type: 'string', $ne: '' } })
        .sort({ ts: -1 })
        .limit(20)
        .project({ country: 1 })
        .toArray()
        .catch(() => []),
      siteVisitEventsCol
        .find({ ts: { $gte: thirtyMinAgo }, country: { $type: 'string', $ne: '' } })
        .sort({ ts: -1 })
        .limit(10)
        .project({ country: 1, ts: 1, sid: 1 })
        .toArray()
        .catch(() => []),
      siteVisitEventsCol.countDocuments({ ts: { $gte: thirtyMinAgo }, country: { $type: 'string', $ne: '' } }).catch(() => 0),
      Bot.find({ clickCount: { $gt: 0 } }).select('clickCountByDay').lean(),
      Group.find({ clickCount: { $gt: 0 } }).select('clickCountByDay').lean(),
    ]);

    // Bot "Open in Telegram" + Group "Join" clicks in the last 30 days (clickCountByDay Map).
    let botOpens30d = 0;
    for (const b of botDocs as Array<{ clickCountByDay?: unknown }>) {
      botOpens30d += sumClicksSince(b.clickCountByDay, thirtyDaysAgoKey);
    }
    let groupJoins30d = 0;
    for (const g of groupDocs as Array<{ clickCountByDay?: unknown }>) {
      groupJoins30d += sumClicksSince(g.clickCountByDay, thirtyDaysAgoKey);
    }

    const totalViews =
      (groupViewsResult[0]?.totalViews ?? 0) +
      (botViewsResult[0]?.totalViews ?? 0) +
      (articleViewsResult[0]?.totalViews ?? 0) +
      (storyViewsResult[0]?.totalViews ?? 0);
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

    const lastVisitorCountries = (recentCountryRows as { country?: string }[])
      .map((row) => row.country?.toUpperCase())
      .filter((code): code is string => !!code && code.length === 2);

    const lastVisitorEvents = (recentEventRows as { _id?: { toString(): string }; country?: string; ts?: Date; sid?: string }[])
      .map((row) => ({
        id: row._id?.toString() ?? `${row.sid}-${row.ts}`,
        country: row.country?.toUpperCase() ?? '',
        ts: row.ts instanceof Date ? row.ts.toISOString() : new Date().toISOString(),
      }))
      .filter((row) => row.country.length === 2);

    // Live ad-network total = paid ad clicks (30d) + bot opens (30d) + group joins (30d).
    // Paid clicks rise instantly via lifetime Campaign.clicks deltas; the 30d floor also
    // folds in live bot/group clicks so the number keeps climbing. Never goes down.
    const last30dClientClicksRaw = await syncPublicAdClickCounter(
      totalClicks,
      (last30dCount as number) + botOpens30d + groupJoins30d,
    );
    const last30dClientClicks = Math.max(0, last30dClientClicksRaw - AD_CLICKS_DISPLAY_TRIM);

    return NextResponse.json({
      totalViews,
      totalClicks,
      totalGroups: approvedGroupCount,
      last24hClicks: last24hDisplay,
      clickBreakdown,
      activeVisitors: VISITING_NOW_BASE + (activeVisitors as number) + 14,
      last60MinVisits: VISITING_NOW_BASE + (last60MinVisits as number) + 40,
      last7dClicks: last7dCount + 4800,
      last30dClientClicks,
      lastVisitorCountries,
      lastVisitorEvents,
      trackedEvents30m: trackedEvents30m as number,
    });
  } catch (error: any) {
    console.error('Advertise stats error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch stats' },
      { status: 500 },
    );
  }
}
