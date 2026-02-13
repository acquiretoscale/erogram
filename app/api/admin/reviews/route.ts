import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import { Post, User } from '@/lib/models';

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';

async function authenticate(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = await User.findById(decoded.id);
    if (user && user.isAdmin) {
      return user;
    }
  } catch (error) {
    return null;
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const admin = await authenticate(request);
    if (!admin) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    await connectDB();

    // Get all reviews with group info
    const reviews = await Post.find({})
      .populate('groupId', 'name category')
      .populate('reviewedBy', 'username')
      .sort({ createdAt: -1 })
      .lean();

    // Format for admin panel
    const formattedReviews = reviews.map(review => ({
      _id: (review as any)._id.toString(),
      content: review.content,
      rating: review.rating,
      authorName: review.authorName,
      status: review.status,
      createdAt: review.createdAt,
      reviewedAt: review.reviewedAt,
      groupId: review.groupId ? {
        _id: (review.groupId as any)._id.toString(),
        name: (review.groupId as any).name,
        category: (review.groupId as any).category,
      } : null,
      reviewedBy: review.reviewedBy ? {
        username: (review.reviewedBy as any).username,
      } : null,
    }));

    return NextResponse.json(formattedReviews);
  } catch (error) {
    console.error('Error fetching admin reviews:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}