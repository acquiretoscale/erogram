import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Group } from '@/lib/models';
import { authenticateUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = await authenticateUser(req);
  if (!user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  if (!user.premium && !user.isAdmin) {
    return NextResponse.json({ message: 'Premium required', upgrade: true }, { status: 403 });
  }

  await connectDB();

  const { searchParams } = new URL(req.url);
  const skip = parseInt(searchParams.get('skip') || '0');
  const limit = Math.min(parseInt(searchParams.get('limit') || '24'), 100);
  const search = searchParams.get('search') || '';
  const category = searchParams.get('category') || '';

  const query: any = { premiumOnly: true, status: 'approved' };

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }

  if (category && category !== 'All') {
    query.category = category;
  }

  const [groups, total] = await Promise.all([
    Group.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('name slug image category country description memberCount telegramLink createdAt')
      .lean(),
    Group.countDocuments(query),
  ]);

  return NextResponse.json({
    groups: groups.map((g: any) => ({
      ...g,
      _id: g._id.toString(),
    })),
    total,
    hasMore: skip + limit < total,
  });
}
