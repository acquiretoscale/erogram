import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import connectDB from '@/lib/db/mongodb';
import { OnlyFansCreator } from '@/lib/models';
import CategoryClient from '../../../[category]/CategoryClient';
import {
  OF_COUNTRY_SLUGS, OF_COUNTRY_MAP,
  OF_CATEGORY_SLUGS, OF_CATEGORY_MAP,
  OF_COUNTRIES,
  ofCountryCategoryUrl,
} from '../../../constants';
import { getLocale } from '@/lib/i18n/server';
import { countryCategoryOfMeta } from '../../../ofMeta';

const canonicalBase = 'https://erogram.pro';

interface PageProps {
  params: Promise<{ country: string; categorySlug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { country, categorySlug } = await params;
  const co = OF_COUNTRY_MAP.get(country);
  const cat = OF_CATEGORY_MAP.get(categorySlug);
  if (!co || !cat) return {};

  const locale = await getLocale();
  return countryCategoryOfMeta(locale, country, co.name, categorySlug, cat.name);
}

export default async function OnlyFansCountryCategoryPage({ params }: PageProps) {
  const { country, categorySlug } = await params;

  if (!OF_COUNTRY_SLUGS.has(country) || !OF_CATEGORY_SLUGS.has(categorySlug)) {
    notFound();
  }

  const co = OF_COUNTRY_MAP.get(country)!;
  const cat = OF_CATEGORY_MAP.get(categorySlug)!;

  await connectDB();

  const creators = await OnlyFansCreator.find({
    categories: { $all: [country, categorySlug] },
    gender: 'female',
    avatar: { $ne: '' },
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
    .filter((c) => c.slug !== country)
    .map((c) => ({
      name: c.name,
      flag: c.flag,
      href: ofCountryCategoryUrl(c.slug, categorySlug),
    }));

  return (
    <CategoryClient
      creators={serialized}
      category={categorySlug}
      label={`${cat.name} OnlyFans ${co.name}`}
      countryLinks={otherCountries}
      canonicalUrl={`${canonicalBase}${ofCountryCategoryUrl(country, categorySlug)}`}
    />
  );
}
