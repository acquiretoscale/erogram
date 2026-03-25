import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { User, OnlyFansCreator } from '@/lib/models';
import { authenticateUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const authUser = await authenticateUser(req);
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectDB();
  const user = await User.findById(authUser._id).select('savedCreators').lean();
  const savedIds = (user as any)?.savedCreators || [];

  if (savedIds.length === 0) {
    return NextResponse.json({ creators: [] });
  }

  const creators = await OnlyFansCreator.find({ _id: { $in: savedIds } })
    .select('name username slug avatar bio price isFree url clicks')
    .lean();

  return NextResponse.json({
    creators: creators.map((c: any) => ({ ...c, _id: c._id.toString() })),
  });
}
