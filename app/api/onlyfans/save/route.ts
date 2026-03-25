import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { User, OnlyFansCreator } from '@/lib/models';
import { authenticateUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const authUser = await authenticateUser(req);
  if (!authUser) {
    return NextResponse.json({ savedIds: [] });
  }

  await connectDB();
  const user = await User.findById(authUser._id).select('savedCreators').lean();
  const savedIds = ((user as any)?.savedCreators || []).map((id: any) => id.toString());

  return NextResponse.json({ savedIds });
}

export async function POST(req: NextRequest) {
  const authUser = await authenticateUser(req);
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { creatorId } = await req.json();
  if (!creatorId) {
    return NextResponse.json({ error: 'creatorId is required' }, { status: 400 });
  }

  await connectDB();

  const creator = await OnlyFansCreator.findById(creatorId).select('_id').lean();
  if (!creator) {
    return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
  }

  await User.findByIdAndUpdate(authUser._id, {
    $addToSet: { savedCreators: creatorId },
  });

  return NextResponse.json({ saved: true });
}

export async function DELETE(req: NextRequest) {
  const authUser = await authenticateUser(req);
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { creatorId } = await req.json();
  if (!creatorId) {
    return NextResponse.json({ error: 'creatorId is required' }, { status: 400 });
  }

  await connectDB();
  await User.findByIdAndUpdate(authUser._id, {
    $pull: { savedCreators: creatorId },
  });

  return NextResponse.json({ saved: false });
}
