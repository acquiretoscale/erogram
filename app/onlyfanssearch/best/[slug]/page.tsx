import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BEST_OF_PAGE_MAP } from '@/app/best-onlyfans-accounts/bestOfPages';
import { COMBO_BEST_OF_MAP, BANNED_COMBO_SLUGS } from '@/lib/onlyfans/categoryComboPills';
import { parseBestFreeCategorySlug } from '@/lib/onlyfans/freeMajorCategories';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;

  if (parseBestFreeCategorySlug(slug)) return {};

  if (BEST_OF_PAGE_MAP.has(slug)) return {};
  if (COMBO_BEST_OF_MAP.has(slug)) return {};
  return {};
}

export default async function OnlyFansBestSlugPage({ params }: PageProps) {
  const { slug } = await params;

  const freeCatSlug = parseBestFreeCategorySlug(slug);
  if (freeCatSlug) notFound();

  if (COMBO_BEST_OF_MAP.has(slug) || BANNED_COMBO_SLUGS.has(slug)) notFound();

  // Best ranking pages live at /best-onlyfans-accounts/{slug} only (prod canonical).
  if (BEST_OF_PAGE_MAP.has(slug)) notFound();

  notFound();
}
