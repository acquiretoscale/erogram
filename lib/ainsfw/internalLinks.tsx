import Link from 'next/link';
import type { ReactNode } from 'react';
import { categoryToSlug } from '@/app/ainsfw/data';
import { getTagDefinition } from '@/lib/tags/registry';
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
  { pattern: /\b(?:virtual girlfriend|ai girlfriend|ai companion|ai boyfriend|virtual companion|ai waifu)\b/i, href: AINSFW('AI Girlfriend') },
  { pattern: /\b(?:undress tools?|clothes remover|clothes changer|ai undresser|ai nudifier)\b/i, href: AINSFW('Undress AI') },
  { pattern: /\b(?:face swap|faceswap|swap faces)\b/i, href: AINSFW('AI Image') },
  { pattern: /\b(?:ai image generator|ai image|image generator|photo generator|text-to-image|sdxl)\b/i, href: AINSFW('AI Image') },
  { pattern: /\b(?:ai chatbot|ai chat|chatbot platform)\b/i, href: AINSFW('AI Chat') },
  { pattern: /\b(?:ai roleplay|nsfw roleplay|erotic roleplay|role-play)\b/i, href: AINSFW('AI Roleplay') },
  { pattern: /\b(?:adult games?|adult gaming|3d game)\b/i, href: AINSFW('Adult Games') },
  { pattern: /\b(?:undress|deepfake|nudify|nudif\w*)\b/i, href: AINSFW('Undress AI') },
  { pattern: /\broleplay\b/i, href: AINSFW('AI Roleplay') },
  { pattern: /\bchatbot\b/i, href: AINSFW('AI Chat') },

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

const TAG_EXACT: Record<string, string> = {
  'ai girlfriend': AINSFW('AI Girlfriend'),
  'ai companion': AINSFW('AI Girlfriend'),
  'ai sexting': AINSFW('AI Girlfriend'),
  'ai boyfriend': AINSFW('AI Girlfriend'),
  'ai chat': AINSFW('AI Chat'),
  'ai chatbot': AINSFW('AI Chat'),
  'ai chatbots': AINSFW('AI Chat'),
  'ai chatbot platform': AINSFW('AI Chat'),
  'ai roleplay': AINSFW('AI Roleplay'),
  'ai nsfw roleplay': AINSFW('AI Roleplay'),
  'ai erotic roleplay': AINSFW('AI Roleplay'),
  'ai image': AINSFW('AI Image'),
  'ai image generator': AINSFW('AI Image'),
  'ai nsfw image generator': AINSFW('AI Image'),
  'ai face swap': AINSFW('AI Image'),
  'face swap': AINSFW('AI Image'),
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
  if (/girlfriend|companion|sexting|boyfriend|waifu/.test(key)) return AINSFW('AI Girlfriend');
  if (/roleplay|role play/.test(key)) return AINSFW('AI Roleplay');
  if (/chatbot|\bchat\b/.test(key)) return AINSFW('AI Chat');
  if (/face swap|image generator|image gen|text-to-image|sdxl|faceswap/.test(key)) return AINSFW('AI Image');
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
        <Link key={`${href}-${next.length}`} href={href} className="text-[#22c55e] hover:underline">
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
        <Link key={`${href}-${next.length}`} href={href} className="text-[#22c55e] hover:underline">
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
