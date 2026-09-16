import type { Metadata } from 'next';
import ExploreClient from './ExploreClient';
import { buildSocialMeta, CANONICAL_BASE } from '@/lib/seo/socialMeta';
import { isExploreCategoryListed } from '@/lib/explore/applyExploreAdmin';
import { loadExplorePageCategories } from '@/lib/explore/loadExplorePageCategories';

const title = 'Explore | ErogramX';
const description = 'Adult website directory by category.';

export const revalidate = 300;

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  other: { rating: 'adult' },
  alternates: { canonical: `${CANONICAL_BASE}/best-porn` },
  ...buildSocialMeta({
    title,
    description,
    url: `${CANONICAL_BASE}/best-porn`,
    type: 'website',
  }),
};

export default async function ExplorePage() {
  const { categories, listed } = await loadExplorePageCategories();
  const publicCategories = categories.filter((category) => isExploreCategoryListed(category.slug, listed));
  return <ExploreClient categories={publicCategories} listedOverrides={listed} />;
}
