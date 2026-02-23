import { Metadata } from 'next';
import { headers } from 'next/headers';
import connectDB from '@/lib/db/mongodb';
import { Bot, Advert } from '@/lib/models';
import BotsClient from '../../BotsClient';
import { detectDeviceFromUserAgent } from '@/lib/utils/device';
import { getActiveCampaigns, getActiveFeedCampaigns } from '@/lib/actions/campaigns';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://erogram.pro';

// ISR: allow caching for crawl speed (randomized content may be cached within the window)
export const revalidate = 300;

// Country display names and SEO data
const countryData: Record<string, { name: string; seoTitle: string; seoDescription: string; keywords: string[] }> = {
  'USA': {
    name: 'United States',
    seoTitle: 'NSFW Telegram Bots in USA - American AI Chatbots',
    seoDescription: 'Discover NSFW Telegram bots in the United States. Find American AI chatbots, roleplay bots, and adult conversation bots in USA.',
    keywords: ['NSFW telegram bots USA', 'american AI chatbots', 'US telegram bots', 'american roleplay bots', 'USA adult bots']
  },
  'UK': {
    name: 'United Kingdom',
    seoTitle: 'NSFW Telegram Bots in UK - British AI Chatbots',
    seoDescription: 'Find NSFW Telegram bots in the United Kingdom. Connect with British AI chatbots, roleplay bots, and adult conversation bots in UK.',
    keywords: ['NSFW telegram bots UK', 'british AI chatbots', 'UK telegram bots', 'british roleplay bots', 'UK adult bots']
  },
  'Germany': {
    name: 'Germany',
    seoTitle: 'NSFW Telegram Bots in Germany - German AI Chatbots',
    seoDescription: 'Explore NSFW Telegram bots in Germany. Join German AI chatbots, roleplay bots, and adult conversation bots in Deutschland.',
    keywords: ['NSFW telegram bots Germany', 'german AI chatbots', 'deutsch telegram bots', 'german roleplay bots', 'germany adult bots']
  },
  'France': {
    name: 'France',
    seoTitle: 'NSFW Telegram Bots in France - French AI Chatbots',
    seoDescription: 'Discover NSFW Telegram bots in France. Connect with French AI chatbots, roleplay bots, and adult conversation bots in France.',
    keywords: ['NSFW telegram bots France', 'french AI chatbots', 'france telegram bots', 'french roleplay bots', 'france adult bots']
  },
  'Brazil': {
    name: 'Brazil',
    seoTitle: 'NSFW Telegram Bots in Brazil - Brazilian AI Chatbots',
    seoDescription: 'Find NSFW Telegram bots in Brazil. Join Brazilian AI chatbots, roleplay bots, and adult conversation bots in Brasil.',
    keywords: ['NSFW telegram bots Brazil', 'brazilian AI chatbots', 'brazil telegram bots', 'brazilian roleplay bots', 'brazil adult bots']
  },
  'India': {
    name: 'India',
    seoTitle: 'NSFW Telegram Bots in India - Indian AI Chatbots',
    seoDescription: 'Explore NSFW Telegram bots in India. Connect with Indian AI chatbots, roleplay bots, and adult conversation bots in India.',
    keywords: ['NSFW telegram bots India', 'indian AI chatbots', 'india telegram bots', 'indian roleplay bots', 'india adult bots']
  },
  'Russia': {
    name: 'Russia',
    seoTitle: 'NSFW Telegram Bots in Russia - Russian AI Chatbots',
    seoDescription: 'Discover NSFW Telegram bots in Russia. Join Russian AI chatbots, roleplay bots, and adult conversation bots in Russia.',
    keywords: ['NSFW telegram bots Russia', 'russian AI chatbots', 'russia telegram bots', 'russian roleplay bots', 'russia adult bots']
  },
  'Japan': {
    name: 'Japan',
    seoTitle: 'NSFW Telegram Bots in Japan - Japanese AI Chatbots',
    seoDescription: 'Find NSFW Telegram bots in Japan. Connect with Japanese AI chatbots, roleplay bots, and adult conversation bots in Japan.',
    keywords: ['NSFW telegram bots Japan', 'japanese AI chatbots', 'japan telegram bots', 'japanese roleplay bots', 'japan adult bots']
  },
  'South Korea': {
    name: 'South Korea',
    seoTitle: 'NSFW Telegram Bots in South Korea - Korean AI Chatbots',
    seoDescription: 'Explore NSFW Telegram bots in South Korea. Join Korean AI chatbots, roleplay bots, and adult conversation bots in South Korea.',
    keywords: ['NSFW telegram bots South Korea', 'korean AI chatbots', 'korea telegram bots', 'korean roleplay bots', 'south korea adult bots']
  },
  'Philippines': {
    name: 'Philippines',
    seoTitle: 'NSFW Telegram Bots in Philippines - Filipino AI Chatbots',
    seoDescription: 'Discover NSFW Telegram bots in the Philippines. Connect with Filipino AI chatbots, roleplay bots, and adult conversation bots.',
    keywords: ['NSFW telegram bots Philippines', 'filipino AI chatbots', 'philippines telegram bots', 'filipino roleplay bots', 'philippines adult bots']
  },
  'Thailand': {
    name: 'Thailand',
    seoTitle: 'NSFW Telegram Bots in Thailand - Thai AI Chatbots',
    seoDescription: 'Find NSFW Telegram bots in Thailand. Join Thai AI chatbots, roleplay bots, and adult conversation bots in Thailand.',
    keywords: ['NSFW telegram bots Thailand', 'thai AI chatbots', 'thailand telegram bots', 'thai roleplay bots', 'thailand adult bots']
  },
  'Spain': {
    name: 'Spain',
    seoTitle: 'NSFW Telegram Bots in Spain - Spanish AI Chatbots',
    seoDescription: 'Explore NSFW Telegram bots in Spain. Connect with Spanish AI chatbots, roleplay bots, and adult conversation bots in España.',
    keywords: ['NSFW telegram bots Spain', 'spanish AI chatbots', 'spain telegram bots', 'spanish roleplay bots', 'spain adult bots']
  },
  'Mexico': {
    name: 'Mexico',
    seoTitle: 'NSFW Telegram Bots in Mexico - Mexican AI Chatbots',
    seoDescription: 'Discover NSFW Telegram bots in Mexico. Join Mexican AI chatbots, roleplay bots, and adult conversation bots in México.',
    keywords: ['NSFW telegram bots Mexico', 'mexican AI chatbots', 'mexico telegram bots', 'mexican roleplay bots', 'mexico adult bots']
  },
  'Canada': {
    name: 'Canada',
    seoTitle: 'NSFW Telegram Bots in Canada - Canadian AI Chatbots',
    seoDescription: 'Find NSFW Telegram bots in Canada. Connect with Canadian AI chatbots, roleplay bots, and adult conversation bots.',
    keywords: ['NSFW telegram bots Canada', 'canadian AI chatbots', 'canada telegram bots', 'canadian roleplay bots', 'canada adult bots']
  },
  'Australia': {
    name: 'Australia',
    seoTitle: 'NSFW Telegram Bots in Australia - Australian AI Chatbots',
    seoDescription: 'Explore NSFW Telegram bots in Australia. Join Australian AI chatbots, roleplay bots, and adult conversation bots.',
    keywords: ['NSFW telegram bots Australia', 'australian AI chatbots', 'australia telegram bots', 'australian roleplay bots', 'australia adult bots']
  },
  'Italy': {
    name: 'Italy',
    seoTitle: 'NSFW Telegram Bots in Italy - Italian AI Chatbots',
    seoDescription: 'Discover NSFW Telegram bots in Italy. Connect with Italian AI chatbots, roleplay bots, and adult conversation bots in Italia.',
    keywords: ['NSFW telegram bots Italy', 'italian AI chatbots', 'italy telegram bots', 'italian roleplay bots', 'italy adult bots']
  },
  'Netherlands': {
    name: 'Netherlands',
    seoTitle: 'NSFW Telegram Bots in Netherlands - Dutch AI Chatbots',
    seoDescription: 'Find NSFW Telegram bots in the Netherlands. Join Dutch AI chatbots, roleplay bots, and adult conversation bots.',
    keywords: ['NSFW telegram bots Netherlands', 'dutch AI chatbots', 'netherlands telegram bots', 'dutch roleplay bots', 'netherlands adult bots']
  },
  'Czech Republic': {
    name: 'Czech Republic',
    seoTitle: 'NSFW Telegram Bots in Czech Republic - Czech AI Chatbots',
    seoDescription: 'Explore NSFW Telegram bots in the Czech Republic. Connect with Czech AI chatbots, roleplay bots, and adult conversation bots.',
    keywords: ['NSFW telegram bots Czech Republic', 'czech AI chatbots', 'czech republic telegram bots', 'czech roleplay bots', 'czech republic adult bots']
  },
};

interface PageProps {
  params: Promise<{ country: string }>;
}

function normalizeCountryParam(raw: string): string {
  // Route params arrive URL-decoded by Next, but we still normalize whitespace.
  return String(raw || '').trim();
}

function countryUrl(country: string): string {
  // Ensure spaces and other special chars are encoded in canonical URLs.
  return `${baseUrl}/bots/country/${encodeURIComponent(country)}`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { country: rawCountry } = await params;
  const country = normalizeCountryParam(rawCountry);

  // Special case: "/bots/country/All" is a real page for UX/shareability,
  // but canonical should be /bots to avoid duplicate-content indexing.
  if (country === 'All') {
    return {
      title: 'Discover NSFW Telegram Bots - Browse AI Chatbots & Roleplay Bots',
      description: 'Browse and discover NSFW Telegram bots. Find AI chatbots, roleplay bots, and adult conversation bots by category and country.',
      keywords: 'NSFW telegram bots, AI chatbots, adult telegram bots, roleplay bots, NSFW AI bots',
      alternates: {
        canonical: `${baseUrl}/bots`,
      },
      openGraph: {
        title: 'Discover NSFW Telegram Bots - Browse AI Chatbots & Roleplay Bots',
        description: 'Browse and discover NSFW Telegram bots. Find AI chatbots, roleplay bots, and adult conversation bots.',
        type: 'website',
        siteName: 'Erogram',
        url: `${baseUrl}/bots`,
        images: [
          {
            url: (process.env.NEXT_PUBLIC_PLACEHOLDER_IMAGE_URL || `${baseUrl}/assets/placeholder-no-image.png`),
            width: 1200,
            height: 630,
            alt: 'Erogram Bots',
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title: 'Discover NSFW Telegram Bots - Browse AI Chatbots & Roleplay Bots',
        description: 'Browse and discover NSFW Telegram bots. Find AI chatbots, roleplay bots, and adult conversation bots.',
        images: [(process.env.NEXT_PUBLIC_PLACEHOLDER_IMAGE_URL || `${baseUrl}/assets/placeholder-no-image.png`)],
      },
    };
  }

  const countryInfo = countryData[country];

  if (!countryInfo) {
    return {
      // Root layout already appends "| Erogram" via `metadata.title.template`.
      title: `NSFW Telegram Bots in ${country}`,
      description: `Discover NSFW Telegram bots in ${country}. Find AI chatbots and roleplay bots for adult conversations.`,
      alternates: {
        canonical: countryUrl(country),
      },
    };
  }

  const url = countryUrl(country);

  return {
    title: countryInfo.seoTitle,
    description: countryInfo.seoDescription,
    keywords: countryInfo.keywords.join(', '),
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: countryInfo.seoTitle,
      description: countryInfo.seoDescription,
      type: 'website',
      siteName: 'Erogram',
      url,
      images: [
        {
          url: (process.env.NEXT_PUBLIC_PLACEHOLDER_IMAGE_URL || `${baseUrl}/assets/placeholder-no-image.png`),
          width: 1200,
          height: 630,
          alt: `${countryInfo.seoTitle}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: countryInfo.seoTitle,
      description: countryInfo.seoDescription,
      images: [(process.env.NEXT_PUBLIC_PLACEHOLDER_IMAGE_URL || `${baseUrl}/assets/placeholder-no-image.png`)],
    },
  };
}

async function getBotsByCountry(country: string) {
  try {
    await connectDB();

    const normalizedCountry = normalizeCountryParam(country);
    const match: Record<string, any> = { status: 'approved' };

    // Special case: "All" means no country filter.
    if (normalizedCountry && normalizedCountry !== 'All') {
      match.country = normalizedCountry;
    }

    // Use random sampling for better discovery experience
    const bots = await Bot.aggregate([
      { $match: match },
      { $sample: { size: 12 } }, // Randomly sample 12 bots
      {
        $lookup: {
          from: 'users',
          localField: 'createdBy',
          foreignField: '_id',
          as: 'createdBy'
        }
      },
      {
        $addFields: {
          createdBy: { $arrayElemAt: ['$createdBy', 0] }
        }
      },
      {
        $project: {
          // Include only the fields we need (inclusion projection)
          _id: 1,
          name: 1,
          slug: 1,
          category: 1,
          country: 1,
          description: 1,
          telegramLink: 1,
          isAdvertisement: 1,
          advertisementUrl: 1,
          pinned: 1,
          clickCount: 1,
          createdBy: {
            username: 1,
            showNicknameUnderGroups: 1
          }
        }
      }
    ]);

    // Sanitize and limit all fields to prevent maxSize errors
    return bots.map((bot: any) => ({
      _id: bot._id.toString(),
      name: (bot.name || '').slice(0, 150),
      slug: (bot.slug || '').slice(0, 100),
      category: (bot.category || '').slice(0, 50),
      country: (bot.country || '').slice(0, 50),
      description: (bot.description || '').slice(0, 150) || '',
      image: process.env.NEXT_PUBLIC_PLACEHOLDER_IMAGE_URL || '/assets/placeholder-no-image.png',
      telegramLink: (bot.telegramLink || '').slice(0, 150),
      isAdvertisement: bot.isAdvertisement || false,
      advertisementUrl: bot.advertisementUrl ? (bot.advertisementUrl || '').slice(0, 150) : null,
      pinned: bot.pinned || false,
      clickCount: bot.clickCount || 0,
      createdBy: bot.createdBy ? {
        username: bot.createdBy.username,
        showNicknameUnderGroups: bot.createdBy.showNicknameUnderGroups
      } : null,
    }));
  } catch (error) {
    console.error('Error fetching bots by country:', error);
    return [];
  }
}

async function getAdverts() {
  try {
    await connectDB();

    const adverts = await Advert.find({
      status: 'active',
      isPopupAdvert: { $ne: true }
    })
      .select('_id name slug category country url description status pinned')
      .limit(50)
      .lean();

    const mappedAdverts = adverts.map((advert: any) => ({
      _id: advert._id.toString(),
      name: (advert.name || '').slice(0, 100),
      slug: (advert.slug || '').slice(0, 100),
      category: (advert.category || '').slice(0, 50),
      country: (advert.country || '').slice(0, 50),
      url: (advert.url || '').slice(0, 300),
      description: (advert.description || '').slice(0, 150) || '',
      image: process.env.NEXT_PUBLIC_PLACEHOLDER_IMAGE_URL || '/assets/placeholder-no-image.png',
      status: advert.status || 'active',
      pinned: advert.pinned || false,
      clickCount: 0,
    }));

    const pinnedAdverts = mappedAdverts.filter((a: any) => a.pinned);
    const regularAdverts = mappedAdverts.filter((a: any) => !a.pinned);

    const shuffledRegular = [...regularAdverts];
    for (let i = shuffledRegular.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledRegular[i], shuffledRegular[j]] = [shuffledRegular[j], shuffledRegular[i]];
    }

    return [...pinnedAdverts, ...shuffledRegular];
  } catch (error) {
    console.error('Error fetching adverts:', error);
    return [];
  }
}

export default async function CountryBotsPage({ params }: PageProps) {
  const ua = (await headers()).get('user-agent');
  const { isMobile, isTelegram } = detectDeviceFromUserAgent(ua);

  const { country: rawCountry } = await params;
  const country = normalizeCountryParam(rawCountry);

  const [bots, adverts, topBannerCampaigns, feedCampaigns] = await Promise.all([
    getBotsByCountry(country),
    getAdverts(),
    getActiveCampaigns('top-banner'),
    getActiveFeedCampaigns('bots'),
  ]);

  const topBannerForPage =
    topBannerCampaigns.length > 0 && topBannerCampaigns[0].creative ? topBannerCampaigns : [];

  return (
    <BotsClient
      initialBots={bots}
      initialAdverts={adverts}
      feedCampaigns={feedCampaigns}
      initialIsMobile={isMobile}
      initialIsTelegram={isTelegram}
      initialCountry={country}
      topBannerCampaigns={topBannerForPage}
    />
  );
}