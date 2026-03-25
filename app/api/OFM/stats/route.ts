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

  const [
    total,
    freeCount,
    verifiedCount,
    categoryCounts,
    recentlyScrapped,
    topBySubscribers,
  ] = await Promise.all([
    OnlyFansCreator.countDocuments(),
    OnlyFansCreator.countDocuments({ isFree: true }),
    OnlyFansCreator.countDocuments({ isVerified: true }),
    OnlyFansCreator.aggregate([
      { $unwind: '$categories' },
      { $group: { _id: '$categories', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ]),
    OnlyFansCreator.countDocuments({
      scrapedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    }),
    OnlyFansCreator.find({}, 'name username subscriberCount avatar isFree price')
      .sort({ subscriberCount: -1 })
      .limit(5)
      .lean(),
  ]);

  return NextResponse.json({
    total,
    freeCount,
    paidCount: total - freeCount,
    verifiedCount,
    recentlyScrapped,
    categoryCounts,
    topBySubscribers,
  });
}
