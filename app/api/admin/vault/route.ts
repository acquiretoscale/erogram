import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import { User, Group, SiteConfig } from '@/lib/models';

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

// GET: list all premiumOnly groups + vault teaser config
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const admin = await authenticate(req);
    if (!admin) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { searchParams } = req.nextUrl;
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';

    const query: any = { premiumOnly: true, status: 'approved' };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }
    if (category && category !== 'All') query.category = category;

    const groups = await Group.find(query)
      .sort({ vaultTeaserOrder: 1, createdAt: -1 })
      .select('name slug image category country description memberCount showOnVaultTeaser vaultTeaserOrder vaultCategories telegramLink createdAt')
      .lean();

    const config = await SiteConfig.findOne({});
    const vaultTeaserCategories = config?.vaultTeaserCategories || [];

    return NextResponse.json({
      groups: groups.map((g: any) => ({ ...g, _id: g._id.toString() })),
      total: groups.length,
      vaultTeaserCategories,
    });
  } catch (err: any) {
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}

// PUT: bulk update groups (toggle teaser visibility, reorder, edit fields)
export async function PUT(req: NextRequest) {
  try {
    await connectDB();
    const admin = await authenticate(req);
    if (!admin) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const body = await req.json();

    // Update a single group
    if (body.groupId) {
      const updates: any = {};
      if (body.showOnVaultTeaser !== undefined) updates.showOnVaultTeaser = body.showOnVaultTeaser;
      if (body.vaultTeaserOrder !== undefined) updates.vaultTeaserOrder = body.vaultTeaserOrder;
      if (body.category !== undefined) updates.category = body.category;
      if (body.country !== undefined) updates.country = body.country;
      if (body.image !== undefined) updates.image = body.image;
      if (body.name !== undefined) updates.name = body.name;
      if (body.description !== undefined) updates.description = body.description;
      if (body.vaultCategories !== undefined) updates.vaultCategories = body.vaultCategories;

      await Group.findByIdAndUpdate(body.groupId, updates);
      return NextResponse.json({ ok: true });
    }

    // Bulk reorder: body.order = [{ _id, vaultTeaserOrder }]
    if (body.order && Array.isArray(body.order)) {
      const ops = body.order.map((item: any) => ({
        updateOne: {
          filter: { _id: item._id },
          update: { $set: { vaultTeaserOrder: item.vaultTeaserOrder } },
        },
      }));
      await Group.bulkWrite(ops);
      return NextResponse.json({ ok: true });
    }

    // Update vault teaser category config
    if (body.vaultTeaserCategories !== undefined) {
      await SiteConfig.findOneAndUpdate(
        {},
        { $set: { vaultTeaserCategories: body.vaultTeaserCategories } },
        { upsert: true },
      );
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ message: 'No action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}

// DELETE: remove a group from the vault (sets premiumOnly=false, clears vault fields)
export async function DELETE(req: NextRequest) {
  try {
    await connectDB();
    const admin = await authenticate(req);
    if (!admin) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { groupId } = await req.json();
    if (!groupId) return NextResponse.json({ message: 'Missing groupId' }, { status: 400 });

    await Group.findByIdAndUpdate(groupId, {
      $set: {
        premiumOnly: false,
        showOnVaultTeaser: false,
        vaultTeaserOrder: 999,
        vaultCategories: [],
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}
