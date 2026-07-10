import { Metadata } from 'next';
import Home1Client from './Home1Client';
import connectDB from '@/lib/db/mongodb';
import ErrorBoundary from '@/components/ErrorBoundary';
import { getActiveCampaigns } from '@/lib/actions/campaigns';
import { Article, User, Group, Bot, OnlyFansCreator } from '@/lib/models';
import { getLocale } from '@/lib/i18n/server';
import { OF_CATEGORIES } from '@/app/onlyfanssearch/constants';
import { AI_NSFW_TOOLS } from '@/app/ainsfw/data';
import { buildSocialMeta, CANONICAL_BASE } from '@/lib/seo/socialMeta';

export const revalidate = 300;

// Display bases so totals read closer to real-world scale, then grow dynamically.
const AI_BOTS_BASE = 400;
const OF_CREATORS_BASE = 1_813_055;

const home1Title = 'Erogram — Design Preview';
const home1Description = 'Internal design preview of the Erogram homepage.';

// Staging twin of the homepage — never index it (avoids duplicate-content with /).
export const metadata: Metadata = {
  title: home1Title,
  description: home1Description,
  robots: { index: false, follow: false },
  ...buildSocialMeta({
    title: home1Title,
    description: home1Description,
    url: `${CANONICAL_BASE}/home1`,
    type: 'website',
  }),
};

async function getFeaturedArticles(limit = 6) {
  try {
    await connectDB();
    const articlesRaw = await Article.find({})
      .select('title slug excerpt featuredImage tags publishedAt views author createdAt')
      .sort({ publishedAt: -1, createdAt: -1 })
      .limit(limit)
      .lean();

    const authorIds = new Set<string>();
    (articlesRaw as any[]).forEach((a: any) => { if (a.author) authorIds.add(a.author.toString()); });

    const authorsMap = new Map<string, { _id: string; username: string }>();
    if (authorIds.size > 0) {
      const authors = await User.find({ _id: { $in: Array.from(authorIds) } }).select('username _id').lean();
      (authors as any[]).forEach((a: any) => authorsMap.set(a._id.toString(), { _id: a._id.toString(), username: a.username || 'erogram' }));
    }

    return (articlesRaw as any[]).map((a: any) => ({
      _id: a._id.toString(),
      title: a.title || '',
      slug: a.slug || '',
      excerpt: a.excerpt || '',
      featuredImage: a.featuredImage || '',
      tags: a.tags || [],
      publishedAt: a.publishedAt || null,
      views: a.views || 0,
      author: a.author ? (authorsMap.get(a.author.toString()) || { _id: '', username: 'erogram' }) : { _id: '', username: 'erogram' },
    }));
  } catch {
    return [];
  }
}

async function getNewGroups(limit = 8) {
  try {
    await connectDB();
    const groups = await Group.find({ status: 'approved', isAdvertisement: { $ne: true }, premiumOnly: { $ne: true } })
      .sort({ updatedAt: -1 })
      .limit(limit)
      .select('name slug image category country description memberCount views')
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
  } catch {
    return [];
  }
}

async function getStats() {
  // AI NSFW tools are a static curated list.
  const aiNsfwCount = AI_NSFW_TOOLS.length;
  try {
    await connectDB();
    const [groupViewsAgg, botViewsAgg, botCount, ofCount] = await Promise.all([
      Group.aggregate([{ $match: { status: 'approved' } }, { $group: { _id: null, total: { $sum: '$views' } } }]),
      Bot.aggregate([{ $match: { status: 'approved' } }, { $group: { _id: null, total: { $sum: '$views' } } }]),
      Bot.countDocuments({ status: 'approved' }),
      OnlyFansCreator.countDocuments({ deleted: { $ne: true } }),
    ]);
    return {
      totalViews: (groupViewsAgg[0]?.total || 0) + (botViewsAgg[0]?.total || 0),
      aiAndBotsCount: AI_BOTS_BASE + aiNsfwCount + (botCount || 0),
      ofCreatorsCount: OF_CREATORS_BASE + (ofCount || 0),
    };
  } catch {
    return { totalViews: 0, aiAndBotsCount: AI_BOTS_BASE + aiNsfwCount, ofCreatorsCount: OF_CREATORS_BASE };
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
    return OF_CATEGORIES.slice(0, 12).map((c) => ({ slug: c.slug, name: c.name, emoji: c.emoji, avatar: avatarMap.get(c.slug) || '' }));
  } catch {
    return fallback;
  }
}

export default async function Home1Page() {
  const locale = await getLocale();

  const [featuredArticles, heroCampaigns, newGroups, stats, ofCategories] = await Promise.all([
    getFeaturedArticles(6),
    getActiveCampaigns('homepage-hero'),
    getNewGroups(8),
    getStats(),
    getOFCategoryPreviews(),
  ]);

  return (
    <ErrorBoundary>
      <Home1Client
        featuredArticles={featuredArticles}
        heroCampaigns={heroCampaigns}
        newGroups={newGroups}
        stats={stats}
        ofCategories={ofCategories}
        locale={locale}
      />
    </ErrorBoundary>
  );
}
