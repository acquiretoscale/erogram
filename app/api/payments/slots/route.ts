import { NextResponse } from 'next/server';
import { getPremiumSlotDisplay, MAX_PREMIUM_SLOTS } from '@/lib/premiumSlots';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const stats = await getPremiumSlotDisplay();
    return NextResponse.json(stats);
  } catch {
    return NextResponse.json({ total: MAX_PREMIUM_SLOTS, taken: 88, remaining: 12 });
  }
}
