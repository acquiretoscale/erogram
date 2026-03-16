import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Advert } from '@/lib/models';

const IMAGE_CACHE_CONTROL =
  // Safer TTL: images may change for the same DB id.
  'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    
    const { id } = await params;
    const advert = await Advert.findById(id).select('image').lean() as any;
    
    if (!advert || !advert.image) {
      return NextResponse.json(
        { message: 'Image not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { image: advert.image },
      {
        headers: {
          'Cache-Control': IMAGE_CACHE_CONTROL,
          'CDN-Cache-Control': IMAGE_CACHE_CONTROL,
          'Vercel-CDN-Cache-Control': IMAGE_CACHE_CONTROL,
        },
      }
    );
  } catch (error: any) {
    console.error('Error fetching advert image:', error);
    return NextResponse.json(
      { message: 'Failed to load image' },
      { status: 500 }
    );
  }
}
