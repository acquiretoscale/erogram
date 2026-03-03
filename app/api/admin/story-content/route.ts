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

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const admin = await authenticate(req);
    if (!admin) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const categorySlug = searchParams.get('categorySlug');

    const filter: any = {};
    if (categorySlug) filter.categorySlug = categorySlug;

    const slides = await StorySlideContent.find(filter).sort({ sortOrder: 1, createdAt: -1 }).lean();
    return NextResponse.json(slides);
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const admin = await authenticate(req);
    if (!admin) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const body = await req.json();

    const durationHours = body.duration ?? 24;
    const expiresAt = durationHours > 0
      ? new Date(Date.now() + durationHours * 60 * 60 * 1000)
      : null;

    const slide = await StorySlideContent.create({
      categorySlug: body.categorySlug,
      mediaType: body.mediaType || 'video',
      mediaUrl: body.mediaUrl,
      ctaText: body.ctaText || '',
      ctaUrl: body.ctaUrl || '',
      duration: durationHours,
      expiresAt,
      enabled: body.enabled ?? true,
      clientName: body.clientName || '',
      sortOrder: body.sortOrder ?? 0,
    });

    return NextResponse.json(slide, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Server error' }, { status: 500 });
  }
}
