import { NextRequest, NextResponse } from 'next/server';

interface RedGifsGif {
  id: string;
  urls: {
    hd?: string;
    sd?: string;
    thumbnail?: string;
    poster?: string;
  };
  tags?: string[];
  userName?: string;
  views?: number;
  likes?: number;
}

interface RedGifsError {
  code?: string;
  message?: string;
  target?: string;
}

async function getRedGifsToken(): Promise<string> {
  const res = await fetch('https://api.redgifs.com/v2/auth/temporary', {
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error('Failed to get RedGifs token');
  const data = await res.json();
  return data.token as string;
}

function mapGifs(gifs: RedGifsGif[]) {
  return gifs
    .filter(g => g.urls?.hd || g.urls?.sd)
    .map(g => ({
      id: g.id,
      importUrl: g.urls.hd || g.urls.sd || '',
      thumbnail: g.urls.thumbnail || g.urls.poster || g.urls.sd || '',
      views: g.views || 0,
      likes: g.likes || 0,
      userName: g.userName || '',
    }));
}

async function fetchNiche(token: string, slug: string, count: number): Promise<{ results?: ReturnType<typeof mapGifs>; error?: RedGifsError }> {
  const url = `https://api.redgifs.com/v2/niches/${encodeURIComponent(slug)}/gifs?count=${count}&order=best`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Referer: 'https://www.redgifs.com/' },
  });
  const data = await res.json();

  if (data.error) {
    // Handle renamed niches by following the redirect
    if (data.error.code === 'NicheMoved' && data.error.target) {
      return fetchNiche(token, data.error.target, count);
    }
    return { error: data.error };
  }

  return { results: mapGifs(data.gifs || []) };
}

async function fetchSearch(token: string, query: string, count: number): Promise<ReturnType<typeof mapGifs>> {
  const url = `https://api.redgifs.com/v2/gifs/search?search_text=${encodeURIComponent(query)}&count=${count}&order=trending`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Referer: 'https://www.redgifs.com/' },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return mapGifs(data.gifs || []);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const count = Math.min(parseInt(searchParams.get('count') || '20'), 80);

  // Accept either a full RedGifs URL, a niche slug, or a search term
  const rawInput = (searchParams.get('niche') || searchParams.get('q') || '').trim();
  if (!rawInput) {
    return NextResponse.json({ error: 'Missing search term' }, { status: 400 });
  }

  // Extract niche slug if it's a URL
  const nicheSlug = rawInput
    .replace(/^https?:\/\/(www\.)?redgifs\.com\/niches\//i, '')
    .replace(/[?#].*$/, '')
    .trim();

  try {
    const token = await getRedGifsToken();

    // Try the niches endpoint first
    const nicheResult = await fetchNiche(token, nicheSlug, count);

    if (nicheResult.results && nicheResult.results.length > 0) {
      return NextResponse.json({ results: nicheResult.results, total: nicheResult.results.length, source: 'niche' });
    }

    // Niche failed (disabled, not found, or empty) — fall back to search
    const searchResults = await fetchSearch(token, nicheSlug, count);

    if (searchResults.length > 0) {
      return NextResponse.json({ results: searchResults, total: searchResults.length, source: 'search' });
    }

    // Both failed
    const hint = nicheResult.error?.code === 'NicheDisabled'
      ? `"${nicheSlug}" is disabled on RedGifs. Try a different niche like "thick-booty", "booty-shorts", etc.`
      : `No results for "${nicheSlug}". Try a different term.`;

    return NextResponse.json({ error: hint, results: [] }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
