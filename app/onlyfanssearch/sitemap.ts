import { MetadataRoute } from 'next';
import connectDB from '@/lib/db/mongodb';
import { OnlyFansCreator } from '@/lib/models';
import { OF_CATEGORIES, OF_COUNTRIES, ofCategoryUrl, ofCountryUrl } from './constants';

const BASE = 'https://erogram.pro';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connectDB();

  const top80 = await OnlyFansCreator.find({
    adminImported: true,
    deleted: { $ne: true },
  })
    .sort({ likesCount: -1 })
    .limit(80)
    .select('slug updatedAt')
    .lean() as any[];

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${BASE}/onlyfanssearch`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE}/Toponlyfanscreators`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE}/best-onlyfans-accounts`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
  ];

  const creatorPages: MetadataRoute.Sitemap = top80.map((c: any) => ({
    url: `${BASE}/onlyfans/${c.slug}`,
    lastModified: c.updatedAt || new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  const bestCategoryPages: MetadataRoute.Sitemap = OF_CATEGORIES.map((cat) => ({
    url: `${BASE}/best-onlyfans-accounts/${cat.slug}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.85,
  }));

  const categoryPages: MetadataRoute.Sitemap = OF_CATEGORIES.map((cat) => ({
    url: `${BASE}${ofCategoryUrl(cat.slug)}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.85,
  }));

  const countryPages: MetadataRoute.Sitemap = OF_COUNTRIES.map((co) => ({
    url: `${BASE}${ofCountryUrl(co.slug)}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.85,
  }));

  return [
    ...staticPages,
    ...creatorPages,
    ...bestCategoryPages,
    ...categoryPages,
    ...countryPages,
  ];
}
