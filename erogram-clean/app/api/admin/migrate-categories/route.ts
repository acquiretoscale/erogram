import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Group, Bot } from '@/lib/models';

/**
 * POST /api/admin/migrate-categories
 * One-time migration: backfill `categories` array from legacy `category` + `country` fields.
 * Safe to run multiple times — skips documents that already have categories populated.
 */
export async function POST() {
  try {
    await connectDB();

    const SKIP_VALUES = new Set(['', 'All', 'Adult-Telegram']);

    const backfill = async (Model: any, label: string) => {
      const docs = await Model.find({
        $or: [{ categories: { $exists: false } }, { categories: { $size: 0 } }],
      })
        .select('category country categories')
        .lean();

      let updated = 0;
      for (const doc of docs as any[]) {
        const cats: string[] = [];
        if (doc.category && !SKIP_VALUES.has(doc.category)) cats.push(doc.category);
        if (doc.country && !SKIP_VALUES.has(doc.country)) cats.push(doc.country);
        if (cats.length === 0) cats.push('Adult');

        await Model.updateOne({ _id: doc._id }, { $set: { categories: cats } });
        updated++;
      }
      return { label, total: docs.length, updated };
    };

    const [groupResult, botResult] = await Promise.all([
      backfill(Group, 'groups'),
      backfill(Bot, 'bots'),
    ]);

    return NextResponse.json({ ok: true, groupResult, botResult });
  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
