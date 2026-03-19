import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import { User, Group, StorySlideContent } from '@/lib/models';

export const dynamic = 'force-dynamic';
const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';

async function authenticate(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    const decoded = jwt.verify(authHeader.substring(7), JWT_SECRET) as any;
    const user = await User.findById(decoded.id);
    return user?.isAdmin ? user : null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  return handleGenerate(req);
}

export async function POST(req: NextRequest) {
  return handleGenerate(req);
}

async function handleGenerate(req: NextRequest) {
  try {
    await connectDB();
    const admin = await authenticate(req);
    if (!admin) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    // Prefer favourited vault groups (showOnVaultTeaser: true) first, then fall back to premiumOnly
    let groups = await Group.find({
      status: 'approved',
      premiumOnly: true,
      showOnVaultTeaser: true,
    })
      .sort({ vaultTeaserOrder: 1, memberCount: -1 })
      .select('name slug image memberCount category')
      .lean();

    // If not enough favourited, fill with remaining premiumOnly groups
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
      return NextResponse.json({ message: 'No groups found', slidesCreated: 0, groupsUsed: 0 });
    }

    // Group by category to create niche-specific slides
    const byCategory: Record<string, any[]> = {};
    for (const g of groups) {
      const cat = (g as any).category || 'Mixed';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(g);
    }

    // Remove previous premium-grid slides
    const deleted = await StorySlideContent.deleteMany({
      categorySlug: 'erogram',
      mediaType: 'premium-grid',
    });

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const created: string[] = [];
    let slideOrder = -100;

    // Create one slide per category (up to 4 groups each)
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

    // If we have fewer than 2 slides, create a "Mixed" catch-all from any remaining
    if (created.length < 2 && groups.length >= 4) {
      const usedSlugs = new Set<string>();
      for (const [, catGroups] of Object.entries(byCategory)) {
        for (const g of catGroups.slice(0, 4)) usedSlugs.add((g as any).slug);
      }
      const remaining = groups.filter((g: any) => !usedSlugs.has(g.slug)).slice(0, 4);
      if (remaining.length > 0) {
        const slide = await StorySlideContent.create({
          categorySlug: 'erogram',
          mediaType: 'premium-grid',
          mediaUrl: '',
          ctaText: 'Unlock Premium',
          ctaUrl: '/premium',
          caption: 'Latest additions to premium',
          enabled: true,
          expiresAt,
          sortOrder: slideOrder++,
          premiumGroups: remaining.map((g: any) => ({
            name: g.name,
            slug: g.slug,
            image: g.image || '',
            memberCount: g.memberCount ?? 0,
            category: g.category || '',
          })),
        });
        created.push(slide._id.toString());
      }
    }

    return NextResponse.json({
      message: `Created ${created.length} premium story slide(s)`,
      slidesCreated: created.length,
      groupsUsed: groups.length,
      previousDeleted: deleted.deletedCount,
    });
  } catch (error: any) {
    console.error('[Admin/generate-premium-stories] Error:', error);
    return NextResponse.json({ message: error.message || 'Server error' }, { status: 500 });
  }
}
