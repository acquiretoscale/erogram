import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import { User } from '@/lib/models';

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';

export interface AuthUser {
  _id: string;
  username: string;
  premium: boolean;
  premiumPlan: string | null;
  premiumExpiresAt: Date | null;
  isAdmin: boolean;
}

export async function authenticateUser(req: NextRequest): Promise<AuthUser | null> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  try {
    const decoded = jwt.verify(authHeader.substring(7), JWT_SECRET) as any;
    await connectDB();
    const user = await User.findById(decoded.id).select('username premium premiumPlan premiumExpiresAt isAdmin').lean();
    if (!user) return null;

    const u = user as any;
    const isPremium = u.premium === true &&
      (!u.premiumExpiresAt || new Date(u.premiumExpiresAt) > new Date());

    return {
      _id: u._id.toString(),
      username: u.username,
      premium: isPremium,
      premiumPlan: isPremium ? (u.premiumPlan || null) : null,
      premiumExpiresAt: u.premiumExpiresAt || null,
      isAdmin: u.isAdmin || false,
    };
  } catch {
    return null;
  }
}

export const FREE_BOOKMARK_LIMIT = 4;
