import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { TrendingOFCreator } from '@/lib/models';
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
  const slots = await TrendingOFCreator.find().sort({ position: 1 }).lean();
  return NextResponse.json(slots.map((s: any) => ({ ...s, _id: s._id.toString() })));
}

export async function POST(req: NextRequest) {
  if (!getAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await connectDB();

  const body = await req.json();
  const { name, username, avatar, url, bio, categories, position, note, dealPrice, active } = body;

  if (!name || !username || !url || !position) {
    return NextResponse.json({ error: 'name, username, url, and position are required' }, { status: 400 });
  }
  if (position < 1 || position > 12) {
    return NextResponse.json({ error: 'position must be 1–12' }, { status: 400 });
  }

  // Replace existing slot if occupied
  await TrendingOFCreator.findOneAndDelete({ position });

  const creator = await TrendingOFCreator.create({
    name, username,
    avatar: avatar || '',
    url,
    bio: bio || '',
    categories: categories || [],
    position,
    note: note || '',
    dealPrice: dealPrice || 0,
    active: active !== false,
    clicks: 0,
  });

  return NextResponse.json({ creator: { ...creator.toObject(), _id: creator._id.toString() } }, { status: 201 });
}
