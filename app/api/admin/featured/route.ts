import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import { User, Group } from '@/lib/models';

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';

async function authenticate(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  try {
    const decoded = jwt.verify(authHeader.substring(7), JWT_SECRET) as any;
    const user = await User.findById(decoded.id);
    return user?.isAdmin ? user : null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const admin = await authenticate(req);
    if (!admin) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    await Group.updateMany(
      { boosted: true, boostExpiresAt: { $lte: now } },
      { $set: { boosted: false, boostExpiresAt: null, boostDuration: null } }
    );

    const featured = await Group.find({ featured: true, status: 'approved' })
      .sort({ featuredOrder: 1, featuredAt: -1 })
      .select('name slug category country categories image telegramLink views weeklyClicks clickCount memberCount verified featured featuredOrder featuredAt boosted boostExpiresAt boostDuration paidBoost paidBoostStars status')
      .lean();

    return NextResponse.json(featured);
  } catch (error: any) {
    console.error('Error fetching featured groups:', error);
    return NextResponse.json({ message: 'Failed to fetch featured groups' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await connectDB();
    const admin = await authenticate(req);
    if (!admin) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { groupId, featured, featuredOrder, boosted, boostDuration } = body;

    if (!groupId) {
      return NextResponse.json({ message: 'groupId is required' }, { status: 400 });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return NextResponse.json({ message: 'Group not found' }, { status: 404 });
    }

    const update: any = {};

    if (featured !== undefined) {
      update.featured = featured;
      if (featured && !group.featuredAt) {
        update.featuredAt = new Date();
      }
      if (!featured) {
        update.featuredAt = null;
        update.featuredOrder = 999;
        update.boosted = false;
        update.boostExpiresAt = null;
        update.boostDuration = null;
      }
    }

    if (featuredOrder !== undefined) {
      update.featuredOrder = featuredOrder;
    }

    if (boosted !== undefined) {
      update.boosted = boosted;
      if (boosted && boostDuration) {
        update.boostDuration = boostDuration;
        const now = new Date();
        const durationMs: Record<string, number> = {
          '1d': 1 * 24 * 60 * 60 * 1000,
          '7d': 7 * 24 * 60 * 60 * 1000,
          '14d': 14 * 24 * 60 * 60 * 1000,
          '30d': 30 * 24 * 60 * 60 * 1000,
        };
        update.boostExpiresAt = new Date(now.getTime() + (durationMs[boostDuration] || durationMs['7d']));
      }
      if (!boosted) {
        update.boostExpiresAt = null;
        update.boostDuration = null;
      }
    }

    const updated = await Group.findByIdAndUpdate(groupId, { $set: update }, { new: true })
      .select('name slug category country categories image telegramLink views weeklyClicks clickCount memberCount verified featured featuredOrder featuredAt boosted boostExpiresAt boostDuration paidBoost paidBoostStars status')
      .lean();

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Error updating featured group:', error);
    return NextResponse.json({ message: 'Failed to update featured group' }, { status: 500 });
  }
}
