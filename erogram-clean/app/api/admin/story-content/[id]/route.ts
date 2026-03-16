import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import { User, StorySlideContent } from '@/lib/models';

export const dynamic = 'force-dynamic';
const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';

async function authenticate(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    const decoded = jwt.verify(authHeader.substring(7), JWT_SECRET) as any;
    const user = await User.findById(decoded.id);
    return user?.isAdmin ? user : null;
  } catch { return null; }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const admin = await authenticate(req);
    if (!admin) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await req.json();

    const update: any = {};
    if (body.mediaType !== undefined) update.mediaType = body.mediaType;
    if (body.mediaUrl !== undefined) update.mediaUrl = body.mediaUrl;
    if (body.ctaText !== undefined) update.ctaText = body.ctaText;
    if (body.ctaUrl !== undefined) update.ctaUrl = body.ctaUrl;
    if (body.enabled !== undefined) update.enabled = body.enabled;
    if (body.clientName !== undefined) update.clientName = body.clientName;
    if (body.caption !== undefined) update.caption = body.caption;
    if (body.sortOrder !== undefined) update.sortOrder = body.sortOrder;
    if (body.duration !== undefined) {
      update.duration = body.duration;
      update.expiresAt = body.duration > 0
        ? new Date(Date.now() + body.duration * 60 * 60 * 1000)
        : null;
    }

    const slide = await StorySlideContent.findByIdAndUpdate(id, update, { new: true });
    if (!slide) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    return NextResponse.json(slide);
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const admin = await authenticate(req);
    if (!admin) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const slide = await StorySlideContent.findByIdAndDelete(id);
    if (!slide) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    return NextResponse.json({ message: 'Deleted' });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Server error' }, { status: 500 });
  }
}
