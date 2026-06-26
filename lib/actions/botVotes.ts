'use server';

import connectDB from '@/lib/db/mongodb';
import { BotStats, Bot } from '@/lib/models';

export interface BotStatsData {
  upvotes: number;
  downvotes: number;
}

export interface BlogTopBot {
  slug: string;
  name: string;
  image: string;
  upvotes: number;
  score: number;
}

/** Top Telegram bots for the blog hub — trending (topBot/boosted) first, ranked by upvote score. */
export async function getTopBotsForBlog(limit = 5): Promise<BlogTopBot[]> {
  try {
    await connectDB();
    const now = new Date();
    const candidates = (await Bot.find(
      {
        status: 'approved',
        isAdvertisement: { $ne: true },
        $or: [{ topBot: true }, { boosted: true, boostExpiresAt: { $gt: now } }, { pinned: true }],
      },
      { slug: 1, name: 1, image: 1 },
    )
      .limit(60)
      .lean()) as any[];

    // Fallback to most-clicked approved bots if no trending ones exist.
    let rows = candidates;
    if (rows.length < limit) {
      rows = (await Bot.find(
        { status: 'approved', isAdvertisement: { $ne: true } },
        { slug: 1, name: 1, image: 1 },
      )
        .sort({ clickCount: -1 })
        .limit(60)
        .lean()) as any[];
    }

    const slugs = rows.map((b) => b.slug);
    const statsMap = await getAllBotStats(slugs);

    return rows
      .map((b) => {
        const s = statsMap[b.slug] || { upvotes: 0, downvotes: 0 };
        return {
          slug: b.slug,
          name: b.name,
          image: b.image && (b.image.startsWith('http') || b.image.startsWith('/')) ? b.image : '/assets/image.jpg',
          upvotes: s.upvotes || 0,
          score: (s.upvotes || 0) - (s.downvotes || 0),
        };
      })
      .sort((a, b) => b.score - a.score || b.upvotes - a.upvotes)
      .slice(0, limit);
  } catch (e) {
    console.error('[botVotes] getTopBotsForBlog failed:', e);
    return [];
  }
}

export async function getBotStats(slug: string): Promise<BotStatsData> {
  await connectDB();
  const doc = (await BotStats.findOne({ slug }).lean()) as any;
  if (!doc) return { upvotes: 0, downvotes: 0 };
  return { upvotes: doc.upvotes || 0, downvotes: doc.downvotes || 0 };
}

export async function getAllBotStats(slugs: string[]): Promise<Record<string, BotStatsData>> {
  await connectDB();
  const docs = (await BotStats.find({ slug: { $in: slugs } }).lean()) as any[];
  const map: Record<string, BotStatsData> = {};
  for (const doc of docs) {
    map[doc.slug] = { upvotes: doc.upvotes || 0, downvotes: doc.downvotes || 0 };
  }
  return map;
}

export async function voteOnBot(slug: string, direction: 'up' | 'down'): Promise<{ upvotes: number; downvotes: number }> {
  await connectDB();
  const field = direction === 'up' ? 'upvotes' : 'downvotes';
  const doc = (await BotStats.findOneAndUpdate(
    { slug },
    { $inc: { [field]: 1 } },
    { upsert: true, new: true },
  ).lean()) as any;
  return { upvotes: doc.upvotes || 0, downvotes: doc.downvotes || 0 };
}

export async function unvoteOnBot(slug: string, direction: 'up' | 'down'): Promise<{ upvotes: number; downvotes: number }> {
  await connectDB();
  const field = direction === 'up' ? 'upvotes' : 'downvotes';
  const doc = (await BotStats.findOneAndUpdate(
    { slug },
    { $inc: { [field]: -1 } },
    { upsert: true, new: true },
  ).lean()) as any;
  return {
    upvotes: Math.max(0, doc.upvotes || 0),
    downvotes: Math.max(0, doc.downvotes || 0),
  };
}
