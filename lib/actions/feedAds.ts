'use server';

import { unstable_noStore as noStore } from 'next/cache';
import connectDB from '@/lib/db/mongodb';
import { Advert } from '@/lib/models';

/** In-feed ad positions on groups page (same spacing as legacy: 3, 6, 9, 12, …) */
const FEED_POSITIONS = [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36];

/**
 * In-feed ads for the groups page from the Adverts section (Admin → Adverts).
 * Single source of truth: edit in Adverts and it reflects on the live site.
 * Returns same shape as feed campaigns so GroupsClient/VirtualizedGroupGrid work unchanged.
 */
export async function getActiveFeedFromAdverts(): Promise<Array<{
  _id: string;
  name: string;
  creative: string;
  destinationUrl: string;
  slot: string;
  position: number;
  description: string;
  category: string;
  country: string;
  buttonText: string;
}>> {
  noStore();
  await connectDB();

  const adverts = await Advert.find({
    status: 'active',
    isPopupAdvert: { $ne: true },
  })
    .sort({ clickCount: -1, createdAt: -1 })
    .limit(FEED_POSITIONS.length)
    .select('_id name image url description category country buttonText')
    .lean();

  return adverts.map((a: any, i: number) => ({
    _id: a._id.toString(),
    name: a.name || '',
    creative: a.image || '/assets/image.jpg',
    destinationUrl: a.url || '',
    slot: 'feed',
    position: FEED_POSITIONS[i] ?? i + 1,
    description: a.description || '',
    category: a.category || 'All',
    country: a.country || 'All',
    buttonText: a.buttonText || 'Visit Site',
  }));
}
