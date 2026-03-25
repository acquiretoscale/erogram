import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { TrendingOFCreator } from '@/lib/models';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  await connectDB();

  const category = req.nextUrl.searchParams.get('category') || '';

  const filter: Record<string, any> = { active: true };
  if (category) {
    filter.categories = category;
  }

  const creators = await TrendingOFCreator.find(filter)
    .limit(12)
    .select('_id name username avatar url bio categories position')
    .lean();

  const mapped = (creators as any[]).map((c) => ({
    _id: c._id.toString(),
    name: c.name,
    username: c.username,
    avatar: c.avatar || '',
    url: c.url,
    bio: c.bio || '',
    categories: c.categories || [],
    position: c.position,
  }));

  // Fisher-Yates shuffle so every request returns a different order
  for (let i = mapped.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [mapped[i], mapped[j]] = [mapped[j], mapped[i]];
  }

  return NextResponse.json(mapped);
}
