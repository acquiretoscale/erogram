import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { User } from '@/lib/models';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const BOT_TOKEN = process.env.TELEGRAM_PAYMENT_BOT_TOKEN || '';

const REMINDER_TEXT = [
  'Your Erogram VIP access expires tomorrow. Renew now to keep your Vault, bookmarks, and all premium features.',
  '',
  'Renew here: https://erogram.pro/premium',
].join('\n');

async function sendTelegramMessage(chatId: number, text: string) {
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: false }),
  });
  return res.ok;
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!BOT_TOKEN) {
    return NextResponse.json({ error: 'BOT_TOKEN not configured' }, { status: 503 });
  }

  await connectDB();

  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // 1. Send renewal reminders to users expiring within the next 24 hours
  const expiringUsers = await User.find({
    premium: true,
    premiumExpiresAt: { $ne: null, $gt: now, $lte: in24h },
    telegramId: { $ne: null },
  }).select('telegramId username premiumExpiresAt').lean();

  let sent = 0;
  let failed = 0;

  for (const u of expiringUsers as any[]) {
    try {
      const ok = await sendTelegramMessage(u.telegramId, REMINDER_TEXT);
      if (ok) sent++;
      else failed++;
    } catch {
      failed++;
    }
  }

  // 2. Revoke premium for users whose plan has expired
  const expiredResult = await User.updateMany(
    { premium: true, premiumExpiresAt: { $ne: null, $lte: now } },
    { $set: { premium: false } },
  );

  return NextResponse.json({
    ok: true,
    reminders: { eligible: expiringUsers.length, sent, failed },
    expired: { revoked: expiredResult.modifiedCount },
  });
}
