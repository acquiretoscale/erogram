import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import mongoose from 'mongoose';
import { getRequestCountry, parseCountryCode } from '@/lib/utils/geo';

/**
 * Lightweight page-hit beacon.
 * Stores { sid, ts, country? } in `sitevisits` (TTL-indexed, auto-expires after 1h).
 * Used to derive real-time "active visitors in last 30 min" for the media kit.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sid, country: bodyCountry } = body ?? {};
    if (!sid || typeof sid !== 'string') {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    await connectDB();
    const col = mongoose.connection.db!.collection('sitevisits');
    const country = getRequestCountry(req) || parseCountryCode(bodyCountry);

    col.createIndex({ ts: 1 }, { expireAfterSeconds: 3600 }).catch(() => {});
    col.createIndex({ sid: 1 }, { unique: true }).catch(() => {});

    const update: Record<string, unknown> = { sid, ts: new Date() };
    if (country) update.country = country;

    await col.updateOne(
      { sid },
      { $set: update },
      { upsert: true },
    );

    if (country) {
      const eventsCol = mongoose.connection.db!.collection('sitevisit_events');
      eventsCol.createIndex({ ts: 1 }, { expireAfterSeconds: 3600 }).catch(() => {});
      await eventsCol.insertOne({ sid, country, ts: new Date() });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export async function GET() {
  try {
    await connectDB();
    const col = mongoose.connection.db!.collection('sitevisits');

    await col.createIndex({ ts: 1 }, { expireAfterSeconds: 3600 });

    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);
    const count = await col.countDocuments({ ts: { $gte: thirtyMinAgo } });

    return NextResponse.json({ activeVisitors: count });
  } catch {
    return NextResponse.json({ activeVisitors: 0 });
  }
}
