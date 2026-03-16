import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import { User, Advert } from '@/lib/models';
import { slugify } from '@/lib/utils/slugify';


const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';

async function authenticate(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = await User.findById(decoded.id);
    if (user && user.isAdmin) {
      return user;
    }
  } catch (error) {
    return null;
  }
  return null;
}

// Get all adverts
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const admin = await authenticate(req);
    if (!admin) {
      return NextResponse.json(
        { message: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    const adverts = await Advert.find({})
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(adverts);
  } catch (error: any) {
    console.error('Error fetching adverts:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to fetch adverts' },
      { status: 500 }
    );
  }
}

// Create new advert
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const admin = await authenticate(req);
    if (!admin) {
      return NextResponse.json(
        { message: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { name, category, country, url, description, image, status, pinned, isPopupAdvert, buttonText, redirectTimer, button2Enabled, button2Text, button2Url, button3Enabled, button3Text, button3Url } = body;

    // Debug log
    console.log('Creating advert with popup fields:', {
      isPopupAdvert: isPopupAdvert,
      buttonText: buttonText,
      redirectTimer: redirectTimer
    });

    // Validation
    if (!name || !category || !country || !url || !description || !image) {
      return NextResponse.json(
        { message: 'Name, category, country, URL, description, and image are required' },
        { status: 400 }
      );
    }

    // Generate unique slug
    const baseSlug = slugify(name);
    let slug = baseSlug;
    let counter = 1;
    while (await Advert.findOne({ slug })) {
      slug = `${baseSlug}-${counter++}`;
    }

    // Create advert - explicitly handle boolean values
    const advert = new Advert();
    advert.name = name;
    advert.slug = slug;
    advert.category = category;
    advert.country = country;
    advert.url = url;
    advert.description = description;
    advert.image = image;
    advert.status = status === 'active' ? 'active' : 'inactive';
    advert.pinned = pinned === true;
    advert.isPopupAdvert = isPopupAdvert === true;
    advert.buttonText = buttonText || 'Visit Site';
    advert.redirectTimer = redirectTimer || 7;
    advert.button2Enabled = button2Enabled === true;
    advert.button2Text = button2Text || '';
    advert.button2Url = button2Url || '';
    advert.button3Enabled = button3Enabled === true;
    advert.button3Text = button3Text || '';
    advert.button3Url = button3Url || '';
    advert.createdBy = admin._id;

    // Ensure booleans are explicitly set
    if (advert.button2Enabled === undefined) advert.button2Enabled = false;
    if (advert.button3Enabled === undefined) advert.button3Enabled = false;

    console.log('Creating advert with buttons:', {
      button2Enabled: advert.button2Enabled,
      button3Enabled: advert.button3Enabled
    });

    console.log('Advert created with isPopupAdvert:', advert.isPopupAdvert);

    await advert.save();

    return NextResponse.json(advert);
  } catch (error: any) {
    console.error('Error creating advert:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to create advert' },
      { status: 500 }
    );
  }
}

