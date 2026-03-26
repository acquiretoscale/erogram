'use server';

import connectDB from '@/lib/db/mongodb';
import { AINsfwToolStats } from '@/lib/models';

export interface ToolStatsData {
  upvotes: number;
  downvotes: number;
  reviews: { text: string; rating: number; createdAt: string }[];
}

export async function getToolStats(slug: string): Promise<ToolStatsData> {
  await connectDB();
  const doc = await AINsfwToolStats.findOne({ slug }).lean() as any;
  if (!doc) return { upvotes: 0, downvotes: 0, reviews: [] };
  return {
    upvotes: doc.upvotes || 0,
    downvotes: doc.downvotes || 0,
    reviews: (doc.reviews || []).map((r: any) => ({
      text: r.text,
      rating: r.rating,
      createdAt: r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '',
    })),
  };
}

export async function getAllToolStats(slugs: string[]): Promise<Record<string, ToolStatsData>> {
  await connectDB();
  const docs = await AINsfwToolStats.find({ slug: { $in: slugs } }).lean() as any[];
  const map: Record<string, ToolStatsData> = {};
  for (const doc of docs) {
    map[doc.slug] = {
      upvotes: doc.upvotes || 0,
      downvotes: doc.downvotes || 0,
      reviews: (doc.reviews || []).map((r: any) => ({
        text: r.text,
        rating: r.rating,
        createdAt: r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '',
      })),
    };
  }
  return map;
}

export async function voteOnTool(slug: string, direction: 'up' | 'down'): Promise<{ upvotes: number; downvotes: number }> {
  await connectDB();
  const field = direction === 'up' ? 'upvotes' : 'downvotes';
  const doc = await AINsfwToolStats.findOneAndUpdate(
    { slug },
    { $inc: { [field]: 1 } },
    { upsert: true, new: true },
  ).lean() as any;
  return { upvotes: doc.upvotes || 0, downvotes: doc.downvotes || 0 };
}

export async function unvoteOnTool(slug: string, direction: 'up' | 'down'): Promise<{ upvotes: number; downvotes: number }> {
  await connectDB();
  const field = direction === 'up' ? 'upvotes' : 'downvotes';
  const doc = await AINsfwToolStats.findOneAndUpdate(
    { slug },
    { $inc: { [field]: -1 } },
    { upsert: true, new: true },
  ).lean() as any;
  const upvotes = Math.max(0, doc.upvotes || 0);
  const downvotes = Math.max(0, doc.downvotes || 0);
  return { upvotes, downvotes };
}

export async function submitReview(slug: string, text: string, rating: number): Promise<ToolStatsData> {
  if (!text.trim() || rating < 1 || rating > 5) throw new Error('Invalid review');
  await connectDB();
  const doc = await AINsfwToolStats.findOneAndUpdate(
    { slug },
    {
      $push: {
        reviews: {
          $each: [{ text: text.trim().slice(0, 1000), rating, createdAt: new Date() }],
          $position: 0,
          $slice: 100,
        },
      },
    },
    { upsert: true, new: true },
  ).lean() as any;
  return {
    upvotes: doc.upvotes || 0,
    downvotes: doc.downvotes || 0,
    reviews: (doc.reviews || []).map((r: any) => ({
      text: r.text,
      rating: r.rating,
      createdAt: r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '',
    })),
  };
}
