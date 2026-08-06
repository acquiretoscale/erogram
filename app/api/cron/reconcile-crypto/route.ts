import { NextRequest, NextResponse } from 'next/server';
import { fulfillNowPayment, isPaymentAlreadyFulfilled } from '@/lib/actions/nowpaymentsFulfill';
import { notifyAdminsOfCryptoWebhookFailure } from '@/lib/utils/notifyAdmins';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const NP_API_KEY = process.env.NOWPAYMENTS_API_KEY || '';
const NP_BASE = 'https://api.nowpayments.io/v1';
const ACTIVATE_ON = new Set(['finished', 'confirmed']);

type NPPaymentRow = {
  payment_id?: number | string;
  payment_status?: string;
  order_id?: string;
  actually_paid_at_fiat?: number;
  price_amount?: number;
};

/**
 * Safety net: poll NowPayments for finished payments and fulfill any missing in DB.
 * Runs hourly via Vercel cron.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!NP_API_KEY) {
    return NextResponse.json({ error: 'NOWPAYMENTS_API_KEY not set' }, { status: 503 });
  }

  const dateFrom = new Date(Date.now() - 7 * 86400000).toISOString();

  try {
    const url = `${NP_BASE}/payment/?limit=100&page=0&sortBy=updated_at&orderBy=desc&dateFrom=${encodeURIComponent(dateFrom)}`;
    const res = await fetch(url, {
      headers: { 'x-api-key': NP_API_KEY },
      cache: 'no-store',
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json?.message || `NP list failed ${res.status}`);
    }

    const rows: NPPaymentRow[] = Array.isArray(json?.data) ? json.data : [];
    const results: { paymentId: string; orderId: string; result: string }[] = [];

    for (const row of rows) {
      const paymentId = String(row.payment_id ?? '');
      const orderId = String(row.order_id ?? '');
      const status = String(row.payment_status ?? '');

      if (!paymentId || !orderId || !ACTIVATE_ON.has(status)) continue;

      const payload = {
        payment_status: status,
        order_id: orderId,
        payment_id: paymentId,
        actually_paid_at_fiat: row.actually_paid_at_fiat,
        price_amount: row.price_amount,
      };

      try {
        if (await isPaymentAlreadyFulfilled(payload)) {
          results.push({ paymentId, orderId, result: 'already_fulfilled' });
          continue;
        }
        const out = await fulfillNowPayment(payload);
        results.push({ paymentId, orderId, result: out });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        results.push({ paymentId, orderId, result: `error: ${msg}` });
        await notifyAdminsOfCryptoWebhookFailure(
          `Reconcile cron could not fulfill\norder: ${orderId}\npayment: ${paymentId}\nerror: ${msg}`,
        );
      }
    }

    const fulfilled = results.filter((r) => r.result === 'fulfilled');
    console.log(`[Cron crypto-reconcile] scanned=${rows.length} fulfilled=${fulfilled.length}`);

    return NextResponse.json({
      scanned: rows.length,
      fulfilled: fulfilled.length,
      results: results.filter((r) => r.result !== 'already_fulfilled').slice(0, 20),
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[Cron crypto-reconcile] error:', msg);
    await notifyAdminsOfCryptoWebhookFailure(`Reconcile cron crashed: ${msg}`);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
