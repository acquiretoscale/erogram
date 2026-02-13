import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import { User, Group } from '@/lib/models';
import { sendPremiumGroupTelegramNotification } from '@/lib/utils/telegramNotify';

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

// Send premium notification for a group
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const admin = await authenticate(req);
    if (!admin) {
      return NextResponse.json(
        { message: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Fetch the group
    const group = await Group.findById(id);
    if (!group) {
      return NextResponse.json(
        { message: 'Group not found' },
        { status: 404 }
      );
    }

    // Convert to plain object and ensure image is included
    const groupPlainObject = {
      _id: group._id.toString(),
      name: group.name,
      slug: group.slug,
      category: group.category,
      country: group.country,
      description: group.description,
      telegramLink: group.telegramLink,
      image: group.image,
      views: group.views || 0
    };

    // Send premium notification
    const notificationResult = await sendPremiumGroupTelegramNotification(groupPlainObject);

    if (!notificationResult.success) {
      console.error('[Premium Notification API] Failed to send premium notification:', notificationResult.error);
      return NextResponse.json(
        {
          message: 'Failed to send premium notification',
          error: notificationResult.error,
          details: (notificationResult as any).details
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: 'Premium notification sent successfully',
      messageId: notificationResult.messageId
    });
  } catch (error: any) {
    console.error('Premium notification error:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to send premium notification' },
      { status: 500 }
    );
  }
}