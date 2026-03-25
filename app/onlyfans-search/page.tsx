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

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function OnlyFansPage({ searchParams }: PageProps) {
  const { q } = await searchParams;
  let initialCreators: any[] = [];
  let totalCreators = 0;

  try {
    await connectDB();

    const baseMatch = { avatar: { $ne: '' }, gender: 'female', categories: { $exists: true, $ne: [] } };

    const projection = {
      $project: {
        name: 1, username: 1, slug: 1, avatar: 1,
        bio: { $substrCP: [{ $ifNull: ['$bio', ''] }, 0, 200] },
        likesCount: 1, photosCount: 1, videosCount: 1,
        price: 1, isFree: 1, url: 1, clicks: 1,
      },
    };

    const [creators, count] = await Promise.all([
      OnlyFansCreator.aggregate([
        { $match: baseMatch },
        { $sort: { clicks: -1 } },
        { $limit: 80 },
        projection,
      ]),
      OnlyFansCreator.countDocuments(baseMatch),
    ]);

    initialCreators = (creators as any[]).map((c) => ({ ...c, _id: c._id.toString() }));
    totalCreators = count;
  } catch (e) {
    console.error('Failed to fetch OF creators:', e);
  }

  return (
    <OnlyFansClient
      initialCreators={initialCreators}
      totalCreators={totalCreators}
      initialQuery={q || ''}
    />
  );
}
