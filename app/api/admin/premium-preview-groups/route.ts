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
    const maxResults = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '200', 10) || 200, 500);

    await connectDB();

    const query: Record<string, unknown> = {
      premiumOnly: true,
      status: 'approved',
    };
    if (category) {
      query.$or = [
        { category },
        { categories: category },
        { vaultCategories: category },
      ];
    }

    const groups = await Group.find(query)
      .sort({ showOnVaultTeaser: -1, memberCount: -1 })
      .limit(maxResults)
      .select('_id name image memberCount category categories showOnVaultTeaser')
      .lean();

    const allCats = new Set<string>();
    const result = groups.map((g: any) => {
      const cats: string[] = [
        ...(g.categories || []),
        ...(g.category ? [g.category] : []),
      ].filter(Boolean);
      cats.forEach(c => allCats.add(c));
      return {
        _id: g._id.toString(),
        name: g.name || '',
        image: g.image || '',
        memberCount: g.memberCount || 0,
        category: g.category || '',
        favourited: Boolean(g.showOnVaultTeaser),
      };
    });

    return NextResponse.json({
      groups: result,
      categories: [...allCats].sort(),
      total: result.length,
    });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || 'Failed' }, { status: 500 });
  }
}
