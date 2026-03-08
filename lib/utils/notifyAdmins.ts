import webpush from 'web-push';
import connectDB from '@/lib/db/mongodb';
import { AdminPushSubscription } from '@/lib/models';

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || '';
const CONTACT = 'mailto:admin@erogram.pro';

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(CONTACT, VAPID_PUBLIC, VAPID_PRIVATE);
}

export interface SaleNotificationPayload {
  plan: 'monthly' | 'yearly' | 'lifetime';
  method: 'stars' | 'crypto';
  username?: string;
}

export interface NewUserNotificationPayload {
  username: string;
  provider: 'google' | 'telegram';
}

async function sendPushToAdmins(notification: object) {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return;
  try {
    await connectDB();
    const subs = await AdminPushSubscription.find({}).lean() as any[];
    if (!subs.length) return;
    const payload = JSON.stringify(notification);
    await Promise.allSettled(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } },
            payload
          );
        } catch (err: any) {
          if (err.statusCode === 404 || err.statusCode === 410) {
            await AdminPushSubscription.deleteOne({ endpoint: sub.endpoint }).catch(() => {});
          }
        }
      })
    );
  } catch (err) {
    console.error('[notifyAdmins] Error sending push notifications:', err);
  }
}

export async function notifyAdminsOfSale(payload: SaleNotificationPayload) {
  const planLabel = payload.plan === 'yearly' ? 'Yearly ($49.99)' : payload.plan === 'monthly' ? 'Monthly ($8.99)' : 'Lifetime';
  const methodLabel = payload.method === 'stars' ? '⭐ Stars' : '₿ Crypto';
  const userLabel = payload.username ? `@${payload.username}` : 'Anonymous';
  await sendPushToAdmins({
    title: '💰 New Sale!',
    body: `${planLabel} · ${methodLabel} · ${userLabel}`,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: 'erogram-sale',
    data: { url: '/admin' },
  });
}

export async function notifyAdminsOfNewUser(payload: NewUserNotificationPayload) {
  const providerLabel = payload.provider === 'google' ? '📧 Google' : '✈️ Telegram';
  await sendPushToAdmins({
    title: '👤 New User Registered!',
    body: `@${payload.username} · ${providerLabel}`,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: 'erogram-new-user',
    data: { url: '/admin/users' },
  });
}
