import { Metadata } from 'next';
import HomeClient from './HomeClient';
import connectDB from '@/lib/db/mongodb';
import ErrorBoundary from '@/components/ErrorBoundary';
import { getActiveCampaigns } from '@/lib/actions/campaigns';
import { Article, User, Group, Bot } from '@/lib/models';
import { getLocale, getPathname } from '@/lib/i18n/server';
import { getDictionary } from '@/lib/i18n';

export const revalidate = 300;

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://erogram.pro';

async function getFeaturedArticles(limit: number = 6) {
  try {
    await connectDB();
    // Use same Mongoose Article model as admin and articles listing
    const articlesRaw = await Article.find({})
      .select('title slug excerpt featuredImage tags publishedAt views author createdAt')
      .sort({ publishedAt: -1, createdAt: -1 })
      .limit(limit)
      .lean();

    const authorIds = new Set<string>();
    (articlesRaw as any[]).forEach((article: any) => {
      if (article.author) authorIds.add(article.author.toString());
    });

    const authorsMap = new Map<string, { _id: string; username: string }>();
    if (authorIds.size > 0) {
      const authors = await User.find({ _id: { $in: Array.from(authorIds) } })
        .select('username _id')
        .lean();
      (authors as any[]).forEach((a: any) => {
        authorsMap.set(a._id.toString(), { _id: a._id.toString(), username: a.username || 'erogram' });
      });
    }

    const articles = (articlesRaw as any[]).map((article: any) => ({
      _id: article._id.toString(),
      title: article.title || '',
      slug: article.slug || '',
      excerpt: article.excerpt || '',
      featuredImage: article.featuredImage || '',
      tags: article.tags || [],
      publishedAt: article.publishedAt || null,
      views: article.views || 0,
      author: article.author ? (authorsMap.get(article.author.toString()) || { _id: '', username: 'erogram' }) : { _id: '', username: 'erogram' },
    }));

    return articles;
  } catch (error) {
    console.error('Error fetching featured articles:', error);
    return [];
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const pathname = await getPathname();
  const dict = await getDictionary(locale);
  const m = dict.meta || {};

  const title = m.homeTitle || 'Erogram | Best NSFW & Porn Telegram Groups Directory (2026)';
  const description = m.homeDesc || 'The best NSFW & Porn Telegram groups directory. Browse thousands of verified adult Telegram communities and AI bots by category — amateur, anal, lesbian, MILF, onlyfans & more. Updated daily.';
  const imgUrl = process.env.NEXT_PUBLIC_PLACEHOLDER_IMAGE_URL || `${siteUrl}/assets/placeholder-no-image.png`;
  const canonicalBase = 'https://erogram.pro';
  const canonical = `${canonicalBase}${pathname === '/' ? '' : pathname}`;

  return {
    title,
    description,
    keywords: 'porn telegram, telegram porn, best porn telegram groups, nsfw telegram groups, adult telegram directory, porn telegram channels, nsfw telegram, telegram porn groups, amateur porn telegram, anal telegram',
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type: 'website',
      siteName: 'Erogram',
      url: canonical,
      images: [{ url: imgUrl, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imgUrl],
    },
  };
}

async function getNewGroups(limit: number = 8) {
  try {
    await connectDB();
    const groups = await Group.find({
      status: 'approved',
      isAdvertisement: { $ne: true },
      premiumOnly: { $ne: true },
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('name slug image category country description createdAt memberCount views')
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

async function getStats() {
  try {
    await connectDB();
    const [groupCount, botCount, userCount, groupViewsAgg, botViewsAgg] = await Promise.all([
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
    ]);
    return {
      groupCount: groupCount || 0,
      botCount: botCount || 0,
      totalMembers: userCount || 0,
      totalViews: (groupViewsAgg[0]?.total || 0) + (botViewsAgg[0]?.total || 0),
    };
  } catch (error) {
    console.error('Error fetching stats:', error);
    return { groupCount: 0, botCount: 0, totalMembers: 0, totalViews: 0 };
  }
}

export default async function Home() {
  const locale = await getLocale();
  const dict = await getDictionary(locale);
  const faq: { q: string; a: string }[] = dict.home?.faq || [];
  const metaDict = dict.meta || {};

  const [featuredArticles, heroCampaigns, newGroups, stats] = await Promise.all([
    getFeaturedArticles(6),
    getActiveCampaigns('homepage-hero'),
    getNewGroups(8),
    getStats(),
  ]);

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
    mainEntity: {
      '@type': 'FAQPage',
      mainEntity: faq.map((item) => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.a,
        },
      })),
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd),
        }}
      />
      <ErrorBoundary>
        <HomeClient
          featuredArticles={featuredArticles}
          heroCampaigns={heroCampaigns}
          newGroups={newGroups}
          stats={stats}
          locale={locale}
        />
      </ErrorBoundary>
    </>
  );
}
