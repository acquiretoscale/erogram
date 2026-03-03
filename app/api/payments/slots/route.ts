import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { User } from '@/lib/models';

const MAX_PREMIUM_SLOTS = 100;

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await connectDB();
    const premiumCount = await User.countDocuments({
      premium: true,
      $or: [{ premiumExpiresAt: null }, { premiumExpiresAt: { $gt: new Date() } }],
    });

    return NextResponse.json({
      total: MAX_PREMIUM_SLOTS,
      taken: premiumCount,
      remaining: Math.max(0, MAX_PREMIUM_SLOTS - premiumCount),
    });
  } catch {
    return NextResponse.json({ total: MAX_PREMIUM_SLOTS, taken: 0, remaining: MAX_PREMIUM_SLOTS });
  }
}
