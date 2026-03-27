'use server';

import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import { User, Bot, Group } from '@/lib/models';
import { sendNewBotTelegramNotification } from '@/lib/utils/telegramNotify';
import { pingIndexNow } from '@/lib/utils/indexNow';

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';

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
