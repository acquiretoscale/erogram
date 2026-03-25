import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import connectDB from '@/lib/db/mongodb';
import { OnlyFansCreator } from '@/lib/models';
import CategoryClient from '../../[category]/CategoryClient';
import { OF_COUNTRY_SLUGS, OF_COUNTRY_MAP, OF_CATEGORIES, ofCountryUrl, ofCountryCategoryUrl } from '../../constants';

const canonicalBase = 'https://erogram.pro';
import { getLocale } from '@/lib/i18n/server';
import { countryOfMeta } from '../../ofMeta';

interface PageProps {
  params: Promise<{ country: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { country } = await params;
  const co = OF_COUNTRY_MAP.get(country);
  if (!co) return {};

  const locale = await getLocale();
  return countryOfMeta(locale, country, co.name);
}

export default async function OnlyFansCountryPage({ params }: PageProps) {
  const { country } = await params;

  if (!OF_COUNTRY_SLUGS.has(country)) {
    notFound();
  }

  const co = OF_COUNTRY_MAP.get(country)!;
  await connectDB();

  const creators = await OnlyFansCreator.find({ categories: country, gender: 'female', avatar: { $ne: '' } })
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

  const categoryLinks = OF_CATEGORIES.map((cat) => ({
    name: cat.name,
    flag: cat.emoji,
    href: ofCountryCategoryUrl(country, cat.slug),
  }));

  return (
    <CategoryClient
      creators={serialized}
      category={country}
      label={`OnlyFans ${co.name}`}
      countryLinks={categoryLinks}
      canonicalUrl={`${canonicalBase}${ofCountryUrl(country)}`}
    />
  );
}
