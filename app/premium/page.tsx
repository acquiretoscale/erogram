import type { Metadata } from 'next';
import connectDB from '@/lib/db/mongodb';
import { Group, SiteConfig } from '@/lib/models';
import PremiumClient from './PremiumClient';
import { buildSocialMeta, CANONICAL_BASE } from '@/lib/seo/socialMeta';
import { getPremiumPricingForCheckout } from '@/lib/premiumPricing';

const title = 'Upgrade to Premium | Erogram.pro';
const description = 'Unlock the Erogram Private Vault — 4800+ hand-picked Telegram groups, unlimited bookmarks, custom folders, and early access to new features.';

export const metadata: Metadata = {
  title,
  description,
  robots: { index: false, follow: false },
  ...buildSocialMeta({
    title,
    description,
    url: `${CANONICAL_BASE}/premium`,
    type: 'website',
  }),
};

async function getVaultTeaser() {
  try {
    await connectDB();

    let groups = await Group.find({ showOnVaultTeaser: true, premiumOnly: true, status: 'approved' })
      .sort({ vaultTeaserOrder: 1 })
      .select('name image category country memberCount vaultTeaserOrder vaultCategories')
      .lean();

    if (groups.length > 36) {
      groups = [...groups].sort(() => Math.random() - 0.5).slice(0, 36);
    }

    if (groups.length === 0) {
      groups = await Group.find({ premiumOnly: true, status: 'approved' })
        .sort({ createdAt: -1 })
        .limit(36)
        .select('name image category country memberCount vaultCategories')
        .lean();
    }

    return (groups as any[]).map(g => ({
      _id: g._id.toString(),
      name: (g.name || '') as string,
      image: (g.image || '') as string,
      category: (g.category || '') as string,
      country: (g.country || '') as string,
      memberCount: (g.memberCount || 0) as number,
      vaultCategories: (g as any).vaultCategories || [],
    }));
  } catch {
    return [];
  }
}

export default async function PremiumPage() {
  const [vaultTeaser, pricing] = await Promise.all([getVaultTeaser(), getPremiumPricingForCheckout()]);
  return <PremiumClient vaultTeaser={vaultTeaser} pricing={pricing} />;
}
