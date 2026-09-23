import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { TgPostLog, TgSettings, TgSchedule } from '@/lib/models';
import { postToGroup } from '@/lib/post-helper';
import { notifyPostErrors } from '@/lib/notify';

function getCurrentTimeInTZ(tz: string): string {
  try {
    const d = new Date();
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(d);
    const h = parts.find(p => p.type === 'hour')?.value || '00';
    const m = parts.find(p => p.type === 'minute')?.value || '00';
    return `${h}:${m}`;
  } catch {
    const d = new Date();
    return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
  }
}

function getDayOfWeekInTZ(tz: string): number {
  try {
    const d = new Date();
    const dayStr = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' }).format(d);
    const map: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
    return map[dayStr] ?? 0;
  } catch {
    return (new Date().getUTCDay() + 6) % 7;
  }
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function isTimeMatch(currentTime: string, scheduleTimes: string[]): boolean {
  const now = timeToMinutes(currentTime);
  for (const t of scheduleTimes) {
    const target = timeToMinutes(t);
    if (Math.abs(now - target) <= 15) return true;
  }
  return false;
}

function getScheduleTimes(schedule: any): string[] {
  if (Array.isArray(schedule.times) && schedule.times.length > 0) {
    return schedule.times;
  }
  return [schedule.time];
}

function shouldFire(schedule: any): boolean {
  const tz = schedule.timezone || 'UTC';
  const currentTime = getCurrentTimeInTZ(tz);
  const freq = schedule.frequency || 'daily';

  if (freq === 'every_n_hours') {
    if (!schedule.lastFiredAt) return true;
    const hoursSince = (Date.now() - new Date(schedule.lastFiredAt).getTime()) / (1000 * 60 * 60);
    return hoursSince >= ((schedule.intervalHours || 4) - 0.25);
  }

  const times = getScheduleTimes(schedule);
  if (!isTimeMatch(currentTime, times)) return false;

  if (schedule.lastFiredAt) {
    const msSinceLast = Date.now() - new Date(schedule.lastFiredAt).getTime();
    if (msSinceLast < 25 * 60 * 1000) return false;
  }

  if (freq === 'daily') return true;

  if (freq === 'weekly') {
    const currentDay = getDayOfWeekInTZ(tz);
    return currentDay === (schedule.weekDay ?? 0);
  }

  if (freq === 'every_48h') {
    if (!schedule.lastFiredAt) return true;
    const hoursSince = (Date.now() - new Date(schedule.lastFiredAt).getTime()) / (1000 * 60 * 60);
    return hoursSince >= 44;
  }

  if (freq === 'every_72h') {
    if (!schedule.lastFiredAt) return true;
    const hoursSince = (Date.now() - new Date(schedule.lastFiredAt).getTime()) / (1000 * 60 * 60);
    return hoursSince >= 68;
  }

  return false;
}

export async function GET(req: NextRequest) {
  await connectDB();

  const settings = await TgSettings.findOne({ key: 'posting' }).lean();
  if (settings && !(settings as any).enabled) {
    return NextResponse.json({ skipped: true, reason: 'Posting is globally disabled' });
  }

  const schedules = await TgSchedule.find({ enabled: true })
    .populate('templateId')
    .populate('groupIds')
    .lean();

  if (schedules.length === 0) {
    return NextResponse.json({ skipped: true, reason: 'No enabled schedules' });
  }

  const allResults: any[] = [];

  for (const schedule of schedules) {
    if (!shouldFire(schedule)) continue;

    const template = (schedule as any).templateId as any;
    const groups = ((schedule as any).groupIds || []) as any[];
    const postType: 'promo' | 'media' | 'creator' = (schedule as any).postType || 'promo';

    for (const group of groups) {
      if (!group || !group.channelId) continue;
      if (group.enabled === false) continue;

      try {
        const result = await postToGroup({ group, template, postType });
        if (result.status === 'skipped') {
          allResults.push({ schedule: (schedule as any).name, ...result });
          continue;
        }
        allResults.push({ schedule: (schedule as any).name, ...result });
      } catch (err: any) {
        await TgPostLog.create({
          groupId: group._id,
          groupName: group.name,
          status: 'error',
          error: err.message,
          mediaKey: '',
          mediaUrl: '',
        });
        allResults.push({ schedule: (schedule as any).name, group: group.name, status: 'error', error: err.message });
      }
    }

    await TgSchedule.findByIdAndUpdate(schedule._id, { lastFiredAt: new Date() });
  }

  const errorResults = allResults
    .filter(r => r.status === 'error')
    .map(r => ({ schedule: r.schedule || '', group: r.group || '', error: r.error || 'Unknown' }));

  if (errorResults.length > 0) {
    await notifyPostErrors(errorResults);
  }

  return NextResponse.json({
    checked: schedules.length,
    fired: allResults.length,
    posted: allResults.filter(r => r.status === 'success').length,
    skipped: allResults.filter(r => r.status === 'skipped').length,
    errors: errorResults.length,
    results: allResults,
  });
}
