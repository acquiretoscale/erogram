import { Metadata } from 'next';
import { headers } from 'next/headers';
import connectDB from '@/lib/db/mongodb';
import { Group } from '@/lib/models';
import GroupsClient from '../../GroupsClient';
import { detectDeviceFromUserAgent } from '@/lib/utils/device';
import { getActiveCampaigns, getActiveFeedCampaigns } from '@/lib/actions/campaigns';
import { getFilterButton } from '@/lib/actions/siteConfig';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://erogram.pro';

// ISR: allow caching for crawl speed (randomized content may be cached within the window)
export const revalidate = 300;

// Country display names and SEO data
const countryData: Record<string, { name: string; seoTitle: string; seoDescription: string; keywords: string[] }> = {
  'USA': {
    name: 'United States',
    seoTitle: 'NSFW Telegram Groups in USA - American Adult Communities',
    seoDescription: 'Discover NSFW Telegram groups in the United States. Join American adult communities, dating groups, and chat rooms for like-minded people in USA.',
    keywords: ['NSFW telegram groups USA', 'american adult communities', 'US telegram groups', 'american dating groups', 'USA adult chat']
  },
  'UK': {
    name: 'United Kingdom',
    seoTitle: 'NSFW Telegram Groups in UK - British Adult Communities',
    seoDescription: 'Find NSFW Telegram groups in the United Kingdom. Connect with British adult communities, dating groups, and chat rooms in UK.',
    keywords: ['NSFW telegram groups UK', 'british adult communities', 'UK telegram groups', 'british dating groups', 'UK adult chat']
  },
  'Germany': {
    name: 'Germany',
    seoTitle: 'NSFW Telegram Groups in Germany - German Adult Communities',
    seoDescription: 'Explore NSFW Telegram groups in Germany. Join German adult communities, dating groups, and chat rooms in Deutschland.',
    keywords: ['NSFW telegram groups Germany', 'german adult communities', 'deutsch telegram groups', 'german dating groups', 'germany adult chat']
  },
  'France': {
    name: 'France',
    seoTitle: 'NSFW Telegram Groups in France - French Adult Communities',
    seoDescription: 'Discover NSFW Telegram groups in France. Connect with French adult communities, dating groups, and chat rooms in France.',
    keywords: ['NSFW telegram groups France', 'french adult communities', 'france telegram groups', 'french dating groups', 'france adult chat']
  },
  'Brazil': {
    name: 'Brazil',
    seoTitle: 'NSFW Telegram Groups in Brazil - Brazilian Adult Communities',
    seoDescription: 'Find NSFW Telegram groups in Brazil. Join Brazilian adult communities, dating groups, and chat rooms in Brasil.',
    keywords: ['NSFW telegram groups Brazil', 'brazilian adult communities', 'brazil telegram groups', 'brazilian dating groups', 'brazil adult chat']
  },
  'India': {
    name: 'India',
    seoTitle: 'NSFW Telegram Groups in India - Indian Adult Communities',
    seoDescription: 'Explore NSFW Telegram groups in India. Connect with Indian adult communities, dating groups, and chat rooms in India.',
    keywords: ['NSFW telegram groups India', 'indian adult communities', 'india telegram groups', 'indian dating groups', 'india adult chat']
  },
  'Russia': {
    name: 'Russia',
    seoTitle: 'NSFW Telegram Groups in Russia - Russian Adult Communities',
    seoDescription: 'Discover NSFW Telegram groups in Russia. Join Russian adult communities, dating groups, and chat rooms in Russia.',
    keywords: ['NSFW telegram groups Russia', 'russian adult communities', 'russia telegram groups', 'russian dating groups', 'russia adult chat']
  },
  'Japan': {
    name: 'Japan',
    seoTitle: 'NSFW Telegram Groups in Japan - Japanese Adult Communities',
    seoDescription: 'Find NSFW Telegram groups in Japan. Connect with Japanese adult communities, dating groups, and chat rooms in Japan.',
    keywords: ['NSFW telegram groups Japan', 'japanese adult communities', 'japan telegram groups', 'japanese dating groups', 'japan adult chat']
  },
  'South Korea': {
    name: 'South Korea',
    seoTitle: 'NSFW Telegram Groups in South Korea - Korean Adult Communities',
    seoDescription: 'Explore NSFW Telegram groups in South Korea. Join Korean adult communities, dating groups, and chat rooms in South Korea.',
    keywords: ['NSFW telegram groups South Korea', 'korean adult communities', 'korea telegram groups', 'korean dating groups', 'south korea adult chat']
  },
  'Philippines': {
    name: 'Philippines',
    seoTitle: 'NSFW Telegram Groups in Philippines - Filipino Adult Communities',
    seoDescription: 'Discover NSFW Telegram groups in the Philippines. Connect with Filipino adult communities, dating groups, and chat rooms.',
    keywords: ['NSFW telegram groups Philippines', 'filipino adult communities', 'philippines telegram groups', 'filipino dating groups', 'philippines adult chat']
  },
  'Thailand': {
    name: 'Thailand',
    seoTitle: 'NSFW Telegram Groups in Thailand - Thai Adult Communities',
    seoDescription: 'Find NSFW Telegram groups in Thailand. Join Thai adult communities, dating groups, and chat rooms in Thailand.',
    keywords: ['NSFW telegram groups Thailand', 'thai adult communities', 'thailand telegram groups', 'thai dating groups', 'thailand adult chat']
  },
  'Spain': {
    name: 'Spain',
    seoTitle: 'NSFW Telegram Groups in Spain - Spanish Adult Communities',
    seoDescription: 'Explore NSFW Telegram groups in Spain. Connect with Spanish adult communities, dating groups, and chat rooms in España.',
    keywords: ['NSFW telegram groups Spain', 'spanish adult communities', 'spain telegram groups', 'spanish dating groups', 'spain adult chat']
  },
  'Mexico': {
    name: 'Mexico',
    seoTitle: 'NSFW Telegram Groups in Mexico - Mexican Adult Communities',
    seoDescription: 'Discover NSFW Telegram groups in Mexico. Join Mexican adult communities, dating groups, and chat rooms in México.',
    keywords: ['NSFW telegram groups Mexico', 'mexican adult communities', 'mexico telegram groups', 'mexican dating groups', 'mexico adult chat']
  },
  'Canada': {
    name: 'Canada',
    seoTitle: 'NSFW Telegram Groups in Canada - Canadian Adult Communities',
    seoDescription: 'Find NSFW Telegram groups in Canada. Connect with Canadian adult communities, dating groups, and chat rooms.',
    keywords: ['NSFW telegram groups Canada', 'canadian adult communities', 'canada telegram groups', 'canadian dating groups', 'canada adult chat']
  },
  'Australia': {
    name: 'Australia',
    seoTitle: 'NSFW Telegram Groups in Australia - Australian Adult Communities',
    seoDescription: 'Explore NSFW Telegram groups in Australia. Join Australian adult communities, dating groups, and chat rooms.',
    keywords: ['NSFW telegram groups Australia', 'australian adult communities', 'australia telegram groups', 'australian dating groups', 'australia adult chat']
  },
  'Italy': {
    name: 'Italy',
    seoTitle: 'NSFW Telegram Groups in Italy - Italian Adult Communities',
    seoDescription: 'Discover NSFW Telegram groups in Italy. Connect with Italian adult communities, dating groups, and chat rooms in Italia.',
    keywords: ['NSFW telegram groups Italy', 'italian adult communities', 'italy telegram groups', 'italian dating groups', 'italy adult chat']
  },
  'Netherlands': {
    name: 'Netherlands',
    seoTitle: 'NSFW Telegram Groups in Netherlands - Dutch Adult Communities',
    seoDescription: 'Find NSFW Telegram groups in the Netherlands. Join Dutch adult communities, dating groups, and chat rooms.',
    keywords: ['NSFW telegram groups Netherlands', 'dutch adult communities', 'netherlands telegram groups', 'dutch dating groups', 'netherlands adult chat']
  },
  'Czech Republic': {
    name: 'Czech Republic',
    seoTitle: 'NSFW Telegram Groups in Czech Republic - Czech Adult Communities',
    seoDescription: 'Explore NSFW Telegram groups in the Czech Republic. Connect with Czech adult communities, dating groups, and chat rooms.',
    keywords: ['NSFW telegram groups Czech Republic', 'czech adult communities', 'czech republic telegram groups', 'czech dating groups', 'czech republic adult chat']
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
  return `${baseUrl}/groups/country/${encodeURIComponent(country)}`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { country: rawCountry } = await params;
  const country = normalizeCountryParam(rawCountry);

  // Special case: "/groups/country/All" is a real page for UX/shareability,
  // but canonical should be /groups to avoid duplicate-content indexing.
  if (country === 'All') {
    return {
      title: 'Discover NSFW Telegram Groups - Browse Thousands of Communities',
      description: 'Browse and discover thousands of NSFW Telegram groups. Find communities by category, country, and interests. Join the best adult Telegram groups today.',
      keywords: 'NSFW telegram groups, adult telegram groups, telegram communities, adult chat groups, NSFW communities',
      alternates: {
        canonical: `${baseUrl}/groups`,
      },
      openGraph: {
        title: 'Discover NSFW Telegram Groups - Browse Thousands of Communities',
        description: 'Browse and discover thousands of NSFW Telegram groups. Find communities by category, country, and interests.',
        type: 'website',
        siteName: 'Erogram',
        url: `${baseUrl}/groups`,
        images: [
          {
            url: `${baseUrl}/assets/image.jpg`,
            width: 1200,
            height: 630,
            alt: 'Erogram Groups',
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title: 'Discover NSFW Telegram Groups - Browse Thousands of Communities',
        description: 'Browse and discover thousands of NSFW Telegram groups. Find communities by category, country, and interests.',
        images: [`${baseUrl}/assets/image.jpg`],
      },
    };
  }

  const countryInfo = countryData[country];

  if (!countryInfo) {
    return {
      // Root layout already appends "| Erogram" via `metadata.title.template`.
      title: `NSFW Telegram Groups in ${country}`,
      description: `Discover NSFW Telegram groups in ${country}. Join adult communities and connect with like-minded people.`,
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
          url: `${baseUrl}/assets/image.jpg`,
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
      images: [`${baseUrl}/assets/image.jpg`],
    },
  };
}

async function getGroupsByCountry(country: string) {
  try {
    await connectDB();

    const normalizedCountry = normalizeCountryParam(country);
    const match: Record<string, any> = { status: 'approved' };

    // Special case: "All" means no country filter.
    if (normalizedCountry && normalizedCountry !== 'All') {
      match.country = normalizedCountry;
    }

    // Use random sampling for better discovery experience
    const groups = await Group.aggregate([
      { $match: match },
      { $sample: { size: 12 } }, // Randomly sample 12 groups
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
    return groups.map((group: any) => ({
      _id: group._id.toString(),
      name: (group.name || '').slice(0, 150),
      slug: (group.slug || '').slice(0, 100),
      category: (group.category || '').slice(0, 50),
      country: (group.country || '').slice(0, 50),
      description: (group.description || '').slice(0, 150) || '',
      image: '/assets/image.jpg',
      telegramLink: (group.telegramLink || '').slice(0, 150),
      isAdvertisement: group.isAdvertisement || false,
      advertisementUrl: group.advertisementUrl ? (group.advertisementUrl || '').slice(0, 150) : null,
      pinned: group.pinned || false,
      clickCount: group.clickCount || 0,
      createdBy: group.createdBy ? {
        username: group.createdBy.username,
        showNicknameUnderGroups: group.createdBy.showNicknameUnderGroups
      } : null,
    }));
  } catch (error) {
    console.error('Error fetching groups by country:', error);
    return [];
  }
}

export default async function CountryGroupsPage({ params }: PageProps) {
  const ua = (await headers()).get('user-agent');
  const { isMobile, isTelegram } = detectDeviceFromUserAgent(ua);

  const { country: rawCountry } = await params;
  const country = normalizeCountryParam(rawCountry);

  const [groups, feedCampaigns, topBannerCampaigns, filterCtaCampaigns, filterButton] = await Promise.all([
    getGroupsByCountry(country),
    getActiveFeedCampaigns(),
    getActiveCampaigns('top-banner'),
    getActiveCampaigns('filter-cta'),
    getFilterButton(),
  ]);

  const topBannerForPage =
    topBannerCampaigns.length > 0 && topBannerCampaigns[0].creative ? topBannerCampaigns : [];

  const filterFromCampaign =
    filterCtaCampaigns.length > 0
      ? { text: filterCtaCampaigns[0].buttonText?.trim() || 'Visit', url: filterCtaCampaigns[0].destinationUrl || '' }
      : null;
  const filterButtonText = (filterFromCampaign?.text ?? filterButton?.text ?? '').trim();
  const filterButtonUrl = filterFromCampaign?.url ?? filterButton?.url ?? '';

  return (
    <GroupsClient
      initialGroups={groups}
      feedCampaigns={feedCampaigns}
      initialCountry={country}
      initialIsMobile={isMobile}
      initialIsTelegram={isTelegram}
      topBannerCampaigns={topBannerForPage}
      filterButtonText={filterButtonText}
      filterButtonUrl={filterButtonUrl}
    />
  );
}
