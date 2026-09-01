import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ExploreSiteListingClient from './ExploreSiteListingClient';
import { getExploreSiteAlternatives } from '@/lib/explore/exploreSiteListings';
import { resolveExploreListing } from '@/lib/actions/exploreAdmin';
import { buildSocialMeta, CANONICAL_BASE } from '@/lib/seo/socialMeta';

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = true;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const listing = await resolveExploreListing(slug);
  if (!listing) return {};

  const title = `${listing.name} | Explore | Erogram`;
  const description = listing.description;
  const url = `${CANONICAL_BASE}/porn-websites/${listing.slug}`;

  return {
    title,
    description,
    other: { rating: 'adult' },
    alternates: { canonical: url },
    ...buildSocialMeta({
      title,
      description,
      url,
      type: 'website',
      image: listing.image,
    }),
  };
}

export default async function ExploreSiteListingPage({ params }: Props) {
  const { slug } = await params;
  const listing = await resolveExploreListing(slug);
  if (!listing) notFound();

  const alternatives = getExploreSiteAlternatives(slug, 8);
  return <ExploreSiteListingClient listing={listing} alternatives={alternatives} />;
}
