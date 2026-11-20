import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/auth';
import connectDB from '@/lib/db/mongodb';
import { CustomCheckout } from '@/lib/models';

export async function GET(req: NextRequest) {
  const user = await authenticateUser(req);
  if (!user?.isAdmin) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  await connectDB();
  const items = await CustomCheckout.find({})
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  return NextResponse.json({ items });
}
