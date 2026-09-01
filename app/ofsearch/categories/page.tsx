import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import CategoriesClient from './CategoriesClient';
import { OF_SEARCH_ENGINE_ENABLED } from '@/lib/ofsearch/featureFlags';
import { getCategorySitemapSections } from '../categorySitemapBrowse';
import { buildSocialMeta, CANONICAL_BASE } from '@/lib/seo/socialMeta';

const title = 'Categories Sitemap';
const description = 'Browse all OnlyFans category ranking pages on Erogram.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${CANONICAL_BASE}/ofsearch/categories` },
  robots: { index: true, follow: true },
  ...buildSocialMeta({
    title,
    description,
    url: `${CANONICAL_BASE}/ofsearch/categories`,
    type: 'website',
  }),
};

export default function OnlyFansCategoriesPage() {
  if (!OF_SEARCH_ENGINE_ENABLED) redirect('/ofsearch');

  const sections = getCategorySitemapSections();
  const lastUpdated = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  return <CategoriesClient sections={sections} lastUpdated={lastUpdated} />;
}
