export interface BestAiToolMetaSet {
  en: string;
  de?: string;
  es?: string;
  pt?: string;
}

export const BEST_AI_TOOL_META: Record<string, BestAiToolMetaSet> = {
  'ai-companion': {
    en: "Looking for the best AI companion apps? Erogram's top 10 list ranks the leading virtual partners with memory, voice, images, and uncensored NSFW chat.",
  },
  'undress-ai': {
    en: "Want the best undress AI tools? Erogram's top 10 ranks nudify and clothes-remover apps by output quality, speed, and privacy.",
  },
  'ai-nsfw-image-generator': {
    en: "Into AI NSFW image generators? Erogram's top 10 picks the best adult art and photo tools with strong prompts, fast renders, and realistic results.",
  },
  'ai-nsfw-roleplay': {
    en: "Searching for AI NSFW roleplay platforms? Erogram's top 10 list features the best character chat and fantasy RP tools ranked by immersion and freedom.",
  },
  'ai-sexting-chat': {
    en: "Want the best AI sexting and chat apps? Erogram's top 10 ranks uncensored adult chatbots with memory, images, and active communities.",
  },
  'ai-porn-generator': {
    en: "Looking for AI porn generators? Erogram's top 10 list ranks prompt-to-image and video tools for custom adult content creation.",
  },
  'adult-games': {
    en: "Want the best adult AI games? Erogram's top 10 ranks interactive 3D and story-driven NSFW games worth trying in 2026.",
  },
  'ai-girlfriend': {
    en: "Want the best AI girlfriend apps? Erogram's top 10 ranks virtual girlfriends with chat, selfies, voice, and long-term memory.",
  },
  'ai-sexting': {
    en: "Into AI sexting? Erogram's top 10 ranks the best NSFW chat apps for explicit roleplay, flirty messages, and uncensored conversations.",
  },
  'ai-nude-generator': {
    en: "Need an AI nude generator? Erogram's top 10 ranks the best tools for realistic nude images from prompts or photos.",
  },
  'ai-nsfw-story-generator': {
    en: "Want an AI NSFW story generator? Erogram's top 10 ranks erotic fiction, interactive storytelling, and adult RP writing tools.",
  },
  'top-20-ai-companion-tools-accepting-crypto': {
    en: "TOP 20 AI companion tools that accept crypto, ranked by popularity and user reviews on Erogram. Bitcoin-friendly virtual partners with NSFW chat, images, and voice.",
  },
  'top-20-undress-ai-tools-accepting-crypto': {
    en: "TOP 20 Undress AI tools that accept cryptocurrency, ranked by output quality and community votes. Crypto-friendly nudify apps tested by Erogram.",
  },
  'top-20-ai-nsfw-image-generator-tools-accepting-crypto': {
    en: "TOP 20 AI NSFW image generators that accept crypto payments, ranked by render quality and user reviews. Bitcoin-friendly adult art tools on Erogram.",
  },
};

export function getBestAiToolMetaDescription(slug: string, locale: string): string | undefined {
  const set = BEST_AI_TOOL_META[slug];
  if (!set) return undefined;
  if (locale === 'de' && set.de) return set.de;
  if (locale === 'es' && set.es) return set.es;
  if (locale === 'pt' && set.pt) return set.pt;
  return set.en;
}
