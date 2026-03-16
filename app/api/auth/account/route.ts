import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { User, Bookmark, BookmarkFolder, Post } from '@/lib/models';
import { authenticateUser } from '@/lib/auth';

export async function DELETE(req: NextRequest) {
  const user = await authenticateUser(req);
  if (!user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  await connectDB();

  await Promise.all([
    Bookmark.deleteMany({ userId: user._id }),
    BookmarkFolder.deleteMany({ userId: user._id }),
    Post.deleteMany({ author: user._id }),
  ]);

  await User.findByIdAndDelete(user._id);

  return NextResponse.json({ message: 'Account deleted' });
}
