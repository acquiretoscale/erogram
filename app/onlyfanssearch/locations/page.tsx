import { Metadata } from 'next';
import LocationsClient from './LocationsClient';
import { getLocationBrowseSections } from '../locationBrowse';
import { buildSocialMeta, CANONICAL_BASE } from '@/lib/seo/socialMeta';

const title = 'OnlyFans Locations Sitemap';
const description = 'Browse OnlyFans creators by country and US state. Explore all location ranking pages on Erogram.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${CANONICAL_BASE}/onlyfanssearch/locations` },
  robots: { index: true, follow: true },
  ...buildSocialMeta({
    title,
    description,
    url: `${CANONICAL_BASE}/onlyfanssearch/locations`,
    type: 'website',
  }),
};

export default function OnlyFansLocationsPage() {
  const sections = getLocationBrowseSections();
  const lastUpdated = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  return <LocationsClient sections={sections} lastUpdated={lastUpdated} />;
}
