'use server';

import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import { User, Post, CreatorReview } from '@/lib/models';

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

export async function getReviews(token: string) {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');

  await connectDB();
  const [groupReviews, creatorRevs] = await Promise.all([
    Post.find({})
      .populate('groupId', 'name category')
      .populate('reviewedBy', 'username')
      .sort({ createdAt: -1 })
      .lean(),
    CreatorReview.find({}).sort({ createdAt: -1 }).lean(),
  ]);

  const mapped = groupReviews.map((review: any) => ({
    _id: review._id.toString(),
    type: 'group' as const,
    content: review.content,
    rating: review.rating,
    authorName: review.authorName,
    status: review.status,
    createdAt: review.createdAt,
    reviewedAt: review.reviewedAt,
    groupId: review.groupId
      ? { _id: review.groupId._id.toString(), name: review.groupId.name, category: review.groupId.category }
      : null,
    creatorSlug: null as string | null,
    reviewedBy: review.reviewedBy ? { username: review.reviewedBy.username } : null,
  }));

  const creatorMapped = creatorRevs.map((r: any) => ({
    _id: r._id.toString(),
    type: 'creator' as const,
    content: r.content || '',
    rating: r.rating,
    authorName: r.authorName || 'Anonymous',
    status: r.status,
    createdAt: r.createdAt,
    reviewedAt: null,
    groupId: null,
    creatorSlug: r.creatorSlug as string,
    reviewedBy: null,
  }));

  return [...mapped, ...creatorMapped].sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function updateReview(
  token: string,
  id: string,
  data: { content?: string; rating?: number; authorName?: string; status?: string; type?: string },
) {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');
  if (data.status && !['pending', 'approved', 'rejected'].includes(data.status)) throw new Error('Invalid status');
  if (data.rating !== undefined && (data.rating < 1 || data.rating > 5)) throw new Error('Rating must be 1-5');

  await connectDB();
  const updateData: any = {};
  if (data.content !== undefined) updateData.content = data.content;
  if (data.rating !== undefined) updateData.rating = data.rating;
  if (data.authorName !== undefined) updateData.authorName = data.authorName;
  if (data.status !== undefined) {
    updateData.status = data.status;
    updateData.reviewedBy = admin._id;
    updateData.reviewedAt = new Date();
  }

  if (data.type === 'creator') {
    const review = await CreatorReview.findByIdAndUpdate(id, updateData, { new: true }).lean();
    if (!review) throw new Error('Review not found');
  } else {
    const review = await Post.findByIdAndUpdate(id, updateData, { new: true }).lean();
    if (!review) throw new Error('Review not found');
  }
  return { success: true };
}

export async function deleteReview(token: string, id: string, type?: string) {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');

  await connectDB();
  if (type === 'creator') {
    const review = await CreatorReview.findByIdAndDelete(id);
    if (!review) throw new Error('Review not found');
  } else {
    const review = await Post.findByIdAndDelete(id);
    if (!review) throw new Error('Review not found');
  }
  return { success: true };
}

// ── Creator Reviews (OnlyFans) ──

export async function getCreatorReviewsAdmin(token: string) {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');

  await connectDB();
  const reviews = await CreatorReview.find({}).sort({ createdAt: -1 }).lean();

  return reviews.map((r: any) => ({
    _id: r._id.toString(),
    creatorSlug: r.creatorSlug,
    authorName: r.authorName || 'Anonymous',
    content: r.content || '',
    rating: r.rating,
    status: r.status,
    createdAt: r.createdAt,
  }));
}

export async function updateCreatorReview(
  token: string,
  id: string,
  data: { status?: string; content?: string; rating?: number },
) {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');
  if (data.status && !['pending', 'approved', 'rejected'].includes(data.status)) throw new Error('Invalid status');

  await connectDB();
  const update: any = {};
  if (data.status !== undefined) update.status = data.status;
  if (data.content !== undefined) update.content = data.content;
  if (data.rating !== undefined) update.rating = data.rating;

  const review = await CreatorReview.findByIdAndUpdate(id, update, { new: true }).lean();
  if (!review) throw new Error('Review not found');
  return { success: true };
}

export async function deleteCreatorReview(token: string, id: string) {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');

  await connectDB();
  const review = await CreatorReview.findByIdAndDelete(id);
  if (!review) throw new Error('Review not found');
  return { success: true };
}
