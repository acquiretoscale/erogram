import type { Metadata } from 'next';
import connectDB from '@/lib/db/mongodb';
import { Campaign, Group } from '@/lib/models';
import PremiumXClient from './PremiumXClient';
import { buildSocialMeta, CANONICAL_BASE } from '@/lib/seo/socialMeta';
import { getPremiumPricingForCheckout } from '@/lib/premiumPricing';
import { campaignNotExpired } from '@/lib/campaignDates';

const title = 'Upgrade to Premium | Erogram.pro';
const description = 'Unlock the Erogram Private Vault. 4800+ hand-picked Telegram groups, unlimited bookmarks, custom folders, and early access to new features.';

export const metadata: Metadata = {
  title,
  description,
  robots: { index: false, follow: false },
  ...buildSocialMeta({
    title,
    description,
    url: `${CANONICAL_BASE}/premium-x`,
    type: 'website',
  }),
};

function mapTeaser(groups: any[]) {
  return groups.map(g => ({
    _id: g._id.toString(),
    name: (g.name || '') as string,
    image: (g.image || '') as string,
    category: (g.category || '') as string,
    country: (g.country || '') as string,
    memberCount: (g.memberCount || 0) as number,
    vaultCategories: (g as any).vaultCategories || [],
  }));
}

async function getVaultTeaser() {
  try {
    await connectDB();
    const now = new Date();
    const select = 'name image category country memberCount vaultCategories';

    const liveAds = await Campaign.find({
      adType: 'premium',
      status: 'active',
      isVisible: true,
      startDate: { $lte: now },
      ...campaignNotExpired(now),
    })
      .select('premiumGroupIds')
      .lean();

    const pickedIds: string[] = [];
    const seen = new Set<string>();
    for (const ad of liveAds as any[]) {
      for (const id of ad.premiumGroupIds || []) {
        const key = id.toString();
        if (seen.has(key)) continue;
        seen.add(key);
        pickedIds.push(key);
      }
    }

    if (pickedIds.length > 0) {
      const found = await Group.find({
        _id: { $in: pickedIds },
        premiumOnly: true,
        status: 'approved',
      })
        .select(select)
        .lean();
      const byId = new Map((found as any[]).map(g => [g._id.toString(), g]));
      const ordered = pickedIds.map(id => byId.get(id)).filter(Boolean);
      if (ordered.length > 0) return mapTeaser(ordered);
    }

    const groups = await Group.find({ premiumOnly: true, status: 'approved' })
      .sort({ showOnVaultTeaser: -1, memberCount: -1 })
      .limit(8)
      .select(select)
      .lean();

    return mapTeaser(groups as any[]);
  } catch {
    return [];
  }
}

export default async function PremiumXPage() {
  const [vaultTeaser, pricing] = await Promise.all([getVaultTeaser(), getPremiumPricingForCheckout()]);
  return <PremiumXClient vaultTeaser={vaultTeaser} pricing={pricing} />;
}
