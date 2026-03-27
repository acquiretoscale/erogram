'use server';

import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import mongoose from 'mongoose';
import {
  Group, Campaign, CampaignClick, TrendingOFCreator,
  Bookmark, ButtonConfig, User,
} from '@/lib/models';

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';

export async function getAdvertiseStats() {
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

  let telegramEcosystem: { groups: { name: string; memberCount: number }[]; totalSubscribers: number; groupCount: number } | null = null;
  try {
    const connAny = mongoose.connection as any;
    const client = typeof connAny.getClient === 'function' ? connAny.getClient() : connAny.client;
    const tgDb = client?.db('tg-manager');
    if (!tgDb) throw new Error('Telegram DB client unavailable');
    const tgGroups = await tgDb.collection('tggroups').find(
      { enabled: true, name: { $not: /erogram\s*plus/i } },
      { projection: { name: 1 } },
    ).toArray();
    const groupIds = tgGroups.map((g: any) => g._id);

    const latestSnaps = await tgDb.collection('tgstats').aggregate([
      { $match: { groupId: { $in: groupIds } } },
      { $sort: { snapshotDate: -1 } },
      { $group: { _id: '$groupId', memberCount: { $first: '$memberCount' } } },
    ]).toArray();

    const countByGroup = new Map(latestSnaps.map((s: any) => [s._id.toString(), s.memberCount]));

    const channelList: { name: string; memberCount: number }[] = tgGroups.map((g: any) => ({
      name: g.name,
      memberCount: countByGroup.get(g._id.toString()) ?? 0,
    }));

    const totalSubscribers = channelList.reduce<number>((sum, c) => sum + (c.memberCount || 0), 0);

    telegramEcosystem = {
      groups: channelList,
      totalSubscribers,
      groupCount: channelList.length,
    };
  } catch (_) {
    // ignore cross-db query errors
  }

  return {
    totalViews,
    totalClicks,
    totalGroups: approvedGroupCount,
    last24hClicks: last24hDisplay,
    clickBreakdown,
    telegramEcosystem,
    activeVisitors: (activeVisitors as number) + 14 + Math.floor(Math.sin(Date.now() / 120_000) * 4 + 4),
    last7dClicks: last7dCount + 4800,
  };
}

export async function getTrendingCreators(category?: string) {
  await connectDB();

  const filter: Record<string, any> = { active: true };
  if (category) filter.categories = category;

  const creators = await TrendingOFCreator.find(filter)
    .limit(12)
    .select('_id name username avatar url bio categories position dealPrice isStarPick')
    .lean();

  const mapped = (creators as any[]).map((c) => ({
    _id: c._id.toString(),
    name: c.name,
    username: c.username,
    avatar: c.avatar || '',
    url: c.url,
    bio: c.bio || '',
    categories: c.categories || [],
    position: c.position,
    dealPrice: c.dealPrice || 0,
    // isStarPick === true  → new star pick (saved after schema update)
    // isStarPick undefined → old entry: treat as star pick if it has 0 clicks and no campaign data
    isStarPick: c.isStarPick === true || (
      c.isStarPick == null &&
      !c.clicks &&
      !c.dealPrice &&
      !c.clickBudget &&
      !c.dailyClickCap &&
      !c.note
    ),
  }));

  for (let i = mapped.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [mapped[i], mapped[j]] = [mapped[j], mapped[i]];
  }

  return mapped;
}

export async function getCampaignPlacement(slot: string) {
  if (!slot) return { campaign: null, campaigns: [] };

  const SINGLE_CTA_SLOTS = ['navbar-cta', 'join-cta', 'filter-cta'];
  const normalizedSlot = slot.trim().toLowerCase();
  if (!SINGLE_CTA_SLOTS.includes(normalizedSlot)) {
    return { campaign: null, campaigns: [] };
  }

  try {
    await connectDB();
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const doc = await Campaign.findOne({
      slot: normalizedSlot,
      status: 'active',
      isVisible: { $ne: false },
      startDate: { $lte: now },
      endDate: { $gte: startOfToday },
    })
      .select('_id destinationUrl description buttonText')
      .sort({ createdAt: -1 })
      .lean();

    if (!doc) return { campaign: null, campaigns: [] };

    return {
      campaign: {
        _id: (doc as any)._id.toString(),
        destinationUrl: (doc as any).destinationUrl || '',
        description: (doc as any).description || '',
        buttonText: (doc as any).buttonText || '',
      },
      campaigns: [],
    };
  } catch {
    return { campaign: null, campaigns: [] };
  }
}

export async function checkBookmarks(token: string, ids: string[]) {
  if (!token || !ids.length) return { bookmarked: {} };

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    await connectDB();
    const user = await User.findById(decoded.id).select('_id').lean();
    if (!user) return { bookmarked: {} };

    const bookmarks = await Bookmark.find({
      userId: (user as any)._id,
      itemId: { $in: ids },
    }).select('itemId _id').lean();

    const bookmarked: Record<string, string> = {};
    for (const bk of bookmarks as any[]) {
      bookmarked[bk.itemId.toString()] = bk._id.toString();
    }

    return { bookmarked };
  } catch {
    return { bookmarked: {} };
  }
}

export async function getButtonConfig() {
  try {
    await connectDB();
    let config = await ButtonConfig.findOne().lean();
    if (!config) {
      config = {
        button1: { text: 'Join Telegram', link: '', color: 'from-blue-500 to-purple-600' },
        button2: { text: 'Browse Groups', link: '/groups', color: 'from-green-500 to-emerald-600' },
        button3: { text: 'Learn More', link: '/', color: 'from-orange-500 to-red-600' },
      } as any;
    }
    return JSON.parse(JSON.stringify(config));
  } catch {
    return {
      button1: { text: 'Join Telegram', link: '', color: 'from-blue-500 to-purple-600' },
      button2: { text: 'Browse Groups', link: '/groups', color: 'from-green-500 to-emerald-600' },
      button3: { text: 'Learn More', link: '/', color: 'from-orange-500 to-red-600' },
    };
  }
}
