import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { uploadToR2, isR2Configured } from '@/lib/r2';

const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50 MB
const ALLOWED_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];

export async function POST(req: NextRequest) {
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

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    if (buffer.length > MAX_VIDEO_BYTES) {
      return NextResponse.json(
        { message: 'Video too large. Max 50 MB.' },
        { status: 400 }
      );
    }

    if (!isR2Configured()) {
      return NextResponse.json(
        {
          message:
            'Video upload is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_PUBLIC_URL.',
        },
        { status: 503 }
      );
    }

    const ext = file.type === 'video/quicktime' ? 'mov' : file.type.split('/')[1];
    const key = `campaigns/videos/${randomUUID()}.${ext}`;
    const url = await uploadToR2(buffer, key, file.type);

    return NextResponse.json({ url });
  } catch (error: any) {
    console.error('Video upload error:', error);
    return NextResponse.json(
      { message: error.message || 'Upload failed' },
      { status: 500 }
    );
  }
}
