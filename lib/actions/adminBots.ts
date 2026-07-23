'use server';

import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import { User, Bot, Group } from '@/lib/models';
import { sendNewBotTelegramNotification } from '@/lib/utils/telegramNotify';
import { pingIndexNow } from '@/lib/utils/indexNow';

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';

const BOOST_DURATION_MS: Record<string, number> = {
  '1d': 1 * 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '14d': 14 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
};

export type BotBoostDuration = '1d' | '7d' | '14d' | '30d' | 'lifetime';

async function expireStaleBotBoosts() {
  const now = new Date();
  await Bot.updateMany(
    { boosted: true, boostExpiresAt: { $ne: null, $lte: now } },
    { $set: { boosted: false, boostExpiresAt: null, boostDuration: null, featured: false } }
  );
}

async function authenticateAdmin(token: string) {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    await connectDB();
    const user = await User.findById(decoded.id);
    if (user && user.isAdmin) return user;
  } catch {
    return null;
  }
  return null;
}

export async function getBots(token: string, search?: string) {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');

  await connectDB();
  await expireStaleBotBoosts();

  let query: any = {};
  if (search) {
    query = {
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { categories: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { country: { $regex: search, $options: 'i' } },
      ],
    };
  }

  const bots = await Bot.find(query).sort({ createdAt: -1 }).lean();

  const now = new Date();
  const todayKey = now.toISOString().slice(0, 10);
  const last7dKeys: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    last7dKeys.push(d.toISOString().slice(0, 10));
  }

  const enriched = (bots as any[]).map((b) => {
    const dayMap: Record<string, number> =
      b.clickCountByDay instanceof Map
        ? Object.fromEntries(b.clickCountByDay)
        : b.clickCountByDay || {};
    const clicks24h = dayMap[todayKey] || 0;
    const clicks7d = last7dKeys.reduce((s, k) => s + (dayMap[k] || 0), 0);
    return { ...b, clicks24h, clicks7d };
  });

  return JSON.parse(JSON.stringify(enriched));
}

export async function setBotBoost(
  token: string,
  botId: string,
  boosted: boolean,
  boostDuration?: BotBoostDuration
) {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');

  await connectDB();
  await expireStaleBotBoosts();

  const bot = await Bot.findById(botId);
  if (!bot) throw new Error('Bot not found');
  if (bot.status !== 'approved') throw new Error('Bot must be approved before boosting');

  if (boosted) {
    const duration = boostDuration || '7d';
    const now = new Date();
    bot.boosted = true;
    bot.boostDuration = duration;
    if (duration === 'lifetime') {
      bot.boostExpiresAt = null;
    } else {
      bot.boostExpiresAt = new Date(now.getTime() + (BOOST_DURATION_MS[duration] || BOOST_DURATION_MS['7d']));
    }
    bot.featured = true;
    bot.featuredAt = bot.featuredAt || now;
  } else {
    bot.boosted = false;
    bot.boostExpiresAt = null;
    bot.boostDuration = null;
    if (!bot.paidBoost) bot.featured = false;
  }

  bot.reviewedBy = admin._id;
  bot.reviewedAt = new Date();
  try {
    await bot.save();
  } catch (err: any) {
    if (err?.name === 'ValidationError') {
      const msg = err.message || 'Validation failed';
      throw new Error(msg.includes('boostDuration') ? 'Boost save failed — restart dev server if Lifetime was just added.' : msg);
    }
    throw err;
  }

  return JSON.parse(JSON.stringify(bot));
}

export async function updateBot(token: string, id: string, data: Record<string, any>) {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');

  await connectDB();

  const bot = await Bot.findById(id);
  if (!bot) throw new Error('Bot not found');

  const oldStatus = bot.status;

  Object.assign(bot, data);
  bot.reviewedBy = admin._id;
  bot.reviewedAt = new Date();
  if (oldStatus !== 'approved' && bot.status === 'approved') {
    bot.publishedAt = new Date();
  }
  await bot.save();

  if (oldStatus === 'pending' && bot.status === 'approved') {
    try {
      await sendNewBotTelegramNotification(bot);
    } catch (err) {
      console.error('Failed to send Telegram notification:', err);
    }
    pingIndexNow(`https://erogram.pro/${bot.slug}`);
  }

  return JSON.parse(JSON.stringify(bot));
}

export async function deleteBot(token: string, id: string) {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');

  await connectDB();
  const bot = await Bot.findByIdAndDelete(id);
  if (!bot) throw new Error('Bot not found');
  return { success: true };
}

export async function moveBotToGroup(token: string, id: string) {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');

  await connectDB();

  const bot = (await Bot.findById(id).lean()) as any;
  if (!bot) throw new Error('Bot not found');

  let slug = bot.slug as string;
  const existing = await Group.findOne({ slug });
  if (existing) {
    slug = `${slug}-group`;
  }

  const group = await Group.create({
    name: bot.name,
    slug,
    category: bot.category || '',
    country: bot.country || '',
    categories: bot.categories || [],
    telegramLink: bot.telegramLink,
    description: bot.description,
    description_de: bot.description_de || '',
    description_es: bot.description_es || '',
    image: bot.image || '/assets/image.jpg',
    createdBy: bot.createdBy,
    createdByUsername: bot.createdByUsername || '',
    status: bot.status || 'pending',
    views: bot.views || 0,
    clickCount: bot.clickCount || 0,
    memberCount: bot.memberCount || 0,
    createdAt: bot.createdAt,
  });

  await Bot.findByIdAndDelete(id);

  return JSON.parse(
    JSON.stringify({
      message: 'Moved to groups successfully',
      groupId: group._id,
      slug: group.slug,
    })
  );
}
