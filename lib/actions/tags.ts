'use server';

import connectDB from '@/lib/db/mongodb';
import { AINsfwSubmission, Bot, Group, OnlyFansCreator } from '@/lib/models';
import { AI_NSFW_TOOLS } from '@/app/ainsfw/data';
import { OF_CATEGORY_SLUGS } from '@/app/ofsearch/constants';
import { getKeywordCategoryPatterns } from '@/lib/ofsearch/keywordCategories';
import {
  getAllTagDefinitions,
  getTagDefinition,
  tagSortLetter,
  type TagDefinition,
} from '@/lib/tags/registry';
import { getTagLabel } from '@/lib/tags/labelTranslations';
import type { Locale } from '@/lib/i18n';
import { getRankingPagesForTag } from '@/lib/tags/rankings';
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
const BOT_BASE = {
  status: 'approved',
  isAdvertisement: { $ne: true },
};
const AINSFW_BASE = { status: 'approved' };

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

export interface TagBotResult {
  _id: string;
  name: string;
  slug: string;
  image: string;
  category: string;
  description: string;
}

export interface TagAiToolResult {
  slug: string;
  name: string;
  image: string;
  category: string;
  description: string;
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function archiveSearchTerms(def: TagDefinition): string[] {
  const terms = new Set<string>();
  if (def.label) terms.add(def.label);
  terms.add(def.slug.replace(/-/g, ' '));
  for (const p of getKeywordCategoryPatterns(def.slug) || []) {
    const clean = p.replace(/\\b/g, '').trim();
    if (clean.length >= 3) terms.add(clean);
  }
  return [...terms];
}

function buildArchiveTextRegex(def: TagDefinition): RegExp | null {
  const terms = archiveSearchTerms(def).map(escapeRegex).filter(Boolean);
  if (!terms.length) return null;
  return new RegExp(terms.join('|'), 'i');
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

function buildBotMatch(def: TagDefinition) {
  const regex = buildArchiveTextRegex(def);
  if (!regex) return null;
  return {
    ...BOT_BASE,
    $or: [
      { name: regex },
      { description: regex },
      { category: regex },
      { categories: regex },
    ],
  };
}

function buildAiDbMatch(def: TagDefinition) {
  const regex = buildArchiveTextRegex(def);
  if (!regex) return null;
  return {
    ...AINSFW_BASE,
    $or: [
      { name: regex },
      { description: regex },
      { category: regex },
      { tags: regex },
      { categories: regex },
    ],
  };
}

function filterStaticAiTools(def: TagDefinition): TagAiToolResult[] {
  const regex = buildArchiveTextRegex(def);
  if (!regex) return [];
  return AI_NSFW_TOOLS.filter((t) =>
    regex.test(`${t.name} ${t.description} ${t.category} ${(t.tags || []).join(' ')}`),
  )
    .slice(0, 24)
    .map((t) => ({
      slug: t.slug,
      name: t.name,
      image: t.image || '/assets/image.jpg',
      category: t.category,
      description: (t.description || '').slice(0, 120),
    }));
}

async function countOfBrowseCreators(): Promise<Map<string, number>> {
  const slugs = [...OF_CATEGORY_SLUGS];
  const pairs = await Promise.all(
    slugs.map(async (slug) => {
      const count = await OnlyFansCreator.countDocuments(buildSlugCreatorMatch(slug));
      return [slug, count] as const;
    }),
  );
  return new Map(pairs);
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

export async function getTagIndex(
  locale: Locale = 'en',
  minContent: number = MIN_CONTENT,
): Promise<TagIndexItem[]> {
  await connectDB();
  const defs = getAllTagDefinitions();
  const [groupMap, slugMap, ofBrowseMap] = await Promise.all([
    getGroupCategoryCounts(),
    getCreatorSlugCounts(),
    countOfBrowseCreators(),
  ]);

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
    const groupCount = groupCountFromMap(def, groupMap);
    let creatorCount = creatorCountFromMap(def, slugMap);
    const isOfArchiveTag = OF_CATEGORY_SLUGS.has(def.slug);

    if (isOfArchiveTag) {
      creatorCount = ofBrowseMap.get(def.slug) ?? 0;
    } else if (def.bestOfPage?.match === 'keyword') {
      creatorCount = keywordMap.get(def.slug) ?? 0;
    } else if (def.creatorCategorySlug && !isOfArchiveTag) {
      creatorCount = slugMap.get(def.creatorCategorySlug) ?? 0;
    }

    const total = groupCount + creatorCount;
    if (!isOfArchiveTag && total <= minContent) continue;

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

  const isOfArchiveTag = OF_CATEGORY_SLUGS.has(slug);
  const groupMatch = buildGroupMatch(def);
  const creatorMatch = buildCreatorMatch(def);
  const botMatch = buildBotMatch(def);
  const aiDbMatch = buildAiDbMatch(def);
  const rankingPages = getRankingPagesForTag(def);
  const staticAiTools = filterStaticAiTools(def);

  const [
    groupCount,
    creatorCount,
    botCount,
    aiDbCount,
    groups,
    botsRaw,
    aiDbRaw,
  ] = await Promise.all([
    groupMatch ? Group.countDocuments(groupMatch) : Promise.resolve(0),
    creatorMatch ? OnlyFansCreator.countDocuments(creatorMatch) : Promise.resolve(0),
    botMatch ? Bot.countDocuments(botMatch) : Promise.resolve(0),
    aiDbMatch ? AINsfwSubmission.countDocuments(aiDbMatch) : Promise.resolve(0),
    groupMatch
      ? Group.find(groupMatch)
          .sort({ memberCount: -1, createdAt: -1 })
          .limit(24)
          .select('name slug image category memberCount description description_de description_es')
          .lean()
      : Promise.resolve([]),
    botMatch
      ? Bot.find(botMatch)
          .sort({ clickCount: -1, createdAt: -1 })
          .limit(24)
          .select('name slug image category description')
          .lean()
      : Promise.resolve([]),
    aiDbMatch
      ? AINsfwSubmission.find(aiDbMatch)
          .sort({ featured: -1, createdAt: -1 })
          .limit(24)
          .select('name slug image category description')
          .lean()
      : Promise.resolve([]),
  ]);

  const aiTools: TagAiToolResult[] = [
    ...staticAiTools,
    ...(aiDbRaw as any[]).map((t) => ({
      slug: t.slug,
      name: t.name || '',
      image: t.image || '/assets/image.jpg',
      category: t.category || '',
      description: (t.description || '').slice(0, 120),
    })),
  ].filter((t, i, arr) => arr.findIndex((x) => x.slug === t.slug) === i);

  const aiCount = aiTools.length;
  const total = groupCount + creatorCount + botCount + aiCount;
  if (!isOfArchiveTag && total <= MIN_CONTENT) return null;

  const label = getTagLabel(def.slug, def.label, locale);
  return {
    slug: def.slug,
    label,
    groupCount,
    creatorCount,
    botCount,
    aiCount,
    total,
    rankingPages,
    top10: null,
    creators: [],
    groups: (groups as any[]).map((g) => ({
      _id: g._id.toString(),
      name: g.name || '',
      slug: g.slug || '',
      image: g.image || '',
      category: g.category || '',
      memberCount: g.memberCount || 0,
      description: (g.description || '').slice(0, 120),
    })) as TagGroupResult[],
    bots: (botsRaw as any[]).map((b) => ({
      _id: b._id.toString(),
      name: b.name || '',
      slug: b.slug || '',
      image: b.image || '/assets/image.jpg',
      category: b.category || '',
      description: (b.description || '').slice(0, 120),
    })) as TagBotResult[],
    aiTools,
  };
}
