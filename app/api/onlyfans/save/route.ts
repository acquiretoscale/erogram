import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { User } from '@/lib/models';
import { authenticateUser } from '@/lib/auth';
import { addUserSavedOnlyFansCreator, removeUserSavedOnlyFansCreator } from '@/lib/onlyfansCreatorSaveDb';

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

  const { creatorId, likeMediaKey } = await req.json();
  if (!creatorId) {
    return NextResponse.json({ error: 'creatorId is required' }, { status: 400 });
  }

  try {
    await addUserSavedOnlyFansCreator(authUser._id.toString(), creatorId, {
      likeMediaKey: typeof likeMediaKey === 'string' ? likeMediaKey : undefined,
    });
  } catch (e: any) {
    if (e.message === 'Creator not found') {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }
    if (e.message === 'Invalid creatorId') {
      return NextResponse.json({ error: 'creatorId is required' }, { status: 400 });
    }
    throw e;
  }

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

  await removeUserSavedOnlyFansCreator(authUser._id.toString(), creatorId);

  return NextResponse.json({ saved: false });
}
