import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import { User, Group } from '@/lib/models';

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'sk-6dc28d2672fe4b6ca195f34e5f462a7b';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

async function authenticate(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = await User.findById(decoded.id);
    if (user && user.isAdmin) return user;
  } catch { /* invalid token */ }
  return null;
}

function buildPrompt(groups: Array<{ name: string; category: string; memberCount: number; description: string }>): string {
  const context = `You are writing for Erogram.pro, a directory of Telegram groups and channels focused on adult content, adult entertainment, and NSFW material. The audience is adults looking to discover and join Telegram groups in this niche.`;

  if (groups.length === 1) {
    const g = groups[0];
    return `${context}

Write a unique, SEO-friendly description for this Telegram group.

Group name: ${g.name}
Category: ${g.category || 'Unknown'}
Members: ${g.memberCount > 0 ? g.memberCount.toLocaleString() : 'Unknown'}
Current description: ${g.description || 'None'}

Rules:
- Write 2-3 sentences (150-200 characters total) that are UNIQUE to this group
- Mention the group name naturally
- Reference the niche/category and what members can expect to find
- If the current description is in a non-English language, translate it to English and append the original in parentheses
- If the group name is in a non-Latin script (Russian, Chinese, Arabic, etc.), include an English translation in [brackets] after the name
- Do NOT use generic filler like "Join now" or "Best group ever"
- Do NOT duplicate phrasing from other descriptions
- Keep it factual and descriptive for search engines
- Output ONLY the description text, nothing else`;
  }

  let prompt = `${context}

Write unique, SEO-friendly descriptions for these ${groups.length} Telegram groups. Each must be distinct — no shared phrasing between groups.

For each group, output a line in this exact format:
[NUMBER]. DESCRIPTION_TEXT

Rules for ALL descriptions:
- 2-3 sentences, 150-200 characters each
- Mention the group name naturally
- Reference the niche/category and what members can expect
- If the current description is in a non-English language, translate it and append the original in parentheses
- If a group name is in a non-Latin script, add an English translation in [brackets]
- No generic filler, keep it factual and SEO-friendly
- Each description MUST be unique — no copy-paste between groups

Groups:\n\n`;

  groups.forEach((g, i) => {
    prompt += `${i + 1}. Name: ${g.name}\n   Category: ${g.category || 'Unknown'} | Members: ${g.memberCount > 0 ? g.memberCount.toLocaleString() : 'Unknown'}\n   Current: ${g.description || 'None'}\n\n`;
  });

  return prompt;
}

function parseMultiResponse(text: string, count: number): string[] {
  if (count === 1) return [text.trim()];

  const results: string[] = new Array(count).fill('');
  const lines = text.split('\n').filter(l => l.trim());
  for (const line of lines) {
    const match = line.match(/^(\d+)\.\s*(.+)$/);
    if (match) {
      const idx = parseInt(match[1]) - 1;
      if (idx >= 0 && idx < count) {
        results[idx] = match[2].trim();
      }
    }
  }
  return results;
}

/**
 * POST /api/admin/csv-import/ai-enrich
 *
 * Two modes:
 * 1. Manual save: { enrichments: [{ groupId, description }] }
 * 2. Auto-generate: { groupIds: string[] } — calls Deepseek API and saves results
 */
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const admin = await authenticate(req);
    if (!admin) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    // Mode 1: Manual save (existing flow)
    if (body.enrichments) {
      const { enrichments } = body;
      if (!Array.isArray(enrichments) || enrichments.length === 0) {
        return NextResponse.json({ message: 'No enrichments provided' }, { status: 400 });
      }

      const bulkOps = enrichments
        .filter((e: any) => e.groupId && (e.description || e.name))
        .map((e: any) => {
          const update: Record<string, any> = {};
          if (e.description) update.description = e.description;
          if (e.name) update.name = e.name;
          return { updateOne: { filter: { _id: e.groupId }, update: { $set: update } } };
        });

      if (bulkOps.length === 0) {
        return NextResponse.json({ message: 'No valid enrichments' }, { status: 400 });
      }

      const result = await Group.bulkWrite(bulkOps);
      return NextResponse.json({ modified: result.modifiedCount, total: bulkOps.length });
    }

    // Mode 2: Auto-generate via Deepseek
    if (body.groupIds) {
      const { groupIds } = body;
      if (!Array.isArray(groupIds) || groupIds.length === 0) {
        return NextResponse.json({ message: 'No group IDs provided' }, { status: 400 });
      }

      const groups = await Group.find({ _id: { $in: groupIds } })
        .select('name category memberCount description')
        .lean();

      if (groups.length === 0) {
        return NextResponse.json({ message: 'No groups found' }, { status: 404 });
      }

      const groupData = groups.map((g: any) => ({
        _id: g._id.toString(),
        name: g.name,
        category: g.category,
        memberCount: g.memberCount || 0,
        description: g.description || '',
      }));

      const prompt = buildPrompt(groupData);

      const deepseekRes = await fetch(DEEPSEEK_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: 'You are an SEO expert writing for Erogram.pro, a directory of Telegram groups and channels for adult content, adult entertainment, and NSFW material. You write unique, concise group descriptions optimized for search engines. Follow instructions exactly.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.8,
          max_tokens: groupData.length * 300,
        }),
      });

      if (!deepseekRes.ok) {
        const errText = await deepseekRes.text();
        console.error('[AI Enrich] Deepseek API error:', deepseekRes.status, errText);
        return NextResponse.json({ message: `Deepseek API error: ${deepseekRes.status}` }, { status: 502 });
      }

      const deepseekData = await deepseekRes.json();
      const aiText = deepseekData.choices?.[0]?.message?.content || '';

      if (!aiText) {
        return NextResponse.json({ message: 'Empty response from AI' }, { status: 502 });
      }

      const descriptions = parseMultiResponse(aiText, groupData.length);

      // Build results map: groupId -> description
      const results: Record<string, string> = {};
      groupData.forEach((g, i) => {
        if (descriptions[i]) results[g._id] = descriptions[i];
      });

      // Save to DB
      const bulkOps = Object.entries(results)
        .filter(([, desc]) => desc.trim())
        .map(([id, description]) => ({
          updateOne: { filter: { _id: id }, update: { $set: { description } } },
        }));

      let modified = 0;
      if (bulkOps.length > 0) {
        const result = await Group.bulkWrite(bulkOps);
        modified = result.modifiedCount;
      }

      console.log(`[AI Enrich] Auto-enriched ${modified}/${groupData.length} groups via Deepseek`);

      return NextResponse.json({
        modified,
        total: groupData.length,
        results,
        rawResponse: aiText,
      });
    }

    return NextResponse.json({ message: 'Provide either enrichments or groupIds' }, { status: 400 });
  } catch (error: any) {
    console.error('[AI Enrich] Error:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to enrich groups' },
      { status: 500 }
    );
  }
}
