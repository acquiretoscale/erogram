import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Group, StorySlideContent } from '@/lib/models';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

/**
 * Vercel Cron handler — runs every 24 hours.
 * Generates premium-grid story slides for the EROGRAM category,
 * each showing up to 4 favourited vault groups per niche.
 * Names are half-blurred in the viewer; CTA links to /premium.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return generatePremiumStories();
}

async function generatePremiumStories() {
  try {
    await connectDB();

    // Prefer favourited vault groups first, then fall back to premiumOnly
    let groups = await Group.find({
      status: 'approved',
      premiumOnly: true,
      showOnVaultTeaser: true,
    })
      .sort({ vaultTeaserOrder: 1, memberCount: -1 })
      .select('name slug image memberCount category')
      .lean();

    if (groups.length < 8) {
      const existingIds = new Set(groups.map((g: any) => g._id.toString()));
      const more = await Group.find({
        status: 'approved',
        premiumOnly: true,
        _id: { $nin: Array.from(existingIds) },
      })
        .sort({ memberCount: -1 })
        .limit(8 - groups.length)
        .select('name slug image memberCount category')
        .lean();
      groups = [...groups, ...more];
    }

    if (groups.length === 0) {
      return NextResponse.json({ message: 'No groups found', created: 0 });
    }

    // Group by category for niche-specific slides
    const byCategory: Record<string, any[]> = {};
    for (const g of groups) {
      const cat = (g as any).category || 'Mixed';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(g);
    }

    await StorySlideContent.deleteMany({
      categorySlug: 'erogram',
      mediaType: 'premium-grid',
    });

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const created: string[] = [];
    let slideOrder = -100;

    for (const [cat, catGroups] of Object.entries(byCategory)) {
      const batch = catGroups.slice(0, 4);
      if (batch.length === 0) continue;

      const slide = await StorySlideContent.create({
        categorySlug: 'erogram',
        mediaType: 'premium-grid',
        mediaUrl: '',
        ctaText: 'Unlock Premium',
        ctaUrl: '/premium',
        caption: `Best ${cat} in Premium`,
        enabled: true,
        expiresAt,
        sortOrder: slideOrder++,
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
