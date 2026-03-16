import { Metadata } from 'next';
import ArticlesListing from './ArticlesListing';
import { getActiveCampaigns } from '@/lib/actions/campaigns';
import { getArticlesForListing } from '@/lib/getArticlesForListing';
import Navbar from '@/components/Navbar';

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

// Cache the page for 60s so most requests are fast; list still refreshes every minute
export const revalidate = 60;

export default async function ArticlesPage() {
  let initialArticles: Awaited<ReturnType<typeof getArticlesForListing>> = [];
  try {
    initialArticles = await getArticlesForListing();
    if (process.env.NODE_ENV === 'development') {
      console.log('[articles] Loaded', initialArticles.length, 'articles from DB');
    }
  } catch (e) {
    console.error('[articles] getArticlesForListing failed', e);
  }

  let topBannerForPage: { _id: string; creative: string; destinationUrl: string; slot: string }[] = [];
  try {
    const topBannerCampaigns = await getActiveCampaigns('top-banner');
    topBannerForPage =
      topBannerCampaigns.length > 0 && (topBannerCampaigns[0] as any).creative ? topBannerCampaigns : [];
  } catch (_) { }

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
