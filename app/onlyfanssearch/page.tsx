import { Metadata } from 'next';
import { headers } from 'next/headers';
import connectDB from '@/lib/db/mongodb';
import { OnlyFansCreator } from '@/lib/models';
import OnlyFansClient from './OnlyFansClient';
import { getLocale } from '@/lib/i18n/server';
import { mainOfMeta } from './ofMeta';
import { getActiveCampaigns } from '@/lib/actions/campaigns';
import { getTrendingOnErogram } from '@/lib/actions/publicData';
import { detectDeviceFromUserAgent } from '@/lib/utils/device';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return mainOfMeta(locale);
}

export const revalidate = 300;

const TOP10_CATEGORIES = [
  'streamer', 'big-boobs', 'brunette', 'blonde', 'redhead', 'petite', 'latina', 'big-ass',
  'asian', 'teen', 'amateur', 'ahegao', 'cosplay',
  'milf', 'ebony', 'feet', 'goth', 'alt',
];

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function OnlyFansPage({ searchParams }: PageProps) {
  const ua = (await headers()).get('user-agent');
  const { isMobile } = detectDeviceFromUserAgent(ua);
  const { q } = await searchParams;
  let initialCreators: any[] = [];
  let totalCreators = 0;
  let recentlyAdded: any[] = [];
  let top10Lists: { category: string; label: string; creators: any[] }[] = [];

  try {
    await connectDB();

    const baseMatch = { avatar: { $ne: '' }, gender: 'female', categories: { $exists: true, $ne: [] }, deleted: { $ne: true } };

    const projection = {
      $project: {
        name: 1, username: 1, slug: 1, avatar: 1, header: 1,
        categories: 1, subscriberCount: 1,
        likesCount: 1, photosCount: 1, videosCount: 1,
        price: 1, isFree: 1, url: 1, clicks: 1,
      },
    };

    const [count, recentRaw, ...categoryResults] = await Promise.all([
      OnlyFansCreator.countDocuments(baseMatch),
      OnlyFansCreator.find(baseMatch)
        .sort({ createdAt: -1 })
        .limit(30)
        .select('name username slug avatar header categories subscriberCount likesCount photosCount videosCount price isFree url clicks')
        .lean(),
      ...TOP10_CATEGORIES.map((cat) =>
        OnlyFansCreator.aggregate([
          { $match: { ...baseMatch, categories: cat } },
          { $sort: { likesCount: -1 } },
          { $limit: 10 },
          projection,
        ]),
      ),
    ]);

    initialCreators = [];
    totalCreators = count;
    recentlyAdded = (recentRaw as any[]).map((c) => ({ ...c, _id: c._id.toString() }));

    const categoryLabels: Record<string, string> = {
      asian: 'Asian', blonde: 'Blonde', teen: 'Teen', milf: 'MILF',
      amateur: 'Amateur', redhead: 'Redhead', goth: 'Goth', petite: 'Petite',
      'big-ass': 'Big Ass', 'big-boobs': 'Big Boobs', brunette: 'Brunette',
      latina: 'Latina', ahegao: 'Ahegao', alt: 'Alt', cosplay: 'Cosplay',
      fitness: 'Fitness', tattoo: 'Tattoo', curvy: 'Curvy', ebony: 'Ebony',
      feet: 'Feet', lingerie: 'Lingerie', thick: 'Thick', twerk: 'Twerk',
      squirt: 'Squirt', streamer: 'Streamer', piercing: 'Piercing',
    };

    top10Lists = TOP10_CATEGORIES.map((cat, idx) => ({
      category: cat,
      label: categoryLabels[cat] || cat,
      creators: (categoryResults[idx] as any[]).map((c) => ({ ...c, _id: c._id.toString() })),
    })).filter((list) => list.creators.length > 0);
  } catch (e) {
    console.error('Failed to fetch OF creators:', e);
  }

  const [topBannerCampaigns, trendingOnErogram] = await Promise.all([
    getActiveCampaigns('top-banner', { page: 'onlyfanssearch', device: isMobile ? 'mobile' : 'desktop' }).catch(() => []),
    getTrendingOnErogram().catch(() => []),
  ]);

  return (
    <OnlyFansClient
      initialCreators={initialCreators}
      totalCreators={totalCreators}
      initialQuery={q || ''}
      top10Lists={top10Lists}
      recentlyAdded={recentlyAdded}
      topBannerCampaigns={topBannerCampaigns}
      trendingOnErogram={trendingOnErogram}
    />
  );
}
