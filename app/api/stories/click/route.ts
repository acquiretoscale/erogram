import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { StorySlideContent } from '@/lib/models';

export async function POST(req: NextRequest) {
  try {
    const { slideId } = await req.json();
    if (!slideId) return NextResponse.json({ ok: false }, { status: 400 });

    await connectDB();
    await StorySlideContent.findByIdAndUpdate(slideId, { $inc: { clicks: 1 } });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
