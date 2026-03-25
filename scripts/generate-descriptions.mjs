import fs from 'fs';
import path from 'path';

const TAVILY_KEY = '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';
const DEEPSEEK_KEY = 'sk-6dc28d2672fe4b6ca195f34e5f462a7b';
const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';

const TOOLS = [
  { name: 'DreamGF', category: 'AI Girlfriend', vendor: 'Dreamgf.ai' },
  { name: 'FantasyGF', category: 'AI Girlfriend', vendor: 'Fantasygf.com' },
  { name: 'CrushOn.AI', category: 'AI Girlfriend', vendor: 'Crushon.ai' },
  { name: 'Muah.AI', category: 'AI Girlfriend', vendor: 'Muah.ai' },
  { name: 'Kupid AI', category: 'AI Girlfriend', vendor: 'Kupid.ai' },
  { name: 'SoulFun', category: 'AI Girlfriend', vendor: 'Soulfun.ai' },
  { name: 'Nastia AI', category: 'AI Girlfriend', vendor: 'Nastia.ai' },
  { name: 'GirlfriendGPT', category: 'AI Girlfriend', vendor: 'Gptgirlfriend.online' },
  { name: 'SpicyAI', category: 'AI Girlfriend', vendor: 'Spicyai.io' },
  { name: 'AI Girlfriend WTF', category: 'AI Girlfriend', vendor: 'Aigirlfriend.wtf' },
  { name: 'My Lovely AI', category: 'AI Girlfriend', vendor: 'Mylovely.ai' },
  { name: 'Secrets.AI', category: 'AI Girlfriend', vendor: 'Secrets.ai' },
  { name: 'Elyza', category: 'AI Girlfriend', vendor: 'Elyza.app' },
  { name: 'DreamBF AI', category: 'AI Girlfriend', vendor: 'Dreambf.ai' },
  { name: 'Loveli.AI', category: 'AI Girlfriend', vendor: 'Loveli.ai' },
  { name: 'Krush', category: 'AI Girlfriend', vendor: 'Krush.chat' },
  { name: 'Romantic AI', category: 'AI Girlfriend', vendor: 'Romanticai.com' },
  { name: 'Honeybot', category: 'AI Girlfriend', vendor: 'Honeybot.ai' },
  { name: 'LoveMy.AI', category: 'AI Girlfriend', vendor: 'Lovemy.ai' },
  { name: 'Dream Companion', category: 'AI Girlfriend', vendor: 'Mydreamcompanion.com' },
  { name: 'Undress AI', category: 'Undress AI', vendor: 'Undressai.com' },
  { name: 'Clothoff.net', category: 'Undress AI', vendor: 'Clothoff.net' },
  { name: 'Nudify AI', category: 'Undress AI', vendor: 'Nudify-ai.top' },
  { name: 'DeepNudeNow', category: 'Undress AI', vendor: 'Deepnudenow.com' },
  { name: 'Undress.App', category: 'Undress AI', vendor: 'Undress.App' },
  { name: 'Deepstrip', category: 'Undress AI', vendor: 'Deepstrip.com' },
  { name: 'NudeMaker', category: 'Undress AI', vendor: 'Nudemaker.app' },
  { name: 'AINUDEZ', category: 'Undress AI', vendor: 'Ainudez.com' },
  { name: 'Makenude', category: 'Undress AI', vendor: 'Makenude.app' },
  { name: 'Fastundress', category: 'Undress AI', vendor: 'Fastundress.net' },
  { name: 'SpicyChat', category: 'AI Chat', vendor: 'Spicychat.ai' },
  { name: 'JuicyChat.AI', category: 'AI Chat', vendor: 'Juicychat.ai' },
  { name: 'PepHop', category: 'AI Chat', vendor: 'Pephop.ai' },
  { name: 'Joyland', category: 'AI Chat', vendor: 'Joyland.ai' },
  { name: 'DreamGen', category: 'AI Chat', vendor: 'Dreamgen.com' },
  { name: 'Nextpart AI', category: 'AI Chat', vendor: 'Nextpart.ai' },
  { name: 'JOI AI', category: 'AI Chat', vendor: 'Joiai.com' },
  { name: 'aiAllure', category: 'AI Chat', vendor: 'Aiallure.com' },
  { name: 'Wemate', category: 'AI Chat', vendor: 'Wemate.ai' },
  { name: 'Lollipop', category: 'AI Chat', vendor: 'Lollipop.chat' },
  { name: 'Playbox', category: 'AI Image', vendor: 'Playbox.com' },
  { name: 'NudeFab', category: 'AI Image', vendor: 'Nudefab.com' },
  { name: 'CelebMakerAI', category: 'AI Image', vendor: 'Celebmakerai.com' },
  { name: 'CreatePorn', category: 'AI Image', vendor: 'Createporn.com' },
  { name: 'Seduced', category: 'AI Image', vendor: 'Seduced.com' },
  { name: 'VibeNude', category: 'AI Image', vendor: 'Vibenude.net' },
  { name: 'SoulGen', category: 'AI Image', vendor: 'Soulgen.ai' },
  { name: 'Facy AI', category: 'AI Image', vendor: 'Facy.ai' },
  { name: 'Swapzy', category: 'AI Image', vendor: 'Swapzyface.com' },
  { name: 'FaceSwapLab', category: 'AI Image', vendor: 'Faceswaplab.com' },
  { name: 'Hyperdreams', category: 'AI Roleplay', vendor: 'Hyperdreams.com' },
  { name: 'StoryChan', category: 'AI Roleplay', vendor: 'Storychan.com' },
  { name: 'RedQuill', category: 'AI Roleplay', vendor: 'Redquill.net' },
  { name: 'Luvy AI', category: 'AI Roleplay', vendor: 'Luvy.ai' },
  { name: 'Kink AI', category: 'AI Roleplay', vendor: 'Kink.ai' },
  { name: 'My Dream Boy', category: 'AI Roleplay', vendor: 'Mydreamboy.com' },
  { name: 'Juicy AI', category: 'AI Roleplay', vendor: 'Juicy-ai.com' },
  { name: 'Avtaar AI', category: 'AI Roleplay', vendor: 'Avtaar.ai' },
  { name: 'Nextpart AI RP', category: 'AI Roleplay', vendor: 'Nextpart.ai' },
  { name: 'Secrets AI Roleplay', category: 'AI Roleplay', vendor: 'Secrets.ai' },
];

const OUTPUT_FILE = path.join(process.cwd(), 'scripts', 'descriptions-output.json');

async function searchTavily(name, vendor, category) {
  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: TAVILY_KEY,
        query: `${name} ${vendor} ${category} app review features pricing 2025 2026`,
        search_depth: 'basic',
        include_answer: true,
        max_results: 5,
      }),
    });
    if (!res.ok) return '';
    const data = await res.json();
    let context = data.answer || '';
    if (data.results) {
      for (const r of data.results.slice(0, 3)) {
        if (r.content) context += '\n' + r.content;
      }
    }
    return context.slice(0, 3000);
  } catch (e) {
    console.error(`  Tavily error for ${name}:`, e.message);
    return '';
  }
}

async function generateDescription(name, category, vendor, tavilyContext) {
  const systemPrompt = `You are a professional SEO copywriter for Erogram.pro, an adult AI tools directory. Write unique, factual product descriptions. Be direct, informative, and engaging. Never use filler phrases like "in today's world" or "in an era of". Never start with "Looking for". Mention the tool name and what makes it unique. Include specific features when known. Output ONLY the description text, nothing else — no quotes, no labels.`;

  const userPrompt = `Write a unique product description for "${name}" (${category} tool, website: ${vendor}).

Research context:
${tavilyContext || 'No research available — write based on category and name.'}

Requirements:
- Between 50 and 150 words exactly
- Factual, specific to THIS tool — not generic
- Mention the tool name naturally
- Cover: what it does, key features, what makes it different
- SEO-friendly but human-readable
- Do NOT use single quotes (') anywhere in the text — use double quotes or rephrase instead
- No markdown formatting`;

  try {
    const res = await fetch(DEEPSEEK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 300,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`  DeepSeek error for ${name}: ${res.status} — ${errText}`);
      return null;
    }

    const data = await res.json();
    let desc = data.choices?.[0]?.message?.content?.trim() || null;
    if (desc) {
      desc = desc.replace(/^["']|["']$/g, '').replace(/'/g, '\u2019');
    }
    return desc;
  } catch (e) {
    console.error(`  DeepSeek error for ${name}:`, e.message);
    return null;
  }
}

async function main() {
  console.log(`Processing ${TOOLS.length} tools...\n`);

  let results = {};
  if (fs.existsSync(OUTPUT_FILE)) {
    try { results = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8')); } catch {}
  }

  let done = 0, failed = 0;

  for (let i = 0; i < TOOLS.length; i++) {
    const tool = TOOLS[i];
    const key = `${tool.name}___${tool.vendor}`;

    if (results[key]) {
      console.log(`[${i + 1}/${TOOLS.length}] SKIP ${tool.name} (already done)`);
      done++;
      continue;
    }

    console.log(`[${i + 1}/${TOOLS.length}] ${tool.name} — searching Tavily...`);
    const context = await searchTavily(tool.name, tool.vendor, tool.category);

    console.log(`  → Writing with DeepSeek...`);
    const desc = await generateDescription(tool.name, tool.category, tool.vendor, context);

    if (desc) {
      const wordCount = desc.split(/\s+/).length;
      results[key] = { name: tool.name, vendor: tool.vendor, category: tool.category, description: desc, words: wordCount };
      console.log(`  ✅ ${wordCount} words`);
      done++;
    } else {
      console.log(`  ❌ Failed`);
      failed++;
    }

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));

    // Rate limit: small delay between calls
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\nDone: ${done} success, ${failed} failed`);
  console.log(`Output: ${OUTPUT_FILE}`);
}

main();
