import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import mongoose from 'mongoose';
import connectDB from '@/lib/db/mongodb';
import { Group, Bot, Post, OnlyFansCreator } from '@/lib/models';
import JoinClient from './JoinClient';
import { getTelegramMemberCount } from '@/lib/utils/telegram';
import { detectDeviceFromUserAgent } from '@/lib/utils/device';
import { getActiveCampaigns } from '@/lib/actions/campaigns';
import { getLocale, getPathname } from '@/lib/i18n/server';
import { LOCALES, localePath } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import { getToolBySlug, getToolsByCategory } from '@/app/ainsfw/data';
import ToolDetailClient from '@/app/ainsfw/[slug]/ToolDetailClient';
import { getToolStats } from '@/lib/actions/ainsfw';
import { getCreatorBySlug, getRelatedCreators, getCreatorReviews } from '@/lib/actions/ofCreatorProfile';
import CreatorProfileClient from '@/app/onlyfanssearch/CreatorProfileClient';
import { getTrendingOnErogram } from '@/lib/actions/publicData';

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
      linkedCreatorSlug: (group as any).linkedCreatorSlug || '',
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
      hasTranslations: !!((group as any).description_de?.trim() || (group as any).description_es?.trim()),
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
      hasTranslations: !!((bot as any).description_de?.trim() || (bot as any).description_es?.trim()),
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
        ...(group.hasTranslations ? {
          languages: Object.fromEntries(
            LOCALES.map(l => [l, `${BASE_URL}${localePath(`/${group.slug}`, l)}`])
          ),
        } : {}),
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
        ...(bot.hasTranslations ? {
          languages: Object.fromEntries(
            LOCALES.map(l => [l, `${BASE_URL}${localePath(`/${bot.slug}`, l)}`])
          ),
        } : {}),
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

  // If neither found, try AI NSFW tool
  const aiTool = getToolBySlug(slug);
  if (aiTool) {
    const toolPageUrl = `${BASE_URL}/${aiTool.slug}`;
    const toolImgUrl = aiTool.image.startsWith('http') ? aiTool.image : `${BASE_URL}${aiTool.image}`;
    const title = `${aiTool.name} Review — Best ${aiTool.category} Tool 2026`;
    let toolDesc = aiTool.description;
    if (toolDesc.length < 140) {
      toolDesc += ` Explore ${aiTool.name} on Erogram.pro — the best ${aiTool.category} directory with curated reviews and direct links.`;
    }
    if (toolDesc.length > 160) toolDesc = toolDesc.slice(0, 157) + '...';

    return {
      title,
      description: toolDesc,
      keywords: `${aiTool.name}, ${aiTool.category}, ai nsfw tools, ${aiTool.tags.slice(0, 5).join(', ')}, erogram, best ${aiTool.category.toLowerCase()} 2026`,
      other: { rating: 'adult' },
      alternates: { canonical: toolPageUrl },
      openGraph: {
        title,
        description: toolDesc,
        type: 'website',
        siteName: 'Erogram',
        url: toolPageUrl,
        images: [{ url: toolImgUrl, width: 1200, height: 630, alt: `${aiTool.name} — ${aiTool.category}` }],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description: toolDesc,
        images: [toolImgUrl],
      },
    };
  }

  // Try OnlyFans creator
  const creator = await getCreatorBySlug(slug);
  if (creator) {
    const creatorPath = `/${creator.slug}`;
    const pageUrl = `${BASE_URL}${creatorPath}`;
    const name = creator.name;
    const username = creator.username;
    const primaryCat = creator.categories[0] || 'onlyfans';

    const fmtNum = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(0)}K` : `${n}K`;

    const statsLabels: Record<Locale, { likes: string; fans: string; photos: string; videos: string }> = {
      en: { likes: 'likes', fans: 'fans', photos: 'photos', videos: 'videos' },
      de: { likes: 'Likes', fans: 'Fans', photos: 'Fotos', videos: 'Videos' },
      es: { likes: 'me gusta', fans: 'fans', photos: 'fotos', videos: 'videos' },
    };
    const sl = statsLabels[locale] || statsLabels.en;
    const statsSnippet = [
      creator.likesCount > 0 ? `${fmtNum(creator.likesCount)} ${sl.likes}` : '',
      creator.subscriberCount > 0 ? `${fmtNum(creator.subscriberCount)} ${sl.fans}` : '',
      creator.photosCount > 0 ? `${creator.photosCount.toLocaleString()} ${sl.photos}` : '',
      creator.videosCount > 0 ? `${creator.videosCount.toLocaleString()} ${sl.videos}` : '',
    ].filter(Boolean).join(', ');

    const priceTexts: Record<Locale, { free: string; perMonth: string }> = {
      en: { free: 'Free subscription', perMonth: '/month' },
      de: { free: 'Kostenloses Abo', perMonth: '/Monat' },
      es: { free: 'Suscripción gratis', perMonth: '/mes' },
    };
    const pt = priceTexts[locale] || priceTexts.en;
    const priceText = creator.isFree ? pt.free : creator.price > 0 ? `$${creator.price.toFixed(2)}${pt.perMonth}` : '';

    const socialHint = [
      creator.instagramUrl ? 'Instagram' : '',
      creator.twitterUrl ? 'Twitter' : '',
      creator.tiktokUrl ? 'TikTok' : '',
    ].filter(Boolean);
    const alsoOn: Record<Locale, string> = {
      en: 'Also on',
      de: 'Auch auf',
      es: 'También en',
    };
    const socialText = socialHint.length > 0 ? ` ${alsoOn[locale] || alsoOn.en} ${socialHint.join(', ')}.` : '';

    const descTemplates: Record<Locale, string> = {
      en: `${name} OnlyFans profile (@${username}). ${statsSnippet ? `${statsSnippet}. ` : ''}${priceText ? `${priceText}. ` : ''}${socialText}Browse verified OnlyFans creators on Erogram — the #1 OnlyFans search tool.`,
      de: `${name} OnlyFans-Profil (@${username}). ${statsSnippet ? `${statsSnippet}. ` : ''}${priceText ? `${priceText}. ` : ''}${socialText}Verifizierte OnlyFans Creator auf Erogram entdecken — das #1 OnlyFans Suchtool.`,
      es: `${name} OnlyFans perfil (@${username}). ${statsSnippet ? `${statsSnippet}. ` : ''}${priceText ? `${priceText}. ` : ''}${socialText}Explora creadoras verificadas en Erogram — el #1 buscador de OnlyFans.`,
    };
    let desc = descTemplates[locale] || descTemplates.en;
    if (desc.length > 160) desc = desc.slice(0, 157) + '...';

    const ogImage = creator.header && creator.header.startsWith('https://')
      ? { url: creator.header, width: 1200, height: 630, alt: `${name} OnlyFans` }
      : creator.avatar && creator.avatar.startsWith('https://')
        ? { url: creator.avatar, width: 400, height: 400, alt: `${name} OnlyFans` }
        : null;

    const titleTemplates: Record<Locale, string> = {
      en: `${name} OnlyFans — @${username} Profile, Photos & Videos (2026)`,
      de: `${name} OnlyFans — @${username} Profil, Fotos & Videos (2026)`,
      es: `${name} OnlyFans — @${username} Perfil, Fotos y Videos (2026)`,
    };
    const ogTitleTemplates: Record<Locale, string> = {
      en: `${name} OnlyFans — @${username} | Erogram`,
      de: `${name} OnlyFans — @${username} | Erogram`,
      es: `${name} OnlyFans — @${username} | Erogram`,
    };

    return {
      title: titleTemplates[locale] || titleTemplates.en,
      description: desc,
      keywords: `${name} OnlyFans, @${username} OnlyFans, ${primaryCat} OnlyFans creator, OnlyFans profile, ${creator.categories.join(', ')}, best OnlyFans 2026`,
      robots: { index: true, follow: true },
      other: { rating: 'adult' },
      alternates: { canonical: pageUrl },
      openGraph: {
        title: ogTitleTemplates[locale] || ogTitleTemplates.en,
        description: desc,
        type: 'profile',
        url: pageUrl,
        siteName: 'Erogram',
        images: ogImage ? [ogImage] : [],
      },
      twitter: {
        card: 'summary_large_image',
        title: ogTitleTemplates[locale] || ogTitleTemplates.en,
        description: desc,
        images: ogImage ? [ogImage.url] : [],
      },
    };
  }

  // If nothing found
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
      ...(group.createdAt ? { foundingDate: new Date(group.createdAt).getFullYear().toString() } : {}),
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
      getActiveCampaigns('top-banner', { page: 'join', device: isMobile ? 'mobile' : 'desktop' }),
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
      ...(bot.createdAt ? { datePublished: new Date(bot.createdAt).toISOString().split('T')[0] } : {}),
      ...(bot.clickCount > 0 ? {
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: Math.min(5, Math.round((3.5 + (Math.log10(Math.max(bot.clickCount, 1)) / 5) * 1.5) * 10) / 10),
          ratingCount: bot.clickCount,
          bestRating: 5,
          worstRating: 1,
        },
      } : {}),
    };

    const [joinCtaCampaigns2, topBannerCampaigns2, vaultTeaser2] = await Promise.all([
      getActiveCampaigns('join-cta'),
      getActiveCampaigns('top-banner', { page: 'join', device: isMobile ? 'mobile' : 'desktop' }),
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

  // If neither found, try AI NSFW tool
  const aiTool = getToolBySlug(slug);
  if (aiTool) {
    const [similar, toolStats] = await Promise.all([
      Promise.resolve(getToolsByCategory(aiTool.category).filter((t) => t.slug !== aiTool.slug).slice(0, 6)),
      getToolStats(aiTool.slug),
    ]);

    const toolPageUrl = `${BASE_URL}/${aiTool.slug}`;
    const toolImgUrl = aiTool.image.startsWith('http') ? aiTool.image : `${BASE_URL}${aiTool.image}`;

    const toolBreadcrumb = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
        { '@type': 'ListItem', position: 2, name: 'AI NSFW Tools', item: `${BASE_URL}/ainsfw` },
        { '@type': 'ListItem', position: 3, name: aiTool.name, item: toolPageUrl },
      ],
    };

    const toolWebPage = {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: `${aiTool.name} — ${aiTool.category} Tool Review`,
      description: aiTool.description,
      url: toolPageUrl,
      isPartOf: { '@type': 'WebSite', name: 'Erogram', url: BASE_URL },
      author: { '@type': 'Organization', name: 'Erogram.pro', url: BASE_URL },
    };

    const toolSoftware = {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: aiTool.name,
      description: aiTool.description,
      url: toolPageUrl,
      applicationCategory: 'EntertainmentApplication',
      operatingSystem: 'Web',
      offers: {
        '@type': 'Offer',
        price: aiTool.subscription.toLowerCase().includes('free') ? '0' : '0',
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
      },
      provider: { '@type': 'Organization', name: 'Erogram.pro', url: BASE_URL },
      image: toolImgUrl,
    };

    return (
      <>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(toolBreadcrumb) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(toolWebPage) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(toolSoftware) }} />
        <ToolDetailClient tool={aiTool} similar={similar} initialStats={toolStats} />
      </>
    );
  }

  // Try OnlyFans creator profile
  const creator = await getCreatorBySlug(slug);
  if (creator) {
    const [related, trendingOnErogram, reviewData] = await Promise.all([
      getRelatedCreators(creator.categories, creator.slug, 6),
      getTrendingOnErogram().catch(() => []),
      getCreatorReviews(creator.slug).catch(() => ({ reviews: [], avg: 0, count: 0 })),
    ]);
    const pageUrl = `${BASE_URL}/${creator.slug}`;

    const breadcrumbJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
        { '@type': 'ListItem', position: 2, name: 'Top OnlyFans Creators', item: `${BASE_URL}/Toponlyfanscreators` },
        { '@type': 'ListItem', position: 3, name: creator.name, item: pageUrl },
      ],
    };

    const webPageJsonLd: Record<string, any> = {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: `${creator.name} OnlyFans — @${creator.username}`,
      description: `${creator.name} OnlyFans profile. Browse photos, videos, and subscription info.`,
      url: pageUrl,
      isPartOf: { '@type': 'WebSite', name: 'Erogram', url: BASE_URL },
    };

    const personJsonLd: Record<string, any> = {
      '@context': 'https://schema.org',
      '@type': 'ProfilePage',
      mainEntity: {
        '@type': 'Person',
        name: creator.name,
        alternateName: `@${creator.username}`,
        url: pageUrl,
        ...(creator.avatar ? { image: creator.avatar } : {}),
        sameAs: [
          creator.url,
          creator.instagramUrl,
          creator.twitterUrl,
          creator.tiktokUrl,
        ].filter(Boolean),
      },
    };

    if (reviewData.count > 0) {
      personJsonLd.mainEntity.aggregateRating = {
        '@type': 'AggregateRating',
        ratingValue: reviewData.avg,
        ratingCount: reviewData.count,
        bestRating: 5,
        worstRating: 1,
      };
    } else if (creator.likesCount > 0) {
      const rating = Math.min(5, 3.5 + (Math.log10(Math.max(creator.likesCount, 1)) / Math.log10(5_000_000)) * 1.5);
      personJsonLd.mainEntity.aggregateRating = {
        '@type': 'AggregateRating',
        ratingValue: Math.round(rating * 10) / 10,
        ratingCount: creator.likesCount,
        bestRating: 5,
        worstRating: 1,
      };
    }

    const offerJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: `${creator.name} OnlyFans Subscription`,
      ...(creator.avatar ? { image: creator.avatar } : {}),
      url: pageUrl,
      offers: {
        '@type': 'Offer',
        price: creator.isFree ? '0' : creator.price > 0 ? creator.price.toFixed(2) : '0',
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
      },
    };

    return (
      <>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(offerJsonLd) }} />
        <CreatorProfileClient creator={creator} related={related} trendingOnErogram={trendingOnErogram} />
      </>
    );
  }

  // If nothing found, show not found
  notFound();
}
