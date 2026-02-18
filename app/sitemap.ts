import { MetadataRoute } from 'next';
import connectDB from '@/lib/db/mongodb';
import { Group, Article, Bot } from '@/lib/models';
import { categories, countries } from '@/app/groups/constants';

// Split sitemap into multiple files if it gets too large
// Google limit is 50,000 URLs per sitemap
// We'll generate a single sitemap for now but structure it to be easily split later

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://erogram.pro';

  try {
    await connectDB();

    // Get all approved groups
    const groups = await Group.find({ status: 'approved' })
      .select('slug updatedAt')
      .lean();

    // Get all approved bots
    const bots = await Bot.find({ status: 'approved' })
      .select('slug updatedAt')
      .lean();

    // Get all articles (same as listing/admin)
    const articles = await Article.find({})
      .select('slug updatedAt publishedAt')
      .lean();

    // Get total approved groups for pagination
    const totalGroups = await Group.countDocuments({ status: 'approved' });
    const PER_PAGE = 12;
    const totalPages = Math.ceil(totalGroups / PER_PAGE);

    // Get distinct countries for country-specific routes
    const countries = await Group.distinct('country', { status: 'approved' });

    // Static routes
    const staticRoutes: MetadataRoute.Sitemap = [
      {
        url: baseUrl,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 1,
      },
      {
        url: `${baseUrl}/groups`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 0.9,
      },
      {
        url: `${baseUrl}/bots`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 0.9,
      },
      {
        url: `${baseUrl}/articles`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 0.9,
      },
      {
        url: `${baseUrl}/about`,
        lastModified: new Date(),
        changeFrequency: 'monthly',
        priority: 0.5,
      },
      {
        url: `${baseUrl}/login`,
        lastModified: new Date(),
        changeFrequency: 'monthly',
        priority: 0.3,
      },
    ];

    // Get group counts by category
    const categoryCounts = await Group.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);
    const activeCategories = new Set(categoryCounts.map(c => c._id));

    // Get group counts by country
    const countryCounts = await Group.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: '$country', count: { $sum: 1 } } }
    ]);
    const activeCountries = new Set(countryCounts.map(c => c._id));

    // Dynamic "Best Telegram Groups" routes (Category Listicles)
    // Only include categories that have at least 1 group
    const bestGroupsRoutes: MetadataRoute.Sitemap = categories
      .filter(category => activeCategories.has(category))
      .map((category) => ({
        url: `${baseUrl}/best-telegram-groups/${encodeURIComponent(category.toLowerCase())}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      }));

    // Dynamic "Best Telegram Groups" routes (Country Listicles)
    // Only include countries that have at least 1 group
    const bestCountryGroupsRoutes: MetadataRoute.Sitemap = countries
      .filter(country => activeCountries.has(country))
      .map((country) => ({
        url: `${baseUrl}/best-telegram-groups/country/${encodeURIComponent(country.toLowerCase())}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      }));

    // Dynamic group pagination routes
    const groupPaginationRoutes: MetadataRoute.Sitemap = [];
    for (let page = 1; page <= totalPages; page++) {
      groupPaginationRoutes.push({
        url: `${baseUrl}/groups/page/${page}`,
        lastModified: new Date(),
        changeFrequency: 'daily' as const,
        priority: 0.8,
      });
    }

    // Dynamic country routes
    const countryRoutes: MetadataRoute.Sitemap = countries.map((country: string) => ({
      url: `${baseUrl}/groups/country/${country}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));

    // Dynamic group routes
    const groupRoutes: MetadataRoute.Sitemap = groups.map((group: any) => ({
      url: `${baseUrl}/${group.slug}`,
      lastModified: group.updatedAt || new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));

    // Dynamic bot routes
    const botRoutes: MetadataRoute.Sitemap = bots.map((bot: any) => ({
      url: `${baseUrl}/${bot.slug}`,
      lastModified: bot.updatedAt || new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));

    // Dynamic article routes
    const articleRoutes: MetadataRoute.Sitemap = articles.map((article: any) => ({
      url: `${baseUrl}/articles/${article.slug}`,
      lastModified: article.updatedAt || article.publishedAt || new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));

    return [
      ...staticRoutes,
      ...bestGroupsRoutes,
      ...bestCountryGroupsRoutes,
      ...groupPaginationRoutes,
      ...countryRoutes,
      ...groupRoutes,
      ...botRoutes,
      ...articleRoutes
    ];
  } catch (error) {
    console.error('Error generating sitemap:', error);

    // Fallback pagination routes (assuming at least 5 pages)
    const fallbackGroupPaginationRoutes: MetadataRoute.Sitemap = [];
    for (let page = 1; page <= 5; page++) {
      fallbackGroupPaginationRoutes.push({
        url: `${baseUrl}/groups/page/${page}`,
        lastModified: new Date(),
        changeFrequency: 'daily' as const,
        priority: 0.8,
      });
    }

    // Return at least static routes if DB fails
    return [
      {
        url: baseUrl,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 1,
      },
      {
        url: `${baseUrl}/groups`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 0.9,
      },
      {
        url: `${baseUrl}/bots`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 0.9,
      },
      {
        url: `${baseUrl}/articles`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 0.9,
      },
      {
        url: `${baseUrl}/about`,
        lastModified: new Date(),
        changeFrequency: 'monthly',
        priority: 0.5,
      },
      ...fallbackGroupPaginationRoutes,
    ];
  }
}
