import { Metadata } from 'next';
import HomeClient from './HomeClient';
import connectDB from '@/lib/db/mongodb';
import ErrorBoundary from '@/components/ErrorBoundary';
import { getActiveCampaigns } from '@/lib/actions/campaigns';
import { getPublishedBlogArticles } from '@/lib/actions/blog';
import { Group, Bot, OnlyFansCreator, User } from '@/lib/models';
import { getLocale, getPathname } from '@/lib/i18n/server';
import { getDictionary } from '@/lib/i18n';
import { OF_CATEGORIES } from '@/app/ofsearch/constants';
import { AI_NSFW_TOOLS } from '@/app/ainsfw/data';
import { pickRecentTools, RECENT_POOL_LIMIT } from '@/app/ainsfw/recentCategoryTools';
import { getAllToolStats, getApprovedSubmissions } from '@/lib/actions/ainsfw';
import { buildSocialMeta, buildMetadataAlternates, CANONICAL_BASE } from '@/lib/seo/socialMeta';
import { filterCategories, categorySlug } from '@/app/groups/constants';

export const revalidate = 300;

const COUNTRY_FILTERS = new Set([
  'Argentina', 'Brazil', 'China', 'Colombia', 'France', 'Germany', 'Italy', 'Japan',
  'Mexico', 'Philippines', 'Russian', 'Spain', 'UK', 'Ukraine', 'USA', 'Vietnam',
]);

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://erogramx.com';

// Display bases so totals read closer to real-world scale, then grow dynamically.
const AI_BOTS_BASE = 400;
const OF_CREATORS_BASE = 1_813_055;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const pathname = await getPathname();
  const dict = await getDictionary(locale);
  const m = dict.meta || {};

  const title = m.homeTitle || 'Erogram | Best NSFW Telegram Groups, Bots & AI Tools Directory (2026)';
  const description = m.homeDesc || 'The best NSFW & Porn Telegram groups directory. Browse thousands of verified adult Telegram and AI bots, onlyfans, AI NSFW Tools & more. Updated daily.';

  const alternates = buildMetadataAlternates(pathname, locale);
  const canonical = alternates?.canonical?.toString() || `${CANONICAL_BASE}${pathname === '/' ? '' : pathname}`;

  return {
    title,
    description,
    keywords: 'porn telegram, telegram porn, best porn telegram groups, nsfw telegram groups, adult telegram directory, porn telegram channels, nsfw telegram, telegram porn groups, amateur porn telegram, anal telegram',
    alternates,
    ...buildSocialMeta({
      title,
      description,
      url: canonical,
      type: 'website',
    }),
  };
}

async function getTopGroupCategories(limit: number = 16) {
  try {
    await connectDB();
    const base = { status: 'approved', isAdvertisement: { $ne: true }, category: { $ne: 'Hentai' } };
    const wanted = filterCategories.filter((c) => !COUNTRY_FILTERS.has(c));
    const counts = await Group.aggregate([
      { $match: base },
      {
        $project: {
          names: {
            $setUnion: [
              { $ifNull: ['$categories', []] },
              { $ifNull: ['$vaultCategories', []] },
              { $cond: [{ $ifNull: ['$category', false] }, ['$category'], []] },
              { $cond: [{ $ifNull: ['$country', false] }, ['$country'], []] },
            ],
          },
        },
      },
      { $unwind: '$names' },
      { $match: { names: { $in: wanted } } },
      { $group: { _id: '$names', count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
      { $limit: limit },
    ]);
    return (counts as { _id: string; count: number }[])
      .map((c) => ({ name: c._id, count: c.count, slug: categorySlug(c._id) }));
  } catch (error) {
    console.error('Error fetching top group categories:', error);
    return [];
  }
}

async function getNewGroups(limit: number = 8) {
  try {
    await connectDB();
    const groups = await Group.find({
      status: 'approved',
      isAdvertisement: { $ne: true },
      premiumOnly: { $ne: true },
    })
      .sort({ updatedAt: -1 })
      .limit(limit)
      .select('name slug image category country description createdAt updatedAt memberCount views')
      .lean();

    return (groups as any[]).map((g) => ({
      _id: g._id.toString(),
      name: g.name || '',
      slug: g.slug || '',
      image: g.image || '',
      category: g.category || '',
      country: g.country || '',
      description: (g.description || '').slice(0, 120),
      memberCount: g.memberCount || 0,
      views: g.views || 0,
    }));
  } catch (error) {
    console.error('Error fetching new groups:', error);
    return [];
  }
}

async function getNewestBots(limit: number = 8) {
  try {
    await connectDB();
    const bots = await Bot.find({ status: 'approved', isAdvertisement: { $ne: true } })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('name slug image category memberCount')
      .lean();
    return (bots as any[]).map((b) => ({
      _id: b._id.toString(),
      name: b.name || '',
      slug: b.slug || '',
      image: (b.image && typeof b.image === 'string' && b.image.startsWith('https://')) ? b.image : '/assets/placeholder-no-image.png',
      category: b.category || '',
      memberCount: b.memberCount || 0,
    }));
  } catch (error) {
    console.error('Error fetching newest bots:', error);
    return [];
  }
}

async function getOFCategoryPreviews() {
  const fallback = OF_CATEGORIES.slice(0, 12).map((c) => ({ slug: c.slug, name: c.name, emoji: c.emoji, avatar: '' }));
  try {
    await connectDB();
    const slugs = OF_CATEGORIES.slice(0, 12).map((c) => c.slug);
    const rows = await OnlyFansCreator.aggregate([
      { $match: { gender: 'female', avatar: { $ne: '' }, deleted: { $ne: true }, categories: { $in: slugs } } },
      { $unwind: '$categories' },
      { $match: { categories: { $in: slugs } } },
      { $sort: { clicks: -1 } },
      { $group: { _id: '$categories', avatar: { $first: '$avatar' } } },
    ]);
    const avatarMap = new Map<string, string>((rows as any[]).map((r) => [r._id, r.avatar]));
    return OF_CATEGORIES.slice(0, 12).map((c) => ({
      slug: c.slug,
      name: c.name,
      emoji: c.emoji,
      avatar: avatarMap.get(c.slug) || '',
    }));
  } catch (error) {
    console.error('Error fetching OF category previews:', error);
    return fallback;
  }
}

async function getStats() {
  const aiNsfwCount = AI_NSFW_TOOLS.length;
  try {
    await connectDB();
    const [groupCount, botCount, userCount, groupViewsAgg, botViewsAgg, ofCount] = await Promise.all([
      Group.countDocuments({ status: 'approved', isAdvertisement: { $ne: true } }),
      Bot.countDocuments({ status: 'approved', isAdvertisement: { $ne: true } }),
      User.countDocuments({}),
      Group.aggregate([
        { $match: { status: 'approved' } },
        { $group: { _id: null, total: { $sum: '$views' } } },
      ]),
      Bot.aggregate([
        { $match: { status: 'approved' } },
        { $group: { _id: null, total: { $sum: '$views' } } },
      ]),
      OnlyFansCreator.countDocuments({ deleted: { $ne: true } }),
    ]);
    return {
      groupCount: groupCount || 0,
      botCount: botCount || 0,
      totalMembers: userCount || 0,
      totalViews: (groupViewsAgg[0]?.total || 0) + (botViewsAgg[0]?.total || 0),
      aiAndBotsCount: AI_BOTS_BASE + aiNsfwCount + (botCount || 0),
      ofCreatorsCount: OF_CREATORS_BASE + (ofCount || 0),
    };
  } catch (error) {
    console.error('Error fetching stats:', error);
    return { groupCount: 0, botCount: 0, totalMembers: 0, totalViews: 0, aiAndBotsCount: AI_BOTS_BASE + aiNsfwCount, ofCreatorsCount: OF_CREATORS_BASE };
  }
}

export default async function Home() {
  const locale = await getLocale();
  const dict = await getDictionary(locale);
  const faq: { q: string; a: string }[] = [
    ...(dict.home?.faq || []),
    ...(dict.home?.faqAinsfw || []),
    ...(dict.home?.faqOnlyfans || []),
  ];
  const metaDict = dict.meta || {};

  const staticSlugs = new Set(AI_NSFW_TOOLS.map((t) => t.slug));
  const [featuredArticles, heroCampaigns, newGroups, stats, ofCategories, newestBots, topGroupCategories, paidSubmissions] = await Promise.all([
    getPublishedBlogArticles(6),
    getActiveCampaigns('homepage-hero'),
    getNewGroups(4),
    getStats(),
    getOFCategoryPreviews(),
    getNewestBots(4),
    getTopGroupCategories(16),
    getApprovedSubmissions(staticSlugs),
  ]);
  const newestAINsfw = pickRecentTools(
    new Map(),
    paidSubmissions as Array<(typeof paidSubmissions)[number] & { createdAt?: string }>,
    { limit: RECENT_POOL_LIMIT },
  );
  const newestAINsfwStats = await getAllToolStats(newestAINsfw.map((t) => t.slug));
  const { mergeToolContent } = await import('@/lib/ainsfw/toolContent');
  const displayNewestAINsfw = newestAINsfw.map((t) => mergeToolContent(t, newestAINsfwStats[t.slug]));

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Erogram',
    description: metaDict.homeDesc || 'The best NSFW and Porn Telegram groups directory. Browse verified adult communities and AI bots by category.',
    url: siteUrl,
    inLanguage: locale,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${siteUrl}/groups?search={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Erogram',
      url: siteUrl,
    },
  };

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqJsonLd),
        }}
      />
      <ErrorBoundary>
        <HomeClient
          featuredArticles={featuredArticles}
          heroCampaigns={heroCampaigns}
          newGroups={newGroups}
          stats={stats}
          ofCategories={ofCategories}
          newestBots={newestBots}
          newestAINsfw={displayNewestAINsfw}
          newestAINsfwStats={newestAINsfwStats}
          topGroupCategories={topGroupCategories}
          locale={locale}
        />
      </ErrorBoundary>
    </>
  );
}
