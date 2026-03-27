import { Metadata } from 'next';
import connectDB from '@/lib/db/mongodb';
import { OnlyFansCreator } from '@/lib/models';
import OnlyFansClient from './OnlyFansClient';
import { getLocale } from '@/lib/i18n/server';
import { mainOfMeta } from './ofMeta';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return mainOfMeta(locale);
}

export const revalidate = 300;

const TOP10_CATEGORIES = [
  'asian', 'blonde', 'teen', 'milf', 'amateur', 'redhead', 'goth', 'petite',
  'big-ass', 'big-boobs', 'brunette', 'latina', 'ahegao', 'alt', 'cosplay',
  'tattoo', 'curvy', 'ebony', 'feet', 'lingerie', 'thick',
  'twerk', 'squirt', 'streamer', 'piercing',
];

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function OnlyFansPage({ searchParams }: PageProps) {
  const { q } = await searchParams;
  let initialCreators: any[] = [];
  let totalCreators = 0;
  let top10Lists: { category: string; label: string; creators: any[] }[] = [];

  try {
    await connectDB();

    const baseMatch = { avatar: { $ne: '' }, gender: 'female', categories: { $exists: true, $ne: [] } };

    const projection = {
      $project: {
        name: 1, username: 1, slug: 1, avatar: 1, header: 1,
        categories: 1, subscriberCount: 1,
        likesCount: 1, photosCount: 1, videosCount: 1,
        price: 1, isFree: 1, url: 1, clicks: 1,
      },
    };

    const [count, ...categoryResults] = await Promise.all([
      OnlyFansCreator.countDocuments(baseMatch),
      ...TOP10_CATEGORIES.map((cat) =>
        OnlyFansCreator.aggregate([
          { $match: { ...baseMatch, categories: cat } },
          { $sort: { likesCount: -1 } },
          { $limit: 10 },
          projection,
        ])
      ),
    ]);

    initialCreators = [];
    totalCreators = count;

    const categoryLabels: Record<string, string> = {
      asian: 'Asian', blonde: 'Blonde', teen: 'Teen', milf: 'MILF',
      amateur: 'Amateur', redhead: 'Redhead', goth: 'Goth', petite: 'Petite',
      'big-ass': 'Big Ass', 'big-boobs': 'Big Boobs', brunette: 'Brunette',
      latina: 'Latina', ahegao: 'Ahegao', alt: 'Alt', cosplay: 'Cosplay',
      fitness: 'Fitness', tattoo: 'Tattoo', curvy: 'Curvy', ebony: 'Ebony',
      feet: 'Feet', lingerie: 'Lingerie', thick: 'Thick', twerk: 'Twerk',
      squirt: 'Squirt', streamer: 'Streamer', piercing: 'Piercing',
    };

    top10Lists = TOP10_CATEGORIES.map((cat, i) => ({
      category: cat,
      label: categoryLabels[cat] || cat,
      creators: (categoryResults[i] as any[]).map((c) => ({ ...c, _id: c._id.toString() })),
    })).filter((list) => list.creators.length > 0);
  } catch (e) {
    console.error('Failed to fetch OF creators:', e);
  }

  return (
    <OnlyFansClient
      initialCreators={initialCreators}
      totalCreators={totalCreators}
      initialQuery={q || ''}
      top10Lists={top10Lists}
    />
  );
}
