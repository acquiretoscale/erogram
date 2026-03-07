import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Group } from '@/lib/models';
import { authenticateUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const user = await authenticateUser(req);
  if (!user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  if (!user.premium && !user.isAdmin) {
    return NextResponse.json({ message: 'Premium required' }, { status: 403 });
  }

  const { groupId } = await req.json();
  if (!groupId) {
    return NextResponse.json({ message: 'Missing groupId' }, { status: 400 });
  }

  await connectDB();

  const group = await Group.findById(groupId).select('telegramLink premiumOnly').lean() as any;
  if (!group) {
    return NextResponse.json({ message: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ telegramLink: group.telegramLink });
}
