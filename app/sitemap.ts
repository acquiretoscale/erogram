import { MetadataRoute } from 'next';
import connectDB from '@/lib/db/mongodb';
import { Group, Article, Bot } from '@/lib/models';
import { categories, countries as constantCountries } from '@/app/groups/constants';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://erogram.pro';
  const PER_PAGE = 12;

  try {
    await connectDB();

    const [groups, bots, articles, totalGroups, totalBots, dbCountries, categoryCounts, countryCounts] = await Promise.all([
      Group.find({ status: { $in: ['approved', 'deleted'] } }).select('slug updatedAt').lean(),
      Bot.find({ status: 'approved' }).select('slug updatedAt').lean(),
      Article.find({}).select('slug updatedAt publishedAt').lean(),
      Group.countDocuments({ status: 'approved' }),
      Bot.countDocuments({ status: 'approved' }),
      Group.distinct('country', { status: 'approved' }),
      Group.aggregate([
        { $match: { status: 'approved' } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]),
      Group.aggregate([
        { $match: { status: 'approved' } },
        { $group: { _id: '$country', count: { $sum: 1 } } },
      ]),
    ]);

    const activeCategories = new Set(categoryCounts.map((c: any) => c._id));
    const activeCountries = new Set(countryCounts.map((c: any) => c._id));
    const totalGroupPages = Math.ceil(totalGroups / PER_PAGE);
    const totalBotPages = Math.ceil(totalBots / PER_PAGE);

    const staticRoutes: MetadataRoute.Sitemap = [
      { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
      { url: `${baseUrl}/groups`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
      { url: `${baseUrl}/bots`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
      { url: `${baseUrl}/articles`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
      { url: `${baseUrl}/best-telegram-groups`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
      { url: `${baseUrl}/add`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
      { url: `${baseUrl}/advertise`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
      { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
      { url: `${baseUrl}/terms`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
      { url: `${baseUrl}/privacy`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    ];

    const bestGroupsCategoryRoutes: MetadataRoute.Sitemap = categories
      .filter(cat => cat !== 'All' && activeCategories.has(cat))
      .map((category) => ({
        url: `${baseUrl}/best-telegram-groups/${encodeURIComponent(category.toLowerCase())}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      }));

    const bestGroupsCountryRoutes: MetadataRoute.Sitemap = (dbCountries as string[])
      .filter((country: string) => activeCountries.has(country) && country !== 'All')
      .map((country: string) => ({
        url: `${baseUrl}/best-telegram-groups/country/${encodeURIComponent(country.toLowerCase())}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      }));

    const groupPaginationRoutes: MetadataRoute.Sitemap = [];
    for (let page = 1; page <= totalGroupPages; page++) {
      groupPaginationRoutes.push({
        url: `${baseUrl}/groups/page/${page}`,
        lastModified: new Date(),
        changeFrequency: 'daily' as const,
        priority: 0.7,
      });
    }

    const botPaginationRoutes: MetadataRoute.Sitemap = [];
    for (let page = 1; page <= totalBotPages; page++) {
      botPaginationRoutes.push({
        url: `${baseUrl}/bots/page/${page}`,
        lastModified: new Date(),
        changeFrequency: 'daily' as const,
        priority: 0.7,
      });
    }

    const groupCountryRoutes: MetadataRoute.Sitemap = (dbCountries as string[])
      .filter((c: string) => c !== 'All')
      .map((country: string) => ({
        url: `${baseUrl}/groups/country/${encodeURIComponent(country)}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }));

    const botCountryRoutes: MetadataRoute.Sitemap = (dbCountries as string[])
      .filter((c: string) => c !== 'All')
      .map((country: string) => ({
        url: `${baseUrl}/bots/country/${encodeURIComponent(country)}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }));

    const groupRoutes: MetadataRoute.Sitemap = groups.map((group: any) => ({
      url: `${baseUrl}/${group.slug}`,
      lastModified: group.updatedAt || new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));

    const botRoutes: MetadataRoute.Sitemap = bots.map((bot: any) => ({
      url: `${baseUrl}/${bot.slug}`,
      lastModified: bot.updatedAt || new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));

    const articleRoutes: MetadataRoute.Sitemap = articles.map((article: any) => ({
      url: `${baseUrl}/articles/${article.slug}`,
      lastModified: article.updatedAt || article.publishedAt || new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));

    return [
      ...staticRoutes,
      ...bestGroupsCategoryRoutes,
      ...bestGroupsCountryRoutes,
      ...groupPaginationRoutes,
      ...botPaginationRoutes,
      ...groupCountryRoutes,
      ...botCountryRoutes,
      ...groupRoutes,
      ...botRoutes,
      ...articleRoutes,
    ];
  } catch (error) {
    console.error('Error generating sitemap:', error);

    return [
      { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
      { url: `${baseUrl}/groups`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
      { url: `${baseUrl}/bots`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
      { url: `${baseUrl}/articles`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
      { url: `${baseUrl}/best-telegram-groups`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
      { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
      { url: `${baseUrl}/terms`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
      { url: `${baseUrl}/privacy`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    ];
  }
}
