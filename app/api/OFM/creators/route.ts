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
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')));
  const search = searchParams.get('search') || '';
  const category = searchParams.get('category') || '';
  const isFree = searchParams.get('isFree');
  const sortBy = searchParams.get('sortBy') || 'scrapedAt';
  const sortDir = searchParams.get('sortDir') === 'asc' ? 1 : -1;

  const query: Record<string, any> = {};
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { username: { $regex: search, $options: 'i' } },
    ];
  }
  if (category) query.categories = category;
  if (isFree === 'true') query.isFree = true;
  if (isFree === 'false') query.isFree = false;

  const validSortFields = ['scrapedAt', 'subscriberCount', 'likesCount', 'price', 'createdAt', 'name'];
  const sortField = validSortFields.includes(sortBy) ? sortBy : 'scrapedAt';

  const [creators, total] = await Promise.all([
    OnlyFansCreator.find(query)
      .sort({ [sortField]: sortDir })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    OnlyFansCreator.countDocuments(query),
  ]);

  return NextResponse.json({ creators, total, page, limit, pages: Math.ceil(total / limit) });
}

export async function POST(req: NextRequest) {
  if (!getAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const body = await req.json();

  const { name, username, url, categories, bio, avatar, header, price, isFree, isVerified,
    subscriberCount, likesCount, mediaCount, photosCount, videosCount } = body;

  if (!name || !username || !url) {
    return NextResponse.json({ error: 'name, username, and url are required' }, { status: 400 });
  }

  const slug = username.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

  try {
    const creator = await OnlyFansCreator.create({
      name, username, slug, url,
      categories: categories || [],
      bio: bio || '',
      avatar: avatar || '',
      header: header || '',
      price: price || 0,
      isFree: isFree ?? price === 0,
      isVerified: isVerified || false,
      subscriberCount: subscriberCount || 0,
      likesCount: likesCount || 0,
      mediaCount: mediaCount || 0,
      photosCount: photosCount || 0,
      videosCount: videosCount || 0,
      scrapedAt: new Date(),
    });
    return NextResponse.json({ creator }, { status: 201 });
  } catch (e: any) {
    if (e.code === 11000) return NextResponse.json({ error: 'Creator with this username already exists' }, { status: 409 });
    throw e;
  }
}
