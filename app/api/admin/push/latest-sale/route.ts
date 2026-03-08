import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/auth';
import connectDB from '@/lib/db/mongodb';
import { PremiumEvent, User } from '@/lib/models';

export async function GET(req: NextRequest) {
  const user = await authenticateUser(req);
  if (!user || !user.isAdmin) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const sinceParam = req.nextUrl.searchParams.get('since');
  const since = sinceParam ? new Date(Number(sinceParam)) : new Date(Date.now() - 60_000);

  await connectDB();

  const [saleEvent, newUser] = await Promise.all([
    PremiumEvent.findOne({
      event: { $in: ['payment_success', 'crypto_payment_success'] },
      createdAt: { $gt: since },
    }).sort({ createdAt: -1 }).lean() as any,

    User.findOne({
      createdAt: { $gt: since },
      isAdmin: { $ne: true },
    }).sort({ createdAt: -1 }).lean() as any,
  ]);

  return NextResponse.json({
    sale: saleEvent ? {
      plan: saleEvent.plan,
      method: saleEvent.paymentMethod || (saleEvent.event === 'crypto_payment_success' ? 'crypto' : 'stars'),
      username: saleEvent.username || null,
      at: saleEvent.createdAt,
    } : null,
    newUser: newUser ? {
      username: newUser.username,
      provider: newUser.googleId ? 'google' : newUser.telegramId ? 'telegram' : 'other',
      at: newUser.createdAt,
    } : null,
  });
}
