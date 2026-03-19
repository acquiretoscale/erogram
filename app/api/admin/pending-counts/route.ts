import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import { User, Bot, Post, Report } from '@/lib/models';

export const dynamic = 'force-dynamic';

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  try {
    const decoded = jwt.verify(auth.replace('Bearer ', ''), JWT_SECRET) as { id: string };
    await connectDB();
    const user = await User.findById(decoded.id).select('isAdmin').lean();
    if (!user || !(user as any).isAdmin) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const [bots, reviews, reports] = await Promise.all([
      Bot.countDocuments({ status: 'pending' }),
      Post.countDocuments({ status: 'pending' }),
      Report.countDocuments({ status: 'pending' }),
    ]);

    return NextResponse.json({ bots, reviews, reports, total: bots + reviews + reports });
  } catch {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
}
