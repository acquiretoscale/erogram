import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Bot } from '@/lib/models';

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const { botId } = await req.json();

    if (!botId) {
      return NextResponse.json(
        { message: 'Bot ID is required' },
        { status: 400 }
      );
    }

    // Update bot click count
    await Bot.findByIdAndUpdate(botId, {
      $inc: { clickCount: 1 },
      $set: { lastClickedAt: new Date() }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Bot click tracking error:', error);
    return NextResponse.json(
      { message: 'Failed to track bot click' },
      { status: 500 }
    );
  }
}