import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Post, Group } from '@/lib/models';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    // Get approved reviews from all groups, sorted by newest first
    const reviews = await Post.find({
      status: 'approved'
    })
      .populate('groupId', 'name slug')
      .populate('author', 'username showNicknameUnderGroups')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // Format reviews for frontend
    const formattedReviews = reviews.map(review => ({
      _id: (review as any)._id.toString(),
      content: review.content,
      rating: review.rating,
      authorName: review.authorName || ((review as any).author?.showNicknameUnderGroups !== false ? (review as any).author?.username : null) || 'Anonymous',
      createdAt: review.createdAt,
      groupId: {
        _id: (review as any).groupId?._id?.toString(),
        name: (review as any).groupId?.name || 'Unknown Group',
        slug: (review as any).groupId?.slug
      },
      status: review.status
    }));

    return NextResponse.json(formattedReviews);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}