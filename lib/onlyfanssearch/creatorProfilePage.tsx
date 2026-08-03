import type { Metadata } from 'next';
import type { Locale } from '@/lib/i18n/config';
import CreatorProfileClient from '@/app/onlyfanssearch/CreatorProfileClient';
import {
  getCreatorByProfileSegment,
  getRelatedCreators,
  getCreatorReviews,
  type CreatorProfile,
} from '@/lib/actions/ofCreatorProfile';
import { buildSocialMeta, CANONICAL_BASE } from '@/lib/seo/socialMeta';
import { ofCreatorProfileUrl } from '@/lib/onlyfanssearch/creatorUrls';
import { getCreatorRankingPages } from '@/lib/tags/creatorMatch';
import { getBestOfPreviewAvatars } from '@/lib/actions/bestOfCreators';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || CANONICAL_BASE;

function creatorCanonicalUrl(creator: CreatorProfile, canonicalPath?: string) {
  return `${BASE_URL}${canonicalPath || ofCreatorProfileUrl(creator.username)}`;
}

export async function generateCreatorProfileMetadata(
  profileSegment: string,
  locale: Locale,
  canonicalPath?: string,
): Promise<Metadata | null> {
  const creator = await getCreatorByProfileSegment(profileSegment);
  if (!creator) return null;

  const pageUrl = creatorCanonicalUrl(creator, canonicalPath);
  const name = creator.name;
  const username = creator.username;
  const primaryCat = creator.categories[0] || 'onlyfans';

  const fmtNum = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(0)}K` : `${n}K`);

  const statsLabels: Record<Locale, { likes: string; fans: string; photos: string; videos: string }> = {
    en: { likes: 'likes', fans: 'fans', photos: 'photos', videos: 'videos' },
    de: { likes: 'Likes', fans: 'Fans', photos: 'Fotos', videos: 'Videos' },
    es: { likes: 'me gusta', fans: 'fans', photos: 'fotos', videos: 'videos' },
    pt: { likes: 'curtidas', fans: 'fãs', photos: 'fotos', videos: 'vídeos' },
  };
  const sl = statsLabels[locale] || statsLabels.en;
  const statsSnippet = [
    creator.likesCount > 0 ? `${fmtNum(creator.likesCount)} ${sl.likes}` : '',
    creator.subscriberCount > 0 ? `${fmtNum(creator.subscriberCount)} ${sl.fans}` : '',
    creator.photosCount > 0 ? `${creator.photosCount.toLocaleString()} ${sl.photos}` : '',
    creator.videosCount > 0 ? `${creator.videosCount.toLocaleString()} ${sl.videos}` : '',
  ].filter(Boolean).join(', ');

  const priceTexts: Record<Locale, { free: string; perMonth: string }> = {
    en: { free: 'Free subscription', perMonth: '/month' },
    de: { free: 'Kostenloses Abo', perMonth: '/Monat' },
    es: { free: 'Suscripción gratis', perMonth: '/mes' },
    pt: { free: 'Assinatura grátis', perMonth: '/mês' },
  };
  const priceLocale = priceTexts[locale] || priceTexts.en;
  const priceText = creator.isFree
    ? priceLocale.free
    : creator.price > 0
      ? `$${creator.price.toFixed(2)}${priceLocale.perMonth}`
      : '';

  const socialHint = [
    creator.instagramUrl ? 'Instagram' : '',
    creator.twitterUrl ? 'Twitter' : '',
    creator.tiktokUrl ? 'TikTok' : '',
  ].filter(Boolean);
  const alsoOn: Record<Locale, string> = {
    en: 'Also on',
    de: 'Auch auf',
    es: 'También en',
    pt: 'Também em',
  };
  const socialText =
    socialHint.length > 0 ? ` ${alsoOn[locale] || alsoOn.en} ${socialHint.join(', ')}.` : '';

  const descTemplates: Record<Locale, string> = {
    en: `${name} OnlyFans profile (@${username}). ${statsSnippet ? `${statsSnippet}. ` : ''}${priceText ? `${priceText}. ` : ''}${socialText}Browse verified OnlyFans creators on Erogram — the #1 OnlyFans search tool.`,
    de: `${name} OnlyFans-Profil (@${username}). ${statsSnippet ? `${statsSnippet}. ` : ''}${priceText ? `${priceText}. ` : ''}${socialText}Verifizierte OnlyFans Creator auf Erogram entdecken — das #1 OnlyFans Suchtool.`,
    es: `${name} OnlyFans perfil (@${username}). ${statsSnippet ? `${statsSnippet}. ` : ''}${priceText ? `${priceText}. ` : ''}${socialText}Explora creadoras verificadas en Erogram — el #1 buscador de OnlyFans.`,
    pt: `${name} OnlyFans perfil (@${username}). ${statsSnippet ? `${statsSnippet}. ` : ''}${priceText ? `${priceText}. ` : ''}${socialText}Explore criadoras verificadas no Erogram — a melhor busca OnlyFans.`,
  };
  let desc = descTemplates[locale] || descTemplates.en;
  if (desc.length > 160) desc = desc.slice(0, 157) + '...';

  const titleTemplates: Record<Locale, string> = {
    en: `${name} OnlyFans — @${username} Profile, Photos & Videos (2026)`,
    de: `${name} OnlyFans — @${username} Profil, Fotos & Videos (2026)`,
    es: `${name} OnlyFans — @${username} Perfil, Fotos y Videos (2026)`,
    pt: `${name} OnlyFans — @${username} Perfil, Fotos e Vídeos (2026)`,
  };
  const ogTitleTemplates: Record<Locale, string> = {
    en: `${name} OnlyFans — @${username} | Erogram`,
    de: `${name} OnlyFans — @${username} | Erogram`,
    es: `${name} OnlyFans — @${username} | Erogram`,
    pt: `${name} OnlyFans — @${username} | Erogram`,
  };
  const ogTitle = ogTitleTemplates[locale] || ogTitleTemplates.en;
  const creatorImage =
    creator.header && creator.header.startsWith('https://')
      ? creator.header
      : creator.avatar && creator.avatar.startsWith('https://')
        ? creator.avatar
        : undefined;

  return {
    title: titleTemplates[locale] || titleTemplates.en,
    description: desc,
    keywords: `${name} OnlyFans, @${username} OnlyFans, ${primaryCat} OnlyFans creator, OnlyFans profile, ${creator.categories.join(', ')}, best OnlyFans 2026`,
    other: { rating: 'adult' },
    alternates: { canonical: pageUrl },
    ...buildSocialMeta({
      title: ogTitle,
      description: desc,
      url: pageUrl,
      type: 'profile',
      image: creatorImage,
      imageAlt: `${name} OnlyFans`,
    }),
  };
}

export async function CreatorProfilePageView({
  profileSegment,
  canonicalPath,
}: {
  profileSegment: string;
  canonicalPath?: string;
}) {
  const creator = await getCreatorByProfileSegment(profileSegment);
  if (!creator) return null;

  const [related, reviewData] = await Promise.all([
    getRelatedCreators(creator.categories, creator.slug, 4, creator.location),
    getCreatorReviews(creator.slug).catch(() => ({ reviews: [], avg: 0, count: 0 })),
  ]);

  const pageUrl = creatorCanonicalUrl(creator, canonicalPath);

  const matchedRankingPages = getCreatorRankingPages(creator);
  const topRankingPages = matchedRankingPages.slice(0, 8);
  const rankingPages = matchedRankingPages.map((p) => ({
    slug: p.slug,
    label: p.label,
    type: p.type,
  }));
  const topRankingPreviewAvatars = await getBestOfPreviewAvatars(topRankingPages, 4).catch(
    () => ({} as Record<string, string[]>),
  );

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'OnlyFans', item: `${BASE_URL}/onlyfanssearch` },
      { '@type': 'ListItem', position: 3, name: creator.name, item: pageUrl },
    ],
  };

  const webPageJsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `${creator.name} OnlyFans — @${creator.username}`,
    description: `${creator.name} OnlyFans profile. Browse photos, videos, and subscription info.`,
    url: pageUrl,
    isPartOf: { '@type': 'WebSite', name: 'Erogram', url: BASE_URL },
  };

  const personJsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    mainEntity: {
      '@type': 'Person',
      name: creator.name,
      alternateName: `@${creator.username}`,
      url: pageUrl,
      ...(creator.avatar ? { image: creator.avatar } : {}),
      sameAs: [creator.url, creator.instagramUrl, creator.twitterUrl, creator.tiktokUrl, creator.fanslyUrl, creator.fanvueUrl, creator.telegramUrl, creator.linktreeUrl, creator.allmylinksUrl, creator.beaconsUrl, creator.redditUrl, creator.patreonUrl].filter(Boolean),
    },
  };

  if (reviewData.count > 0) {
    (personJsonLd.mainEntity as Record<string, unknown>).aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: reviewData.avg,
      ratingCount: reviewData.count,
      bestRating: 5,
      worstRating: 1,
    };
  } else if (creator.likesCount > 0) {
    const rating = Math.min(
      5,
      3.5 + (Math.log10(Math.max(creator.likesCount, 1)) / Math.log10(5_000_000)) * 1.5,
    );
    (personJsonLd.mainEntity as Record<string, unknown>).aggregateRating = {
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
    ...(creator.avatar ? { image: creator.avatar } : {}),
    url: pageUrl,
    offers: {
      '@type': 'Offer',
      price: creator.isFree ? '0' : creator.price > 0 ? creator.price.toFixed(2) : '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
    },
  };

  return (
    <>
      {creator.adminImported && (
        <>
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }} />
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }} />
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(offerJsonLd) }} />
        </>
      )}
      <CreatorProfileClient
        creator={creator}
        related={related}
        rankingPages={rankingPages}
        topRankingPreviewAvatars={topRankingPreviewAvatars}
        publicAccess={creator.publicPage || creator.adminImported}
      />
    </>
  );
}
