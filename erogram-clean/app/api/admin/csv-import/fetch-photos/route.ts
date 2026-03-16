import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import sharp from 'sharp';
import connectDB from '@/lib/db/mongodb';
import { User, Group } from '@/lib/models';
import { uploadToR2, isR2Configured } from '@/lib/r2';
import { slugify } from '@/lib/utils/slugify';

export const maxDuration = 120;

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';

async function authenticate(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = await User.findById(decoded.id);
    if (user && user.isAdmin) return user;
  } catch { /* invalid token */ }
  return null;
}

function extractUsername(telegramLink: string): string | null {
  if (!telegramLink) return null;
  if (/t\.me\/\+/.test(telegramLink) || /t\.me\/joinchat\//i.test(telegramLink)) return null;

  const match = telegramLink.match(/t\.me\/([a-zA-Z][a-zA-Z0-9_]{3,})/);
  if (!match) return null;

  const username = match[1];
  const reserved = ['joinchat', 'addstickers', 'addtheme', 'proxy', 'socks', 'setlanguage', 'share'];
  if (reserved.includes(username.toLowerCase())) return null;

  return username;
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/**
 * Scrape the public t.me/{username} page and extract the og:image URL.
 * This avoids the Telegram Bot API entirely — no rate limits, no bot token needed.
 */
async function scrapeProfilePhoto(username: string): Promise<string | null> {
  const url = `https://t.me/${username}`;
  const res = await fetch(url, {
    signal: AbortSignal.timeout(12000),
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      'Accept': 'text/html',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });

  if (!res.ok) {
    console.log(`[Fetch Photo] t.me/${username} returned ${res.status}`);
    return null;
  }

  const html = await res.text();

  // Extract og:image from <meta property="og:image" content="...">
  const ogMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i)
    || html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:image["']/i);

  if (!ogMatch || !ogMatch[1]) {
    console.log(`[Fetch Photo] No og:image found for @${username}`);
    return null;
  }

  const imageUrl = ogMatch[1];

  // Telegram's default placeholder (no profile picture set)
  if (imageUrl.includes('telegram-peer-photo-size') === false && imageUrl.includes('cdn') === false && !imageUrl.startsWith('https://cdn')) {
    // Check for known default/placeholder patterns
    if (imageUrl.includes('placeholder') || imageUrl.length < 20) {
      console.log(`[Fetch Photo] @${username} has default avatar (no custom photo)`);
      return null;
    }
  }

  return imageUrl;
}

async function downloadImage(imageUrl: string): Promise<Buffer | null> {
  try {
    const res = await fetch(imageUrl, {
      signal: AbortSignal.timeout(15000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      },
    });

    if (!res.ok) {
      console.log(`[Fetch Photo] Image download failed: ${res.status} for ${imageUrl}`);
      return null;
    }

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) {
      console.log(`[Fetch Photo] Not an image: ${contentType}`);
      return null;
    }

    return Buffer.from(await res.arrayBuffer());
  } catch (err: any) {
    console.log(`[Fetch Photo] Image download error: ${err.message}`);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const admin = await authenticate(req);
    if (!admin) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    if (!isR2Configured()) {
      return NextResponse.json({ message: 'R2 storage not configured' }, { status: 503 });
    }

    const { groupIds, force } = await req.json();
    if (!Array.isArray(groupIds) || groupIds.length === 0) {
      return NextResponse.json({ results: [] });
    }

    const idsToProcess = groupIds.slice(0, 5);
    const results: { id: string; status: 'success' | 'failed' | 'skipped'; url?: string; error?: string }[] = [];

    for (let idx = 0; idx < idsToProcess.length; idx++) {
      const id = idsToProcess[idx];
      try {
        const group = await Group.findById(id);
        if (!group) { results.push({ id, status: 'skipped', error: 'Not found' }); continue; }

        if (!force && group.image && group.image !== '/assets/image.jpg' && group.image !== '/assets/placeholder-no-image.png') {
          results.push({ id, status: 'skipped', error: 'Already has image' });
          continue;
        }

        const username = extractUsername(group.telegramLink || '');
        if (!username) {
          results.push({ id, status: 'skipped', error: `Private/invalid link: ${group.telegramLink}` });
          continue;
        }

        if (idx > 0) await sleep(500);

        const imageUrl = await scrapeProfilePhoto(username);
        if (!imageUrl) {
          results.push({ id, status: 'failed', error: `No photo for @${username}` });
          continue;
        }

        const photoBuffer = await downloadImage(imageUrl);
        if (!photoBuffer) {
          results.push({ id, status: 'failed', error: `Could not download photo for @${username}` });
          continue;
        }

        let compressed = await sharp(photoBuffer)
          .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer();

        if (compressed.length > 200 * 1024) {
          compressed = await sharp(photoBuffer)
            .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 55 })
            .toBuffer();
        }

        const safeName = slugify(group.name);
        const uniqueSuffix = group._id.toString().slice(-6);
        const key = `uploads/${safeName}-NSFW-Telegram-${uniqueSuffix}.webp`;

        const url = await uploadToR2(compressed, key, 'image/webp');

        await Group.findByIdAndUpdate(id, { image: url, sourceImageUrl: null });

        results.push({ id, status: 'success', url });
        console.log(`[Fetch Photo] ✓ Got photo for "${group.name}" (@${username})`);
      } catch (err: any) {
        console.error(`[Fetch Photo] ✗ Failed for ${id}:`, err.message);
        results.push({ id, status: 'failed', error: err.message });
      }
    }

    return NextResponse.json({ results });
  } catch (error: any) {
    console.error('[Fetch Photo] Error:', error);
    return NextResponse.json({ message: error.message || 'Failed' }, { status: 500 });
  }
}
