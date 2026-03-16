import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import { User, Group } from '@/lib/models';

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';

async function authenticate(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = await User.findById(decoded.id);
    if (user && user.isAdmin) return user;
  } catch { /* invalid token */ }
  return null;
}

/**
 * PUT /api/admin/csv-import/reschedule
 *
 * Change the scheduled publish date/time for a single group.
 * Body: { groupId: string, scheduledPublishAt: string (ISO date) }
 */
export async function PUT(req: NextRequest) {
  try {
    await connectDB();
    const admin = await authenticate(req);
    if (!admin) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { groupId, scheduledPublishAt } = await req.json();

    if (!groupId || !scheduledPublishAt) {
      return NextResponse.json({ message: 'groupId and scheduledPublishAt are required' }, { status: 400 });
    }

    const newDate = new Date(scheduledPublishAt);
    if (isNaN(newDate.getTime())) {
      return NextResponse.json({ message: 'Invalid date format' }, { status: 400 });
    }

    const group = await Group.findOneAndUpdate(
      { _id: groupId, status: 'scheduled' },
      { $set: { scheduledPublishAt: newDate } },
      { new: true }
    );

    if (!group) {
      return NextResponse.json({ message: 'Group not found or not in scheduled status' }, { status: 404 });
    }

    console.log(`[Reschedule] Group ${groupId} moved to ${newDate.toISOString()}`);

    return NextResponse.json({
      groupId: group._id,
      scheduledPublishAt: group.scheduledPublishAt,
      name: group.name,
    });
  } catch (error: any) {
    console.error('[Reschedule] Error:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to reschedule group' },
      { status: 500 }
    );
  }
}
