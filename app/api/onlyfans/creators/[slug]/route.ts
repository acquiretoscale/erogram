import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import { OnlyFansCreator, User } from '@/lib/models';

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';

async function requireAdmin(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    const decoded = jwt.verify(auth.slice(7), JWT_SECRET) as any;
    const user = await User.findById(decoded.id).select('isAdmin');
    return user?.isAdmin ? user : null;
  } catch {
    return null;
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  await connectDB();
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { slug } = await params;
  const result = await OnlyFansCreator.deleteOne({ slug });
  if (result.deletedCount === 0) {
    return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true, slug });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  await connectDB();
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { slug } = await params;
  const body = await req.json();

  if (typeof body.featured === 'boolean') {
    const creator = await OnlyFansCreator.findOneAndUpdate(
      { slug },
      { $set: { featured: body.featured } },
      { new: true },
    );
    if (!creator) return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    return NextResponse.json({ success: true, slug, featured: creator.featured });
  }

  return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
}
