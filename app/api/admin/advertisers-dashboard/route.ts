import { NextRequest, NextResponse } from 'next/server';
import { getAdvertisers } from '@/lib/actions/advertisers';
import {
  getCampaigns,
  getSlotCapacity,
  getFeedTierCapacity,
  getGlobalClickStats,
  getSlotClickTotals,
} from '@/lib/actions/campaigns';

function getToken(req: NextRequest): string {
  const auth = req.headers.get('authorization');
  return auth?.startsWith('Bearer ') ? auth.slice(7) : '';
}

export async function GET(req: NextRequest) {
  try {
    const token = getToken(req);
    const [advertisers, campaigns, slots, feedTierCapacity, globalStats, slotTotals] = await Promise.all([
      getAdvertisers(token),
      getCampaigns(token),
      getSlotCapacity(token),
      getFeedTierCapacity(token),
      getGlobalClickStats(token).catch(() => ({ totalClicks: 0, last7Days: 0, last30Days: 0 })),
      getSlotClickTotals(token).catch(() => []),
    ]);
    return NextResponse.json({
      advertisers,
      campaigns,
      slots,
      feedTierCapacity,
      globalStats,
      slotTotals,
    });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || 'Unauthorized' }, { status: err.message === 'Unauthorized' ? 401 : 500 });
  }
}
