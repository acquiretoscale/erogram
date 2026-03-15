import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Group } from '@/lib/models';
import { authenticateUser } from '@/lib/auth';

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

  const baseQuery: any = { premiumOnly: true, status: 'approved' };
  if (featuredOnly) baseQuery.showOnVaultTeaser = true;

  if (isPreview) {
    baseQuery.image = { $nin: [null, '', '/assets/image.jpg', '/assets/placeholder-no-image.png'] };
    baseQuery.memberCount = { $gt: 0 };
  }

  const query: any = { ...baseQuery };
  const conditions: any[] = [];

  if (search) {
    conditions.push({ $or: [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ]});
  }
  if (category && category !== 'All') {
    conditions.push({ $or: [{ categories: category }, { category: category }] });
  } else {
    conditions.push({ category: { $ne: 'Hentai' }, categories: { $nin: ['Hentai'] } });
  }
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

  let groupsPromise: Promise<any>;

  if (isPreview) {
    groupsPromise = Group.find(query)
      .sort({ memberCount: -1 })
      .skip(skip)
      .limit(effectiveLimit)
      .select('name slug image category categories country description memberCount telegramLink createdAt showOnVaultTeaser')
      .lean();
  } else if (sortBy === 'random') {
    const excludeRaw = searchParams.get('exclude') || '';
    const excludeIds = excludeRaw ? excludeRaw.split(',').filter(Boolean) : [];

    const matchStage: any = { ...query };
    if (excludeIds.length > 0) {
      const { Types } = await import('mongoose');
      matchStage._id = { $nin: excludeIds.map(id => new Types.ObjectId(id)) };
    }

    groupsPromise = Group.aggregate([
      { $match: matchStage },
      { $sample: { size: effectiveLimit } },
      { $project: selectFields },
    ]);
  } else {
    const sortOption: Record<string, 1 | -1> =
      sortBy === 'members' ? { memberCount: -1 }
      : sortBy === 'name' ? { name: 1 }
      : { createdAt: -1 };

    groupsPromise = Group.find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(effectiveLimit)
      .select('name slug image category categories country description memberCount telegramLink createdAt likes dislikes showOnVaultTeaser')
      .lean();
  }

  const promises: Promise<any>[] = [
    groupsPromise,
    Group.countDocuments(query),
  ];

  if (isFirstLoad) {
    promises.push(
      Group.aggregate([
        { $match: baseQuery },
        { $project: { cats: { $ifNull: ['$categories', ['$category']] } } },
        { $unwind: '$cats' },
        { $match: { cats: { $nin: [null, ''] } } },
        { $group: { _id: '$cats', count: { $sum: 1 } } },
        { $match: { count: { $gte: 10 } } },
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
  const [groups, total] = results;
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
    hasMore: isPreview ? false : skip + effectiveLimit < total,
    preview: isPreview || undefined,
  };

  if (categoryCounts) {
    response.categoryCounts = categoryCounts.map((c: any) => ({ category: c._id, count: c.count }));
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
