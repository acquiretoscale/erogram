import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { TgGroup } from '@/lib/models';
import { slugifyGroupName, ensureFolder } from '@/lib/r2';

export async function GET() {
  await connectDB();
  const groups = await TgGroup.find().sort({ createdAt: -1 }).populate('defaultTemplate').lean();
  return NextResponse.json(groups);
}

export async function POST(req: NextRequest) {
  await connectDB();
  const body = await req.json();
  const { name, channelId, mediaFolder, defaultTemplate, enabled, botToken, creatorNiche } = body;
  if (!name || !channelId) {
    return NextResponse.json({ error: 'Name and Channel ID are required' }, { status: 400 });
  }

  // Auto-generate folder from group name if none provided
  let folder = mediaFolder?.trim() || slugifyGroupName(name);

  // Deduplicate: if folder already used by another group, append a suffix
  const existing = await TgGroup.findOne({ mediaFolder: folder });
  if (existing) {
    folder = `${folder}-${Date.now().toString(36).slice(-4)}`;
  }

  await ensureFolder(folder);

  const group = await TgGroup.create({
    name,
    channelId,
    mediaFolder: folder,
    defaultTemplate: defaultTemplate || null,
    enabled: enabled !== false,
    botToken: botToken || '',
    creatorNiche: String(creatorNiche || '').trim().toLowerCase(),
  });
  return NextResponse.json(group, { status: 201 });
}

export async function PUT(req: NextRequest) {
  await connectDB();
  const body = await req.json();
  const { _id, ...update } = body;
  if (!_id) return NextResponse.json({ error: 'Missing _id' }, { status: 400 });
  if (typeof update.creatorNiche === 'string') {
    update.creatorNiche = update.creatorNiche.trim().toLowerCase();
  }
  const group = await TgGroup.findByIdAndUpdate(_id, update, { new: true });
  if (!group) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(group);
}

export async function DELETE(req: NextRequest) {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  await TgGroup.findByIdAndDelete(id);
  return NextResponse.json({ ok: true });
}
