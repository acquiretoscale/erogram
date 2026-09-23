import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { TgGroup, TgStat, TgPostLog } from '@/lib/models';
import { getChatMemberCount, checkBotIsAdmin } from '@/lib/telegram';

export async function GET(req: NextRequest) {
  await connectDB();
  const live = new URL(req.url).searchParams.get('live') === '1';

  const groups: any[] = await TgGroup.find({ enabled: true }).lean();
  const groupIds = groups.map(g => g._id);

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Batch: snapshots in last 30 days (for charts + deltas)
  const allSnapshots = await TgStat.find({
    groupId: { $in: groupIds },
    snapshotDate: { $gte: thirtyDaysAgo },
  }).sort({ snapshotDate: 1 }).lean();

  const snapsByGroup = new Map<string, any[]>();
  for (const s of allSnapshots) {
    const gid = s.groupId.toString();
    if (!snapsByGroup.has(gid)) snapsByGroup.set(gid, []);
    snapsByGroup.get(gid)!.push(s);
  }

  // Fallback: latest snapshot ever (so stale groups still show a sub count)
  const latestEver = await TgStat.aggregate([
    { $match: { groupId: { $in: groupIds } } },
    { $sort: { snapshotDate: -1 } },
    { $group: {
      _id: '$groupId',
      memberCount: { $first: '$memberCount' },
      isAdminOk: { $first: '$isAdminOk' },
      snapshotDate: { $first: '$snapshotDate' },
    }},
  ]);
  const latestEverMap = new Map<string, any>();
  for (const s of latestEver) latestEverMap.set(s._id.toString(), s);

  // Batch: post counts per group in last 7 days
  const postCountsPipeline = await TgPostLog.aggregate([
    { $match: { groupId: { $in: groupIds }, postedAt: { $gte: sevenDaysAgo } } },
    { $group: {
      _id: { groupId: '$groupId', status: '$status' },
      count: { $sum: 1 },
      lastSuccessAt: { $max: { $cond: [{ $eq: ['$status', 'success'] }, '$postedAt', null] } },
    }},
  ]);

  const postStats = new Map<string, { posts: number; errors: number; lastPostAt: Date | null }>();
  for (const p of postCountsPipeline) {
    const gid = p._id.groupId.toString();
    if (!postStats.has(gid)) postStats.set(gid, { posts: 0, errors: 0, lastPostAt: null });
    const entry = postStats.get(gid)!;
    if (p._id.status === 'success') {
      entry.posts += p.count;
      if (p.lastSuccessAt && (!entry.lastPostAt || p.lastSuccessAt > entry.lastPostAt)) {
        entry.lastPostAt = p.lastSuccessAt;
      }
    } else if (p._id.status === 'error') {
      entry.errors += p.count;
    }
  }

  // Batch: last successful post per group (for groups with no posts in last 7 days)
  const lastPostPipeline = await TgPostLog.aggregate([
    { $match: { groupId: { $in: groupIds }, status: 'success' } },
    { $sort: { postedAt: -1 } },
    { $group: { _id: '$groupId', lastPostAt: { $first: '$postedAt' } } },
  ]);
  const lastPostMap = new Map<string, Date>();
  for (const p of lastPostPipeline) lastPostMap.set(p._id.toString(), p.lastPostAt);

  const oneDayAgo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

  const results = await Promise.all(groups.map(async (group: any) => {
    const gid = group._id.toString();
    const snaps = snapsByGroup.get(gid) || [];
    const fallback = latestEverMap.get(gid);

    const latest = snaps.length > 0 ? snaps[snaps.length - 1] : null;
    const currentCount = latest?.memberCount ?? fallback?.memberCount ?? null;

    function findSnapBefore(cutoff: Date) {
      for (let i = snaps.length - 1; i >= 0; i--) {
        if (new Date(snaps[i].snapshotDate) <= cutoff) return snaps[i].memberCount;
      }
      return null;
    }

    const dayAgoCount = findSnapBefore(oneDayAgo);
    const twoDayCount = findSnapBefore(twoDaysAgo);
    const weekAgoCount = findSnapBefore(sevenDaysAgo);

    const ps = postStats.get(gid) || { posts: 0, errors: 0, lastPostAt: null };
    const lastPostAt = ps.lastPostAt || lastPostMap.get(gid) || null;

    let liveMemberCount: number | null = null;
    let isAdminOk: boolean | null = latest?.isAdminOk ?? fallback?.isAdminOk ?? null;

    const groupToken = group.botToken?.trim() || undefined;
    if (live) {
      try { liveMemberCount = await getChatMemberCount(group.channelId, groupToken); } catch { liveMemberCount = null; }
      try { isAdminOk = await checkBotIsAdmin(group.channelId, groupToken); } catch { isAdminOk = false; }

      // Persist today's snapshot when live fetch works
      if (liveMemberCount !== null) {
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        await TgStat.findOneAndUpdate(
          { groupId: group._id, snapshotDate: today },
          {
            $set: {
              groupId: group._id,
              groupName: group.name,
              channelId: group.channelId,
              memberCount: liveMemberCount,
              isAdminOk,
              snapshotDate: today,
            },
          },
          { upsert: true }
        );
      }
    }

    return {
      _id: gid,
      name: group.name,
      channelId: group.channelId,
      mediaFolder: group.mediaFolder,
      memberCount: liveMemberCount ?? currentCount,
      isAdminOk,
      delta24h: (liveMemberCount ?? currentCount) !== null && dayAgoCount !== null
        ? (liveMemberCount ?? currentCount)! - dayAgoCount : null,
      delta48h: (liveMemberCount ?? currentCount) !== null && twoDayCount !== null
        ? (liveMemberCount ?? currentCount)! - twoDayCount : null,
      weekDelta: (liveMemberCount ?? currentCount) !== null && weekAgoCount !== null
        ? (liveMemberCount ?? currentCount)! - weekAgoCount : null,
      snapshots: snaps.map((s: any) => ({ date: s.snapshotDate, count: s.memberCount })),
      postsLast7: ps.posts,
      errorsLast7: ps.errors,
      lastPostAt,
    };
  }));

  const totalMembers = results.reduce((s, g) => s + (g.memberCount || 0), 0);
  const total24hDelta = results.some(g => g.delta24h !== null)
    ? results.reduce((s, g) => s + (g.delta24h ?? 0), 0) : null;
  const total48hDelta = results.some(g => g.delta48h !== null)
    ? results.reduce((s, g) => s + (g.delta48h ?? 0), 0) : null;
  const totalWeekDelta = results.reduce((s, g) => s + (g.weekDelta || 0), 0);
  const totalPostsLast7 = results.reduce((s, g) => s + g.postsLast7, 0);
  const totalErrorsLast7 = results.reduce((s, g) => s + g.errorsLast7, 0);
  const healthyGroups = results.filter(g => g.isAdminOk === true).length;
  const unhealthyGroups = results.filter(g => g.isAdminOk === false).length;

  return NextResponse.json({
    groups: results,
    ecosystem: {
      totalMembers,
      total24hDelta,
      total48hDelta,
      totalWeekDelta,
      totalPostsLast7,
      totalErrorsLast7,
      healthyGroups,
      unhealthyGroups,
      groupCount: groups.length,
    },
  });
}
