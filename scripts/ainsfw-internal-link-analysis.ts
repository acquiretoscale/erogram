#!/usr/bin/env npx tsx
/**
 * Full internal link opportunity analysis for AI NSFW tools.
 */
import { AI_NSFW_TOOLS, CATEGORY_SLUGS, categoryToSlug } from '../app/ainsfw/data';
import { AINSFW_FULL_REVIEWS } from '../app/ainsfw/fullReviews';
import { categorySlug, allCategories, allCountries } from '../app/groups/constants';
import { getAllTagDefinitions } from '../lib/tags/registry';
import { BLOG_CATEGORIES } from '../lib/blog/categories';
import fs from 'fs';
import path from 'path';

function flattenReview(slug: string): string {
  const r = AINSFW_FULL_REVIEWS[slug];
  if (!r) return '';
  const parts: string[] = [r.shortDescription];
  for (const f of r.featureHighlights || []) parts.push(f.title, f.body);
  for (const s of r.sections || []) parts.push(s.heading, s.body);
  return parts.join(' ');
}

function buildToolText(t: typeof AI_NSFW_TOOLS[0]): string {
  return [t.description, flattenReview(t.slug), ...(t.tags || [])].filter(Boolean).join(' ');
}

const toolTexts = AI_NSFW_TOOLS.map((t) => ({
  slug: t.slug,
  name: t.name,
  category: t.category,
  catSlug: categoryToSlug(t.category),
  hasFullReview: !!AINSFW_FULL_REVIEWS[t.slug],
  fullText: buildToolText(t),
  tags: t.tags || [],
}));

const tagDefs = getAllTagDefinitions();
const validTagSlugs = new Set(tagDefs.map((t) => t.slug));
const validBestTelegramSlugs = new Set(allCategories.map(categorySlug));
const validCountrySlugs = new Set(allCountries.filter((c) => c !== 'All').map((c) => categorySlug(c)));

// Known blog slugs from scripts (may not all be live in DB)
const knownBlogSlugs = new Set([
  'ai-girlfriend-chat-changing-relationships-2026',
  'ai-girlfriend-chat-changing-relationships',
  'ai-girlfriend-chatbots-vs-dating-apps',
  'creating-ai-girlfriends-guide-2026',
  'why-millions-are-switching-to-ai-companionship-lately',
  'lovescape-is-the-future-of-ai-companions',
  'top-5-best-nsfw-telegram-bots-in-2025-ai-roleplay-anonymous-chat',
  'best-telegram-nsfw-groups-2025-updated-list',
  'best-telegram-nsfw-channels-2025-top-verified-adult-groups',
  'telegram-nsfw-groups-how-to-find-active-real-safe-channels-in-2025',
  'why-telegram-became-the-1-hub-for-nsfw-communities-in-2025',
  'is-telegram-safe-for-nsfw-2025-guide',
  'how-to-enable-nsfw-on-telegram-nicegram-fix-2025',
  'top-20-nsfw-telegram-groups-in-2025-ultimate-guide-to-adult-content-channels',
]);

const toolSlugSet = new Set(toolTexts.map((t) => t.slug));

interface PatternDef {
  label: string;
  pattern: RegExp;
  url: string;
  priority: 'high' | 'medium' | 'low';
}

const PATTERNS: PatternDef[] = [
  // === AI NSFW hub & categories ===
  { label: 'AI NSFW hub (general)', pattern: /\b(?:ai nsfw|nsfw ai|ai tools?|ai adult tools?)\b/i, url: '/ainsfw', priority: 'high' },
  { label: 'NSFW / adult / explicit / uncensored', pattern: /\b(?:nsfw|adult content|adult-themed|explicit|uncensored|for adults|18\+)\b/i, url: '/ainsfw', priority: 'high' },
  { label: 'AI girlfriend / companion / virtual girlfriend', pattern: /\b(?:ai girlfriend|virtual girlfriend|ai companion|ai boyfriend|virtual companion|ai waifu|virtual relationship|digital companion)\b/i, url: '/ainsfw/ai-girlfriend', priority: 'high' },
  { label: 'undress / deepfake / nudify', pattern: /\b(?:undress|deepfake|nudif\w*)\b/i, url: '/ainsfw/undress-ai', priority: 'high' },
  { label: 'AI chat / chatbot', pattern: /\b(?:ai chat|chatbot|ai chatbot|text conversation|chat experience|conversational ai)\b/i, url: '/ainsfw/ai-chat', priority: 'high' },
  { label: 'AI image / photo generation', pattern: /\b(?:ai image|image generat\w*|photo generat\w*|visual model|ai-generated image|text-to-image|stable diffusion|sdxl|render engine)\b/i, url: '/ainsfw/ai-image', priority: 'high' },
  { label: 'AI roleplay', pattern: /\b(?:roleplay|role play|role-play|nsfw roleplay|adult-themed roleplay|interactive fiction)\b/i, url: '/ainsfw/ai-roleplay', priority: 'high' },
  { label: 'adult games / 3D game', pattern: /\b(?:adult game|virtual lust|3d game|adult gaming|interactive adult)\b/i, url: '/ainsfw/adult-games', priority: 'medium' },
  { label: 'face swap / faceswap', pattern: /\b(?:face swap|faceswap|swap faces)\b/i, url: '/ainsfw/ai-image', priority: 'medium' },
  { label: 'voice call / voice message', pattern: /\b(?:voice call|voice message|voice reply|voice generation|voice chat|spoken repl\w*)\b/i, url: '/ainsfw/ai-girlfriend', priority: 'medium' },
  { label: 'memory / remembers conversations', pattern: /\b(?:long-term memory|remembers (?:details|conversations|past)|memory feature|recall details)\b/i, url: '/ainsfw/ai-girlfriend', priority: 'medium' },
  { label: 'freemium / subscription pricing', pattern: /\b(?:freemium|subscription|paid plan|per month|\$\d+\.?\d*)\b/i, url: '/ainsfw', priority: 'low' },

  // === OnlyFans / creators ===
  { label: 'OnlyFans / Fansly / Patreon', pattern: /\b(?:onlyfans|only fans|fansly|patreon|creator platform)\b/i, url: '/onlyfanssearch', priority: 'medium' },
  { label: 'creators / content creators', pattern: /\b(?:content creator|adult creator|onlyfans creator)\b/i, url: '/onlyfanssearch', priority: 'low' },

  // === Telegram / groups ===
  { label: 'Telegram (general)', pattern: /\btelegram\b/i, url: '/groups', priority: 'high' },
  { label: 'Telegram group / channel / bot', pattern: /\b(?:telegram group|telegram channel|telegram bot|nsfw telegram|telegram nsfw)\b/i, url: '/best-telegram-groups/ai-nsfw', priority: 'high' },
  { label: 'hentai / anime-style', pattern: /\b(?:hentai|anime-style|anime character|anime still|anime avatar|anime girl)\b/i, url: '/best-telegram-groups/hentai', priority: 'medium' },
  { label: 'cosplay', pattern: /\bcosplay\b/i, url: '/best-telegram-groups/cosplay', priority: 'low' },
  { label: 'furry / yiff', pattern: /\b(?:furry|yiff)\b/i, url: '/best-telegram-groups/furry', priority: 'low' },
  { label: 'BDSM', pattern: /\bbdsm\b/i, url: '/best-telegram-groups/bdsm', priority: 'low' },
  { label: 'MILF', pattern: /\bmilf\b/i, url: '/best-telegram-groups/milf', priority: 'low' },
  { label: 'amateur', pattern: /\bamateur\b/i, url: '/best-telegram-groups/amateur', priority: 'low' },
  { label: 'latina', pattern: /\blatina\b/i, url: '/best-telegram-groups/latina', priority: 'low' },
  { label: 'asian', pattern: /\basian\b/i, url: '/best-telegram-groups/asian', priority: 'low' },
  { label: 'lesbian', pattern: /\blesbian\b/i, url: '/best-telegram-groups/lesbian', priority: 'low' },
  { label: 'feet / foot fetish', pattern: /\b(?:feet|foot fetish)\b/i, url: '/best-telegram-groups/feet', priority: 'low' },
  { label: 'Discord', pattern: /\bdiscord\b/i, url: '/best-telegram-groups/discord', priority: 'low' },
  { label: 'Reddit', pattern: /\breddit\b/i, url: '/best-telegram-groups/reddit', priority: 'low' },
  { label: 'Snapchat', pattern: /\bsnapchat\b/i, url: '/best-telegram-groups/snapchat', priority: 'low' },
  { label: 'TikTok', pattern: /\btiktok\b/i, url: '/best-telegram-groups/tiktok', priority: 'low' },
  { label: 'live cam', pattern: /\b(?:live cam|livecam|cam girl)\b/i, url: '/best-telegram-groups/live-cam', priority: 'low' },
  { label: 'roleplay (groups category)', pattern: /\b(?:roleplay group|group roleplay)\b/i, url: '/best-telegram-groups/roleplay', priority: 'low' },

  // === Tag pages (/tags/{slug}) ===
  { label: 'Spain / Spanish', pattern: /\b(?:spain|spanish)\b/i, url: '/tags/spain', priority: 'low' },
  { label: 'Germany / German', pattern: /\b(?:germany|german)\b/i, url: '/tags/germany', priority: 'low' },
  { label: 'France / French', pattern: /\b(?:france|french)\b/i, url: '/tags/france', priority: 'low' },
  { label: 'Brazil / Brazilian', pattern: /\b(?:brazil|brazilian)\b/i, url: '/tags/brazil', priority: 'low' },
  { label: 'Japan / Japanese / JAV', pattern: /\b(?:japan|japanese|jav)\b/i, url: '/tags/japan', priority: 'low' },
  { label: 'India / Indian', pattern: /\b(?:india|indian)\b/i, url: '/tags/india', priority: 'low' },
  { label: 'UK / British', pattern: /\b(?:\buk\b|british|united kingdom)\b/i, url: '/tags/uk', priority: 'low' },
  { label: 'USA / American', pattern: /\b(?:\busa\b|american|united states)\b/i, url: '/tags/usa', priority: 'low' },
  { label: 'AI NSFW tag (groups+creators)', pattern: /\b(?:ai nsfw|nsfw ai tools?)\b/i, url: '/tags/ai-nsfw', priority: 'high' },
  { label: 'OnlyFans tag', pattern: /\bonlyfans\b/i, url: '/tags/onlyfans', priority: 'medium' },

  // === Country group pages ===
  { label: 'Spain country groups', pattern: /\b(?:spain|spanish)\b/i, url: '/groups/country/spain', priority: 'low' },
  { label: 'Germany country groups', pattern: /\b(?:germany|german)\b/i, url: '/groups/country/germany', priority: 'low' },

  // === Blog ===
  { label: 'Blog: AI NSFW category hub', pattern: /\b(?:ai companion|ai girlfriend|undress ai|nsfw ai)\b/i, url: '/blog/ai-nsfw', priority: 'medium' },
  { label: 'Blog: AI girlfriend chat article', pattern: /\b(?:ai girlfriend chat|girlfriend chatbot|ai gf chat)\b/i, url: '/blog/ai-girlfriend-chat-changing-relationships-2026', priority: 'medium' },
  { label: 'Blog: creating AI girlfriends', pattern: /\b(?:creating ai girlfriend|build.*ai girlfriend|design.*ai girlfriend)\b/i, url: '/blog/creating-ai-girlfriends-guide-2026', priority: 'medium' },
  { label: 'Blog: Telegram bots article', pattern: /\b(?:telegram bot|nsfw bot|ai roleplay bot)\b/i, url: '/blog/top-5-best-nsfw-telegram-bots-in-2025-ai-roleplay-anonymous-chat', priority: 'medium' },
  { label: 'Blog: find Telegram groups', pattern: /\b(?:find.*telegram.*group|telegram.*safe|spot fake.*telegram)\b/i, url: '/blog/telegram-nsfw-groups-how-to-find-active-real-safe-channels-in-2025', priority: 'low' },
  { label: 'Blog: Telegram category hub', pattern: /\b(?:telegram group|telegram channel|nsfw telegram)\b/i, url: '/blog/telegram-groups-bots', priority: 'medium' },
  { label: 'Blog: OnlyFans creators hub', pattern: /\b(?:onlyfans|content creator|adult creator)\b/i, url: '/blog/onlyfans-creators', priority: 'low' },

  // === OnlyFans search categories ===
  { label: 'OF search: blonde', pattern: /\bblonde\b/i, url: '/onlyfanssearch/blonde', priority: 'low' },
  { label: 'OF search: teen', pattern: /\bteen\b/i, url: '/onlyfanssearch/teen', priority: 'low' },
  { label: 'OF search: goth', pattern: /\b(?:goth|alt girl)\b/i, url: '/onlyfanssearch/goth', priority: 'low' },
  { label: 'OF search: big ass/boobs', pattern: /\b(?:big ass|big boobs|big tits)\b/i, url: '/onlyfanssearch/big-ass', priority: 'low' },
  { label: 'OF search: asian', pattern: /\basian\b/i, url: '/onlyfanssearch/asian', priority: 'low' },
  { label: 'OF search: latina', pattern: /\blatina\b/i, url: '/onlyfanssearch/latina', priority: 'low' },
  { label: 'OF search: milf', pattern: /\bmilf\b/i, url: '/onlyfanssearch/milf', priority: 'low' },
];

function urlExists(url: string): boolean {
  if (['/ainsfw', '/groups', '/onlyfanssearch', '/blog'].includes(url)) return true;
  if (url.startsWith('/ainsfw/')) {
    const slug = url.slice('/ainsfw/'.length);
    return slug in CATEGORY_SLUGS || toolSlugSet.has(slug);
  }
  if (url.startsWith('/best-telegram-groups/')) {
    return validBestTelegramSlugs.has(url.slice('/best-telegram-groups/'.length));
  }
  if (url.startsWith('/tags/')) {
    return validTagSlugs.has(url.slice('/tags/'.length));
  }
  if (url.startsWith('/groups/country/')) {
    const c = url.slice('/groups/country/'.length);
    return validCountrySlugs.has(c) || allCountries.some((x) => categorySlug(x) === c);
  }
  if (url.startsWith('/onlyfanssearch/')) return true;
  if (url.startsWith('/blog/')) {
    const slug = url.slice('/blog/'.length);
    return knownBlogSlugs.has(slug) || BLOG_CATEGORIES.some((c) => c.slug === slug);
  }
  return false;
}

// Pattern results
const patternResults = PATTERNS.map((p) => {
  const matched = toolTexts.filter((t) => p.pattern.test(t.fullText));
  return {
    pattern: p.label,
    suggestedUrl: p.url,
    urlExists: urlExists(p.url),
    matchCount: matched.length,
    exampleTools: matched.slice(0, 3).map((t) => t.slug),
    priority: p.priority,
  };
}).sort((a, b) => b.matchCount - a.matchCount);

// Tool scores
const toolScores = toolTexts.map((t) => {
  const matched = PATTERNS.filter((p) => p.pattern.test(t.fullText));
  return {
    slug: t.slug,
    name: t.name,
    category: t.category,
    hasFullReview: t.hasFullReview,
    textLength: t.fullText.length,
    patternCount: matched.length,
    highPriorityCount: matched.filter((p) => p.priority === 'high').length,
    patterns: matched.map((p) => p.label),
  };
}).sort((a, b) => b.patternCount - a.patternCount || b.highPriorityCount - a.highPriorityCount);

// Cross-category (tool in cat A mentions keywords for cat B)
const crossCat: Record<string, number> = {};
for (const t of toolTexts) {
  for (const [catSlug, catName] of Object.entries(CATEGORY_SLUGS)) {
    if (t.category === catName) continue;
    const url = `/ainsfw/${catSlug}`;
    const patternsForCat = PATTERNS.filter((p) => p.url === url);
    if (patternsForCat.some((p) => p.pattern.test(t.fullText))) {
      const key = `${t.category} → ${catName}`;
      crossCat[key] = (crossCat[key] || 0) + 1;
    }
  }
}

// Tool-to-tool mentions (name appears in another tool's text)
const toolMentions: { from: string; to: string; toSlug: string }[] = [];
for (const t of toolTexts) {
  for (const other of toolTexts) {
    if (t.slug === other.slug) continue;
    const nameRe = new RegExp(`\\b${other.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (nameRe.test(t.fullText)) {
      toolMentions.push({ from: t.slug, to: other.name, toSlug: other.slug });
    }
  }
}

// Tag field link opportunities (tags match category slugs or hub terms)
const tagLinkOps: Record<string, { count: number; url: string; examples: string[] }> = {};
const tagPatterns: { tag: RegExp; url: string }[] = [
  { tag: /ai girlfriend/i, url: '/ainsfw/ai-girlfriend' },
  { tag: /ai chat/i, url: '/ainsfw/ai-chat' },
  { tag: /ai image/i, url: '/ainsfw/ai-image' },
  { tag: /ai roleplay/i, url: '/ainsfw/ai-roleplay' },
  { tag: /undress/i, url: '/ainsfw/undress-ai' },
  { tag: /ai nsfw/i, url: '/ainsfw' },
  { tag: /ai sexting/i, url: '/ainsfw/ai-girlfriend' },
  { tag: /ai companion/i, url: '/ainsfw/ai-girlfriend' },
  { tag: /face swap/i, url: '/ainsfw/ai-image' },
  { tag: /deepfake/i, url: '/ainsfw/undress-ai' },
];
for (const { tag, url } of tagPatterns) {
  const matched = toolTexts.filter((t) => t.tags.some((tg) => tag.test(tg)));
  if (matched.length) {
    tagLinkOps[tag.source] = { count: matched.length, url, examples: matched.slice(0, 3).map((t) => t.slug) };
  }
}

// Missing targets
const missingTargets = [...new Set(
  patternResults.filter((r) => !r.urlExists && r.matchCount > 0).map((r) => r.suggestedUrl)
)];

// Category counts
const byCategory: Record<string, number> = {};
for (const t of toolTexts) byCategory[t.category] = (byCategory[t.category] || 0) + 1;

const output = {
  summary: {
    totalTools: toolTexts.length,
    toolsWithFullReview: toolTexts.filter((t) => t.hasFullReview).length,
    fullReviewSlugs: Object.keys(AINSFW_FULL_REVIEWS),
    totalPatternsScanned: PATTERNS.length,
    patternsWithMatches: patternResults.filter((r) => r.matchCount > 0).length,
    toolsByCategory: byCategory,
    validAinsfwCategoryUrls: Object.keys(CATEGORY_SLUGS).map((s) => `/ainsfw/${s}`),
    validBlogCategoryHubs: BLOG_CATEGORIES.map((c) => `/blog/${c.slug}`),
    tagPageCount: validTagSlugs.size,
    missingTargetUrls: missingTargets,
    toolToToolMentions: toolMentions.length,
  },
  keywordPatterns: patternResults,
  tagFieldLinkOpportunities: tagLinkOps,
  top20ToolsByLinkOpportunity: toolScores.slice(0, 20),
  crossCategoryOpportunities: Object.entries(crossCat).sort((a, b) => b[1] - a[1]),
  toolToToolMentions: toolMentions.slice(0, 30),
  invalidTargetsDetail: patternResults.filter((r) => !r.urlExists && r.matchCount > 0),
  zeroMatchHighPriorityPatterns: patternResults.filter((r) => r.matchCount === 0 && r.priority === 'high'),
};

const outPath = path.join(process.cwd(), 'scripts/ainsfw-link-analysis-output.json');
fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
console.log(JSON.stringify(output, null, 2));
