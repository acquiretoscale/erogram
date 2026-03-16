import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Bookmark } from '@/lib/models';
import { authenticateUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const user = await authenticateUser(req);
  if (!user) return NextResponse.json({ bookmarked: {} });

  await connectDB();
  const ids = req.nextUrl.searchParams.get('ids')?.split(',').filter(Boolean) || [];
  if (ids.length === 0) return NextResponse.json({ bookmarked: {} });

  const bookmarks = await Bookmark.find({
    userId: user._id,
    itemId: { $in: ids },
  }).select('itemId').lean();

  const bookmarked: Record<string, boolean> = {};
  for (const bk of bookmarks) {
    bookmarked[(bk as any).itemId.toString()] = true;
  }

  return NextResponse.json({ bookmarked });
}
