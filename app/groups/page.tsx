import { Metadata } from 'next';
import Link from 'next/link';
import { headers } from 'next/headers';
import connectDB from '@/lib/db/mongodb';
import { Group, Advert } from '@/lib/models';
import GroupsClient from './GroupsClient';
import { detectDeviceFromUserAgent } from '@/lib/utils/device';
import ErrorBoundary from '@/components/ErrorBoundary';

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
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Discover NSFW Telegram Groups - Browse Thousands of Communities',
    description: 'Browse and discover thousands of NSFW Telegram groups. Find communities by category, country, and interests.',
  },
};

// Enable ISR for better performance + SEO
export const revalidate = 60;

async function getGroups(limit: number, isMobile: boolean = false) {
  try {
    await connectDB();

    // Use random sampling for better discovery experience
    const groups = await Group.aggregate([
      { $match: { status: 'approved' } },
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
      image: (group.image && !group.image.startsWith('/uploads/')) ? group.image : '/assets/image.jpg',
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
    }));
  } catch (error) {
    console.error('Error fetching groups:', error);
    return [];
  }
}

async function getAdverts() {
  try {
    await connectDB();

    // Get only regular adverts (exclude popup adverts)
    const adverts = await Advert.find({
      status: 'active',
      isPopupAdvert: { $ne: true }
    })
      .select('_id name slug category country url description status pinned image')
      .sort({ updatedAt: -1 })
      .limit(250)
      .lean();

    // Map adverts - limit all fields aggressively to prevent maxSize errors
    const mappedAdverts = adverts.map((advert: any) => ({
      _id: advert._id.toString(),
      name: (advert.name || '').slice(0, 100), // Further limit name
      slug: (advert.slug || '').slice(0, 100), // Limit slug
      category: (advert.category || '').slice(0, 50), // Limit category
      country: (advert.country || '').slice(0, 50), // Limit country
      url: (advert.url || '').slice(0, 300), // Limit URL
      description: (advert.description || '').slice(0, 150) || '', // Further limit description
      image: (advert.image && !advert.image.startsWith('/uploads/')) ? advert.image : '/assets/image.jpg',
      status: advert.status || 'active',
      pinned: advert.pinned || false,
      clickCount: 0, // Required by type but set to 0 to reduce size
    }));

    // Separate pinned and regular adverts
    const pinnedAdverts = mappedAdverts.filter((a: any) => a.pinned);
    const regularAdverts = mappedAdverts.filter((a: any) => !a.pinned);

    // Shuffle regular adverts for randomization
    const shuffledRegular = [...regularAdverts];
    for (let i = shuffledRegular.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledRegular[i], shuffledRegular[j]] = [shuffledRegular[j], shuffledRegular[i]];
    }

    // Combine: pinned first, then shuffled regular adverts
    return [...pinnedAdverts, ...shuffledRegular];
  } catch (error) {
    console.error('Error fetching adverts:', error);
    return [];
  }
}

// Generate random advert positions and selections on the server to prevent hydration mismatches
// Returns an array of { position, advert } objects that can be serialized
function generateAdvertPlacements(regularAdverts: any[]) {
  if (regularAdverts.length === 0) return [];
  // Shuffle adverts once so we don't repeat the same advert in multiple slots
  const shuffled = [...regularAdverts];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const placements: Array<{ position: number; advert: any }> = [];
  let currentPos = 0;
  let advertIndex = 0;

  // Generate random positions where adverts will appear (1-indexed: after group 1, after group 2, etc.)
  // Each position is randomly spaced 1-4 groups apart
  while (currentPos < 200 && shuffled.length > 0) {
    // Random interval between 1-4 groups
    const interval = 1 + Math.floor(Math.random() * 4); // 1, 2, 3, or 4
    currentPos += interval;
    if (currentPos <= 200) {
      // Pick a random advert for this position
      placements.push({
        position: currentPos,
        advert: shuffled[advertIndex % shuffled.length]
      });
      advertIndex++;
    }
  }

  return placements;
}



export default async function GroupsPage() {
  const ua = (await headers()).get('user-agent');
  const { isMobile, isTelegram } = detectDeviceFromUserAgent(ua);

  // Render a small, SEO-safe first page
  const groups = await getGroups(12, isMobile);
  const adverts = await getAdverts();

  // Separate pinned and regular adverts
  const regularAdverts = adverts.filter(a => !a.pinned);

  // Generate advert placements on the server to prevent hydration mismatches
  const advertPlacements = generateAdvertPlacements(regularAdverts);

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
          initialAdverts={adverts}
          advertPlacements={advertPlacements}
          initialIsMobile={isMobile}
          initialIsTelegram={isTelegram}
        />
      </ErrorBoundary>
    </>
  );
}
