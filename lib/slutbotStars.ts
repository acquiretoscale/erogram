import mongoose from 'mongoose';
import connectDB from '@/lib/db/mongodb';

/** SLUTBOT Desire packs. Named apart from Erogram VIP so Stars stay on one bot. */
export const SLUTBOT_PACKS: Record<string, { desires: number; usd: number; label: string }> = {
  ecstasy: { desires: 4000, usd: 300, label: 'SLUTBOT Ecstasy' },
  passion: { desires: 900, usd: 120, label: 'SLUTBOT Passion' },
  desire: { desires: 300, usd: 60, label: 'SLUTBOT Desire' },
  flirt: { desires: 150, usd: 40, label: 'SLUTBOT Flirt' },
  tease: { desires: 50, usd: 20, label: 'SLUTBOT Tease' },
};

export function getSlutbotPack(planId: unknown) {
  if (typeof planId !== 'string') return null;
  return SLUTBOT_PACKS[planId] ?? null;
}

export function isSlutbotPayload(payload: unknown): payload is {
  source: 'slutbot';
  clientId: string;
  plan: string;
} {
  if (!payload || typeof payload !== 'object') return false;
  const data = payload as { source?: unknown; clientId?: unknown; plan?: unknown };
  if (data.source !== 'slutbot') return false;
  if (typeof data.clientId !== 'string' || !/^[a-zA-Z0-9._-]{8,80}$/.test(data.clientId)) return false;
  return Boolean(getSlutbotPack(data.plan));
}

export async function fulfillSlutbotStarsPayment(input: {
  clientId: string;
  plan: string;
  chargeId: string;
  starsAmount: number;
}): Promise<'fulfilled' | 'skipped'> {
  const pack = getSlutbotPack(input.plan);
  if (!pack || !input.chargeId) return 'skipped';

  await connectDB();
  const db = mongoose.connection.db;
  if (!db) throw new Error('Mongo not connected');

  const payments = db.collection('slutbotpayments');
  const wallets = db.collection('slutbotwallets');

  const already = await payments.findOne({ chargeId: input.chargeId, status: 'paid' });
  if (already) return 'skipped';

  const now = new Date();
  await wallets.updateOne(
    { clientId: input.clientId },
    {
      $inc: { desires: pack.desires },
      $set: { lastPaymentChargeId: input.chargeId, updatedAt: now },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true },
  );

  await payments.updateOne(
    { chargeId: input.chargeId },
    {
      $set: {
        clientId: input.clientId,
        planId: input.plan,
        provider: 'telegram_stars',
        status: 'paid',
        usdAmount: pack.usd,
        starsAmount: input.starsAmount,
        desires: pack.desires,
        chargeId: input.chargeId,
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now, orderId: '', invoiceUrl: '' },
    },
    { upsert: true },
  );

  return 'fulfilled';
}
