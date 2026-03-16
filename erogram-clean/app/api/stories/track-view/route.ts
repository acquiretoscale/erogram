import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { StorySlideContent, Group } from '@/lib/models';

export async function POST(req: NextRequest) {
  try {
    const { slideId, groupId } = await req.json();
    await connectDB();

    if (slideId) {
      await StorySlideContent.findByIdAndUpdate(slideId, { $inc: { views: 1 } });
    }

    if (groupId) {
      await Group.findByIdAndUpdate(groupId, { $inc: { storyViews: 1 } });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
