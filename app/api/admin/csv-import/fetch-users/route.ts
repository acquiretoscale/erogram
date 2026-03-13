import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import { User, Group } from '@/lib/models';

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

function parseCount(text: string): number | null {
  const cleaned = text.replace(/\s+/g, ' ').trim().toLowerCase();

  // "12 345 members" or "12,345 subscribers"
  const numMatch = cleaned.match(/([\d\s,.\u00a0]+)\s*(members?|subscribers?|online)/);
  if (numMatch) {
    const raw = numMatch[1].replace(/[\s,.\u00a0]/g, '');
    const n = parseInt(raw, 10);
    if (!isNaN(n) && n > 0) return n;
  }

  return null;
}

async function scrapeMemberCount(username: string): Promise<number | null> {
  const url = `https://t.me/${username}`;
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(12000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        'Accept': 'text/html',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!res.ok) return null;

    const html = await res.text();

    // Pattern 1: <div class="tgme_page_extra">N members</div>
    const extraMatch = html.match(/class="tgme_page_extra"[^>]*>([\s\S]*?)<\/div>/i);
    if (extraMatch) {
      const count = parseCount(extraMatch[1]);
      if (count) return count;
    }

    // Pattern 2: meta description often contains "N members"
    const metaDesc = html.match(/<meta\s+(?:name|property)=["'](?:og:)?description["']\s+content=["']([^"']+)["']/i)
      || html.match(/<meta\s+content=["']([^"']+)["']\s+(?:name|property)=["'](?:og:)?description["']/i);
    if (metaDesc) {
      const count = parseCount(metaDesc[1]);
      if (count) return count;
    }

    // Pattern 3: any "N members" or "N subscribers" text in the page
    const anyMatch = html.match(/([\d\s,.\u00a0]+)\s*(members|subscribers)/i);
    if (anyMatch) {
      const raw = anyMatch[1].replace(/[\s,.\u00a0]/g, '');
      const n = parseInt(raw, 10);
      if (!isNaN(n) && n > 0) return n;
    }

    return null;
  } catch {
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

    const { groupIds } = await req.json();
    if (!Array.isArray(groupIds) || groupIds.length === 0) {
      return NextResponse.json({ results: [] });
    }

    const idsToProcess = groupIds.slice(0, 10);
    const results: { id: string; status: 'success' | 'failed' | 'skipped'; memberCount?: number; error?: string }[] = [];

    for (let idx = 0; idx < idsToProcess.length; idx++) {
      const id = idsToProcess[idx];
      try {
        const group = await Group.findById(id);
        if (!group) { results.push({ id, status: 'skipped', error: 'Not found' }); continue; }

        const username = extractUsername(group.telegramLink || '');
        if (!username) {
          results.push({ id, status: 'skipped', error: 'Private/invalid link' });
          continue;
        }

        if (idx > 0) await sleep(400);

        const memberCount = await scrapeMemberCount(username);
        if (memberCount === null) {
          results.push({ id, status: 'failed', error: `Could not get count for @${username}` });
          continue;
        }

        await Group.findByIdAndUpdate(id, { memberCount });
        results.push({ id, status: 'success', memberCount });
        console.log(`[Fetch Users] ✓ @${username}: ${memberCount.toLocaleString()} members`);
      } catch (err: any) {
        console.error(`[Fetch Users] ✗ Failed for ${id}:`, err.message);
        results.push({ id, status: 'failed', error: err.message });
      }
    }

    return NextResponse.json({ results });
  } catch (error: any) {
    console.error('[Fetch Users] Error:', error);
    return NextResponse.json({ message: error.message || 'Failed' }, { status: 500 });
  }
}
