import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const TAVILY_KEY = process.env.TAVILY_API_KEY || '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';

const GALLERY_DIR = path.join(process.cwd(), 'public', 'assets', 'ainsfw', 'gallery');
const TARGET_COUNT = 6;
const MIN_WIDTH = 600;
const MAX_WIDTH = 1000;
const JPG_QUALITY = 95;

function slugDir(slug: string) {
  return path.join(GALLERY_DIR, slug.replace(/[^a-z0-9-]/gi, ''));
}

function getExistingImages(slug: string): string[] {
  const dir = slugDir(slug);
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.jpg')).sort();
  return files.map(f => `/assets/ainsfw/gallery/${slug}/${f}`);
}

async function downloadAndProcess(url: string, outPath: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
    });
    clearTimeout(timeout);

    if (!res.ok) return false;

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('image')) return false;

    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length < 5000) return false; // skip tiny images / icons

    const meta = await sharp(buffer).metadata();
    if (!meta.width || meta.width < MIN_WIDTH) return false;

    const resizeWidth = Math.min(meta.width, MAX_WIDTH);

    await sharp(buffer)
      .resize(resizeWidth, undefined, { withoutEnlargement: true })
      .jpeg({ quality: JPG_QUALITY, mozjpeg: true })
      .toFile(outPath);

    return true;
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug');
  const name = req.nextUrl.searchParams.get('name');
  const vendor = req.nextUrl.searchParams.get('vendor');

  if (!slug || !name) {
    return NextResponse.json({ images: [] }, { status: 400 });
  }

  // Return cached images if already processed
  const existing = getExistingImages(slug);
  if (existing.length >= TARGET_COUNT) {
    return NextResponse.json({ images: existing });
  }

  // Ensure directory exists
  const dir = slugDir(slug);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  try {
    const query = `${name} ${vendor || ''} app screenshots interface preview`;
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: TAVILY_KEY,
        query,
        search_depth: 'basic',
        include_images: true,
        include_image_descriptions: false,
        max_results: 10,
      }),
    });

    if (!res.ok) {
      console.error('Tavily error:', res.status);
      return NextResponse.json({ images: existing });
    }

    const data = await res.json();

    // Collect all candidate URLs from top-level images + per-result images
    const candidateUrls: string[] = [];
    if (data.images) {
      for (const img of data.images) {
        const url = typeof img === 'string' ? img : img?.url;
        if (url) candidateUrls.push(url);
      }
    }
    if (data.results) {
      for (const r of data.results) {
        if (r.images) {
          for (const img of r.images) {
            const url = typeof img === 'string' ? img : img?.url;
            if (url && !candidateUrls.includes(url)) candidateUrls.push(url);
          }
        }
      }
    }

    // Download, resize, convert — stop once we have 6
    let saved = existing.length;
    const finalImages = [...existing];

    for (const url of candidateUrls) {
      if (saved >= TARGET_COUNT) break;

      const fileName = `${saved + 1}.jpg`;
      const outPath = path.join(dir, fileName);

      if (fs.existsSync(outPath)) {
        saved++;
        continue;
      }

      const ok = await downloadAndProcess(url, outPath);
      if (ok) {
        finalImages.push(`/assets/ainsfw/gallery/${slug}/${fileName}`);
        saved++;
      }
    }

    return NextResponse.json({ images: finalImages });
  } catch (err) {
    console.error('Gallery fetch error:', err);
    return NextResponse.json({ images: existing });
  }
}
