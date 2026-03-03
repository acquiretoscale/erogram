import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Bookmark, Group, Bot } from '@/lib/models';
import { authenticateUser, FREE_BOOKMARK_LIMIT } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const user = await authenticateUser(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const folderId = req.nextUrl.searchParams.get('folderId');
  const filter: any = { userId: user._id };
  if (folderId === 'null' || folderId === '') filter.folderId = null;
  else if (folderId) filter.folderId = folderId;

  const bookmarks = await Bookmark.find(filter).sort({ createdAt: -1 }).lean();

  const groupIds = bookmarks.filter(b => (b as any).itemType === 'group').map(b => (b as any).itemId);
  const botIds = bookmarks.filter(b => (b as any).itemType === 'bot').map(b => (b as any).itemId);

  const [groups, bots] = await Promise.all([
    groupIds.length ? Group.find({ _id: { $in: groupIds } }).select('name slug image category country memberCount description').lean() : [],
    botIds.length ? Bot.find({ _id: { $in: botIds } }).select('name slug image category country memberCount description').lean() : [],
  ]);

  const itemMap = new Map<string, any>();
  for (const g of groups) itemMap.set((g as any)._id.toString(), { ...(g as any), _type: 'group' });
  for (const b of bots) itemMap.set((b as any)._id.toString(), { ...(b as any), _type: 'bot' });

  const result = bookmarks.map((bk: any) => ({
    _id: bk._id.toString(),
    itemType: bk.itemType,
    itemId: bk.itemId.toString(),
    folderId: bk.folderId?.toString() || null,
    createdAt: bk.createdAt,
    item: itemMap.get(bk.itemId.toString()) || null,
  }));

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const user = await authenticateUser(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const { itemType, itemId, folderId } = await req.json();

  if (!itemType || !itemId || !['group', 'bot'].includes(itemType)) {
    return NextResponse.json({ message: 'Invalid itemType or itemId' }, { status: 400 });
  }

  const existing = await Bookmark.findOne({ userId: user._id, itemType, itemId });
  if (existing) {
    return NextResponse.json({ message: 'Already bookmarked', _id: (existing as any)._id.toString() });
  }

  if (!user.premium) {
    const count = await Bookmark.countDocuments({ userId: user._id });
    if (count >= FREE_BOOKMARK_LIMIT) {
      return NextResponse.json({ message: 'Bookmark limit reached', upgrade: true, limit: FREE_BOOKMARK_LIMIT }, { status: 403 });
    }
  }

  const bookmark = await Bookmark.create({
    userId: user._id,
    itemType,
    itemId,
    folderId: folderId || null,
  });

  return NextResponse.json({ _id: (bookmark as any)._id.toString() }, { status: 201 });
}
