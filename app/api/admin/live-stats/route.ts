import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import { User, Group } from '@/lib/models';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';

async function authenticateAdmin(token: string) {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    await connectDB();
    const user = await User.findById(decoded.id).lean();
    if (user && (user as any).isAdmin) return user;
  } catch {
    return null;
  }
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization');
    if (!auth?.startsWith('Bearer ')) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const admin = await authenticateAdmin(auth.replace('Bearer ', ''));
    if (!admin) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    await connectDB();

    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);
    const siteVisitsCol = mongoose.connection.db!.collection('sitevisits');

    const [pageviewsResult, activeVisitors] = await Promise.all([
      Group.aggregate([{ $group: { _id: null, total: { $sum: '$views' } } }]),
      siteVisitsCol.countDocuments({ ts: { $gte: thirtyMinAgo } }),
    ]);

    return NextResponse.json({
      totalPageviews: pageviewsResult[0]?.total || 0,
      activeVisitors,
    });
  } catch (err: any) {
    console.error('[admin/live-stats]', err);
    return NextResponse.json({ message: err.message || 'Internal error' }, { status: 500 });
  }
}
