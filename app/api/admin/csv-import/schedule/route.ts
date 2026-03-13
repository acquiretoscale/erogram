import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import { User, Group } from '@/lib/models';

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';

async function authenticate(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = await User.findById(decoded.id);
    if (user && user.isAdmin) return user;
  } catch { /* invalid token */ }
  return null;
}

/**
 * GET /api/admin/csv-import/schedule
 *
 * Returns groups sorted by publish date.
 * Query params:
 *   ?status=pending    — fetch pending (pre-schedule) groups
 *   ?status=scheduled  — fetch scheduled groups (default)
 *   ?batchId=xxx       — filter by import batch
 */
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const admin = await authenticate(req);
    if (!admin) {
      return NextResponse.json(
        { message: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get('status') || 'scheduled';
    const batchId = searchParams.get('batchId');

    const query: any = { status: statusFilter };
    if (batchId) query.importBatchId = batchId;

    const groups = await Group.find(query)
      .sort(statusFilter === 'scheduled' ? { scheduledPublishAt: 1 } : { createdAt: -1 })
      .select(
        'name slug category categories country telegramLink description description_de description_es image memberCount scheduledPublishAt importBatchId sourceImageUrl premiumOnly status'
      )
      .lean();

    const totalScheduled = groups.length;
    const batches = [...new Set(groups.map((g: any) => g.importBatchId).filter(Boolean))];
    const nextPublish = groups.length > 0 && statusFilter === 'scheduled'
      ? (groups[0] as any).scheduledPublishAt
      : null;
    const lastPublish = groups.length > 0 && statusFilter === 'scheduled'
      ? (groups[groups.length - 1] as any).scheduledPublishAt
      : null;
    const pendingImages = groups.filter((g: any) => g.sourceImageUrl).length;

    return NextResponse.json({
      totalScheduled,
      batchCount: batches.length,
      nextPublish,
      lastPublish,
      pendingImages,
      groups: groups.map((g: any) => ({
        ...g,
        _id: g._id.toString(),
      })),
    });
  } catch (error: any) {
    console.error('[Schedule] Fetch error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch scheduled groups' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/csv-import/schedule
 *
 * Cancel scheduled groups — by individual group ID or entire batch.
 * Body: { groupId?: string, batchId?: string }
 */
export async function DELETE(req: NextRequest) {
  try {
    await connectDB();

    const admin = await authenticate(req);
    if (!admin) {
      return NextResponse.json(
        { message: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    const { groupId, batchId } = await req.json();

    if (batchId) {
      const result = await Group.deleteMany({
        importBatchId: batchId,
        status: 'scheduled',
      });
      console.log(`[Schedule] Cancelled batch ${batchId}: ${result.deletedCount} groups removed`);
      return NextResponse.json({
        message: `Cancelled ${result.deletedCount} scheduled groups from batch`,
        deleted: result.deletedCount,
      });
    }

    if (groupId) {
      const group = await Group.findOneAndDelete({
        _id: groupId,
        status: 'scheduled',
      });
      if (!group) {
        return NextResponse.json(
          { message: 'Scheduled group not found' },
          { status: 404 }
        );
      }
      console.log(`[Schedule] Cancelled single group: ${group.name}`);
      return NextResponse.json({
        message: `Cancelled scheduled group: ${group.name}`,
        deleted: 1,
      });
    }

    return NextResponse.json(
      { message: 'Provide groupId or batchId' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('[Schedule] Delete error:', error);
    return NextResponse.json(
      { message: 'Failed to cancel scheduled groups' },
      { status: 500 }
    );
  }
}
