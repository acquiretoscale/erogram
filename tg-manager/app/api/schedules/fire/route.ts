import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { TgSchedule, TgGroup, TgTemplate, TgPostLog } from '@/lib/models';
import { postToGroup } from '@/lib/post-helper';

// POST /api/schedules/fire  { scheduleId, markAsFired?: boolean }
// Immediately executes a schedule for all its groups.
// If markAsFired=true, updates lastFiredAt so the cron skips it today.
export async function POST(req: NextRequest) {
  await connectDB();
  const { scheduleId, markAsFired = false } = await req.json();

  if (!scheduleId) {
    return NextResponse.json({ error: 'scheduleId required' }, { status: 400 });
  }

  const schedule = await TgSchedule.findById(scheduleId).lean() as any;
  if (!schedule) {
    return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
  }

  const groups: any[] = await TgGroup.find({ _id: { $in: schedule.groupIds }, enabled: true }).lean();
  const template = schedule.templateId
    ? await TgTemplate.findById(schedule.templateId).lean()
    : null;

  const results: any[] = [];
  for (const group of groups) {
    try {
      const r = await postToGroup({ group, template, postType: schedule.postType });
      results.push(r);
    } catch (err: any) {
      await TgPostLog.create({
        groupId: group._id,
        groupName: (group as any).name,
        status: 'error',
        error: err.message || 'Unknown error',
      });
      results.push({ group: (group as any).name, status: 'error', error: err.message });
    }
  }

  if (markAsFired) {
    await TgSchedule.findByIdAndUpdate(scheduleId, { lastFiredAt: new Date() });
  }

  const success = results.filter(r => r.status === 'success').length;
  const skipped = results.filter(r => r.status === 'skipped').length;
  const errors  = results.filter(r => r.status === 'error').length;

  return NextResponse.json({ success, skipped, errors, results, markedAsFired: markAsFired });
}
