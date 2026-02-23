import { Metadata } from 'next';
import Link from 'next/link';
import { headers } from 'next/headers';
import connectDB from '@/lib/db/mongodb';
import { Group } from '@/lib/models';
import GroupsClient from './GroupsClient';
import { detectDeviceFromUserAgent } from '@/lib/utils/device';
import ErrorBoundary from '@/components/ErrorBoundary';
import { getActiveCampaigns, getActiveFeedCampaigns } from '@/lib/actions/campaigns';

const baseUrl = 'https://erogram.pro';

export const metadata: Metadata = {
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
    url: `${baseUrl}/groups`,
    images: [{ url: `${baseUrl}/assets/og-default.png`, width: 512, height: 512, alt: 'Erogram - Telegram Groups' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Discover NSFW Telegram Groups - Browse Thousands of Communities',
    description: 'Browse and discover thousands of NSFW Telegram groups. Find communities by category, country, and interests.',
    images: [`${baseUrl}/assets/og-default.png`],
  },
};

// Always fetch fresh data so new banner/feed campaigns show immediately after admin adds them
export const dynamic = 'force-dynamic';

async function getGroups(limit: number, isMobile: boolean = false) {
  try {
    await connectDB();

    // Use random sampling for better discovery experience. Exclude Group-based "advert" rows
    // so in-feed ads come only from Campaigns (Advertisers → By slot → In-Feed).
    const groups = await Group.aggregate([
      { $match: { status: 'approved', isAdvertisement: { $ne: true } } },
      { $sample: { size: limit } }, // Limit initial payload for mobile
      {
        $lookup: {
          from: 'users',
          localField: 'createdBy',
          foreignField: '_id',
          as: 'createdBy'
        }
      },
      {
        $lookup: {
          from: 'posts',
          let: { groupId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$groupId', '$$groupId'] },
                status: 'approved'
              }
            },
            {
              $group: {
                _id: null,
                averageRating: { $avg: '$rating' },
                reviewCount: { $sum: 1 }
              }
            }
          ],
          as: 'reviewStats'
        }
      },
      {
        $addFields: {
          createdBy: { $arrayElemAt: ['$createdBy', 0] },
          reviewStats: { $arrayElemAt: ['$reviewStats', 0] }
        }
      },
      {
        $project: {
          // Include only the fields we need (inclusion projection)
          // For mobile, exclude even more fields to reduce payload
          _id: 1,
          name: 1,
          slug: 1,
          category: 1,
          country: 1,
          description: isMobile ? { $substr: ['$description', 0, 100] } : 1, // Shorter descriptions on mobile
          telegramLink: 1,
          isAdvertisement: 1,
          advertisementUrl: 1,
          pinned: 1,
          clickCount: 1,
          createdBy: isMobile ? {
            username: 1
            // Exclude showNicknameUnderGroups on mobile to reduce payload
          } : {
            username: 1,
            showNicknameUnderGroups: 1
          },
          averageRating: { $ifNull: ['$reviewStats.averageRating', 0] },
          reviewCount: { $ifNull: ['$reviewStats.reviewCount', 0] },
          views: { $ifNull: ['$views', 0] },
          memberCount: { $ifNull: ['$memberCount', 0] },
          verified: { $ifNull: ['$verified', false] },
          image: 1
        }
      }
    ]);

    // Sanitize and limit all fields to prevent maxSize errors
    return groups.map((group: any) => ({
      _id: group._id.toString(),
      name: (group.name || '').slice(0, 150), // Further limit name length
      slug: (group.slug || '').slice(0, 100), // Limit slug
      category: (group.category || '').slice(0, 50), // Limit category length
      country: (group.country || '').slice(0, 50), // Limit country length
      description: (group.description || '').slice(0, 150) || '', // Further limit description
      image: (group.image && typeof group.image === 'string' && group.image.startsWith('https://')) ? group.image : '/assets/image.jpg',
      telegramLink: (group.telegramLink || '').slice(0, 150), // Limit URL length
      isAdvertisement: group.isAdvertisement || false,
      advertisementUrl: group.advertisementUrl ? (group.advertisementUrl || '').slice(0, 150) : null,
      pinned: group.pinned || false,
      clickCount: group.clickCount || 0,
      createdBy: group.createdBy ? {
        username: group.createdBy.username,
        showNicknameUnderGroups: group.createdBy.showNicknameUnderGroups
      } : null,
      averageRating: group.averageRating || 0,
      reviewCount: group.reviewCount || 0,
      views: group.views || 0,
      memberCount: group.memberCount || 0,
      verified: group.verified || false,
    }));
  } catch (error) {
    console.error('Error fetching groups:', error);
    return [];
  }
}

export default async function GroupsPage() {
  const ua = (await headers()).get('user-agent');
  const { isMobile, isTelegram } = detectDeviceFromUserAgent(ua);

  // Render a small, SEO-safe first page
  const groups = await getGroups(12, isMobile);

  // In-feed ads: Advertisers only (Admin → Advertisers → By slot → In-Feed). Input = DB = output.
  const [topBannerCampaigns, feedCampaigns] = await Promise.all([
    getActiveCampaigns('top-banner'),
    getActiveFeedCampaigns('groups'),
  ]);

  const topBannerForPage =
    topBannerCampaigns.length > 0 && topBannerCampaigns[0].creative ? topBannerCampaigns : [];

  return (
    <>
      {/* Crawlable pagination links for bots/crawlers (kept visually hidden to avoid UI duplication) */}
      <nav aria-label="Groups pagination" className="sr-only">
        <Link href="/groups">Groups page 1</Link>
        <Link href="/groups/page/2">Groups page 2</Link>
        <Link href="/groups/page/3">Groups page 3</Link>
        <Link href="/groups/page/4">Groups page 4</Link>
        <Link href="/groups/page/5">Groups page 5</Link>
      </nav>

      <ErrorBoundary>
        <GroupsClient
          initialGroups={groups}
          feedCampaigns={feedCampaigns}
          initialIsMobile={isMobile}
          initialIsTelegram={isTelegram}
          topBannerCampaigns={topBannerForPage}
        />
      </ErrorBoundary>
    </>
  );
}
