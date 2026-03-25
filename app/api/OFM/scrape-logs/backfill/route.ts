import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { ScrapeRun, SearchQuery, OnlyFansCreator } from '@/lib/models';

/**
 * POST /api/OFM/scrape-logs/backfill
 * Reconstructs ScrapeRun history from:
 *   1. SearchQuery records (search-triggered scrapes)
 *   2. OnlyFansCreator grouped by category + scrapedAt date (bulk scrapes)
 */
export async function POST() {
  try {
    await connectDB();

    const existingCount = await ScrapeRun.countDocuments();
    let searchCreated = 0;
    let bulkCreated = 0;

    // ── 1. Backfill from SearchQuery ─────────────────────────────
    // Only backfill successful scrapes — failed ones never cost Apify credits
    // and just clutter the logs
    const queries = await SearchQuery.find({
      scrapeStatus: 'done',
    }).lean();

    for (const q of queries as any[]) {
      const alreadyExists = await ScrapeRun.findOne({
        source: 'search',
        query: q.queryNormalized || q.query?.toLowerCase(),
        startedAt: q.scrapedAt || q.lastSearchedAt || q.createdAt,
      });
      if (alreadyExists) continue;

      await ScrapeRun.create({
        source: 'search',
        query: q.queryNormalized || q.query?.toLowerCase(),
        runId: '',
        actorId: 'unknown (backfilled)',
        status: 'succeeded',
        maxItems: 200,
        totalItems: q.resultsCount || 0,
        saved: q.resultsCount || 0,
        skipped: 0,
        clean: false,
        error: '',
        apiKeyHint: '????',
        startedAt: q.scrapedAt || q.lastSearchedAt || q.createdAt,
        completedAt: q.scrapedAt || null,
        durationMs: 0,
      });
      searchCreated++;
    }

    // ── 2. Backfill from OnlyFansCreator category+scrapedAt ──────
    // Group creators by category and scrapedAt date to reconstruct bulk runs
    const bulkRuns: any[] = await OnlyFansCreator.aggregate([
      { $match: { scrapedAt: { $exists: true, $ne: null }, categories: { $exists: true, $ne: [] } } },
      { $unwind: '$categories' },
      {
        $group: {
          _id: {
            category: '$categories',
            // Group by date (day granularity) to cluster scrapes
            date: { $dateToString: { format: '%Y-%m-%d', date: '$scrapedAt' } },
          },
          count: { $sum: 1 },
          earliest: { $min: '$scrapedAt' },
          latest: { $max: '$scrapedAt' },
        },
      },
      { $sort: { earliest: -1 } },
    ]);

    // Exclude categories that came from search-triggered scrapes
    const searchQuerySet = new Set(
      (queries as any[]).map((q) => (q.queryNormalized || q.query?.toLowerCase() || '').trim()),
    );

    for (const run of bulkRuns) {
      const cat = run._id.category;
      if (searchQuerySet.has(cat)) continue;

      const alreadyExists = await ScrapeRun.findOne({
        source: 'bulk',
        query: cat,
        startedAt: { $gte: run.earliest, $lte: run.latest },
      });
      if (alreadyExists) continue;

      await ScrapeRun.create({
        source: 'bulk',
        query: cat,
        runId: '',
        actorId: 'unknown (backfilled)',
        status: 'succeeded',
        maxItems: run.count,
        totalItems: run.count,
        saved: run.count,
        skipped: 0,
        clean: false,
        error: '',
        apiKeyHint: '????',
        startedAt: run.earliest,
        completedAt: run.latest,
        durationMs: run.latest && run.earliest
          ? new Date(run.latest).getTime() - new Date(run.earliest).getTime()
          : 0,
      });
      bulkCreated++;
    }

    // Count failed search queries separately (didn't cost credits, just FYI)
    const failedSearchQueries = await SearchQuery.countDocuments({ scrapeStatus: 'failed' });

    const newTotal = await ScrapeRun.countDocuments();

    return NextResponse.json({
      success: true,
      previousCount: existingCount,
      searchCreated,
      bulkCreated,
      failedSearchQueries,
      totalNow: newTotal,
    });
  } catch (error: any) {
    console.error('Backfill error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
