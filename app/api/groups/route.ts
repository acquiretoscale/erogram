import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import { Group, User, Post, SystemConfig } from '@/lib/models';
import { slugify } from '@/lib/utils/slugify';
import { uploadToR2, R2_PUBLIC_URL } from '@/lib/r2';

function resolveImageUrl(stored: string | undefined, origin: string): string {
  const placeholder = '/assets/image.jpg'; // relative so next/image works locally (no hostname check)
  if (!stored || typeof stored !== 'string') return placeholder;
  if (stored.startsWith('https://')) return stored;
  if (stored.startsWith('/')) return stored; // keep relative for same-origin
  if (R2_PUBLIC_URL) return `${R2_PUBLIC_URL.replace(/\/$/, '')}/${stored}`;
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

    // Exclude image field to prevent maxSize errors - images loaded lazily via API
    let query: any = { status: 'approved' };
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
          console.log('[API] Resetting group views (3-day interval)...');

          // Reset all group weeklyViews to 0
          await Group.updateMany({}, { $set: { weeklyViews: 0 } });

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
          console.log('[API] Group weeklyViews reset complete');
        }
      } catch (err) {
        console.error('[API] Error checking/resetting views:', err);
      }

      // For top groups by views, exclude pinned groups and sort by weeklyViews descending
      query = { status: 'approved', pinned: { $ne: true } };
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



export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const user = await authenticate(req);
    // Allow unauthenticated submissions for moderation (status: pending)

    const body = await req.json();
    const { name, category, country, telegramLink, description, image } = body;

    // Debug: Log image data received
    const imagePreview = image ? (image.substring(0, 100) + (image.length > 100 ? '...' : '')) : 'null';
    console.log(`[Group Create] Received image data: ${imagePreview} (length: ${image?.length || 0}, isBase64: ${image?.startsWith('data:image/') || false})`);

    // Validation (country is optional, default to 'All')
    if (!name || !category || !telegramLink || !description) {
      return NextResponse.json(
        { message: 'Name, category, Telegram link and description are required' },
        { status: 400 }
      );
    }
    const countryValue = country || 'All';

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

    // Generate unique slug
    const baseSlug = slugify(name);
    let slug = baseSlug;
    let counter = 1;
    while (await Group.findOne({ slug })) {
      slug = `${baseSlug}-${counter++}`;
    }

    // Validate and prepare image - upload to Cloudflare R2
    let finalImage = '/assets/image.jpg';
    if (image) {
      if (image.startsWith('data:image/')) {
        const base64Match = image.match(/^data:image\/(\w+);base64,(.+)$/);
        if (base64Match && base64Match[2]) {
          const ext = base64Match[1].replace('jpeg', 'jpg');
          const buffer = Buffer.from(base64Match[2], 'base64');
          const contentType = `image/${base64Match[1]}`;
          const key = `groups/${slug}.${ext}`;

          try {
            finalImage = await uploadToR2(buffer, key, contentType);
            console.log(`[Group Create] Uploaded image to R2: ${key}`);
          } catch (uploadErr: any) {
            console.error('[Group Create] R2 upload failed:', uploadErr.message);
          }
        } else {
          console.warn('[Group Create] Invalid base64 image format, using default');
        }
      } else if (image.startsWith('https://')) {
        finalImage = image;
        console.log('[Group Create] Using image URL:', image);
      }
    } else {
      console.warn('[Group Create] No image provided, using default');
    }

    // Create group with pending status (createdBy optional for no-login submit)
    try {
      const group = await Group.create({
        name,
        slug,
        category,
        country: countryValue,
        telegramLink,
        description,
        image: finalImage,
        createdBy: user?._id ?? undefined,
        status: 'pending'
      });

      return NextResponse.json(group);
    } catch (createError: any) {
      console.error('[Group Create] Error creating group:', createError);
      throw createError;
    }
  } catch (error: any) {
    console.error('Error creating group:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to create group' },
      { status: 500 }
    );
  }
}

