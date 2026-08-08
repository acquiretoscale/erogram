import { NextRequest, NextResponse } from 'next/server';
import { getPublicToolGallery } from '@/lib/actions/ainsfwAdmin';

/**
 * Owner order: galleries come from admin/listing-owner saves via resolveGallery.
 * Hardcoded map is only the default seed when nothing has been managed yet.
 * Empty managed gallery = intentionally empty (no fallback).
 */
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug');

  if (!slug) {
    return NextResponse.json({ images: [] }, { status: 400 });
  }

  const images = await getPublicToolGallery(slug);
  return NextResponse.json({ images });
}
