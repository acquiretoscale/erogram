import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Advert } from '@/lib/models';

// Disable Next.js caching to ensure true per-request randomization
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Get all active adverts (public endpoint) - excludes popup adverts
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    // Fetch active non-popup adverts in random order per request
    const adverts = await Advert.aggregate([
      {
        $match: {
          status: 'active',
          isPopupAdvert: { $ne: true }
        }
      },
      {
        $sample: { size: 1000 }
      }
    ]);

    return NextResponse.json(adverts);
  } catch (error: any) {
    console.error('Error fetching adverts:', error);
    return NextResponse.json(
      { message: 'Failed to load adverts' },
      { status: 500 }
    );
  }
}
