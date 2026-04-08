import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { writeFile, readFile, unlink } from 'fs/promises';
import path from 'path';
import { uploadToR2, isR2Configured } from '@/lib/r2';

/* eslint-disable @typescript-eslint/no-require-imports */
const ffmpeg = require('fluent-ffmpeg');
const { path: ffmpegPath } = require('@ffmpeg-installer/ffmpeg');
ffmpeg.setFfmpegPath(ffmpegPath);

const ALLOWED_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const TARGET_SIZE = 10 * 1024 * 1024; // 10 MB

function compressVideo(inputPath: string, outputPath: string): Promise<void> {
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

export async function POST(req: NextRequest) {
  const id = randomUUID();
  const tmpDir = '/tmp';
  const inputPath = path.join(tmpDir, `${id}-input`);
  const outputPath = path.join(tmpDir, `${id}-output.mp4`);

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ message: 'No file uploaded' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { message: 'Invalid file type. Use MP4, WebM, or MOV.' },
        { status: 400 }
      );
    }

    if (!isR2Configured()) {
      return NextResponse.json({ message: 'R2 not configured.' }, { status: 503 });
    }

    const bytes = await file.arrayBuffer();
    const rawBuffer = Buffer.from(bytes);

    let finalBuffer: Buffer;
    let key: string;

    if (rawBuffer.length <= TARGET_SIZE) {
      // Already under 10 MB — upload as-is
      const ext = file.type === 'video/quicktime' ? 'mov' : file.type.split('/')[1];
      key = `onlygram/videos/${id}.${ext}`;
      finalBuffer = rawBuffer;
    } else {
      // Compress with ffmpeg
      await writeFile(inputPath, rawBuffer);
      await compressVideo(inputPath, outputPath);
      finalBuffer = await readFile(outputPath);
      key = `onlygram/videos/${id}.mp4`;
    }

    const url = await uploadToR2(finalBuffer, key, 'video/mp4');

    return NextResponse.json({ url });
  } catch (error: any) {
    console.error('Video upload error:', error);
    return NextResponse.json(
      { message: error.message || 'Upload failed' },
      { status: 500 }
    );
  } finally {
    // Clean up temp files
    unlink(inputPath).catch(() => {});
    unlink(outputPath).catch(() => {});
  }
}
