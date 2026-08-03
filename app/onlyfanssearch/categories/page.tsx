import { Metadata } from 'next';
import CategoriesClient from './CategoriesClient';
import { getCategoryBrowseSections, getCountryBrowseRegions, getUsStateBrowseItems } from '../categoryBrowse';
import { buildSocialMeta, CANONICAL_BASE } from '@/lib/seo/socialMeta';

const title = 'Browse OnlyFans Categories';
const description = 'Find creators by type, look, ethnicity, or kink. Updated daily. Browse main OnlyFans categories on Erogram.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${CANONICAL_BASE}/onlyfanssearch/categories` },
  robots: { index: true, follow: true },
  ...buildSocialMeta({
    title,
    description,
    url: `${CANONICAL_BASE}/onlyfanssearch/categories`,
    type: 'website',
  }),
};

export default async function OnlyFansCategoriesPage() {
  const [sections, countryRegions] = await Promise.all([
    getCategoryBrowseSections(),
    getCountryBrowseRegions(),
  ]);
  const usStates = getUsStateBrowseItems();

  return <CategoriesClient sections={sections} countryRegions={countryRegions} usStates={usStates} />;
}
