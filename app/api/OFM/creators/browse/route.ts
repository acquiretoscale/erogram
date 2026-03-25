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
  if (!getAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();

  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category') || '';
  const limit = Math.min(parseInt(searchParams.get('limit') || '60', 10), 200);
  const skip = parseInt(searchParams.get('skip') || '0', 10);

  const filter: Record<string, any> = {};
  if (category) {
    filter.categories = category;
  }

  const creators = await OnlyFansCreator.find(filter)
    .sort({ scrapedAt: -1, _id: -1 })
    .skip(skip)
    .limit(limit)
    .select('_id name username slug avatar bio url categories gender price isFree likesCount')
    .lean();

  return NextResponse.json({
    creators: (creators as any[]).map(c => ({
      _id: c._id.toString(),
      name: c.name || '',
      username: c.username || '',
      slug: c.slug || '',
      avatar: c.avatar || '',
      bio: (c.bio || '').slice(0, 150),
      url: c.url || '',
      categories: c.categories || [],
      gender: c.gender || 'unknown',
      price: c.price || 0,
      isFree: c.isFree || false,
      likesCount: c.likesCount || 0,
    })),
  });
}
