import { Metadata } from 'next';
import Link from 'next/link';
import { headers } from 'next/headers';
import connectDB from '@/lib/db/mongodb';
import { Bot, Advert } from '@/lib/models';
import BotsClient from './BotsClient';
import { detectDeviceFromUserAgent } from '@/lib/utils/device';
import ErrorBoundary from '@/components/ErrorBoundary';
import { getActiveCampaigns, getActiveFeedCampaigns } from '@/lib/actions/campaigns';
import { getLocale, getPathname } from '@/lib/i18n/server';
import { getDictionary, LOCALES, localePath } from '@/lib/i18n';

const canonicalBase = 'https://erogram.pro';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const pathname = await getPathname();
  const dict = await getDictionary(locale);

  return {
    title: dict.meta.botsTitle,
    description: dict.meta.botsDesc,
    keywords: 'NSFW telegram bots, adult telegram bots, telegram bot directory, NSFW AI bots, adult chat bots, erotic bots, telegram companions',
    alternates: {
      canonical: `${canonicalBase}${pathname === '/' ? '' : pathname}`,
      languages: Object.fromEntries(
        LOCALES.map(l => [l, `${canonicalBase}${localePath('/bots', l)}`])
      ),
    },
    openGraph: {
      title: dict.meta.botsTitle,
      description: dict.meta.botsDesc,
      type: 'website',
      siteName: 'Erogram',
      url: `${canonicalBase}${pathname}`,
      images: [{ url: `${canonicalBase}/assets/og-default.png`, width: 512, height: 512, alt: 'Erogram - Telegram Bots' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: dict.meta.botsTitle,
      description: dict.meta.botsDesc,
      images: [`${canonicalBase}/assets/og-default.png`],
    },
  };
}

async function getBots() {
  try {
    await connectDB();
    const PLACEHOLDER = process.env.NEXT_PUBLIC_PLACEHOLDER_IMAGE_URL || '/assets/placeholder-no-image.png';

    const bots = await Bot.aggregate([
      { $match: { status: 'approved' } },
      { $sample: { size: 12 } },
      {
        $lookup: {
          from: 'users',
          localField: 'createdBy',
          foreignField: '_id',
          as: 'createdBy',
        },
      },
      { $addFields: { createdBy: { $arrayElemAt: ['$createdBy', 0] } } },
      {
        $project: {
          _id: 1, name: 1, slug: 1, category: 1, country: 1,
          description: 1, image: 1, telegramLink: 1, isAdvertisement: 1,
          advertisementUrl: 1, pinned: 1, clickCount: 1, views: 1,
          memberCount: 1,
          createdBy: { username: 1, showNicknameUnderGroups: 1 },
        },
      },
    ]);

    return bots.map((bot: any) => ({
      _id: bot._id.toString(),
      name: bot.name,
      slug: bot.slug,
      category: bot.category,
      country: bot.country,
      description: bot.description,
      image: (bot.image && typeof bot.image === 'string' && bot.image.startsWith('https://')) ? bot.image : PLACEHOLDER,
      telegramLink: bot.telegramLink,
      isAdvertisement: bot.isAdvertisement || false,
      advertisementUrl: bot.advertisementUrl || null,
      pinned: bot.pinned || false,
      clickCount: bot.clickCount || 0,
      views: bot.views || 0,
      memberCount: bot.memberCount || 0,
      createdBy: bot.createdBy ? {
        username: bot.createdBy.username,
        showNicknameUnderGroups: bot.createdBy.showNicknameUnderGroups,
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
      image: advert.image || (process.env.NEXT_PUBLIC_PLACEHOLDER_IMAGE_URL || '/assets/placeholder-no-image.png'),
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
    getActiveCampaigns('top-banner', { page: 'bots', device: isMobile ? 'mobile' : 'desktop' }),
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
