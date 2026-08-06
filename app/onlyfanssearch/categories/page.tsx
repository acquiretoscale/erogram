import { Metadata } from 'next';
import CategoriesClient from './CategoriesClient';
import { getCategorySitemapSections } from '../categorySitemapBrowse';
import { buildSocialMeta, CANONICAL_BASE } from '@/lib/seo/socialMeta';

const title = 'Categories Sitemap';
const description = 'Browse all OnlyFans category ranking pages on Erogram.';

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

export default function OnlyFansCategoriesPage() {
  const sections = getCategorySitemapSections();
  const lastUpdated = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  return <CategoriesClient sections={sections} lastUpdated={lastUpdated} />;
}
