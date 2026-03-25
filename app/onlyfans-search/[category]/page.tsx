import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import connectDB from '@/lib/db/mongodb';
import { OnlyFansCreator, TrendingOFCreator } from '@/lib/models';
import CategoryClient from './CategoryClient';
import Best2026Client from './Best2026Client';
import {
  OF_CATEGORY_SLUGS, OF_CATEGORY_MAP,
  OF_COUNTRY_SLUGS, OF_COUNTRY_MAP,
  OF_COUNTRIES, OF_CATEGORIES,
  ofCategoryUrl, ofCountryUrl, ofCountryCategoryUrl,
} from '../constants';
import { getLocale } from '@/lib/i18n/server';
import { categoryOfMeta, countryOfMeta, best2026OfMeta } from '../ofMeta';

interface PageProps {
  params: Promise<{ category: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category: rawSlug } = await params;
  const locale = await getLocale();

  const is2026 = rawSlug.endsWith('2026');
  const slug = is2026 ? rawSlug.slice(0, -4) : rawSlug;

  const cat = OF_CATEGORY_MAP.get(slug);
  if (cat) return is2026 ? best2026OfMeta(locale, slug, cat.name) : categoryOfMeta(locale, slug, cat.name);

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

function serializeTrending(c: any) {
  return {
    _id: c._id.toString(),
    name: c.name || '',
    username: c.username || '',
    avatar: c.avatar || '',
    url: c.url || '',
    bio: (c.bio || '').slice(0, 200),
    categories: c.categories || [],
    position: c.position || 0,
  };
}

export default async function OnlyFansSlugPage({ params }: PageProps) {
  const { category: rawSlug } = await params;

  const is2026 = rawSlug.endsWith('2026');
  const slug = is2026 ? rawSlug.slice(0, -4) : rawSlug;

  const isCategory = OF_CATEGORY_SLUGS.has(slug);
  const isCountry = OF_COUNTRY_SLUGS.has(slug);

  if (!isCategory && !isCountry) notFound();
  if (is2026 && !isCategory) notFound();

  await connectDB();

  const baseMatch = { categories: slug, gender: 'female', avatar: { $ne: '' } };

  // 2026 pages — focused Top 10 ranking page
  if (is2026) {
    const cat = OF_CATEGORY_MAP.get(slug)!;

    const [topByClicks, trendingRaw, allCreators] = await Promise.all([
      OnlyFansCreator.find({ ...baseMatch, clicks: { $gt: 0 } })
        .sort({ clicks: -1 })
        .limit(10)
        .select('_id name username slug avatar bio likesCount price isFree url clicks')
        .lean(),
      TrendingOFCreator.find({ active: true, categories: slug })
        .sort({ position: 1 })
        .limit(2)
        .lean(),
      OnlyFansCreator.find(baseMatch)
        .sort({ likesCount: -1 })
        .limit(100)
        .select('_id name username slug avatar bio likesCount price isFree url clicks')
        .lean(),
    ]);

    return (
      <Best2026Client
        category={slug}
        label={cat.name}
        top10={topByClicks.map(serializeCreator)}
        trending={trendingRaw.map(serializeTrending)}
        allCreators={allCreators.map(serializeCreator)}
        categoryUrl={ofCategoryUrl(slug)}
      />
    );
  }

  // Regular category/country page
  const creators = await OnlyFansCreator.find(baseMatch)
    .sort({ likesCount: -1 })
    .limit(200)
    .lean();

  const serialized = (creators as any[]).map(serializeCreator);

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
