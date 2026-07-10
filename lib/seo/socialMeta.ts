import type { Metadata } from 'next';

/** Canonical origin for absolute OG/Twitter image URLs. */
export const CANONICAL_BASE = 'https://erogram.pro';

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || CANONICAL_BASE;

/** Default share image — used whenever a page has no bespoke image. */
export const DEFAULT_OG_IMAGE = `${CANONICAL_BASE}/assets/og-default.png`;

/** Brand X/Twitter handle for twitter:site. */
export const TWITTER_SITE = '@erogram';

export type SocialMetaType = 'website' | 'article' | 'profile';

export interface SocialMetaInput {
  title: string;
  description: string;
  url?: string;
  type?: SocialMetaType;
  /** Absolute URL or site-relative path. Falls back to DEFAULT_OG_IMAGE. */
  image?: string | null;
  imageAlt?: string;
  publishedTime?: string;
  authors?: string[];
}

export function resolveSocialImageUrl(image?: string | null): string {
  if (!image) return DEFAULT_OG_IMAGE;
  if (image.startsWith('http://') || image.startsWith('https://')) return image;
  if (image.startsWith('/')) return `${CANONICAL_BASE}${image}`;
  return `${CANONICAL_BASE}/${image}`;
}

/**
 * Complete Open Graph + Twitter card metadata.
 * Every public page MUST spread this (or equivalent fields) in generateMetadata.
 */
export function buildSocialMeta(input: SocialMetaInput): Pick<Metadata, 'openGraph' | 'twitter'> {
  const imgUrl = resolveSocialImageUrl(input.image);
  const alt = input.imageAlt || input.title;
  const type = input.type || 'website';

  return {
    openGraph: {
      title: input.title,
      description: input.description,
      type,
      siteName: 'Erogram',
      ...(input.url ? { url: input.url } : {}),
      ...(type === 'article' && input.publishedTime ? { publishedTime: input.publishedTime } : {}),
      ...(type === 'article' && input.authors?.length ? { authors: input.authors } : {}),
      images: [{ url: imgUrl, width: 1200, height: 630, alt }],
    },
    twitter: {
      card: 'summary_large_image',
      site: TWITTER_SITE,
      title: input.title,
      description: input.description,
      images: [imgUrl],
    },
  };
}
