import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Group } from '@/lib/models';
import { sendNewGroupTelegramNotification } from '@/lib/utils/telegramNotify';
import { pingIndexNow } from '@/lib/utils/indexNow';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

/**
 * Vercel Cron handler — runs every 10 minutes.
 * Finds groups with status='scheduled' whose scheduledPublishAt has passed,
 * flips them to 'approved', and triggers notifications + IndexNow.
 */
export async function GET(req: NextRequest) {
  // Verify Vercel cron secret
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectDB();

    const now = new Date();
    const groupsToPublish = await Group.find({
      status: 'scheduled',
      scheduledPublishAt: { $lte: now },
    })
      .sort({ scheduledPublishAt: 1 })
      .limit(3); // Max 3 per run to stay within timeout

    const results: { id: string; name: string; slug: string }[] = [];

    for (const group of groupsToPublish) {
      group.status = 'approved';
      group.scheduledPublishAt = null;
      await group.save();

      try {
        const groupObj = {
          _id: group._id.toString(),
          name: group.name,
          slug: group.slug,
          category: group.category,
          country: group.country,
          description: group.description,
          telegramLink: group.telegramLink,
          image: group.image,
          views: group.views || 0,
        };
        await sendNewGroupTelegramNotification(groupObj, false);
      } catch (err) {
        console.error(`[Cron] Telegram notification failed for ${group.name}:`, err);
      }

      try {
        pingIndexNow(`https://erogram.pro/${group.slug}`);
      } catch (err) {
        console.error(`[Cron] IndexNow ping failed for ${group.slug}:`, err);
      }

      results.push({ id: group._id.toString(), name: group.name, slug: group.slug });
    }

    // Get next scheduled group for logging
    const nextScheduled = await Group.findOne({ status: 'scheduled' })
      .sort({ scheduledPublishAt: 1 })
      .select('scheduledPublishAt name')
      .lean();

    console.log(
      `[Cron] Published ${results.length} groups. Next scheduled: ${
        nextScheduled ? `${(nextScheduled as any).name} at ${(nextScheduled as any).scheduledPublishAt}` : 'none'
      }`
    );

    return NextResponse.json({
      published: results.length,
      groups: results,
      nextScheduled: nextScheduled
        ? { name: (nextScheduled as any).name, scheduledPublishAt: (nextScheduled as any).scheduledPublishAt }
        : null,
    });
  } catch (error: any) {
    console.error('[Cron] Error publishing scheduled groups:', error);
    return NextResponse.json(
      { error: 'Failed to process scheduled groups' },
      { status: 500 }
    );
  }
}
