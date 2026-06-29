import { Metadata } from 'next';
import SpotlightClient from './SpotlightClient';
import { getPublishedBlogArticles } from '@/lib/actions/blog';
import { getBlogFeaturedCreator } from '@/lib/actions/blogFeatured';
import { getTopAINsfwForBlog } from '@/lib/actions/ainsfw';
import { getTopBotsForBlog } from '@/lib/actions/botVotes';
import { getPlacementFeedCampaigns } from '@/lib/actions/campaigns';

export const revalidate = 60;

const BASE_URL = 'https://erogram.pro';

export const metadata: Metadata = {
  title: 'TRENDING ON EROGRAM — The OnlyFans, AI NSFW & Telegram Hub',
  description:
    'TRENDING ON EROGRAM: the Creator of the Month cover, must-read features, and the most-upvoted AI NSFW tools and Telegram bots — everything happening across Erogram.',
  alternates: { canonical: `${BASE_URL}/trending` },
  openGraph: {
    title: 'TRENDING ON EROGRAM',
    description:
      'The Creator of the Month cover, must-read features, and the most-upvoted AI NSFW tools and Telegram bots.',
    type: 'website',
    siteName: 'Erogram',
    url: `${BASE_URL}/trending`,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TRENDING ON EROGRAM',
    description: 'OnlyFans cover, must-read features, top AI NSFW tools and Telegram bots.',
  },
};

export default async function TrendingPage() {
  const [articles, featuredCreator, topAINsfw, topBots, homeBlock1Ads, homeBlock2Ads] = await Promise.all([
    getPublishedBlogArticles(12),
    getBlogFeaturedCreator(),
    getTopAINsfwForBlog(5),
    getTopBotsForBlog(5),
    getPlacementFeedCampaigns('home-block-1', 16).catch(() => []),
    getPlacementFeedCampaigns('home-block-2', 16).catch(() => []),
  ]);

  return (
    <SpotlightClient
      articles={articles}
      featuredCreator={featuredCreator}
      topAINsfw={topAINsfw}
      topBots={topBots}
      homeBlock1Ads={homeBlock1Ads}
      homeBlock2Ads={homeBlock2Ads}
    />
  );
}
