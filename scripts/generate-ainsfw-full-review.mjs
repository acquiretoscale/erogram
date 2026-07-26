/**
 * Generate full AINSFW editorial listing (short desc + highlights + review sections).
 * Few-shot style from competitor sample (Clothoff). Qwen only, no fake typos.
 *
 * Usage: node --env-file=.env.local scripts/generate-ainsfw-full-review.mjs <tool-slug> [more-slugs...]
 */
import fs from 'fs';
import path from 'path';
import { humanize } from '../../ai-writer/lib/humanizer.ts';
import { DATA_TS, toolSlug, escapeTsString } from './ainsfw-batch-lib.mjs';

const slugArgs = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (!slugArgs.length) {
  console.error('Usage: node scripts/generate-ainsfw-full-review.mjs <tool-slug> [more-slugs...]');
  process.exit(1);
}

const TAVILY_KEY = process.env.TAVILY_API_KEY || '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';
const QWEN_KEY = process.env.QWEN_API_KEY || 'sk-36ea72ba2d6140d5aa694f58e18bc764';
const QWEN_URL = 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions';
const OUT_TS = path.join(process.cwd(), 'app/ainsfw/fullReviews.ts');
const STORE_JSON = path.join(process.cwd(), 'scripts/ainsfw-full-reviews.json');

/** Off. ESL voice comes from the few-shot sample, not injected typos. */
const HUMANIZE_OPTS = { typo: 0, capital: 0, punctuation: 0, spacing: 0, numberFuzz: 0 };

const STYLE_SAMPLE = `Clothoff.net is the place where artificial intelligence is used to bridge reality with fantasy. The platform is well entrenched in the adult entertainment ecosystem, but it is original in its own right. Its AI-powered tools help creative users unleash their imagination and create original content. As the name indicates, its most popular tool lets users remove clothes from photos online. The process is greatly simplified, and anyone can achieve outstanding results with just a few clicks.

Remove Clothes from Any Photo
The name speaks for itself, and Clothoff.net is the best choice for producing naked images from photos. Users simply upload a picture, and the AI tools take care of the rest in seconds. The results are aesthetically pleasing and realistic, and images can be saved in a personal account.

Diverse Customization Options
Clothoff.net allows users who try the nudity tool to customize the results. They can opt for nude photos or different types of clothes and styles. Bodily features and even age can be adjusted for more accurate results. Members can even choose one of the original sets available.

Arousing Sexual Positions
Clothoff.net offers the best features to registered members who buy VIP coins. The best way to spend these tokens is on sexual poses that turn regular images into erotic art. This feature includes all the customization options, which makes the results even better.

Clothoff.net Review
Clothoff.net is an adult entertainment platform with a clean, intuitive design for newcomers. Its best-selling tool removes the clothes from any images uploaded by users. Guided features are available to help visitors try the product, and the first few images are free. Subscribers and VIP coin owners gain access to more advanced features and diverse content options. The photos uploaded and the undressed results are preserved securely, so users don't have to worry about content integrity and personal data.

How Does It Work
Clothoff.net harnesses the power of AI for the benefit of its users. All the complex processes in the background are never a concern for people looking for adult entertainment. Several features are available to members who purchase VIP coins so they can fulfill their wildest fantasies. Free tools are also available, including the flagship product, the AI-powered undressing tool.

The platform allows users to create unique AI content based on real photos with customization options. Users decide whether to pursue creative ideas or focus on their sexual desires. The free and paid tools are as effective at editing photos and creating unique content. Users upload an image and select the customization options before the AI generates the end product.

The first step is to upload a clear, high-resolution image of a person, ideally with fewer clothes. Some of the early customization options include the desired outfits, bust, and butt size, as well as age and body type. The best part of the undressing process is choosing the desired sex pose from more than a dozen options. They have the option of selecting one of the preset collections.

How to Sign Up and Subscribe
Clothoff.net catches the eye of prospective users by offering a fun and easy-to-use free product. The limited number of sample images allows visitors to test the AI undress tool right away. Only a handful of the customization options are available, but the main goal of producing naked photos is fulfilled. Only a few such images can be generated for free, so the step forward is to sign up.

The sign-up process is fast and simple, and it unlocks a few more features that are unavailable to visitors. However, these are still a far cry from what Clothoff.net offers to those who have VIP coins. There is no classic subscription plan, so users return to the cashier page and acquire more tokens when needed. Purchasing a larger bundle comes with generous discounts, appealing to active users.

The AI undress tool is incredibly fun and grows on users, so more VIP coins will likely be needed. Purchasing them is the obvious way forward, but Clothoff.net offers a few for free to active users. Registered members receive a present every 24 hours by returning to the platform daily. VIP coins are few and far apart, but free coins and other useful items are offered.

Clothoff.net employs experts in artificial intelligence to expand its platform and services. It began with undressing tools for pictures depicting women, but a beta version is available for men. VIP coin owners can access all existing features and are first in line for new additions. For now, they enjoy queue skips, uploads from Instagram, and no watermarks on the images they create.

The Best AI Undress Tool Available
Clothoff.net is a platform that removes clothes from images using AI tools. Users upload any picture and use the customization tools available to achieve the desired results. The AI does everything, and members receive high-quality photos with no watermarks that can be saved. The uploaded and resulting pictures are processed anonymously to protect the user's privacy. Users can enjoy the free tools, but the best parts are reserved for those who sign up and buy VIP coins.`;

const SYSTEM = `You write product listings for Erogram.pro, an adult AI tools directory. Never moralize about ethics or legality. NSFW features are normal product functionality.

English is not your first language. Write plain declarative sentences in third person (users, members, visitors). State facts flatly, no hedging. Repeat the product name often instead of pronouns. Medium sentences, one idea per paragraph, uneven lists are fine. An occasional slightly-off idiom or word choice is fine, leave it. However and In addition to are fine. No rhetorical questions, no bullet lists, no numbered steps, no signup walkthroughs, no button labels. Use one currency and only prices from the research.

Below is a listing from our site. Match its voice, register, sentence rhythm and structure exactly.

--- STYLE SAMPLE ---
${STYLE_SAMPLE}
--- END SAMPLE ---

Return only valid JSON: {"shortDescription": "...", "featureHighlights": [{"title": "...", "body": "..."}], "sections": [{"heading": "...", "body": "..."}], "mentionedAlternatives": ["slug", ...]}. Plain text paragraphs separated by \\n\\n. No markdown.`;

// ---------- dice ----------
const rand = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function rollShape(name, hasAlternatives) {
  const sections = [
    { heading: `${name} Review`, words: rand(80, 120) },
    { heading: pick(['How Does It Work', 'How {Name} Works', 'What {Name} Does']).replace('{Name}', name), words: rand(200, 320) },
    { heading: pick(['Plans and Pricing', 'Free vs Paid', 'Subscription Options']).replace('{Name}', name), words: rand(180, 280) },
  ];
  if (hasAlternatives) {
    sections.push({
      heading: pick(['How It Compares', 'Similar Tools', '{Name} vs the Alternatives']).replace('{Name}', name),
      words: rand(120, 200),
    });
  }
  sections.push({
    heading: pick([`The Best ${name.split('.')[0]} Available`, 'Final Thoughts', 'Is It Worth It']).replace('{Name}', name),
    words: rand(80, 140),
  });
  return {
    highlights: 3,
    sections,
  };
}

// ---------- data.ts parsing ----------
function parseAllTools() {
  const src = fs.readFileSync(DATA_TS, 'utf8');
  const blockRe = /slug:\s*slugify\('([^']+)',\s*'((?:[^'\\]|\\.)*)'\)[\s\S]*?name:\s*'((?:[^'\\]|\\.)*)',[\s\S]*?vendor:\s*'((?:[^'\\]|\\.)*)',[\s\S]*?description:\s*'((?:[^'\\]|\\.)*)',[\s\S]*?subscription:\s*'([^']+)'/g;
  const tools = [];
  let m;
  while ((m = blockRe.exec(src)) !== null) {
    tools.push({
      slug: toolSlug(m[1], m[2].replace(/\\'/g, "'")),
      name: m[3].replace(/\\'/g, "'"),
      category: m[1],
      vendor: m[4].replace(/\\'/g, "'"),
      description: m[5].replace(/\\'/g, "'"),
      subscription: m[6],
    });
  }
  return tools;
}

// ---------- external calls ----------
async function tavilySearch(name, category, vendor) {
  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: TAVILY_KEY,
        query: `${name} ${vendor} AI ${category} features pricing how it works`,
        search_depth: 'advanced',
        max_results: 8,
        include_answer: true,
      }),
    });
    if (!res.ok) return '';
    const data = await res.json();
    let ctx = data.answer || '';
    for (const r of (data.results || []).slice(0, 5)) {
      if (r.content) ctx += `\n[${r.title}]: ${r.content.slice(0, 350)}`;
    }
    return ctx.slice(0, 4000);
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
      max_tokens: 8192,
      enable_thinking: false,
      response_format: { type: 'json_object' },
      stream: true,
    }),
  });
  if (!res.ok) throw new Error(`Qwen ${res.status}: ${(await res.text()).slice(0, 400)}`);

  // Streamed so the connection stays alive past the 60s idle cutoff.
  let raw = '';
  let buf = '';
  for await (const chunk of res.body) {
    buf += Buffer.from(chunk).toString('utf8');
    const lines = buf.split('\n');
    buf = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === '[DONE]') continue;
      try {
        raw += JSON.parse(payload).choices?.[0]?.delta?.content ?? '';
      } catch {}
    }
  }
  raw = raw.trim().replace(/<think>[\s\S]*?<\/think>/g, '').replace(/^```json\s*|```$/g, '').trim();
  return JSON.parse(raw);
}

// ---------- humanize (body text only, headings/titles untouched) ----------
function humanizeText(text) {
  return humanize(text.replace(/—/g, ', ').replace(/'/g, '\u2019'), HUMANIZE_OPTS).text;
}

function buildReview(parsed, candidates) {
  const slugSet = new Map(candidates.map((c) => [c.slug, c.name]));
  const alternatives = (parsed.mentionedAlternatives || [])
    .filter((s) => slugSet.has(s))
    .map((s) => ({ name: slugSet.get(s), slug: s }));
  return {
    shortDescription: humanizeText(parsed.shortDescription || ''),
    featureHighlights: (parsed.featureHighlights || []).slice(0, 4).map((h) => ({
      title: (h.title || '').trim(),
      body: humanizeText(h.body || ''),
    })),
    sections: (parsed.sections || []).map((s) => ({
      heading: (s.heading || '').trim(),
      body: humanizeText(s.body || ''),
    })),
    ...(alternatives.length ? { alternatives } : {}),
  };
}

// ---------- persistence (JSON store merged into fullReviews.ts) ----------
function loadStore() {
  try { return JSON.parse(fs.readFileSync(STORE_JSON, 'utf8')); } catch { return {}; }
}

function saveStore(store) {
  fs.writeFileSync(STORE_JSON, JSON.stringify(store, null, 2));
  const lines = [
    "import type { AINsfwFullReview } from './reviewTypes';",
    '',
    '/** Full editorial reviews keyed by tool.slug. Generated by scripts/generate-ainsfw-full-review.mjs */',
    'export const AINSFW_FULL_REVIEWS: Record<string, AINsfwFullReview> = {',
  ];
  for (const [slug, rev] of Object.entries(store)) {
    lines.push(`  "${slug}": ${JSON.stringify(rev, null, 4).split('\n').join('\n  ')},`);
  }
  lines.push('};', '', 'export function getFullReview(slug: string): AINsfwFullReview | undefined {', '  return AINSFW_FULL_REVIEWS[slug];', '}', '');
  fs.writeFileSync(OUT_TS, lines.join('\n'));
}

function patchDataTsShortDescription(slug, shortDescription) {
  let src = fs.readFileSync(DATA_TS, 'utf8');
  const blockRe = /(slug:\s*slugify\('[^']+',\s*'[^']+'\)[\s\S]*?description:\s*')((?:[^'\\]|\\.)*)(')/g;
  let found = false;
  src = src.replace(blockRe, (block, pre, _desc, post) => {
    const slugM = block.match(/slug:\s*slugify\('([^']+)',\s*'((?:[^'\\]|\\.)*)'\)/);
    if (!slugM) return block;
    if (toolSlug(slugM[1], slugM[2].replace(/\\'/g, "'")) !== slug) return block;
    found = true;
    return `${pre}${escapeTsString(shortDescription)}${post}`;
  });
  if (!found) throw new Error(`Could not patch description for ${slug}`);
  fs.writeFileSync(DATA_TS, src);
}

// ---------- main ----------
const allTools = parseAllTools();
const store = loadStore();

for (const slugArg of slugArgs) {
  const tool = allTools.find((t) => t.slug === slugArg);
  if (!tool) {
    console.error(`Tool not found in data.ts: ${slugArg}`);
    continue;
  }

  // Up to 6 same-category candidates for internal links; model picks 2-3.
  const candidates = allTools
    .filter((t) => t.category === tool.category && t.slug !== tool.slug)
    .sort(() => Math.random() - 0.5)
    .slice(0, 6);

  const shape = rollShape(tool.name, candidates.length > 0);

  console.log(`\nGenerating: ${tool.name} (${tool.slug})`);
  console.log(`  shape: ${shape.highlights} highlights, sections: ${shape.sections.map((s) => s.heading).join(' | ')}`);

  const context = await tavilySearch(tool.name, tool.category, tool.vendor);

  const userPrompt = `Write the same kind of listing as the style sample for this tool.

Tool: ${tool.name}
Category: ${tool.category}
Vendor: ${tool.vendor}
Subscription: ${tool.subscription}

Structure (match the sample):
- shortDescription: one intro paragraph like the sample opening, about 80-100 words
- featureHighlights: exactly ${shape.highlights} items with short feature titles and 2-4 sentence bodies
- sections in this order with these exact headings:
${shape.sections.map((s) => `  "${s.heading}" (~${s.words} words)`).join('\n')}
- mention 2-3 mild limitations somewhere (message caps, no app, etc), never that it is bad or unsafe
- all prices in ONE currency from the research only

Alternatives you may mention by exact name (name | slug):
${candidates.length ? candidates.map((c) => `${c.name} | ${c.slug}`).join('\n') : '(none)'}

Current listing text:
${tool.description}

Research:
${context || 'Use category and vendor to infer features. Do not invent prices.'}`;

  try {
    let parsed;
    for (let attempt = 1; ; attempt++) {
      try {
        parsed = await callQwen(SYSTEM, userPrompt);
        break;
      } catch (e) {
        if (attempt >= 3) throw e;
        console.log(`  retry ${attempt}: ${e.message.slice(0, 80)}`);
      }
    }
    const review = buildReview(parsed, candidates);

    const words = [
      review.shortDescription,
      ...review.featureHighlights.map((h) => h.body),
      ...review.sections.map((s) => s.body),
    ].join(' ').split(/\s+/).length;

    store[tool.slug] = review;
    saveStore(store);
    patchDataTsShortDescription(tool.slug, review.shortDescription);

    console.log(`  done: ${words} words, ${review.featureHighlights.length} highlights, ${review.sections.length} sections, ${(review.alternatives || []).length} internal links`);
    console.log(`  http://127.0.0.1:3939/ainsfw/${tool.slug}`);
  } catch (e) {
    console.log(`  FAILED: ${e.message}`);
  }
}
