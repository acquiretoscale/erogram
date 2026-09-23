import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { TgSchedule, TgGroup, TgTemplate, TgCreatorQueue } from '@/lib/models';
import { peekNextCreator } from '@/lib/post-helper';

export async function GET() {
  await connectDB();

  const [schedules, groups, templates, queues] = await Promise.all([
    TgSchedule.find().populate('templateId').populate('groupIds').sort({ createdAt: -1 }).lean(),
    TgGroup.find().select('_id name enabled mediaFolder creatorNiche tag').sort({ name: 1 }).lean(),
    TgTemplate.find().select('_id name').sort({ name: 1 }).lean(),
    TgCreatorQueue.find().select('niche items cursor').lean(),
  ]);

  const nicheSet = new Set<string>();
  for (const g of groups as any[]) {
    const n = String(g.creatorNiche || g.tag || '').trim().toLowerCase();
    if (n) nicheSet.add(n);
  }
  for (const q of queues as any[]) {
    if (q.niche) nicheSet.add(String(q.niche).toLowerCase());
  }

  const upcomingByNiche: Record<string, any> = {};
  await Promise.all(
    [...nicheSet].map(async niche => {
      upcomingByNiche[niche] = await peekNextCreator(niche);
    })
  );

  const upcomingByGroup: Record<string, any> = {};
  for (const g of groups as any[]) {
    const niche = String(g.creatorNiche || g.tag || '').trim().toLowerCase();
    if (niche && upcomingByNiche[niche]) {
      upcomingByGroup[String(g._id)] = upcomingByNiche[niche];
    }
  }

  return NextResponse.json({
    schedules,
    groups,
    templates,
    queues,
    upcomingByNiche,
    upcomingByGroup,
  });
}
