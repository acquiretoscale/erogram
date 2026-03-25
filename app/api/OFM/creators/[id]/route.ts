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

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!getAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await connectDB();
  const { id } = await params;
  const creator = await OnlyFansCreator.findById(id).lean();
  if (!creator) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ creator });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!getAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await connectDB();

  const { id } = await params;
  const body = await req.json();
  const allowed = ['name', 'username', 'url', 'categories', 'bio', 'avatar', 'header',
    'price', 'isFree', 'isVerified', 'featured', 'subscriberCount', 'likesCount',
    'mediaCount', 'photosCount', 'videosCount'];

  const update: Record<string, any> = {};
  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }

  if (update.username) {
    update.slug = update.username.toLowerCase()
      .replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  }

  if (typeof update.featured === 'boolean') {
    update.featuredAt = update.featured ? new Date() : null;
  }

  const creator = await OnlyFansCreator.findByIdAndUpdate(
    id,
    { $set: update },
    { new: true, runValidators: true }
  ).lean();

  if (!creator) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ creator });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!getAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await connectDB();
  const { id } = await params;
  const result = await OnlyFansCreator.findByIdAndDelete(id);
  if (!result) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}
