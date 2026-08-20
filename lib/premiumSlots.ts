import connectDB from '@/lib/db/mongodb';
import { User } from '@/lib/models';

/** Display-only scarcity cap. Never blocks checkout. */
export const MAX_PREMIUM_SLOTS = 100;

export function activeRealPremiumFilter(now = new Date()) {
  return {
    premium: true,
    isSeedUser: { $ne: true },
    $or: [{ premiumExpiresAt: null }, { premiumExpiresAt: { $gt: now } }],
  };
}

export async function countActiveRealPremiumUsers(): Promise<number> {
  await connectDB();
  return User.countDocuments(activeRealPremiumFilter());
}

/** Fake scarcity for UI. Always shows slots left; never returns 0. */
export function getDisplaySlotStats(realTaken: number) {
  const remaining = Math.max(5, Math.min(28, 17 - (realTaken % 12)));
  return {
    total: MAX_PREMIUM_SLOTS,
    taken: MAX_PREMIUM_SLOTS - remaining,
    remaining,
  };
}

export async function getPremiumSlotDisplay() {
  const realTaken = await countActiveRealPremiumUsers();
  return getDisplaySlotStats(realTaken);
}
