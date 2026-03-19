import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import { Group, User, Post, SystemConfig, Article } from '@/lib/models';
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
    const topGroup = searchParams.get('topGroup') === 'true';
    const featuredParam = searchParams.get('featured') === 'true';
    const boostedParam = searchParams.get('boosted') === 'true';
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

      return NextResponse.json({
        groups: featuredGroups.map((g: any) => {
          const cats = g.categories?.length ? g.categories : [g.category, g.country].filter(Boolean);
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

      return NextResponse.json({
        groups: boostedGroups.map((g: any) => {
          const cats = g.categories?.length ? g.categories : [g.category, g.country].filter(Boolean);
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
          };
        }),
      });
    }

    // Fast path: top groups by recent clicks
    // Fetches a larger candidate pool then randomly picks `limit` for variety.
    if (topGroup) {
      // Also trigger the periodic reset check here (shared with sortBy=views)
      try {
        const resetConfig = await SystemConfig.findOne({ key: 'view_reset' });
        const now = new Date();
        const resetInterval = 24 * 60 * 60 * 1000; // 24 hours
        if (!resetConfig || (now.getTime() - new Date(resetConfig.lastUpdated).getTime() > resetInterval)) {
          await Group.updateMany({}, { $set: { weeklyViews: 0, weeklyClicks: 0 } });
          await Article.updateMany({}, { $set: { weeklyViews: 0 } });
          if (resetConfig) { resetConfig.lastUpdated = now; await resetConfig.save(); }
          else { await SystemConfig.create({ key: 'view_reset', value: { intervalDays: 1 }, lastUpdated: now }); }
        }
      } catch (err) { console.error('[API] Error checking/resetting views:', err); }

      const topLimit = parseInt(searchParams.get('limit') || '3', 10);
      const POOL_SIZE = Math.max(topLimit * 5, 20);
      const candidates = await Group.find({
        status: 'approved',
        isAdvertisement: { $ne: true },
        premiumOnly: { $ne: true },
        pinned: { $ne: true },
        category: { $ne: 'Hentai' },
      })
        .sort({ weeklyClicks: -1, views: -1 })
        .limit(POOL_SIZE)
        .select('name slug category country categories description description_de description_es image telegramLink clickCount views memberCount verified weeklyClicks')
        .lean();

      // Weighted random pick: higher weeklyClicks = higher chance, but not deterministic
      const weighted = (candidates as any[]).map((g, i) => ({
        group: g,
        weight: Math.max(1, (g.weeklyClicks || 0)) + Math.random() * 5 + (POOL_SIZE - i),
      }));
      weighted.sort((a, b) => b.weight - a.weight);
      const topGroups = weighted.slice(0, topLimit).map(w => w.group);

      const origin = req.headers.get('x-forwarded-host')
        ? `https://${req.headers.get('x-forwarded-host')}`
        : new URL(req.url).origin;

      return NextResponse.json({
        groups: topGroups.map((g: any) => {
          const cats = g.categories?.length ? g.categories : [g.category, g.country].filter(Boolean);
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
      // Use aggregation pipeline for random sampling
      // First get a larger sample, then sort pinned to top, then slice
      const pipeline = [
        { $match: query },
        { $sample: { size: Math.min(200, skip + limit * 2) } }, // Sample more than needed
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

      const sampledGroups = await Group.aggregate(pipeline);

      // Keep random order (pinned no longer promoted in main grid)

      groups = sampledGroups.slice(skip, skip + limit);

      // Get review statistics for random groups too
      const randomGroupIds = groups.map((g: any) => g._id);
      const randomReviewStats = await Post.aggregate([
        {
          $match: {
            groupId: { $in: randomGroupIds },
            status: 'approved'
          }
        },
        {
          $group: {
            _id: '$groupId',
            reviewCount: { $sum: 1 },
            averageRating: { $avg: '$rating' }
          }
        }
      ]);

      // Create a map for quick lookup
      const randomReviewStatsMap = new Map();
      randomReviewStats.forEach((stat: any) => {
        randomReviewStatsMap.set(stat._id.toString(), {
          reviewCount: stat.reviewCount,
          averageRating: stat.averageRating || 0
        });
      });

      // Add review stats to groups
      groups = groups.map((g: any) => {
        const stats = randomReviewStatsMap.get(g._id.toString()) || { reviewCount: 0, averageRating: 0 };
        return {
          ...g,
          reviewCount: stats.reviewCount,
          averageRating: stats.averageRating
        };
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

    // Get review statistics for all groups
    const groupIds = groups.map((g: any) => g._id);
    const reviewStats = await Post.aggregate([
      {
        $match: {
          groupId: { $in: groupIds },
          status: 'approved' // Only count approved reviews
        }
      },
      {
        $group: {
          _id: '$groupId',
          reviewCount: { $sum: 1 },
          averageRating: { $avg: '$rating' }
        }
      }
    ]);

    // Create a map for quick lookup
    const reviewStatsMap = new Map();
    reviewStats.forEach((stat: any) => {
      reviewStatsMap.set(stat._id.toString(), {
        reviewCount: stat.reviewCount,
        averageRating: stat.averageRating || 0
      });
    });

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
        createdBy: g.createdBy
          ? {
            username: g.createdBy.username,
            showNicknameUnderGroups: g.createdBy.showNicknameUnderGroups,
          }
          : null,
      };
    });

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

