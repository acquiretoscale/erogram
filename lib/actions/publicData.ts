'use server';

import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import {
  Campaign, TrendingOFCreator,
  Bookmark, ButtonConfig, User,
} from '@/lib/models';

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';

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
