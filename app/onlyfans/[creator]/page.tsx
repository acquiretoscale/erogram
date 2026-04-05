import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCreatorByUsername, getRelatedCreators, getCreatorReviews } from '@/lib/actions/ofCreatorProfile';
import { getTrendingOnErogram } from '@/lib/actions/publicData';
import CreatorProfileClient from '@/app/onlyfanssearch/CreatorProfileClient';

export const revalidate = 300;

interface PageProps {
  params: Promise<{ creator: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { creator: username } = await params;
  const creator = await getCreatorByUsername(username);
  if (!creator) return { title: 'Not Found' };

  return {
    title: `${creator.name} OnlyFans — @${creator.username}`,
    description: `${creator.name} OnlyFans profile on Erogram.`,
    robots: { index: false, follow: false },
  };
}

export default async function OnlyFansCreatorPage({ params }: PageProps) {
  const { creator: username } = await params;
  const creator = await getCreatorByUsername(username);
  if (!creator) notFound();

  const [related, trendingOnErogram] = await Promise.all([
    getRelatedCreators(creator.categories, creator.slug, 6),
    getTrendingOnErogram().catch(() => []),
  ]);

  return (
    <CreatorProfileClient
      creator={creator}
      related={related}
      trendingOnErogram={trendingOnErogram}
      publicAccess={false}
    />
  );
}
