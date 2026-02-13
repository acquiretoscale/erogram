import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Advert } from '@/lib/models';

// Get active popup advert (public endpoint)
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    // Find the first active popup advert (prioritize pinned ones)
    // Exclude image field initially, we'll fetch it separately if needed
    const popupAdvert = await Advert.findOne({
      status: 'active',
      isPopupAdvert: true,
    })
      .select('-image') // Exclude image field to prevent maxSize errors
      .sort({ pinned: -1, createdAt: -1 })
      .lean();
    
    // If popup advert found, fetch image separately
    let imageUrl = '/assets/image.jpg';
    if (popupAdvert) {
      const advertWithImage = await Advert.findById((popupAdvert as any)._id).select('image').lean() as any;
      if (advertWithImage?.image) {
        // Return the image whether it's base64 or URL
        imageUrl = advertWithImage.image;
        // Debug log to verify image is being fetched
        console.log(`[Popup Advert] Image fetched for ${(popupAdvert as any).name}: ${imageUrl.substring(0, 50)}${imageUrl.length > 50 ? '...' : ''} (length: ${imageUrl.length})`);
      } else {
        console.log(`[Popup Advert] No image found for ${(popupAdvert as any).name}`);
      }
    }

    if (!popupAdvert) {
      // Debug: Check if there are any adverts with isPopupAdvert field
      const allAdverts = await Advert.find({ status: 'active' }).select('name isPopupAdvert').lean();
      console.log('No popup advert found. Active adverts:', allAdverts.map((a: any) => ({ 
        name: a.name, 
        isPopupAdvert: a.isPopupAdvert 
      })));
      return NextResponse.json({ popupAdvert: null });
    }

    // Debug log
    console.log('Found popup advert:', (popupAdvert as any).name, 'isPopupAdvert:', (popupAdvert as any).isPopupAdvert);

    // Increment view count (fire and forget)
    Advert.findByIdAndUpdate((popupAdvert as any)._id, {
      $inc: { views: 1 }
    }).catch(err => console.error('Error updating popup advert views:', err));

    return NextResponse.json({
      popupAdvert: {
        _id: (popupAdvert as any)._id.toString(),
        name: (popupAdvert as any).name,
        url: (popupAdvert as any).url,
        image: imageUrl, // Returns actual image (base64 or URL)
        buttonText: (popupAdvert as any).buttonText || 'Visit Site',
        redirectTimer: (popupAdvert as any).redirectTimer || 7,
        button2Enabled: (popupAdvert as any).button2Enabled || false,
        button2Text: (popupAdvert as any).button2Text || '',
        button2Url: (popupAdvert as any).button2Url || '',
        button3Enabled: (popupAdvert as any).button3Enabled || false,
        button3Text: (popupAdvert as any).button3Text || '',
        button3Url: (popupAdvert as any).button3Url || '',
      }
    });
  } catch (error: any) {
    console.error('Error fetching popup advert:', error);
    return NextResponse.json(
      { message: 'Failed to load popup advert', popupAdvert: null },
      { status: 500 }
    );
  }
}

