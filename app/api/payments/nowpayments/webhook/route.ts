import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { fulfillNowPayment, logCryptoEvent } from '@/lib/actions/nowpaymentsFulfill';
import { notifyAdminsOfCryptoWebhookFailure } from '@/lib/utils/notifyAdmins';

const IPN_SECRET = process.env.NOWPAYMENTS_IPN_SECRET || '';

function sortObjectDeep(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(sortObjectDeep);
  if (obj && typeof obj === 'object') {
    return Object.keys(obj as Record<string, unknown>)
      .sort()
      .reduce((acc: Record<string, unknown>, key) => {
        acc[key] = sortObjectDeep((obj as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }
  return obj;
}

function verifySignature(body: Record<string, unknown>, sigHeader: string | null): boolean {
  if (!sigHeader || !IPN_SECRET) return false;
  const sorted = JSON.stringify(sortObjectDeep(body));
  const expected = crypto.createHmac('sha512', IPN_SECRET).update(sorted).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sigHeader));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  if (!IPN_SECRET) {
    console.error('NOWPAYMENTS_IPN_SECRET not set — rejecting webhook');
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const orderId = String(body.order_id ?? '');
  const paymentId = String(body.payment_id ?? '');
  const paymentStatus = String(body.payment_status ?? '');

  try {
    await logCryptoEvent({
      event: 'crypto_webhook_received',
      orderId,
      paymentId,
      status: paymentStatus,
    });
  } catch (logErr) {
    console.error('NowPayments webhook: failed to log received event', logErr);
    await notifyAdminsOfCryptoWebhookFailure(
      `Could not log webhook to DB\norder: ${orderId}\npayment: ${paymentId}\nstatus: ${paymentStatus}`,
    );
  }

  const sig = req.headers.get('x-nowpayments-sig');
  if (!verifySignature(body, sig)) {
    console.error('NowPayments webhook: invalid signature', { orderId, paymentId });
    try {
      await logCryptoEvent({ event: 'crypto_webhook_bad_signature', orderId, paymentId });
    } catch { /* alert below */ }
    await notifyAdminsOfCryptoWebhookFailure(`Bad signature\norder: ${orderId}\npayment: ${paymentId}`);
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  try {
    await logCryptoEvent({
      event: `crypto_webhook_${paymentStatus}`,
      orderId,
      paymentId,
    });
  } catch {
    /* non-fatal */
  }

  if (paymentStatus !== 'finished' && paymentStatus !== 'confirmed') {
    return NextResponse.json({ ok: true });
  }

  try {
    await fulfillNowPayment({
      payment_status: paymentStatus,
      order_id: orderId,
      payment_id: paymentId,
      actually_paid_at_fiat: body.actually_paid_at_fiat as number | string | undefined,
      price_amount: body.price_amount as number | string | undefined,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('NowPayments webhook fulfillment error:', { orderId, paymentId, msg });
    try {
      await logCryptoEvent({ event: 'crypto_webhook_fulfill_failed', orderId, paymentId, error: msg });
    } catch { /* */ }
    await notifyAdminsOfCryptoWebhookFailure(
      `Fulfillment FAILED — NowPayments will retry\norder: ${orderId}\npayment: ${paymentId}\nerror: ${msg}`,
    );
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
