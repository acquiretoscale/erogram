import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCreatorByUsername, getRelatedCreators, getCreatorReviews } from '@/lib/actions/ofCreatorProfile';
import { getTrendingOnErogram } from '@/lib/actions/publicData';
import CreatorProfileClient from '@/app/onlyfanssearch/CreatorProfileClient';
import { buildSocialMeta, CANONICAL_BASE } from '@/lib/seo/socialMeta';

export const revalidate = 300;

interface PageProps {
  params: Promise<{ creator: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { creator: username } = await params;
  const creator = await getCreatorByUsername(username);
  if (!creator) return { title: 'Not Found' };

  const title = `${creator.name} OnlyFans — @${creator.username}`;
  const description = `${creator.name} OnlyFans profile on Erogram.`;
  const url = `${CANONICAL_BASE}/onlyfans/${creator.username}`;

  return {
    title,
    description,
    ...buildSocialMeta({
      title,
      description,
      url,
      type: 'profile',
      image: creator.avatar || creator.header,
      imageAlt: `${creator.name} OnlyFans`,
    }),
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
