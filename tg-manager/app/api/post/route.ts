import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { TgGroup, TgTemplate, TgPostLog } from '@/lib/models';
import { postToGroup } from '@/lib/post-helper';

export async function POST(req: NextRequest) {
  await connectDB();

  const body = await req.json().catch(() => ({}));
  const targetGroupId = body.groupId;
  const overrideTemplateId = body.templateId;
  const postType: 'promo' | 'media' | 'creator' = body.postType || 'promo';

  const query: any = { enabled: true };
  if (targetGroupId) query._id = targetGroupId;

  const groups: any[] = await TgGroup.find(query).populate('defaultTemplate').lean();
  if (groups.length === 0) {
    return NextResponse.json({ error: 'No enabled groups found' }, { status: 404 });
  }

  const results: any[] = [];

  for (const group of groups) {
    try {
      let template = group.defaultTemplate as any;
      if (overrideTemplateId) {
        template = await TgTemplate.findById(overrideTemplateId).lean();
      }

      const result = await postToGroup({ group, template, postType });
      results.push(result);
    } catch (err: any) {
      await TgPostLog.create({
        groupId: group._id,
        groupName: group.name,
        status: 'error',
        error: err.message,
      });
      results.push({ group: group.name, status: 'error', error: err.message });
    }
  }

  return NextResponse.json({
    results,
    posted: results.filter(r => r.status === 'success').length,
    errors: results.filter(r => r.status === 'error').length,
  });
}
