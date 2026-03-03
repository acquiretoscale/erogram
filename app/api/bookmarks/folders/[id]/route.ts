import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { BookmarkFolder, Bookmark } from '@/lib/models';
import { authenticateUser } from '@/lib/auth';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await authenticateUser(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  await connectDB();
  const { name } = await req.json();

  if (!name || typeof name !== 'string' || name.trim().length === 0 || name.length > 40) {
    return NextResponse.json({ message: 'Invalid folder name' }, { status: 400 });
  }

  const folder = await BookmarkFolder.findOneAndUpdate(
    { _id: id, userId: user._id },
    { name: name.trim() },
    { new: true }
  );

  if (!folder) return NextResponse.json({ message: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await authenticateUser(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  await connectDB();

  const folder = await BookmarkFolder.findOneAndDelete({ _id: id, userId: user._id });
  if (!folder) return NextResponse.json({ message: 'Not found' }, { status: 404 });

  await Bookmark.updateMany({ userId: user._id, folderId: id }, { folderId: null });

  return NextResponse.json({ success: true });
}
