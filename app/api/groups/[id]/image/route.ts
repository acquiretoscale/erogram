import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Group } from '@/lib/models';
import { getR2PublicUrl } from '@/lib/r2';

const IMAGE_CACHE_CONTROL =
  // Safer TTL: images may change for the same DB id.
  'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400';

/** Resolve stored image value to a URL the client can use. Use relative path for same-origin so next/image works locally. */
function resolveImageUrl(stored: string, origin: string): string {
  if (!stored || typeof stored !== 'string') return '';
  if (stored.startsWith('https://')) return stored;
  if (stored.startsWith('/')) return stored;
  const r2Url = getR2PublicUrl();
  if (r2Url) return `${r2Url.replace(/\/$/, '')}/${stored}`;
  return `${origin}/uploads/groups/${stored}`;
}

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

    const origin = req.nextUrl?.origin || (req.headers.get('host') ? `${req.headers.get('x-forwarded-proto') || 'https'}://${req.headers.get('host')}` : '') || 'https://erogram.pro';
    const resolved = resolveImageUrl(group.image, origin) || (process.env.NEXT_PUBLIC_PLACEHOLDER_IMAGE_URL || '/assets/placeholder-no-image.png');
    
    return NextResponse.json(
      { image: resolved },
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
