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

// Update advert
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const admin = await authenticate(req);
    if (!admin) {
      return NextResponse.json(
        { message: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const { name, category, country, url, description, image, status, pinned, isPopupAdvert, buttonText, redirectTimer, button2Enabled, button2Text, button2Url, button3Enabled, button3Text, button3Url } = body;

    // Debug log
    console.log('Updating advert with popup fields:', {
      isPopupAdvert: isPopupAdvert,
      buttonText: buttonText,
      redirectTimer: redirectTimer,
      button2Enabled: button2Enabled,
      button3Enabled: button3Enabled
    });

    const oldAdvert = await Advert.findById(id);
    if (!oldAdvert) {
      return NextResponse.json(
        { message: 'Advert not found' },
        { status: 404 }
      );
    }

    // Update the document instance directly (same approach that worked for isPopupAdvert)
    oldAdvert.category = category;
    oldAdvert.country = country;
    oldAdvert.url = url;
    oldAdvert.description = description;
    oldAdvert.image = image;
    oldAdvert.status = status === 'active' ? 'active' : 'inactive';
    oldAdvert.pinned = pinned === true;
    oldAdvert.isPopupAdvert = isPopupAdvert === true;
    oldAdvert.buttonText = buttonText || 'Visit Site';
    oldAdvert.redirectTimer = redirectTimer || 7;
    
    // Explicitly set button fields
    oldAdvert.button2Enabled = Boolean(button2Enabled);
    oldAdvert.button2Text = button2Text || '';
    oldAdvert.button2Url = button2Url || '';
    oldAdvert.button3Enabled = Boolean(button3Enabled);
    oldAdvert.button3Text = button3Text || '';
    oldAdvert.button3Url = button3Url || '';
    oldAdvert.updatedAt = new Date();

    console.log('Update data buttons:', {
      button2Enabled: oldAdvert.button2Enabled,
      button3Enabled: oldAdvert.button3Enabled
    });

    // Handle name change - regenerate slug if name changed
    if (name && name !== oldAdvert.name) {
      oldAdvert.name = name;
      const baseSlug = slugify(name);
      let slug = baseSlug;
      let counter = 1;
      while (await Advert.findOne({ slug, _id: { $ne: id } })) {
        slug = `${baseSlug}-${counter++}`;
      }
      oldAdvert.slug = slug;
    }

    // Save the document directly
    const advert = await oldAdvert.save();

    if (!advert) {
      return NextResponse.json(
        { message: 'Advert not found' },
        { status: 404 }
      );
    }

    // Debug: Log what was actually saved
    console.log('Advert after update - isPopupAdvert:', advert.isPopupAdvert, 'buttonText:', advert.buttonText, 'redirectTimer:', advert.redirectTimer);
    console.log('Advert after update - button2Enabled:', advert.button2Enabled, 'button3Enabled:', advert.button3Enabled);
    
    // Verify by fetching again with explicit field selection
    const verifyAdvert = await Advert.findById(id).select('isPopupAdvert button2Enabled button3Enabled button2Text button2Url button3Text button3Url').lean();
    console.log('Verified advert from DB - isPopupAdvert:', (verifyAdvert as any)?.isPopupAdvert);
    console.log('Verified advert from DB - button2Enabled:', (verifyAdvert as any)?.button2Enabled, 'button3Enabled:', (verifyAdvert as any)?.button3Enabled);
    console.log('Full verified advert:', JSON.stringify(verifyAdvert, null, 2));

    return NextResponse.json(advert);
  } catch (error: any) {
    console.error('Error updating advert:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to update advert' },
      { status: 500 }
    );
  }
}

// Delete advert
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const admin = await authenticate(req);
    if (!admin) {
      return NextResponse.json(
        { message: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const advert = await Advert.findByIdAndDelete(id);

    if (!advert) {
      return NextResponse.json(
        { message: 'Advert not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Advert deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting advert:', error);
    return NextResponse.json(
      { message: 'Failed to delete advert' },
      { status: 500 }
    );
  }
}

