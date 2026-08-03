import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Post, Group } from '@/lib/models';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    // Verify group exists
    const group = await Group.findById(id);
    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Get approved reviews only
    const reviews = await Post.find({
      groupId: id,
      status: 'approved',
      author: { $ne: null },
    })
      .populate('author', 'username showNicknameUnderGroups')
      .sort({ createdAt: -1 })
      .lean();

    // Format reviews for frontend
    const formattedReviews = reviews.map(review => ({
      _id: (review as any)._id.toString(),
      content: review.content,
      rating: review.rating,
      authorName: review.authorName || ((review as any).author?.showNicknameUnderGroups !== false ? (review as any).author?.username : null) || 'Anonymous',
      createdAt: review.createdAt,
    }));

    return NextResponse.json(formattedReviews);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return NextResponse.json({ error: 'Login required to submit a review' }, { status: 401 });
}