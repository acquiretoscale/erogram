'use server';

import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import {
  Campaign, TrendingOFCreator, OnlyFansCreator,
  Bookmark, ButtonConfig, User, TrendingErogram,
} from '@/lib/models';

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';

export async function getTrendingCreators(category?: string) {
  await connectDB();

  const filter: Record<string, any> = { active: true };
  if (category) filter.categories = category;

  const creators = await TrendingOFCreator.find(filter)
    .limit(12)
    .select('_id name username avatar url bio categories position dealPrice liveHourStart liveHourEnd')
    .lean();

  const usernames = (creators as any[]).map((c) => c.username).filter(Boolean);
  const ofDocs = usernames.length
    ? await OnlyFansCreator.find({ username: { $in: usernames } })
        .select('username likesCount')
        .lean()
    : [];
  const likesMap = new Map((ofDocs as any[]).map((d) => [d.username, d.likesCount ?? 0]));

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
    likesCount: likesMap.get(c.username) ?? 0,
    liveHourStart: c.liveHourStart ?? -1,
    liveHourEnd: c.liveHourEnd ?? -1,
  }));

  for (let i = mapped.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [mapped[i], mapped[j]] = [mapped[j], mapped[i]];
  }

  return mapped;
}

/**
 * Returns active TrendingOFCreator entries shaped as FeedCampaign objects
 * so they can be injected into the /groups feed alongside regular ads.
 * Clicks tracked via trackTrendingClick (not Campaign model).
 */
export async function getFeaturedCreatorFeedItems() {
  const { unstable_noStore } = await import('next/cache');
  unstable_noStore();

  await connectDB();
  const creators = await TrendingOFCreator.find({ active: true })
    .select('_id name username avatar url liveHourStart liveHourEnd')
    .lean();

  const usernames = (creators as any[]).map(c => c.username).filter(Boolean);
  const ofDocs = usernames.length
    ? await OnlyFansCreator.find({ username: { $in: usernames } }).select('username likesCount subscriberCount').lean()
    : [];
  const statsMap = new Map((ofDocs as any[]).map(d => [d.username, { likes: d.likesCount || 0, subs: d.subscriberCount || 0 }]));

  const shuffled = [...(creators as any[])];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.map((c, i) => {
    const stats = statsMap.get(c.username);
    const raw = (c.url || '').trim();
    const dest = /^https?:\/\//i.test(raw) ? raw : `https://onlyfans.com/${c.username}`;
    // First creator → slot 2 (visible after 2 groups), second → slot 3 (after 8),
    // rest → slot 4 (after 12, then loops every 5 groups as user scrolls)
    const ts = i === 0 ? 2 : i === 1 ? 3 : 4;
    return {
      _id: `of-featured-${c._id}`,
      creative: c.avatar || '',
      destinationUrl: dest,
      name: c.name || c.username,
      slot: 'feed',
      feedTier: 1,
      tierSlot: ts,
      position: i + 1,
      description: '',
      category: 'All',
      country: 'All',
      buttonText: 'View Profile',
      adType: 'onlyfans-creator' as const,
      ofUsername: c.username,
      ofTrendingId: c._id.toString(),
      ofLikesCount: stats?.likes || 0,
      ofSubscriberCount: stats?.subs || 0,
      ofLiveHourStart: c.liveHourStart ?? -1,
      ofLiveHourEnd: c.liveHourEnd ?? -1,
    };
  });
}

export async function getTrendingOnErogram() {
  await connectDB();

  const managed = await TrendingErogram.find({ active: true }).sort({ position: 1 }).limit(40).lean() as any[];

  if (managed.length > 0) {
    return managed.map((d: any, i: number) => ({
      _id: String(d._id),
      name: d.name || '',
      username: d.username || '',
      slug: d.slug || '',
      avatar: d.avatar || '',
      rank: i + 1,
      points: d.points || 0,
      pointsDelta: d.pointsDelta || 0,
      rankChange: 0,
    }));
  }

  const docs = await OnlyFansCreator.find({
    avatar: { $ne: '' },
    deleted: { $ne: true },
    likesCount: { $gt: 0 },
  })
    .sort({ likesCount: -1 })
    .limit(40)
    .select('name username slug avatar clicks likesCount')
    .lean() as any[];

  const hash = (s: string) => {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    return Math.abs(h);
  };

  return docs.map((d: any, i: number) => {
    const h = hash(String(d._id));
    const denom = Math.max(docs.length - 1, 1);
    const points = Math.round(495 - ((i * (495 - 223)) / denom));
    const delta = 10 + (h % 21);
    const upOrDown = ((h >> 4) % 4) === 0 ? -1 : 1;
    return {
      _id: String(d._id),
      name: d.name || '',
      username: d.username || '',
      slug: d.slug || '',
      avatar: d.avatar || '',
      rank: i + 1,
      points,
      pointsDelta: delta * upOrDown,
      rankChange: 0,
    };
  });
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
