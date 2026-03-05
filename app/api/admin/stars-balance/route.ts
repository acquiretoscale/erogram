import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/auth';

const BOT_TOKEN = process.env.TELEGRAM_PAYMENT_BOT_TOKEN || '';

// Transaction types that REDUCE the balance (withdrawals, refunds)
const OUTGOING_TYPES = new Set(['fragment_withdrawal', 'ads_payment', 'refund']);

type TelegramStarTx = {
  id: string;
  date: number;
  amount: number;
  nanostar_amount?: number;
  source?: { transaction_type?: string };
};

async function fetchAllTransactions(maxPages: number): Promise<TelegramStarTx[]> {
  let offset = '0';
  const all: TelegramStarTx[] = [];

  for (let page = 0; page < maxPages; page++) {
    const res = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/getStarTransactions?offset=${encodeURIComponent(offset)}&limit=100`,
      { method: 'GET' }
    );
    const raw = await res.json();
    if (!raw?.ok) throw Object.assign(new Error('getStarTransactions failed'), { telegram: raw });

    const txs: TelegramStarTx[] = raw?.result?.transactions ?? [];
    all.push(...txs);

    const next = raw?.result?.next_offset;
    if (typeof next === 'string' && next.length && next !== offset) {
      offset = next;
      if (txs.length === 0) break;
      continue;
    }
    const n = Number(offset);
    if (Number.isFinite(n) && txs.length === 100) { offset = String(n + 100); continue; }
    break;
  }

  return all;
}

async function fetchUsdRate(): Promise<number> {
  try {
    const res = await fetch('https://bes-dev.github.io/telegram_stars_rates/api.json', {
      method: 'GET',
      cache: 'no-store',
    });
    const d = await res.json();
    if (typeof d?.usdt_per_star === 'number' && Number.isFinite(d.usdt_per_star)) {
      return d.usdt_per_star;
    }
  } catch { /* fall through to fallback */ }
  return 0.015; // fallback if rate API is down
}

export async function GET(req: NextRequest) {
  const user = await authenticateUser(req);
  if (!user?.isAdmin) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  if (!BOT_TOKEN) {
    return NextResponse.json({ message: 'TELEGRAM_PAYMENT_BOT_TOKEN is not set' }, { status: 503 });
  }

  try {
    const [txs, usdtPerStar] = await Promise.all([
      fetchAllTransactions(200),
      fetchUsdRate(),
    ]);

    let totalReceived = 0;
    let totalWithdrawn = 0;
    let totalRefunded = 0;
    let invoicePayments = 0;

    for (const t of txs) {
      const type = t?.source?.transaction_type ?? '';
      const amount = Number(t?.amount ?? 0);
      if (OUTGOING_TYPES.has(type)) {
        if (type === 'fragment_withdrawal') totalWithdrawn += amount;
        else if (type === 'refund') totalRefunded += amount;
        else totalWithdrawn += amount; // ads / other outgoing
      } else {
        totalReceived += amount;
        if (type === 'invoice_payment') invoicePayments++;
      }
    }

    const netBalance = totalReceived - totalWithdrawn - totalRefunded;
    const netBalanceUsd = netBalance * usdtPerStar;
    const totalReceivedUsd = totalReceived * usdtPerStar;

    return NextResponse.json({
      ok: true,
      balance: {
        net: netBalance,
        netUsd: netBalanceUsd,
        totalReceived,
        totalReceivedUsd,
        totalWithdrawn,
        totalRefunded,
        invoicePayments,
        transactionCount: txs.length,
      },
      rate: {
        usdtPerStar,
        source: 'fragment_blockchain_analysis',
        note: 'Updated daily. Net balance = received − withdrawals − refunds.',
      },
    });
  } catch (err: any) {
    console.error('stars-balance error:', err);
    return NextResponse.json(
      { message: 'Failed to fetch Stars balance', telegram: err?.telegram },
      { status: 500 }
    );
  }
}
