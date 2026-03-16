import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Bookmark } from '@/lib/models';
import { authenticateUser } from '@/lib/auth';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await authenticateUser(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  await connectDB();
  const { folderId } = await req.json();

  const bookmark = await Bookmark.findOneAndUpdate(
    { _id: id, userId: user._id },
    { folderId: folderId || null },
    { new: true }
  );

  if (!bookmark) return NextResponse.json({ message: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await authenticateUser(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  await connectDB();

  const bookmark = await Bookmark.findOneAndDelete({ _id: id, userId: user._id });
  if (!bookmark) return NextResponse.json({ message: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}
