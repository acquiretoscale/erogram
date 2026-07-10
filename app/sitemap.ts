import { MetadataRoute } from 'next';
import connectDB from '@/lib/db/mongodb';
import { Group, Article, Bot, AINsfwSubmission } from '@/lib/models';
import { categories } from '@/app/groups/constants';
import { LOCALES, LOCALE_HREFLANG, localePath } from '@/lib/i18n/config';
import { BLOG_CATEGORY_SLUGS } from '@/lib/blog/categories';
import { OF_CATEGORIES } from '@/app/onlyfanssearch/constants';
import { BEST_OF_PAGES, bestOfBlogSlug } from '@/app/best-onlyfans-accounts/bestOfPages';
import { AI_NSFW_TOOLS, CATEGORY_SLUGS, toolSlug } from '@/app/ainsfw/data';

/** Build alternates object for a given path — tells Google about all language versions. */
function buildAlternates(basePath: string, canonicalBase: string) {
  const languages: Record<string, string> = {};
  for (const loc of LOCALES) {
    languages[LOCALE_HREFLANG[loc]] = `${canonicalBase}${localePath(basePath, loc)}`;
  }
  languages['x-default'] = `${canonicalBase}${basePath}`;
  return { languages };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://erogram.pro';
  const canonicalBase = 'https://erogram.pro';
  const PER_PAGE = 12;

  try {
    await connectDB();

    const [groups, bots, articles, ainsfwSubmissions, totalGroups, totalBots, dbCountries, categoryCounts, countryCounts] = await Promise.all([
      Group.find({ status: 'approved', premiumOnly: { $ne: true }, category: { $ne: 'Hentai' } }).select('slug updatedAt description_de description_es').lean(),
      Bot.find({ status: 'approved' }).select('slug updatedAt description_de description_es').lean(),
      Article.find({ status: 'published' }).select('slug updatedAt publishedAt').lean(),
      AINsfwSubmission.find({ status: 'approved', paymentStatus: 'paid' }).select('name category updatedAt').lean(),
      Group.countDocuments({ status: 'approved', premiumOnly: { $ne: true } }),
      Bot.countDocuments({ status: 'approved' }),
      Group.distinct('country', { status: 'approved', premiumOnly: { $ne: true } }),
      Group.aggregate([
        { $match: { status: 'approved', premiumOnly: { $ne: true } } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]),
      Group.aggregate([
        { $match: { status: 'approved', premiumOnly: { $ne: true } } },
        { $group: { _id: '$country', count: { $sum: 1 } } },
      ]),
    ]);

    const activeCategories = new Set(categoryCounts.map((c: any) => c._id));
    const activeCountries = new Set(countryCounts.map((c: any) => c._id));
    const totalGroupPages = Math.ceil(totalGroups / PER_PAGE);
    const totalBotPages = Math.ceil(totalBots / PER_PAGE);

    const staticRoutes: MetadataRoute.Sitemap = [
      { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1, alternates: buildAlternates('/', canonicalBase) },
      { url: `${baseUrl}/groups`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9, alternates: buildAlternates('/groups', canonicalBase) },
      { url: `${baseUrl}/bots`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9, alternates: buildAlternates('/bots', canonicalBase) },
      { url: `${baseUrl}/blog`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
      ...BLOG_CATEGORY_SLUGS.map((slug) => ({
        url: `${baseUrl}/blog/category/${slug}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      })),
      { url: `${baseUrl}/onlyfanssearch`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9, alternates: buildAlternates('/onlyfanssearch', canonicalBase) },
      { url: `${baseUrl}/best-onlyfans-creators`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8, alternates: buildAlternates('/best-onlyfans-creators', canonicalBase) },
      { url: `${baseUrl}/ainsfw`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9, alternates: buildAlternates('/ainsfw', canonicalBase) },
      { url: `${baseUrl}/best-telegram-groups`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8, alternates: buildAlternates('/best-telegram-groups', canonicalBase) },
      { url: `${baseUrl}/add`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6, alternates: buildAlternates('/add', canonicalBase) },
      { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5, alternates: buildAlternates('/about', canonicalBase) },
      { url: `${baseUrl}/terms`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3, alternates: buildAlternates('/terms', canonicalBase) },
      { url: `${baseUrl}/privacy`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3, alternates: buildAlternates('/privacy', canonicalBase) },
    ];

    const ofTop10Routes: MetadataRoute.Sitemap = BEST_OF_PAGES.map((page) => {
      const path = `/onlyfanssearch/${bestOfBlogSlug(page.slug)}`;
      return {
        url: `${baseUrl}${path}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
        alternates: buildAlternates(path, canonicalBase),
      };
    });

    const ofBrowseRoutes: MetadataRoute.Sitemap = OF_CATEGORIES.map((cat) => {
      const path = `/onlyfanssearch/${cat.slug}`;
      return {
        url: `${baseUrl}${path}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
        alternates: buildAlternates(path, canonicalBase),
      };
    });

    const ofBestCategoryRoutes: MetadataRoute.Sitemap = OF_CATEGORIES.map((cat) => {
      const path = `/best-onlyfans-accounts/${cat.slug}`;
      return {
        url: `${baseUrl}${path}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
        alternates: buildAlternates(path, canonicalBase),
      };
    });

    const bestGroupsCategoryRoutes: MetadataRoute.Sitemap = categories
      .filter(cat => cat !== 'All' && activeCategories.has(cat))
      .map((category) => {
        const path = `/best-telegram-groups/${encodeURIComponent(category.toLowerCase())}`;
        return {
          url: `${baseUrl}${path}`,
          lastModified: new Date(),
          changeFrequency: 'weekly' as const,
          priority: 0.8,
          alternates: buildAlternates(path, canonicalBase),
        };
      });

    const bestGroupsCountryRoutes: MetadataRoute.Sitemap = (dbCountries as string[])
      .filter((country: string) => activeCountries.has(country) && country !== 'All')
      .map((country: string) => {
        const path = `/best-telegram-groups/country/${encodeURIComponent(country.toLowerCase())}`;
        return {
          url: `${baseUrl}${path}`,
          lastModified: new Date(),
          changeFrequency: 'weekly' as const,
          priority: 0.8,
          alternates: buildAlternates(path, canonicalBase),
        };
      });

    const groupPaginationRoutes: MetadataRoute.Sitemap = [];
    for (let page = 1; page <= totalGroupPages; page++) {
      const path = `/groups/page/${page}`;
      groupPaginationRoutes.push({
        url: `${baseUrl}${path}`,
        lastModified: new Date(),
        changeFrequency: 'daily' as const,
        priority: 0.7,
        alternates: buildAlternates(path, canonicalBase),
      });
    }

    const botPaginationRoutes: MetadataRoute.Sitemap = [];
    for (let page = 1; page <= totalBotPages; page++) {
      const path = `/bots/page/${page}`;
      botPaginationRoutes.push({
        url: `${baseUrl}${path}`,
        lastModified: new Date(),
        changeFrequency: 'daily' as const,
        priority: 0.7,
        alternates: buildAlternates(path, canonicalBase),
      });
    }

    const groupCountryRoutes: MetadataRoute.Sitemap = (dbCountries as string[])
      .filter((c: string) => c !== 'All')
      .map((country: string) => {
        const path = `/groups/country/${encodeURIComponent(country)}`;
        return {
          url: `${baseUrl}${path}`,
          lastModified: new Date(),
          changeFrequency: 'weekly' as const,
          priority: 0.7,
          alternates: buildAlternates(path, canonicalBase),
        };
      });

    const botCountryRoutes: MetadataRoute.Sitemap = (dbCountries as string[])
      .filter((c: string) => c !== 'All')
      .map((country: string) => {
        const path = `/bots/country/${encodeURIComponent(country)}`;
        return {
          url: `${baseUrl}${path}`,
          lastModified: new Date(),
          changeFrequency: 'weekly' as const,
          priority: 0.7,
          alternates: buildAlternates(path, canonicalBase),
        };
      });

    const groupRoutes: MetadataRoute.Sitemap = groups.map((group: any) => {
      const path = `/${group.slug}`;
      return {
        url: `${baseUrl}${path}`,
        lastModified: group.updatedAt || new Date(),
        changeFrequency: 'monthly' as const,
        priority: 0.7,
        alternates: buildAlternates(path, canonicalBase),
      };
    });

    const botRoutes: MetadataRoute.Sitemap = bots.map((bot: any) => {
      const path = `/${bot.slug}`;
      return {
        url: `${baseUrl}${path}`,
        lastModified: bot.updatedAt || new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
        alternates: buildAlternates(path, canonicalBase),
      };
    });

    const articleRoutes: MetadataRoute.Sitemap = articles.map((article: any) => ({
      url: `${baseUrl}/blog/${article.slug}`,
      lastModified: article.updatedAt || article.publishedAt || new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));

    const builtInAinsfwSlugs = new Set(AI_NSFW_TOOLS.map((tool) => tool.slug));
    const ainsfwToolRoutes: MetadataRoute.Sitemap = [
      ...AI_NSFW_TOOLS.map((tool) => {
        const path = `/ainsfw/${tool.slug}`;
        return {
          url: `${baseUrl}${path}`,
          lastModified: new Date(),
          changeFrequency: 'monthly' as const,
          priority: 0.7,
          alternates: buildAlternates(path, canonicalBase),
        };
      }),
      ...(ainsfwSubmissions as any[])
        .map((sub) => toolSlug(sub.category, sub.name))
        .filter((slug) => !builtInAinsfwSlugs.has(slug))
        .map((slug) => {
          const path = `/ainsfw/${slug}`;
          return {
            url: `${baseUrl}${path}`,
            lastModified: new Date(),
            changeFrequency: 'monthly' as const,
            priority: 0.7,
            alternates: buildAlternates(path, canonicalBase),
          };
        }),
    ];

    const ainsfwCategoryRoutes: MetadataRoute.Sitemap = Object.keys(CATEGORY_SLUGS).map((slug) => {
      const path = `/ainsfw/${slug}`;
      return {
        url: `${baseUrl}${path}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
        alternates: buildAlternates(path, canonicalBase),
      };
    });

    return [
      ...staticRoutes,
      ...ofTop10Routes,
      ...ofBrowseRoutes,
      ...ofBestCategoryRoutes,
      ...ainsfwToolRoutes,
      ...ainsfwCategoryRoutes,
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
      { url: `${baseUrl}/blog`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
      { url: `${baseUrl}/onlyfanssearch`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
      { url: `${baseUrl}/best-onlyfans-creators`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
      { url: `${baseUrl}/ainsfw`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
      { url: `${baseUrl}/best-telegram-groups`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
      { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
      { url: `${baseUrl}/terms`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
      { url: `${baseUrl}/privacy`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    ];
  }
}
