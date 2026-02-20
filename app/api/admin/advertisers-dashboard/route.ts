import { NextRequest, NextResponse } from 'next/server';
import { getAdvertisers } from '@/lib/actions/advertisers';
import {
  getCampaigns,
  getSlotCapacity,
  getFeedTierCapacity,
  getGlobalClickStats,
  getSlotClickTotals,
  getClicksByAdvertiser,
  getFeedCampaignClickStats,
} from '@/lib/actions/campaigns';

export const dynamic = 'force-dynamic';

function getToken(req: NextRequest): string {
  const auth = req.headers.get('authorization');
  return auth?.startsWith('Bearer ') ? auth.slice(7) : '';
}

export async function GET(req: NextRequest) {
  try {
    const token = getToken(req);
    const [advertisers, campaigns, slots, feedTierCapacity, globalStats, slotTotals, clicksByAdvertiser, feedClickStats] = await Promise.all([
      getAdvertisers(token),
      getCampaigns(token),
      getSlotCapacity(token),
      getFeedTierCapacity(token),
      getGlobalClickStats(token).catch(() => ({ totalClicks: 0, todayClicks: 0, last24h: 0, last7Days: 0, last30Days: 0 })),
      getSlotClickTotals(token).catch(() => []),
      getClicksByAdvertiser(token).catch(() => []),
      getFeedCampaignClickStats(token).catch(() => ({})),
    ]);
    return NextResponse.json({
      advertisers,
      campaigns,
      slots,
      feedTierCapacity,
      globalStats,
      slotTotals,
      clicksByAdvertiser,
      feedClickStats,
    });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || 'Unauthorized' }, { status: err.message === 'Unauthorized' ? 401 : 500 });
  }
}
