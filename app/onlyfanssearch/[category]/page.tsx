import { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import connectDB from '@/lib/db/mongodb';
import { OnlyFansCreator } from '@/lib/models';
import CategoryClient from './CategoryClient';
import { OF_CATEGORY_SLUGS, OF_CATEGORY_MAP, ofCategoryUrl } from '../constants';
import { getLocale } from '@/lib/i18n/server';
import { categoryOfMeta } from '../ofMeta';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ category: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category: rawSlug } = await params;
  const locale = await getLocale();

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

  if (rawSlug.endsWith('2026')) {
    redirect(`/best-onlyfans-accounts/${rawSlug.slice(0, -4)}`);
  }

  if (!OF_CATEGORY_SLUGS.has(rawSlug)) notFound();

  await connectDB();

  const baseMatch = { categories: rawSlug, gender: 'female', avatar: { $ne: '' }, deleted: { $ne: true } };

  const creators = await OnlyFansCreator.aggregate([
    { $match: baseMatch },
    { $sample: { size: 200 } },
    { $project: { name: 1, username: 1, slug: 1, avatar: 1, header: 1, bio: 1, subscriberCount: 1, likesCount: 1, photosCount: 1, videosCount: 1, price: 1, isFree: 1, isVerified: 1, url: 1, clicks: 1 } },
  ]);

  const seen = new Set<string>();
  const serialized = (creators as any[])
    .map(serializeCreator)
    .filter((c) => {
      const key = c.username.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  const cat = OF_CATEGORY_MAP.get(rawSlug)!;
  return (
    <CategoryClient
      creators={serialized}
      category={rawSlug}
      label={cat.name}
      canonicalUrl={`https://erogram.pro${ofCategoryUrl(rawSlug)}`}
    />
  );
}
