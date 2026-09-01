import { Metadata } from 'next';
import { notFound, redirect, permanentRedirect } from 'next/navigation';
import CategoryClient from '@/app/ofsearch/[category]/CategoryClient';
import { OF_CATEGORY_SLUGS, OF_CATEGORY_MAP, ofCategoryUrl } from '@/app/ofsearch/constants';
import { getLocale } from '@/lib/i18n/server';
import { categoryOfMeta } from '@/app/ofsearch/ofMeta';
import { getKeywordPlacementCampaigns } from '@/lib/actions/campaigns';
import { browseCategoryCreators } from '@/lib/actions/ofCreatorsBrowse';
import { bestOfSlugFromPublicPath, rankingEnglishPublicPath } from '@/lib/bestOfPageContent/hottestUrls';
import { isReservedOnlyfanssearchSegment, ofCreatorProfileUrl } from '@/lib/ofsearch/creatorUrls';
import { COMBO_BEST_OF_MAP } from '@/lib/onlyfans/categoryComboPills';
import {
  CreatorProfilePageView,
  generateCreatorProfileMetadata,
} from '@/lib/ofsearch/creatorProfilePage';
import { isBlacklistedPublicPathSegment } from '@/lib/ofsearch/creatorBlacklist';
import { CANONICAL_BASE } from '@/lib/seo/socialMeta';
import { OF_SEARCH_ENGINE_ENABLED } from '@/lib/ofsearch/featureFlags';
import { BEST_OF_PAGE_MAP } from '@/app/best-onlyfans-accounts/bestOfPages';

// SEO: no more force-dynamic + $sample. The page now serves a STABLE curated
// ranking so Google sees the same content on every crawl (brain GAP 5 → was
// buried at position 30+ because the random set changed every crawl).

interface PageProps {
  params: Promise<{ category: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category: rawSlug } = await params;
  if (isBlacklistedPublicPathSegment(rawSlug)) {
    notFound();
  }
  const locale = await getLocale();

  // Old single-segment ranking URLs are gone. Page 404s; do not notFound() here (Next 16 fallback).
  if (bestOfSlugFromPublicPath(rawSlug)) return {};

  if (rawSlug.endsWith('2026')) return {};

  if (COMBO_BEST_OF_MAP.has(rawSlug) && !OF_CATEGORY_MAP.has(rawSlug)) return {};

  const cat = OF_CATEGORY_MAP.get(rawSlug);
  if (cat) return categoryOfMeta(locale, rawSlug, cat.name);

  // Anything else in this namespace is a creator profile: /ofsearch/{username}
  if (!isReservedOnlyfanssearchSegment(rawSlug)) {
    const meta = await generateCreatorProfileMetadata(rawSlug, locale);
    if (meta) return meta;
  }

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

  if (isBlacklistedPublicPathSegment(rawSlug)) {
    notFound();
  }

  // Old single-segment ranking URLs are gone.
  if (bestOfSlugFromPublicPath(rawSlug)) notFound();

  if (rawSlug.endsWith('2026')) notFound();

  if (COMBO_BEST_OF_MAP.has(rawSlug) && !OF_CATEGORY_SLUGS.has(rawSlug)) {
    notFound();
  }

  if (rawSlug.endsWith('-onlyfans')) {
    permanentRedirect(ofCreatorProfileUrl(rawSlug));
  }

  if (OF_CATEGORY_SLUGS.has(rawSlug) && !OF_SEARCH_ENGINE_ENABLED) {
    if (BEST_OF_PAGE_MAP.has(rawSlug)) {
      redirect(rankingEnglishPublicPath(rawSlug, 'top'));
    }
    redirect('/ofsearch');
  }

  if (!OF_CATEGORY_SLUGS.has(rawSlug)) {
    if (!isReservedOnlyfanssearchSegment(rawSlug)) {
      const page = await CreatorProfilePageView({ profileSegment: rawSlug });
      if (page) return page;
    }
    notFound();
  }

  const { creators: pageCreators } = await browseCategoryCreators(rawSlug, 0, 12);
  const serialized = (pageCreators as any[]).map(serializeCreator);

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
      liveHourStart: c.ofLiveHourStart ?? -1,
      liveHourEnd: c.ofLiveHourEnd ?? -1,
      isPaidCampaign: true,
    }));

  const cat = OF_CATEGORY_MAP.get(rawSlug)!;

  return (
    <CategoryClient
      creators={serialized}
      category={rawSlug}
      label={cat.name}
      canonicalUrl={`${CANONICAL_BASE}${ofCategoryUrl(rawSlug)}`}
      paidFeatured={paidFeatured}
      agnosticAds={ofCatAds as any}
    />
  );
}
