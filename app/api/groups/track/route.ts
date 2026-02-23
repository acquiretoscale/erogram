import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Group } from '@/lib/models';

// Track group join click
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const { groupId } = await req.json();

    if (!groupId) {
      return NextResponse.json({ message: 'Group ID is required' }, { status: 400 });
    }

    const todayUtc = new Date().toISOString().slice(0, 10); // YYYY-MM-DD for last-48h
    await Group.findByIdAndUpdate(groupId, {
      $inc: { clickCount: 1, weeklyClicks: 1, [`clickCountByDay.${todayUtc}`]: 1 },
      $set: { lastClickedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Group click tracking error:', error);
    return NextResponse.json({ message: 'Failed to track group click' }, { status: 500 });
  }
}

