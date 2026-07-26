/**
 * Phase 2: Rewrite English descriptions via Qwen + AI Writer humanizer.
 * Mirrors ai-writer/app/api/batch-rewrite/route.ts (EN only, Qwen instead of DeepSeek).
 *
 * Usage:
 *   node --env-file=.env.local scripts/generate-ainsfw-batch-descriptions.mjs --limit 10
 *   node --env-file=.env.local scripts/generate-ainsfw-batch-descriptions.mjs --slug deepfake-com-undress-ai
 */
import fs from 'fs';
import { humanize } from '../../ai-writer/lib/humanizer.ts';
import {
  MANIFEST_PATH,
  DESCRIPTIONS_PATH,
  DATA_TS,
  toolSlug,
} from './ainsfw-batch-lib.mjs';

const args = process.argv.slice(2);
const FORCE = args.includes('--force');
const limitIdx = args.indexOf('--limit');
const LIMIT = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) : 0;
const slugIdx = args.indexOf('--slug');
const ONLY_SLUGS = slugIdx >= 0
  ? args.slice(slugIdx + 1).filter((a) => !a.startsWith('--'))
  : [];

const TAVILY_KEY = process.env.TAVILY_API_KEY || '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';
const QWEN_KEY = process.env.QWEN_API_KEY || 'sk-36ea72ba2d6140d5aa694f58e18bc764';
const QWEN_URL = 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions';

/** Same as ai-writer batch-rewrite humanize pass (EN only). */
const HUMANIZE_OPTS = { typo: 0, capital: 0, punctuation: 2, spacing: 1, numberFuzz: 0 };

const VOICES = [
  'Write in a casual, slightly opinionated tone like a blogger who tests products for fun.',
  'Write in a professional but approachable tone, like a staff writer at a tech magazine.',
  'Write in a straightforward, no-nonsense tone like a buyer\'s guide editor.',
  'Write in a conversational tone, as if recommending the product to a friend over coffee.',
  'Write in a matter-of-fact tone with occasional dry humor.',
];

const BANNED_EN = `BANNED WORDS/PHRASES (using ANY is a critical failure):
- "landscape", "leverage", "game-changer", "cutting-edge", "revolutionary", "comprehensive", "robust", "seamless", "innovative", "unique", "tapestry", "multifaceted", "delve"
- "stands out", "sets it apart", "distinguishes itself", "what sets X apart", "a key differentiator", "carves its own niche"
- "It's worth noting", "In today's world", "Whether you're", "designed for users seeking", "making it a"
- "Moreover,", "Furthermore,", "However,", "Additionally," at sentence start
- Em-dashes or en-dashes. Use commas or periods instead.`;

function pickVoice(seed) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  return VOICES[Math.abs(hash) % VOICES.length];
}

function enSystem(voice) {
  return `You rewrite product descriptions for a review website with 1M+ monthly visitors. Rewrite completely from scratch in your own words.

${voice}

${BANNED_EN}

RULES:
1. Sound like you personally tested the product
2. Mix short punchy sentences with longer descriptive ones
3. Keep ALL factual details accurate (prices, features, numbers)
4. Write 80-150 words
5. Return ONLY the plain description text. No quotes, no labels, no markdown, no asterisks.`;
}

async function tavilySearch(name, category) {
  const query = `${name} AI ${category.toLowerCase()} review`;
  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: TAVILY_KEY,
        query,
        search_depth: 'advanced',
        max_results: 8,
        include_answer: false,
        include_raw_content: false,
        include_images: false,
      }),
    });
    if (!res.ok) return '';
    const data = await res.json();
    return (data.results || [])
      .filter((r) => r.score >= 0.3)
      .slice(0, 4)
      .map((r) => `[${r.title}]: ${(r.content || '').slice(0, 400)}`)
      .join('\n\n');
  } catch {
    return '';
  }
}

async function callQwen(systemPrompt, userPrompt) {
  const res = await fetch(QWEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${QWEN_KEY}`,
    },
    body: JSON.stringify({
      model: 'qwen3-max',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt + '\n\n/no_think' },
      ],
      temperature: 0.85,
      max_tokens: 600,
      presence_penalty: 0.5,
      frequency_penalty: 0.3,
      enable_thinking: false,
    }),
  });
  if (!res.ok) throw new Error(`Qwen ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  let text = data.choices?.[0]?.message?.content?.trim() ?? '';
  text = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  text = text.replace(/^["']|["']$/g, '').trim();
  text = text.replace(/\s*[\u2013\u2014]\s*/g, ', ');
  return text;
}

function liveSlugsFromDataTs() {
  const src = fs.readFileSync(DATA_TS, 'utf8');
  const slugs = new Set();
  const re = /slug:\s*slugify\('([^']+)',\s*'((?:[^'\\]|\\.)*)'\)/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    slugs.add(toolSlug(m[1], m[2].replace(/\\'/g, "'")));
  }
  return slugs;
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
let results = {};
if (fs.existsSync(DESCRIPTIONS_PATH) && !FORCE && !LIMIT && !ONLY_SLUGS.length) {
  try { results = JSON.parse(fs.readFileSync(DESCRIPTIONS_PATH, 'utf8')); } catch {}
}

const liveSlugs = liveSlugsFromDataTs();
let tools = manifest.filter((t) => liveSlugs.has(t.slug));

if (ONLY_SLUGS.length) {
  tools = tools.filter((t) => ONLY_SLUGS.includes(t.slug));
} else if (LIMIT > 0) {
  // Mix: user-facing samples across categories + deepfake (messy before)
  const picks = [
    'deepfake-com-undress-ai',
    'ai-charfriend-ai-chat',
    'alphazria-ai-chat',
    'aroused-ai-ai-girlfriend',
    'eroplay-ai-ai-roleplay',
    'nudify-online-undress-ai',
    'pornx-ai-image',
    'sexting-ai-ai-chat',
    'pirate-jessica-adult-games',
    'game-of-lust-2-adult-games',
  ].slice(0, LIMIT);
  tools = picks.map((s) => tools.find((t) => t.slug === s)).filter(Boolean);
}

let done = 0;
let failed = 0;

for (let i = 0; i < tools.length; i++) {
  const tool = tools[i];
  if (!FORCE && results[tool.slug]?.source === 'qwen-humanized') {
    done++;
    continue;
  }

  console.log(`[${i + 1}/${tools.length}] ${tool.name}`);
  try {
    const context = await tavilySearch(tool.name, tool.category);
    const voice = pickVoice(tool.name);
    const userPrompt = context
      ? `Product: ${tool.name}\nCategory: ${tool.category}\n\nOriginal description:\n${tool.scrapeDesc}\n\nWeb research context:\n${context}`
      : `Product: ${tool.name}\nCategory: ${tool.category}\n\nOriginal description:\n${tool.scrapeDesc}`;

    const enRaw = await callQwen(enSystem(voice), userPrompt);
    const enHumanized = humanize(enRaw, HUMANIZE_OPTS);

    results[tool.slug] = {
      slug: tool.slug,
      name: tool.name,
      description: enHumanized.text,
      raw: enRaw,
      words: enHumanized.text.split(/\s+/).length,
      mutations: enHumanized.mutations.length,
      source: 'qwen-humanized',
    };
    console.log(`  ✅ ${results[tool.slug].words} words, ${enHumanized.mutations.length} humanize tweaks`);
    done++;
  } catch (e) {
    console.log(`  ❌ ${e.message}`);
    failed++;
  }

  fs.writeFileSync(DESCRIPTIONS_PATH, JSON.stringify(results, null, 2));
  await new Promise((r) => setTimeout(r, 500));
}

console.log(`\nDone: ${done} ok, ${failed} failed`);
if (tools.length) {
  console.log('\nPreview URLs (local):');
  for (const t of tools) {
    if (results[t.slug]?.description) console.log(`  http://127.0.0.1:3939/ainsfw/${t.slug}`);
  }
}
