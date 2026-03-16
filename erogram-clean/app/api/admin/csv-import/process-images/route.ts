import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import sharp from 'sharp';
import connectDB from '@/lib/db/mongodb';
import { User, Group } from '@/lib/models';
import { uploadToR2, isR2Configured } from '@/lib/r2';
import { slugify } from '@/lib/utils/slugify';

export const maxDuration = 60; // Vercel Pro plan max

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

/**
 * POST /api/admin/csv-import/process-images
 *
 * Process images for imported groups in batches.
 * Fetches profile picture from sourceImageUrl, compresses with sharp,
 * renames to "GroupName-NSFW-Telegram-{number}.webp", uploads to R2.
 *
 * Body: { groupIds: string[] }  (max 5 per call)
 */
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const admin = await authenticate(req);
    if (!admin) {
      return NextResponse.json(
        { message: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    if (!isR2Configured()) {
      return NextResponse.json(
        { message: 'R2 storage is not configured' },
        { status: 503 }
      );
    }

    const { groupIds } = await req.json();

    if (!Array.isArray(groupIds) || groupIds.length === 0) {
      return NextResponse.json({ results: [] });
    }

    // Process max 5 at a time
    const idsToProcess = groupIds.slice(0, 5);
    const results: {
      id: string;
      status: 'success' | 'failed' | 'skipped';
      url?: string;
      error?: string;
    }[] = [];

    for (const id of idsToProcess) {
      try {
        const group = await Group.findById(id);
        if (!group) {
          results.push({ id, status: 'skipped', error: 'Group not found' });
          continue;
        }

        if (!group.sourceImageUrl) {
          results.push({ id, status: 'skipped', error: 'No source image URL' });
          continue;
        }

        // Fetch the image from the source URL
        const response = await fetch(group.sourceImageUrl, {
          signal: AbortSignal.timeout(10000),
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; ErogramBot/1.0)',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status} fetching image`);
        }

        const contentType = response.headers.get('content-type') || '';
        if (!contentType.startsWith('image/')) {
          throw new Error(`Not an image: ${contentType}`);
        }

        const buffer = Buffer.from(await response.arrayBuffer());

        // Compress with sharp (same pattern as /api/upload)
        let compressed: Buffer;
        const isGif = contentType.includes('gif');

        if (isGif) {
          // GIFs are kept as-is (animated)
          compressed = buffer;
        } else {
          compressed = await sharp(buffer)
            .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 80 })
            .toBuffer();

          // If still too large, reduce quality
          if (compressed.length > 200 * 1024) {
            compressed = await sharp(buffer)
              .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
              .webp({ quality: 55 })
              .toBuffer();
          }
          if (compressed.length > 200 * 1024) {
            compressed = await sharp(buffer)
              .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
              .webp({ quality: 45 })
              .toBuffer();
          }
        }

        // Generate filename: "group-name-NSFW-Telegram-{unique}.webp"
        const safeName = slugify(group.name);
        const uniqueSuffix = group._id.toString().slice(-6);
        const ext = isGif ? 'gif' : 'webp';
        const key = `uploads/${safeName}-NSFW-Telegram-${uniqueSuffix}.${ext}`;

        const url = await uploadToR2(
          compressed,
          key,
          isGif ? 'image/gif' : 'image/webp'
        );

        // Update group with R2 URL and clear source
        await Group.findByIdAndUpdate(id, {
          image: url,
          sourceImageUrl: null,
        });

        results.push({ id, status: 'success', url });
        console.log(`[Image Process] Uploaded ${key} for group "${group.name}"`);
      } catch (err: any) {
        console.error(`[Image Process] Failed for group ${id}:`, err.message);
        results.push({ id, status: 'failed', error: err.message });
      }
    }

    return NextResponse.json({ results });
  } catch (error: any) {
    console.error('[Image Process] Error:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to process images' },
      { status: 500 }
    );
  }
}
