import sharp from 'sharp';
import { writeFile, readFile, unlink } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import {
  MAX_CREATOR_PHOTO_BYTES,
  MAX_CREATOR_VIDEO_BYTES,
} from '@/lib/creatorMediaLimits';

/** Target after optimization — fast profile loads, well under the 1 MB photo cap. */
const TARGET_PHOTO_BYTES = 450 * 1024;
const MAX_PHOTO_DIM = 1400;
const PHOTO_QUALITY_STEPS = [85, 80, 75, 70, 65, 60, 55, 50, 45, 40];
const VIDEO_CRF_STEPS = [23, 26, 28, 30, 32];
const TARGET_VIDEO_BYTES = 8 * 1024 * 1024;

const EXIF_COPYRIGHT = '© Erogram.pro';
const EXIF_ARTIST = 'Erogram.pro';

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

function photoSizeError(): string {
  return 'Photo too large (max 1 MB). Compress it before uploading.';
}

function videoSizeError(): string {
  return 'Video too large (max 1 MB). Compress or trim it before uploading.';
}

export function validateCreatorPhotoUpload(sizeBytes: number): string | null {
  if (sizeBytes <= 0) return 'Empty file';
  if (sizeBytes > MAX_CREATOR_PHOTO_BYTES) return photoSizeError();
  return null;
}

export function validateCreatorVideoUpload(sizeBytes: number): string | null {
  if (sizeBytes <= 0) return 'Empty file';
  if (sizeBytes > MAX_CREATOR_VIDEO_BYTES) return videoSizeError();
  return null;
}

async function encodePhoto(buf: Buffer, quality: number): Promise<Buffer> {
  return sharp(buf)
    .rotate()
    .resize(MAX_PHOTO_DIM, MAX_PHOTO_DIM, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality, mozjpeg: true })
    .withMetadata({
      exif: {
        IFD0: {
          Copyright: EXIF_COPYRIGHT,
          Artist: EXIF_ARTIST,
          ImageDescription: 'Erogram.pro - OnlyFans Creator Directory',
        },
      },
    })
    .toBuffer();
}

/** Resize + compress for fast profile loads. */
export async function optimizeCreatorPhoto(buf: Buffer): Promise<Buffer> {
  let firstUnderTarget: Buffer | null = null;
  let smallest: Buffer | null = null;

  for (const q of PHOTO_QUALITY_STEPS) {
    const out = await encodePhoto(buf, q);
    if (!smallest || out.length < smallest.length) smallest = out;
    if (out.length <= TARGET_PHOTO_BYTES) {
      firstUnderTarget = out;
      break;
    }
  }

  const chosen = firstUnderTarget || smallest;
  if (!chosen) throw new Error('Photo optimization failed');
  return chosen;
}

function compressVideoFile(inputPath: string, outputPath: string, crf: number): Promise<void> {
  loadFfmpeg();
  if (!ffmpeg) throw new Error('Video optimizer unavailable');
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .videoCodec('libx264')
      .audioCodec('aac')
      .audioBitrate('96k')
      .outputOptions([
        '-crf', String(crf),
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

/** 720p H.264 MP4, faststart, stepped CRF until under target size. */
export async function optimizeCreatorVideo(buf: Buffer): Promise<Buffer> {
  if (buf.length > MAX_CREATOR_VIDEO_BYTES) {
    throw new Error(videoSizeError());
  }

  loadFfmpeg();
  if (!ffmpeg) {
    // Dev / no ffmpeg: keep original if already within cap.
    return buf;
  }

  const tmpDir = '/tmp';
  const id = randomUUID();
  const inputPath = path.join(tmpDir, `${id}-in`);
  const outputPath = path.join(tmpDir, `${id}-out.mp4`);

  try {
    await writeFile(inputPath, buf);

    let best: Buffer | null = null;
    for (const crf of VIDEO_CRF_STEPS) {
      await compressVideoFile(inputPath, outputPath, crf);
      const out = await readFile(outputPath);
      if (!best || out.length < best.length) best = out;
      if (out.length <= TARGET_VIDEO_BYTES) return out;
    }

    if (!best) throw new Error('Video optimization failed');
    if (best.length > MAX_CREATOR_VIDEO_BYTES) {
      throw new Error('Video still too large after optimization. Upload a shorter clip.');
    }
    return best;
  } finally {
    unlink(inputPath).catch(() => {});
    unlink(outputPath).catch(() => {});
  }
}

export function creatorAlbumPhotoKey(slug: string, index: number): string {
  const cacheBust = Date.now().toString(36);
  return `onlyfanssearch/${slug}-onlyfans-${index + 1}-${cacheBust}.jpg`;
}

export function creatorAlbumVideoKey(slug: string, index: number): string {
  const cacheBust = Date.now().toString(36);
  return `onlyfanssearch/${slug}-onlyfans-video-${index + 1}-${cacheBust}.mp4`;
}
