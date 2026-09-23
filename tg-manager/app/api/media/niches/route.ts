import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { TgNicheLink } from '@/lib/models';

export async function GET(req: NextRequest) {
  const folder = new URL(req.url).searchParams.get('folder');
  if (!folder) return NextResponse.json({ links: [] });

  await connectDB();
  const links = await TgNicheLink.find({ folder }).sort({ createdAt: -1 }).lean();
  return NextResponse.json({ links });
}

export async function POST(req: NextRequest) {
  const { folder, url } = await req.json() as { folder: string; url: string };
  if (!folder || !url) {
    return NextResponse.json({ error: 'folder and url required' }, { status: 400 });
  }

  const slug = url
    .replace(/^https?:\/\/(www\.)?redgifs\.com\/niches\//i, '')
    .replace(/[?#].*$/, '')
    .trim();
  const label = slug.replace(/-/g, ' ');

  await connectDB();

  const exists = await TgNicheLink.findOne({ folder, url: { $regex: new RegExp(slug, 'i') } });
  if (exists) {
    return NextResponse.json({ link: exists, duplicate: true });
  }

  const link = await TgNicheLink.create({ folder, url: url.trim(), label });
  return NextResponse.json({ link });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json() as { id: string };
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  await connectDB();
  await TgNicheLink.findByIdAndDelete(id);
  return NextResponse.json({ ok: true });
}
