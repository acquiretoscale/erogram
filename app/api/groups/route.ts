import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import { Group, User, Post, SystemConfig } from '@/lib/models';
import { slugify } from '@/lib/utils/slugify';
import fs from 'fs';
import path from 'path';

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
            // Include only the fields we need (inclusion projection)
            _id: 1,
            name: 1,
            slug: 1,
            category: 1,
            country: 1,
            description: 1,
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
        .select('-image') // Exclude image field to prevent loading huge base64 strings
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

    const sanitized = groups.map((g: any) => {
      const stats = reviewStatsMap.get(g._id.toString()) || { reviewCount: 0, averageRating: 0 };
      return {
        _id: g._id.toString(),
        name: g.name,
        slug: g.slug,
        category: g.category,
        country: g.country,
        description: g.description?.slice(0, 300) || '',
        image: '/assets/image.jpg', // Always use placeholder to prevent maxSize errors
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
    if (!user) {
      return NextResponse.json(
        { message: 'Unauthorized - Please login first' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { name, category, country, telegramLink, description, image } = body;

    // Debug: Log image data received
    const imagePreview = image ? (image.substring(0, 100) + (image.length > 100 ? '...' : '')) : 'null';
    console.log(`[Group Create] Received image data: ${imagePreview} (length: ${image?.length || 0}, isBase64: ${image?.startsWith('data:image/') || false})`);

    // Validation
    if (!name || !category || !country || !telegramLink || !description) {
      return NextResponse.json(
        { message: 'All fields are required' },
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

    // Generate unique slug
    const baseSlug = slugify(name);
    let slug = baseSlug;
    let counter = 1;
    while (await Group.findOne({ slug })) {
      slug = `${baseSlug}-${counter++}`;
    }

    // Validate and prepare image
    let finalImage = '/assets/image.jpg';
    if (image) {
      // Check if it's a valid base64 data URI
      if (image.startsWith('data:image/')) {
        // Validate base64 data URI format
        const base64Match = image.match(/^data:image\/(\w+);base64,(.+)$/);
        if (base64Match && base64Match[2]) {
          const ext = base64Match[1].replace('jpeg', 'jpg');
          const base64Data = base64Match[2];
          const buffer = Buffer.from(base64Data, 'base64');

          // Generate filename
          const filename = `${slug}.${ext}`;
          const relativePath = `/uploads/groups/${filename}`;
          const absolutePath = path.join(process.cwd(), 'public/uploads/groups', filename);

          // Ensure directory exists
          const dir = path.dirname(absolutePath);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }

          // Write file
          fs.writeFileSync(absolutePath, buffer);
          finalImage = relativePath;
          console.log(`[Group Create] Saved image to ${relativePath}`);
        } else {
          console.warn('[Group Create] Invalid base64 image format, using default');
        }
      } else if (image !== '/assets/image.jpg') {
        // Allow other image formats (URLs, etc.)
        finalImage = image;
        console.log('[Group Create] Using image URL:', image);
      }
    } else {
      console.warn('[Group Create] No image provided, using default');
    }

    // Create group with pending status
    try {
      const group = await Group.create({
        name,
        slug,
        category,
        country,
        telegramLink,
        description,
        image: finalImage,
        createdBy: user._id,
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

