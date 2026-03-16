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
 * PUT /api/admin/csv-import/dispatch
 *
 * Bulk update groups: set premiumOnly, category, country, status, description.
 * Body: { groupIds: string[], updates: { premiumOnly?, category?, country?, status?, description? } }
 */
export async function PUT(req: NextRequest) {
  try {
    await connectDB();
    const admin = await authenticate(req);
    if (!admin) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { groupIds, updates } = await req.json();

    if (!Array.isArray(groupIds) || groupIds.length === 0) {
      return NextResponse.json({ message: 'No group IDs provided' }, { status: 400 });
    }

    // addCategory: push a category into the categories array (max 3, no duplicates)
    if (updates?.addCategory && typeof updates.addCategory === 'string') {
      const cat = updates.addCategory.trim();
      const result = await Group.updateMany(
        { _id: { $in: groupIds }, $expr: { $lt: [{ $size: { $ifNull: ['$categories', []] } }, 3] }, categories: { $ne: cat } },
        { $push: { categories: cat } }
      );
      console.log(`[Dispatch] Added category "${cat}" to ${result.modifiedCount} groups (skipped groups already at 3 categories)`);
      return NextResponse.json({ modified: result.modifiedCount, updates: { addCategory: cat } });
    }

    const allowedFields: Record<string, boolean> = {
      premiumOnly: true,
      category: true,
      categories: true,
      country: true,
      status: true,
      description: true,
      name: true,
    };

    const cleanUpdates: Record<string, any> = {};
    for (const [key, value] of Object.entries(updates || {})) {
      if (allowedFields[key] && value !== undefined) {
        cleanUpdates[key] = value;
      }
    }

    if (Object.keys(cleanUpdates).length === 0) {
      return NextResponse.json({ message: 'No valid updates provided' }, { status: 400 });
    }

    const result = await Group.updateMany(
      { _id: { $in: groupIds } },
      { $set: cleanUpdates }
    );

    console.log(`[Dispatch] Updated ${result.modifiedCount} groups:`, cleanUpdates);

    return NextResponse.json({
      modified: result.modifiedCount,
      updates: cleanUpdates,
    });
  } catch (error: any) {
    console.error('[Dispatch] Error:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to update groups' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/csv-import/dispatch
 *
 * Bulk delete groups by IDs.
 * Body: { groupIds: string[] }
 */
export async function DELETE(req: NextRequest) {
  try {
    await connectDB();
    const admin = await authenticate(req);
    if (!admin) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { groupIds } = await req.json();

    if (!Array.isArray(groupIds) || groupIds.length === 0) {
      return NextResponse.json({ message: 'No group IDs provided' }, { status: 400 });
    }

    const result = await Group.deleteMany({ _id: { $in: groupIds } });

    console.log(`[Dispatch] Deleted ${result.deletedCount} groups`);

    return NextResponse.json({
      deleted: result.deletedCount,
    });
  } catch (error: any) {
    console.error('[Dispatch] Delete error:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to delete groups' },
      { status: 500 }
    );
  }
}
