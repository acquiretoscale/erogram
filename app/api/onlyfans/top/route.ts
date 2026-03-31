import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { OnlyFansCreator } from '@/lib/models';

/**
 * GET /api/onlyfans/top?limit=20&trending=8
 * Returns top creators (by likes) and trending creators (by clicks).
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 500);
    const trendingLimit = Math.min(parseInt(searchParams.get('trending') || '8', 10), 50);

    await connectDB();

    const [top, trending] = await Promise.all([
      OnlyFansCreator.find({ categories: 'top', gender: 'female', deleted: { $ne: true } })
        .sort({ likesCount: -1 })
        .limit(limit)
        .select('-__v')
        .lean(),
      OnlyFansCreator.find({ clicks: { $gt: 0 }, gender: 'female', deleted: { $ne: true } })
        .sort({ clicks: -1 })
        .limit(trendingLimit)
        .select('-__v')
        .lean(),
    ]);

    return NextResponse.json({ top, trending });
  } catch (error: any) {
    console.error('Top creators error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
