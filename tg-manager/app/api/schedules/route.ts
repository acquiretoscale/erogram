import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { TgSchedule } from '@/lib/models';

export async function GET() {
  await connectDB();
  const schedules = await TgSchedule.find()
    .sort({ createdAt: -1 })
    .populate('templateId')
    .populate('groupIds')
    .lean();
  return NextResponse.json(schedules);
}

export async function POST(req: NextRequest) {
  await connectDB();
  const body = await req.json();
  const {
    name, postType, templateId, groupIds, time, times, timezone,
    frequency, intervalHours, weekDay, enabled,
  } = body;
  if (!name || !groupIds?.length || !(time || times?.length)) {
    return NextResponse.json({ error: 'Name, groups, and time are required' }, { status: 400 });
  }
  if (postType === 'promo' && !templateId) {
    return NextResponse.json({ error: 'Template is required for Promo posts' }, { status: 400 });
  }
  const resolvedTimes = Array.isArray(times) && times.length ? times.filter(Boolean) : [time || '10:00'];
  const schedule = await TgSchedule.create({
    name,
    postType: postType || 'promo',
    templateId: templateId || null,
    groupIds,
    time: resolvedTimes[0],
    times: resolvedTimes,
    timezone: timezone || 'America/Sao_Paulo',
    frequency: frequency || 'daily',
    intervalHours: intervalHours || 4,
    weekDay: weekDay ?? 0,
    enabled: enabled !== false,
  });
  return NextResponse.json(schedule, { status: 201 });
}

export async function PUT(req: NextRequest) {
  await connectDB();
  const body = await req.json();
  const { _id, ...update } = body;
  if (!_id) return NextResponse.json({ error: 'Missing _id' }, { status: 400 });
  if (Array.isArray(update.times) && update.times.length) {
    update.time = update.times[0];
  }
  const schedule = await TgSchedule.findByIdAndUpdate(_id, update, { new: true });
  if (!schedule) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(schedule);
}

export async function DELETE(req: NextRequest) {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  await TgSchedule.findByIdAndDelete(id);
  return NextResponse.json({ ok: true });
}
