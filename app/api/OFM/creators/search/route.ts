import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { OnlyFansCreator } from '@/lib/models';
import jwt from 'jsonwebtoken';

function getAdmin(req: NextRequest) {
  const auth = req.headers.get('authorization') || '';
  const token = auth.replace('Bearer ', '');
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_jwt_secret') as any;
    return decoded.isAdmin ? decoded : null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  if (!getAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const q = req.nextUrl.searchParams.get('q')?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ creators: [] });
  }

  await connectDB();

  const isUrl = q.startsWith('http');
  let filter: Record<string, any>;

  if (isUrl) {
    const username = q.replace(/\/$/, '').split('/').pop() || '';
    filter = {
      $or: [
        { username: { $regex: `^${username}$`, $options: 'i' } },
        { slug: { $regex: `^${username}$`, $options: 'i' } },
        { url: { $regex: username, $options: 'i' } },
      ],
    };
  } else {
    filter = {
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { username: { $regex: q, $options: 'i' } },
        { slug: { $regex: q, $options: 'i' } },
      ],
    };
  }

  const creators = await OnlyFansCreator.find(filter)
    .sort({ clicks: -1 })
    .limit(15)
    .select('name username slug avatar bio categories url clicks likesCount price isFree')
    .lean();

  return NextResponse.json({
    creators: creators.map((c: any) => ({ ...c, _id: c._id.toString() })),
  });
}
