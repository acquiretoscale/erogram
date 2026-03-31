import { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import connectDB from '@/lib/db/mongodb';
import { OnlyFansCreator } from '@/lib/models';
import CategoryClient from './CategoryClient';
import {
  OF_CATEGORY_SLUGS, OF_CATEGORY_MAP,
  OF_COUNTRY_SLUGS, OF_COUNTRY_MAP,
  OF_COUNTRIES, OF_CATEGORIES,
  ofCategoryUrl, ofCountryUrl, ofCountryCategoryUrl,
} from '../constants';
import { getLocale } from '@/lib/i18n/server';
import { categoryOfMeta, countryOfMeta } from '../ofMeta';

interface PageProps {
  params: Promise<{ category: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category: rawSlug } = await params;
  const locale = await getLocale();

  const is2026 = rawSlug.endsWith('2026');
  if (is2026) return {};

  const slug = rawSlug;

  const cat = OF_CATEGORY_MAP.get(slug);
  if (cat) return categoryOfMeta(locale, slug, cat.name);

  const co = OF_COUNTRY_MAP.get(slug);
  if (co) return countryOfMeta(locale, slug, co.name);

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

  // 301 redirect old /onlyfans-search/{slug}2026 → /best-onlyfans-accounts/{slug}
  const is2026 = rawSlug.endsWith('2026');
  if (is2026) {
    const slug = rawSlug.slice(0, -4);
    redirect(`/best-onlyfans-accounts/${slug}`);
  }

  const slug = rawSlug;
  const isCategory = OF_CATEGORY_SLUGS.has(slug);
  const isCountry = OF_COUNTRY_SLUGS.has(slug);

  if (!isCategory && !isCountry) notFound();

  await connectDB();

  const baseMatch = { categories: slug, gender: 'female', avatar: { $ne: '' }, deleted: { $ne: true } };

  const creators = await OnlyFansCreator.find(baseMatch)
    .sort({ clicks: -1, likesCount: -1 })
    .limit(200)
    .select('name username slug avatar header bio subscriberCount likesCount photosCount videosCount price isFree isVerified url clicks')
    .lean();

  // Deduplicate by username
  const seen = new Set<string>();
  const serialized = (creators as any[])
    .map(serializeCreator)
    .filter((c) => {
      const key = c.username.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  if (isCategory) {
    const cat = OF_CATEGORY_MAP.get(slug)!;
    const countryLinks = OF_COUNTRIES.map((co) => ({
      name: co.name,
      flag: co.flag,
      href: ofCountryCategoryUrl(co.slug, slug),
    }));
    return (
      <CategoryClient
        creators={serialized}
        category={slug}
        label={cat.name}
        countryLinks={countryLinks}
        canonicalUrl={`https://erogram.pro${ofCategoryUrl(slug)}`}
      />
    );
  }

  const co = OF_COUNTRY_MAP.get(slug)!;
  const categoryLinks = OF_CATEGORIES.map((cat) => ({
    name: cat.name,
    flag: cat.emoji,
    href: ofCountryCategoryUrl(slug, cat.slug),
  }));
  return (
    <CategoryClient
      creators={serialized}
      category={slug}
      label={co.name}
      countryLinks={categoryLinks}
      canonicalUrl={`https://erogram.pro${ofCountryUrl(slug)}`}
    />
  );
}
