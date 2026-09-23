import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { TgGroup, TgTemplate, TgSchedule, TgStat, TgPostLog } from '@/lib/models';
import { listFolders, listFiles } from '@/lib/r2';

export async function GET() {
  await connectDB();

  const [groups, templates, schedules, folders] = await Promise.all([
    TgGroup.find().sort({ createdAt: -1 }).populate('defaultTemplate').lean(),
    TgTemplate.find().select('_id name').lean(),
    TgSchedule.find({ enabled: true }).select('postType groupIds time times').lean(),
    listFolders(),
  ]);

  // Count files per folder in parallel
  const folderCounts: Record<string, number> = {};
  await Promise.all(folders.map(async (f) => {
    const files = await listFiles(f);
    folderCounts[f] = files.length;
  }));

  const groupIds = groups.map(g => g._id);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Batch stats: latest snapshot per group + post counts
  const [latestSnaps, postCounts, lastPosts] = await Promise.all([
    TgStat.aggregate([
      { $match: { groupId: { $in: groupIds } } },
      { $sort: { snapshotDate: -1 } },
      { $group: { _id: '$groupId', memberCount: { $first: '$memberCount' }, isAdminOk: { $first: '$isAdminOk' }, weekDelta: { $first: null } } },
    ]),
    TgPostLog.aggregate([
      { $match: { groupId: { $in: groupIds }, status: 'error', postedAt: { $gte: sevenDaysAgo } } },
      { $group: { _id: '$groupId', count: { $sum: 1 } } },
    ]),
    TgPostLog.aggregate([
      { $match: { groupId: { $in: groupIds }, status: 'success' } },
      { $sort: { postedAt: -1 } },
      { $group: { _id: '$groupId', lastPostAt: { $first: '$postedAt' } } },
    ]),
  ]);

  const snapMap = new Map(latestSnaps.map((s: any) => [s._id.toString(), s]));
  const errorMap = new Map(postCounts.map((p: any) => [p._id.toString(), p.count]));
  const lastPostMap = new Map(lastPosts.map((p: any) => [p._id.toString(), p.lastPostAt]));

  const stats: Record<string, any> = {};
  for (const g of groups) {
    const gid = (g as any)._id.toString();
    const snap = snapMap.get(gid);
    stats[gid] = {
      _id: gid,
      memberCount: snap?.memberCount ?? null,
      isAdminOk: snap?.isAdminOk ?? null,
      weekDelta: null,
      lastPostAt: lastPostMap.get(gid) || null,
    };
  }

  return NextResponse.json({ groups, templates, schedules, folders, stats, folderCounts });
}
