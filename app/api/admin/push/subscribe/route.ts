import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/auth';
import connectDB from '@/lib/db/mongodb';
import { AdminPushSubscription } from '@/lib/models';

export async function POST(req: NextRequest) {
  const user = await authenticateUser(req);
  if (!user || !user.isAdmin) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { subscription } = await req.json();
  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return NextResponse.json({ message: 'Invalid subscription' }, { status: 400 });
  }

  await connectDB();

  await AdminPushSubscription.findOneAndUpdate(
    { endpoint: subscription.endpoint },
    { endpoint: subscription.endpoint, keys: subscription.keys, userId: user._id },
    { upsert: true, new: true }
  );

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const user = await authenticateUser(req);
  if (!user || !user.isAdmin) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { endpoint } = await req.json();
  if (endpoint) {
    await connectDB();
    await AdminPushSubscription.deleteOne({ endpoint });
  }

  return NextResponse.json({ ok: true });
}
