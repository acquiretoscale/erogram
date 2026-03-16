import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Group } from '@/lib/models';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization');
    if (!auth?.startsWith('Bearer ')) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const category = req.nextUrl.searchParams.get('category');

    await connectDB();

    const query: Record<string, unknown> = {
      premiumOnly: true,
      status: 'approved',
    };
    if (category) {
      query.$or = [
        { category },
        { vaultCategories: category },
      ];
    }

    const groups = await Group.find(query)
      .sort({ showOnVaultTeaser: -1, memberCount: -1 })
      .limit(8)
      .select('_id name image memberCount category')
      .lean();

    const result = groups.map((g: any) => ({
      _id: g._id.toString(),
      name: g.name || '',
      image: g.image || '',
      memberCount: g.memberCount || 0,
      category: g.category || '',
    }));

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ message: err.message || 'Failed' }, { status: 500 });
  }
}
