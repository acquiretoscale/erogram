import { NextRequest, NextResponse } from 'next/server';

// Proxies RedGifs thumbnail images to avoid hotlink protection blocking <img> tags.
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) return new NextResponse('Missing url', { status: 400 });

  // Only allow RedGifs domains
  if (!/^https:\/\/(thumbs\d*|i|media\d*|media)\.redgifs\.com\//i.test(url)) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  try {
    const res = await fetch(url, {
      headers: {
        Referer: 'https://www.redgifs.com/',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
    });
    if (!res.ok) return new NextResponse('Upstream error', { status: 502 });

    const contentType = res.headers.get('content-type') || 'image/jpeg';
    const buffer = await res.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch {
    return new NextResponse('Fetch failed', { status: 502 });
  }
}
