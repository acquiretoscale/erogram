import { NextRequest, NextResponse } from 'next/server';
import { uploadFile } from '@/lib/r2';

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

interface GifToImport {
  id: string;
  importUrl: string;
}

export async function POST(req: NextRequest) {
  const { folder, gifs }: { folder: string; gifs: GifToImport[] } = await req.json();

  if (!folder || !Array.isArray(gifs) || gifs.length === 0) {
    return NextResponse.json({ error: 'folder and gifs[] required' }, { status: 400 });
  }
  if (gifs.length > 80) {
    return NextResponse.json({ error: 'Max 80 GIFs per import' }, { status: 400 });
  }

  const results: { id: string; url?: string; error?: string; skippedSize?: string }[] = [];

  for (const gif of gifs) {
    try {
      // Pre-flight size check via HEAD to avoid downloading huge files
      try {
        const head = await fetch(gif.importUrl, { method: 'HEAD', headers: { Referer: 'https://www.redgifs.com/' } });
        const cl = parseInt(head.headers.get('content-length') || '0', 10);
        if (cl > MAX_FILE_BYTES) {
          results.push({ id: gif.id, error: `Skipped: ${(cl / 1024 / 1024).toFixed(1)}MB exceeds 10MB limit`, skippedSize: `${(cl / 1024 / 1024).toFixed(1)}MB` });
          continue;
        }
      } catch { /* HEAD not supported — download and check */ }

      const gifRes = await fetch(gif.importUrl, { headers: { Referer: 'https://www.redgifs.com/' } });
      if (!gifRes.ok) throw new Error(`HTTP ${gifRes.status}`);

      const contentType = gifRes.headers.get('content-type') || 'image/jpeg';
      const urlExt = gif.importUrl.split('?')[0].split('.').pop()?.toLowerCase();
      const ext = ['mp4', 'webm', 'gif', 'jpg', 'jpeg', 'png', 'webp'].includes(urlExt || '')
        ? (urlExt === 'jpeg' ? 'jpg' : urlExt!)
        : contentType.includes('mp4') ? 'mp4'
        : contentType.includes('webm') ? 'webm'
        : contentType.includes('gif') ? 'gif'
        : 'jpg';
      const arrayBuffer = await gifRes.arrayBuffer();

      if (arrayBuffer.byteLength > MAX_FILE_BYTES) {
        results.push({ id: gif.id, error: `Skipped: ${(arrayBuffer.byteLength / 1024 / 1024).toFixed(1)}MB exceeds 10MB limit`, skippedSize: `${(arrayBuffer.byteLength / 1024 / 1024).toFixed(1)}MB` });
        continue;
      }

      const buffer = Buffer.from(arrayBuffer);
      const key = `${folder}/${Date.now()}_${gif.id}.${ext}`;
      const url = await uploadFile(key, buffer, contentType);
      results.push({ id: gif.id, url });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'error';
      results.push({ id: gif.id, error: message });
    }
  }

  const succeeded = results.filter(r => r.url).length;
  const skipped = results.filter(r => r.skippedSize).length;
  const failed = results.filter(r => r.error && !r.skippedSize).length;

  return NextResponse.json({ succeeded, failed, skipped, results });
}
