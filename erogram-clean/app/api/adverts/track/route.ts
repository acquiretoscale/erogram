import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Advert } from '@/lib/models';

// Track advert click
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const { advertId } = await req.json();

    if (!advertId) {
      return NextResponse.json(
        { message: 'Advert ID is required' },
        { status: 400 }
      );
    }

    // Increment click count and update last clicked time
    await Advert.findByIdAndUpdate(advertId, {
      $inc: { clickCount: 1 },
      $set: { lastClickedAt: new Date() }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error tracking advert click:', error);
    return NextResponse.json(
      { message: 'Failed to track click' },
      { status: 500 }
    );
  }
}

