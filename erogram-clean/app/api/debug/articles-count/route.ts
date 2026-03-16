/**
 * Diagnostic: which DB the app uses and how many articles it sees.
 * GET /api/debug/articles-count
 * uriHost shows which MongoDB host the app is using (so you can confirm Atlas vs VPS).
 */
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db/mongodb';
import { Article } from '@/lib/models';

function getUriHostHint(uri: string | undefined): string {
  if (!uri) return 'none';
  try {
    const match = uri.match(/@([^/]+)/);
    if (match) return match[1].split(':')[0];
    const m2 = uri.match(/\/\/([^:/]+)/);
    if (m2) return m2[1];
  } catch (_) {}
  return 'hidden';
}

export async function GET() {
  const uri = process.env.MONGODB_URI;
  const uriSet = Boolean(uri);
  const uriHost = getUriHostHint(uri);
  try {
    await connectDB();
    const dbName = mongoose.connection?.db?.databaseName ?? 'unknown';
    const count = await Article.countDocuments({});
    return NextResponse.json({
      ok: true,
      dbName,
      articleCount: count,
      uriSet,
      uriHost,
      env: process.env.NODE_ENV,
    });
  } catch (error: any) {
    console.error('debug/articles-count:', error);
    return NextResponse.json(
      {
        ok: false,
        error: error?.message ?? String(error),
        articleCount: 0,
        uriSet,
        uriHost,
      },
      { status: 500 }
    );
  }
}
