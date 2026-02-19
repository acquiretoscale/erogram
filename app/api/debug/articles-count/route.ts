/**
 * Diagnostic: which DB the app uses and how many articles it sees.
 * GET /api/debug/articles-count
 * Remove or protect this route in production.
 */
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db/mongodb';
import { Article } from '@/lib/models';

export async function GET() {
  try {
    const uriSet = Boolean(process.env.MONGODB_URI);
    await connectDB();
    const dbName = mongoose.connection?.db?.databaseName ?? 'unknown';
    const count = await Article.countDocuments({});
    return NextResponse.json({
      ok: true,
      dbName,
      articleCount: count,
      uriSet,
      env: process.env.NODE_ENV,
    });
  } catch (error: any) {
    console.error('debug/articles-count:', error);
    return NextResponse.json(
      {
        ok: false,
        error: error?.message ?? String(error),
        articleCount: 0,
        uriSet: Boolean(process.env.MONGODB_URI),
      },
      { status: 500 }
    );
  }
}
