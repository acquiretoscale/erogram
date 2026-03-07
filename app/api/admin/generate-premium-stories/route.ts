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

    // Fetch the last 8 premium channels (premiumOnly: true)
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
      return NextResponse.json({ message: 'No groups found', slidesCreated: 0, groupsUsed: 0 });
    }

    // Remove previous premium-grid slides
    const deleted = await StorySlideContent.deleteMany({
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
