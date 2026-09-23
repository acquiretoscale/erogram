import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { TgTemplate } from '@/lib/models';

export async function GET() {
  await connectDB();
  const templates = await TgTemplate.find().sort({ createdAt: -1 }).lean();
  return NextResponse.json(templates);
}

export async function POST(req: NextRequest) {
  await connectDB();
  const body = await req.json();
  const { name, text, buttons, parseMode } = body;
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  const template = await TgTemplate.create({ name, text: text || '', buttons: buttons || [], parseMode: parseMode || 'HTML' });
  return NextResponse.json(template, { status: 201 });
}

export async function PUT(req: NextRequest) {
  await connectDB();
  const body = await req.json();
  const { _id, ...update } = body;
  if (!_id) return NextResponse.json({ error: 'Missing _id' }, { status: 400 });
  const template = await TgTemplate.findByIdAndUpdate(_id, update, { new: true });
  if (!template) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(template);
}

export async function DELETE(req: NextRequest) {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  await TgTemplate.findByIdAndDelete(id);
  return NextResponse.json({ ok: true });
}
