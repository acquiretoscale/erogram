import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Group } from '@/lib/models';
import { authenticateUser } from '@/lib/auth';
import { vaultNewCategoryRegex } from '@/app/groups/constants';

export async function GET(req: NextRequest) {
  const user = await authenticateUser(req);

  const isPreview = !user || (!user.premium && !user.isAdmin);

  await connectDB();

  const { searchParams } = new URL(req.url);
  const skip = parseInt(searchParams.get('skip') || '0');
  const limit = Math.min(parseInt(searchParams.get('limit') || '24'), 200);
  const search = searchParams.get('search') || '';
  const category = searchParams.get('category') || '';
  const country = searchParams.get('country') || '';
  const sortBy = searchParams.get('sort') || 'newest';
  const featuredOnly = searchParams.get('featured') === '1';

  const newNicheRegex = category && category !== 'All' ? vaultNewCategoryRegex[category] : undefined;
  const isOnlyfansRussian = category === 'Onlyfans Russian';
  const skipTeaserFilter = !!(newNicheRegex || isOnlyfansRussian);

  // Vault = every approved group (premium vault + free public groups), read-only.
  // We do NOT flip premiumOnly on any group; the free site still queries
  // premiumOnly: { $ne: true } and is unaffected. This only enriches what the
  // premium vault surfaces. Hentai stays excluded like the rest of the vault.
  const baseQuery: any = { status: 'approved', isAdvertisement: { $ne: true } };
  if (featuredOnly) baseQuery.showOnVaultTeaser = true;

  if (isPreview) {
    // Non-premium users still only ever see the curated teaser set (locked),
    // never the full free-group catalogue.
    baseQuery.premiumOnly = true;
    if (!skipTeaserFilter) baseQuery.showOnVaultTeaser = true;
    baseQuery.image = { $nin: [null, '', '/assets/image.jpg', '/assets/placeholder-no-image.png'] };
    baseQuery.memberCount = { $gt: 0 };
  }

  const query: any = { ...baseQuery };
  const conditions: any[] = [];
  let categoryCondition: any = null;

  if (search) {
    const q = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    conditions.push({ $or: [
      { name: { $regex: q, $options: 'i' } },
      { description: { $regex: q, $options: 'i' } },
      { category: { $regex: q, $options: 'i' } },
      { categories: { $regex: q, $options: 'i' } },
      { vaultCategories: { $regex: q, $options: 'i' } },
    ]});
  }
  if (isOnlyfansRussian) {
    categoryCondition = {
      $and: [
        { $or: [
          { categories: 'Onlyfans' },
          { category: 'Onlyfans' },
          { name: { $regex: 'onlyfans', $options: 'i' } },
          { description: { $regex: 'onlyfans', $options: 'i' } },
        ] },
        { $or: [
          { categories: 'Russian' },
          { category: 'Russian' },
          { name: { $regex: 'russian|русск|росси', $options: 'i' } },
          { description: { $regex: 'russian|русск|росси', $options: 'i' } },
        ] },
      ],
    };
  } else if (category === 'Russian') {
    // Vault Russian pill: name must be written in Russian (Cyrillic). Latin names tagged Russian stay out.
    categoryCondition = {
      $and: [
        { $or: [{ categories: 'Russian' }, { category: 'Russian' }] },
        { name: { $regex: `[${String.fromCharCode(0x0400)}-${String.fromCharCode(0x04FF)}]` } },
      ],
    };
  } else if (newNicheRegex) {
    categoryCondition = { $or: [
      { categories: category },
      { category: category },
      { name: { $regex: newNicheRegex, $options: 'i' } },
      { description: { $regex: newNicheRegex, $options: 'i' } },
    ]};
  } else if (category && category !== 'All') {
    categoryCondition = { $or: [{ categories: category }, { category: category }] };
  }

  if (categoryCondition) conditions.push(categoryCondition);
  else conditions.push({ category: { $ne: 'Hentai' }, categories: { $nin: ['Hentai'] } });
  if (country && country !== 'All') {
    conditions.push({ country });
  }
  if (conditions.length > 0) {
    query.$and = conditions;
  }

  const previewLimit = 200;
  const effectiveLimit = isPreview ? Math.min(limit, previewLimit) : limit;

  const isFirstLoad = skip === 0;
  const selectFields = { name: 1, slug: 1, image: 1, category: 1, categories: 1, country: 1, description: 1, memberCount: 1, telegramLink: 1, createdAt: 1, showOnVaultTeaser: 1 };
  const previewSelect = 'name slug image category categories country description memberCount telegramLink createdAt showOnVaultTeaser';
  const premiumSelect = `${previewSelect} likes dislikes`;
  const sortOption: Record<string, 1 | -1> =
    sortBy === 'members' ? { memberCount: -1 }
    : sortBy === 'name' ? { name: 1 }
    : { createdAt: -1 };

  const excludeRaw = searchParams.get('exclude') || '';
  const excludeIds = excludeRaw ? excludeRaw.split(',').filter(Boolean) : [];
  const { Types } = await import('mongoose');
  const excludeObjIds = excludeIds.map(id => new Types.ObjectId(id));

  const fillWithRest = !isPreview && !search && !featuredOnly
    && !!categoryCondition
    && (!country || country === 'All');
  const restQuery: any = fillWithRest ? {
    ...baseQuery,
    $and: [
      { category: { $ne: 'Hentai' }, categories: { $nin: ['Hentai'] } },
      { $nor: [categoryCondition] },
    ],
  } : null;

  async function loadSorted(q: any, skipN: number, limitN: number, extraExclude: any[] = []) {
    if (isPreview) {
      return Group.find(q).sort({ memberCount: -1 }).skip(skipN).limit(limitN).select(previewSelect).lean();
    }
    if (sortBy === 'random') {
      const matchStage: any = { ...q };
      const nin = [...excludeObjIds, ...extraExclude];
      if (nin.length) matchStage._id = { $nin: nin };
      return Group.aggregate([
        { $match: matchStage },
        { $sample: { size: limitN } },
        { $project: selectFields },
      ]);
    }
    return Group.find(q).sort(sortOption).skip(skipN).limit(limitN).select(premiumSelect).lean();
  }

  let groups: any[] = [];
  let total = 0;

  if (fillWithRest && restQuery) {
    const [catTotal, restTotal] = await Promise.all([
      Group.countDocuments(query),
      Group.countDocuments(restQuery),
    ]);
    total = catTotal + restTotal;
    if (sortBy === 'random') {
      const catPart = await loadSorted(query, 0, effectiveLimit);
      let restPart: any[] = [];
      if (catPart.length < effectiveLimit) {
        restPart = await loadSorted(restQuery, 0, effectiveLimit - catPart.length, catPart.map((g: any) => g._id));
      }
      groups = [...catPart, ...restPart];
    } else if (skip < catTotal) {
      const catPart = await loadSorted(query, skip, effectiveLimit);
      let restPart: any[] = [];
      if (catPart.length < effectiveLimit) {
        restPart = await loadSorted(restQuery, 0, effectiveLimit - catPart.length);
      }
      groups = [...catPart, ...restPart];
    } else {
      groups = await loadSorted(restQuery, skip - catTotal, effectiveLimit);
    }
  } else {
    groups = await loadSorted(query, skip, effectiveLimit);
    total = await Group.countDocuments(query);
  }

  const promises: Promise<any>[] = [
    Promise.resolve(groups),
    Promise.resolve(total),
  ];

  if (isFirstLoad) {
    promises.push(
      Group.aggregate([
        { $match: baseQuery },
        { $project: {
          cats: {
            $setUnion: [
              { $ifNull: ['$categories', []] },
              { $cond: [{ $and: [{ $ne: ['$category', null] }, { $ne: ['$category', ''] }] }, ['$category'], []] },
            ],
          },
        } },
        { $unwind: '$cats' },
        { $match: { cats: { $nin: [null, ''] } } },
        { $group: { _id: '$cats', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Group.aggregate([
        { $match: { ...baseQuery, country: { $nin: [null, '', 'All'] } } },
        { $group: { _id: '$country', count: { $sum: 1 } } },
        { $match: { count: { $gte: 3 } } },
        { $sort: { count: -1 } },
      ]),
      Group.countDocuments(baseQuery),
      Group.find({ ...baseQuery, showOnVaultTeaser: true })
        .sort({ vaultTeaserOrder: 1, memberCount: -1 })
        .select('name slug image category categories telegramLink memberCount')
        .lean(),
    );
  }

  const results = await Promise.all(promises);
  const categoryCounts = isFirstLoad ? results[2] : null;
  const countryCounts = isFirstLoad ? results[3] : null;
  const vaultTotal = isFirstLoad ? results[4] : null;
  const topLikedRaw = isFirstLoad ? results[5] : null;

  const response: any = {
    groups: (groups as any[]).map((g: any) => {
      const cats = g.categories?.length ? g.categories : (g.category ? [g.category] : []);
      if (isPreview) {
        return {
          _id: g._id.toString(),
          name: g.name,
          image: g.image,
          category: g.category,
          categories: cats,
          country: g.country,
          memberCount: g.memberCount,
        };
      }
      return {
        ...g,
        _id: g._id.toString(),
        categories: cats,
      };
    }),
    total,
    hasMore: isPreview ? false : skip + groups.length < total,
    preview: isPreview || undefined,
  };

  if (categoryCounts) {
    const ofRu = await Group.countDocuments({
      ...baseQuery,
      $and: [
        { $or: [{ category: 'Onlyfans' }, { categories: 'Onlyfans' }] },
        { $or: [{ category: 'Russian' }, { categories: 'Russian' }] },
      ],
    });
    response.categoryCounts = [
      { category: 'Onlyfans Russian', count: ofRu },
      ...categoryCounts.map((c: any) => ({ category: c._id, count: c.count })),
    ];
  }
  if (countryCounts) {
    response.countryCounts = countryCounts.map((c: any) => ({ country: c._id, count: c.count }));
  }
  if (vaultTotal !== null) {
    response.vaultTotal = vaultTotal;
  }
  if (topLikedRaw?.length) {
    response.topLiked = (topLikedRaw as any[]).map((g: any) => {
      const cats = g.categories?.length ? g.categories : (g.category ? [g.category] : []);
      if (isPreview) {
        return { _id: g._id.toString(), image: g.image, categories: cats, memberCount: g.memberCount };
      }
      return {
        _id: g._id.toString(),
        name: g.name,
        slug: g.slug,
        image: g.image,
        telegramLink: g.telegramLink,
        memberCount: g.memberCount,
        categories: cats,
      };
    });
  }

  return NextResponse.json(response);
}
