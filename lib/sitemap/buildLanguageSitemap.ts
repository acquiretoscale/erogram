import connectDB from '@/lib/db/mongodb';
import { Group, Bot, AINsfwSubmission } from '@/lib/models';
import { categories } from '@/app/groups/constants';
import { OF_CATEGORIES } from '@/app/onlyfanssearch/constants';
import { BEST_OF_PAGES, bestOfBlogSlug } from '@/app/best-onlyfans-accounts/bestOfPages';
import { AI_NSFW_TOOLS, CATEGORY_SLUGS, toolSlug } from '@/app/ainsfw/data';
import { publicPathFromInternal } from '@/lib/i18n/switchLocalePath';
import type { Locale } from '@/lib/i18n/config';

const BASE_URL = 'https://erogram.pro';
const PER_PAGE = 12;

function entry(internalPath: string, locale: Locale, lastmod?: Date): string {
  const pub = publicPathFromInternal(internalPath, locale);
  const date = (lastmod || new Date()).toISOString();
  return `  <url>\n    <loc>${BASE_URL}${pub}</loc>\n    <lastmod>${date}</lastmod>\n  </url>`;
}

export async function buildLanguageSitemap(locale: Locale): Promise<string> {
  await connectDB();

  const [
    groups, bots, totalGroups, totalBots,
    dbCountries, categoryCounts, countryCounts, ainsfwSubmissions,
  ] = await Promise.all([
    Group.find({ status: 'approved', premiumOnly: { $ne: true }, category: { $ne: 'Hentai' } })
      .select('slug updatedAt').lean(),
    Bot.find({ status: 'approved' }).select('slug updatedAt').lean(),
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
    AINsfwSubmission.find({ status: 'approved', paymentStatus: 'paid' })
      .select('name category').lean(),
  ]);

  const activeCategories = new Set(categoryCounts.map((c: any) => c._id));
  const activeCountries = new Set(countryCounts.map((c: any) => c._id));
  const countries = (dbCountries as string[]).filter(c => c && c !== 'All');
  const totalGroupPages = Math.ceil(totalGroups / PER_PAGE);
  const totalBotPages = Math.ceil(totalBots / PER_PAGE);

  const entries: string[] = [];

  // Home
  entries.push(entry('/', locale));

  // Groups
  entries.push(entry('/groups', locale));
  for (let p = 2; p <= totalGroupPages; p++) {
    entries.push(entry(`/groups/page/${p}`, locale));
  }
  countries.forEach(c => entries.push(entry(`/groups/country/${encodeURIComponent(c)}`, locale)));
  (groups as any[]).forEach(g => entries.push(entry(`/${g.slug}`, locale, g.updatedAt)));

  // Bots
  entries.push(entry('/bots', locale));
  for (let p = 2; p <= totalBotPages; p++) {
    entries.push(entry(`/bots/page/${p}`, locale));
  }
  countries.forEach(c => entries.push(entry(`/bots/country/${encodeURIComponent(c)}`, locale)));
  (bots as any[]).forEach(b => entries.push(entry(`/${b.slug}`, locale, b.updatedAt)));

  // AINSFW (English-only hubs — locale-prefixed but slug stays English)
  entries.push(entry('/ainsfw', locale));
  const builtInAinsfwSlugs = new Set(AI_NSFW_TOOLS.map(t => t.slug));
  AI_NSFW_TOOLS.forEach(t => entries.push(entry(`/ainsfw/${t.slug}`, locale)));
  (ainsfwSubmissions as any[])
    .map(s => toolSlug(s.category, s.name))
    .filter(s => !builtInAinsfwSlugs.has(s))
    .forEach(s => entries.push(entry(`/ainsfw/${s}`, locale)));
  Object.keys(CATEGORY_SLUGS).forEach(s => entries.push(entry(`/ainsfw/${s}`, locale)));

  // OnlyFans Search
  entries.push(entry('/onlyfanssearch', locale));
  OF_CATEGORIES.forEach(cat => entries.push(entry(`/onlyfanssearch/${cat.slug}`, locale)));
  BEST_OF_PAGES.forEach(p => entries.push(entry(`/onlyfanssearch/${bestOfBlogSlug(p.slug)}`, locale)));

  // best-onlyfans-accounts (translated slugs)
  OF_CATEGORIES.forEach(cat => entries.push(entry(`/best-onlyfans-accounts/${cat.slug}`, locale)));

  // best-telegram-groups (translated hub + category slugs)
  entries.push(entry('/best-telegram-groups', locale));
  categories
    .filter(cat => cat !== 'All' && activeCategories.has(cat))
    .forEach(cat => entries.push(
      entry(`/best-telegram-groups/${encodeURIComponent(cat.toLowerCase())}`, locale)
    ));
  countries
    .filter(c => activeCountries.has(c))
    .forEach(c => entries.push(
      entry(`/best-telegram-groups/country/${encodeURIComponent(c.toLowerCase())}`, locale)
    ));

  // Static pages (no blog — English-only by owner rule)
  entries.push(entry('/best-onlyfans-creators', locale));
  entries.push(entry('/add', locale));
  entries.push(entry('/about', locale));
  entries.push(entry('/terms', locale));
  entries.push(entry('/privacy', locale));

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries,
    '</urlset>',
  ].join('\n');
}
