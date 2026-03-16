import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import { User, Group } from '@/lib/models';

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

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    let groups = await Group.find({
      status: 'approved',
      isAdvertisement: { $ne: true },
      hideFromStories: { $ne: true },
      createdAt: { $gte: twentyFourHoursAgo },
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .select('name slug image category createdAt storyViews premiumOnly')
      .lean();

    if (groups.length === 0) {
      groups = await Group.find({
        status: 'approved',
        isAdvertisement: { $ne: true },
        hideFromStories: { $ne: true },
      })
        .sort({ createdAt: -1 })
        .limit(6)
        .select('name slug image category createdAt storyViews premiumOnly')
        .lean();
    }

    const mapped = groups.map((g: any) => ({
      _id: g._id.toString(),
      name: g.name,
      slug: g.slug,
      image: g.image,
      category: g.category,
      createdAt: g.createdAt,
      storyViews: g.storyViews || 0,
      premiumOnly: g.premiumOnly || false,
    }));

    return NextResponse.json({ groups: mapped });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Server error' }, { status: 500 });
  }
}
