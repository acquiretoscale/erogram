#!/usr/bin/env node
/**
 * Internal link opportunity analysis for AI NSFW tools.
 * Run: node scripts/ainsfw-internal-link-analysis.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

// --- Parse data.ts (extract tools via regex) ---
const dataTs = fs.readFileSync(path.join(ROOT, 'app/ainsfw/data.ts'), 'utf8');

function extractTools(src) {
  const tools = [];
  // Match each tool object block
  const blocks = src.match(/\{\s*\n\s*slug:[\s\S]*?\n\s*\},?\n/g) || [];
  for (const block of blocks) {
    const slugM = block.match(/slug:\s*(?:slugify\([^)]+\)|'([^']+)'|"([^"]+)")/);
    const nameM = block.match(/name:\s*'([^']+)'/);
    const catM = block.match(/category:\s*'([^']+)'/);
    const descM = block.match(/description:\s*'((?:\\'|[^'])*)'/);
    if (!nameM || !catM) continue;
    let slug = slugM?.[1] || slugM?.[2];
    if (!slug && slugM?.[0]?.includes('slugify')) {
      const sf = block.match(/slugify\('([^']+)',\s*'([^']+)'\)/);
      if (sf) {
        const cat = sf[1].toLowerCase().replace(/\s+/g, '-');
        const n = sf[2].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        slug = `${n}-${cat}`;
      }
    }
    if (!slug) continue;
    tools.push({
      slug,
      name: nameM[1],
      category: catM[1],
      description: descM ? descM[1].replace(/\\'/g, "'") : '',
    });
  }
  return tools;
}

const tools = extractTools(dataTs);

// --- Parse fullReviews.ts ---
const reviewsTs = fs.readFileSync(path.join(ROOT, 'app/ainsfw/fullReviews.ts'), 'utf8');
const reviewTexts = {};
const reviewBlocks = reviewsTs.matchAll(/"([^"]+)":\s*\{([\s\S]*?)\n  \},/g);
for (const m of reviewBlocks) {
  const slug = m[1];
  const body = m[2];
  const texts = [];
  const strMatches = body.matchAll(/"(?:shortDescription|body|title)":\s*"((?:\\"|[^"])*)"/g);
  for (const sm of strMatches) texts.push(sm[1].replace(/\\"/g, '"'));
  reviewTexts[slug] = texts.join(' ');
}

// Merge text per tool
const toolTexts = tools.map((t) => {
  const review = reviewTexts[t.slug] || '';
  const tags = [];
  const tagM = dataTs.match(new RegExp(`slug: slugify\\('${t.category.replace(/'/g, "\\'")}', '${t.name.replace(/'/g, "\\'")}'\\)[\\s\\S]*?tags:\\s*\\[([^\\]]+)\\]`));
  const fullText = [t.description, review].filter(Boolean).join(' ');
  return { ...t, fullText, hasFullReview: !!reviewTexts[t.slug] };
});

// --- Valid targets ---
const CATEGORY_SLUGS = {
  'ai-girlfriend': '/ainsfw/ai-girlfriend',
  'undress-ai': '/ainsfw/undress-ai',
  'ai-chat': '/ainsfw/ai-chat',
  'ai-image': '/ainsfw/ai-image',
  'ai-roleplay': '/ainsfw/ai-roleplay',
  'adult-games': '/ainsfw/adult-games',
};

// Parse groups constants
const groupsConst = fs.readFileSync(path.join(ROOT, 'app/groups/constants.ts'), 'utf8');
const allCategories = [...groupsConst.matchAll(/'([^']+)'/g)].map((m) => m[1]).filter((c) => c !== 'All');
function catSlug(c) {
  return c.toLowerCase().replace(/&/g, ' ').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}
const validGroupCatSlugs = new Set(allCategories.map(catSlug));
const validBestTelegramSlugs = validGroupCatSlugs; // same source

// Tag registry slugs (parse GROUP_LABEL_ALIASES + visible categories)
const tagRegistry = fs.readFileSync(path.join(ROOT, 'lib/tags/registry.ts'), 'utf8');
const tagSlugs = new Set([...tagRegistry.matchAll(/'([a-z0-9-]+)':\s*\[/g)].map((m) => m[1]));
// Add slugified visible categories
for (const c of allCategories) tagSlugs.add(catSlug(c));

// Blog article slugs from scripts (known published)
const knownBlogSlugs = [
  'ai-girlfriend-chat-changing-relationships-2026',
  'creating-ai-girlfriends-guide-2026',
  'lovescape-is-the-future-of-ai-companions',
  'top-5-best-nsfw-telegram-bots-in-2025-ai-roleplay-anonymous-chat',
  'best-telegram-nsfw-groups-2025-updated-list',
  'best-telegram-nsfw-channels-2025-top-verified-adult-groups',
  'telegram-nsfw-groups-how-to-find-active-real-safe-channels-in-2025',
  'why-telegram-became-the-1-hub-for-nsfw-communities-in-2025',
  'is-telegram-safe-for-nsfw-2025-guide',
  'how-to-enable-nsfw-on-telegram-nicegram-fix-2025',
  'top-20-nsfw-telegram-groups-in-2025-ultimate-guide-to-adult-content-channels',
];

// --- Keyword patterns ---
const PATTERNS = [
  // AI NSFW categories (high)
  { pattern: /\bai girlfriend\b|\bvirtual girlfriend\b|\bai companion\b|\bai boyfriend\b|\bvirtual companion\b|\bai waifu\b|\bvirtual relationship\b/i, url: '/ainsfw/ai-girlfriend', priority: 'high', label: 'AI girlfriend / companion' },
  { pattern: /\bundress\b|\bdeepfake\b|\bnudif/i, url: '/ainsfw/undress-ai', priority: 'high', label: 'undress / deepfake / nudify' },
  { pattern: /\bai chat\b|\bchatbot\b|\bai chatbot\b|\btext conversation\b|\bchat experience\b/i, url: '/ainsfw/ai-chat', priority: 'high', label: 'AI chat / chatbot' },
  { pattern: /\bai image\b|\bimage generat|\bphoto generat|\bvisual model|\bai-generated image|\btext-to-image\b|\bstable diffusion\b|\bsdxl\b/i, url: '/ainsfw/ai-image', priority: 'high', label: 'AI image generation' },
  { pattern: /\broleplay\b|\brole play\b|\brole-play\b|\bnsfw roleplay\b|\badult-themed roleplay\b/i, url: '/ainsfw/ai-roleplay', priority: 'high', label: 'AI roleplay' },
  { pattern: /\badult game\b|\bvirtual lust\b|\b3d game\b|\badult gaming\b/i, url: '/ainsfw/adult-games', priority: 'medium', label: 'adult games' },
  { pattern: /\bface swap\b|\bfaceswap\b|\bswap faces\b/i, url: '/ainsfw/ai-image', priority: 'medium', label: 'face swap' },
  { pattern: /\bvoice (?:call|message|reply|generation)\b|\bvoice chat\b|\bspeech\b/i, url: '/ainsfw/ai-girlfriend', priority: 'medium', label: 'voice features' },
  { pattern: /\bnsfw\b|\badult content\b|\badult-themed\b|\bexplicit\b|\buncensored\b|\bfor adults\b|\b18\+\b/i, url: '/ainsfw', priority: 'high', label: 'NSFW / adult content' },
  { pattern: /\bai nsfw\b|\bnsfw ai\b|\bai tools\b|\bai tool\b/i, url: '/ainsfw', priority: 'high', label: 'AI NSFW hub' },

  // OnlyFans / creators
  { pattern: /\bonlyfans\b|\bonly fans\b|\bcreator platform\b|\bfansly\b|\bpatreon\b/i, url: '/onlyfanssearch', priority: 'medium', label: 'OnlyFans / creators' },

  // Telegram / groups
  { pattern: /\btelegram\b|\btelegram group\b|\btelegram channel\b|\btelegram bot\b/i, url: '/groups', priority: 'high', label: 'Telegram / groups hub' },
  { pattern: /\bnsfw telegram\b|\btelegram nsfw\b|\btelegram-porn\b|\bnsfw-telegram\b/i, url: '/best-telegram-groups/ai-nsfw', priority: 'high', label: 'NSFW Telegram category' },
  { pattern: /\bhentai\b|\banime-style\b|\banime character\b|\banime still\b|\banime avatar\b/i, url: '/best-telegram-groups/hentai', priority: 'medium', label: 'hentai / anime' },
  { pattern: /\bcosplay\b/i, url: '/best-telegram-groups/cosplay', priority: 'low', label: 'cosplay' },
  { pattern: /\bfurry\b|\byiff\b/i, url: '/best-telegram-groups/furry', priority: 'low', label: 'furry' },
  { pattern: /\broleplay\b.*\bgroup\b|\bgroup.*\broleplay\b/i, url: '/best-telegram-groups/roleplay', priority: 'low', label: 'roleplay groups' },

  // Countries (groups tag pages)
  { pattern: /\bspain\b|\bspanish\b/i, url: '/groups/tag/spain', priority: 'low', label: 'Spain' },
  { pattern: /\bgermany\b|\bgerman\b/i, url: '/groups/tag/germany', priority: 'low', label: 'Germany' },
  { pattern: /\bfrance\b|\bfrench\b/i, url: '/groups/tag/france', priority: 'low', label: 'France' },
  { pattern: /\bbrazil\b|\bbrazilian\b/i, url: '/groups/tag/brazil', priority: 'low', label: 'Brazil' },
  { pattern: /\bjapan\b|\bjapanese\b|\bjav\b/i, url: '/groups/tag/japan', priority: 'low', label: 'Japan' },
  { pattern: /\bindia\b|\bindian\b/i, url: '/groups/tag/india', priority: 'low', label: 'India' },
  { pattern: /\buk\b|\bbritish\b|\bunited kingdom\b/i, url: '/groups/tag/uk', priority: 'low', label: 'UK' },
  { pattern: /\busa\b|\bamerican\b|\bunited states\b/i, url: '/groups/tag/usa', priority: 'low', label: 'USA' },
  { pattern: /\bcolombia\b|\bcolombian\b/i, url: '/groups/tag/colombia', priority: 'low', label: 'Colombia' },
  { pattern: /\bukraine\b|\bukrainian\b/i, url: '/groups/tag/ukraine', priority: 'low', label: 'Ukraine' },
  { pattern: /\bitaly\b|\bitalian\b/i, url: '/groups/tag/italy', priority: 'low', label: 'Italy' },

  // Group categories
  { pattern: /\bamateur\b/i, url: '/best-telegram-groups/amateur', priority: 'low', label: 'amateur category' },
  { pattern: /\bmilf\b/i, url: '/best-telegram-groups/milf', priority: 'low', label: 'MILF category' },
  { pattern: /\blatina\b/i, url: '/best-telegram-groups/latina', priority: 'low', label: 'Latina category' },
  { pattern: /\basian\b/i, url: '/best-telegram-groups/asian', priority: 'low', label: 'Asian category' },
  { pattern: /\bbdsm\b/i, url: '/best-telegram-groups/bdsm', priority: 'low', label: 'BDSM category' },
  { pattern: /\bfemdom\b/i, url: '/best-telegram-groups/femdom', priority: 'low', label: 'Femdom category' },
  { pattern: /\bfeet\b|\bfoot fetish\b/i, url: '/best-telegram-groups/feet', priority: 'low', label: 'Feet category' },
  { pattern: /\blesbian\b/i, url: '/best-telegram-groups/lesbian', priority: 'low', label: 'Lesbian category' },
  { pattern: /\bebony\b/i, url: '/best-telegram-groups/ebony', priority: 'low', label: 'Ebony category' },
  { pattern: /\bpetite\b/i, url: '/best-telegram-groups/petite', priority: 'low', label: 'Petite category' },
  { pattern: /\bdiscord\b/i, url: '/best-telegram-groups/discord', priority: 'low', label: 'Discord category' },
  { pattern: /\breddit\b/i, url: '/best-telegram-groups/reddit', priority: 'low', label: 'Reddit category' },
  { pattern: /\bsnapchat\b/i, url: '/best-telegram-groups/snapchat', priority: 'low', label: 'Snapchat category' },
  { pattern: /\btiktok\b/i, url: '/best-telegram-groups/tiktok', priority: 'low', label: 'TikTok category' },
  { pattern: /\blive cam\b|\blivecam\b|\bcam girl\b/i, url: '/best-telegram-groups/live-cam', priority: 'low', label: 'Live cam category' },
  { pattern: /\badult games\b|\badult game category\b/i, url: '/best-telegram-groups/adult-games', priority: 'low', label: 'Adult games groups' },

  // Blog cross-links
  { pattern: /\bai girlfriend chat\b|\bgirlfriend chatbot\b/i, url: '/blog/ai-girlfriend-chat-changing-relationships-2026', priority: 'medium', label: 'AI girlfriend chat article' },
  { pattern: /\bcreating ai girlfriend\b|\bbuild.*ai girlfriend\b/i, url: '/blog/creating-ai-girlfriends-guide-2026', priority: 'medium', label: 'Creating AI girlfriends article' },
  { pattern: /\btelegram bot\b|\bnsfw bot\b|\bai roleplay.*bot\b/i, url: '/blog/top-5-best-nsfw-telegram-bots-in-2025-ai-roleplay-anonymous-chat', priority: 'medium', label: 'Telegram bots article' },
  { pattern: /\bfind.*telegram.*group\b|\btelegram.*safe\b|\bspot fake.*telegram\b/i, url: '/blog/telegram-nsfw-groups-how-to-find-active-real-safe-channels-in-2025', priority: 'low', label: 'Find Telegram groups article' },

  // OnlyFans categories (onlyfanssearch)
  { pattern: /\bblonde\b/i, url: '/onlyfanssearch/blonde', priority: 'low', label: 'Blonde creators' },
  { pattern: /\bteen\b|\b18\+\b/i, url: '/onlyfanssearch/teen', priority: 'low', label: 'Teen creators' },
  { pattern: /\bgoth\b|\balt girl\b/i, url: '/onlyfanssearch/goth', priority: 'low', label: 'Goth creators' },
  { pattern: /\bbig ass\b|\bbig boobs\b|\bbig tits\b/i, url: '/onlyfanssearch/big-ass', priority: 'low', label: 'Body type creators' },
];

function urlExists(url) {
  if (url === '/ainsfw' || url === '/groups' || url === '/onlyfanssearch') return true;
  if (url.startsWith('/ainsfw/')) {
    const slug = url.replace('/ainsfw/', '');
    return slug in CATEGORY_SLUGS || tools.some((t) => t.slug === slug);
  }
  if (url.startsWith('/best-telegram-groups/')) {
    const slug = url.replace('/best-telegram-groups/', '');
    return validBestTelegramSlugs.has(slug);
  }
  if (url.startsWith('/groups/tag/')) {
    const slug = url.replace('/groups/tag/', '');
    return tagSlugs.has(slug);
  }
  if (url.startsWith('/onlyfanssearch/')) {
    return true; // OF categories exist
  }
  if (url.startsWith('/blog/')) {
    const slug = url.replace('/blog/', '');
    return knownBlogSlugs.includes(slug);
  }
  return false;
}

// --- Run analysis ---
const patternResults = PATTERNS.map((p) => {
  const matched = toolTexts.filter((t) => p.pattern.test(t.fullText));
  const urlValid = urlExists(p.url);
  return {
    pattern: p.label,
    regex: p.pattern.toString(),
    suggestedUrl: p.url,
    urlExists: urlValid,
    matchCount: matched.length,
    exampleTools: matched.slice(0, 3).map((t) => t.slug),
    priority: p.priority,
  };
}).sort((a, b) => b.matchCount - a.matchCount);

// Per-tool phrase count (unique patterns matched)
const toolScores = toolTexts.map((t) => {
  const matchedPatterns = PATTERNS.filter((p) => p.pattern.test(t.fullText));
  return {
    slug: t.slug,
    name: t.name,
    category: t.category,
    hasFullReview: t.hasFullReview,
    textLength: t.fullText.length,
    patternCount: matchedPatterns.length,
    patterns: matchedPatterns.map((p) => p.label),
    highPriorityCount: matchedPatterns.filter((p) => p.priority === 'high').length,
  };
}).sort((a, b) => b.patternCount - a.patternCount || b.textLength - a.textLength);

// Category breakdown
const byCategory = {};
for (const t of tools) {
  byCategory[t.category] = (byCategory[t.category] || 0) + 1;
}

// Cross-category link opportunities (tool in cat A mentions cat B keywords)
const crossCat = {};
for (const t of toolTexts) {
  for (const p of PATTERNS.filter((x) => x.url.startsWith('/ainsfw/') && x.url !== '/ainsfw')) {
    const targetCat = Object.entries(CATEGORY_SLUGS).find(([, v]) => p.url === `/ainsfw/${Object.keys(CATEGORY_SLUGS).find((k) => CATEGORY_SLUGS[k] === p.url)}`);
    if (p.pattern.test(t.fullText)) {
      const targetSlug = p.url.replace('/ainsfw/', '');
      const targetCatName = CATEGORY_SLUGS[targetSlug];
      if (targetCatName && targetCatName !== t.category) {
        const key = `${t.category} → ${targetCatName}`;
        crossCat[key] = (crossCat[key] || 0) + 1;
      }
    }
  }
}

const missingTargets = [...new Set(patternResults.filter((r) => !r.urlExists && r.matchCount > 0).map((r) => r.suggestedUrl))];

const output = {
  summary: {
    totalTools: tools.length,
    toolsWithFullReview: Object.keys(reviewTexts).length,
    totalPatterns: PATTERNS.length,
    patternsWithMatches: patternResults.filter((r) => r.matchCount > 0).length,
    missingTargetUrls: missingTargets,
    toolsByCategory: byCategory,
  },
  keywordPatterns: patternResults,
  top20ToolsByLinkOpportunity: toolScores.slice(0, 20),
  crossCategoryOpportunities: Object.entries(crossCat).sort((a, b) => b[1] - a[1]),
  invalidTargetsDetail: patternResults.filter((r) => !r.urlExists && r.matchCount > 0),
};

console.log(JSON.stringify(output, null, 2));
