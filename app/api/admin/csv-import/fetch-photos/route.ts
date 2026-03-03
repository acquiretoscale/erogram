import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import sharp from 'sharp';
import connectDB from '@/lib/db/mongodb';
import { User, Group } from '@/lib/models';
import { uploadToR2, isR2Configured } from '@/lib/r2';
import { slugify } from '@/lib/utils/slugify';

export const maxDuration = 60;

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

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
  const match = telegramLink.match(/t\.me\/\+?([a-zA-Z0-9_]+)/);
  if (!match) return null;
  const username = match[1];
  if (username.startsWith('+')) return null;
  return username;
}

async function fetchTelegramPhoto(username: string): Promise<Buffer | null> {
  if (!BOT_TOKEN) return null;

  const chatRes = await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/getChat?chat_id=@${username}`,
    { signal: AbortSignal.timeout(10000) }
  );
  const chatData = await chatRes.json();

  if (!chatData.ok || !chatData.result?.photo) return null;

  const fileId = chatData.result.photo.big_file_id || chatData.result.photo.small_file_id;
  if (!fileId) return null;

  const fileRes = await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`,
    { signal: AbortSignal.timeout(10000) }
  );
  const fileData = await fileRes.json();

  if (!fileData.ok || !fileData.result?.file_path) return null;

  const photoRes = await fetch(
    `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileData.result.file_path}`,
    { signal: AbortSignal.timeout(15000) }
  );

  if (!photoRes.ok) return null;

  return Buffer.from(await photoRes.arrayBuffer());
}

/**
 * POST /api/admin/csv-import/fetch-photos
 *
 * Fetches Telegram profile photos for groups missing images.
 * Extracts username from telegramLink, calls Telegram Bot API,
 * compresses with sharp, uploads to R2.
 *
 * Body: { groupIds: string[] }  (max 5 per call to stay within timeouts)
 */
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const admin = await authenticate(req);
    if (!admin) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    if (!BOT_TOKEN) {
      return NextResponse.json({ message: 'TELEGRAM_BOT_TOKEN not configured' }, { status: 503 });
    }

    if (!isR2Configured()) {
      return NextResponse.json({ message: 'R2 storage not configured' }, { status: 503 });
    }

    const { groupIds } = await req.json();
    if (!Array.isArray(groupIds) || groupIds.length === 0) {
      return NextResponse.json({ results: [] });
    }

    const idsToProcess = groupIds.slice(0, 5);
    const results: { id: string; status: 'success' | 'failed' | 'skipped'; url?: string; error?: string }[] = [];

    for (const id of idsToProcess) {
      try {
        const group = await Group.findById(id);
        if (!group) { results.push({ id, status: 'skipped', error: 'Not found' }); continue; }

        if (group.image && group.image !== '/assets/image.jpg') {
          results.push({ id, status: 'skipped', error: 'Already has image' });
          continue;
        }

        const username = extractUsername(group.telegramLink || '');
        if (!username) { results.push({ id, status: 'skipped', error: 'No valid username in link' }); continue; }

        const photoBuffer = await fetchTelegramPhoto(username);
        if (!photoBuffer) { results.push({ id, status: 'failed', error: 'No photo on Telegram' }); continue; }

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
        console.log(`[Fetch Photo] Got Telegram photo for "${group.name}" (@${username})`);
      } catch (err: any) {
        console.error(`[Fetch Photo] Failed for ${id}:`, err.message);
        results.push({ id, status: 'failed', error: err.message });
      }
    }

    return NextResponse.json({ results });
  } catch (error: any) {
    console.error('[Fetch Photo] Error:', error);
    return NextResponse.json({ message: error.message || 'Failed' }, { status: 500 });
  }
}
