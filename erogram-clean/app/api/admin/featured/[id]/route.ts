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

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const admin = await authenticate(req);
    if (!admin) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const group = await Group.findByIdAndUpdate(
      id,
      {
        $set: {
          featured: false,
          featuredOrder: 999,
          featuredAt: null,
          boosted: false,
          boostExpiresAt: null,
          boostDuration: null,
        },
      },
      { new: true }
    );

    if (!group) {
      return NextResponse.json({ message: 'Group not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Group removed from featured' });
  } catch (error: any) {
    console.error('Error removing featured group:', error);
    return NextResponse.json({ message: 'Failed to remove featured group' }, { status: 500 });
  }
}
