import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import { User } from '@/lib/models';

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    const u = user as any;
    const isPremium = u.premium === true &&
      (!u.premiumExpiresAt || new Date(u.premiumExpiresAt) > new Date());

    const authProvider: 'telegram' | 'google' | 'password' =
      u.telegramId ? 'telegram' : u.googleId ? 'google' : 'password';

    return NextResponse.json({
      id: user._id,
      username: user.username,
      email: user.email,
      isAdmin: user.isAdmin,
      authProvider,
      premium: isPremium,
      premiumPlan: isPremium ? (u.premiumPlan || null) : null,
      premiumSince: isPremium ? (u.premiumSince || null) : null,
      premiumExpiresAt: u.premiumExpiresAt || null,
      country: u.country || null,
      city: u.city || null,
      timezone: u.timezone || null,
    });
  } catch (error: any) {
    console.error('Auth check error:', error);
    return NextResponse.json(
      { message: 'Invalid token' },
      { status: 401 }
    );
  }
}
