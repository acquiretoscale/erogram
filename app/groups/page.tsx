import { Metadata } from 'next';
import Link from 'next/link';
import { headers } from 'next/headers';
import connectDB from '@/lib/db/mongodb';
import { Group, Bot, StorySlideContent, SiteConfig } from '@/lib/models';
import GroupsClient from './GroupsClient';
import { detectDeviceFromUserAgent } from '@/lib/utils/device';
import ErrorBoundary from '@/components/ErrorBoundary';
import { getActiveCampaigns, getActiveFeedCampaigns } from '@/lib/actions/campaigns';
import { getStoryCategories, DEFAULT_STORY_CATEGORIES, type StoryCategoryConfig } from '@/lib/actions/siteConfig';
import { listR2Files } from '@/lib/r2';
import type { StoryCategory, StoryMediaSlide } from './types';
import { getLocale, getPathname } from '@/lib/i18n/server';
import { getDictionary, LOCALES, localePath } from '@/lib/i18n';

const canonicalBase = 'https://erogram.pro';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const pathname = await getPathname();
  const dict = await getDictionary(locale);

  return {
    title: dict.meta.groupsTitle,
    description: dict.meta.groupsDesc,
    alternates: {
      canonical: `${canonicalBase}${pathname === '/' ? '' : pathname}`,
      languages: Object.fromEntries(
        LOCALES.map(l => [l, `${canonicalBase}${localePath('/groups', l)}`])
      ),
    },
    openGraph: {
      title: dict.meta.groupsTitle,
      description: dict.meta.groupsDesc,
      type: 'website',
      url: `${canonicalBase}${pathname}`,
      images: [{ url: `${canonicalBase}/assets/og-default.png`, width: 512, height: 512, alt: 'Erogram - Telegram Groups' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: dict.meta.groupsTitle,
      description: dict.meta.groupsDesc,
      images: [`${canonicalBase}/assets/og-default.png`],
    },
  };
}

// Always fetch fresh data so new banner/feed campaigns show immediately after admin adds them
export const dynamic = 'force-dynamic';

async function getGroups(limit: number, isMobile: boolean = false, locale: string = 'en') {
  try {
    await connectDB();

    // Use random sampling for better discovery experience. Exclude Group-based "advert" rows
    // so in-feed ads come only from Campaigns (Advertisers → By slot → In-Feed).
    const groups = await Group.aggregate([
      { $match: { status: 'approved', isAdvertisement: { $ne: true }, premiumOnly: { $ne: true }, category: { $ne: 'Hentai' } } },
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
          description: isMobile ? { $substr: ['$description', 0, 100] } : 1,
          description_de: 1,
          description_es: 1,
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
      description: (() => { const df = locale === 'de' ? 'description_de' : locale === 'es' ? 'description_es' : ''; return ((df && group[df]) ? group[df] : (group.description || '')).slice(0, 150); })(),
      image: (group.image && typeof group.image === 'string' && group.image.startsWith('https://')) ? group.image : (process.env.NEXT_PUBLIC_PLACEHOLDER_IMAGE_URL || '/assets/placeholder-no-image.png'),
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

const PLACEHOLDER = process.env.NEXT_PUBLIC_PLACEHOLDER_IMAGE_URL || '/assets/placeholder-no-image.png';

function sanitizeImg(url: unknown): string {
  if (url && typeof url === 'string' && url.startsWith('https://')) return url;
  return PLACEHOLDER;
}

function mapGroup(g: any, locale: string = 'en') {
  const descField = locale === 'de' ? 'description_de' : locale === 'es' ? 'description_es' : '';
  const desc = (descField && g[descField]) ? g[descField] : (g.description || '');
  return {
    _id: g._id.toString(),
    name: (g.name || '').slice(0, 100),
    slug: g.slug || '',
    image: sanitizeImg(g.image),
    videoUrl: (g.videoUrl && typeof g.videoUrl === 'string' && g.videoUrl.startsWith('https://')) ? g.videoUrl : undefined,
    category: g.category || '',
    country: g.country || '',
    description: desc.slice(0, 80),
    createdAt: g.createdAt ? new Date(g.createdAt).toISOString() : undefined,
    memberCount: typeof g.memberCount === 'number' ? g.memberCount : 0,
  };
}

function pickRandom<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

async function getStoryData(categories: StoryCategoryConfig[], locale: string = 'en'): Promise<StoryCategory[]> {
  try {
    await connectDB();
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const results = await Promise.all(
      categories.map(async (cat): Promise<StoryCategory> => {
        const limit = cat.maxItems ?? 3;

        // ── EROGRAM: newest groups (24h) + admin announcements ──
        if (cat.filterType === 'erogram') {
          const [groups, announcements] = await Promise.all([
            Group.find({
              status: 'approved',
              isAdvertisement: { $ne: true },
              premiumOnly: { $ne: true },
              hideFromStories: { $ne: true },
              createdAt: { $gte: twentyFourHoursAgo },
            })
              .sort({ createdAt: -1 })
              .limit(limit)
              .select('name slug image videoUrl category country description description_de description_es createdAt memberCount')
              .lean(),
            StorySlideContent.find({
              categorySlug: cat.slug,
              enabled: true,
              $or: [{ expiresAt: null }, { expiresAt: { $gte: new Date() } }],
            })
              .sort({ sortOrder: 1, createdAt: -1 })
              .lean(),
          ]);

          // Fallback if no groups in last 24h
          let finalGroups = groups;
          if (finalGroups.length === 0) {
            finalGroups = await Group.find({ status: 'approved', isAdvertisement: { $ne: true }, premiumOnly: { $ne: true }, hideFromStories: { $ne: true } })
              .sort({ createdAt: -1 })
              .limit(3)
              .select('name slug image videoUrl category country description description_de description_es createdAt memberCount')
              .lean();
          }

          const mediaSlides: StoryMediaSlide[] = (announcements as any[]).map((a) => ({
            _id: a._id.toString(),
            mediaType: a.mediaType,
            mediaUrl: a.mediaUrl || '',
            ctaText: a.ctaText || '',
            ctaUrl: a.ctaUrl || '',
            caption: a.caption || '',
            likes: a.likes ?? 0,
            premiumGroups: a.premiumGroups?.map((g: any) => ({
              name: g.name || '',
              slug: g.slug || '',
              image: g.image || '',
              memberCount: g.memberCount ?? 0,
              category: g.category || '',
            })),
          }));

          const hasNewContent = finalGroups.some((g: any) => new Date(g.createdAt) > twentyFourHoursAgo) || mediaSlides.length > 0;

          return {
            slug: cat.slug, label: cat.label, profileImage: cat.profileImage || '',
            hasNewContent, verified: cat.verified, ctaText: cat.ctaText, ctaUrl: cat.ctaUrl,
            r2Folder: cat.r2Folder, storyType: 'erogram',
            groups: finalGroups.map(g => mapGroup(g, locale)),
            mediaSlides,
          };
        }

        // ── RANDOM GIRL: R2 media + label from config (Vicky / Carla) ──
        if (cat.filterType === 'random-girl') {
          const name = cat.label || 'Vicky';

          const r2Folder = cat.r2Folder || 'tgempire/instabaddies';
          let r2Files: string[] = [];
          try {
            r2Files = await listR2Files(r2Folder, { maxSizeMB: 5 });
          } catch { /* R2 unavailable */ }

          const picked = pickRandom(r2Files, limit);

          // Check if admin has set a CTA for this category
          const adminSlides = await StorySlideContent.find({
            categorySlug: cat.slug,
            enabled: true,
            $or: [{ expiresAt: null }, { expiresAt: { $gte: new Date() } }],
          }).sort({ sortOrder: 1 }).lean();

          const mediaSlides: StoryMediaSlide[] = picked.map((url, i) => {
            const ext = url.toLowerCase();
            const isVideo = ext.endsWith('.mp4') || ext.endsWith('.webm') || ext.endsWith('.mov');
            const admin = (adminSlides as any[])[0];
            return {
              _id: `rg-${cat.slug}-${i}`,
              mediaType: isVideo ? 'video' : 'image' as const,
              mediaUrl: url,
              ctaText: admin?.ctaText || cat.ctaText || '',
              ctaUrl: admin?.ctaUrl || cat.ctaUrl || '',
            };
          });

          const profileImage = cat.profileImage || (picked[0] ?? '');

          return {
            slug: cat.slug, label: name, profileImage,
            hasNewContent: mediaSlides.length > 0,
            verified: false, ctaText: cat.ctaText, ctaUrl: cat.ctaUrl,
            r2Folder: cat.r2Folder, storyType: 'random-girl',
            groups: [],
            mediaSlides,
          };
        }

        // ── ADVERT (AI GF): admin-managed ad slides, no time limit ──
        if (cat.filterType === 'advert') {
          const adminSlides = await StorySlideContent.find({
            categorySlug: cat.slug,
            enabled: true,
          })
            .sort({ sortOrder: 1, createdAt: -1 })
            .lean();

          let mediaSlides: StoryMediaSlide[] = (adminSlides as any[]).map((a) => ({
            _id: a._id.toString(),
            mediaType: a.mediaType,
            mediaUrl: a.mediaUrl,
            ctaText: a.ctaText || '',
            ctaUrl: a.ctaUrl || '',
            clientName: a.clientName || '',
            caption: a.caption || '',
            likes: a.likes ?? 0,
          }));

          // Fallback: if no admin slides yet, pick from R2
          if (mediaSlides.length === 0) {
            const r2Folder = cat.r2Folder || 'stories/AI-GF';
            let r2Files: string[] = [];
            try {
              r2Files = await listR2Files(r2Folder, { maxSizeMB: 5 });
              if (r2Files.length === 0 && r2Folder !== 'stories/AI-GF') {
                r2Files = await listR2Files('stories/AI-GF', { maxSizeMB: 5 });
              }
            } catch { /* R2 unavailable */ }
            mediaSlides = pickRandom(r2Files, limit).map((url, i) => {
              const isVideo = /\.(mp4|webm|mov)$/i.test(url);
              return {
                _id: `ad-${cat.slug}-${i}`,
                mediaType: isVideo ? 'video' : 'image' as const,
                mediaUrl: url,
                ctaText: cat.ctaText || '',
                ctaUrl: cat.ctaUrl || '',
              };
            });
          }

          return {
            slug: cat.slug, label: cat.label, profileImage: cat.profileImage || '',
            hasNewContent: true, verified: cat.verified, ctaText: cat.ctaText, ctaUrl: cat.ctaUrl,
            r2Folder: cat.r2Folder, storyType: 'advert',
            groups: [],
            mediaSlides,
          };
        }

        // Fallback (shouldn't happen with new defaults)
        return {
          slug: cat.slug, label: cat.label, profileImage: cat.profileImage || '',
          hasNewContent: false, verified: false,
          r2Folder: cat.r2Folder, storyType: cat.filterType,
          groups: [], mediaSlides: [],
        };
      }),
    );

    return results;
  } catch (error) {
    console.error('Error fetching story data:', error);
    return [];
  }
}

export default async function GroupsPage() {
  const ua = (await headers()).get('user-agent');
  const { isMobile, isTelegram } = detectDeviceFromUserAgent(ua);
  const locale = await getLocale();

  // Render a small, SEO-safe first page
  const groups = await getGroups(12, isMobile, locale);

  // Check if stories are enabled
  await connectDB();
  const siteConf = await SiteConfig.findOne({}).select('generalSettings').lean() as any;
  const storiesEnabled = siteConf?.generalSettings?.showStories !== false;

  // Fetch story category config (from DB or defaults)
  let storyConfig = await getStoryCategories();
  if (storyConfig.length === 0) storyConfig = DEFAULT_STORY_CATEGORIES;

  // In-feed ads + story data — all in parallel
  const [topBannerCampaigns, feedCampaigns, storyData] = await Promise.all([
    getActiveCampaigns('top-banner'),
    getActiveFeedCampaigns('groups'),
    storiesEnabled ? getStoryData(storyConfig, locale) : Promise.resolve([] as StoryCategory[]),
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
          storyData={storyData}
        />
      </ErrorBoundary>
    </>
  );
}
