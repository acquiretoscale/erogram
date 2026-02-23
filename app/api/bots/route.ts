import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import { Bot, User } from '@/lib/models';
import { slugify } from '@/lib/utils/slugify';
import fs from 'fs';
import path from 'path';

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';

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
    const sortBy = searchParams.get('sortBy') || 'newest';
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

    if (sortBy === 'clickCount') {
      // For top bots by clicks, exclude pinned bots
      query = { status: 'approved', pinned: { $ne: true } };
      sortCriteria = { clickCount: -1 };
    } else if (sortBy === 'newest') {
      sortCriteria = { pinned: -1, createdAt: -1 };
    } else if (sortBy === 'oldest') {
      sortCriteria = { pinned: -1, createdAt: 1 };
    } else if (sortBy === 'popular') {
      sortCriteria = { pinned: -1, clickCount: -1, createdAt: -1 };
    } else if (sortBy === 'random') {
      // For random discovery, we'll handle this with aggregation below
      // Keep existing query (already has status: 'approved' and search/filters if provided)
    }

    let bots: any[];

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
            views: 1,
            memberCount: 1,
            createdBy: {
              username: 1,
              showNicknameUnderGroups: 1
            }
          }
        }
      ];

      const sampledBots = await Bot.aggregate(pipeline);

      // Sort to put pinned bots first, then take the slice we need
      sampledBots.sort((a: any, b: any) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return 0; // Keep random order for non-pinned
      });

      bots = sampledBots.slice(skip, skip + limit);
    } else {
      bots = await Bot.find(query)
        .populate('createdBy', 'username showNicknameUnderGroups')
        .sort(sortCriteria)
        .skip(skip)
        .limit(limit)
        .lean();
    }

    const sanitized = bots.map((b: any) => ({
      _id: b._id.toString(),
      name: b.name,
      slug: b.slug,
      category: b.category,
      country: b.country,
      description: b.description?.slice(0, 300) || '',
      image: b.image || (process.env.NEXT_PUBLIC_PLACEHOLDER_IMAGE_URL || '/assets/placeholder-no-image.png'),
      telegramLink: b.telegramLink,
      isAdvertisement: b.isAdvertisement || false,
      advertisementUrl: b.advertisementUrl || null,
      pinned: b.pinned || false,
      clickCount: b.clickCount || 0,
      views: b.views || 0,
      memberCount: b.memberCount || 0,
      createdBy: b.createdBy
        ? {
          username: b.createdBy.username,
          showNicknameUnderGroups: b.createdBy.showNicknameUnderGroups,
        }
        : null,
    }));

    return NextResponse.json({
      bots: sanitized,
      hasMore: sanitized.length === limit,
    });
  } catch (error: any) {
    console.error('Error fetching bots:', error);
    return NextResponse.json(
      { message: 'Failed to load bots' },
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
    while (await Bot.findOne({ slug })) {
      slug = `${baseSlug}-${counter++}`;
    }

    const defaultImage = process.env.NEXT_PUBLIC_PLACEHOLDER_IMAGE_URL || '/assets/placeholder-no-image.png';
    let finalImage = defaultImage;
    if (image?.startsWith('data:image/')) {
      const base64Match = image.match(/^data:image\/(\w+);base64,(.+)$/);
      if (base64Match?.[2]) {
        const ext = base64Match[1].replace('jpeg', 'jpg');
        const buffer = Buffer.from(base64Match[2], 'base64');
        const filename = `${slug}.${ext}`;
        const relativePath = `/uploads/bots/${filename}`;
        const absolutePath = path.join(process.cwd(), 'public/uploads/bots', filename);
        const dir = path.dirname(absolutePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(absolutePath, buffer);
        finalImage = relativePath;
      }
    } else if (image && image !== defaultImage && image !== '/assets/image.jpg') {
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

    const bot = await Bot.create(doc);
    return NextResponse.json(bot);
  } catch (error: any) {
    console.error('Error creating bot:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to create bot' },
      { status: 500 }
    );
  }
}
