import { NextRequest, NextResponse } from 'next/server';
import { AINSFW_GALLERY } from '@/app/ainsfw/galleryMap';
import { getPublicToolGallery, isToolGalleryManaged } from '@/lib/actions/ainsfwAdmin';

/**
 * Owner order 2026-08-05: NO web scraping, ever. Galleries come only from
 * admin uploads or the curated R2 map. A tool with no curated gallery shows none.
 */
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug');

  if (!slug) {
    return NextResponse.json({ images: [] }, { status: 400 });
  }

  const [adminGallery, galleryManaged] = await Promise.all([
    getPublicToolGallery(slug),
    isToolGalleryManaged(slug),
  ]);
  if (galleryManaged) {
    return NextResponse.json({ images: adminGallery });
  }

  return NextResponse.json({ images: AINSFW_GALLERY[slug] ?? [] });
}
