import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import { User, Article } from '@/lib/models';

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';

export const dynamic = 'force-dynamic';

async function authenticate(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    await connectDB();
    const user = await User.findById(decoded.id);
    if (user && user.isAdmin) return user;
  } catch {
    // ignore
  }
  return null;
}

/** GET /api/admin/articles/stats - total article clicks (views) and count. */
export async function GET(req: NextRequest) {
  try {
    const admin = await authenticate(req);
    if (!admin) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    await connectDB();
    const agg = await Article.aggregate([
      { $group: { _id: null, totalClicks: { $sum: '$views' }, count: { $sum: 1 } } },
    ]);
    const totalClicks = agg[0]?.totalClicks ?? 0;
    const count = agg[0]?.count ?? 0;
    return NextResponse.json({ totalClicks, count });
  } catch (e: any) {
    console.error('Article stats error:', e);
    return NextResponse.json({ message: e?.message || 'Failed' }, { status: 500 });
  }
}
