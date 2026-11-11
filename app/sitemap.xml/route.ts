import connectDB from '@/lib/db/mongodb';
import { Group, Article, Bot, AINsfwSubmission } from '@/lib/models';
import { categories, categorySlug, GROUPS_FEED_PAGE_SIZE } from '@/app/groups/constants';
import { AI_NSFW_TOOLS, CATEGORY_SLUGS, categoryToSlug, toolSlug } from '@/app/ainsfw/data';
import { BLOG_CATEGORY_SLUGS } from '@/lib/blog/categories';
import { EXPLORE_CATEGORIES } from '@/lib/explore/topPornSitesData';
import { SEARCH_DISCOVERY_ORIGIN } from '@/lib/seo/publicOrigins';

interface SitemapEntry {
  loc: string;
  lastmod: string;
  changefreq: string;
  priority: string;
}

function lastmodValue(value?: Date | string | null): string | undefined {
  if (!value) return undefined;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

function entry(
  path: string,
  changefreq: string,
  priority: number,
  lastmod?: Date | string | null,
): SitemapEntry {
  return {
    loc: `${SEARCH_DISCOVERY_ORIGIN}${path}`,
    lastmod: lastmodValue(lastmod) || new Date().toISOString(),
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

    const [groups, groupFeedCount, bots, articles, ainsfwSubmissions, dbCountries, categoryCounts, countryCounts] =
      await Promise.all([
        Group.find({
          status: 'approved',
          premiumOnly: { $ne: true },
          category: { $ne: 'Hentai' },
        })
          .select('slug updatedAt')
          .lean(),
        Group.countDocuments({
          status: 'approved',
          isAdvertisement: { $ne: true },
          premiumOnly: { $ne: true },
          category: { $ne: 'Hentai' },
        }),
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
    const seen = new Set<string>();
    const push = (
      path: string,
      changefreq: string,
      priority: number,
      lastmod?: Date | string | null,
    ) => {
      if (!path || path === '/' || seen.has(path)) return;
      seen.add(path);
      entries.push(entry(path, changefreq, priority, lastmod));
    };

    entries.push(entry('/', 'daily', 1.0));
    seen.add('/');

    push('/groups', 'daily', 0.9);
    const groupPages = Math.ceil(groupFeedCount / GROUPS_FEED_PAGE_SIZE);
    for (let p = 2; p <= groupPages; p++) {
      push(`/groups/page/${p}`, 'weekly', 0.5);
    }
    push('/bots', 'daily', 0.9);
    push('/blog', 'daily', 0.9);
    push('/ainsfw', 'daily', 0.9);
    push('/best-porn', 'daily', 0.9);

    for (const g of groups as any[]) {
      if (!g.slug) continue;
      push(`/${g.slug}`, 'daily', 0.6, g.updatedAt);
    }

    for (const b of bots as any[]) {
      if (!b.slug) continue;
      push(`/${b.slug}`, 'weekly', 0.8, b.updatedAt);
    }

    const builtInSlugs = new Set(AI_NSFW_TOOLS.map((t) => t.slug));
    for (const tool of AI_NSFW_TOOLS) {
      push(`/ainsfw/${tool.slug}`, 'monthly', 0.9);
    }
    for (const sub of ainsfwSubmissions as any[]) {
      const slug = toolSlug(sub.category, sub.name);
      if (!builtInSlugs.has(slug)) {
        push(`/ainsfw/${slug}`, 'monthly', 0.9, sub.updatedAt);
      }
    }
    for (const name of Object.values(CATEGORY_SLUGS)) {
      push(`/ainsfw/${categoryToSlug(name)}`, 'weekly', 0.8);
    }

    push('/best-telegram-groups', 'weekly', 0.8);
    for (const cat of categories) {
      if (cat === 'All' || !activeCategories.has(cat)) continue;
      push(`/best-telegram-groups/${categorySlug(cat)}`, 'weekly', 0.8);
    }

    for (const c of countries) {
      if (!activeCountries.has(c)) continue;
      push(
        `/best-telegram-groups/country/${encodeURIComponent(c.toLowerCase())}`,
        'weekly',
        0.8,
      );
    }

    for (const cat of EXPLORE_CATEGORIES) {
      push(`/${cat.slug}`, 'weekly', 0.7);
    }

    for (const c of countries) {
      push(`/groups/country/${encodeURIComponent(c)}`, 'weekly', 0.7);
    }

    for (const a of articles as any[]) {
      if (!a.slug) continue;
      push(`/blog/${a.slug}`, 'daily', 0.9, a.updatedAt || a.publishedAt);
    }
    for (const slug of BLOG_CATEGORY_SLUGS) {
      push(`/blog/category/${slug}`, 'weekly', 0.8);
    }

    push('/best-onlyfans-accounts', 'weekly', 0.8);
    push('/ofsearch', 'daily', 0.6);
    push('/tags', 'weekly', 0.6);

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
