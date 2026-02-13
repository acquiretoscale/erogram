import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Group } from '@/lib/models';

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
    const group = await Group.findById(id).select('image').lean() as any;
    
    if (!group || !group.image) {
      return NextResponse.json(
        { message: 'Image not found' },
        { status: 404 }
      );
    }
    
    // If it's already a URL (not base64), return it
    if (!group.image.startsWith('data:image/')) {
      return NextResponse.json(
        { image: group.image },
        {
          headers: {
            'Cache-Control': IMAGE_CACHE_CONTROL,
            'CDN-Cache-Control': IMAGE_CACHE_CONTROL,
            'Vercel-CDN-Cache-Control': IMAGE_CACHE_CONTROL,
          },
        }
      );
    }
    
    // Return base64 image (only one at a time, so it's safe)
    return NextResponse.json(
      { image: group.image },
      {
        headers: {
          'Cache-Control': IMAGE_CACHE_CONTROL,
          'CDN-Cache-Control': IMAGE_CACHE_CONTROL,
          'Vercel-CDN-Cache-Control': IMAGE_CACHE_CONTROL,
        },
      }
    );
  } catch (error: any) {
    console.error('Error fetching group image:', error);
    return NextResponse.json(
      { message: 'Failed to load image' },
      { status: 500 }
    );
  }
}
