import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Vote, Group } from '@/lib/models';
import { authenticateUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const user = await authenticateUser(req);
  if (!user) {
    return NextResponse.json({ message: 'Login required' }, { status: 401 });
  }
  if (!user.premium && !user.isAdmin) {
    return NextResponse.json({ message: 'Premium required' }, { status: 403 });
  }

  await connectDB();

  const { groupId, vote } = await req.json();
  if (!groupId || !['like', 'dislike'].includes(vote)) {
    return NextResponse.json({ message: 'Invalid request' }, { status: 400 });
  }

  const existing = await Vote.findOne({ userId: user._id, groupId });

  if (existing) {
    if (existing.vote === vote) {
      // Toggle off — remove vote
      await existing.deleteOne();
      await Group.findByIdAndUpdate(groupId, { $inc: { [vote === 'like' ? 'likes' : 'dislikes']: -1 } });
      const g = await Group.findById(groupId).select('likes dislikes').lean();
      return NextResponse.json({ likes: g?.likes || 0, dislikes: g?.dislikes || 0, userVote: null });
    }
    // Switching vote
    const oldField = existing.vote === 'like' ? 'likes' : 'dislikes';
    const newField = vote === 'like' ? 'likes' : 'dislikes';
    existing.vote = vote;
    await existing.save();
    await Group.findByIdAndUpdate(groupId, { $inc: { [oldField]: -1, [newField]: 1 } });
    const g = await Group.findById(groupId).select('likes dislikes').lean();
    return NextResponse.json({ likes: g?.likes || 0, dislikes: g?.dislikes || 0, userVote: vote });
  }

  // New vote
  await Vote.create({ userId: user._id, groupId, vote });
  await Group.findByIdAndUpdate(groupId, { $inc: { [vote === 'like' ? 'likes' : 'dislikes']: 1 } });
  const g = await Group.findById(groupId).select('likes dislikes').lean();
  return NextResponse.json({ likes: g?.likes || 0, dislikes: g?.dislikes || 0, userVote: vote });
}

// GET: fetch user's votes for a batch of group IDs
export async function GET(req: NextRequest) {
  const user = await authenticateUser(req);
  if (!user) return NextResponse.json({ votes: {} });

  await connectDB();

  const ids = req.nextUrl.searchParams.get('ids')?.split(',').filter(Boolean) || [];
  if (ids.length === 0) return NextResponse.json({ votes: {} });

  const votes = await Vote.find({ userId: user._id, groupId: { $in: ids } }).lean();
  const map: Record<string, string> = {};
  for (const v of votes as any[]) {
    map[v.groupId.toString()] = v.vote;
  }
  return NextResponse.json({ votes: map });
}
