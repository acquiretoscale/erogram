import { Metadata } from 'next';
import ArticlesListing from './ArticlesListing';
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
    images: [{ url: `${baseUrl}/assets/image.jpg`, width: 1200, height: 630, alt: 'NSFW Telegram Articles and Guides - Erogram.pro' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NSFW Telegram Articles, Guides & Community Stories | Erogram.pro',
    description: 'Read expert guides, community stories, and insights about NSFW Telegram groups. Learn how to find safe adult communities.',
    images: [`${baseUrl}/assets/image.jpg`],
  },
};

export const dynamic = 'force-dynamic';

export default async function ArticlesPage() {
  let topBannerForPage: { _id: string; creative: string; destinationUrl: string; slot: string }[] = [];
  try {
    const topBannerCampaigns = await getActiveCampaigns('top-banner');
    topBannerForPage =
      topBannerCampaigns.length > 0 && (topBannerCampaigns[0] as any).creative ? topBannerCampaigns : [];
  } catch (_) {
    // Non-blocking: list works without banners
  }
  return <ArticlesListing topBannerCampaigns={topBannerForPage} />;
}
