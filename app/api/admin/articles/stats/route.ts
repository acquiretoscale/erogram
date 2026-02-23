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

/** GET /api/admin/articles/stats - total article clicks (views) and count, plus 24h/7d. */
export async function GET(req: NextRequest) {
  try {
    const admin = await authenticate(req);
    if (!admin) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    await connectDB();

    const articles = await Article.find({}).select('views viewsByDay').lean();

    const now = new Date();
    const todayKey = now.toISOString().slice(0, 10);
    const last7dKeys: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      last7dKeys.push(d.toISOString().slice(0, 10));
    }

    let totalClicks = 0;
    let totalClicks24h = 0;
    let totalClicks7d = 0;

    for (const a of articles as any[]) {
      totalClicks += a.views || 0;
      const dayMap: Record<string, number> = a.viewsByDay instanceof Map
        ? Object.fromEntries(a.viewsByDay)
        : (a.viewsByDay || {});
      totalClicks24h += dayMap[todayKey] || 0;
      totalClicks7d += last7dKeys.reduce((s, k) => s + (dayMap[k] || 0), 0);
    }

    return NextResponse.json({
      totalClicks,
      totalClicks24h,
      totalClicks7d,
      count: articles.length,
    });
  } catch (e: any) {
    console.error('Article stats error:', e);
    return NextResponse.json({ message: e?.message || 'Failed' }, { status: 500 });
  }
}
