'use server';

import connectDB from '@/lib/db/mongodb';
import { Group, OnlyFansCreator } from '@/lib/models';
import { OF_CATEGORY_MAP, ofCategoryUrl } from '@/app/onlyfanssearch/constants';
import { getBestOfFillCreators, getBestOfPreviewAvatars, getBestOfTopByClicks } from '@/lib/actions/bestOfCreators';
import { BEST_OF_PAGE_MAP, bestOfBlogSlug } from '@/app/best-onlyfans-accounts/bestOfPages';
import {
  getAllTagDefinitions,
  getTagDefinition,
  tagSortLetter,
  type TagDefinition,
} from '@/lib/tags/registry';
import { getTagLabel } from '@/lib/tags/labelTranslations';
import type { Locale } from '@/lib/i18n';
import { getRankingPagesForTag, type TagRankingPage } from '@/lib/tags/rankings';
import {
  buildBestOfCreatorMatch,
  buildSlugCreatorMatch,
  creatorQualityFilter,
} from '@/lib/tags/creatorMatch';

const MIN_CONTENT = 5;
const GROUP_BASE = {
  status: 'approved',
  isAdvertisement: { $ne: true },
  premiumOnly: { $ne: true },
  category: { $ne: 'Hentai' },
};

export interface TagIndexItem {
  slug: string;
  label: string;
  letter: string;
  groupCount: number;
  creatorCount: number;
  total: number;
}

export interface TagGroupResult {
  _id: string;
  name: string;
  slug: string;
  image: string;
  category: string;
  memberCount: number;
  description: string;
}

export interface TagCreatorResult {
  _id: string;
  name: string;
  username: string;
  slug: string;
  avatar: string;
  header?: string;
  likesCount: number;
  subscriberCount: number;
  photosCount: number;
  videosCount: number;
  price: number;
  isFree: boolean;
  url: string;
  categories: string[];
}

export interface TagTop10Block {
  label: string;
  href: string;
  categorySlug: string;
  creators: TagCreatorResult[];
}

function serializeCreator(c: any): TagCreatorResult {
  return {
    _id: c._id.toString(),
    name: c.name || '',
    username: c.username || '',
    slug: c.slug || c.username || '',
    avatar: c.avatar || '',
    header: c.header || '',
    likesCount: c.likesCount || 0,
    subscriberCount: c.subscriberCount || 0,
    photosCount: c.photosCount || 0,
    videosCount: c.videosCount || 0,
    price: c.price || 0,
    isFree: !!c.isFree,
    url: c.url || '',
    categories: c.categories || [],
  };
}

async function loadTop10ForPage(page: NonNullable<TagDefinition['bestOfPage']>): Promise<TagTop10Block | null> {
  const topByClicks = await getBestOfTopByClicks(page, 10);
  const used = new Set<string>();
  const organic: TagCreatorResult[] = [];

  for (const c of topByClicks as any[]) {
    if (organic.length >= 10) break;
    const uname = (c.username || '').toLowerCase();
    if (!uname || used.has(uname)) continue;
    used.add(uname);
    organic.push(serializeCreator(c));
  }

  if (organic.length < 10) {
    const fill = await getBestOfFillCreators(page, [...used], 10 - organic.length);
    for (const c of fill as any[]) {
      organic.push(serializeCreator(c));
    }
  }

  if (!organic.length) return null;

  return {
    label: page.label,
    href: `/onlyfanssearch/${bestOfBlogSlug(page.slug)}`,
    categorySlug: page.categorySlug || page.slug,
    creators: organic.slice(0, 10),
  };
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildGroupMatch(def: TagDefinition) {
  const labels = [...new Set(def.groupLabels.filter(Boolean))];
  if (!labels.length) return null;
  const or = labels.flatMap((label) => [
    { category: { $regex: `^${escapeRegex(label)}$`, $options: 'i' } },
    { categories: { $regex: `^${escapeRegex(label)}$`, $options: 'i' } },
  ]);
  return { ...GROUP_BASE, $or: or };
}

function buildCreatorMatch(def: TagDefinition) {
  if (def.bestOfPage) return buildBestOfCreatorMatch(def.bestOfPage);
  if (def.creatorCategorySlug) return buildSlugCreatorMatch(def.creatorCategorySlug);
  return null;
}

async function countGroups(def: TagDefinition): Promise<number> {
  const match = buildGroupMatch(def);
  if (!match) return 0;
  return Group.countDocuments(match);
}

async function countCreators(def: TagDefinition): Promise<number> {
  const match = buildCreatorMatch(def);
  if (!match) return 0;
  return OnlyFansCreator.countDocuments(match);
}

async function getGroupCategoryCounts(): Promise<Map<string, number>> {
  const rows = await Group.aggregate([
    { $match: GROUP_BASE },
    {
      $project: {
        cats: {
          $setUnion: [
            {
              $cond: [
                {
                  $and: [
                    { $ne: ['$category', null] },
                    { $ne: ['$category', ''] },
                    { $ne: ['$category', 'All'] },
                  ],
                },
                ['$category'],
                [],
              ],
            },
            { $ifNull: ['$categories', []] },
          ],
        },
      },
    },
    { $unwind: '$cats' },
    { $match: { cats: { $nin: [null, '', 'All'] } } },
    { $group: { _id: { $toLower: '$cats' }, count: { $sum: 1 } } },
  ]);
  return new Map(rows.map((r: { _id: string; count: number }) => [r._id, r.count]));
}

async function getCreatorSlugCounts(): Promise<Map<string, number>> {
  const rows = await OnlyFansCreator.aggregate([
    { $match: creatorQualityFilter },
    { $unwind: '$categories' },
    { $group: { _id: '$categories', count: { $sum: 1 } } },
  ]);
  return new Map(rows.map((r: { _id: string; count: number }) => [r._id, r.count]));
}

function groupCountFromMap(def: TagDefinition, groupMap: Map<string, number>): number {
  let total = 0;
  const seen = new Set<string>();
  for (const label of def.groupLabels) {
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    total += groupMap.get(key) || 0;
  }
  return total;
}

function creatorCountFromMap(def: TagDefinition, slugMap: Map<string, number>): number {
  if (def.creatorCategorySlug) return slugMap.get(def.creatorCategorySlug) || 0;
  if (def.bestOfPage?.match === 'category' && def.bestOfPage.categorySlug) {
    return slugMap.get(def.bestOfPage.categorySlug) || 0;
  }
  return 0;
}

export async function getTagIndex(locale: Locale = 'en'): Promise<TagIndexItem[]> {
  await connectDB();
  const defs = getAllTagDefinitions();
  const [groupMap, slugMap] = await Promise.all([getGroupCategoryCounts(), getCreatorSlugCounts()]);

  const keywordDefs = defs.filter(
    (d) => d.bestOfPage?.match === 'keyword' && !d.creatorCategorySlug,
  );
  const keywordCounts = await Promise.all(
    keywordDefs.map(async (d) => {
      const match = buildCreatorMatch(d);
      const count = match ? await OnlyFansCreator.countDocuments(match) : 0;
      return [d.slug, count] as const;
    }),
  );
  const keywordMap = new Map(keywordCounts);

  const items: TagIndexItem[] = [];

  for (const def of defs) {
    let groupCount = groupCountFromMap(def, groupMap);
    let creatorCount = creatorCountFromMap(def, slugMap);

    if (def.bestOfPage?.match === 'keyword') {
      creatorCount = keywordMap.get(def.slug) ?? 0;
    } else if (def.creatorCategorySlug) {
      creatorCount = slugMap.get(def.creatorCategorySlug) ?? 0;
    }

    const total = groupCount + creatorCount;
    if (total <= MIN_CONTENT) continue;

    const label = getTagLabel(def.slug, def.label, locale);
    items.push({
      slug: def.slug,
      label,
      letter: tagSortLetter(label),
      groupCount,
      creatorCount,
      total,
    });
  }

  return items.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
}

export async function getTagDetail(slug: string, locale: Locale = 'en') {
  const def = getTagDefinition(slug);
  if (!def) return null;

  await connectDB();

  const groupMatch = buildGroupMatch(def);
  const creatorMatch = buildCreatorMatch(def);
  const rankingPages = getRankingPagesForTag(def);
  const primaryPage = def.bestOfPage;
  const categorySlug = def.creatorCategorySlug || (OF_CATEGORY_MAP.has(slug) ? slug : undefined);
  const categoryBrowseHref = categorySlug ? ofCategoryUrl(categorySlug) : null;

  const rankingSlugs = rankingPages.map((p) => p.slug);
  const rankingPageDefs = rankingSlugs
    .map((s) => BEST_OF_PAGE_MAP.get(s))
    .filter(Boolean) as NonNullable<TagDefinition['bestOfPage']>[];

  const [groupCount, creatorCount, groups, top10, previewAvatars, browseCreatorsRaw] = await Promise.all([
    groupMatch ? Group.countDocuments(groupMatch) : Promise.resolve(0),
    creatorMatch ? OnlyFansCreator.countDocuments(creatorMatch) : Promise.resolve(0),
    groupMatch
      ? Group.find(groupMatch)
          .sort({ memberCount: -1, createdAt: -1 })
          .limit(24)
          .select('name slug image category memberCount description description_de description_es')
          .lean()
      : Promise.resolve([]),
    primaryPage ? loadTop10ForPage(primaryPage) : Promise.resolve(null),
    rankingPageDefs.length
      ? getBestOfPreviewAvatars(rankingPageDefs, 4).catch(() => ({} as Record<string, string[]>))
      : Promise.resolve({} as Record<string, string[]>),
    creatorMatch
      ? OnlyFansCreator.find(creatorMatch)
          .sort({ clicks: -1, likesCount: -1 })
          .limit(48)
          .select(
            'name username slug avatar header likesCount subscriberCount photosCount videosCount price isFree url categories',
          )
          .lean()
      : Promise.resolve([]),
  ]);

  const top10Usernames = new Set(
    (top10?.creators || []).map((c) => c.username.toLowerCase()).filter(Boolean),
  );

  const browseCreators = (browseCreatorsRaw as any[])
    .filter((c) => !top10Usernames.has((c.username || '').toLowerCase()))
    .slice(0, 24)
    .map(serializeCreator);

  const rankingPagesWithAvatars = rankingPages.map((rp) => ({
    ...rp,
    previewAvatars: previewAvatars[rp.slug] || [],
  }));

  const total = groupCount + creatorCount;
  if (total <= MIN_CONTENT) return null;

  const label = getTagLabel(def.slug, def.label, locale);
  return {
    slug: def.slug,
    label,
    groupCount,
    creatorCount,
    total,
    categoryBrowseHref,
    rankingPages: rankingPagesWithAvatars,
    top10,
    groups: (groups as any[]).map((g) => ({
      _id: g._id.toString(),
      name: g.name || '',
      slug: g.slug || '',
      image: g.image || '',
      category: g.category || '',
      memberCount: g.memberCount || 0,
      description: (g.description || '').slice(0, 120),
    })) as TagGroupResult[],
    creators: browseCreators,
  };
}
