import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/auth';

const BOT_TOKEN = process.env.TELEGRAM_PAYMENT_BOT_TOKEN || '';

type TelegramStarTx = {
  id: string;
  date: number;
  amount: number;
  source?: {
    transaction_type?: string;
    type?: string;
    user?: { id?: number; first_name?: string; last_name?: string; username?: string };
    invoice_payload?: string;
  };
};

export async function GET(req: NextRequest) {
  const user = await authenticateUser(req);
  if (!user?.isAdmin) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  if (!BOT_TOKEN) {
    return NextResponse.json(
      { message: 'TELEGRAM_PAYMENT_BOT_TOKEN is not set' },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Math.max(Number(searchParams.get('limit') || 25), 1), 100);
  const offset = searchParams.get('offset') || '0';

  try {
    const tgRes = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/getStarTransactions?offset=${encodeURIComponent(
        offset
      )}&limit=${limit}`,
      { method: 'GET' }
    );

    const raw = await tgRes.json();
    if (!raw?.ok) {
      return NextResponse.json(
        { message: 'Telegram getStarTransactions failed', telegram: raw },
        { status: 502 }
      );
    }

    const txs: TelegramStarTx[] = raw?.result?.transactions || [];

    const normalized = txs.map((t) => {
      let parsedPayload: any = null;
      const invoicePayload = t?.source?.invoice_payload;
      if (typeof invoicePayload === 'string' && invoicePayload.length) {
        try {
          parsedPayload = JSON.parse(invoicePayload);
        } catch {
          parsedPayload = null;
        }
      }

      return {
        id: t.id,
        date: t.date,
        amount: t.amount,
        transactionType: t?.source?.transaction_type || null,
        fromUser: t?.source?.user
          ? {
              id: t.source.user.id || null,
              username: t.source.user.username || null,
              firstName: t.source.user.first_name || null,
              lastName: t.source.user.last_name || null,
            }
          : null,
        invoicePayload: invoicePayload || null,
        parsedPayload,
      };
    });

    return NextResponse.json({
      ok: true,
      count: normalized.length,
      totalAmount: normalized.reduce((sum, t) => sum + (Number(t.amount) || 0), 0),
      transactions: normalized,
    });
  } catch (err) {
    console.error('Admin stars-transactions error:', err);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

