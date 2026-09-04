import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import { User } from '@/lib/models';

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';

const AUTH_HOSTS = new Set([
  'erogramx.com',
  'www.erogramx.com',
  'erogram.pro',
  'www.erogram.pro',
  'localhost:3000',
  'localhost:3939',
  '127.0.0.1:3000',
  '127.0.0.1:3939',
]);

/** Origin for OAuth redirects. Uses the host the user actually hit, not a stale env domain. */
export function getAuthOrigin(req: NextRequest): string {
  const raw = (req.headers.get('x-forwarded-host') || req.headers.get('host') || '')
    .split(',')[0]
    .trim()
    .toLowerCase();
  if (raw && AUTH_HOSTS.has(raw)) {
    const proto = raw.startsWith('localhost') || raw.startsWith('127.0.0.1')
      ? 'http'
      : (req.headers.get('x-forwarded-proto') || 'https').split(',')[0].trim();
    return `${proto}://${raw}`;
  }
  return 'https://erogramx.com';
}

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

export { FREE_BOOKMARK_LIMIT, FREE_FOLDER_LIMIT } from '@/lib/premiumLimits';
export { MAX_PREMIUM_SLOTS } from '@/lib/premiumSlots';
