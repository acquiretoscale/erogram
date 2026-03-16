import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Advert } from '@/lib/models';

// Get active popup advert (public endpoint)
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const popupAdvert = await Advert.findOne({
      status: 'active',
      isPopupAdvert: true,
    })
      .sort({ pinned: -1, createdAt: -1 })
      .lean();
    
    const imageUrl = (popupAdvert as any)?.image || (process.env.NEXT_PUBLIC_PLACEHOLDER_IMAGE_URL || '/assets/placeholder-no-image.png');

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

