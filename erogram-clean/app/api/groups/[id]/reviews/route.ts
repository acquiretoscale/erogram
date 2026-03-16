import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Post, Group } from '@/lib/models';
import { headers } from 'next/headers';

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
      status: 'approved'
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
  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();

    const { content, rating, authorName } = body;

    // Validate input
    if (!content || !rating) {
      return NextResponse.json({ error: 'Content and rating are required' }, { status: 400 });
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 });
    }

    if (content.length < 10) {
      return NextResponse.json({ error: 'Review must be at least 10 characters' }, { status: 400 });
    }

    // Verify group exists
    const group = await Group.findById(id);
    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Get client IP for rate limiting
    const headersList = await headers();
    const forwardedFor = headersList.get('x-forwarded-for');
    const realIp = headersList.get('x-real-ip');
    const clientIp = forwardedFor?.split(',')[0] || realIp || 'unknown';

    // Check rate limit: max 1 review per group per IP per day
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingReview = await Post.findOne({
      groupId: id,
      ip: clientIp,
      createdAt: { $gte: today, $lt: tomorrow }
    });

    if (existingReview) {
      return NextResponse.json({ error: 'You can only submit one review per group per day' }, { status: 429 });
    }

    // Create review (pending approval)
    const review = new Post({
      groupId: id,
      authorName: authorName || 'Anonymous',
      content: content.trim(),
      rating: parseInt(rating),
      status: 'pending',
      ip: clientIp,
      userAgent: headersList.get('user-agent') || '',
    });

    await review.save();

    return NextResponse.json({
      message: 'Review submitted successfully and is pending approval',
      reviewId: review._id
    });
  } catch (error) {
    console.error('Error creating review:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}