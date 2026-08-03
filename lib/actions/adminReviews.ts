'use server';

import jwt from 'jsonwebtoken';
import { revalidatePath } from 'next/cache';
import connectDB from '@/lib/db/mongodb';
import {
  User,
  Post,
  CreatorReview,
  ArticleComment,
  AINsfwToolStats,
  ProfileFeedComment,
} from '@/lib/models';
import { invertToolSlug } from '@/app/ainsfw/data';

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';
const AINSFW_ID_PREFIX = 'ainsfw:';

function slugQuery(slug: string): string | { $in: string[] } {
  const alt = invertToolSlug(slug);
  return alt && alt !== slug ? { $in: [slug, alt] } : slug;
}

function ainsfwReviewId(slug: string, idx: number) {
  return `${AINSFW_ID_PREFIX}${encodeURIComponent(slug)}:${idx}`;
}

function parseAinsfwReviewId(id: string): { slug: string; idx: number } | null {
  if (!id.startsWith(AINSFW_ID_PREFIX)) return null;
  const rest = id.slice(AINSFW_ID_PREFIX.length);
  const lastColon = rest.lastIndexOf(':');
  if (lastColon < 0) return null;
  const slug = decodeURIComponent(rest.slice(0, lastColon));
  const idx = parseInt(rest.slice(lastColon + 1), 10);
  if (Number.isNaN(idx)) return null;
  return { slug, idx };
}

async function authenticateAdmin(token: string) {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id?: string };
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
  const [groupReviews, creatorRevs, articleComments, ainsfwDocs, feedComments] = await Promise.all([
    Post.find({})
      .populate('groupId', 'name category slug')
      .populate('reviewedBy', 'username')
      .sort({ createdAt: -1 })
      .lean(),
    CreatorReview.find({}).sort({ createdAt: -1 }).lean(),
    ArticleComment.find({}).sort({ createdAt: -1 }).lean(),
    AINsfwToolStats.find({ 'reviews.0': { $exists: true } }).lean(),
    ProfileFeedComment.find({})
      .populate('creatorId', 'name username slug')
      .sort({ createdAt: -1 })
      .lean(),
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
      ? {
          _id: review.groupId._id.toString(),
          name: review.groupId.name,
          category: review.groupId.category,
          slug: review.groupId.slug,
        }
      : null,
    creatorSlug: null as string | null,
    reviewedBy: review.reviewedBy ? { username: review.reviewedBy.username } : null,
  }));

  const creatorMapped = creatorRevs.map((r: any) => ({
    _id: r._id.toString(),
    type: 'creator' as const,
    content: r.content || '',
    rating: r.rating,
    authorName: r.authorName || 'Member',
    status: r.status,
    createdAt: r.createdAt,
    reviewedAt: null,
    groupId: null,
    creatorSlug: r.creatorSlug as string,
    reviewedBy: null,
  }));

  const articleMapped = articleComments.map((r: any) => ({
    _id: r._id.toString(),
    type: 'article' as const,
    content: r.content || '',
    rating: 0,
    authorName: r.authorName || 'Member',
    status: r.status,
    createdAt: r.createdAt,
    reviewedAt: null,
    groupId: null,
    creatorSlug: null as string | null,
    articleSlug: r.articleSlug as string,
    reviewedBy: null,
  }));

  const ainsfwMapped: any[] = [];
  for (const doc of ainsfwDocs as any[]) {
    (doc.reviews || []).forEach((r: any, idx: number) => {
      ainsfwMapped.push({
        _id: ainsfwReviewId(doc.slug, idx),
        type: 'ainsfw' as const,
        content: r.text || '',
        rating: r.rating,
        authorName: r.authorName || 'Member',
        status: r.status || 'approved',
        createdAt: r.createdAt || doc.updatedAt,
        reviewedAt: null,
        groupId: null,
        creatorSlug: null,
        ainsfwSlug: doc.slug as string,
        reviewIdx: idx,
        reviewedBy: null,
      });
    });
  }

  const feedMapped = (feedComments as any[]).map((r) => ({
    _id: r._id.toString(),
    type: 'feed' as const,
    content: r.content || '',
    rating: 0,
    authorName: r.authorName || 'Member',
    status: r.status,
    createdAt: r.createdAt,
    reviewedAt: null,
    groupId: null,
    creatorSlug: r.creatorId?.slug || r.creatorId?.username || null,
    creatorName: r.creatorId?.name || null,
    mediaKey: r.mediaKey as string,
    reviewedBy: null,
  }));

  return [...mapped, ...creatorMapped, ...articleMapped, ...ainsfwMapped, ...feedMapped].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
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
  if (data.rating !== undefined && data.rating > 0 && (data.rating < 1 || data.rating > 5)) {
    throw new Error('Rating must be 1-5');
  }

  await connectDB();

  if (data.type === 'ainsfw') {
    const parsed = parseAinsfwReviewId(id);
    if (!parsed) throw new Error('Invalid review id');
    const doc = await AINsfwToolStats.findOne({ slug: slugQuery(parsed.slug) });
    if (!doc?.reviews || parsed.idx < 0 || parsed.idx >= doc.reviews.length) {
      throw new Error('Review not found');
    }
    const review = doc.reviews[parsed.idx];
    if (data.content !== undefined) review.text = data.content;
    if (data.rating !== undefined) review.rating = data.rating;
    if (data.authorName !== undefined) review.authorName = data.authorName;
    if (data.status !== undefined) review.status = data.status;
    await doc.save();
    revalidatePath(`/ainsfw/${doc.slug}`);
    return { success: true };
  }

  if (data.type === 'feed') {
    const updateData: Record<string, unknown> = {};
    if (data.content !== undefined) updateData.content = data.content;
    if (data.authorName !== undefined) updateData.authorName = data.authorName;
    if (data.status !== undefined) updateData.status = data.status;
    const comment = await ProfileFeedComment.findByIdAndUpdate(id, updateData, { new: true })
      .populate('creatorId', 'slug')
      .lean();
    if (!comment) throw new Error('Comment not found');
    const slug = (comment as any).creatorId?.slug;
    if (slug) revalidatePath(`/onlyfanssearch/${slug}`);
    return { success: true };
  }

  const updateData: Record<string, unknown> = {};
  if (data.content !== undefined) updateData.content = data.content;
  if (data.rating !== undefined) updateData.rating = data.rating;
  if (data.authorName !== undefined) updateData.authorName = data.authorName;
  if (data.status !== undefined) {
    updateData.status = data.status;
    updateData.reviewedBy = admin._id;
    updateData.reviewedAt = new Date();
  }

  if (data.type === 'article') {
    const comment = await ArticleComment.findByIdAndUpdate(id, updateData, { new: true }).lean();
    if (!comment) throw new Error('Comment not found');
    if ((comment as any).articleSlug) revalidatePath(`/blog/${(comment as any).articleSlug}`);
  } else if (data.type === 'creator') {
    const review = await CreatorReview.findByIdAndUpdate(id, updateData, { new: true }).lean();
    if (!review) throw new Error('Review not found');
    if ((review as any).creatorSlug) revalidatePath(`/onlyfanssearch/${(review as any).creatorSlug}`);
  } else {
    const review = await Post.findByIdAndUpdate(id, updateData, { new: true })
      .populate('groupId', 'slug')
      .lean();
    if (!review) throw new Error('Review not found');
    const slug = (review as any).groupId?.slug;
    if (slug) revalidatePath(`/${slug}`);
  }
  return { success: true };
}

export async function deleteReview(token: string, id: string, type?: string) {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');

  await connectDB();

  if (type === 'ainsfw') {
    const parsed = parseAinsfwReviewId(id);
    if (!parsed) throw new Error('Invalid review id');
    const doc = await AINsfwToolStats.findOne({ slug: slugQuery(parsed.slug) });
    if (!doc?.reviews || parsed.idx < 0 || parsed.idx >= doc.reviews.length) {
      throw new Error('Review not found');
    }
    doc.reviews.splice(parsed.idx, 1);
    await doc.save();
    revalidatePath(`/ainsfw/${doc.slug}`);
    return { success: true };
  }

  if (type === 'feed') {
    const comment = await ProfileFeedComment.findByIdAndDelete(id).populate('creatorId', 'slug');
    if (!comment) throw new Error('Comment not found');
    const slug = (comment as any).creatorId?.slug;
    if (slug) revalidatePath(`/onlyfanssearch/${slug}`);
    return { success: true };
  }

  if (type === 'article') {
    const comment = await ArticleComment.findByIdAndDelete(id);
    if (!comment) throw new Error('Comment not found');
    if ((comment as any).articleSlug) revalidatePath(`/blog/${(comment as any).articleSlug}`);
  } else if (type === 'creator') {
    const review = await CreatorReview.findByIdAndDelete(id);
    if (!review) throw new Error('Review not found');
    if ((review as any).creatorSlug) revalidatePath(`/onlyfanssearch/${(review as any).creatorSlug}`);
  } else {
    const review = await Post.findByIdAndDelete(id).populate('groupId', 'slug');
    if (!review) throw new Error('Review not found');
    const slug = (review as any).groupId?.slug;
    if (slug) revalidatePath(`/${slug}`);
  }
  return { success: true };
}

export async function countPendingReviewsAll(): Promise<number> {
  await connectDB();
  const [postP, creatorP, articleP, feedP, ainsfwDocs] = await Promise.all([
    Post.countDocuments({ status: 'pending' }),
    CreatorReview.countDocuments({ status: 'pending' }),
    ArticleComment.countDocuments({ status: 'pending' }),
    ProfileFeedComment.countDocuments({ status: 'pending' }),
    AINsfwToolStats.find({ 'reviews.status': 'pending' }).select('reviews').lean(),
  ]);
  let ainsfwP = 0;
  for (const doc of ainsfwDocs as any[]) {
    ainsfwP += (doc.reviews || []).filter((r: any) => r.status === 'pending').length;
  }
  return postP + creatorP + articleP + feedP + ainsfwP;
}

// Legacy helpers kept for any existing callers
export async function getCreatorReviewsAdmin(token: string) {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');

  await connectDB();
  const reviews = await CreatorReview.find({}).sort({ createdAt: -1 }).lean();

  return reviews.map((r: any) => ({
    _id: r._id.toString(),
    creatorSlug: r.creatorSlug,
    authorName: r.authorName || 'Member',
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
  return updateReview(token, id, { ...data, type: 'creator' });
}

export async function deleteCreatorReview(token: string, id: string) {
  return deleteReview(token, id, 'creator');
}
