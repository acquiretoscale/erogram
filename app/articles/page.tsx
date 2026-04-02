import { Metadata } from 'next';
import { headers } from 'next/headers';
import ArticlesListing from './ArticlesListing';
import { getActiveCampaigns } from '@/lib/actions/campaigns';
import connectDB from '@/lib/db/mongodb';
import { Article, User } from '@/lib/models';
import Navbar from '@/components/Navbar';
import { detectDeviceFromUserAgent } from '@/lib/utils/device';

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
    images: [{ url: (process.env.NEXT_PUBLIC_PLACEHOLDER_IMAGE_URL || `${baseUrl}/assets/placeholder-no-image.png`), width: 1200, height: 630, alt: 'NSFW Telegram Articles and Guides - Erogram.pro' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NSFW Telegram Articles, Guides & Community Stories | Erogram.pro',
    description: 'Read expert guides, community stories, and insights about NSFW Telegram groups. Learn how to find safe adult communities.',
    images: [(process.env.NEXT_PUBLIC_PLACEHOLDER_IMAGE_URL || `${baseUrl}/assets/placeholder-no-image.png`)],
  },
};

export const revalidate = 60;

async function getArticles() {
  try {
    await connectDB();
    const articlesRaw = await Article.find({})
      .select('title slug excerpt featuredImage tags publishedAt views author status createdAt updatedAt')
      .sort({ publishedAt: -1, createdAt: -1 })
      .limit(100)
      .lean();

    const authorIds = new Set<string>();
    (articlesRaw as any[]).forEach((a: any) => {
      if (a.author) authorIds.add(a.author.toString());
    });
    const authorsMap = new Map<string, { _id: string; username: string }>();
    if (authorIds.size > 0) {
      const authors = await User.find({ _id: { $in: Array.from(authorIds) } })
        .select('username _id')
        .lean();
      (authors as any[]).forEach((a: any) =>
        authorsMap.set(a._id.toString(), { _id: a._id.toString(), username: a.username || 'erogram' })
      );
    }

    return (articlesRaw as any[]).map((a: any) => ({
      _id: a._id.toString(),
      title: a.title || '',
      slug: a.slug || '',
      excerpt: a.excerpt || '',
      featuredImage: a.featuredImage || '',
      status: a.status || 'published',
      tags: a.tags || [],
      publishedAt: a.publishedAt || null,
      views: a.views || 0,
      createdAt: a.createdAt,
      author: a.author
        ? authorsMap.get(a.author.toString()) || { _id: '', username: 'erogram' }
        : { _id: '', username: 'erogram' },
    }));
  } catch (error) {
    console.error('[articles] fetch failed:', error);
    return [];
  }
}

export default async function ArticlesPage() {
  const ua = (await headers()).get('user-agent');
  const { isMobile } = detectDeviceFromUserAgent(ua);

  const [initialArticles, topBannerCampaigns] = await Promise.all([
    getArticles(),
    getActiveCampaigns('top-banner', { page: 'articles', device: isMobile ? 'mobile' : 'desktop' }).catch(() => []),
  ]);

  const topBannerForPage =
    topBannerCampaigns.length > 0 && (topBannerCampaigns[0] as any).creative
      ? topBannerCampaigns
      : [];

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navbar />
      <main className="container mx-auto px-4 py-8 pt-24">
        <ArticlesListing
          initialArticles={initialArticles}
          topBannerCampaigns={topBannerForPage}
        />
      </main>
    </div>
  );
}
