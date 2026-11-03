import connectDB from '@/lib/db/mongodb';
import { Group, Article, Bot, AINsfwSubmission } from '@/lib/models';
import { categories } from '@/app/groups/constants';
import { AI_NSFW_TOOLS, toolSlug } from '@/app/ainsfw/data';
import { EXPLORE_CATEGORIES } from '@/lib/explore/topPornSitesData';
import { SEARCH_DISCOVERY_ORIGIN } from '@/lib/seo/publicOrigins';

interface SitemapEntry {
  loc: string;
  lastmod: string;
  changefreq: string;
  priority: string;
}

function entry(path: string, changefreq: string, priority: number, lastmod?: Date): SitemapEntry {
  return {
    loc: `${SEARCH_DISCOVERY_ORIGIN}${path}`,
    lastmod: (lastmod || new Date()).toISOString(),
    changefreq,
    priority: priority.toFixed(1),
  };
}

function toXml(entries: SitemapEntry[]): string {
  const urls = entries.map(
    (e) =>
      `  <url>\n    <loc>${e.loc}</loc>\n    <lastmod>${e.lastmod}</lastmod>\n    <changefreq>${e.changefreq}</changefreq>\n    <priority>${e.priority}</priority>\n  </url>`,
  );
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    '</urlset>',
  ].join('\n');
}

export async function GET() {
  try {
    await connectDB();

    const [groups, bots, articles, ainsfwSubmissions, dbCountries, categoryCounts, countryCounts] =
      await Promise.all([
        Group.find({
          status: 'approved',
          premiumOnly: { $ne: true },
          category: { $ne: 'Hentai' },
        })
          .select('slug updatedAt')
          .lean(),
        Bot.find({ status: 'approved' }).select('slug updatedAt').lean(),
        Article.find({ status: 'published' }).select('slug updatedAt publishedAt').lean(),
        AINsfwSubmission.find({ status: 'approved', paymentStatus: 'paid' })
          .select('name category updatedAt')
          .lean(),
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
    const countries = (dbCountries as string[]).filter((c) => c && c !== 'All');

    const entries: SitemapEntry[] = [];

    entries.push(entry('/', 'daily', 1.0));

    entries.push(entry('/groups', 'daily', 0.9));
    entries.push(entry('/bots', 'daily', 0.9));
    entries.push(entry('/blog', 'daily', 0.9));
    entries.push(entry('/ainsfw', 'daily', 0.9));
    entries.push(entry('/best-porn', 'daily', 0.9));

    for (const g of groups as any[]) {
      entries.push(entry(`/${g.slug}`, 'daily', 0.6, g.updatedAt));
    }

    for (const b of bots as any[]) {
      entries.push(entry(`/${b.slug}`, 'weekly', 0.8, b.updatedAt));
    }

    const builtInSlugs = new Set(AI_NSFW_TOOLS.map((t) => t.slug));
    for (const tool of AI_NSFW_TOOLS) {
      entries.push(entry(`/ainsfw/${tool.slug}`, 'monthly', 0.9));
    }
    for (const sub of ainsfwSubmissions as any[]) {
      const slug = toolSlug(sub.category, sub.name);
      if (!builtInSlugs.has(slug)) {
        entries.push(entry(`/ainsfw/${slug}`, 'monthly', 0.9));
      }
    }

    entries.push(entry('/best-telegram-groups', 'weekly', 0.8));
    for (const cat of categories) {
      if (cat === 'All' || !activeCategories.has(cat)) continue;
      entries.push(
        entry(`/best-telegram-groups/${encodeURIComponent(cat.toLowerCase())}`, 'weekly', 0.8),
      );
    }

    for (const c of countries) {
      if (!activeCountries.has(c)) continue;
      entries.push(
        entry(
          `/best-telegram-groups/country/${encodeURIComponent(c.toLowerCase())}`,
          'weekly',
          0.8,
        ),
      );
    }

    for (const cat of EXPLORE_CATEGORIES) {
      entries.push(entry(`/${cat.slug}`, 'weekly', 0.7));
    }

    for (const c of countries) {
      entries.push(entry(`/groups/country/${encodeURIComponent(c)}`, 'weekly', 0.7));
    }

    for (const a of articles as any[]) {
      entries.push(entry(`/blog/${a.slug}`, 'daily', 0.9, a.updatedAt || a.publishedAt));
    }

    entries.push(entry('/ofsearch', 'daily', 0.6));

    const xml = toXml(entries);
    return new Response(xml, {
      headers: { 'Content-Type': 'application/xml; charset=utf-8' },
    });
  } catch (error) {
    console.error('Error generating sitemap.xml:', error);
    const fallback = toXml([
      entry('/', 'daily', 1.0),
      entry('/groups', 'daily', 0.9),
      entry('/bots', 'daily', 0.9),
      entry('/blog', 'daily', 0.9),
      entry('/ainsfw', 'daily', 0.9),
      entry('/best-porn', 'daily', 0.9),
    ]);
    return new Response(fallback, {
      headers: { 'Content-Type': 'application/xml; charset=utf-8' },
    });
  }
}
