import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { TgPostLog } from '@/lib/models';

const CTA_KEY = 'cta';

interface CtaVariant {
  name: string;
  caption: string;
  buttons: { text: string; url: string }[][];
}

function migrateToVariants(doc: any): CtaVariant[] {
  if (Array.isArray(doc.data?.variants) && doc.data.variants.length > 0) {
    return doc.data.variants;
  }
  if (doc.data?.caption || (doc.data?.buttons && doc.data.buttons.length > 0)) {
    return [{ name: 'A', caption: doc.data.caption || '', buttons: doc.data.buttons || [] }];
  }
  return [];
}

export async function GET() {
  await connectDB();
  const db = mongoose.connection.db;
  const doc = await db.collection('tgsettings').findOne({ key: CTA_KEY });

  if (!doc) {
    return NextResponse.json({
      enabled: false,
      frequency: 3,
      variants: [],
      variantStats: {},
    });
  }

  const variants = migrateToVariants(doc);

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const stats = await TgPostLog.aggregate([
    { $match: { ctaVariant: { $ne: '', $exists: true }, status: 'success', postedAt: { $gte: thirtyDaysAgo } } },
    { $group: { _id: '$ctaVariant', count: { $sum: 1 } } },
  ]);
  const variantStats: Record<string, number> = {};
  for (const s of stats) {
    variantStats[s._id] = s.count;
  }

  return NextResponse.json({
    enabled: (doc as any).enabled ?? false,
    frequency: (doc as any).data?.frequency ?? 3,
    variants,
    variantStats,
  });
}

export async function PUT(req: NextRequest) {
  await connectDB();
  const body = await req.json();
  const { enabled, frequency, variants } = body;

  const db = mongoose.connection.db;
  const update = {
    $set: {
      key: CTA_KEY,
      enabled: enabled ?? false,
      data: {
        frequency: frequency ?? 3,
        variants: variants ?? [],
      },
    },
  };

  await db.collection('tgsettings').updateOne({ key: CTA_KEY }, update, { upsert: true });
  const doc = await db.collection('tgsettings').findOne({ key: CTA_KEY });

  return NextResponse.json({
    ok: true,
    enabled: (doc as any)?.enabled ?? false,
    frequency: (doc as any)?.data?.frequency ?? 3,
    variants: (doc as any)?.data?.variants ?? [],
  });
}
