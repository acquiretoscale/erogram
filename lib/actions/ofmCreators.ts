'use server';

import connectDB from '@/lib/db/mongodb';
import { OnlyFansCreator } from '@/lib/models';

export interface TopCreator {
  _id: string;
  name: string;
  username: string;
  slug: string;
  avatar: string;
  clicks: number;
  subscriberCount: number;
  categories: string[];
}

export async function getTopClickedCreators(limit = 100): Promise<TopCreator[]> {
  await connectDB();
  const docs = await OnlyFansCreator.find({ clicks: { $gt: 0 } })
    .sort({ clicks: -1 })
    .limit(limit)
    .select('name username slug avatar clicks subscriberCount categories')
    .lean() as any[];

  return docs.map((d, i) => ({
    _id: String(d._id),
    name: d.name || '',
    username: d.username || '',
    slug: d.slug || '',
    avatar: d.avatar || '',
    clicks: d.clicks || 0,
    subscriberCount: d.subscriberCount || 0,
    categories: d.categories || [],
  }));
}
