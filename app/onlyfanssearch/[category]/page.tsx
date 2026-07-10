import { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import connectDB from '@/lib/db/mongodb';
import { OnlyFansCreator } from '@/lib/models';
import CategoryClient from './CategoryClient';
import { OF_CATEGORY_SLUGS, OF_CATEGORY_MAP, ofCategoryUrl } from '../constants';
import { getLocale } from '@/lib/i18n/server';
import { categoryOfMeta } from '../ofMeta';
import { getKeywordPlacementCampaigns } from '@/lib/actions/campaigns';
import { bestOfSlugFromPublicPath } from '@/lib/bestOfPageContent/hottestUrls';
import BestOfPageView, { buildBestOfMetadata } from '@/app/best-onlyfans-accounts/BestOfPageView';

// SEO: no more force-dynamic + $sample. The page now serves a STABLE curated
// ranking so Google sees the same content on every crawl (brain GAP 5 → was
// buried at position 30+ because the random set changed every crawl).

interface PageProps {
  params: Promise<{ category: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category: rawSlug } = await params;
  const locale = await getLocale();

  // Top-10 OnlyFans category pages live at /onlyfanssearch/top-10-{cat}-onlyfans-models.
  const bestOf = bestOfSlugFromPublicPath(rawSlug);
  if (bestOf) return buildBestOfMetadata(bestOf);

  if (rawSlug.endsWith('2026')) return {};

  const cat = OF_CATEGORY_MAP.get(rawSlug);
  if (cat) return categoryOfMeta(locale, rawSlug, cat.name);

  return {};
}

function serializeCreator(c: any) {
  return {
    _id: c._id.toString(),
    name: c.name || '',
    username: c.username || '',
    slug: c.slug || '',
    avatar: c.avatar || '',
    header: c.header || '',
    bio: (c.bio || '').slice(0, 200),
    subscriberCount: c.subscriberCount || 0,
    likesCount: c.likesCount || 0,
    mediaCount: c.mediaCount || 0,
    photosCount: c.photosCount || 0,
    videosCount: c.videosCount || 0,
    price: c.price || 0,
    isFree: c.isFree || false,
    isVerified: c.isVerified || false,
    url: c.url || '',
    clicks: c.clicks || 0,
  };
}


export default async function OnlyFansSlugPage({ params }: PageProps) {
  const { category: rawSlug } = await params;

  // Top-10 OnlyFans category ranking pages live here at /onlyfanssearch/top-10-{cat}-onlyfans-models.
  const bestOf = bestOfSlugFromPublicPath(rawSlug);
  if (bestOf) return <BestOfPageView slug={bestOf} />;

  if (rawSlug.endsWith('2026')) {
    redirect(`/onlyfanssearch/top-10-${rawSlug.slice(0, -4)}-onlyfans-models`);
  }

  if (!OF_CATEGORY_SLUGS.has(rawSlug)) notFound();

  await connectDB();

  const baseMatch = { categories: rawSlug, gender: 'female', avatar: { $ne: '' }, deleted: { $ne: true } };

  // Stable ranked list — same top creators on every crawl (clicks → likes → _id
  // as a deterministic tiebreak). Mirrors the curated-list approach that keeps
  // /best-telegram-groups ranking. Client default sort is also clicks-desc, so
  // server HTML and first client render agree (no reshuffle on hydration).
  const creators = await OnlyFansCreator.find(baseMatch)
    .sort({ clicks: -1, likesCount: -1, _id: 1 })
    .limit(200)
    .select('name username slug avatar header bio subscriberCount likesCount photosCount videosCount price isFree isVerified url clicks')
    .lean();

  const seen = new Set<string>();
  const serialized = (creators as any[])
    .map(serializeCreator)
    .filter((c) => {
      const key = c.username.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  // Unified Ad Network: keyword-targeted of-cat campaigns for this category.
  // onlyfans-creator ads → the paid featured strip (route straight to OnlyFans);
  // any adType → the agnostic 4-ad block injected every 80 results.
  const ofCatAds = await getKeywordPlacementCampaigns('of-cat', rawSlug, 8).catch(() => []);
  const paidFeatured = (ofCatAds as any[])
    .filter((c) => c.adType === 'onlyfans-creator' && (c.creative || c.ofUsername))
    .map((c) => ({
      _id: c._id,
      campaignId: c._id,
      name: c.name || c.ofUsername || '',
      username: c.ofUsername || '',
      avatar: (c.ofAlbum && c.ofAlbum[0]) || c.creative || '',
      album: c.ofAlbum || [],
      albumIdx: c.ofAlbumIdx || [],
      url: c.destinationUrl || '',
      bio: c.description || '',
      likesCount: c.ofLikesCount || 0,
      isPaidCampaign: true,
    }));

  const cat = OF_CATEGORY_MAP.get(rawSlug)!;
  return (
    <CategoryClient
      creators={serialized}
      category={rawSlug}
      label={cat.name}
      canonicalUrl={`https://erogram.pro${ofCategoryUrl(rawSlug)}`}
      paidFeatured={paidFeatured}
      agnosticAds={ofCatAds as any}
    />
  );
}
