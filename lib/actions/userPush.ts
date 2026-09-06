'use server';

import jwt from 'jsonwebtoken';
import webpush from 'web-push';
import connectDB from '@/lib/db/mongodb';
import { User, UserPushSubscription } from '@/lib/models';

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';
const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || '';
const CONTACT = 'mailto:admin@erogram.pro';

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(CONTACT, VAPID_PUBLIC, VAPID_PRIVATE);
}

function userIdFromToken(token: string | null | undefined): string | null {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id?: string };
    return decoded?.id || null;
  } catch {
    return null;
  }
}

async function assertAdmin(token: string) {
  const userId = userIdFromToken(token);
  if (!userId) throw new Error('Unauthorized');
  await connectDB();
  const admin = await User.findById(userId).select('isAdmin').lean() as { isAdmin?: boolean } | null;
  if (!admin?.isAdmin) throw new Error('Unauthorized');
}

export async function subscribeUserPush(
  token: string | null,
  subscription: { endpoint?: string; keys?: { p256dh?: string; auth?: string } } | null,
) {
  const endpoint = typeof subscription?.endpoint === 'string' ? subscription.endpoint.trim() : '';
  const p256dh = typeof subscription?.keys?.p256dh === 'string' ? subscription.keys.p256dh : '';
  const auth = typeof subscription?.keys?.auth === 'string' ? subscription.keys.auth : '';
  if (!endpoint || !p256dh || !auth) return { ok: false };

  try {
    await connectDB();
    const userId = userIdFromToken(token);
    await UserPushSubscription.findOneAndUpdate(
      { endpoint },
      { endpoint, keys: { p256dh, auth }, userId: userId || null },
      { upsert: true, new: true },
    );
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function getUserPushCount(token: string) {
  await assertAdmin(token);
  const total = await UserPushSubscription.countDocuments();
  return { total };
}

export async function broadcastUserPush(token: string, title: string, body: string, url?: string) {
  await assertAdmin(token);
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return { ok: false, error: 'Push keys not configured', sent: 0, failed: 0, total: 0 };

  const t = (title || '').trim().slice(0, 80);
  const b = (body || '').trim().slice(0, 240);
  if (!t || !b) return { ok: false, error: 'Title and message required', sent: 0, failed: 0, total: 0 };

  let path = typeof url === 'string' ? url.trim() : '/';
  if (!path.startsWith('/')) path = '/';

  const subs = await UserPushSubscription.find({}).lean() as Array<{
    endpoint: string;
    keys: { p256dh: string; auth: string };
  }>;

  const payload = JSON.stringify({
    title: t,
    body: b,
    icon: '/icons/notification-icon.png?v=6',
    badge: '/icons/notification-badge.png?v=6',
    tag: 'erogramx-user',
    data: { url: path },
  });

  let sent = 0;
  let failed = 0;
  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } },
          payload,
        );
        sent += 1;
      } catch (err: unknown) {
        failed += 1;
        const status = (err as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) {
          await UserPushSubscription.deleteOne({ endpoint: sub.endpoint }).catch(() => {});
        }
      }
    }),
  );

  return { ok: true, sent, failed, total: subs.length };
}
