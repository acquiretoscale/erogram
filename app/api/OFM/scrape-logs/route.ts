import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { ScrapeRun } from '@/lib/models';

/**
 * GET /api/OFM/scrape-logs?page=1&limit=50&source=all&status=all
 * Returns paginated scrape run logs for the admin Logs page.
 */
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);
    const source = searchParams.get('source') || 'all';
    const status = searchParams.get('status') || 'all';

    const match: Record<string, any> = {};
    if (source !== 'all') match.source = source;
    if (status !== 'all') match.status = status;

    const skip = (page - 1) * limit;

    const [logs, total, stats] = await Promise.all([
      ScrapeRun.find(match)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ScrapeRun.countDocuments(match),
      ScrapeRun.aggregate([
        {
          $group: {
            _id: null,
            totalRuns: { $sum: 1 },
            totalSaved: { $sum: '$saved' },
            totalItems: { $sum: '$totalItems' },
            avgDuration: { $avg: '$durationMs' },
            succeeded: { $sum: { $cond: [{ $eq: ['$status', 'succeeded'] }, 1, 0] } },
            failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
            searchTriggered: { $sum: { $cond: [{ $eq: ['$source', 'search'] }, 1, 0] } },
            bulkTriggered: { $sum: { $cond: [{ $eq: ['$source', 'bulk'] }, 1, 0] } },
          },
        },
      ]),
    ]);

    return NextResponse.json({
      logs: logs.map((l: any) => ({ ...l, _id: l._id.toString() })),
      total,
      page,
      pages: Math.ceil(total / limit),
      stats: stats[0] || { totalRuns: 0, totalSaved: 0, totalItems: 0, avgDuration: 0, succeeded: 0, failed: 0, searchTriggered: 0, bulkTriggered: 0 },
    });
  } catch (error: any) {
    console.error('Scrape logs GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/OFM/scrape-logs
 * Body: { id?: string, clearAll?: boolean }
 */
export async function DELETE(req: NextRequest) {
  try {
    const { id, clearAll } = await req.json();
    await connectDB();

    if (clearAll) {
      const result = await ScrapeRun.deleteMany({});
      return NextResponse.json({ success: true, deleted: result.deletedCount });
    }

    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    await ScrapeRun.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
