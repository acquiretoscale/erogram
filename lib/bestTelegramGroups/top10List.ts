import { Group } from '@/lib/models';

export type Top10GroupDoc = {
  _id: string;
  name: string;
  slug: string;
  category: string;
  country: string;
  description: string;
  image: string;
  views: number;
  memberCount?: number;
};

export type Top10RankEntry = {
  group: Top10GroupDoc;
  isPremium: boolean;
  rank: number;
};

function serializeGroup(g: any): Top10GroupDoc {
  return {
    _id: g._id.toString(),
    name: g.name || '',
    slug: g.slug || '',
    category: g.category || '',
    country: g.country || '',
    description: g.description || '',
    image: g.image || '',
    views: g.views || 0,
    memberCount: g.memberCount || 0,
  };
}

/** Same-niche match for category Top-10 pages — primary category only. */
export function categoryPremiumFilter(category: string) {
  return {
    status: 'approved',
    premiumOnly: true,
    showOnVaultTeaser: true,
    category,
  };
}

/** Same-niche match for country Top-10 pages. */
export function countryPremiumFilter(country: string) {
  return {
    status: 'approved',
    premiumOnly: true,
    showOnVaultTeaser: true,
    $or: [
      { country },
      { category: country },
      { categories: country },
    ],
  };
}

export async function fetchNichePremiumGroups(filter: Record<string, unknown>, limit = 5): Promise<Top10GroupDoc[]> {
  const nicheDocs = await Group.find(filter)
    .sort({ vaultTeaserOrder: 1, memberCount: -1 })
    .limit(limit)
    .lean();

  if (nicheDocs.length >= limit) {
    return nicheDocs.map(serializeGroup);
  }

  const usedIds = nicheDocs.map((g) => g._id);
  const backfillDocs = await Group.aggregate([
    {
      $match: {
        status: 'approved',
        premiumOnly: true,
        showOnVaultTeaser: true,
        _id: { $nin: usedIds },
      },
    },
    { $sample: { size: limit - nicheDocs.length } },
  ]);

  return [...nicheDocs, ...backfillDocs].map(serializeGroup);
}

/** Free ranks first (LCP / SEO), then up to 3 premium teases at the bottom. */
export function buildTop10Ranking(freeGroups: Top10GroupDoc[], premiumGroups: Top10GroupDoc[]): Top10RankEntry[] {
  const free = freeGroups.slice(0, 10);
  const premiumTail = premiumGroups.slice(0, 3);

  const entries: Top10RankEntry[] = [];
  let rank = 1;

  for (const g of free) entries.push({ group: g, isPremium: false, rank: rank++ });
  for (const pg of premiumTail) entries.push({ group: pg, isPremium: true, rank: rank++ });

  return entries;
}
