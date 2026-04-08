'use server';

import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import { User } from '@/lib/models';
import { listR2Files, listR2FilesWithDates } from '@/lib/r2';

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

export async function listMyR2Media(): Promise<{ videos: string[]; images: string[] }> {
  if (!(await verifyOwner())) return { videos: [], images: [] };
  const [videos, images] = await Promise.all([
    listR2Files('onlygram/videos', { extensions: ['.mp4', '.webm', '.mov'] }),
    listR2Files('onlygram/images', { extensions: ['.webp', '.jpg', '.jpeg', '.png', '.gif'] }),
  ]);
  return { videos, images };
}

type BatchedPost = {
  media: Array<{ type: 'video' | 'photo'; url: string }>;
  date: string;
};

export async function listR2Batches(): Promise<BatchedPost[]> {
  if (!(await verifyOwner())) return [];

  const [vids, imgs] = await Promise.all([
    listR2FilesWithDates('onlygram/videos', ['.mp4', '.webm', '.mov']),
    listR2FilesWithDates('onlygram/images', ['.webp', '.jpg', '.jpeg', '.png', '.gif']),
  ]);

  const all = [
    ...vids.map(v => ({ ...v, type: 'video' as const })),
    ...imgs.map(v => ({ ...v, type: 'photo' as const })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  const batches: BatchedPost[] = [];
  let current: typeof all = [];

  for (const item of all) {
    if (current.length === 0) {
      current.push(item);
    } else {
      const lastMs = new Date(current[current.length - 1].date).getTime();
      const thisMs = new Date(item.date).getTime();
      if (thisMs - lastMs < 3 * 60 * 1000) {
        current.push(item);
      } else {
        batches.push({
          media: current.map(c => ({ type: c.type, url: c.url })),
          date: current[0].date,
        });
        current = [item];
      }
    }
  }
  if (current.length > 0) {
    batches.push({
      media: current.map(c => ({ type: c.type, url: c.url })),
      date: current[0].date,
    });
  }

  return batches;
}
