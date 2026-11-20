'use server';

import jwt from 'jsonwebtoken';
import { revalidatePath } from 'next/cache';
import connectDB from '@/lib/db/mongodb';
import { SystemConfig, User } from '@/lib/models';
import { isPublisherToken } from '@/lib/auth/publisherAccess';
import type { MediaKitContent } from '@/lib/mediakit/types';
import { resolveMediaKitContent, setMediaKitField } from '@/lib/mediakit/resolve';

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';
const MEDIAKIT_KEY = 'mediakit';

export type MediaKitSaveResult =
  | { ok: true; content: MediaKitContent }
  | { ok: false; error: string };

async function canEditMediaKit(token: string) {
  if (!token) return false;
  if (isPublisherToken(token)) return true;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id?: string };
    if (!decoded.id) return false;
    await connectDB();
    const user = await User.findById(decoded.id).select('isAdmin').lean() as { isAdmin?: boolean } | null;
    return Boolean(user?.isAdmin);
  } catch {
    return false;
  }
}

export async function getMediaKitContent(): Promise<MediaKitContent> {
  await connectDB();
  const doc = (await SystemConfig.findOne({ key: MEDIAKIT_KEY }).select('value').lean()) as { value?: unknown } | null;
  return resolveMediaKitContent(doc?.value);
}

async function persist(content: MediaKitContent): Promise<MediaKitContent> {
  const normalized = resolveMediaKitContent(content);
  await connectDB();
  await SystemConfig.findOneAndUpdate(
    { key: MEDIAKIT_KEY },
    { key: MEDIAKIT_KEY, value: normalized, lastUpdated: new Date() },
    { upsert: true, new: true },
  );
  revalidatePath('/mediakit');
  revalidatePath('/promo');
  return normalized;
}

export async function patchMediaKitField(token: string, path: string, value: string): Promise<MediaKitSaveResult> {
  const allowed = await canEditMediaKit(token);
  if (!allowed) return { ok: false, error: 'Log in as admin or publisher, then try again.' };
  if (!path || path.length > 120) return { ok: false, error: 'Invalid field.' };
  const allowEmpty = /^performancePacks\.\d+\.intro$/.test(path);
  if (!value.trim() && !allowEmpty) return { ok: false, error: 'Text cannot be empty.' };
  try {
    const current = await getMediaKitContent();
    const next = setMediaKitField(current, path, value);
    const saved = await persist(next);
    return { ok: true, content: saved };
  } catch {
    return { ok: false, error: 'Save failed. Try again.' };
  }
}