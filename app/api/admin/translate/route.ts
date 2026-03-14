import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import { User, Group, Bot } from '@/lib/models';

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';
const QWEN_API_KEY = process.env.QWEN_API_KEY || '';
const QWEN_API_URL = 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'sk-6dc28d2672fe4b6ca195f34e5f462a7b';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

type AIModel = 'qwen' | 'deepseek';

const ALLOWED_CATEGORIES = [
  'Adult', 'AI NSFW', 'Amateur', 'Anal', 'Anime', 'Argentina',
  'Asian', 'BDSM', 'Big Ass', 'Big Tits', 'Black', 'Blonde', 'Blowjob',
  'Brazil', 'Brunette', 'China', 'Colombia', 'Cosplay', 'Creampie',
  'Cuckold', 'Ebony', 'Fantasy', 'Feet', 'Fetish', 'France', 'Free-use',
  'Germany', 'Hardcore', 'Italy',
  'Japan', 'Latina', 'Lesbian', 'Masturbation', 'Mexico', 'MILF',
  'NSFW-Telegram', 'Onlyfans', 'Onlyfans Leaks', 'Petite', 'Philippines', 'Privacy', 'Public', 'Red Hair', 'Russian',
  'Spain', 'Telegram-Porn', 'Threesome', 'UK', 'Ukraine', 'USA', 'Vietnam',
];
const ALLOWED_CATS_SET = new Set(ALLOWED_CATEGORIES.map(c => c.toLowerCase()));
function validateCat(c: string): string | null {
  return ALLOWED_CATEGORIES.find(k => k.toLowerCase() === c.trim().toLowerCase()) || null;
}

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

function formatGroupLine(g: any, idx: number, mode?: string): string {
  const members = g.memberCount > 0 ? `${g.memberCount.toLocaleString()} members` : 'Unknown members';
  const name = g.name || '';
  const desc = (g.description || '').slice(0, 400);
  const cat = (g.categories?.length ? g.categories.join(', ') : g.category) || '';

  let line = `[${idx}] Name: ${name} | Members: ${members}`;
  if (cat) line += ` | Category: ${cat}`;
  if (g.country && g.country !== 'All') {
    line += ` | Country: ${g.country}`;
  }
  line += ` | Description: ${desc || 'None'}`;
  if (mode === 'categorize') {
    const existing = (g.categories?.length ? g.categories : [g.category]).filter((c: string) => c && c !== 'All' && c !== 'Unknown');
    if (existing.length > 0) line += ` | Current categories: ${existing.join(', ')}`;
  }
  return line;
}

async function callQwen(sysPrompt: string, userContent: string, mode: string): Promise<{ ok: boolean; content: string; error?: string }> {
  const MAX_RETRIES = 2;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) await new Promise(r => setTimeout(r, 500));
    try {
      const apiRes = await fetch(QWEN_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${QWEN_API_KEY}` },
        body: JSON.stringify({
          model: 'qwen3-max',
          messages: [
            { role: 'system', content: sysPrompt },
            { role: 'user', content: userContent + '\n\n/no_think' },
          ],
          temperature: mode === 'categorize' ? 0.2 : 0.3,
          max_tokens: 8192,
          enable_thinking: false,
        }),
      });
      if (!apiRes.ok) {
        const errBody = await apiRes.text();
        const isContentFilter = errBody.includes('data_inspection_failed');
        console.warn(`[Translate API] Qwen ${apiRes.status} (attempt ${attempt + 1}):`, errBody.slice(0, 300));
        if (isContentFilter && attempt < MAX_RETRIES - 1) continue;
        return { ok: false, content: '', error: `API ${apiRes.status}: ${errBody.slice(0, 200)}` };
      }
      const data = await apiRes.json();
      let content = data.choices?.[0]?.message?.content?.trim() || '';
      content = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
      return { ok: true, content };
    } catch (err: any) {
      if (attempt < MAX_RETRIES - 1) continue;
      return { ok: false, content: '', error: err.message };
    }
  }
  return { ok: false, content: '', error: 'Max retries exceeded' };
}

async function callDeepSeek(sysPrompt: string, userContent: string, mode: string): Promise<{ ok: boolean; content: string; error?: string }> {
  const MAX_RETRIES = 2;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) await new Promise(r => setTimeout(r, 500));
    try {
      const apiRes = await fetch(DEEPSEEK_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${DEEPSEEK_API_KEY}` },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: sysPrompt },
            { role: 'user', content: userContent },
          ],
          temperature: mode === 'categorize' ? 0.2 : 0.3,
          max_tokens: 8192,
        }),
      });
      if (!apiRes.ok) {
        const errBody = await apiRes.text();
        console.warn(`[Translate API] DeepSeek ${apiRes.status} (attempt ${attempt + 1}):`, errBody.slice(0, 300));
        if (attempt < MAX_RETRIES - 1) continue;
        return { ok: false, content: '', error: `API ${apiRes.status}: ${errBody.slice(0, 200)}` };
      }
      const data = await apiRes.json();
      const content = data.choices?.[0]?.message?.content?.trim() || '';
      return { ok: true, content };
    } catch (err: any) {
      if (attempt < MAX_RETRIES - 1) continue;
      return { ok: false, content: '', error: err.message };
    }
  }
  return { ok: false, content: '', error: 'Max retries exceeded' };
}

function callAI(model: AIModel, sysPrompt: string, userContent: string, mode: string) {
  return model === 'deepseek' ? callDeepSeek(sysPrompt, userContent, mode) : callQwen(sysPrompt, userContent, mode);
}

export async function PUT(req: NextRequest) {
  try {
    await connectDB();
    const admin = await authenticate(req);
    if (!admin) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { results, targetField, mode, collection } = body;

    if (!results || typeof results !== 'object' || Object.keys(results).length === 0) {
      return NextResponse.json({ message: 'results object required' }, { status: 400 });
    }
    if (!targetField) {
      return NextResponse.json({ message: 'targetField required' }, { status: 400 });
    }

    const Model = collection === 'bots' ? Bot : Group;

    const bulkOps = Object.entries(results).map(([id, value]) => {
      if (mode === 'categorize') {
        const allCats = (value as string).split('|').map((c: string) => c.trim()).filter(Boolean);
        const primary = allCats[0] || (value as string).trim();
        return { updateOne: { filter: { _id: id }, update: { $set: { category: primary, categories: allCats } } } };
      }
      return { updateOne: { filter: { _id: id }, update: { $set: { [targetField]: value } } } };
    });

    const bulkResult = await Model.bulkWrite(bulkOps);

    return NextResponse.json({
      saved: bulkResult.modifiedCount,
      total: Object.keys(results).length,
    });
  } catch (err: any) {
    console.error('Translate PUT error:', err);
    return NextResponse.json({ message: err.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const admin = await authenticate(req);
    if (!admin) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const {
      groupIds,
      targetLanguage,
      targetField,
      systemPrompt,
      userPromptTemplate,
      mode = 'translate',
      dryRun = false,
      collection,
      aiModel = 'qwen',
    } = body;

    const activeModel: AIModel = aiModel === 'deepseek' ? 'deepseek' : 'qwen';

    if (!groupIds || !Array.isArray(groupIds) || groupIds.length === 0) {
      return NextResponse.json({ message: 'groupIds required' }, { status: 400 });
    }
    if (mode === 'translate' && (!targetLanguage || !['de', 'es'].includes(targetLanguage))) {
      return NextResponse.json({ message: 'targetLanguage must be "de" or "es"' }, { status: 400 });
    }
    if (!targetField) {
      return NextResponse.json({ message: 'targetField required' }, { status: 400 });
    }
    if (activeModel === 'qwen' && !QWEN_API_KEY) {
      return NextResponse.json({ message: 'QWEN_API_KEY not configured' }, { status: 500 });
    }
    if (activeModel === 'deepseek' && !DEEPSEEK_API_KEY) {
      return NextResponse.json({ message: 'DEEPSEEK_API_KEY not configured' }, { status: 500 });
    }

    const Model = collection === 'bots' ? Bot : Group;
    let groups = await Model.find({ _id: { $in: groupIds } }).lean();
    if (groups.length === 0) {
      return NextResponse.json({ message: 'No items found' }, { status: 404 });
    }

    let skippedFull = 0;
    if (mode === 'categorize') {
      const before = groups.length;
      groups = groups.filter((g: any) => {
        const cats = (g.categories?.length ? g.categories : [g.category])
          .filter((c: string) => c && c !== 'All' && c !== 'Unknown');
        return cats.length < 3;
      });
      skippedFull = before - groups.length;
      if (skippedFull > 0) console.log(`[Translate API] Categorize: skipped ${skippedFull} groups that already have 3 categories`);
      if (groups.length === 0) {
        return NextResponse.json({
          mode, total: before, processed: 0, skippedFull, errors: [],
          results: {}, message: `All ${before} groups already have 3 categories`,
        });
      }
    }

    const langName = targetLanguage === 'de' ? 'German' : targetLanguage === 'es' ? 'Spanish' : 'English';

    const contextNote = `\n\nNOTE: This is an adult NSFW Telegram directory. Group names and descriptions contain explicit language — this is expected and normal. Keep names exactly as given. Only translate/rewrite the description content.`;
    const sysPrompt = (systemPrompt || `You are an expert SEO content specialist for Erogram.pro.`) + contextNote;

    const results: Record<string, string> = {};
    const errors: Array<{ groupId: string; error: string }> = [];

    const BATCH_SIZE = 8;
    for (let i = 0; i < groups.length; i += BATCH_SIZE) {
      const batch = groups.slice(i, i + BATCH_SIZE);

      let userContent: string;
      if (userPromptTemplate) {
        const groupsText = batch.map((g: any, idx: number) => formatGroupLine(g, idx, mode)).join('\n');
        userContent = userPromptTemplate
          .replace('{{groups}}', groupsText)
          .replace('{{language}}', langName)
          .replace('{{count}}', String(batch.length));
      } else {
        const groupsText = batch.map((g: any, idx: number) => formatGroupLine(g, idx, mode)).join('\n');
        if (mode === 'categorize') {
          userContent = `Categorize these ${batch.length} groups. If a group already has categories listed, ADD more specific ones to reach 2-3 total — do NOT remove existing valid categories. Return [N] Category1 | Category2 | Category3:\n\n${groupsText}`;
        } else if (mode === 'rewrite') {
          userContent = `Rewrite these ${batch.length} descriptions. STRICT: 100-120 characters each. Include niche, member count, category, country if known. No filler, no fluff. Return [N] text:\n\n${groupsText}`;
        } else {
          userContent = `Translate these ${batch.length} descriptions to ${langName}. Return [N] text:\n\n${groupsText}`;
        }
      }

      const aiRes = await callAI(activeModel, sysPrompt, userContent, mode);

      const isContentFilter = !aiRes.ok && (aiRes.error || '').includes('data_inspection_failed');

      if (!aiRes.ok && isContentFilter && batch.length > 1) {
        console.log(`[Translate API] Content filter on batch of ${batch.length} (${activeModel}), retrying individually in parallel...`);
        const fallbackModel: AIModel = activeModel === 'qwen' ? 'deepseek' : 'qwen';
        const soloPromises = batch.map(async (g) => {
          const soloText = formatGroupLine(g, 0, mode);
          let soloContent: string;
          if (userPromptTemplate) {
            soloContent = userPromptTemplate
              .replace('{{groups}}', soloText)
              .replace('{{language}}', langName)
              .replace('{{count}}', '1');
          } else {
            soloContent = mode === 'categorize'
              ? `Categorize this group. If it already has categories, ADD more specific ones to reach 2-3 total. Return [0] Category1 | Category2 | Category3:\n\n${soloText}`
              : mode === 'rewrite'
              ? `Rewrite this description. STRICT: 100-120 characters. Include niche, member count, category, country if known. No filler. Return [0] text:\n\n${soloText}`
              : `Translate this description to ${langName}. Return [0] text:\n\n${soloText}`;
          }
          let soloRes = await callAI(activeModel, sysPrompt, soloContent, mode);
          if (!soloRes.ok && DEEPSEEK_API_KEY && QWEN_API_KEY) {
            console.log(`[Translate API] ${activeModel} failed for ${(g as any).name}, trying ${fallbackModel}...`);
            soloRes = await callAI(fallbackModel, sysPrompt, soloContent, mode);
          }
          return { g, soloRes };
        });
        const soloResults = await Promise.allSettled(soloPromises);
        for (const s of soloResults) {
          if (s.status === 'fulfilled') {
            const { g, soloRes } = s.value;
            if (soloRes.ok && soloRes.content) {
              const cleaned = soloRes.content.replace(/^\[?\d+\]?\s*/, '').trim();
              if (cleaned) {
                results[(g as any)._id.toString()] = cleaned;
              } else {
                errors.push({ groupId: (g as any)._id.toString(), error: 'Empty result after retry' });
              }
            } else {
              errors.push({ groupId: (g as any)._id.toString(), error: soloRes.error || 'Content filter (individual)' });
            }
          }
        }
        continue;
      }

      if (!aiRes.ok) {
        for (const g of batch) {
          errors.push({ groupId: (g as any)._id.toString(), error: aiRes.error || 'API failed' });
        }
        continue;
      }

      const content = aiRes.content;
      console.log(`[Translate API] Batch ${i}/${groups.length}, mode=${mode}, len=${content.length}:`, content.slice(0, 300));

      let batchParsed = 0;

      if (mode === 'rewrite') {
        const regex = /\[(\d+)\]\s*([\s\S]*?)(?=\[\d+\]\s*|$)/g;
        let m;
        while ((m = regex.exec(content)) !== null) {
          let idx = parseInt(m[1], 10);
          if (idx >= 1 && idx <= batch.length) idx = idx - 1;
          if (idx >= 0 && idx < batch.length) {
            const val = m[2].trim();
            if (val) {
              results[(batch[idx] as any)._id.toString()] = val;
              batchParsed++;
            }
          }
        }
      } else {
        const lines = content.split('\n').filter((l: string) => l.trim());
        for (const line of lines) {
          const match = line.match(/^\[(\d+)\]\s*(.+)$/);
          if (match) {
            let idx = parseInt(match[1], 10);
            if (idx >= 1 && idx <= batch.length) idx = idx - 1;
            if (idx >= 0 && idx < batch.length) {
              results[(batch[idx] as any)._id.toString()] = match[2].trim();
              batchParsed++;
            }
          }
        }
      }

      console.log(`[Translate API] Parsed: ${batchParsed}/${batch.length}`);

      if (batchParsed === 0 && batch.length === 1) {
        const cleaned = content.replace(/^\[?\d+\]?\s*/, '').trim();
        if (cleaned) {
          results[(batch[0] as any)._id.toString()] = cleaned;
          batchParsed = 1;
        }
      }
    }

    if (dryRun) {
      return NextResponse.json({
        dryRun: true,
        mode,
        total: groups.length,
        processed: Object.keys(results).length,
        errors,
        results,
      });
    }

    const groupMap = new Map(groups.map((g: any) => [g._id.toString(), g]));

    const bulkOps = Object.entries(results).map(([id, value]) => {
      if (mode === 'categorize') {
        const aiCats = value.split('|').map((c: string) => c.trim()).filter(Boolean)
          .map((c: string) => validateCat(c)).filter(Boolean) as string[];
        const existing = groupMap.get(id);
        const oldCats: string[] = (existing?.categories?.length
          ? existing.categories : [existing?.category])
          .filter((c: string) => c && c !== 'All' && c !== 'Unknown')
          .map((c: string) => validateCat(c)).filter(Boolean) as string[];

        const seen = new Set(oldCats.map((c: string) => c.toLowerCase()));
        const final = [...oldCats];
        for (const c of aiCats) {
          if (final.length >= 3) break;
          if (!seen.has(c.toLowerCase())) { seen.add(c.toLowerCase()); final.push(c); }
        }
        return {
          updateOne: {
            filter: { _id: id },
            update: { $set: { category: final[0] || aiCats[0] || 'NSFW-Telegram', categories: final.length ? final : ['NSFW-Telegram'] } },
          },
        };
      }
      return {
        updateOne: {
          filter: { _id: id },
          update: { $set: { [targetField]: value } },
        },
      };
    });

    let modified = 0;
    if (bulkOps.length > 0) {
      const bulkResult = await Model.bulkWrite(bulkOps);
      modified = bulkResult.modifiedCount;
    }

    return NextResponse.json({
      mode,
      model: activeModel,
      total: groups.length,
      processed: Object.keys(results).length,
      saved: modified,
      errors,
      results,
    });
  } catch (err: any) {
    console.error('Translate API error:', err);
    return NextResponse.json({ message: err.message || 'Server error' }, { status: 500 });
  }
}
