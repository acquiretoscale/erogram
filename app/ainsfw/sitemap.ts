import { MetadataRoute } from 'next';
import { AI_NSFW_TOOLS } from './data';

const BASE = 'https://erogram.pro';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const indexPage: MetadataRoute.Sitemap = [
    { url: `${BASE}/ainsfw`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
  ];

  const toolPages: MetadataRoute.Sitemap = AI_NSFW_TOOLS.map((tool) => ({
    url: `${BASE}/${tool.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  return [...indexPage, ...toolPages];
}
