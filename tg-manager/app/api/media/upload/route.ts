import { NextRequest, NextResponse } from 'next/server';
import { uploadFile } from '@/lib/r2';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const folder = formData.get('folder') as string;
  const file = formData.get('file') as File;

  if (!folder || !file) {
    return NextResponse.json({ error: 'Folder and file are required' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.name.split('.').pop() || 'jpg';
  const key = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const url = await uploadFile(key, buffer, file.type || 'image/jpeg');

  return NextResponse.json({ key, url }, { status: 201 });
}
