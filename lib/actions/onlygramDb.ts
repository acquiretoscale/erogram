'use server';

import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import { User, OnlygramPost, OnlygramCreator } from '@/lib/models';

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';

async function verifyOwner(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('admin_token')?.value;
    if (!token) return false;
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    await connectDB();
    const user = await User.findById(decoded.id).select('isAdmin username').lean() as any;
    return user?.isAdmin === true && user?.username === 'eros';
  } catch { return false; }
}

/* ─── Posts ────────────────────────────────────────────────── */

export async function dbLoadPosts(slug: string) {
  if (!(await verifyOwner())) return [];
  await connectDB();
  const docs = await OnlygramPost.find({ slug }).sort({ createdAt: -1 }).lean();
  return docs.map((d: any) => ({
    id: d.postId,
    type: d.type,
    thumbnail: d.thumbnail,
    videoUrl: d.videoUrl,
    media: d.media?.length ? d.media.map((m: any) => ({ type: m.type, url: m.url, thumb: m.thumb || undefined })) : undefined,
    caption: d.caption,
    likes: d.likes,
    comments: d.comments,
    views: d.views,
    locked: d.locked,
    price: d.price,
    postedAt: d.postedAt,
    postedAtIso: d.postedAtIso,
    pinned: d.pinned,
    tagged: d.tagged?.length ? d.tagged.map((t: any) => ({ username: t.username, name: t.name })) : undefined,
    commentList: d.commentList?.length ? d.commentList.map((c: any) => ({ user: c.user, text: c.text, ago: c.ago })) : undefined,
  }));
}

export async function dbLoadTaggedPosts(slug: string) {
  if (!(await verifyOwner())) return [];
  await connectDB();
  const docs = await OnlygramPost.find({ slug: { $ne: slug }, 'tagged.username': slug }).sort({ createdAt: -1 }).lean();
  return docs.map((d: any) => ({
    id: d.postId,
    type: d.type,
    thumbnail: d.thumbnail,
    videoUrl: d.videoUrl,
    media: d.media?.length ? d.media.map((m: any) => ({ type: m.type, url: m.url, thumb: m.thumb || undefined })) : undefined,
    caption: d.caption,
    likes: d.likes,
    comments: d.comments,
    views: d.views,
    locked: d.locked,
    price: d.price,
    postedAt: d.postedAt,
    postedAtIso: d.postedAtIso,
    pinned: d.pinned,
    tagged: d.tagged?.length ? d.tagged.map((t: any) => ({ username: t.username, name: t.name })) : undefined,
    commentList: d.commentList?.length ? d.commentList.map((c: any) => ({ user: c.user, text: c.text, ago: c.ago })) : undefined,
  }));
}

export async function dbSavePosts(slug: string, posts: any[]) {
  if (!(await verifyOwner())) return;
  await connectDB();
  await OnlygramPost.deleteMany({ slug });
  if (posts.length === 0) return;
  const docs = posts.map(p => ({
    slug,
    postId: p.id,
    type: p.type,
    thumbnail: p.thumbnail || '',
    videoUrl: p.videoUrl || '',
    media: p.media || [],
    caption: p.caption || '',
    likes: p.likes || 0,
    comments: p.comments || 0,
    views: p.views || 0,
    locked: p.locked || false,
    price: p.price || 0,
    postedAt: p.postedAt || '',
    postedAtIso: p.postedAtIso || '',
    pinned: p.pinned || false,
    tagged: p.tagged || [],
    commentList: p.commentList || [],
  }));
  await OnlygramPost.insertMany(docs);
}

/* ─── Creator profile ─────────────────────────────────────── */

export async function dbLoadCreator(slug: string) {
  if (!(await verifyOwner())) return null;
  await connectDB();
  const doc = await OnlygramCreator.findOne({ slug }).lean() as any;
  if (!doc) return null;
  return {
    name: doc.name,
    username: doc.username,
    avatar: doc.avatar,
    cover: doc.cover,
    bio: doc.bio,
    verified: doc.verified,
    location: doc.location,
    joinedDate: doc.joinedDate,
    subscriptionPrice: doc.subscriptionPrice,
    totalFans: doc.totalFans,
    totalLikes: doc.totalLikes,
    totalPosts: doc.totalPosts,
    totalMedia: doc.totalMedia,
  };
}

export async function dbSaveCreator(slug: string, creator: any) {
  if (!(await verifyOwner())) return;
  await connectDB();
  await OnlygramCreator.findOneAndUpdate(
    { slug },
    { slug, ...creator },
    { upsert: true },
  );
}
