import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import LocationsClient from './LocationsClient';
import { OF_SEARCH_ENGINE_ENABLED } from '@/lib/ofsearch/featureFlags';
import { getLocationBrowseSections } from '../locationBrowse';
import { buildSocialMeta, CANONICAL_BASE } from '@/lib/seo/socialMeta';

const title = 'OnlyFans Locations Sitemap';
const description = 'Browse OnlyFans creators by country and US state. Explore all location ranking pages on Erogram.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${CANONICAL_BASE}/ofsearch/locations` },
  robots: { index: true, follow: true },
  ...buildSocialMeta({
    title,
    description,
    url: `${CANONICAL_BASE}/ofsearch/locations`,
    type: 'website',
  }),
};

export default function OnlyFansLocationsPage() {
  if (!OF_SEARCH_ENGINE_ENABLED) redirect('/ofsearch');

  const sections = getLocationBrowseSections();
  const lastUpdated = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  return <LocationsClient sections={sections} lastUpdated={lastUpdated} />;
}
