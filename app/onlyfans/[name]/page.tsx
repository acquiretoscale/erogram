import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import connectDB from '@/lib/db/mongodb';
import { OnlyFansCreator } from '@/lib/models';
import { getCreatorBySlug, getTop100CreatorSuggestions, getCreatorReviews } from '@/lib/actions/ofCreatorProfile';
import type { CreatorProfile } from '@/lib/actions/ofCreatorProfile';
import { getTrendingOnErogram } from '@/lib/actions/publicData';
import { getCreatorBio } from '@/app/onlyfanssearch/creatorBios';
import CreatorProfileClient from '@/app/onlyfanssearch/CreatorProfileClient';
import { getLocale } from '@/lib/i18n/server';
import type { Locale } from '@/lib/i18n';

export const revalidate = 60;

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://erogram.pro';

interface PageProps {
  params: Promise<{ name: string }>;
}

async function isAdminImported(slug: string): Promise<boolean> {
  await connectDB();
  const doc = await OnlyFansCreator.findOne({
    slug,
    adminImported: true,
    deleted: { $ne: true },
  })
    .select('_id')
    .lean();
  return !!doc;
}

async function getRelatedFromTop100(
  excludeSlug: string,
  limit = 6
): Promise<CreatorProfile[]> {
  await connectDB();
  const creators = await OnlyFansCreator.aggregate([
    { $match: { adminImported: true, slug: { $ne: excludeSlug }, avatar: { $ne: '' }, deleted: { $ne: true } } },
    { $sample: { size: limit } },
    { $project: { name: 1, username: 1, slug: 1, avatar: 1, header: 1, categories: 1, subscriberCount: 1, likesCount: 1, photosCount: 1, videosCount: 1, price: 1, isFree: 1, isVerified: 1, url: 1, location: 1 } },
  ]);

  return (creators as any[]).map((c) => ({
    _id: c._id.toString(),
    name: c.name || '',
    username: c.username || '',
    slug: c.slug || '',
    bio: '',
    avatar: c.avatar || '',
    avatarThumbC50: '',
    avatarThumbC144: '',
    header: c.header || '',
    categories: c.categories || [],
    subscriberCount: c.subscriberCount || 0,
    likesCount: c.likesCount || 0,
    mediaCount: 0,
    photosCount: c.photosCount || 0,
    videosCount: c.videosCount || 0,
    audiosCount: 0,
    postsCount: 0,
    price: c.price || 0,
    isFree: c.isFree || false,
    isVerified: c.isVerified || false,
    url: c.url || '',
    gender: 'female',
    scrapedAt: null,
    lastSeen: '',
    location: c.location || '',
    website: '',
    joinDate: '',
    onlyfansId: 0,
    hasStories: false,
    hasStream: false,
    tipsEnabled: false,
    tipsMin: 0,
    tipsMax: 0,
    finishedStreamsCount: 0,
    instagramUrl: '',
    instagramUsername: '',
    twitterUrl: '',
    tiktokUrl: '',
    fanslyUrl: '',
    pornhubUrl: '',
    telegramUrl: '',
    extraPhotos: [],
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { name: slug } = await params;
  const locale = await getLocale();

  const allowed = await isAdminImported(slug);
  if (!allowed) {
    return { title: 'Not Found', robots: { index: false, follow: false } };
  }

  const creator = await getCreatorBySlug(slug);
  if (!creator) {
    return { title: 'Not Found', robots: { index: false, follow: false } };
  }

  const bioData = getCreatorBio(creator.username);
  const richBio = bioData?.bio || creator.bio || '';

  const pageUrl = `${BASE_URL}/onlyfans/${creator.slug}`;
  const name = creator.name;
  const username = creator.username;

  const fmtNum = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${Math.round(n / 1_000)}K` : `${n}K`;

  const statsLabels: Record<Locale, { likes: string; photos: string; videos: string }> = {
    en: { likes: 'likes', photos: 'photos', videos: 'videos' },
    de: { likes: 'Likes', photos: 'Fotos', videos: 'Videos' },
    es: { likes: 'me gusta', photos: 'fotos', videos: 'videos' },
  };
  const sl = statsLabels[locale] || statsLabels.en;
  const statsSnippet = [
    creator.likesCount > 0 ? `${fmtNum(creator.likesCount)} ${sl.likes}` : '',
    creator.photosCount > 0 ? `${creator.photosCount.toLocaleString()} ${sl.photos}` : '',
    creator.videosCount > 0 ? `${creator.videosCount.toLocaleString()} ${sl.videos}` : '',
  ]
    .filter(Boolean)
    .join(', ');

  const priceText = creator.isFree
    ? 'Free subscription'
    : creator.price > 0
      ? `$${creator.price.toFixed(2)}/month`
      : '';

  const baseSentence = richBio
    ? richBio.slice(0, 120) + (richBio.length > 120 ? '...' : '')
    : `${name} OnlyFans profile (@${username}).`;

  let desc = baseSentence;

  const catLabel = creator.categories.slice(0, 2).join(', ');
  const socialHints = [
    creator.instagramUrl ? 'Instagram' : '',
    creator.twitterUrl ? 'Twitter/X' : '',
    creator.tiktokUrl ? 'TikTok' : '',
  ].filter(Boolean);

  const suffixes = [
    statsSnippet ? ` ${statsSnippet}.` : '',
    priceText ? ` ${priceText}.` : '',
    catLabel ? ` Top ${catLabel} creator.` : '',
    socialHints.length > 0 ? ` Also on ${socialHints.join(', ')}.` : '',
    ` Verified on Erogram — the #1 OnlyFans search tool updated daily.`,
  ];
  for (const s of suffixes) {
    if (desc.length >= 155) break;
    desc += s;
  }

  if (desc.length > 160) desc = desc.slice(0, 157) + '...';

  const ogImage =
    creator.header && creator.header.startsWith('https://')
      ? { url: creator.header, width: 1200, height: 630, alt: `${name} OnlyFans` }
      : creator.avatar && creator.avatar.startsWith('https://')
        ? { url: creator.avatar, width: 400, height: 400, alt: `${name} OnlyFans` }
        : null;

  const title = `${name} OnlyFans — @${username} Profile, Photos & Videos (2026)`;
  const ogTitle = `${name} OnlyFans — @${username} | Erogram`;
  const primaryCat = creator.categories[0] || 'onlyfans';

  return {
    title,
    description: desc,
    keywords: `${name} OnlyFans, @${username} OnlyFans, ${primaryCat} OnlyFans creator, OnlyFans profile, ${creator.categories.join(', ')}, best OnlyFans 2026`,
    robots: { index: true, follow: true },
    other: { rating: 'adult' },
    alternates: { canonical: pageUrl },
    openGraph: {
      title: ogTitle,
      description: desc,
      type: 'profile',
      url: pageUrl,
      siteName: 'Erogram',
      images: ogImage ? [ogImage] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: ogTitle,
      description: desc,
      images: ogImage ? [ogImage.url] : [],
    },
  };
}

export default async function PublicCreatorPage({ params }: PageProps) {
  const { name: slug } = await params;

  const allowed = await isAdminImported(slug);
  if (!allowed) notFound();

  const creator = await getCreatorBySlug(slug);
  if (!creator) notFound();

  const [related, trendingOnErogram, reviewData] = await Promise.all([
    getRelatedFromTop100(creator.slug, 6),
    getTrendingOnErogram().catch(() => []),
    getCreatorReviews(slug).catch(() => ({ reviews: [], avg: 0, count: 0 })),
  ]);

  const pageUrl = `${BASE_URL}/onlyfans/${creator.slug}`;

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Top OnlyFans Creators',
        item: `${BASE_URL}/Toponlyfanscreators`,
      },
      { '@type': 'ListItem', position: 3, name: creator.name, item: pageUrl },
    ],
  };

  const webPageJsonLd: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `${creator.name} OnlyFans — @${creator.username}`,
    description: `${creator.name} OnlyFans profile. Browse photos, videos, and subscription info.`,
    url: pageUrl,
    isPartOf: { '@type': 'WebSite', name: 'Erogram', url: BASE_URL },
  };

  const personJsonLd: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    mainEntity: {
      '@type': 'Person',
      name: creator.name,
      alternateName: `@${creator.username}`,
      url: pageUrl,
      image: creator.avatar || undefined,
      sameAs: [
        creator.url,
        creator.instagramUrl,
        creator.twitterUrl,
        creator.tiktokUrl,
      ].filter(Boolean),
    },
  };

  if (reviewData.count > 0) {
    personJsonLd.mainEntity.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: reviewData.avg,
      ratingCount: reviewData.count,
      bestRating: 5,
      worstRating: 1,
    };
  } else if (creator.likesCount > 0) {
    const rating = Math.min(5, 3.5 + (Math.log10(Math.max(creator.likesCount, 1)) / Math.log10(5_000_000)) * 1.5);
    personJsonLd.mainEntity.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: Math.round(rating * 10) / 10,
      ratingCount: creator.likesCount,
      bestRating: 5,
      worstRating: 1,
    };
  }

  const offerJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `${creator.name} OnlyFans Subscription`,
    image: creator.avatar || undefined,
    url: pageUrl,
    offers: {
      '@type': 'Offer',
      price: creator.isFree ? '0' : creator.price > 0 ? creator.price.toFixed(2) : undefined,
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(offerJsonLd) }}
      />
      <CreatorProfileClient
        creator={creator}
        related={related}
        trendingOnErogram={trendingOnErogram}
        publicAccess
      />
    </>
  );
}
