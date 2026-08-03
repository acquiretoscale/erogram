import Link from 'next/link';
import type { ReactNode } from 'react';
import { AI_NSFW_TOOLS, categoryToSlug } from '@/app/ainsfw/data';
import { getTagDefinition } from '@/lib/tags/registry';
import { getAinsfwToolHref } from '@/lib/ainsfw/toolArticles';
import type { AINsfwReviewAlternative } from '@/app/ainsfw/reviewTypes';

type LinkRule = {
  pattern: RegExp;
  href: string;
};

const AINSFW = (category: string) => `/ainsfw/${categoryToSlug(category)}`;
const BLOG_CAT = (slug: string) => `/blog/category/${slug}`;
const BLOG = (slug: string) => `/blog/${slug}`;
const TAG = (slug: string) => `/tags/${slug}`;
const TG = (slug: string) => `/best-telegram-groups/${slug}`;

/** Regex rules — longest / most specific patterns first within each group. */
const INTERNAL_LINK_RULES: LinkRule[] = [
  // Named tool alternatives are injected separately (exact name match).

  // Telegram + blog (before bare "telegram")
  { pattern: /\b(?:telegram group|telegram channel|telegram bot|nsfw telegram|telegram nsfw)\b/i, href: TG('ai-nsfw') },
  { pattern: /\b(?:telegram bot|nsfw bot|ai roleplay bot)\b/i, href: BLOG('top-5-best-nsfw-telegram-bots-in-2025-ai-roleplay-anonymous-chat') },
  { pattern: /\b(?:find.*telegram.*group|spot fake.*telegram)\b/i, href: BLOG('telegram-nsfw-groups-how-to-find-active-real-safe-channels-in-2025') },

  // AI NSFW hub + categories
  { pattern: /\b(?:ai nsfw tools?|nsfw ai tools?|ai adult tools?)\b/i, href: '/ainsfw' },
  { pattern: /\b(?:virtual girlfriend|ai girlfriend|ai companion|ai boyfriend|virtual companion|ai waifu)\b/i, href: AINSFW('AI Companion') },
  { pattern: /\b(?:undress tools?|clothes remover|clothes changer|ai undresser|ai nudifier)\b/i, href: AINSFW('Undress AI') },
  { pattern: /\b(?:face swap|faceswap|swap faces)\b/i, href: AINSFW('AI NSFW Image Generator') },
  { pattern: /\b(?:ai image generator|ai image|image generator|photo generator|text-to-image|sdxl)\b/i, href: AINSFW('AI NSFW Image Generator') },
  { pattern: /\b(?:ai porn generator|ai generated porn|create ai porn|custom ai porn)\b/i, href: AINSFW('AI Porn Generator') },
  { pattern: /\b(?:ai chatbot|ai chat|chatbot platform|ai sexting)\b/i, href: AINSFW('AI Sexting / Chat') },
  { pattern: /\b(?:ai roleplay|nsfw roleplay|erotic roleplay|role-play)\b/i, href: AINSFW('AI NSFW Roleplay') },
  { pattern: /\b(?:adult games?|adult gaming|3d game)\b/i, href: AINSFW('Adult Games') },
  { pattern: /\b(?:undress|deepfake|nudify|nudif\w*)\b/i, href: AINSFW('Undress AI') },
  { pattern: /\broleplay\b/i, href: AINSFW('AI NSFW Roleplay') },
  { pattern: /\bchatbot\b/i, href: AINSFW('AI Sexting / Chat') },

  // Cross-ecosystem
  { pattern: /\b(?:onlyfans|only fans|fansly|patreon)\b/i, href: '/onlyfanssearch' },
  { pattern: /\b(?:content creator|adult creator|onlyfans creator)\b/i, href: '/onlyfanssearch' },
  { pattern: /\b(?:hentai|anime-style|anime character|anime girl)\b/i, href: TG('hentai') },
  { pattern: /\b(?:furry|yiff)\b/i, href: TG('furry') },
  { pattern: /\btelegram\b/i, href: '/groups' },
  { pattern: /\bdiscord\b/i, href: TG('discord') },
  { pattern: /\bcosplay\b/i, href: TG('cosplay') },
  { pattern: /\bbdsm\b/i, href: TG('bdsm') },
  { pattern: /\b(?:milf)\b/i, href: TAG('milf') },
  { pattern: /\b(?:amateur)\b/i, href: TG('amateur') },
  { pattern: /\b(?:latina)\b/i, href: TAG('latina') },
  { pattern: /\b(?:asian)\b/i, href: TAG('asian') },
  { pattern: /\b(?:lesbian)\b/i, href: TG('lesbian') },
  { pattern: /\b(?:feet|foot fetish)\b/i, href: TG('feet') },
  { pattern: /\b(?:reddit)\b/i, href: TG('reddit') },
  { pattern: /\b(?:snapchat)\b/i, href: TG('snapchat') },
  { pattern: /\b(?:tiktok)\b/i, href: TG('tiktok') },
  { pattern: /\b(?:live cam|livecam)\b/i, href: TG('live-cam') },

  // Countries / tags
  { pattern: /\b(?:spain|spanish)\b/i, href: TAG('spain') },
  { pattern: /\b(?:germany|german)\b/i, href: TAG('germany') },
  { pattern: /\b(?:france|french)\b/i, href: TAG('france') },
  { pattern: /\b(?:brazil|brazilian)\b/i, href: TAG('brazil') },
  { pattern: /\b(?:japan|japanese|jav)\b/i, href: TAG('japan') },
  { pattern: /\b(?:india|indian)\b/i, href: TAG('india') },
  { pattern: /\b(?:\buk\b|british|united kingdom)\b/i, href: TAG('uk') },
  { pattern: /\b(?:\busa\b|american|united states)\b/i, href: TAG('usa') },

  // Blog hubs + articles (verified published slugs)
  { pattern: /\b(?:creating ai girlfriend|build.*ai girlfriend|design.*ai girlfriend)\b/i, href: BLOG('meet-the-top-5-ai-companions-on-erogram') },
  { pattern: /\b(?:ai girlfriend chat|ai gf chat)\b/i, href: BLOG('the-rise-of-ai-companions-a-look-into-telegrams-virtual-relationships') },
  { pattern: /\b(?:ai companion|undress ai|nsfw ai)\b/i, href: BLOG_CAT('ai-nsfw') },
  { pattern: /\b(?:telegram group|telegram channel|nsfw telegram)\b/i, href: BLOG_CAT('telegram-groups-bots') },

  // Hub catch-alls (after specific phrases)
  { pattern: /\b(?:nsfw|adult content|explicit|uncensored|18\+)\b/i, href: '/ainsfw' },
  { pattern: /\b(?:ai nsfw|nsfw ai)\b/i, href: TAG('ai-nsfw') },
];


const LINK_CLASS = 'text-[#22c55e] hover:underline';
const GUIDE_LINK_CLASS = 'text-[#22c55e] hover:underline';

const TOOL_BY_NAME = new Map(AI_NSFW_TOOLS.map((tool) => [tool.name.toLowerCase(), tool]));

const TAG_EXACT: Record<string, string> = {
  'ai girlfriend': AINSFW('AI Companion'),
  'ai companion': AINSFW('AI Companion'),
  'ai sexting': AINSFW('AI Sexting / Chat'),
  'ai boyfriend': AINSFW('AI Companion'),
  'ai chat': AINSFW('AI Sexting / Chat'),
  'ai chatbot': AINSFW('AI Sexting / Chat'),
  'ai chatbots': AINSFW('AI Sexting / Chat'),
  'ai chatbot platform': AINSFW('AI Sexting / Chat'),
  'ai roleplay': AINSFW('AI NSFW Roleplay'),
  'ai nsfw roleplay': AINSFW('AI NSFW Roleplay'),
  'ai erotic roleplay': AINSFW('AI NSFW Roleplay'),
  'ai image': AINSFW('AI NSFW Image Generator'),
  'ai image generator': AINSFW('AI NSFW Image Generator'),
  'ai nsfw image generator': AINSFW('AI NSFW Image Generator'),
  'ai porn generator': AINSFW('AI Porn Generator'),
  'ai face swap': AINSFW('AI NSFW Image Generator'),
  'face swap': AINSFW('AI NSFW Image Generator'),
  'ai deepfake': AINSFW('Undress AI'),
  'ai undress': AINSFW('Undress AI'),
  'ai undresser': AINSFW('Undress AI'),
  'ai nudifier': AINSFW('Undress AI'),
  'ai clothes remover': AINSFW('Undress AI'),
  'ai clothes changer': AINSFW('Undress AI'),
  'ai nsfw': TAG('ai-nsfw'),
  'adult game': AINSFW('Adult Games'),
  'adult games': AINSFW('Adult Games'),
  'ai adult games': AINSFW('Adult Games'),
  '3d game': AINSFW('Adult Games'),
};

function slugifyTag(tag: string): string {
  return tag.toLowerCase().trim().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function getAinsfwTagHref(tag: string): string | null {
  const key = tag.toLowerCase().trim();
  if (TAG_EXACT[key]) return TAG_EXACT[key];

  const slug = slugifyTag(tag);
  if (getTagDefinition(slug)) return TAG(slug);

  if (/undress|nudif|deepfake|clothes remover|clothes changer|nudifier/.test(key)) return AINSFW('Undress AI');
  if (/porn generator|generated porn|ai porn/.test(key)) return AINSFW('AI Porn Generator');
  if (/girlfriend|companion|sexting|boyfriend|waifu/.test(key)) return AINSFW('AI Companion');
  if (/roleplay|role play/.test(key)) return AINSFW('AI NSFW Roleplay');
  if (/chatbot|\bchat\b/.test(key)) return AINSFW('AI Sexting / Chat');
  if (/face swap|image generator|image gen|text-to-image|sdxl|faceswap/.test(key)) return AINSFW('AI NSFW Image Generator');
  if (/adult game|\bgame\b/.test(key)) return AINSFW('Adult Games');
  if (/hentai|anime/.test(key)) return TG('hentai');
  if (/furry|yiff/.test(key)) return TG('furry');
  if (/telegram/.test(key)) return '/groups';
  if (/onlyfans/.test(key)) return '/onlyfanssearch';
  if (/\bnsfw\b/.test(key)) return '/ainsfw';

  return null;
}

function applyLiteralRule(parts: (string | ReactNode)[], match: string, href: string) {
  const next: (string | ReactNode)[] = [];
  const re = new RegExp(match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');

  for (const part of parts) {
    if (typeof part !== 'string') {
      next.push(part);
      continue;
    }
    let lastIndex = 0;
    for (const m of part.matchAll(re)) {
      const index = m.index ?? 0;
      if (index > lastIndex) next.push(part.slice(lastIndex, index));
      next.push(
        <Link key={`${href}-${next.length}`} href={href} className={LINK_CLASS}>
          {m[0]}
        </Link>,
      );
      lastIndex = index + m[0].length;
    }
    if (lastIndex < part.length) next.push(part.slice(lastIndex));
  }
  return next;
}

function applyRegexRule(parts: (string | ReactNode)[], pattern: RegExp, href: string) {
  const next: (string | ReactNode)[] = [];
  const re = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`);

  for (const part of parts) {
    if (typeof part !== 'string') {
      next.push(part);
      continue;
    }
    let lastIndex = 0;
    for (const m of part.matchAll(re)) {
      const index = m.index ?? 0;
      if (index > lastIndex) next.push(part.slice(lastIndex, index));
      next.push(
        <Link key={`${href}-${next.length}`} href={href} className={LINK_CLASS}>
          {m[0]}
        </Link>,
      );
      lastIndex = index + m[0].length;
    }
    if (lastIndex < part.length) next.push(part.slice(lastIndex));
  }
  return next;
}

export function renderAinsfwLinkedText(text: string, alternatives?: AINsfwReviewAlternative[]) {
  let parts: (string | ReactNode)[] = [text];

  const literalRules = [...(alternatives ?? [])]
    .sort((a, b) => b.name.length - a.name.length)
    .map((alt) => ({ match: alt.name, href: `/ainsfw/${alt.slug}` }));

  for (const rule of literalRules) {
    parts = applyLiteralRule(parts, rule.match, rule.href);
  }

  for (const rule of INTERNAL_LINK_RULES) {
    parts = applyRegexRule(parts, rule.pattern, rule.href);
  }

  return parts.length === 1 && typeof parts[0] === 'string' ? parts[0] : parts;
}

type TextSegment = { bold: boolean; text: string };

function renderGuideMarkers(text: string): ReactNode[] {
  const re = /\{\{(tool|cat|href):([^}|]+)(?:\|([^}]+))?\}\}|\*\*([^*]+)\*\*/g;
  const nodes: ReactNode[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(re)) {
    const index = match.index ?? 0;
    if (index > lastIndex) nodes.push(text.slice(lastIndex, index));

    const kind = match[1];
    const value = match[2]?.trim();
    const label = match[3]?.trim();
    const boldText = match[4];

    if (kind === 'tool' && value) {
      const tool = TOOL_BY_NAME.get(value.toLowerCase());
      nodes.push(
        <Link key={`tool-${index}`} href={tool ? getAinsfwToolHref(tool.slug) : '/ainsfw'} className={GUIDE_LINK_CLASS}>
          {label || value}
        </Link>,
      );
    } else if (kind === 'cat' && value) {
      nodes.push(
        <Link key={`cat-${index}`} href={AINSFW(value)} className={GUIDE_LINK_CLASS}>
          {label || value}
        </Link>,
      );
    } else if (kind === 'href' && value) {
      nodes.push(
        <Link key={`href-${index}`} href={value} className={GUIDE_LINK_CLASS}>
          {label || value}
        </Link>,
      );
    } else if (boldText) {
      nodes.push(
        <strong key={`bold-${index}`} className="font-bold text-white">
          {boldText}
        </strong>,
      );
    }

    lastIndex = index + match[0].length;
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes.length > 0 ? nodes : [text];
}

/** Hub guide + FAQ: explicit {{tool:}}, {{cat:}}, {{href:}} markers only. */
export function renderAinsfwGuideText(text: string): ReactNode {
  const nodes = renderGuideMarkers(text);
  if (nodes.length === 1 && typeof nodes[0] === 'string') return nodes[0];
  return nodes;
}
