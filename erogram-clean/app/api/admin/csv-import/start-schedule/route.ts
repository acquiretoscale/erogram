import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import { User, Group } from '@/lib/models';
import { generateHumanSchedule } from '@/lib/utils/scheduleGenerator';

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
 * POST /api/admin/csv-import/start-schedule
 *
 * Generates humanized schedule dates for a set of pending groups
 * and sets their status to 'scheduled'.
 *
 * Body: { groupIds: string[], publishRate: { min: number, max: number } }
 */
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const admin = await authenticate(req);
    if (!admin) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { groupIds, publishRate } = await req.json();

    if (!Array.isArray(groupIds) || groupIds.length === 0) {
      return NextResponse.json({ message: 'No group IDs provided' }, { status: 400 });
    }

    const minPerDay = publishRate?.min ?? 3;
    const maxPerDay = publishRate?.max ?? 6;

    const scheduleDates = generateHumanSchedule(groupIds.length, {
      minPerDay,
      maxPerDay,
    });

    const bulkOps = groupIds.map((id: string, i: number) => ({
      updateOne: {
        filter: { _id: id },
        update: {
          $set: {
            status: 'scheduled',
            scheduledPublishAt: scheduleDates[i],
          },
        },
      },
    }));

    const result = await Group.bulkWrite(bulkOps);

    const lastDate = scheduleDates.length > 0
      ? scheduleDates[scheduleDates.length - 1].toISOString()
      : null;

    console.log(
      `[Start Schedule] Scheduled ${result.modifiedCount} groups, ` +
      `rate ${minPerDay}-${maxPerDay}/day, last date: ${lastDate}`
    );

    return NextResponse.json({
      scheduled: result.modifiedCount,
      firstDate: scheduleDates[0]?.toISOString() || null,
      lastDate,
      totalDays: scheduleDates.length > 0
        ? Math.ceil((scheduleDates[scheduleDates.length - 1].getTime() - scheduleDates[0].getTime()) / (1000 * 60 * 60 * 24)) + 1
        : 0,
    });
  } catch (error: any) {
    console.error('[Start Schedule] Error:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to schedule groups' },
      { status: 500 }
    );
  }
}
