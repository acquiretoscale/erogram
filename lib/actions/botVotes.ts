'use server';

import connectDB from '@/lib/db/mongodb';
import { BotStats } from '@/lib/models';

export interface BotStatsData {
  upvotes: number;
  downvotes: number;
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
