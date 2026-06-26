'use server';

import connectDB from '@/lib/db/mongodb';
import { NewsletterSubscriber } from '@/lib/models';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || '';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function verifyAdmin(token: string): boolean {
  try {
    return !!(jwt.verify(token, JWT_SECRET) as any).isAdmin;
  } catch {
    return false;
  }
}

/** Public: capture an email. Idempotent — re-subscribing the same email is a no-op success. */
export async function subscribeNewsletter(
  email: string,
  source = 'blog'
): Promise<{ ok: boolean; error?: string }> {
  const clean = (email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(clean)) return { ok: false, error: 'Please enter a valid email.' };
  try {
    await connectDB();
    await NewsletterSubscriber.updateOne(
      { email: clean },
      { $setOnInsert: { email: clean, source, status: 'subscribed' } },
      { upsert: true }
    );
    return { ok: true };
  } catch (e) {
    console.error('[newsletter] subscribe failed:', e);
    return { ok: false, error: 'Something went wrong. Try again.' };
  }
}

export interface NewsletterRow {
  _id: string;
  email: string;
  source: string;
  status: string;
  createdAt: string | null;
}

/** Admin: list subscribers (newest first). */
export async function getNewsletterSubscribers(
  token: string
): Promise<{ rows: NewsletterRow[]; total: number; error?: string }> {
  if (!verifyAdmin(token)) return { rows: [], total: 0, error: 'Unauthorized' };
  try {
    await connectDB();
    const docs = await NewsletterSubscriber.find().sort({ createdAt: -1 }).lean();
    const rows: NewsletterRow[] = (docs as any[]).map((d) => ({
      _id: d._id.toString(),
      email: d.email,
      source: d.source || 'blog',
      status: d.status || 'subscribed',
      createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : null,
    }));
    return { rows, total: rows.length };
  } catch (e) {
    console.error('[newsletter] getSubscribers failed:', e);
    return { rows: [], total: 0, error: 'Failed to load subscribers.' };
  }
}
