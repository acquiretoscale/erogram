import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { isR2Configured, uploadToR2 } from '@/lib/r2';
import {
  assertValidAdVideoUrl,
  optimizeAndUploadAdVideo,
  resolveAdVideoNiche,
} from '@/lib/adVideoR2';

const ALLOWED_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const MAX_BYTES = 50 * 1024 * 1024;
const isVercel = process.env.VERCEL === '1';

function slug(s: string | null) {
  return (s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
}

function videoExt(file: File) {
  if (file.type === 'video/webm') return 'webm';
  if (file.type === 'video/quicktime') return 'mov';
  const name = file.name.toLowerCase();
  if (name.endsWith('.webm')) return 'webm';
  if (name.endsWith('.mov')) return 'mov';
  return 'mp4';
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const folder = String(formData.get('folder') || '').trim();
    const advertiserName = String(formData.get('advertiserName') || 'advertiser').trim();
    const nicheRaw = String(formData.get('niche') || '').trim();
    const campaignName = String(formData.get('campaignName') || '').trim();
    const disambiguator = String(formData.get('disambiguator') || '').trim() || undefined;

    if (!file) {
      return NextResponse.json({ message: 'No file uploaded' }, { status: 400 });
    }

    const typeOk = ALLOWED_TYPES.includes(file.type) || /\.(mp4|webm|mov)$/i.test(file.name);
    if (!typeOk) {
      return NextResponse.json(
        { message: 'Invalid file type. Use MP4, WebM, or MOV.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ message: 'Video must be under 50 MB.' }, { status: 400 });
    }

    if (folder === 'ainsfw') {
      const nameHint = slug(String(formData.get('name') || 'listing'));
      const categoryHint = slug(String(formData.get('category') || ''));
      const ext = videoExt(file);
      const filename = `${nameHint || 'listing'}${categoryHint ? `-${categoryHint}` : ''}-${Date.now()}.${ext}`;
      const key = `ainsfw/videos/${filename}`;
      const mime = file.type || (ext === 'webm' ? 'video/webm' : ext === 'mov' ? 'video/quicktime' : 'video/mp4');
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      if (isR2Configured()) {
        const url = await uploadToR2(buffer, key, mime);
        return NextResponse.json({ url });
      }
      if (isVercel) {
        return NextResponse.json({ message: 'R2 not configured.' }, { status: 503 });
      }
      const publicDir = path.join(process.cwd(), 'public');
      const uploadsDir = path.join(publicDir, 'uploads');
      await mkdir(uploadsDir, { recursive: true });
      const localName = `${randomUUID().slice(0, 8)}-${filename}`;
      await writeFile(path.join(uploadsDir, localName), buffer);
      return NextResponse.json({ url: `/uploads/${localName}` });
    }

    if (!isR2Configured()) {
      return NextResponse.json({ message: 'R2 not configured.' }, { status: 503 });
    }

    const niche = nicheRaw || resolveAdVideoNiche('All', campaignName || advertiserName);
    const bytes = await file.arrayBuffer();
    const rawBuffer = Buffer.from(bytes);

    const url = await optimizeAndUploadAdVideo(rawBuffer, {
      advertiserName,
      niche,
      campaignName,
      disambiguator,
    });

    assertValidAdVideoUrl(url);
    return NextResponse.json({ url });
  } catch (error: any) {
    console.error('Video upload error:', error);
    return NextResponse.json(
      { message: error.message || 'Upload failed' },
      { status: 500 }
    );
  }
}
