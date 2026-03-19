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
import { getLocale, getPathname } from '@/lib/i18n/server';
import { LOCALES, localePath } from '@/lib/i18n';

// ISR for public join pages (keeps SSR output crawlable while avoiding per-request rendering)
export const revalidate = 300;

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://erogram.pro';
const PLACEHOLDER_REL = process.env.NEXT_PUBLIC_PLACEHOLDER_IMAGE_URL || '/assets/placeholder-no-image.png';
const PLACEHOLDER_ABS = PLACEHOLDER_REL.startsWith('http') ? PLACEHOLDER_REL : `${BASE_URL}/assets/placeholder-no-image.png`;

function safeImageUrl(img: unknown, fallback: string): string {
  return (typeof img === 'string' && img.startsWith('https://')) ? img : fallback;
}

async function getVaultTeaser() {
  try {
    await connectDB();
    let groups = await Group.find({ showOnVaultTeaser: true, premiumOnly: true, status: 'approved', image: { $nin: [null, ''] }, memberCount: { $gte: 80000 } })
      .sort({ vaultTeaserOrder: 1 })
      .select('name image category categories country memberCount vaultTeaserOrder vaultCategories')
      .lean();

    if (groups.length > 12) {
      const shuffled = [...groups].sort(() => Math.random() - 0.5);
      groups = shuffled.slice(0, 12);
    }

    if (groups.length === 0) {
      groups = await Group.find({ premiumOnly: true, status: 'approved', image: { $nin: [null, ''] }, memberCount: { $gte: 80000 } })
        .sort({ memberCount: -1 })
        .limit(12)
        .select('name image category categories country memberCount vaultCategories')
        .lean();
    }

    return (groups as any[]).map(g => ({
      _id: g._id.toString(),
      name: (g.name || '') as string,
      image: (g.image || '') as string,
      category: (g.category || '') as string,
      country: (g.country || '') as string,
      memberCount: (g.memberCount || 0) as number,
      vaultCategories: (g as any).vaultCategories || [],
    }));
  } catch {
    return [];
  }
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

type SimilarGroup = {
  _id: string;
  name: string;
  slug: string;
  category: string;
  categories: string[];
  country: string;
  description: string;
  image: string;
};

async function getGroup(slug: string, locale: string = 'en') {
  try {
    await connectDB();

    const group = await Group.findOne({ slug })
      .populate('createdBy', 'username showNicknameUnderGroups')
      .lean();

    if (!group) {
      return null;
    }

    const groupId = (group as any)._id;
    const isDeleted = (group as any).status === 'deleted';

    // Only increment view count for non-deleted groups
    if (!isDeleted) {
      const todayUtc = new Date().toISOString().slice(0, 10);
      Group.findByIdAndUpdate(groupId, {
        $inc: {
          views: 1,
          weeklyViews: 1,
          [`viewsByDay.${todayUtc}`]: 1,
        },
      }).catch(err => console.error('Error updating views:', err));
    }

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

    const isPremium = (group as any).premiumOnly === true;

    const rawCats = (group as any).categories;
    const categories = rawCats?.length ? rawCats : [(group as any).category, (group as any).country].filter(Boolean);

    const descField = locale === 'de' ? 'description_de' : locale === 'es' ? 'description_es' : '';
    const localizedDesc = descField && (group as any)[descField] ? (group as any)[descField] : (group as any).description;

    const result = {
      _id: (group as any)._id.toString(),
      name: (group as any).name,
      slug: (group as any).slug,
      category: (group as any).category,
      categories,
      country: (group as any).country,
      telegramLink: isPremium ? '' : (group as any).telegramLink,
      description: localizedDesc,
      image: safeImageUrl((group as any).image, PLACEHOLDER_REL),
      views: (group as any).views || 0,
      memberCount: (group as any).memberCount || 0,
      createdAt: (group as any).createdAt,
      status: (group as any).status as string,
      premiumOnly: isPremium,
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

async function getBot(slug: string, locale: string = 'en') {
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

    const rawBotCats = (bot as any).categories;
    const botCategories = rawBotCats?.length ? rawBotCats : [(bot as any).category, (bot as any).country].filter(Boolean);

    const botDescField = locale === 'de' ? 'description_de' : locale === 'es' ? 'description_es' : '';
    const localizedBotDesc = botDescField && (bot as any)[botDescField] ? (bot as any)[botDescField] : (bot as any).description;

    const result = {
      _id: (bot as any)._id.toString(),
      name: (bot as any).name,
      slug: (bot as any).slug,
      category: (bot as any).category,
      categories: botCategories,
      country: (bot as any).country,
      telegramLink: (bot as any).telegramLink,
      description: localizedBotDesc,
      image: safeImageUrl((bot as any).image, PLACEHOLDER_REL),
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
      premiumOnly: { $ne: true },
      _id: { $ne: currentObjectId },
    };

    if (category) {
      matchStage.$or = [{ categories: category }, { category: category }];
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
          categories: 1,
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
            premiumOnly: { $ne: true },
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
            categories: 1,
            country: 1,
            description: 1,
            image: 1,
          },
        },
      ]);

      groups = [...groups, ...randomGroups];
    }

    return groups.map((g: any) => {
      const cats = g.categories?.length ? g.categories : [g.category, g.country].filter(Boolean);
      return {
        _id: g._id.toString(),
        name: String(g.name || '').slice(0, 150),
        slug: String(g.slug || '').slice(0, 100),
        category: String(g.category || '').slice(0, 50),
        categories: cats,
        country: String(g.country || '').slice(0, 50),
        description: String(g.description || '').slice(0, 220),
        image: safeImageUrl(g.image, PLACEHOLDER_REL),
      };
    });
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
          categories: 1,
          country: 1,
          description: 1,
          image: 1,
        },
      },
    ]);

    return bots.map((b: any) => {
      const cats = b.categories?.length ? b.categories : [b.category, b.country].filter(Boolean);
      return {
        _id: b._id.toString(),
        name: String(b.name || '').slice(0, 150),
        slug: String(b.slug || '').slice(0, 100),
        category: String(b.category || '').slice(0, 50),
        categories: cats,
        country: String(b.country || '').slice(0, 50),
        description: String(b.description || '').slice(0, 220),
        image: safeImageUrl(b.image, PLACEHOLDER_REL),
      };
    });
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
  const pathname = await getPathname();
  const locale = await getLocale();

  // Try to find a group first
  const group = await getGroup(slug, locale);
  if (group) {
    if (group.premiumOnly) {
      return {
        title: 'Premium Content — Erogram',
        robots: { index: false, follow: false },
      };
    }

    if (group.category === 'Hentai') {
      return {
        title: `${group.name} — Erogram`,
        robots: { index: false, follow: false },
      };
    }

    const groupUrl = `${BASE_URL}${pathname}`;

    const category = group.category || 'NSFW';
    const country = group.country && group.country !== 'All' ? ` from ${group.country}` : '';
    const memberInfo = group.memberCount ? ` with ${group.memberCount.toLocaleString()}+ members` : '';
    const baseDescription = group.description
      || `Join ${group.name}, a popular ${category} Telegram group${country}.`;

    let finalDescription = baseDescription;
    if (finalDescription.length < 150) {
      const suffixes = [
        memberInfo ? ` A verified community${memberInfo}.` : '',
        ` Browse reviews, join the conversation, and connect with like-minded adults on Erogram.pro — the largest NSFW Telegram directory.`,
        ` Discover and join thousands of verified adult Telegram communities updated daily.`,
      ];
      for (const s of suffixes) {
        if (finalDescription.length >= 150) break;
        finalDescription += s;
      }
    }
    if (finalDescription.length > 160) {
      finalDescription = finalDescription.slice(0, 157) + '...';
    }

    return {
      // Root layout already appends "| Erogram" via `metadata.title.template`.
      // Keep page titles clean to avoid duplicates like "... | Erogram.pro | Erogram".
      title: `${group.name} - Join NSFW Telegram Group`,
      description: finalDescription,
      keywords: `NSFW telegram group, ${group.name}, adult telegram community, ${(group.categories || [group.category, group.country].filter(Boolean)).join(', ')}, telegram chat, erotic groups, adult messaging`,
      other: {
        rating: 'adult',
      },
      alternates: {
        canonical: groupUrl,
        languages: Object.fromEntries(
          LOCALES.map(l => [l, `${BASE_URL}${localePath(`/${group.slug}`, l)}`])
        ),
      },
      openGraph: {
        title: `${group.name} - Join NSFW Telegram Group`,
        description: finalDescription,
        type: 'website',
        siteName: 'Erogram',
        images: [
          {
            url: safeImageUrl(group.image, PLACEHOLDER_ABS),
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
        images: [safeImageUrl(group.image, PLACEHOLDER_ABS)],
      },
    };
  }

  // If no group found, try to find a bot
  const bot = await getBot(slug, locale);
  if (bot) {
    const botUrl = `${BASE_URL}${pathname}`;

    const botCategory = bot.category || 'NSFW';
    const baseDescription = bot.description
      || `Try ${bot.name}, a popular ${botCategory} Telegram bot.`;

    let finalDescription = baseDescription;
    if (finalDescription.length < 150) {
      const suffixes = [
        ` Explore features, read user reviews, and start chatting on Erogram.pro — the largest directory of NSFW Telegram bots and AI companions.`,
        ` Discover thousands of verified Telegram bots and AI companions updated daily.`,
      ];
      for (const s of suffixes) {
        if (finalDescription.length >= 150) break;
        finalDescription += s;
      }
    }
    if (finalDescription.length > 160) {
      finalDescription = finalDescription.slice(0, 157) + '...';
    }

    return {
      title: `${bot.name} - Use NSFW Telegram Bot`,
      description: finalDescription,
      keywords: `NSFW telegram bot, ${bot.name}, adult telegram bot, ${(bot.categories || [bot.category, bot.country].filter(Boolean)).join(', ')}, telegram bot, erotic bots, adult bot`,
      alternates: {
        canonical: botUrl,
        languages: Object.fromEntries(
          LOCALES.map(l => [l, `${BASE_URL}${localePath(`/${bot.slug}`, l)}`])
        ),
      },
      openGraph: {
        title: `${bot.name} - Use NSFW Telegram Bot`,
        description: finalDescription,
        type: 'website',
        siteName: 'Erogram',
        images: [
          {
            url: safeImageUrl(bot.image, PLACEHOLDER_ABS),
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
        images: [safeImageUrl(bot.image, PLACEHOLDER_ABS)],
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
  const locale = await getLocale();

  // Try to find a group first
  const group = await getGroup(slug, locale);
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
      ...(group.telegramLink ? { sameAs: group.telegramLink } : {}),
      image: safeImageUrl(group.image, PLACEHOLDER_ABS),
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

    const [joinCtaCampaigns, topBannerCampaigns, vaultTeaser] = await Promise.all([
      getActiveCampaigns('join-cta'),
      getActiveCampaigns('top-banner'),
      getVaultTeaser(),
    ]);
    const joinCtaCampaign = joinCtaCampaigns[0] ?? null;
    const topBannerForPage =
      topBannerCampaigns.length > 0 && topBannerCampaigns[0].creative ? topBannerCampaigns : [];

    return (
      <>
        {/* Strip all structured data for premium-only groups to prevent any SEO signal leakage */}
        {!group.premiumOnly && (
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
          </>
        )}
        <JoinClient entity={group} type="group" similarGroups={similarGroups} initialIsMobile={isMobile} initialIsTelegram={isTelegram} joinCtaCampaign={joinCtaCampaign} topBannerCampaigns={topBannerForPage} isDeleted={group.status === 'deleted'} vaultTeaser={vaultTeaser} />
      </>
    );
  }

  // If no group found, try to find a bot
  const bot = await getBot(slug, locale);
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
      image: safeImageUrl(bot.image, PLACEHOLDER_ABS),
      datePublished: bot.createdAt ? new Date(bot.createdAt).toISOString().split('T')[0] : undefined,
      aggregateRating: bot.clickCount ? {
        '@type': 'AggregateRating',
        ratingCount: bot.clickCount,
        bestRating: 5,
        worstRating: 1,
      } : undefined,
    };

    const [joinCtaCampaigns2, topBannerCampaigns2, vaultTeaser2] = await Promise.all([
      getActiveCampaigns('join-cta'),
      getActiveCampaigns('top-banner'),
      getVaultTeaser(),
    ]);
    const joinCtaCampaign = joinCtaCampaigns2[0] ?? null;
    const topBannerForPage =
      topBannerCampaigns2.length > 0 && topBannerCampaigns2[0].creative ? topBannerCampaigns2 : [];

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
        <JoinClient entity={bot} type="bot" similarGroups={[]} initialIsMobile={isMobile} initialIsTelegram={isTelegram} joinCtaCampaign={joinCtaCampaign} topBannerCampaigns={topBannerForPage} vaultTeaser={vaultTeaser2} />
      </>
    );
  }

  // If neither found, show not found
  notFound();
}
