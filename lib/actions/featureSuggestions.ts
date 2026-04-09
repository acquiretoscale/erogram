'use server';

import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import { FeatureSuggestion, User } from '@/lib/models';

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';

function getUserId(token: string): string | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return decoded?.id || decoded?.userId || null;
  } catch { return null; }
}

export async function submitSuggestion(token: string, title: string, description: string) {
  try {
    const userId = getUserId(token);
    if (!userId) return { error: 'Not authenticated' };
    if (!title?.trim()) return { error: 'Title is required' };
    if (title.length > 120) return { error: 'Title too long' };

    await connectDB();
    const user = await User.findById(userId).select('username').lean();
    if (!user) return { error: 'User not found' };

    const suggestion = await FeatureSuggestion.create({
      userId,
      username: (user as any).username,
      title: title.trim(),
      description: description?.trim() || '',
      upvotes: [userId],
      upvoteCount: 1,
    });

    return { ok: true, id: suggestion._id.toString() };
  } catch (e: any) {
    console.error('[submitSuggestion] Error:', e);
    return { error: e?.message || 'Server error' };
  }
}

export async function toggleUpvote(token: string, suggestionId: string) {
  const userId = getUserId(token);
  if (!userId) return { error: 'Not authenticated' };

  await connectDB();
  const s = await FeatureSuggestion.findById(suggestionId);
  if (!s) return { error: 'Not found' };

  const already = s.upvotes.some((id: any) => id.toString() === userId);
  if (already) {
    s.upvotes = s.upvotes.filter((id: any) => id.toString() !== userId);
  } else {
    s.upvotes.push(userId);
  }
  s.upvoteCount = s.upvotes.length;
  await s.save();

  return { ok: true, upvoteCount: s.upvoteCount, voted: !already };
}

export async function getSuggestions(token: string | null, page = 1, sort: 'top' | 'new' = 'top') {
  await connectDB();
  const userId = token ? getUserId(token) : null;
  const limit = 20;
  const skip = (page - 1) * limit;

  const sortObj: Record<string, 1 | -1> = sort === 'new' ? { createdAt: -1 } : { upvoteCount: -1, createdAt: -1 };

  const [items, total] = await Promise.all([
    FeatureSuggestion.find().sort(sortObj).skip(skip).limit(limit).lean(),
    FeatureSuggestion.countDocuments(),
  ]);

  return {
    suggestions: items.map((s: any) => ({
      _id: s._id.toString(),
      title: s.title,
      description: s.description,
      username: s.username,
      status: s.status,
      upvoteCount: s.upvoteCount,
      voted: userId ? s.upvotes.some((id: any) => id.toString() === userId) : false,
      createdAt: s.createdAt.toISOString(),
    })),
    total,
    hasMore: skip + items.length < total,
  };
}

export async function getAdminSuggestions(token: string) {
  const userId = getUserId(token);
  if (!userId) return { error: 'Not authenticated' };

  await connectDB();
  const user = await User.findById(userId).select('isAdmin').lean();
  if (!(user as any)?.isAdmin) return { error: 'Not authorized' };

  const items = await FeatureSuggestion.find()
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  return items.map((s: any) => ({
    _id: s._id.toString(),
    title: s.title,
    description: s.description,
    username: s.username,
    status: s.status,
    upvoteCount: s.upvoteCount,
    createdAt: s.createdAt.toISOString(),
  }));
}

export async function deleteSuggestion(token: string, suggestionId: string) {
  const userId = getUserId(token);
  if (!userId) return { error: 'Not authenticated' };

  await connectDB();
  const user = await User.findById(userId).select('isAdmin').lean();
  if (!(user as any)?.isAdmin) return { error: 'Not authorized' };

  await FeatureSuggestion.findByIdAndDelete(suggestionId);
  return { ok: true };
}

export async function updateSuggestionStatus(token: string, suggestionId: string, status: string) {
  const userId = getUserId(token);
  if (!userId) return { error: 'Not authenticated' };

  await connectDB();
  const user = await User.findById(userId).select('isAdmin').lean();
  if (!(user as any)?.isAdmin) return { error: 'Not authorized' };

  await FeatureSuggestion.findByIdAndUpdate(suggestionId, { status });
  return { ok: true };
}
