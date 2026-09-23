import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { TgGroup, TgStat } from '@/lib/models';
import { getChatMemberCount, checkBotIsAdmin } from '@/lib/telegram';

export async function GET() {
  await connectDB();

  const groups: any[] = await TgGroup.find({ enabled: true }).lean();
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const results: any[] = [];

  for (const group of groups) {
    try {
      const groupToken = (group as any).botToken?.trim() || undefined;
      const existing = await TgStat.findOne({ groupId: group._id, snapshotDate: today });

      const memberCount = await getChatMemberCount(group.channelId, groupToken);
      const isAdminOk = await checkBotIsAdmin(group.channelId, groupToken);

      if (existing) {
        await TgStat.findByIdAndUpdate(existing._id, { memberCount, isAdminOk });
        results.push({ group: group.name, status: 'updated', memberCount, isAdminOk });
        continue;
      }

      await TgStat.create({
        groupId: group._id,
        groupName: group.name,
        channelId: group.channelId,
        memberCount,
        isAdminOk,
        snapshotDate: today,
      });

      results.push({ group: group.name, status: 'ok', memberCount, isAdminOk });
    } catch (err: any) {
      results.push({ group: group.name, status: 'error', error: err.message });
    }
  }

  return NextResponse.json({ snapshotted: results.filter(r => r.status === 'ok' || r.status === 'updated').length, results });
}
