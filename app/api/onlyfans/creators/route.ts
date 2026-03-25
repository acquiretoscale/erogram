import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { OnlyFansCreator } from '@/lib/models';

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '80', 10), 200);
    const excludeIds = searchParams.get('exclude')?.split(',').filter(Boolean) || [];

    const match: Record<string, any> = {
      avatar: { $ne: '' },
      gender: 'female',
      categories: { $exists: true, $ne: [] },
    };

    if (excludeIds.length > 0) {
      const { Types } = await import('mongoose');
      match._id = { $nin: excludeIds.map((id) => new Types.ObjectId(id)) };
    }

    // Always sample randomly so categories stay mixed across all pages
    const pipeline: any[] = [
      { $match: match },
      { $sample: { size: limit } },
      {
        $project: {
          name: 1, username: 1, slug: 1, avatar: 1,
          bio: { $substrCP: [{ $ifNull: ['$bio', ''] }, 0, 200] },
          likesCount: 1, photosCount: 1, videosCount: 1,
          price: 1, isFree: 1, url: 1, clicks: 1,
        },
      },
    ];

    const [creators, total] = await Promise.all([
      OnlyFansCreator.aggregate(pipeline),
      OnlyFansCreator.estimatedDocumentCount(),
    ]);

    const hasMore = excludeIds.length + creators.length < total;

    return NextResponse.json({
      creators: creators.map((c: any) => ({ ...c, _id: c._id.toString() })),
      hasMore,
      total,
    });
  } catch (error: any) {
    console.error('Error fetching OF creators:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
