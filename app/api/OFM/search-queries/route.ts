import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { SearchQuery } from '@/lib/models';

/**
 * GET /api/OFM/search-queries?page=1&limit=50&sort=searchCount
 * Returns paginated search queries for admin view.
 */
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);
    const sort = searchParams.get('sort') || 'searchCount';
    const order = searchParams.get('order') === 'asc' ? 1 : -1;
    const filter = searchParams.get('filter') || 'all'; // all | scraped | pending | failed

    const match: Record<string, any> = {};
    if (filter === 'scraped') match.scrapeStatus = 'done';
    else if (filter === 'pending') match.scrapeStatus = 'pending';
    else if (filter === 'failed') match.scrapeStatus = 'failed';
    else if (filter === 'scraping') match.scrapeStatus = 'scraping';

    const skip = (page - 1) * limit;

    const [queries, total] = await Promise.all([
      SearchQuery.find(match)
        .sort({ [sort]: order })
        .skip(skip)
        .limit(limit)
        .lean(),
      SearchQuery.countDocuments(match),
    ]);

    return NextResponse.json({
      queries: queries.map((q: any) => ({ ...q, _id: q._id.toString() })),
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    console.error('Search queries GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/OFM/search-queries
 * Body: { id: string } — deletes a single query
 */
export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    await connectDB();
    await SearchQuery.findByIdAndDelete(id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * PATCH /api/OFM/search-queries
 * Body: { action: 'reset-stuck' }
 * Resets all stuck 'scraping' and 'failed' queries to 'pending' so they retry.
 */
export async function PATCH(req: NextRequest) {
  try {
    const { action } = await req.json();
    if (action !== 'reset-stuck') {
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }

    await connectDB();

    const result = await SearchQuery.updateMany(
      { scrapeStatus: { $in: ['scraping', 'failed'] } },
      { $set: { scrapeStatus: 'pending', scraped: false } },
    );

    return NextResponse.json({ success: true, reset: result.modifiedCount });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
