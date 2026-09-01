import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import BestOfPageView, { buildBestOfMetadata } from '@/app/best-onlyfans-accounts/BestOfPageView';
import { BEST_OF_PAGE_MAP } from '@/app/best-onlyfans-accounts/bestOfPages';
import { rankingListSize } from '@/lib/bestOfPageContent/top50Rankings';

const HUBS: Record<string, { variant: 'top10' | 'best'; size: 25 | 50 }> = {
  'top-25-onlyfans-models': { variant: 'top10', size: 25 },
  'top-50-onlyfans-models': { variant: 'top10', size: 50 },
  'best-25-onlyfans-models': { variant: 'best', size: 25 },
  'best-50-onlyfans-models': { variant: 'best', size: 50 },
};

interface PageProps {
  params: Promise<{ category: string; niche: string }>;
}

function resolveRanking(hub: string, niche: string) {
  const spec = HUBS[hub];
  if (!spec) return null;
  const slug = (niche || '').trim().toLowerCase();
  if (!BEST_OF_PAGE_MAP.has(slug)) return null;
  if (rankingListSize(slug) !== spec.size) return null;
  return { slug, variant: spec.variant };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category, niche } = await params;
  const resolved = resolveRanking(category, niche);
  if (!resolved) notFound();
  return buildBestOfMetadata(resolved.slug, resolved.variant);
}

export default async function EnglishRankingCanonicalPage({ params }: PageProps) {
  const { category, niche } = await params;
  const resolved = resolveRanking(category, niche);
  if (!resolved) notFound();
  return <BestOfPageView slug={resolved.slug} variant={resolved.variant} />;
}
