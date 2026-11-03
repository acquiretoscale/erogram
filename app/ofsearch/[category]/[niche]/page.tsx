import { Metadata } from 'next';
import { permanentRedirect } from 'next/navigation';
import BestOfPageView, { buildBestOfMetadata } from '@/app/best-onlyfans-accounts/BestOfPageView';
import {
  BEST_ONLYFANS_HUB_PATH,
  resolveEnglishRankingRoute,
} from '@/lib/bestOnlyfansAccounts/rankingRoute';

interface PageProps {
  params: Promise<{ category: string; niche: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category, niche } = await params;
  const resolved = resolveEnglishRankingRoute(category, niche);
  if (!resolved) permanentRedirect(BEST_ONLYFANS_HUB_PATH);
  return buildBestOfMetadata(resolved.slug, resolved.variant);
}

export default async function EnglishRankingCanonicalPage({ params }: PageProps) {
  const { category, niche } = await params;
  const resolved = resolveEnglishRankingRoute(category, niche);
  if (!resolved) permanentRedirect(BEST_ONLYFANS_HUB_PATH);
  return <BestOfPageView slug={resolved.slug} variant={resolved.variant} />;
}
