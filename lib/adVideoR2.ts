import { writeFile, readFile, unlink } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { slugify } from '@/lib/utils/slugify';
import { getR2PublicUrl, uploadToR2 } from '@/lib/r2';

const VIDEO_PREFIX = 'campaigns/videos';

let ffmpegLoaded = false;
let ffmpeg: any = null;

function loadFfmpeg() {
  if (ffmpegLoaded) return;
  try {
    /* eslint-disable @typescript-eslint/no-require-imports */
    ffmpeg = require('fluent-ffmpeg');
    const { path: ffmpegPath } = require('@ffmpeg-installer/ffmpeg');
    ffmpeg.setFfmpegPath(ffmpegPath);
    ffmpegLoaded = true;
  } catch {
    ffmpeg = null;
  }
}

export interface AdVideoMeta {
  advertiserName: string;
  niche: string;
  campaignName?: string;
  disambiguator?: string;
}

export function resolveAdVideoNiche(category: string, campaignName: string): string {
  if (category && category !== 'All') return slugify(category);
  const fromName = slugify(campaignName)
    .split('-')
    .filter((w) => w && !['create', 'build', 'your', 'find', 'never', 'late', 'craving', 'horny', 'lets', 'copy'].includes(w))
    .slice(0, 4)
    .join('-');
  return fromName || 'nsfw-feed';
}

export function buildAdVideoSlug(meta: AdVideoMeta): string {
  const advertiser = slugify(meta.advertiserName) || 'advertiser';
  const niche = slugify(meta.niche) || 'nsfw-feed';
  let slug = `${advertiser}-${niche}-erogram-ad`;
  if (meta.disambiguator) slug += `-${meta.disambiguator}`;
  return slug.slice(0, 120);
}

export function buildAdVideoKey(slug: string): string {
  return `${VIDEO_PREFIX}/${slug}.mp4`;
}

/** R2 object metadata. ASCII only — S3 headers reject non-latin characters. */
export function buildAdVideoMetadata(meta: AdVideoMeta): Record<string, string> {
  return {
    advertiser: slugify(meta.advertiserName).slice(0, 120),
    niche: slugify(meta.niche).slice(0, 120),
    platform: 'erogram',
    site: 'erogram.pro',
    copyright: 'Erogram.pro',
    campaign: slugify(meta.campaignName || '').slice(0, 120),
  };
}

export function isR2AdVideoUrl(url: string): boolean {
  const base = getR2PublicUrl();
  return !!url && !!base && url.startsWith(base) && url.includes(`/${VIDEO_PREFIX}/`);
}

export function isSeoAdVideoUrl(url: string): boolean {
  return /\/campaigns\/videos\/[a-z0-9-]+-erogram-ad(?:-[a-z0-9]+)?\.mp4$/i.test(url);
}

export function assertValidAdVideoUrl(url: string): void {
  const trimmed = String(url || '').trim();
  if (!trimmed) return;
  if (!/^https:\/\//.test(trimmed)) {
    throw new Error('Video URL must use HTTPS');
  }
  if (/go\.cm-trk6\.com|aff_c\?|aff_f\?|click_id=/i.test(trimmed)) {
    throw new Error('Video URL must be a direct video file, not a tracking/affiliate link');
  }
  if (!/\.(mp4|webm|mov)(\?|$)/i.test(trimmed) && !isR2AdVideoUrl(trimmed)) {
    throw new Error('Video URL must be a direct MP4/WebM/MOV file or an R2-hosted video');
  }
}

function compressVideo(inputPath: string, outputPath: string): Promise<void> {
  loadFfmpeg();
  if (!ffmpeg) {
    throw new Error('ffmpeg not available for video optimization');
  }
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .videoCodec('libx264')
      .audioCodec('aac')
      .audioBitrate('128k')
      .outputOptions([
        '-crf', '22',
        '-preset', 'fast',
        '-vf', 'scale=-2:\'min(720,ih)\'',
        '-movflags', '+faststart',
        '-pix_fmt', 'yuv420p',
      ])
      .format('mp4')
      .on('end', () => resolve())
      .on('error', (err: Error) => reject(err))
      .save(outputPath);
  });
}

function transcodeFromUrl(sourceUrl: string, outputPath: string): Promise<void> {
  loadFfmpeg();
  if (!ffmpeg) {
    throw new Error('ffmpeg not available for video optimization');
  }
  return new Promise((resolve, reject) => {
    ffmpeg(sourceUrl)
      .videoCodec('libx264')
      .audioCodec('aac')
      .audioBitrate('128k')
      .outputOptions([
        '-crf', '22',
        '-preset', 'fast',
        '-vf', 'scale=-2:\'min(720,ih)\'',
        '-movflags', '+faststart',
        '-pix_fmt', 'yuv420p',
      ])
      .format('mp4')
      .on('end', () => resolve())
      .on('error', (err: Error) => reject(err))
      .save(outputPath);
  });
}

/** Optimize a raw video buffer and upload to R2 with SEO filename + object metadata. */
export async function optimizeAndUploadAdVideo(
  rawBuffer: Buffer,
  meta: AdVideoMeta,
): Promise<string> {
  const slug = buildAdVideoSlug(meta);
  const key = buildAdVideoKey(slug);
  const tmpDir = '/tmp';
  const id = randomUUID();
  const inputPath = path.join(tmpDir, `${id}-input`);
  const outputPath = path.join(tmpDir, `${id}-output.mp4`);

  try {
    let finalBuffer: Buffer;
    loadFfmpeg();
    if (ffmpeg) {
      try {
        await writeFile(inputPath, rawBuffer);
        await compressVideo(inputPath, outputPath);
        finalBuffer = await readFile(outputPath);
      } catch {
        finalBuffer = rawBuffer;
      }
    } else {
      finalBuffer = rawBuffer;
    }

    const filename = `${slug}.mp4`;
    return uploadToR2(finalBuffer, key, 'video/mp4', {
      contentDisposition: `inline; filename="${filename}"`,
      metadata: buildAdVideoMetadata(meta),
    });
  } finally {
    unlink(inputPath).catch(() => {});
    unlink(outputPath).catch(() => {});
  }
}

/** Download (or transcode HLS) then optimize + upload. */
export async function migrateAdVideoSource(sourceUrl: string, meta: AdVideoMeta): Promise<string> {
  if (isSeoAdVideoUrl(sourceUrl)) return sourceUrl;

  const slug = buildAdVideoSlug(meta);
  const key = buildAdVideoKey(slug);
  const tmpDir = '/tmp';
  const id = randomUUID();
  const inputPath = path.join(tmpDir, `${id}-input`);
  const outputPath = path.join(tmpDir, `${id}-output.mp4`);

  try {
    let finalBuffer: Buffer;
    if (/\.m3u8(\?|$)/i.test(sourceUrl)) {
      await transcodeFromUrl(sourceUrl, outputPath);
      finalBuffer = await readFile(outputPath);
    } else {
      const res = await fetch(sourceUrl, { redirect: 'follow' });
      if (!res.ok) throw new Error(`Download failed (${res.status})`);
      const ct = res.headers.get('content-type') || '';
      if (!/video\/|application\/octet-stream/i.test(ct) && !/\.(mp4|webm|mov)(\?|$)/i.test(sourceUrl)) {
        throw new Error(`Source is not a video (${ct || 'unknown type'})`);
      }
      const buf = Buffer.from(await res.arrayBuffer());
      if (ffmpeg) {
        try {
          await writeFile(inputPath, buf);
          await compressVideo(inputPath, outputPath);
          finalBuffer = await readFile(outputPath);
        } catch {
          finalBuffer = buf;
        }
      } else {
        finalBuffer = buf;
      }
    }
    const filename = `${slug}.mp4`;
    return uploadToR2(finalBuffer, key, 'video/mp4', {
      contentDisposition: `inline; filename="${filename}"`,
      metadata: buildAdVideoMetadata(meta),
    });
  } finally {
    unlink(inputPath).catch(() => {});
    unlink(outputPath).catch(() => {});
  }
}
