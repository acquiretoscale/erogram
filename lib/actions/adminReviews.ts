'use server';

import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import { User, Post } from '@/lib/models';

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
  const reviews = await Post.find({})
    .populate('groupId', 'name category')
    .populate('reviewedBy', 'username')
    .sort({ createdAt: -1 })
    .lean();

  return reviews.map((review: any) => ({
    _id: review._id.toString(),
    content: review.content,
    rating: review.rating,
    authorName: review.authorName,
    status: review.status,
    createdAt: review.createdAt,
    reviewedAt: review.reviewedAt,
    groupId: review.groupId
      ? { _id: review.groupId._id.toString(), name: review.groupId.name, category: review.groupId.category }
      : null,
    reviewedBy: review.reviewedBy ? { username: review.reviewedBy.username } : null,
  }));
}

export async function updateReview(
  token: string,
  id: string,
  data: { content?: string; rating?: number; authorName?: string; status?: string },
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

  const review = await Post.findByIdAndUpdate(id, updateData, { new: true }).lean();
  if (!review) throw new Error('Review not found');
  return { success: true };
}

export async function deleteReview(token: string, id: string) {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');

  await connectDB();
  const review = await Post.findByIdAndDelete(id);
  if (!review) throw new Error('Review not found');
  return { success: true };
}
