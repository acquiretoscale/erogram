'use server';

import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import { ArticleComment, User } from '@/lib/models';

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';

export interface ArticleCommentData {
  _id: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  createdAt: string;
}

/** Approved comments for one article (newest first) + total count. */
export async function getArticleComments(slug: string): Promise<{ comments: ArticleCommentData[]; count: number }> {
  try {
    await connectDB();
    const rows = await ArticleComment.find({ articleSlug: slug, status: 'approved' })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('author', 'username photoUrl')
      .lean() as any[];

    const comments = rows.map((r: any) => ({
      _id: r._id.toString(),
      authorName: r.author?.username || r.authorName || 'Anonymous',
      authorAvatar: r.author?.photoUrl || '',
      content: r.content || '',
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : '',
    }));
    return { comments, count: comments.length };
  } catch (e) {
    console.error('[comments] getArticleComments failed:', e);
    return { comments: [], count: 0 };
  }
}

/** Approved comment counts for many slugs at once (for blog cards). */
export async function getArticleCommentCounts(slugs: string[]): Promise<Record<string, number>> {
  try {
    if (!slugs.length) return {};
    await connectDB();
    const rows = await ArticleComment.aggregate([
      { $match: { articleSlug: { $in: slugs }, status: 'approved' } },
      { $group: { _id: '$articleSlug', count: { $sum: 1 } } },
    ]);
    const map: Record<string, number> = {};
    rows.forEach((r: any) => { map[r._id] = r.count; });
    return map;
  } catch (e) {
    console.error('[comments] getArticleCommentCounts failed:', e);
    return {};
  }
}

/** Submit a comment (goes to moderation queue as 'pending'). */
export async function submitArticleComment(slug: string, content: string, guestName: string, token: string) {
  const text = (content || '').trim();
  if (text.length < 2) throw new Error('Comment is too short');
  if (text.length > 1000) throw new Error('Comment is too long (max 1000 characters)');

  let userId: string | null = null;
  let username = (guestName || '').trim().slice(0, 40) || 'Anonymous';
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      await connectDB();
      const user = await User.findById(decoded.id).select('username').lean() as any;
      if (user) {
        userId = user._id.toString();
        username = user.username;
      }
    } catch { /* invalid token — treat as guest */ }
  }

  await connectDB();
  const comment = await ArticleComment.create({
    articleSlug: slug,
    author: userId,
    authorName: username,
    content: text,
    status: 'pending',
  });

  return { _id: comment._id.toString() };
}
