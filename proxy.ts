import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 301-redirect article slugs that still reference the old "2026" year
  // back to the canonical "2025" versions stored in the database.
  // This heals URLs that Google crawled before the slug revert.
  if (pathname.startsWith('/articles/') && pathname.includes('2026')) {
    const corrected = pathname.replace(/2026/g, '2025');
    if (corrected !== pathname) {
      const url = request.nextUrl.clone();
      url.pathname = corrected;
      return NextResponse.redirect(url, 301);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/articles/:slug*',
};
