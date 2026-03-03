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
 * POST /api/admin/csv-import/check-duplicates
 *
 * Accepts { telegramLinks: string[] }
 * Returns which telegram links already exist in the database.
 */
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const admin = await authenticate(req);
    if (!admin) {
      return NextResponse.json(
        { message: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    const { telegramLinks } = await req.json();

    if (!Array.isArray(telegramLinks) || telegramLinks.length === 0) {
      return NextResponse.json({ duplicates: [] });
    }

    // Normalize links for comparison (trim whitespace)
    const normalizedLinks = telegramLinks.map((l: string) => l.trim());

    const existing = await Group.find({
      telegramLink: { $in: normalizedLinks },
    })
      .select('telegramLink name')
      .lean();

    return NextResponse.json({
      duplicates: existing.map((g: any) => ({
        telegramLink: g.telegramLink,
        name: g.name,
      })),
    });
  } catch (error: any) {
    console.error('[CSV Import] Check duplicates error:', error);
    return NextResponse.json(
      { message: 'Failed to check duplicates' },
      { status: 500 }
    );
  }
}
