'use server';

import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import { User, OnlyFansCreator, TrendingOFCreator, TrendingClickDaily } from '@/lib/models';

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';

async function authenticateAdmin(token: string) {
  if (!token) return null;
  try {
    const d = jwt.verify(token, JWT_SECRET) as any;
    await connectDB();
    const u = await User.findById(d.id);
    if (u && u.isAdmin) return u;
  } catch {
    return null;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

export async function getOFMStats(token: string) {
  if (!(await authenticateAdmin(token))) throw new Error('Unauthorized');
  await connectDB();

  const [
    total,
    freeCount,
    verifiedCount,
    categoryCounts,
    recentlyScrapped,
    topBySubscribers,
  ] = await Promise.all([
    OnlyFansCreator.countDocuments(),
    OnlyFansCreator.countDocuments({ isFree: true }),
    OnlyFansCreator.countDocuments({ isVerified: true }),
    OnlyFansCreator.aggregate([
      { $unwind: '$categories' },
      { $group: { _id: '$categories', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ]),
    OnlyFansCreator.countDocuments({
      scrapedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    }),
    OnlyFansCreator.find({}, 'name username subscriberCount avatar isFree price')
      .sort({ subscriberCount: -1 })
      .limit(5)
      .lean(),
  ]);

  return JSON.parse(JSON.stringify({
    total,
    freeCount,
    paidCount: total - freeCount,
    verifiedCount,
    recentlyScrapped,
    categoryCounts,
    topBySubscribers,
  }));
}

// ---------------------------------------------------------------------------
// Creators — list
// ---------------------------------------------------------------------------

export async function getOFMCreators(
  token: string,
  params: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    isFree?: string;
    sortBy?: string;
    sortDir?: string;
  } = {},
) {
  if (!(await authenticateAdmin(token))) throw new Error('Unauthorized');
  await connectDB();

  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(100, Math.max(1, params.limit ?? 50));
  const search = params.search || '';
  const category = params.category || '';
  const isFree = params.isFree;
  const sortBy = params.sortBy || 'scrapedAt';
  const sortDir = params.sortDir === 'asc' ? 1 : -1;

  const query: Record<string, any> = {};
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { username: { $regex: search, $options: 'i' } },
    ];
  }
  if (category) query.categories = category;
  if (isFree === 'true') query.isFree = true;
  if (isFree === 'false') query.isFree = false;

  const validSortFields = ['scrapedAt', 'subscriberCount', 'likesCount', 'price', 'createdAt', 'name'];
  const sortField = validSortFields.includes(sortBy) ? sortBy : 'scrapedAt';

  const [creators, total] = await Promise.all([
    OnlyFansCreator.find(query)
      .sort({ [sortField]: sortDir })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    OnlyFansCreator.countDocuments(query),
  ]);

  return JSON.parse(JSON.stringify({
    creators,
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
  }));
}

// ---------------------------------------------------------------------------
// Creators — create
// ---------------------------------------------------------------------------

export async function createOFMCreator(
  token: string,
  data: {
    name: string;
    username: string;
    url: string;
    categories?: string[];
    bio?: string;
    avatar?: string;
    header?: string;
    price?: number;
    isFree?: boolean;
    isVerified?: boolean;
    subscriberCount?: number;
    likesCount?: number;
    mediaCount?: number;
    photosCount?: number;
    videosCount?: number;
  },
) {
  if (!(await authenticateAdmin(token))) throw new Error('Unauthorized');
  await connectDB();

  const { name, username, url, categories, bio, avatar, header, price, isFree, isVerified,
    subscriberCount, likesCount, mediaCount, photosCount, videosCount } = data;

  if (!name || !username || !url) {
    throw new Error('name, username, and url are required');
  }

  const slug = username.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

  try {
    const creator = await OnlyFansCreator.create({
      name, username, slug, url,
      categories: categories || [],
      bio: bio || '',
      avatar: avatar || '',
      header: header || '',
      price: price || 0,
      isFree: isFree ?? price === 0,
      isVerified: isVerified || false,
      subscriberCount: subscriberCount || 0,
      likesCount: likesCount || 0,
      mediaCount: mediaCount || 0,
      photosCount: photosCount || 0,
      videosCount: videosCount || 0,
      scrapedAt: new Date(),
    });
    return JSON.parse(JSON.stringify({ creator }));
  } catch (e: any) {
    if (e.code === 11000) throw new Error('Creator with this username already exists');
    throw e;
  }
}

// ---------------------------------------------------------------------------
// Creators — single get / update / delete
// ---------------------------------------------------------------------------

export async function getOFMCreator(token: string, id: string) {
  if (!(await authenticateAdmin(token))) throw new Error('Unauthorized');
  await connectDB();

  const creator = await OnlyFansCreator.findById(id).lean();
  if (!creator) throw new Error('Not found');
  return JSON.parse(JSON.stringify({ creator }));
}

export async function updateOFMCreator(token: string, id: string, data: Record<string, any>) {
  if (!(await authenticateAdmin(token))) throw new Error('Unauthorized');
  await connectDB();

  const allowed = ['name', 'username', 'url', 'categories', 'bio', 'avatar', 'header',
    'price', 'isFree', 'isVerified', 'featured', 'subscriberCount', 'likesCount',
    'mediaCount', 'photosCount', 'videosCount'];

  const update: Record<string, any> = {};
  for (const key of allowed) {
    if (key in data) update[key] = data[key];
  }

  if (update.username) {
    update.slug = update.username.toLowerCase()
      .replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  }

  if (typeof update.featured === 'boolean') {
    update.featuredAt = update.featured ? new Date() : null;
  }

  const creator = await OnlyFansCreator.findByIdAndUpdate(
    id,
    { $set: update },
    { new: true, runValidators: true },
  ).lean();

  if (!creator) throw new Error('Not found');
  return JSON.parse(JSON.stringify({ creator }));
}

export async function deleteOFMCreator(token: string, id: string) {
  if (!(await authenticateAdmin(token))) throw new Error('Unauthorized');
  await connectDB();

  const result = await OnlyFansCreator.findByIdAndDelete(id);
  if (!result) throw new Error('Not found');
  return { success: true };
}

// ---------------------------------------------------------------------------
// Creators — browse
// ---------------------------------------------------------------------------

export async function browseOFMCreators(
  token: string,
  params: { category?: string; limit?: number; skip?: number } = {},
) {
  if (!(await authenticateAdmin(token))) throw new Error('Unauthorized');
  await connectDB();

  const category = params.category || '';
  const limit = Math.min(params.limit ?? 60, 200);
  const skip = params.skip ?? 0;

  const filter: Record<string, any> = {};
  if (category) {
    filter.categories = category;
  }

  const creators = await OnlyFansCreator.find(filter)
    .sort({ scrapedAt: -1, _id: -1 })
    .skip(skip)
    .limit(limit)
    .select('_id name username slug avatar bio url categories gender price isFree likesCount')
    .lean();

  return JSON.parse(JSON.stringify({
    creators: (creators as any[]).map(c => ({
      _id: c._id.toString(),
      name: c.name || '',
      username: c.username || '',
      slug: c.slug || '',
      avatar: c.avatar || '',
      bio: (c.bio || '').slice(0, 150),
      url: c.url || '',
      categories: c.categories || [],
      gender: c.gender || 'unknown',
      price: c.price || 0,
      isFree: c.isFree || false,
      likesCount: c.likesCount || 0,
    })),
  }));
}

// ---------------------------------------------------------------------------
// Creators — search
// ---------------------------------------------------------------------------

export async function searchOFMCreators(token: string, q: string) {
  if (!(await authenticateAdmin(token))) throw new Error('Unauthorized');

  const trimmed = q?.trim();
  if (!trimmed || trimmed.length < 2) {
    return { creators: [] };
  }

  await connectDB();

  const isUrl = trimmed.startsWith('http');
  let filter: Record<string, any>;

  if (isUrl) {
    const username = trimmed.replace(/\/$/, '').split('/').pop() || '';
    filter = {
      $or: [
        { username: { $regex: `^${username}$`, $options: 'i' } },
        { slug: { $regex: `^${username}$`, $options: 'i' } },
        { url: { $regex: username, $options: 'i' } },
      ],
    };
  } else {
    filter = {
      $or: [
        { name: { $regex: trimmed, $options: 'i' } },
        { username: { $regex: trimmed, $options: 'i' } },
        { slug: { $regex: trimmed, $options: 'i' } },
      ],
    };
  }

  const creators = await OnlyFansCreator.find(filter)
    .sort({ clicks: -1 })
    .limit(15)
    .select('name username slug avatar bio categories url clicks likesCount price isFree')
    .lean();

  return JSON.parse(JSON.stringify({
    creators: creators.map((c: any) => ({ ...c, _id: c._id.toString() })),
  }));
}

// ---------------------------------------------------------------------------
// Creators — purge
// ---------------------------------------------------------------------------

const BLOCK_KEYWORDS = [
  'gay', 'male model', 'boy/boy', 'guy/guy', 'm4m', 'men only',
  'lgbt', 'lgbtq', 'lgbtq+', 'queer', 'bi male', 'bicurious',
  'bisexual', 'pansexual', 'bi 🏳️‍🌈', '🏳️‍🌈',
  'trans', 'trans girl', 'transgirl', 'tgirl', 't-girl', 'transgender',
  'shemale', 'she-male', 'tranny', 'ladyboy', 'lady boy',
  'femboy', 'fem boy', 'femboi', 'sissy', 'twink', 'bear',
  'crossdress', 'crossdresser', 'cross dresser', 'drag queen',
  'ftm', 'f2m', 'mtf', 'm2f', 'nonbinary', 'non-binary', 'enby', 'genderfluid',
  'boyfriend', 'husband', 'him', 'his', 'he/him', 'he / him',
  'he/they', 'he / they', 'they/them', 'they / them', 'him/they', 'him / they',
  'king', 'daddy', 'daddydom', 'alpha male',
  'cock', 'dick', 'bbc', 'bwc', 'hung',
  'male stripper', 'male escort', 'gay porn', 'gay for pay',
  'manly', 'muscleman', 'muscle man', 'jock', 'fratboy', 'frat boy',
  'boy next door', 'college boy', 'college guy', 'male content',
  'man on man', 'guy on guy', 'men on men', 'boy on boy',
  'for the ladies', 'for women', 'for her',
  'cuckold', 'bull', 'hotwife husband',
  'bi couple', 'gay couple', 'male couple',
  'prince', 'zaddy', 'sugar daddy',
];

const BLOCK_USERNAME_PREFIXES = [
  'gay', 'trans', 'femboy', 'sissy', 'twink', 'daddy',
  'king', 'prince', 'boy', 'guy', 'man', 'male', 'dude', 'bro',
];

export async function purgeOFMCreators(token: string) {
  if (!(await authenticateAdmin(token))) throw new Error('Unauthorized');
  await connectDB();

  const genderResult = await OnlyFansCreator.deleteMany({
    gender: { $nin: ['female'] },
  });

  const regexPattern = BLOCK_KEYWORDS.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const blockRegex = new RegExp(regexPattern, 'i');

  const bioResult = await OnlyFansCreator.deleteMany({
    $or: [
      { bio: { $regex: blockRegex } },
      { name: { $regex: blockRegex } },
    ],
  });

  const usernameRegex = new RegExp(
    `^(${BLOCK_USERNAME_PREFIXES.join('|')})$|^(${BLOCK_USERNAME_PREFIXES.join('|')})_|_(${BLOCK_USERNAME_PREFIXES.join('|')})$`,
    'i',
  );
  const usernameResult = await OnlyFansCreator.deleteMany({
    username: { $regex: usernameRegex },
  });

  const noAvatarResult = await OnlyFansCreator.deleteMany({
    $or: [
      { avatar: '' },
      { avatar: { $exists: false } },
    ],
  });

  const total =
    genderResult.deletedCount +
    bioResult.deletedCount +
    usernameResult.deletedCount +
    noAvatarResult.deletedCount;

  return JSON.parse(JSON.stringify({
    success: true,
    deleted: {
      nonFemaleGender: genderResult.deletedCount,
      blockedKeywordsInBioOrName: bioResult.deletedCount,
      blockedUsername: usernameResult.deletedCount,
      noAvatar: noAvatarResult.deletedCount,
      total,
    },
  }));
}

// ---------------------------------------------------------------------------
// Trending — list / create
// ---------------------------------------------------------------------------

export async function getOFMTrending(token: string) {
  if (!(await authenticateAdmin(token))) throw new Error('Unauthorized');
  await connectDB();

  const slots = await TrendingOFCreator.find().sort({ position: 1 }).lean();
  return JSON.parse(JSON.stringify(
    slots.map((s: any) => ({ ...s, _id: s._id.toString() })),
  ));
}

export async function createOFMTrendingSlot(
  token: string,
  data: {
    name: string;
    username: string;
    url: string;
    position: number;
    avatar?: string;
    bio?: string;
    categories?: string[];
    note?: string;
    dealPrice?: number;
    active?: boolean;
    clickBudget?: number;
    dailyClickCap?: number;
    isStarPick?: boolean;
  },
) {
  if (!(await authenticateAdmin(token))) throw new Error('Unauthorized');
  await connectDB();

  const { name, username, avatar, url, bio, categories, position, note, dealPrice, active, clickBudget, dailyClickCap, isStarPick } = data;

  if (!name || !username || !url || !position) {
    throw new Error('name, username, url, and position are required');
  }
  if (position < 1 || position > 12) {
    throw new Error('position must be 1–12');
  }

  await TrendingOFCreator.findOneAndDelete({ position });

  const creator = await TrendingOFCreator.create({
    name, username,
    avatar: avatar || '',
    url,
    bio: bio || '',
    categories: categories || [],
    position,
    note: note || '',
    dealPrice: dealPrice || 0,
    active: active !== false,
    clicks: 0,
    clickBudget: clickBudget || 0,
    dailyClickCap: dailyClickCap || 0,
    isStarPick: isStarPick === true,
  });

  return JSON.parse(JSON.stringify({
    creator: { ...creator.toObject(), _id: creator._id.toString() },
  }));
}

// ---------------------------------------------------------------------------
// Trending — update / delete
// ---------------------------------------------------------------------------

export async function updateOFMTrending(token: string, id: string, data: Record<string, any>) {
  if (!(await authenticateAdmin(token))) throw new Error('Unauthorized');
  await connectDB();

  const allowed = ['name', 'username', 'avatar', 'url', 'bio', 'categories', 'active', 'note', 'dealPrice', 'clickBudget', 'dailyClickCap', 'isStarPick'];
  const update: Record<string, any> = {};
  for (const key of allowed) {
    if (key in data) update[key] = data[key];
  }

  const creator = await TrendingOFCreator.findByIdAndUpdate(
    id,
    { $set: update },
    { new: true, runValidators: true },
  ).lean();

  if (!creator) throw new Error('Not found');
  return JSON.parse(JSON.stringify({
    creator: { ...(creator as any), _id: (creator as any)._id.toString() },
  }));
}

export async function resetTrendingClicks(token: string, id: string) {
  if (!(await authenticateAdmin(token))) throw new Error('Unauthorized');
  await connectDB();
  await TrendingOFCreator.findByIdAndUpdate(id, { $set: { clicks: 0 } });
  await TrendingClickDaily.deleteMany({ creatorId: id });
  return { success: true };
}

export async function getTrendingDailyClicks(token: string) {
  if (!(await authenticateAdmin(token))) throw new Error('Unauthorized');
  await connectDB();

  // Auto-backfill: if no daily rows exist yet but creators have clicks,
  // seed today with each creator's existing total so the chart isn't empty.
  const dailyCount = await TrendingClickDaily.countDocuments();
  if (dailyCount === 0) {
    const allCreators = await TrendingOFCreator.find({ clicks: { $gt: 0 } }, '_id clicks createdAt').lean() as any[];
    if (allCreators.length > 0) {
      const ops = allCreators.map((c: any) => ({
        updateOne: {
          filter: { creatorId: c._id, date: (c.createdAt ?? new Date()).toISOString().slice(0, 10) },
          update: { $set: { clicks: c.clicks } },
          upsert: true,
        },
      }));
      await TrendingClickDaily.bulkWrite(ops);
    }
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const sinceDate = thirtyDaysAgo.toISOString().slice(0, 10);

  const rows = await TrendingClickDaily.find({ date: { $gte: sinceDate } })
    .sort({ date: 1 })
    .lean();

  const byDay: Record<string, number> = {};
  for (const r of rows as any[]) {
    byDay[r.date] = (byDay[r.date] || 0) + r.clicks;
  }

  const result: { date: string; clicks: number }[] = [];
  const d = new Date(sinceDate);
  const today = new Date().toISOString().slice(0, 10);
  while (d.toISOString().slice(0, 10) <= today) {
    const ds = d.toISOString().slice(0, 10);
    result.push({ date: ds, clicks: byDay[ds] || 0 });
    d.setDate(d.getDate() + 1);
  }

  return result;
}

export async function deleteOFMTrending(token: string, id: string) {
  if (!(await authenticateAdmin(token))) throw new Error('Unauthorized');
  await connectDB();

  const result = await TrendingOFCreator.findByIdAndDelete(id);
  if (!result) throw new Error('Not found');
  return { success: true };
}
