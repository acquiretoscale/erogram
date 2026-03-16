import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import { User, Group } from '@/lib/models';

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';
const QWEN_API_KEY = process.env.QWEN_API_KEY || '';
const QWEN_API_URL = 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'sk-6dc28d2672fe4b6ca195f34e5f462a7b';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

type AIModel = 'qwen' | 'deepseek';

const CATEGORIES = [
  'Adult', 'AI NSFW', 'Amateur', 'Anal', 'Anime', 'Argentina',
  'Asian', 'BDSM', 'Big Ass', 'Big Tits', 'Black', 'Blonde', 'Blowjob',
  'Brazil', 'Brunette', 'China', 'Colombia', 'Cosplay', 'Creampie',
  'Cuckold', 'Ebony', 'Fantasy', 'Feet', 'Fetish', 'France', 'Free-use',
  'Germany', 'Hardcore', 'Italy',
  'Japan', 'Latina', 'Lesbian', 'Masturbation', 'Mexico', 'MILF',
  'NSFW-Telegram', 'Onlyfans', 'Onlyfans Leaks', 'Petite', 'Philippines', 'Privacy', 'Public', 'Red Hair', 'Russian',
  'Spain', 'Telegram-Porn', 'Threesome', 'UK', 'Ukraine', 'USA', 'Vietnam',
];
const ALLOWED_CATS = new Set(CATEGORIES.map(c => c.toLowerCase()));

async function authenticate(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = await User.findById(decoded.id);
    if (user && user.isAdmin) return user;
  } catch { /* invalid */ }
  return null;
}

async function callAI(model: AIModel, messages: Array<{ role: string; content: string }>): Promise<{ ok: boolean; content: string; error?: string }> {
  const url = model === 'deepseek' ? DEEPSEEK_API_URL : QWEN_API_URL;
  const key = model === 'deepseek' ? DEEPSEEK_API_KEY : QWEN_API_KEY;
  const modelName = model === 'deepseek' ? 'deepseek-chat' : 'qwen3-max';

  if (!key) return { ok: false, content: '', error: `${model} API key not configured` };

  const isQwen = model === 'qwen';
  const msgs = isQwen
    ? messages.map((m, i) => i === messages.length - 1 && m.role === 'user' ? { ...m, content: m.content + '\n\n/no_think' } : m)
    : messages;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: modelName,
        messages: msgs,
        temperature: 0.3,
        max_tokens: 8192,
        ...(isQwen ? { enable_thinking: false } : {}),
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      return { ok: false, content: '', error: `API ${res.status}: ${err.slice(0, 200)}` };
    }
    const data = await res.json();
    let content = data.choices?.[0]?.message?.content?.trim() || '';
    if (isQwen) content = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    return { ok: true, content };
  } catch (err: any) {
    return { ok: false, content: '', error: err.message };
  }
}

interface ActionResult {
  action: string;
  groupName?: string;
  groupId?: string;
  success: boolean;
  detail: string;
}

async function executeActions(actions: any[]): Promise<ActionResult[]> {
  const results: ActionResult[] = [];

  for (const action of actions) {
    try {
      const { type } = action;

      if (type === 'search_groups') {
        const query = action.query || '';
        const filter: any = {};
        if (query) {
          filter.$or = [
            { name: { $regex: query, $options: 'i' } },
            { categories: { $regex: query, $options: 'i' } },
            { description: { $regex: query, $options: 'i' } },
          ];
        }
        if (action.status) filter.status = action.status;
        if (action.premiumOnly !== undefined) filter.premiumOnly = action.premiumOnly;

        const groups = await Group.find(filter).sort({ createdAt: -1 }).limit(action.limit || 20).lean();
        results.push({
          action: 'search_groups',
          success: true,
          detail: JSON.stringify(groups.map((g: any) => ({
            id: g._id, name: g.name, categories: g.categories, status: g.status,
            members: g.memberCount, description: g.description?.slice(0, 150),
            premiumOnly: g.premiumOnly, description_de: g.description_de ? 'yes' : 'no',
            description_es: g.description_es ? 'yes' : 'no',
          }))),
        });
        continue;
      }

      let group: any = null;
      if (action.groupId) {
        group = await Group.findById(action.groupId);
      } else if (action.groupName) {
        group = await Group.findOne({ name: { $regex: `^${action.groupName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } });
        if (!group) group = await Group.findOne({ name: { $regex: action.groupName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } });
      }

      if (!group && type !== 'search_groups' && type !== 'count_groups' && type !== 'bulk_update') {
        results.push({ action: type, groupName: action.groupName, success: false, detail: `Group not found: "${action.groupName || action.groupId}"` });
        continue;
      }

      switch (type) {
        case 'update_description': {
          group.description = action.value;
          group.updatedAt = new Date();
          await group.save();
          results.push({ action: type, groupName: group.name, groupId: group._id, success: true, detail: `Description updated` });
          break;
        }
        case 'rewrite_description': {
          const rewriteSys = `You are an expert SEO content writer for Erogram.pro, an adult NSFW Telegram groups directory. Rewrite the description in ENGLISH only. 200+ chars, unique, human-like, niche-specific. NO filler words. Mention the group name and niche naturally. Output ONLY the rewritten description, nothing else.`;
          const rewriteUser = `Group: ${group.name}\nCategory: ${(group.categories || [group.category]).join(', ')}\nMembers: ${group.memberCount || 'Unknown'}\nCurrent description: ${group.description || 'None'}\n\nRewrite this description in English:`;
          const rwModel: AIModel = (action.aiModel === 'deepseek' ? 'deepseek' : 'qwen');
          const rwRes = await callAI(rwModel, [{ role: 'system', content: rewriteSys }, { role: 'user', content: rewriteUser }]);
          if (rwRes.ok && rwRes.content) {
            group.description = rwRes.content;
            group.updatedAt = new Date();
            await group.save();
            results.push({ action: type, groupName: group.name, groupId: group._id, success: true, detail: rwRes.content.slice(0, 120) + '...' });
          } else {
            results.push({ action: type, groupName: group.name, groupId: group._id, success: false, detail: rwRes.error || 'Rewrite failed' });
          }
          break;
        }
        case 'update_description_de': {
          group.description_de = action.value;
          group.updatedAt = new Date();
          await group.save();
          results.push({ action: type, groupName: group.name, groupId: group._id, success: true, detail: `DE description updated` });
          break;
        }
        case 'update_description_es': {
          group.description_es = action.value;
          group.updatedAt = new Date();
          await group.save();
          results.push({ action: type, groupName: group.name, groupId: group._id, success: true, detail: `ES description updated` });
          break;
        }
        case 'update_categories': {
          const cats = (action.value as string[])
            .map((c: string) => CATEGORIES.find(k => k.toLowerCase() === c.toLowerCase()) || '')
            .filter(Boolean)
            .slice(0, 3);
          if (cats.length === 0) { results.push({ action: type, groupName: group.name, success: false, detail: 'No valid categories from the allowed list' }); break; }
          group.categories = cats;
          group.category = cats[0] || group.category;
          group.updatedAt = new Date();
          await group.save();
          results.push({ action: type, groupName: group.name, groupId: group._id, success: true, detail: `Categories set to: ${cats.join(', ')}` });
          break;
        }
        case 'add_categories': {
          const existing = new Set((group.categories || []).map((c: string) => c.toLowerCase()));
          const toAdd = (action.value as string[])
            .map((c: string) => CATEGORIES.find(k => k.toLowerCase() === c.toLowerCase()) || '')
            .filter((c: string) => c && !existing.has(c.toLowerCase()));
          const merged = [...(group.categories || []), ...toAdd].slice(0, 3);
          group.categories = merged;
          group.category = merged[0] || group.category;
          group.updatedAt = new Date();
          await group.save();
          results.push({ action: type, groupName: group.name, groupId: group._id, success: true, detail: `Categories now: ${merged.join(', ')}` });
          break;
        }
        case 'move_to_vault': {
          group.premiumOnly = true;
          group.status = 'approved';
          group.updatedAt = new Date();
          await group.save();
          results.push({ action: type, groupName: group.name, groupId: group._id, success: true, detail: `Moved to vault` });
          break;
        }
        case 'remove_from_vault': {
          group.premiumOnly = false;
          group.updatedAt = new Date();
          await group.save();
          results.push({ action: type, groupName: group.name, groupId: group._id, success: true, detail: `Removed from vault (now public)` });
          break;
        }
        case 'approve': {
          group.status = 'approved';
          group.updatedAt = new Date();
          await group.save();
          results.push({ action: type, groupName: group.name, groupId: group._id, success: true, detail: `Approved` });
          break;
        }
        case 'delete': {
          if (group.status === 'approved') {
            group.status = 'deleted';
            group.deletedAt = new Date();
            await group.save();
            results.push({ action: type, groupName: group.name, groupId: group._id, success: true, detail: `Soft-deleted (was approved)` });
          } else {
            await Group.findByIdAndDelete(group._id);
            results.push({ action: type, groupName: group.name, groupId: group._id, success: true, detail: `Permanently deleted` });
          }
          break;
        }
        case 'update_name': {
          group.name = action.value;
          group.updatedAt = new Date();
          await group.save();
          results.push({ action: type, groupName: group.name, groupId: group._id, success: true, detail: `Name updated to "${action.value}"` });
          break;
        }
        case 'count_groups': {
          const filter: any = {};
          if (action.status) filter.status = action.status;
          if (action.premiumOnly !== undefined) filter.premiumOnly = action.premiumOnly;
          if (action.category) filter.categories = action.category;
          const count = await Group.countDocuments(filter);
          results.push({ action: type, success: true, detail: `Count: ${count}` });
          break;
        }
        case 'bulk_update': {
          const bulkFilter: any = {};
          if (action.filter?.status) bulkFilter.status = action.filter.status;
          if (action.filter?.category) bulkFilter.categories = action.filter.category;
          if (action.filter?.premiumOnly !== undefined) bulkFilter.premiumOnly = action.filter.premiumOnly;
          if (action.filter?.nameRegex) bulkFilter.name = { $regex: action.filter.nameRegex, $options: 'i' };
          const updateFields: any = { updatedAt: new Date() };
          if (action.set?.status) updateFields.status = action.set.status;
          if (action.set?.premiumOnly !== undefined) updateFields.premiumOnly = action.set.premiumOnly;
          if (action.set?.category) { updateFields.category = action.set.category; }
          const r = await Group.updateMany(bulkFilter, { $set: updateFields });
          results.push({ action: type, success: true, detail: `Bulk updated ${r.modifiedCount} groups` });
          break;
        }
        case 'save_memory': {
          results.push({
            action: 'save_memory', success: true,
            detail: JSON.stringify({ key: action.key, value: action.value }),
          });
          break;
        }
        case 'delete_memory': {
          results.push({
            action: 'delete_memory', success: true,
            detail: JSON.stringify({ key: action.key }),
          });
          break;
        }
        default:
          results.push({ action: type, success: false, detail: `Unknown action: ${type}` });
      }
    } catch (err: any) {
      results.push({ action: action.type, success: false, detail: `Error: ${err.message}` });
    }
  }

  return results;
}

const SYSTEM_PROMPT = `You are an AI assistant for Erogram.pro's Groups Hub admin panel. You have FULL access to manage Telegram groups in the database.

ABOUT EROGRAM: Adult NSFW Telegram groups & channels directory. Categories: ${CATEGORIES.join(', ')}
Statuses: pending, approved, rejected, scheduled, deleted

You can execute actions by returning a JSON block. ALWAYS wrap actions in a \`\`\`json code block. Format:
\`\`\`json
{"actions": [...]}
\`\`\`

AVAILABLE ACTIONS:
1. search_groups - Find groups
   {"type":"search_groups","query":"lesbian","status":"approved","limit":10}

2. update_description - Set EN description to an EXACT value you provide
   {"type":"update_description","groupName":"Group Name","value":"New description text"}

3. rewrite_description - AI-rewrite the EN description (SEO, 200+ chars, English only). Use this when admin says "rewrite".
   {"type":"rewrite_description","groupName":"Group Name"}
   You can rewrite multiple groups: use one action per group.

4. update_description_de / update_description_es - Change DE/ES description
   {"type":"update_description_de","groupName":"Group Name","value":"German text"}

5. update_categories - SET categories (replaces all)
   {"type":"update_categories","groupName":"Group Name","value":["Lesbian","Amateur","Telegram-Porn"]}

6. add_categories - ADD categories without removing existing ones
   {"type":"add_categories","groupName":"Group Name","value":["Brazil","Latina"]}

7. move_to_vault - Move to premium vault
   {"type":"move_to_vault","groupName":"Group Name"}

8. remove_from_vault - Make public again
   {"type":"remove_from_vault","groupName":"Group Name"}

9. approve - Approve a pending group
   {"type":"approve","groupName":"Group Name"}

10. delete - Delete a group (soft if approved, hard if pending)
    {"type":"delete","groupName":"Group Name"}

11. update_name - Rename a group
    {"type":"update_name","groupName":"Old Name","value":"New Name"}

12. count_groups - Count groups matching filter
    {"type":"count_groups","status":"approved","premiumOnly":true}

13. bulk_update - Update multiple groups at once
    {"type":"bulk_update","filter":{"status":"pending","category":"Adult"},"set":{"status":"approved"}}

14. save_memory - Save an instruction/fact the admin wants you to remember across sessions
    {"type":"save_memory","key":"categorization_rules","value":"Always assign 2-3 cats. Use country cat for non-English groups."}

15. delete_memory - Forget a saved instruction
    {"type":"delete_memory","key":"categorization_rules"}

RULES:
- You can combine multiple actions in one response
- Use groupName (case-insensitive partial match) to find groups. Use groupId if you know it.
- When the user asks to find/show groups, use search_groups first. The system will automatically fetch results and ask you to present them.
- For descriptions, write 200+ chars, SEO-friendly, niche-specific, no filler
- Categories MUST be from the allowed list ONLY: ${CATEGORIES.join(', ')}. NEVER invent or create new categories. If a category is not in this list, do NOT use it. Always assign 2-3 categories.
- Be concise in your text responses. Show what you did clearly.
- If you need info first, search before acting.
- NEVER fabricate group names. Search first if unsure.
- ALWAYS include explanatory text OUTSIDE the json block. Never return only a json block with no text.
- When the user asks you to fix/change something on a specific group, search for it first, then immediately execute the fix in the same response — don't just say you'll do it.
- If the user says "fix it" or "assign correct category" after you described something, EXECUTE the action immediately.
- CRITICAL: When the admin says "rewrite" description, use rewrite_description (server-side AI rewrite in English). Do NOT write the description yourself and do NOT translate — rewrite_description handles everything.
- update_description is ONLY for when the admin provides the exact text to set.
- All descriptions must be in ENGLISH unless the admin explicitly asks for DE/ES.

MEMORY SYSTEM:
- You have persistent memory. Instructions the admin gives you (like "always do X", "remember that Y") should be saved with save_memory.
- Use short, clear keys (snake_case) and concise values. Keep values under 200 chars.
- When the admin says "remember this", "from now on", "always do X", or gives you a standing instruction — save it.
- Your saved memories are injected below. Follow them strictly.`;

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const admin = await authenticate(req);
    if (!admin) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { messages, aiModel = 'qwen', pageContext = '', memory = {} } = await req.json();
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ message: 'messages required' }, { status: 400 });
    }

    const model: AIModel = aiModel === 'deepseek' ? 'deepseek' : 'qwen';

    const contextNote = pageContext
      ? `\n\nCURRENT PAGE: The admin is currently viewing "${pageContext}". Tailor your responses and suggestions to this context. If they ask about "these groups" or "this page", they mean the groups/content visible on this page.`
      : '';

    const memEntries = Object.entries(memory as Record<string, string>);
    const memBlock = memEntries.length > 0
      ? `\n\nADMIN MEMORY (${memEntries.length} items):\n${memEntries.map(([k, v]) => `• ${k}: ${v}`).join('\n')}`
      : '';

    const fullMessages = [
      { role: 'system', content: SYSTEM_PROMPT + contextNote + memBlock },
      ...messages,
    ];

    const aiRes = await callAI(model, fullMessages);
    if (!aiRes.ok) {
      return NextResponse.json({ reply: `AI Error: ${aiRes.error}`, actions: [] });
    }

    let reply = aiRes.content;
    const originalReply = reply;
    let actionResults: ActionResult[] = [];

    const jsonBlocks = [...reply.matchAll(/```json\s*([\s\S]*?)```/g)];
    for (const jsonMatch of jsonBlocks) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        if (parsed.actions && Array.isArray(parsed.actions)) {
          const results = await executeActions(parsed.actions);
          actionResults.push(...results);
        }
      } catch (e) {
        console.warn('[AI Chat] Failed to parse actions JSON:', e);
      }
    }

    const searchResults = actionResults.filter(r => r.action === 'search_groups' && r.success);
    const nonSearchActions = actionResults.filter(r => r.action !== 'search_groups');

    if (searchResults.length > 0) {
      try {
        const allFound: any[] = [];
        for (const sr of searchResults) {
          try { allFound.push(...JSON.parse(sr.detail)); } catch { /* skip */ }
        }

        const followUpMessages = [
          ...fullMessages,
          { role: 'assistant', content: originalReply },
          {
            role: 'user',
            content: `Here are the database results (${allFound.length} groups). Present them clearly and if the user asked for changes, execute those changes now using action JSON blocks:\n\n${JSON.stringify(allFound, null, 2)}`,
          },
        ];

        const followUp = await callAI(model, followUpMessages);
        if (followUp.ok && followUp.content) {
          reply = followUp.content;

          const followUpJsonBlocks = [...reply.matchAll(/```json\s*([\s\S]*?)```/g)];
          for (const fj of followUpJsonBlocks) {
            try {
              const fp = JSON.parse(fj[1]);
              if (fp.actions?.length) {
                const moreResults = await executeActions(fp.actions);
                actionResults.push(...moreResults);
              }
            } catch { /* ignore */ }
          }
        }
      } catch (err) {
        console.warn('[AI Chat] Follow-up after search failed:', err);
      }
    }

    let textReply = reply.replace(/```json[\s\S]*?```/g, '').trim();

    if (!textReply && nonSearchActions.length > 0) {
      textReply = nonSearchActions.map(a =>
        `${a.success ? '✅' : '❌'} ${a.action}${a.groupName ? ` on ${a.groupName}` : ''}: ${a.detail}`
      ).join('\n');
    }
    if (!textReply) {
      textReply = actionResults.length > 0
        ? `Done. ${actionResults.filter(a => a.success).length}/${actionResults.length} actions completed.`
        : 'I processed your request but have no additional details to share.';
    }

    return NextResponse.json({
      reply: textReply,
      actions: actionResults.filter(r => r.action !== 'search_groups'),
      raw: originalReply,
    });
  } catch (error: any) {
    console.error('[AI Chat] Error:', error);
    return NextResponse.json({ message: 'Internal error', error: error.message }, { status: 500 });
  }
}
