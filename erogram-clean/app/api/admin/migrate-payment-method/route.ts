import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { User } from '@/lib/models';
import { authenticateUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const user = await authenticateUser(req);
  if (!user?.isAdmin) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  await connectDB();

  // Backfill paymentMethod for existing premium users who don't have one set.
  // All pre-existing users paid with Stars (crypto was added later).
  const result = await User.updateMany(
    { premium: true, paymentMethod: { $in: [null, undefined] } },
    { $set: { paymentMethod: 'stars' } }
  );

  return NextResponse.json({
    ok: true,
    message: `Backfilled ${result.modifiedCount} premium user(s) with paymentMethod: 'stars'`,
    matched: result.matchedCount,
    modified: result.modifiedCount,
  });
}
