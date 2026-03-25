import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { OnlyFansCreator } from '@/lib/models';

/**
 * POST /api/onlyfans/click
 * Body: { slug: string }
 * Increments click counter on a creator — used for "Trending on Erogram" ranking.
 */
export async function POST(req: NextRequest) {
  try {
    const { slug } = await req.json();
    if (!slug || typeof slug !== 'string') {
      return NextResponse.json({ error: 'slug is required' }, { status: 400 });
    }

    await connectDB();
    const result = await OnlyFansCreator.findOneAndUpdate(
      { slug },
      { $inc: { clicks: 1 } },
      { new: true, projection: { clicks: 1 } },
    );

    if (!result) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, clicks: result.clicks });
  } catch (error: any) {
    console.error('Click tracking error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
