import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { TgCreatorQueue, TgGroup } from '@/lib/models';
import { peekNextCreator } from '@/lib/post-helper';
import { getOnlyFansCreatorModel, creatorPhotoUrls } from '@/lib/erogram-db';

export async function GET() {
  await connectDB();
  const [queues, groups] = await Promise.all([
    TgCreatorQueue.find().sort({ niche: 1 }).lean(),
    TgGroup.find().select('_id name creatorNiche enabled').sort({ name: 1 }).lean(),
  ]);

  const upcoming: Record<string, any> = {};
  for (const q of queues as any[]) {
    upcoming[q.niche] = await peekNextCreator(q.niche);
  }

  return NextResponse.json({ queues, groups, upcoming });
}

export async function POST(req: NextRequest) {
  await connectDB();
  const body = await req.json();
  const niche = String(body.niche || '').trim().toLowerCase();
  if (!niche) {
    return NextResponse.json({ error: 'niche required' }, { status: 400 });
  }

  const usernames: string[] = Array.isArray(body.usernames)
    ? body.usernames
    : String(body.usernamesText || '')
        .split(/[\n,]+/)
        .map((s: string) => s.replace(/^@/, '').trim().toLowerCase())
        .filter(Boolean);

  if (usernames.length === 0 && body.mode !== 'replace') {
    return NextResponse.json({ error: 'Add at least one username' }, { status: 400 });
  }

  const Creator = await getOnlyFansCreatorModel();
  const items: { username: string; name: string }[] = [];
  const missing: string[] = [];
  const thinPhotos: string[] = [];

  for (const username of usernames) {
    const safe = username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const creator = await Creator.findOne({
      username: { $regex: `^${safe}$`, $options: 'i' },
      deleted: { $ne: true },
    }).lean() as any;

    if (!creator) {
      missing.push(username);
      continue;
    }
    const photos = creatorPhotoUrls(creator);
    if (photos.length < 2) thinPhotos.push(username);
    items.push({ username: creator.username, name: creator.name || creator.username });
  }

  const mode = body.mode === 'replace' ? 'replace' : 'append';
  let queue = await TgCreatorQueue.findOne({ niche });
  if (!queue) {
    queue = await TgCreatorQueue.create({ niche, items: [], cursor: 0 });
  }

  if (mode === 'replace') {
    queue.items = items as any;
    queue.cursor = 0;
  } else {
    const existing = new Set(queue.items.map((i: any) => String(i.username).toLowerCase()));
    for (const item of items) {
      if (!existing.has(item.username.toLowerCase())) {
        queue.items.push(item as any);
        existing.add(item.username.toLowerCase());
      }
    }
  }
  await queue.save();

  return NextResponse.json({
    queue,
    added: items.length,
    missing,
    thinPhotos,
    upcoming: await peekNextCreator(niche),
  });
}

export async function PUT(req: NextRequest) {
  await connectDB();
  const body = await req.json();
  const niche = String(body.niche || '').trim().toLowerCase();
  if (!niche) return NextResponse.json({ error: 'niche required' }, { status: 400 });

  const queue = await TgCreatorQueue.findOne({ niche });
  if (!queue) return NextResponse.json({ error: 'Queue not found' }, { status: 404 });

  if (typeof body.cursor === 'number') {
    queue.cursor = Math.max(0, body.cursor);
  }
  if (Array.isArray(body.items)) {
    queue.items = body.items.map((i: any) => ({
      username: String(i.username || '').replace(/^@/, '').trim().toLowerCase(),
      name: String(i.name || i.username || ''),
    })) as any;
    if (queue.cursor >= queue.items.length) queue.cursor = 0;
  }
  if (body.resetCursor) queue.cursor = 0;

  await queue.save();
  return NextResponse.json({ queue, upcoming: await peekNextCreator(niche) });
}

export async function DELETE(req: NextRequest) {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const niche = searchParams.get('niche');
  const username = searchParams.get('username');
  if (!niche) return NextResponse.json({ error: 'niche required' }, { status: 400 });

  if (username) {
    const queue = await TgCreatorQueue.findOne({ niche: niche.toLowerCase() });
    if (!queue) return NextResponse.json({ error: 'not found' }, { status: 404 });
    queue.items = queue.items.filter(
      (i: any) => String(i.username).toLowerCase() !== username.toLowerCase()
    ) as any;
    if (queue.cursor >= queue.items.length) queue.cursor = 0;
    await queue.save();
    return NextResponse.json({ queue });
  }

  await TgCreatorQueue.deleteOne({ niche: niche.toLowerCase() });
  return NextResponse.json({ ok: true });
}
