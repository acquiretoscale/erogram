import { Metadata } from 'next';
import Link from 'next/link';
import { headers } from 'next/headers';
import connectDB from '@/lib/db/mongodb';
import { Bot, Advert } from '@/lib/models';
import BotsClient from './BotsClient';
import { detectDeviceFromUserAgent } from '@/lib/utils/device';
import ErrorBoundary from '@/components/ErrorBoundary';
import { getActiveCampaigns, getActiveFeedCampaigns } from '@/lib/actions/campaigns';

const baseUrl = 'https://erogram.pro';

// ISR for public listing page
export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Discover NSFW Telegram Bots - Browse Amazing Adult Bots | Erogram.pro',
  description: 'Browse and discover amazing NSFW Telegram bots. Find AI companions, chat bots, and adult entertainment bots by category, country, and interests. Use the best Telegram bots today.',
  keywords: 'NSFW telegram bots, adult telegram bots, telegram bot directory, NSFW AI bots, adult chat bots, erotic bots, telegram companions',
  alternates: {
    canonical: `${baseUrl}/bots`,
  },
  openGraph: {
    title: 'Discover NSFW Telegram Bots - Browse Amazing Adult Bots | Erogram.pro',
    description: 'Browse and discover amazing NSFW Telegram bots. Find AI companions, chat bots, and adult entertainment bots by category, country, and interests.',
    type: 'website',
    siteName: 'Erogram',
    url: `${baseUrl}/bots`,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Discover NSFW Telegram Bots - Browse Amazing Adult Bots | Erogram.pro',
    description: 'Browse and discover amazing NSFW Telegram bots. Find AI companions, chat bots, and adult entertainment bots by category, country, and interests.',
  },
};

async function getBots() {
  try {
    await connectDB();

    const bots = await Bot.find({ status: 'approved' })
      .select('-image') // Exclude image field to prevent loading huge base64 strings
      .populate('createdBy', 'username showNicknameUnderGroups')
      .sort({ pinned: -1, createdAt: -1 })
      .limit(12)
      .lean();

    return bots.map((bot: any) => ({
      _id: bot._id.toString(),
      name: bot.name,
      slug: bot.slug,
      category: bot.category,
      country: bot.country,
      description: bot.description,
      image: '/assets/image.jpg', // Always use placeholder since image field is excluded
      telegramLink: bot.telegramLink,
      isAdvertisement: bot.isAdvertisement || false,
      advertisementUrl: bot.advertisementUrl || null,
      pinned: bot.pinned || false,
      clickCount: bot.clickCount || 0,
      views: bot.views || 0,
      memberCount: bot.memberCount || 0,
      createdBy: bot.createdBy ? {
        username: bot.createdBy.username,
        showNicknameUnderGroups: bot.createdBy.showNicknameUnderGroups
      } : null,
    }));
  } catch (error) {
    console.error('Error fetching bots:', error);
    return [];
  }
}

async function getAdverts() {
  try {
    await connectDB();

    // Get only regular adverts (exclude popup adverts)
    const adverts = await Advert.find({
      status: 'active',
      isPopupAdvert: { $ne: true } // Exclude popup adverts
    })
      .lean();

    return adverts.map((advert: any) => ({
      _id: advert._id.toString(),
      name: advert.name,
      slug: advert.slug,
      category: advert.category,
      country: advert.country,
      url: advert.url,
      description: advert.description,
      image: advert.image || '/assets/image.jpg',
      status: advert.status,
      pinned: advert.pinned || false,
      clickCount: advert.clickCount || 0,
    }));
  } catch (error) {
    console.error('Error fetching adverts:', error);
    return [];
  }
}

export default async function BotsPage() {
  const ua = (await headers()).get('user-agent');
  const { isMobile, isTelegram } = detectDeviceFromUserAgent(ua);

  const [bots, adverts, topBannerCampaigns, feedCampaigns] = await Promise.all([
    getBots(),
    getAdverts(),
    getActiveCampaigns('top-banner'),
    getActiveFeedCampaigns('bots'),
  ]);

  const topBannerForPage =
    topBannerCampaigns.length > 0 && topBannerCampaigns[0].creative ? topBannerCampaigns : [];

  return (
    <>
      {/* Crawlable pagination links for bots/crawlers (kept visually hidden to avoid UI duplication) */}
      <nav aria-label="Bots pagination" className="sr-only">
        <Link href="/bots">Bots page 1</Link>
        <Link href="/bots/page/2">Bots page 2</Link>
        <Link href="/bots/page/3">Bots page 3</Link>
        <Link href="/bots/page/4">Bots page 4</Link>
        <Link href="/bots/page/5">Bots page 5</Link>
      </nav>

      <ErrorBoundary>
        <BotsClient
          initialBots={bots}
          initialAdverts={adverts}
          feedCampaigns={feedCampaigns}
          initialIsMobile={isMobile}
          initialIsTelegram={isTelegram}
          initialCountry="All"
          topBannerCampaigns={topBannerForPage}
        />
      </ErrorBoundary>
    </>
  );
}
