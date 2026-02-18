import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import mongoose from 'mongoose';
import connectDB from '@/lib/db/mongodb';
import { Group, Bot, Post } from '@/lib/models';
import JoinClient from './JoinClient';
import { getTelegramMemberCount } from '@/lib/utils/telegram';
import { detectDeviceFromUserAgent } from '@/lib/utils/device';
import { getActiveCampaigns } from '@/lib/actions/campaigns';

// ISR for public join pages (keeps SSR output crawlable while avoiding per-request rendering)
export const revalidate = 300;

const BASE_URL = 'https://erogram.pro';

function safeImageUrl(img: unknown, fallback: string): string {
  return (typeof img === 'string' && img.startsWith('https://')) ? img : fallback;
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

type SimilarGroup = {
  _id: string;
  name: string;
  slug: string;
  category: string;
  country: string;
  description: string;
  image: string;
};

async function getGroup(slug: string) {
  try {
    await connectDB();

    const group = await Group.findOne({ slug })
      .populate('createdBy', 'username showNicknameUnderGroups')
      .lean();

    if (!group) {
      return null;
    }

    // Increment view count (fire and forget)
    const groupId = (group as any)._id;
    Group.findByIdAndUpdate(groupId, {
      $inc: { views: 1, weeklyViews: 1 }
    }).catch(err => console.error('Error updating views:', err));

    // Background update of member count if stale (older than 24h)
    const lastUpdate = (group as any).memberCountUpdatedAt ? new Date((group as any).memberCountUpdatedAt) : new Date(0);
    const now = new Date();
    if ((now.getTime() - lastUpdate.getTime()) > 24 * 60 * 60 * 1000 && (group as any).telegramLink) {
      getTelegramMemberCount((group as any).telegramLink).then(count => {
        if (count !== null) {
          Group.findByIdAndUpdate(groupId, {
            memberCount: count,
            memberCountUpdatedAt: now
          }).catch(err => console.error('Error updating member count:', err));
        }
      }).catch(err => console.error('Error fetching member count:', err));
    }

    // Fetch latest reviews
    const reviews = await Post.find({
      groupId: groupId,
      status: 'approved'
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('authorName content rating createdAt')
      .lean();

    // Build result object
    const result = {
      _id: (group as any)._id.toString(),
      name: (group as any).name,
      slug: (group as any).slug,
      category: (group as any).category,
      country: (group as any).country,
      telegramLink: (group as any).telegramLink,
      description: (group as any).description,
      image: safeImageUrl((group as any).image, '/assets/image.jpg'),
      views: (group as any).views || 0,
      memberCount: (group as any).memberCount || 0,
      createdAt: (group as any).createdAt,
      reviews: reviews.map((r: any) => ({
        _id: r._id.toString(),
        authorName: r.authorName || 'Anonymous',
        content: r.content,
        rating: r.rating,
        createdAt: r.createdAt
      })),
      createdBy: (group as any).createdBy ? {
        username: (group as any).createdBy.username,
        showNicknameUnderGroups: (group as any).createdBy.showNicknameUnderGroups
      } : null,
    };

    return result;
  } catch (error: any) {
    console.error('Error fetching group:', error);
    return null;
  }
}

async function getBot(slug: string) {
  try {
    await connectDB();

    const bot = await Bot.findOne({ slug })
      .populate('createdBy', 'username showNicknameUnderGroups')
      .lean();

    if (!bot) {
      return null;
    }

    // Increment view count (fire and forget)
    const botId = (bot as any)._id;
    Bot.findByIdAndUpdate(botId, {
      $inc: { views: 1 }
    }).catch(err => console.error('Error updating views:', err));

    // Background update of member count if stale (older than 24h)
    const lastUpdate = (bot as any).memberCountUpdatedAt ? new Date((bot as any).memberCountUpdatedAt) : new Date(0);
    const now = new Date();
    if ((now.getTime() - lastUpdate.getTime()) > 24 * 60 * 60 * 1000 && (bot as any).telegramLink) {
      getTelegramMemberCount((bot as any).telegramLink).then(count => {
        if (count !== null) {
          Bot.findByIdAndUpdate(botId, {
            memberCount: count,
            memberCountUpdatedAt: now
          }).catch(err => console.error('Error updating member count:', err));
        }
      }).catch(err => console.error('Error fetching member count:', err));
    }

    // Fetch latest reviews
    const reviews = await Post.find({
      groupId: botId,
      status: 'approved'
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('authorName content rating createdAt')
      .lean();

    // Build result object
    const result = {
      _id: (bot as any)._id.toString(),
      name: (bot as any).name,
      slug: (bot as any).slug,
      category: (bot as any).category,
      country: (bot as any).country,
      telegramLink: (bot as any).telegramLink,
      description: (bot as any).description,
      image: safeImageUrl((bot as any).image, '/assets/image.jpg'),
      views: (bot as any).views || 0,
      clickCount: (bot as any).clickCount || 0,
      memberCount: (bot as any).memberCount || 0,
      createdAt: (bot as any).createdAt,
      reviews: reviews.map((r: any) => ({
        _id: r._id.toString(),
        authorName: r.authorName || 'Anonymous',
        content: r.content,
        rating: r.rating,
        createdAt: r.createdAt
      })),
      createdBy: (bot as any).createdBy ? {
        username: (bot as any).createdBy.username,
        showNicknameUnderGroups: (bot as any).createdBy.showNicknameUnderGroups
      } : null,
    };

    return result;
  } catch (error: any) {
    console.error('Error fetching bot:', error);
    return null;
  }
}

async function getRandomSimilarGroups(currentGroupId: string, category?: string): Promise<SimilarGroup[]> {
  try {
    await connectDB();

    const currentObjectId = new mongoose.Types.ObjectId(currentGroupId);

    // First try to find groups in the same category
    let matchStage: any = {
      status: 'approved',
      isAdvertisement: { $ne: true },
      _id: { $ne: currentObjectId },
    };

    if (category) {
      matchStage.category = category;
    }

    let groups = await Group.aggregate([
      { $match: matchStage },
      { $sample: { size: 6 } },
      {
        $project: {
          _id: 1,
          name: 1,
          slug: 1,
          category: 1,
          country: 1,
          description: 1,
          image: 1,
        },
      },
    ]);

    // If not enough groups in same category, fill with random groups
    if (groups.length < 6) {
      const existingIds = [currentObjectId, ...groups.map((g: any) => g._id)];
      const needed = 6 - groups.length;

      const randomGroups = await Group.aggregate([
        {
          $match: {
            status: 'approved',
            isAdvertisement: { $ne: true },
            _id: { $nin: existingIds },
          },
        },
        { $sample: { size: needed } },
        {
          $project: {
            _id: 1,
            name: 1,
            slug: 1,
            category: 1,
            country: 1,
            description: 1,
            image: 1,
          },
        },
      ]);

      groups = [...groups, ...randomGroups];
    }

    return groups.map((g: any) => ({
      _id: g._id.toString(),
      name: String(g.name || '').slice(0, 150),
      slug: String(g.slug || '').slice(0, 100),
      category: String(g.category || '').slice(0, 50),
      country: String(g.country || '').slice(0, 50),
      description: String(g.description || '').slice(0, 220),
      image: safeImageUrl(g.image, '/assets/image.jpg'),
    }));
  } catch (error: any) {
    console.error('Error fetching similar groups:', error);
    return [];
  }
}

async function getRandomSimilarBots(currentBotId: string): Promise<SimilarGroup[]> {
  try {
    await connectDB();

    const currentObjectId = new mongoose.Types.ObjectId(currentBotId);

    const bots = await Bot.aggregate([
      {
        $match: {
          status: 'approved',
          isAdvertisement: { $ne: true },
          _id: { $ne: currentObjectId },
        },
      },
      { $sample: { size: 6 } },
      {
        $project: {
          _id: 1,
          name: 1,
          slug: 1,
          category: 1,
          country: 1,
          description: 1,
          image: 1,
        },
      },
    ]);

    return bots.map((b: any) => ({
      _id: b._id.toString(),
      name: String(b.name || '').slice(0, 150),
      slug: String(b.slug || '').slice(0, 100),
      category: String(b.category || '').slice(0, 50),
      country: String(b.country || '').slice(0, 50),
      description: String(b.description || '').slice(0, 220),
      image: safeImageUrl(b.image, '/assets/image.jpg'),
    }));
  } catch (error: any) {
    console.error('Error fetching similar bots:', error);
    return [];
  }
}

async function getGroupReviewStats(groupId: string) {
  try {
    await connectDB();

    const reviews = await Post.find({
      groupId: groupId,
      status: 'approved'
    }).select('rating').lean();

    if (reviews.length === 0) {
      return null;
    }

    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / reviews.length;

    return {
      ratingCount: reviews.length,
      ratingValue: Math.round(averageRating * 10) / 10, // Round to 1 decimal place
    };
  } catch (error: any) {
    console.error('Error fetching group review stats:', error);
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;

  // Try to find a group first
  const group = await getGroup(slug);
  if (group) {
    const groupUrl = `${BASE_URL}/${group.slug}`;

    // Create enhanced description combining group description with site branding
    const baseDescription = group.description || `Join ${group.name} - a curated NSFW Telegram community`;
    const enhancedDescription = `${baseDescription} | Erogram.pro - Discover Erotic Telegram Groups Today. Connect with like-minded adults in verified NSFW communities worldwide.`;

    // Ensure description is not too long for SEO (aim for 150-160 characters)
    const finalDescription = enhancedDescription.length > 160
      ? `${baseDescription.slice(0, 120)}... | Erogram.pro - Discover Erotic Telegram Groups Today`
      : enhancedDescription;

    return {
      // Root layout already appends "| Erogram" via `metadata.title.template`.
      // Keep page titles clean to avoid duplicates like "... | Erogram.pro | Erogram".
      title: `${group.name} - Join NSFW Telegram Group`,
      description: finalDescription,
      keywords: `NSFW telegram group, ${group.name}, adult telegram community, ${group.category || 'NSFW'}, ${group.country || 'International'}, telegram chat, erotic groups, adult messaging`,
      other: {
        rating: 'adult',
      },
      alternates: {
        canonical: groupUrl,
      },
      openGraph: {
        title: `${group.name} - Join NSFW Telegram Group`,
        description: finalDescription,
        type: 'website',
        siteName: 'Erogram',
        images: [
          {
            url: safeImageUrl(group.image, `${BASE_URL}/assets/image.jpg`),
            width: 1200,
            height: 630,
            alt: `${group.name} - NSFW Telegram Group`,
          },
        ],
        url: groupUrl,
      },
      twitter: {
        card: 'summary_large_image',
        title: `${group.name} - Join NSFW Telegram Group`,
        description: finalDescription,
        images: [safeImageUrl(group.image, `${BASE_URL}/assets/image.jpg`)],
      },
    };
  }

  // If no group found, try to find a bot
  const bot = await getBot(slug);
  if (bot) {
    const botUrl = `${BASE_URL}/${bot.slug}`;

    // Create enhanced description combining bot description with site branding
    const baseDescription = bot.description || `Use ${bot.name} - a curated NSFW Telegram bot`;
    const enhancedDescription = `${baseDescription} | Erogram.pro - Discover Erotic Telegram Bots Today. Connect with amazing NSFW bots for adult entertainment.`;

    // Ensure description is not too long for SEO (aim for 150-160 characters)
    const finalDescription = enhancedDescription.length > 160
      ? `${baseDescription.slice(0, 120)}... | Erogram.pro - Discover Erotic Telegram Bots Today`
      : enhancedDescription;

    return {
      title: `${bot.name} - Use NSFW Telegram Bot`,
      description: finalDescription,
      keywords: `NSFW telegram bot, ${bot.name}, adult telegram bot, ${bot.category || 'NSFW'}, telegram bot, erotic bots, adult bot`,
      alternates: {
        canonical: botUrl,
      },
      openGraph: {
        title: `${bot.name} - Use NSFW Telegram Bot`,
        description: finalDescription,
        type: 'website',
        siteName: 'Erogram',
        images: [
          {
            url: safeImageUrl(bot.image, `${BASE_URL}/assets/image.jpg`),
            width: 1200,
            height: 630,
            alt: `${bot.name} - NSFW Telegram Bot`,
          },
        ],
        url: botUrl,
      },
      twitter: {
        card: 'summary_large_image',
        title: `${bot.name} - Use NSFW Telegram Bot`,
        description: finalDescription,
        images: [safeImageUrl(bot.image, `${BASE_URL}/assets/image.jpg`)],
      },
    };
  }

  // If neither found
  return {
    title: 'Not Found - Discover NSFW Telegram Communities',
    description: 'The requested NSFW Telegram community or bot could not be found. Discover thousands of adult communities and bots on Erogram.pro.',
  };
}

export default async function JoinPage({ params }: PageProps) {
  const ua = (await headers()).get('user-agent');
  const { isMobile, isTelegram } = detectDeviceFromUserAgent(ua);

  const { slug } = await params;

  // Try to find a group first
  const group = await getGroup(slug);
  if (group) {
    const similarGroups = await getRandomSimilarGroups(group._id, group.category);
    const reviewStats = await getGroupReviewStats(group._id);
    const pageUrl = `${BASE_URL}/${group.slug}`;
    const breadcrumbJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: BASE_URL,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Groups',
          item: `${BASE_URL}/groups`,
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: group.name,
          item: pageUrl,
        },
      ],
    };

    const webPageJsonLd: Record<string, any> = {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: `${group.name} - Join NSFW Telegram Group`,
      description: group.description || `Join ${group.name} on Telegram.`,
      url: pageUrl,
      isPartOf: {
        '@type': 'WebSite',
        name: 'Erogram',
        url: BASE_URL,
      },
    };

    const organizationJsonLd: Record<string, any> = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: group.name,
      description: group.description,
      url: pageUrl,
      sameAs: group.telegramLink,
      image: safeImageUrl(group.image, `${BASE_URL}/assets/image.jpg`),
      foundingDate: group.createdAt ? new Date(group.createdAt).getFullYear().toString() : undefined,
      memberOf: {
        '@type': 'WebSite',
        name: 'Erogram',
        url: BASE_URL,
      },
    };

    // Add aggregate rating if reviews exist
    if (reviewStats) {
      organizationJsonLd.aggregateRating = {
        '@type': 'AggregateRating',
        ratingValue: reviewStats.ratingValue,
        reviewCount: reviewStats.ratingCount,
        bestRating: 5,
        worstRating: 1,
      };
    }

    const [joinCtaCampaigns, topBannerCampaigns] = await Promise.all([
      getActiveCampaigns('join-cta'),
      getActiveCampaigns('top-banner'),
    ]);
    const joinCtaCampaign = joinCtaCampaigns[0] ?? null;
    const topBannerForPage =
      topBannerCampaigns.length > 0 && topBannerCampaigns[0].creative ? topBannerCampaigns : [];

    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <JoinClient entity={group} type="group" similarGroups={similarGroups} initialIsMobile={isMobile} initialIsTelegram={isTelegram} joinCtaCampaign={joinCtaCampaign} topBannerCampaigns={topBannerForPage} />
      </>
    );
  }

  // If no group found, try to find a bot
  const bot = await getBot(slug);
  if (bot) {
    const pageUrl = `${BASE_URL}/${bot.slug}`;
    const breadcrumbJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: BASE_URL,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Bots',
          item: `${BASE_URL}/bots`,
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: bot.name,
          item: pageUrl,
        },
      ],
    };

    const webPageJsonLd: Record<string, any> = {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: `${bot.name} - Use NSFW Telegram Bot`,
      description: bot.description || `Use ${bot.name} on Telegram.`,
      url: pageUrl,
      isPartOf: {
        '@type': 'WebSite',
        name: 'Erogram',
        url: BASE_URL,
      },
    };

    const softwareApplicationJsonLd: Record<string, any> = {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: bot.name,
      description: bot.description,
      url: pageUrl,
      applicationCategory: 'EntertainmentApplication',
      operatingSystem: 'Telegram',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
      provider: {
        '@type': 'WebSite',
        name: 'Erogram',
        url: BASE_URL,
      },
      image: safeImageUrl(bot.image, `${BASE_URL}/assets/image.jpg`),
      datePublished: bot.createdAt ? new Date(bot.createdAt).toISOString().split('T')[0] : undefined,
      aggregateRating: bot.clickCount ? {
        '@type': 'AggregateRating',
        ratingCount: bot.clickCount,
        bestRating: 5,
        worstRating: 1,
      } : undefined,
    };

    const [joinCtaCampaigns, topBannerCampaigns] = await Promise.all([
      getActiveCampaigns('join-cta'),
      getActiveCampaigns('top-banner'),
    ]);
    const joinCtaCampaign = joinCtaCampaigns[0] ?? null;
    const topBannerForPage =
      topBannerCampaigns.length > 0 && topBannerCampaigns[0].creative ? topBannerCampaigns : [];

    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationJsonLd) }}
        />
        <JoinClient entity={bot} type="bot" similarGroups={[]} initialIsMobile={isMobile} initialIsTelegram={isTelegram} joinCtaCampaign={joinCtaCampaign} topBannerCampaigns={topBannerForPage} />
      </>
    );
  }

  // If neither found, show not found
  notFound();
}
