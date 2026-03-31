/**
 * DE/ES combo route: /de/onlyfans-search/france/blonde
 * After middleware strips the locale prefix, this matches /onlyfans-search/[country]/[category].
 * EN combo traffic uses vanity URLs (/onlyfansfrance/blondeonlyfans) which middleware
 * rewrites to /onlyfans-search/country/france/blonde — a separate existing route.
 */
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import connectDB from '@/lib/db/mongodb';
import { OnlyFansCreator } from '@/lib/models';
import CategoryClient from '../CategoryClient';
import {
  OF_COUNTRY_SLUGS, OF_COUNTRY_MAP,
  OF_CATEGORY_SLUGS, OF_CATEGORY_MAP,
  OF_COUNTRIES,
  ofCountryCategoryUrl,
} from '../../constants';
import { getLocale } from '@/lib/i18n/server';
import { countryCategoryOfMeta } from '../../ofMeta';

interface PageProps {
  params: Promise<{ category: string; subcategory: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category: countrySlug, subcategory: catSlug } = await params;
  const co = OF_COUNTRY_MAP.get(countrySlug);
  const cat = OF_CATEGORY_MAP.get(catSlug);
  if (!co || !cat) return {};

  const locale = await getLocale();
  return countryCategoryOfMeta(locale, countrySlug, co.name, catSlug, cat.name);
}

export default async function OnlyFansComboPage({ params }: PageProps) {
  const { category: countrySlug, subcategory: catSlug } = await params;

  if (!OF_COUNTRY_SLUGS.has(countrySlug) || !OF_CATEGORY_SLUGS.has(catSlug)) {
    notFound();
  }

  const co = OF_COUNTRY_MAP.get(countrySlug)!;
  const cat = OF_CATEGORY_MAP.get(catSlug)!;

  await connectDB();

  const creators = await OnlyFansCreator.find({
    categories: { $all: [countrySlug, catSlug] },
    gender: 'female',
    avatar: { $ne: '' },
    deleted: { $ne: true },
  })
    .sort({ likesCount: -1 })
    .limit(200)
    .lean();

  const serialized = (creators as any[]).map((c) => ({
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
  }));

  const otherCountries = OF_COUNTRIES
    .filter((c) => c.slug !== countrySlug)
    .map((c) => ({
      name: c.name,
      flag: c.flag,
      href: ofCountryCategoryUrl(c.slug, catSlug),
    }));

  return (
    <CategoryClient
      creators={serialized}
      category={catSlug}
      label={`${cat.name} OnlyFans ${co.name}`}
      countryLinks={otherCountries}
      canonicalUrl={`https://erogram.pro${ofCountryCategoryUrl(countrySlug, catSlug)}`}
    />
  );
}
