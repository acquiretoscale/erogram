import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import { User, Bot } from '@/lib/models';

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';

async function authenticate(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = await User.findById(decoded.id);
    if (user && user.isAdmin) {
      return user;
    }
  } catch (error) {
    return null;
  }
  return null;
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    
    const admin = await authenticate(req);
    if (!admin) {
      return NextResponse.json(
        { message: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }
    
    const { searchParams } = req.nextUrl;
    const search = searchParams.get('search');
    
    let query: any = {};
    if (search) {
      query = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { category: { $regex: search, $options: 'i' } },
          { country: { $regex: search, $options: 'i' } }
        ]
      };
    }
    
    const bots = await Bot.find(query)
      .sort({ createdAt: -1 })
      .lean();

    const now = new Date();
    const todayKey = now.toISOString().slice(0, 10);
    const last7dKeys: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      last7dKeys.push(d.toISOString().slice(0, 10));
    }

    const enriched = (bots as any[]).map((b) => {
      const dayMap: Record<string, number> = b.clickCountByDay instanceof Map
        ? Object.fromEntries(b.clickCountByDay)
        : (b.clickCountByDay || {});
      const clicks24h = dayMap[todayKey] || 0;
      const clicks7d = last7dKeys.reduce((s, k) => s + (dayMap[k] || 0), 0);
      return { ...b, clicks24h, clicks7d };
    });

    return NextResponse.json(enriched);
  } catch (error: any) {
    console.error('Bots fetch error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch bots' },
      { status: 500 }
    );
  }
}
