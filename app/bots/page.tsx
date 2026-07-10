import { Metadata } from 'next';
import Link from 'next/link';
import { headers } from 'next/headers';
import connectDB from '@/lib/db/mongodb';
import { Bot, Advert } from '@/lib/models';
import BotsClient from './BotsClient';
import { detectDeviceFromUserAgent } from '@/lib/utils/device';
import ErrorBoundary from '@/components/ErrorBoundary';
import { getActiveCampaigns, getActiveFeedCampaigns, getTrendingErogramCampaigns } from '@/lib/actions/campaigns';
import { getAllBotStats } from '@/lib/actions/botVotes';
import { getLocale, getPathname } from '@/lib/i18n/server';
import { getDictionary, LOCALES, localePath } from '@/lib/i18n';
import { BOTS_FEED_PAGE_SIZE } from './constants';
import { buildSocialMeta, CANONICAL_BASE } from '@/lib/seo/socialMeta';

const canonicalBase = CANONICAL_BASE;
const PLACEHOLDER = process.env.NEXT_PUBLIC_PLACEHOLDER_IMAGE_URL || '/assets/placeholder-no-image.png';

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const pathname = await getPathname();
  const dict = await getDictionary(locale);

  const canonical = `${canonicalBase}${pathname === '/' ? '' : pathname}`;

  return {
    title: dict.meta.botsTitle,
    description: dict.meta.botsDesc,
    keywords: 'NSFW telegram bots, adult telegram bots, telegram bot directory, NSFW AI bots, adult chat bots, erotic bots, telegram companions',
    alternates: {
      canonical,
    },
    ...buildSocialMeta({
      title: dict.meta.botsTitle,
      description: dict.meta.botsDesc,
      url: `${canonicalBase}${pathname}`,
      type: 'website',
      imageAlt: 'Erogram - Telegram Bots',
    }),
  };
}

function mapBotDoc(bot: any) {
  return {
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
  };
}

async function getApprovedBotsCount() {
  await connectDB();
  return Bot.countDocuments({ status: 'approved', pinned: { $ne: true } });
}

/** Stable upvote-ranked feed (pinned bots excluded — shown in their own row). */
async function getBots(limit: number, skip: number = 0) {
  try {
    await connectDB();

    const bots = await Bot.aggregate([
      { $match: { status: 'approved', pinned: { $ne: true } } },
      {
        $lookup: {
          from: 'botstats',
          localField: 'slug',
          foreignField: 'slug',
          as: 'stats',
        },
      },
      {
        $addFields: {
          voteScore: {
            $subtract: [
              { $ifNull: [{ $arrayElemAt: ['$stats.upvotes', 0] }, 0] },
              { $ifNull: [{ $arrayElemAt: ['$stats.downvotes', 0] }, 0] },
            ],
          },
        },
      },
      { $sort: { voteScore: -1, createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
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

    return bots.map(mapBotDoc);
  } catch (error) {
    console.error('Error fetching bots:', error);
    return [];
  }
}

async function getAdverts() {
  try {
    await connectDB();

    const adverts = await Advert.find({
      status: 'active',
      isPopupAdvert: { $ne: true },
    }).lean();

    return adverts.map((advert: any) => ({
      _id: advert._id.toString(),
      name: advert.name,
      slug: advert.slug,
      category: advert.category,
      country: advert.country,
      url: advert.url,
      description: advert.description,
      image: advert.image || PLACEHOLDER,
      status: advert.status,
      pinned: advert.pinned || false,
      clickCount: advert.clickCount || 0,
    }));
  } catch (error) {
    console.error('Error fetching adverts:', error);
    return [];
  }
}

export async function BotsPageView({ page = 1 }: { page?: number }) {
  const currentPage = Math.max(1, page);
  const skip = (currentPage - 1) * BOTS_FEED_PAGE_SIZE;

  const ua = (await headers()).get('user-agent');
  const { isMobile, isTelegram } = detectDeviceFromUserAgent(ua);

  const [bots, totalBots, adverts, topBannerCampaigns, feedCampaigns, trendingErogramCampaigns] = await Promise.all([
    getBots(BOTS_FEED_PAGE_SIZE, skip),
    getApprovedBotsCount(),
    getAdverts(),
    getActiveCampaigns('top-banner', { page: 'bots', device: isMobile ? 'mobile' : 'desktop' }),
    getActiveFeedCampaigns('bots'),
    getTrendingErogramCampaigns(8).catch(() => []),
  ]);

  const paginationTotalPages = Math.max(1, Math.ceil(totalBots / BOTS_FEED_PAGE_SIZE));
  const allBotStats = await getAllBotStats(bots.map(b => b.slug));

  const topBannerForPage =
    topBannerCampaigns.length > 0 && topBannerCampaigns[0].creative ? topBannerCampaigns : [];

  return (
    <>
      <nav aria-label="Bots pagination" className="sr-only">
        <Link href="/bots">Bots page 1</Link>
        {Array.from({ length: paginationTotalPages - 1 }, (_, i) => i + 2).map((p) => (
          <Link key={p} href={`/bots/page/${p}`}>{`Bots page ${p}`}</Link>
        ))}
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
          allBotStats={allBotStats}
          trendingErogramCampaigns={trendingErogramCampaigns}
          paginationCurrentPage={currentPage}
          paginationTotalPages={paginationTotalPages}
          botsPageSize={BOTS_FEED_PAGE_SIZE}
        />
      </ErrorBoundary>
    </>
  );
}

export default async function BotsPage() {
  return BotsPageView({ page: 1 });
}
