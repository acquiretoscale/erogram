import { NextRequest, NextResponse } from 'next/server';
import { isR2Configured } from '@/lib/r2';
import {
  assertValidAdVideoUrl,
  optimizeAndUploadAdVideo,
  resolveAdVideoNiche,
} from '@/lib/adVideoR2';

const ALLOWED_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const advertiserName = String(formData.get('advertiserName') || 'advertiser').trim();
    const nicheRaw = String(formData.get('niche') || '').trim();
    const campaignName = String(formData.get('campaignName') || '').trim();
    const disambiguator = String(formData.get('disambiguator') || '').trim() || undefined;

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
