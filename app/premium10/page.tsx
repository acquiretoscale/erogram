import type { Metadata } from 'next';
import connectDB from '@/lib/db/mongodb';
import { Group, SiteConfig } from '@/lib/models';
import Premium10Client from './Premium10Client';

export const metadata: Metadata = {
  title: 'Upgrade to Premium | Erogram.pro',
  description: 'Unlock the Erogram Private Vault — hundreds of hand-picked Telegram groups, unlimited bookmarks, custom folders, and early access to new features.',
  robots: { index: false, follow: false },
};

async function getVaultTeaser() {
  try {
    await connectDB();

    let groups = await Group.find({ showOnVaultTeaser: true, premiumOnly: true, status: 'approved' })
      .sort({ vaultTeaserOrder: 1 })
      .select('name image category country memberCount vaultTeaserOrder vaultCategories')
      .lean();

    if (groups.length > 14) {
      groups = [...groups].sort(() => Math.random() - 0.5).slice(0, 14);
    }

    if (groups.length === 0) {
      groups = await Group.find({ premiumOnly: true, status: 'approved' })
        .sort({ createdAt: -1 })
        .limit(14)
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

export default async function Premium10Page() {
  const vaultTeaser = await getVaultTeaser();
  return <Premium10Client vaultTeaser={vaultTeaser} />;
}
