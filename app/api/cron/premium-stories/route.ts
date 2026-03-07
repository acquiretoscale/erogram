import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Group, StorySlideContent } from '@/lib/models';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

/**
 * Vercel Cron handler — runs every 24 hours.
 * Generates 2 "premium-grid" story slides for the EROGRAM category,
 * each showing the last 4 premium channels (8 total, 4 per slide).
 * Names are half-blurred in the viewer; CTA links to /premium.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return generatePremiumStories();
}

export async function generatePremiumStories() {
  try {
    await connectDB();

    let groups = await Group.find({
      status: 'approved',
      premiumOnly: true,
    })
      .sort({ createdAt: -1 })
      .limit(8)
      .select('name slug image memberCount category')
      .lean();

    // Fallback: if fewer than 8 premiumOnly, fill with latest approved groups
    if (groups.length < 8) {
      const existingSlugs = groups.map((g: any) => g.slug);
      const filler = await Group.find({
        status: 'approved',
        slug: { $nin: existingSlugs },
        isAdvertisement: { $ne: true },
      })
        .sort({ createdAt: -1 })
        .limit(8 - groups.length)
        .select('name slug image memberCount category')
        .lean();
      groups = [...groups, ...filler];
    }

    if (groups.length === 0) {
      return NextResponse.json({ message: 'No groups found', created: 0 });
    }

    // Remove previous premium-grid slides so they don't pile up
    await StorySlideContent.deleteMany({
      categorySlug: 'erogram',
      mediaType: 'premium-grid',
    });

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const created: string[] = [];

    const batches = [groups.slice(0, 4), groups.slice(4, 8)].filter((b) => b.length > 0);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const slide = await StorySlideContent.create({
        categorySlug: 'erogram',
        mediaType: 'premium-grid',
        mediaUrl: '',
        ctaText: 'Unlock Premium',
        ctaUrl: '/premium',
        caption: 'Latest additions to premium',
        enabled: true,
        expiresAt,
        // Negative sortOrder so they appear before other erogram slides
        sortOrder: -(batches.length - i),
        premiumGroups: batch.map((g: any) => ({
          name: g.name,
          slug: g.slug,
          image: g.image || '',
          memberCount: g.memberCount ?? 0,
          category: g.category || '',
        })),
      });
      created.push(slide._id.toString());
    }

    console.log(`[Cron/premium-stories] Created ${created.length} slide(s) for ${groups.length} premium groups`);

    return NextResponse.json({
      message: `Created ${created.length} premium story slide(s)`,
      slidesCreated: created.length,
      groupsUsed: groups.length,
    });
  } catch (error: any) {
    console.error('[Cron/premium-stories] Error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
