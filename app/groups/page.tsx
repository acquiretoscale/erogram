import { Metadata } from 'next';
import Link from 'next/link';
import connectDB from '@/lib/db/mongodb';
import { Group, Bot, StorySlideContent, SiteConfig } from '@/lib/models';
import GroupsClient from './GroupsClient';
import ErrorBoundary from '@/components/ErrorBoundary';
import { getActiveCampaigns, getActiveFeedCampaigns, getTrendingErogramCampaigns } from '@/lib/actions/campaigns';
import { getFeaturedCreatorFeedItems } from '@/lib/actions/publicData';
import { getStoryCategories, DEFAULT_STORY_CATEGORIES, type StoryCategoryConfig } from '@/lib/actions/siteConfig';
import { listR2Files } from '@/lib/r2';
import type { StoryCategory, StoryMediaSlide } from './types';
import { getLocale, getPathname } from '@/lib/i18n/server';
import { getDictionary, LOCALES, localePath } from '@/lib/i18n';
import { filterCategories, GROUPS_FEED_PAGE_SIZE, TRENDING_CATEGORY_MIN_COUNT, categorySlug } from './constants';
import { buildSocialMeta, CANONICAL_BASE } from '@/lib/seo/socialMeta';

const canonicalBase = CANONICAL_BASE;

// Which filter entries are countries vs content categories (countries live in the same list).
const COUNTRY_FILTERS = new Set([
  'Argentina', 'Brazil', 'China', 'Colombia', 'France', 'Germany', 'Italy', 'Japan',
  'Mexico', 'Philippines', 'Russian', 'Spain', 'UK', 'Ukraine', 'USA', 'Vietnam',
]);

// Build the category + country filter options, keeping only entries that have ≥1 listing.
async function getFilterOptions(): Promise<{ categories: string[]; countries: string[]; categoryCounts: Array<{ name: string; count: number }> }> {
  try {
    await connectDB();
    // Count across public + vault listings (category, categories, country, vaultCategories),
    // including premium/vault groups, so high-content categories surface even when most of
    // their depth lives in the vault. Only 'All'/'Hentai' are excluded.
    const base = { status: 'approved', isAdvertisement: { $ne: true }, category: { $ne: 'Hentai' } };
    const counts = await Promise.all(
      filterCategories.map(async (c) => ({
        name: c,
        count: await Group.countDocuments({ ...base, $or: [{ categories: c }, { category: c }, { country: c }, { vaultCategories: c }] }),
      }))
    );
    const live = counts.filter((c) => c.count > 0);
    const categoryCounts = live.filter((c) => !COUNTRY_FILTERS.has(c.name)).sort((a, b) => b.count - a.count);
    return {
      categories: categoryCounts.map((c) => c.name),
      countries: live.filter((c) => COUNTRY_FILTERS.has(c.name)).sort((a, b) => b.count - a.count).map((c) => c.name),
      categoryCounts,
    };
  } catch {
    return { categories: [], countries: [], categoryCounts: [] };
  }
}

// Trending group categories: EVERY content category with 20+ listings (public + vault),
// highest count first. Each links to the /groups feed filtered to that category
// (newest-first) as a crawlable, descriptive category view so Google understands
// the topic + depth. Fully dynamic — grows as categories cross the threshold.
function toTrendingCategoryLinks(categoryCounts: Array<{ name: string; count: number }>): Array<{ label: string; title: string; href: string }> {
  return categoryCounts
    .filter((c) => c.count >= TRENDING_CATEGORY_MIN_COUNT)
    .map((c) => ({
      label: c.name,
      title: `${c.name} Telegram groups`,
      href: `/groups?category=${encodeURIComponent(c.name)}`,
    }));
}

// Countries keep their existing trending treatment (top entries by count).
function toTrendingLinks(names: string[]): Array<{ label: string; href: string }> {
  return names.slice(0, 8).map((name) => ({
    label: name,
    href: `/best-telegram-groups/${categorySlug(name)}`,
  }));
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const pathname = await getPathname();
  const dict = await getDictionary(locale);

  const canonical = `${canonicalBase}${pathname === '/' ? '' : pathname}`;

  return {
    title: dict.meta.groupsTitle,
    description: dict.meta.groupsDesc,
    alternates: {
      canonical,
    },
    ...buildSocialMeta({
      title: dict.meta.groupsTitle,
      description: dict.meta.groupsDesc,
      url: `${canonicalBase}${pathname}`,
      type: 'website',
      imageAlt: 'Erogram - Telegram Groups',
    }),
  };
}

export const dynamic = 'force-dynamic';

async function getGroups(limit: number, isMobile: boolean = false, locale: string = 'en', skip: number = 0) {
  try {
    await connectDB();

    // Stable newest-first feed (pinned → createdAt).
    const groups = await Group.aggregate([
      { $match: { status: 'approved', isAdvertisement: { $ne: true }, premiumOnly: { $ne: true }, category: { $ne: 'Hentai' } } },
      { $sort: { pinned: -1, createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
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

const approvedGroupsFilter = {
  status: 'approved' as const,
  isAdvertisement: { $ne: true },
  premiumOnly: { $ne: true },
  category: { $ne: 'Hentai' },
};

async function getApprovedGroupsCount(): Promise<number> {
  try {
    await connectDB();
    return Group.countDocuments(approvedGroupsFilter);
  } catch {
    return 0;
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

        // ── EROGRAM: newest groups (24h) + admin slides (synced R2 or uploaded) ──
        if (cat.filterType === 'erogram') {
          const r2Folder = cat.r2Folder || '';
          const [groups, dbSlides] = await Promise.all([
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

          let finalGroups = groups;
          if (finalGroups.length === 0) {
            finalGroups = await Group.find({ status: 'approved', isAdvertisement: { $ne: true }, premiumOnly: { $ne: true }, hideFromStories: { $ne: true } })
              .sort({ createdAt: -1 })
              .limit(3)
              .select('name slug image videoUrl category country description description_de description_es createdAt memberCount')
              .lean();
          }

          const mediaSlides: StoryMediaSlide[] = (dbSlides as any[]).map((a) => ({
            _id: a._id.toString(),
            mediaType: a.mediaType,
            mediaUrl: a.mediaUrl || '',
            ctaText: a.ctaText || '',
            ctaUrl: a.ctaUrl || '',
            ctaPosition: a.ctaPosition || 'bottom',
            ctaColor: a.ctaColor || 'blue',
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

          // Only fall back to raw R2 listing if no DB records exist at all
          if (mediaSlides.length === 0 && r2Folder) {
            try {
              const r2Files = await listR2Files(r2Folder, { maxSizeMB: 5 });
              const picked = pickRandom(r2Files, limit);
              for (let i = 0; i < picked.length; i++) {
                const url = picked[i];
                const isVideo = /\.(mp4|webm|mov)$/i.test(url);
                mediaSlides.push({
                  _id: `ero-r2-${cat.slug}-${i}`,
                  mediaType: isVideo ? 'video' : 'image',
                  mediaUrl: url,
                  ctaText: cat.ctaText || '',
                  ctaUrl: cat.ctaUrl || '',
                  ctaPosition: cat.ctaPosition || 'bottom',
                  ctaColor: cat.ctaColor || 'blue',
                });
              }
            } catch { /* R2 unavailable */ }
          }

          const hasNewContent = finalGroups.some((g: any) => new Date(g.createdAt) > twentyFourHoursAgo) || mediaSlides.length > 0;

          return {
            slug: cat.slug, label: cat.label, profileImage: cat.profileImage || '',
            hasNewContent, verified: cat.verified, ctaText: cat.ctaText, ctaUrl: cat.ctaUrl,
            r2Folder: cat.r2Folder, storyType: 'erogram',
            groups: finalGroups.map(g => mapGroup(g, locale)),
            mediaSlides,
          };
        }

        // ── RANDOM GIRL: synced DB slides first, fallback to R2 listing ──
        if (cat.filterType === 'random-girl') {
          const name = cat.label || 'Vicky';

          const dbSlides = await StorySlideContent.find({
            categorySlug: cat.slug,
            enabled: true,
            $or: [{ expiresAt: null }, { expiresAt: { $gte: new Date() } }],
          }).sort({ sortOrder: 1, createdAt: -1 }).lean();

          let mediaSlides: StoryMediaSlide[];

          if ((dbSlides as any[]).length > 0) {
            // Per-slide records exist (synced from R2 or manually uploaded) — use each one's own settings
            const picked = pickRandom(dbSlides as any[], limit);
            mediaSlides = picked.map((a: any) => ({
              _id: a._id.toString(),
              mediaType: a.mediaType,
              mediaUrl: a.mediaUrl || '',
              ctaText: a.ctaText || cat.ctaText || '',
              ctaUrl: a.ctaUrl || cat.ctaUrl || '',
              ctaPosition: a.ctaPosition || cat.ctaPosition || 'bottom',
              ctaColor: a.ctaColor || cat.ctaColor || 'blue',
              caption: a.caption || '',
              likes: a.likes ?? 0,
            }));
          } else {
            // No synced records — dynamic R2 listing with category defaults
            const r2Folder = cat.r2Folder || 'tgempire/instabaddies';
            let r2Files: string[] = [];
            try { r2Files = await listR2Files(r2Folder, { maxSizeMB: 5 }); } catch { /* */ }
            mediaSlides = pickRandom(r2Files, limit).map((url, i) => {
              const isVideo = /\.(mp4|webm|mov)$/i.test(url);
              return {
                _id: `rg-${cat.slug}-${i}`,
                mediaType: isVideo ? 'video' : 'image' as const,
                mediaUrl: url,
                ctaText: cat.ctaText || '',
                ctaUrl: cat.ctaUrl || '',
                ctaPosition: cat.ctaPosition || 'bottom',
                ctaColor: cat.ctaColor || 'blue',
              };
            });
          }

          const profileImage = cat.profileImage || (mediaSlides[0]?.mediaUrl ?? '');

          return {
            slug: cat.slug, label: name, profileImage,
            hasNewContent: mediaSlides.length > 0,
            verified: cat.verified, ctaText: cat.ctaText, ctaUrl: cat.ctaUrl,
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
            ctaPosition: a.ctaPosition || 'bottom',
            ctaColor: a.ctaColor || 'blue',
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
                ctaPosition: cat.ctaPosition || 'bottom',
                ctaColor: cat.ctaColor || 'blue',
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

async function getVaultTeaser() {
  try {
    await connectDB();
    let groups = await Group.find({ showOnVaultTeaser: true, premiumOnly: true, status: 'approved' })
      .sort({ vaultTeaserOrder: 1 })
      .select('name image category categories country memberCount vaultTeaserOrder vaultCategories')
      .lean();

    if (groups.length > 12) {
      const shuffled = [...groups].sort(() => Math.random() - 0.5);
      groups = shuffled.slice(0, 12);
    }

    if (groups.length === 0) {
      groups = await Group.find({ premiumOnly: true, status: 'approved' })
        .sort({ createdAt: -1 })
        .limit(12)
        .select('name image category categories country memberCount vaultCategories')
        .lean();
    }

    return (groups as any[]).map(g => ({
      _id: g._id.toString(),
      name: (g.name || '') as string,
      image: (g.image || '') as string,
      category: (g.category || '') as string,
      categories: (g as any).categories || [],
      country: (g.country || '') as string,
      memberCount: (g.memberCount || 0) as number,
      vaultCategories: (g as any).vaultCategories || [],
    }));
  } catch {
    return [];
  }
}

export async function GroupsPageView({ page = 1 }: { page?: number }) {
  const currentPage = Math.max(1, page);
  const locale = await getLocale();

  const [groups, totalGroups] = await Promise.all([
    getGroups(GROUPS_FEED_PAGE_SIZE, false, locale, (currentPage - 1) * GROUPS_FEED_PAGE_SIZE),
    getApprovedGroupsCount(),
  ]);
  const paginationTotalPages = Math.max(1, Math.ceil(totalGroups / GROUPS_FEED_PAGE_SIZE));

  // Check if stories are enabled
  await connectDB();
  const siteConf = await SiteConfig.findOne({}).select('generalSettings').lean() as any;
  const storiesEnabled = siteConf?.generalSettings?.showStories !== false;

  // Fetch story category config (from DB or defaults)
  let storyConfig = await getStoryCategories();
  if (storyConfig.length === 0) storyConfig = DEFAULT_STORY_CATEGORIES;

  // In-feed ads + story data + vault teaser + featured creators + trending + filter options — all in parallel
  const [topBannerCampaigns, feedCampaignsRaw, storyData, vaultTeaserGroupsRaw, featuredCreatorItems, filterOpts, trendingErogramCampaigns] = await Promise.all([
    getActiveCampaigns('top-banner', { page: 'groups' }),
    getActiveFeedCampaigns('groups'),
    storiesEnabled ? getStoryData(storyConfig, locale) : Promise.resolve([] as StoryCategory[]),
    getVaultTeaser(),
    getFeaturedCreatorFeedItems().catch(() => []),
    getFilterOptions(),
    getTrendingErogramCampaigns(8).catch(() => []),
  ]);

  // Two trending rows derived from the already-sorted filter options (top 6 each).
  const trendingCategories = toTrendingCategoryLinks(filterOpts.categoryCounts);
  const trendingCountries = toTrendingLinks(filterOpts.countries);

  // The EROGRAM PREMIUM in-feed teaser is a native-looking house post (click → /premium).
  // It is INDEPENDENT of the Ad Network — always shown, never tied to any campaign/stats.
  const vaultTeaserGroups = vaultTeaserGroupsRaw;

  // AGNOSTIC SLOTS: every ad — including OF creators assigned in /admin/ad-network —
  // keeps its assigned slot and rotates with any other adType in that slot.
  // The Ad Network campaigns (feedCampaignsRaw) are the source of truth and are NOT
  // discarded. The old TrendingOFCreator "featured" source is only a FALLBACK to fill
  // Top-Groups/in-feed slots that no Ad Network OF creator already claims.
  const adNetworkAll = feedCampaignsRaw as any[];

  // OF creators already promoted via the Ad Network (by their TrendingOFCreator id / username),
  // so the fallback source never double-shows the same creator.
  const claimedOfKeys = new Set(
    adNetworkAll
      .filter((c) => c.adType === 'onlyfans-creator')
      .map((c) => c.ofTrendingId || c.ofUsername)
      .filter(Boolean),
  );

  const fallbackCreatorAds = (featuredCreatorItems as any[]).filter(
    (c) => !claimedOfKeys.has(c.ofTrendingId) && !claimedOfKeys.has(c.ofUsername),
  );

  const feedCampaigns = [...adNetworkAll, ...fallbackCreatorAds];

  const topBannerForPage =
    topBannerCampaigns.length > 0 && topBannerCampaigns[0].creative ? topBannerCampaigns : [];

  return (
    <>
      <nav aria-label="Groups pagination" className="sr-only">
        <Link href="/groups">Groups page 1</Link>
        {Array.from({ length: paginationTotalPages - 1 }, (_, i) => i + 2).map((p) => (
          <Link key={p} href={`/groups/page/${p}`}>{`Groups page ${p}`}</Link>
        ))}
      </nav>

      <ErrorBoundary>
        <GroupsClient
          initialGroups={groups}
          feedCampaigns={feedCampaigns}
          initialIsMobile={false}
          initialIsTelegram={false}
          topBannerCampaigns={topBannerForPage}
          storyData={storyData}
          vaultTeaserGroups={vaultTeaserGroups}
          trendingCategories={trendingCategories}
          trendingCountries={trendingCountries}
          categoryOptions={filterOpts.categories}
          countryOptions={filterOpts.countries}
          trendingErogramCampaigns={trendingErogramCampaigns}
          paginationCurrentPage={currentPage}
          paginationTotalPages={paginationTotalPages}
          groupsPageSize={GROUPS_FEED_PAGE_SIZE}
        />
      </ErrorBoundary>
    </>
  );
}

export default async function GroupsPage() {
  return GroupsPageView({ page: 1 });
}

