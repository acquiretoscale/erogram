'use server';

import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import { SystemConfig, User } from '@/lib/models';
import { isPublisherToken } from '@/lib/auth/publisherAccess';
import { revalidateAinsfwPublic } from '@/lib/actions/ainsfw';
import {
  AINSFW_EDITORIAL_PICKS_KEY,
  AINSFW_EDITORIAL_PICK_DEFAULTS,
  normalizeEditorialPickSlugs,
} from '@/lib/ainsfw/editorialPicks';

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';

export async function getEditorialPickSlugs(): Promise<string[]> {
  await connectDB();
  const doc = await SystemConfig.findOne({ key: AINSFW_EDITORIAL_PICKS_KEY }).lean() as { value?: unknown } | null;
  const stored = normalizeEditorialPickSlugs(doc?.value);
  return stored.length ? stored : [...AINSFW_EDITORIAL_PICK_DEFAULTS];
}

async function requirePicker(token: string) {
  if (!token) throw new Error('Unauthorized');
  if (isPublisherToken(token)) return;
  const decoded = jwt.verify(token, JWT_SECRET) as { id?: string };
  await connectDB();
  const user = await User.findById(decoded.id).select('isAdmin').lean() as { isAdmin?: boolean } | null;
  if (!user?.isAdmin) throw new Error('Unauthorized');
}

export async function saveEditorialPickSlugs(token: string, slugs: string[]): Promise<string[]> {
  await requirePicker(token);
  const next = normalizeEditorialPickSlugs(slugs);
  await connectDB();
  await SystemConfig.findOneAndUpdate(
    { key: AINSFW_EDITORIAL_PICKS_KEY },
    { key: AINSFW_EDITORIAL_PICKS_KEY, value: next, lastUpdated: new Date() },
    { upsert: true },
  );
  await revalidateAinsfwPublic();
  return next;
}
