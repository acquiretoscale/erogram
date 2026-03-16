import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Group } from '@/lib/models';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    
    const { groupId } = await req.json();
    
    if (!groupId) {
      return NextResponse.json(
        { message: 'Group ID is required' },
        { status: 400 }
      );
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return NextResponse.json(
        { message: 'Group not found' },
        { status: 404 }
      );
    }

    await Group.findByIdAndUpdate(groupId, {
      $inc: { clickCount: 1 },
      $set: { lastClickedAt: new Date() }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Advertisement click tracking error:', error);
    return NextResponse.json(
      { message: 'Server error' },
      { status: 500 }
    );
  }
}
