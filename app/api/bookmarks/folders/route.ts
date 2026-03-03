import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { BookmarkFolder } from '@/lib/models';
import { authenticateUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const user = await authenticateUser(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const folders = await BookmarkFolder.find({ userId: user._id })
    .sort({ sortOrder: 1, createdAt: 1 })
    .lean();

  return NextResponse.json(folders.map((f: any) => ({
    _id: f._id.toString(),
    name: f.name,
    sortOrder: f.sortOrder,
    createdAt: f.createdAt,
  })));
}

export async function POST(req: NextRequest) {
  const user = await authenticateUser(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  if (!user.premium) {
    return NextResponse.json({ message: 'Premium required to create folders', upgrade: true }, { status: 403 });
  }

  await connectDB();
  const { name } = await req.json();
  if (!name || typeof name !== 'string' || name.trim().length === 0 || name.length > 40) {
    return NextResponse.json({ message: 'Invalid folder name (1-40 characters)' }, { status: 400 });
  }

  const count = await BookmarkFolder.countDocuments({ userId: user._id });
  if (count >= 20) {
    return NextResponse.json({ message: 'Maximum 20 folders' }, { status: 400 });
  }

  const folder = await BookmarkFolder.create({
    userId: user._id,
    name: name.trim(),
    sortOrder: count,
  });

  return NextResponse.json({ _id: (folder as any)._id.toString(), name: (folder as any).name }, { status: 201 });
}
