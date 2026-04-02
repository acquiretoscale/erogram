'use server';

import connectDB from '@/lib/db/mongodb';
import { StorySlideContent, User } from '@/lib/models';
import { listR2Files } from '@/lib/r2';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';

async function verifyAdmin(token: string): Promise<boolean> {
  if (!token) return false;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = await User.findById(decoded.id).select('isAdmin').lean();
    return !!(user as any)?.isAdmin;
  } catch { return false; }
}

export async function trackStoryClick(slideId: string) {
  if (!slideId) return;
  try {
    await connectDB();
    await StorySlideContent.findByIdAndUpdate(slideId, { $inc: { clicks: 1 } });
  } catch {
    // Silently fail — tracking should never block the user
  }
}

export async function trackStoryLike(slideId: string) {
  if (!slideId) return;
  try {
    await connectDB();
    await StorySlideContent.findByIdAndUpdate(slideId, { $inc: { likes: 1 } });
  } catch {
    // Silently fail
  }
}

/** Admin: sync R2 folder files into StorySlideContent records so each can be edited individually */
export async function syncR2Stories(
  token: string,
  categorySlug: string,
  r2Folder: string
): Promise<{ created: number; existing: number; total: number }> {
  await connectDB();
  if (!(await verifyAdmin(token))) throw new Error('Unauthorized');
  if (!r2Folder || !categorySlug) throw new Error('Missing folder or category');

  const files = await listR2Files(r2Folder, { maxSizeMB: 10 });
  if (files.length === 0) return { created: 0, existing: 0, total: 0 };

  const existing = await StorySlideContent.find({ categorySlug }).select('mediaUrl').lean();
  const existingUrls = new Set((existing as any[]).map(s => s.mediaUrl));

  let created = 0;
  for (let i = 0; i < files.length; i++) {
    const url = files[i];
    if (existingUrls.has(url)) continue;
    const isVideo = /\.(mp4|webm|mov)$/i.test(url);
    await StorySlideContent.create({
      categorySlug,
      mediaType: isVideo ? 'video' : 'image',
      mediaUrl: url,
      ctaText: '',
      ctaUrl: '',
      caption: '',
      duration: 0,
      expiresAt: null,
      enabled: true,
      clientName: '',
      sortOrder: existingUrls.size + i,
      ctaPosition: 'bottom',
      ctaColor: 'blue',
    });
    created++;
  }

  return { created, existing: existingUrls.size, total: files.length };
}
