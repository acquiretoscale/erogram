import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import connectDB from '@/lib/db/mongodb';
import { Group, Bot, User, Post, SystemConfig, Article } from '@/lib/models';
import { slugify } from '@/lib/utils/slugify';
import { uploadToR2, getR2PublicUrl } from '@/lib/r2';

function resolveImageUrl(stored: string | undefined, origin: string): string {
  const placeholder = process.env.NEXT_PUBLIC_PLACEHOLDER_IMAGE_URL || '/assets/placeholder-no-image.png'; // relative so next/image works locally (no hostname check)
  if (!stored || typeof stored !== 'string') return placeholder;
  if (stored.startsWith('https://')) return stored;
  if (stored.startsWith('/')) return stored; // keep relative for same-origin
  const r2Url = getR2PublicUrl();
  if (r2Url) return `${r2Url.replace(/\/$/, '')}/${stored}`;
  return `${origin}/uploads/groups/${stored}`;
}

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';

// Increase body size limit for base64 images (up to 10MB)
export const maxDuration = 30;
export const runtime = 'nodejs';

async function authenticate(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (!decoded || !decoded.id) {
      return null;
    }
    const user = await User.findById(decoded.id);
    if (!user) {
      return null;
    }
    return user;
  } catch (error) {
    console.error('Auth error:', error);
    return null;
  }
}

function localizedDesc(g: any, locale: string): string {
  if (locale === 'de' && g.description_de) return g.description_de;
  if (locale === 'es' && g.description_es) return g.description_es;
  return g.description || '';
}

async function getReviewStatsMap(groupIds: any[]): Promise<Map<string, { reviewCount: number; averageRating: number }>> {
  if (groupIds.length === 0) return new Map();
  const stats = await Post.aggregate([
    { $match: { groupId: { $in: groupIds }, status: 'approved' } },
    { $group: { _id: '$groupId', reviewCount: { $sum: 1 }, averageRating: { $avg: '$rating' } } },
  ]);
  const map = new Map<string, { reviewCount: number; averageRating: number }>();
  stats.forEach((s: any) => map.set(s._id.toString(), { reviewCount: s.reviewCount, averageRating: s.averageRating || 0 }));
  return map;
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const skip = parseInt(searchParams.get('skip') || '0', 10);
    const limit = parseInt(searchParams.get('limit') || '12', 10);
    const sortBy = searchParams.get('sortBy') || 'default';
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const subcategory = searchParams.get('subcategory') || '';
    const country = searchParams.get('country') || '';
    const excludeRaw = searchParams.get('exclude') || '';
    const excludeIds = excludeRaw ? excludeRaw.split(',').filter(Boolean) : [];
    const topGroup = searchParams.get('topGroup') === 'true';
    const featuredParam = searchParams.get('featured') === 'true';
    const boostedParam = searchParams.get('boosted') === 'true';
    const typeParam = searchParams.get('type') || 'groups'; // 'all' = groups + bots mixed, 'groups' = groups only
    const locale = req.headers.get('x-locale') || searchParams.get('locale') || 'en';

    // Fast path: featured groups (non-boosted, ordered by featuredOrder)
    if (featuredParam) {
      const now = new Date();
      await Group.updateMany(
        { boosted: true, boostExpiresAt: { $lte: now } },
        { $set: { boosted: false, boostExpiresAt: null, boostDuration: null } }
      );

      const featuredGroups = await Group.find({
        status: 'approved',
        featured: true,
        boosted: { $ne: true },
        premiumOnly: { $ne: true },
        category: { $ne: 'Hentai' },
      })
        .sort({ featuredOrder: 1, featuredAt: -1 })
        .limit(limit)
        .select('name slug category country categories description description_de description_es image telegramLink clickCount views memberCount verified featured featuredOrder boosted')
        .lean();

      const origin = req.headers.get('x-forwarded-host')
        ? `https://${req.headers.get('x-forwarded-host')}`
        : new URL(req.url).origin;

      const featReviewMap = await getReviewStatsMap(featuredGroups.map((g: any) => g._id));

      return NextResponse.json({
        groups: featuredGroups.map((g: any) => {
          const cats = g.categories?.length ? g.categories : [g.category, g.country].filter(Boolean);
          const rs = featReviewMap.get(g._id.toString()) || { reviewCount: 0, averageRating: 0 };
          return {
            _id: g._id.toString(),
            name: (g.name || '').slice(0, 150),
            slug: (g.slug || '').slice(0, 100),
            category: (g.category || '').slice(0, 50),
            country: (g.country || '').slice(0, 50),
            categories: cats,
            description: localizedDesc(g, locale).slice(0, 150),
            image: resolveImageUrl(g.image, origin),
            telegramLink: (g.telegramLink || '').slice(0, 150),
            isAdvertisement: false,
            advertisementUrl: null,
            pinned: false,
            featured: true,
            clickCount: g.clickCount || 0,
            views: g.views || 0,
            memberCount: g.memberCount || 0,
            verified: g.verified || false,
            averageRating: rs.averageRating,
            reviewCount: rs.reviewCount,
          };
        }),
      });
    }

    // Fast path: boosted group (featured group promoted to Top Groups spot 1)
    if (boostedParam) {
      const now = new Date();
      await Group.updateMany(
        { boosted: true, boostExpiresAt: { $lte: now } },
        { $set: { boosted: false, boostExpiresAt: null, boostDuration: null } }
      );

      const boostedGroups = await Group.find({
        status: 'approved',
        featured: true,
        boosted: true,
        boostExpiresAt: { $gt: now },
        premiumOnly: { $ne: true },
        category: { $ne: 'Hentai' },
      })
        .sort({ boostExpiresAt: 1 })
        .limit(1)
        .select('name slug category country categories description description_de description_es image telegramLink clickCount views memberCount verified featured boosted boostExpiresAt weeklyClicks')
        .lean();

      const origin = req.headers.get('x-forwarded-host')
        ? `https://${req.headers.get('x-forwarded-host')}`
        : new URL(req.url).origin;

      const boostReviewMap = await getReviewStatsMap(boostedGroups.map((g: any) => g._id));

      return NextResponse.json({
        groups: boostedGroups.map((g: any) => {
          const cats = g.categories?.length ? g.categories : [g.category, g.country].filter(Boolean);
          const rs = boostReviewMap.get(g._id.toString()) || { reviewCount: 0, averageRating: 0 };
          return {
            _id: g._id.toString(),
            name: (g.name || '').slice(0, 150),
            slug: (g.slug || '').slice(0, 100),
            category: (g.category || '').slice(0, 50),
            country: (g.country || '').slice(0, 50),
            categories: cats,
            description: localizedDesc(g, locale).slice(0, 150),
            image: resolveImageUrl(g.image, origin),
            telegramLink: (g.telegramLink || '').slice(0, 150),
            isAdvertisement: false,
            advertisementUrl: null,
            pinned: false,
            featured: true,
            boosted: true,
            boostExpiresAt: g.boostExpiresAt,
            clickCount: g.clickCount || 0,
            views: g.views || 0,
            memberCount: g.memberCount || 0,
            verified: g.verified || false,
            weeklyClicks: g.weeklyClicks || 0,
            averageRating: rs.averageRating,
            reviewCount: rs.reviewCount,
          };
        }),
      });
    }

    // Fast path: top groups by recent clicks
    // Fetches a larger candidate pool then randomly picks `limit` for variety.
    if (topGroup) {
      // Fire-and-forget: periodic view reset runs in background, never blocks the response
      (async () => {
        try {
          const resetConfig = await SystemConfig.findOne({ key: 'view_reset' });
          const now = new Date();
          const resetInterval = 24 * 60 * 60 * 1000;
          if (!resetConfig || (now.getTime() - new Date(resetConfig.lastUpdated).getTime() > resetInterval)) {
            await Group.updateMany({}, { $set: { weeklyViews: 0, weeklyClicks: 0 } });
            await Article.updateMany({}, { $set: { weeklyViews: 0 } });
            if (resetConfig) { resetConfig.lastUpdated = now; await resetConfig.save(); }
            else { await SystemConfig.create({ key: 'view_reset', value: { intervalDays: 1 }, lastUpdated: now }); }
          }
        } catch (err) { console.error('[API] Error checking/resetting views:', err); }
      })();

      const topLimit = parseInt(searchParams.get('limit') || '3', 10);
      const POOL_SIZE = Math.max(topLimit * 5, 20);
      const now = new Date();

      // Expire old boosts
      await Group.updateMany(
        { boosted: true, boostExpiresAt: { $lte: now } },
        { $set: { boosted: false, boostExpiresAt: null, boostDuration: null } }
      );

      // Boosted groups (paid) get priority placement in Top Groups
      const boostedGroups = await Group.find({
        status: 'approved',
        boosted: true,
        boostExpiresAt: { $gt: now },
        premiumOnly: { $ne: true },
        category: { $ne: 'Hentai' },
      })
        .sort({ boostExpiresAt: 1 })
        .limit(topLimit)
        .select('name slug category country categories description description_de description_es image telegramLink clickCount views memberCount verified weeklyClicks boosted boostExpiresAt')
        .lean();

      const boostedIds = new Set((boostedGroups as any[]).map(g => g._id.toString()));

      // Fetch manually slotted groups (topGroupSlot 1 or 2), excluding already-boosted
      const manualSlotted = await Group.find({
        status: 'approved',
        topGroupSlot: { $in: [1, 2] },
        _id: { $nin: Array.from(boostedIds) },
      })
        .select('name slug category country categories description description_de description_es image telegramLink clickCount views memberCount verified weeklyClicks topGroupSlot')
        .lean();

      const manualSlotMap = new Map((manualSlotted as any[]).map(g => [g.topGroupSlot, g]));
      const reservedIds = new Set([...boostedIds, ...(manualSlotted as any[]).map(g => g._id.toString())]);

      const candidates = await Group.find({
        status: 'approved',
        isAdvertisement: { $ne: true },
        premiumOnly: { $ne: true },
        pinned: { $ne: true },
        featured: { $ne: true },
        boosted: { $ne: true },
        topGroupSlot: { $nin: [1, 2] },
        category: { $ne: 'Hentai' },
      })
        .sort({ weeklyClicks: -1, views: -1 })
        .limit(POOL_SIZE)
        .select('name slug category country categories description description_de description_es image telegramLink clickCount views memberCount verified weeklyClicks')
        .lean();

      const weighted = (candidates as any[]).map((g, i) => ({
        group: g,
        weight: Math.max(1, (g.weeklyClicks || 0)) + Math.random() * 5 + (POOL_SIZE - i),
      }));
      weighted.sort((a, b) => b.weight - a.weight);
      const organicPicks = weighted.slice(0, topLimit).map(w => w.group);

      // Merge: boosted first → manual slots → organic fills remaining
      const finalGroups: any[] = [...boostedGroups];
      const slot1 = manualSlotMap.get(1);
      const slot2 = manualSlotMap.get(2);
      if (slot1 && finalGroups.length < topLimit) finalGroups.push(slot1);
      if (slot2 && finalGroups.length < topLimit) finalGroups.push(slot2);
      for (const g of organicPicks) {
        if (finalGroups.length >= topLimit) break;
        if (!reservedIds.has(g._id.toString())) finalGroups.push(g);
      }

      const origin = req.headers.get('x-forwarded-host')
        ? `https://${req.headers.get('x-forwarded-host')}`
        : new URL(req.url).origin;

      const topReviewMap = await getReviewStatsMap(finalGroups.map((g: any) => g._id));

      return NextResponse.json({
        groups: finalGroups.map((g: any) => {
          const cats = g.categories?.length ? g.categories : [g.category, g.country].filter(Boolean);
          const rs = topReviewMap.get(g._id.toString()) || { reviewCount: 0, averageRating: 0 };
          return {
            _id: g._id.toString(),
            name: (g.name || '').slice(0, 150),
            slug: (g.slug || '').slice(0, 100),
            category: (g.category || '').slice(0, 50),
            country: (g.country || '').slice(0, 50),
            categories: cats,
            description: localizedDesc(g, locale).slice(0, 150),
            image: resolveImageUrl(g.image, origin),
            telegramLink: (g.telegramLink || '').slice(0, 150),
            isAdvertisement: false,
            advertisementUrl: null,
            pinned: false,
            clickCount: g.clickCount || 0,
            views: g.views || 0,
            memberCount: g.memberCount || 0,
            verified: g.verified || false,
            weeklyClicks: g.weeklyClicks || 0,
            topGroupSlot: g.topGroupSlot || null,
            boosted: g.boosted || false,
            averageRating: rs.averageRating,
            reviewCount: rs.reviewCount,
          };
        }),
      });
    }

    // Exclude image field to prevent maxSize errors - images loaded lazily via API.
    // Exclude Group-based adverts so in-feed ads come only from Campaigns (Advertisers).
    let query: any = { status: 'approved', isAdvertisement: { $ne: true }, premiumOnly: { $ne: true }, category: { $ne: 'Hentai' } };
    let sortCriteria: any = { createdAt: -1 };

    const andConditions: any[] = [];

    if (search) {
      andConditions.push({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
        ],
      });
    }

    // Unified category filter — queries the new `categories` array with fallback to legacy fields
    if (category && category !== 'All') {
      andConditions.push({
        $or: [{ categories: category }, { category: category }, { country: category }],
      });
    }

    if (subcategory && subcategory !== 'All') {
      andConditions.push({
        $or: [{ categories: subcategory }, { category: subcategory }],
      });
    }

    if (country && country !== 'All') {
      andConditions.push({
        $or: [{ categories: country }, { country: country }],
      });
    }

    if (andConditions.length) {
      query.$and = andConditions;
    }

    if (sortBy === 'views') {
      // Check for view reset (every 24 hours)
      try {
        const resetConfig = await SystemConfig.findOne({ key: 'view_reset' });
        const now = new Date();
        const resetInterval = 24 * 60 * 60 * 1000;

        if (!resetConfig || (now.getTime() - new Date(resetConfig.lastUpdated).getTime() > resetInterval)) {
          console.log('[API] Resetting group + article views (24h interval)...');

          await Group.updateMany({}, { $set: { weeklyViews: 0, weeklyClicks: 0 } });
          await Article.updateMany({}, { $set: { weeklyViews: 0 } });

          if (resetConfig) {
            resetConfig.lastUpdated = now;
            await resetConfig.save();
          } else {
            await SystemConfig.create({
              key: 'view_reset',
              value: { intervalDays: 1 },
              lastUpdated: now
            });
          }
          console.log('[API] Group + Article weeklyViews reset complete');
        }
      } catch (err) {
        console.error('[API] Error checking/resetting views:', err);
      }

      // For top groups by views, exclude pinned and Group-based adverts
      query = { status: 'approved', pinned: { $ne: true }, isAdvertisement: { $ne: true }, premiumOnly: { $ne: true }, category: { $ne: 'Hentai' } };
      sortCriteria = { weeklyViews: -1 };
      console.log('[API] Top groups query:', JSON.stringify(query));
    } else if (sortBy === 'newest') {
      sortCriteria = { createdAt: -1 };
    } else if (sortBy === 'oldest') {
      sortCriteria = { createdAt: 1 };
    } else if (sortBy === 'popular') {
      sortCriteria = { views: -1, createdAt: -1 };
    } else if (sortBy === 'random') {
      // For random discovery, we'll handle this with aggregation below
      // Keep existing query (already has status: 'approved' and search if provided)
    }

    let groups: any[];

    if (sortBy === 'random') {
      const matchStage: any = { ...query };
      if (excludeIds.length > 0) {
        const objectIds = excludeIds
          .filter(id => mongoose.Types.ObjectId.isValid(id))
          .map(id => new mongoose.Types.ObjectId(id));
        if (objectIds.length > 0) {
          matchStage._id = { $nin: objectIds };
        }
      }

      const pipeline = [
        { $match: matchStage },
        { $sample: { size: limit } },
        {
          $lookup: {
            from: 'users',
            localField: 'createdBy',
            foreignField: '_id',
            as: 'createdBy'
          }
        },
        {
          $addFields: {
            createdBy: { $arrayElemAt: ['$createdBy', 0] }
          }
        },
        {
          $project: {
            _id: 1,
            name: 1,
            slug: 1,
            category: 1,
            country: 1,
            categories: 1,
            description: 1,
            description_de: 1,
            description_es: 1,
            image: 1,
            telegramLink: 1,
            isAdvertisement: 1,
            advertisementUrl: 1,
            pinned: 1,
            clickCount: 1,
            views: { $ifNull: ['$views', 0] },
            memberCount: { $ifNull: ['$memberCount', 0] },
            verified: { $ifNull: ['$verified', false] },
            createdBy: {
              username: 1,
              showNicknameUnderGroups: 1
            }
          }
        }
      ];

      groups = await Group.aggregate(pipeline);

      const randomReviewStatsMap = await getReviewStatsMap(groups.map((g: any) => g._id));
      groups = groups.map((g: any) => {
        const stats = randomReviewStatsMap.get(g._id.toString()) || { reviewCount: 0, averageRating: 0 };
        return { ...g, reviewCount: stats.reviewCount, averageRating: stats.averageRating };
      });
    } else {
      groups = await Group.find(query)
        .populate('createdBy', 'username showNicknameUnderGroups')
        .sort(sortCriteria)
        .skip(skip)
        .limit(limit)
        .lean();
    }

    if (sortBy === 'views') {
      console.log(`[API] Top groups found: ${groups.length} groups`);
      groups.forEach((g, i) => {
        console.log(`[API] Top group ${i + 1}: ${g.name} (pinned: ${g.pinned}, views: ${g.views})`);
      });
    }

    const reviewStatsMap = await getReviewStatsMap(groups.map((g: any) => g._id));

    const origin = req.nextUrl?.origin || (req.headers.get('host') ? `https://${req.headers.get('host')}` : '') || process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') || '';
    const sanitized = groups.map((g: any) => {
      const stats = reviewStatsMap.get(g._id.toString()) || { reviewCount: 0, averageRating: 0 };
      const imageUrl = resolveImageUrl(g.image, origin || '');
      const cats = g.categories?.length ? g.categories : [g.category, g.country].filter(Boolean);
      return {
        _id: g._id.toString(),
        name: g.name,
        slug: g.slug,
        category: g.category,
        country: g.country,
        categories: cats,
        description: localizedDesc(g, locale).slice(0, 300),
        image: imageUrl,
        telegramLink: g.telegramLink,
        isAdvertisement: g.isAdvertisement || false,
        advertisementUrl: g.advertisementUrl || null,
        pinned: g.pinned || false,
        clickCount: g.clickCount || 0,
        views: g.views || 0,
        memberCount: g.memberCount || 0,
        verified: g.verified || false,
        reviewCount: stats.reviewCount,
        averageRating: stats.averageRating,
        itemType: 'group' as const,
        createdBy: g.createdBy
          ? {
            username: g.createdBy.username,
            showNicknameUnderGroups: g.createdBy.showNicknameUnderGroups,
          }
          : null,
      };
    });

    // When type=all, mix in a random sample of bots (roughly 1 bot per 4 groups)
    if (typeParam === 'all' && !search) {
      try {
        const botCount = Math.max(1, Math.floor(sanitized.length / 4));
        const bots = await Bot.aggregate([
          { $match: { status: 'approved' } },
          { $sample: { size: botCount } },
          { $project: { _id: 1, name: 1, slug: 1, category: 1, country: 1, description: 1, image: 1, telegramLink: 1, memberCount: 1, clickCount: 1, verified: 1 } },
        ]);

        const PLACEHOLDER = process.env.NEXT_PUBLIC_PLACEHOLDER_IMAGE_URL || '/assets/placeholder-no-image.png';
        const botItems = (bots as any[]).map((b: any) => ({
          _id: b._id.toString(),
          name: (b.name || '').slice(0, 150),
          slug: b.slug || '',
          category: b.category || '',
          country: b.country || '',
          categories: [b.category].filter(Boolean),
          description: (b.description || '').slice(0, 300),
          image: (b.image && typeof b.image === 'string' && b.image.startsWith('https://')) ? b.image : PLACEHOLDER,
          telegramLink: b.telegramLink || '',
          isAdvertisement: false,
          advertisementUrl: null,
          pinned: false,
          clickCount: b.clickCount || 0,
          views: 0,
          memberCount: b.memberCount || 0,
          verified: b.verified || false,
          reviewCount: 0,
          averageRating: 0,
          itemType: 'bot' as const,
          createdBy: null,
        }));

        // Interleave: insert one bot after every ~3 groups
        const mixed: typeof sanitized = [];
        let botIdx = 0;
        for (let i = 0; i < sanitized.length; i++) {
          mixed.push(sanitized[i]);
          if ((i + 1) % 3 === 0 && botIdx < botItems.length) {
            mixed.push(botItems[botIdx++] as any);
          }
        }

        return NextResponse.json({ groups: mixed, hasMore: sanitized.length === limit });
      } catch {
        // Fall through to return groups only if bot fetch fails
      }
    }

    return NextResponse.json({
      groups: sanitized,
      hasMore: sanitized.length === limit,
    });
  } catch (error: any) {
    console.error('Error fetching groups:', error);
    return NextResponse.json(
      { message: 'Failed to load groups' },
      { status: 500 }
    );
  }
}



// Simple submit: form data → save to DB → pending for moderation. No login required.
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { name, category, country, telegramLink, description, image } = body;
    const categoriesArr: string[] = Array.isArray(body.categories)
      ? body.categories.slice(0, 3)
      : category ? [category] : [];

    if (!name || categoriesArr.length === 0 || !telegramLink || !description) {
      return NextResponse.json(
        { message: 'Name, at least one category, Telegram link and description are required' },
        { status: 400 }
      );
    }
    if (description.length < 30) {
      return NextResponse.json(
        { message: 'Description must be at least 30 characters' },
        { status: 400 }
      );
    }
    if (!telegramLink.startsWith('https://t.me/')) {
      return NextResponse.json(
        { message: 'Telegram link must start with https://t.me/' },
        { status: 400 }
      );
    }

    const baseSlug = slugify(name);
    let slug = baseSlug;
    let counter = 1;
    while (await Group.findOne({ slug })) {
      slug = `${baseSlug}-${counter++}`;
    }

    const defaultImage = process.env.NEXT_PUBLIC_PLACEHOLDER_IMAGE_URL || '/assets/placeholder-no-image.png';
    let finalImage = defaultImage;
    if (image?.startsWith('data:image/')) {
      const base64Match = image.match(/^data:image\/(\w+);base64,(.+)$/);
      if (base64Match?.[2]) {
        const ext = base64Match[1].replace('jpeg', 'jpg');
        const buffer = Buffer.from(base64Match[2], 'base64');
        const contentType = `image/${base64Match[1]}`;
        const key = `groups/${slug}.${ext}`;
        try {
          finalImage = await uploadToR2(buffer, key, contentType);
        } catch {
          // keep default
        }
      }
    } else if (image?.startsWith('https://')) {
      finalImage = image;
    }

    const user = await authenticate(req);
    const doc: Record<string, unknown> = {
      name,
      slug,
      categories: categoriesArr,
      category: categoriesArr[0] || '',
      country: '',
      telegramLink,
      description,
      image: finalImage,
      status: 'pending',
    };
    if (user?._id) doc.createdBy = user._id;

    const group = await Group.create(doc);
    return NextResponse.json(group);
  } catch (error: any) {
    console.error('Error creating group:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to create group' },
      { status: 500 }
    );
  }
}

