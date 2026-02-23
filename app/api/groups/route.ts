import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import { Group, User, Post, SystemConfig, Article } from '@/lib/models';
import { slugify } from '@/lib/utils/slugify';
import { uploadToR2, getR2PublicUrl } from '@/lib/r2';

function resolveImageUrl(stored: string | undefined, origin: string): string {
  const placeholder = '/assets/image.jpg'; // relative so next/image works locally (no hostname check)
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

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const skip = parseInt(searchParams.get('skip') || '0', 10);
    const limit = parseInt(searchParams.get('limit') || '12', 10);
    const sortBy = searchParams.get('sortBy') || 'default';
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const country = searchParams.get('country') || '';

    // Exclude image field to prevent maxSize errors - images loaded lazily via API.
    // Exclude Group-based adverts so in-feed ads come only from Campaigns (Advertisers).
    let query: any = { status: 'approved', isAdvertisement: { $ne: true } };
    let sortCriteria: any = { pinned: -1, createdAt: -1 };

    // Add search filter if search query provided
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Add category filter if provided and not 'All'
    if (category && category !== 'All') {
      query.category = category;
    }

    // Add country filter if provided and not 'All'
    if (country && country !== 'All') {
      query.country = country;
    }

    if (sortBy === 'views') {
      // Check for view reset (every 3 days)
      try {
        const resetConfig = await SystemConfig.findOne({ key: 'view_reset' });
        const now = new Date();
        // 3 days in milliseconds
        const resetInterval = 3 * 24 * 60 * 60 * 1000;

        if (!resetConfig || (now.getTime() - new Date(resetConfig.lastUpdated).getTime() > resetInterval)) {
          console.log('[API] Resetting group + article views (3-day interval)...');

          await Group.updateMany({}, { $set: { weeklyViews: 0, weeklyClicks: 0 } });
          await Article.updateMany({}, { $set: { weeklyViews: 0 } });

          // Update or create config
          if (resetConfig) {
            resetConfig.lastUpdated = now;
            await resetConfig.save();
          } else {
            await SystemConfig.create({
              key: 'view_reset',
              value: { intervalDays: 3 },
              lastUpdated: now
            });
          }
          console.log('[API] Group + Article weeklyViews reset complete');
        }
      } catch (err) {
        console.error('[API] Error checking/resetting views:', err);
      }

      // For top groups by views, exclude pinned and Group-based adverts
      query = { status: 'approved', pinned: { $ne: true }, isAdvertisement: { $ne: true } };
      sortCriteria = { weeklyViews: -1 };
      console.log('[API] Top groups query:', JSON.stringify(query));
    } else if (sortBy === 'newest') {
      sortCriteria = { pinned: -1, createdAt: -1 };
    } else if (sortBy === 'oldest') {
      sortCriteria = { pinned: -1, createdAt: 1 };
    } else if (sortBy === 'popular') {
      sortCriteria = { pinned: -1, views: -1, createdAt: -1 };
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
            description: 1,
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

      // Sort to put pinned groups first, then take the slice we need
      sampledGroups.sort((a: any, b: any) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return 0; // Keep random order for non-pinned
      });

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
      return {
        _id: g._id.toString(),
        name: g.name,
        slug: g.slug,
        category: g.category,
        country: g.country,
        description: g.description?.slice(0, 300) || '',
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

    if (!name || !category || !telegramLink || !description) {
      return NextResponse.json(
        { message: 'Name, category, Telegram link and description are required' },
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

    const countryValue = country || 'All';

    const baseSlug = slugify(name);
    let slug = baseSlug;
    let counter = 1;
    while (await Group.findOne({ slug })) {
      slug = `${baseSlug}-${counter++}`;
    }

    let finalImage = '/assets/image.jpg';
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
      category,
      country: countryValue,
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

