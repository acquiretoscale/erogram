import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import { User, Group, Bot, Post, Report } from '@/lib/models';

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

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const user = await authenticate(req);
    if (!user) {
      return NextResponse.json(
        { message: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    // Get metrics
    const userCount = await User.countDocuments();
    const groupCount = await Group.countDocuments();
    const approvedGroupCount = await Group.countDocuments({ status: 'approved' });
    const pendingGroupCount = await Group.countDocuments({ status: 'pending' });

    // Calculate total views from all groups
    const viewsResult = await Group.aggregate([
      {
        $group: {
          _id: null,
          totalViews: { $sum: '$views' }
        }
      }
    ]);
    const totalViews = viewsResult[0]?.totalViews || 0;

    const pendingBotCount = await Bot.countDocuments({ status: 'pending' });
    const pendingReviewCount = await Post.countDocuments({ status: 'pending' });
    const pendingReportCount = await Report.countDocuments({ status: 'pending' });

    return NextResponse.json({
      userCount,
      groupCount,
      approvedGroupCount,
      pendingGroupCount,
      pendingBotCount,
      pendingReviewCount,
      pendingReportCount,
      totalViews,
    });
  } catch (error: any) {
    console.error('Metrics error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}

