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

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const admin = await authenticate(req);
    if (!admin) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { groupId } = await req.json();
    if (!groupId) return NextResponse.json({ message: 'groupId required' }, { status: 400 });

    await Group.findByIdAndUpdate(groupId, { hideFromStories: true });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Server error' }, { status: 500 });
  }
}
