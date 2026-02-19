import { Metadata } from 'next';
import connectDB from '@/lib/db/mongodb';
import { Article, User } from '@/lib/models';
import ArticlesClient from './ArticlesClient';
import { getActiveCampaigns } from '@/lib/actions/campaigns';

const baseUrl = 'https://erogram.pro';

export const metadata: Metadata = {
  title: 'NSFW Telegram Articles, Guides & Community Stories | Erogram.pro',
  description: 'Read expert guides, community stories, and insights about NSFW Telegram groups. Learn how to find safe adult communities, discover trending groups, and connect with like-minded people. Updated daily with fresh content.',
  keywords: 'NSFW telegram articles, adult community guides, telegram group stories, NSFW telegram tips, adult chat guides, telegram community insights, erotic telegram stories',
  alternates: {
    canonical: `${baseUrl}/articles`,
  },
  openGraph: {
    title: 'NSFW Telegram Articles, Guides & Community Stories | Erogram.pro',
    description: 'Read expert guides, community stories, and insights about NSFW Telegram groups. Learn how to find safe adult communities, discover trending groups, and connect with like-minded people.',
    type: 'website',
    siteName: 'Erogram',
    url: `${baseUrl}/articles`,
    images: [
      {
        url: `${baseUrl}/assets/image.jpg`,
        width: 1200,
        height: 630,
        alt: 'NSFW Telegram Articles and Guides - Erogram.pro',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NSFW Telegram Articles, Guides & Community Stories | Erogram.pro',
    description: 'Read expert guides, community stories, and insights about NSFW Telegram groups. Learn how to find safe adult communities.',
    images: [`${baseUrl}/assets/image.jpg`],
  },
};

// Always render on request so articles come from DB (no build-time dependency)
export const dynamic = 'force-dynamic';

async function getArticles(): Promise<any[]> {
  try {
    await connectDB();
    const articlesRaw = await Article.find({})
      .select('-content')
      .sort({ publishedAt: -1, createdAt: -1 })
      .limit(500)
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

    return (articlesRaw as any[]).map((article: any) => ({
      _id: article._id.toString(),
      title: article.title || '',
      slug: article.slug || '',
      excerpt: article.excerpt || '',
      featuredImage: article.featuredImage || '',
      status: article.status || 'published',
      tags: article.tags || [],
      publishedAt: article.publishedAt || null,
      views: article.views || 0,
      createdAt: article.createdAt,
      updatedAt: article.updatedAt,
      author: article.author ? (authorsMap.get(article.author.toString()) || { _id: '', username: 'erogram' }) : { _id: '', username: 'erogram' },
    }));
  } catch (error) {
    console.error('[articles] getArticles:', error);
    return [];
  }
}

export default async function ArticlesPage() {
  const [articles, topBannerCampaigns] = await Promise.all([
    getArticles(),
    getActiveCampaigns('top-banner'),
  ]);

  const topBannerForPage =
    topBannerCampaigns.length > 0 && topBannerCampaigns[0].creative ? topBannerCampaigns : [];

  return <ArticlesClient initialArticles={articles} topBannerCampaigns={topBannerForPage} />;
}
