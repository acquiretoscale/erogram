import { MetadataRoute } from 'next';
import { OF_CATEGORIES, ofCategoryUrl } from './constants';

const BASE = 'https://erogram.pro';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${BASE}/onlyfanssearch`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE}/Toponlyfanscreators`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE}/best-onlyfans-accounts`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
  ];

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

  return [
    ...staticPages,
    ...bestCategoryPages,
    ...categoryPages,
  ];
}
