export interface AinsfwMetaEntry {
  title: string;
  en: string;
  de?: string;
  es?: string;
  pt?: string;
}

/** Custom SEO meta for individual tool pages. Key = tool slug from data.ts */
export const META_DESCRIPTIONS: Record<string, AinsfwMetaEntry> = {
  'clothoff-undress-ai': {
    title: 'Clothoff.net: Best Undress AI & Nudify App (2026)',
    en: 'One photo in, everything off. Clothoff.net nudifies any picture in seconds. Explore Clothoff.net and other undress AI tools on Erogram.pro.',
  },
  'nudiva-undress-ai': {
    title: 'Nudiva: Best Undress AI & Nude Video Generator (2026)',
    en: 'Strip the photo, then watch her move. Nudiva turns stills into short nude videos. Explore Nudiva and other undress AI tools on Erogram.pro.',
  },
  'undress-app-undress-ai': {
    title: 'Undress.App: Best AI Clothes Remover & Nudify Tool (2026)',
    en: 'Pick a mode, upload, wait ten seconds. Undress.App removes clothing from any photo. Explore Undress.App and other AI clothes remover tools on Erogram.pro.',
  },
  'genesis-porn-ai-image': {
    title: 'Genesis Porn: Best AI Porn Generator & NSFW Video (2026)',
    en: 'Type the filthiest idea and watch it render. Genesis Porn makes NSFW images and videos on demand. Explore Genesis Porn and other AI porn generators on Erogram.pro.',
  },
  'createporn-ai-image': {
    title: 'CreatePorn: Best AI Porn Generator & NSFW Image Maker (2026)',
    en: 'No menus, no fluff, just filth. CreatePorn turns a plain prompt into explicit images. Explore CreatePorn and other AI porn generators on Erogram.pro.',
  },
  'lovescape-ai-girlfriend': {
    title: 'Lovescape: Best AI Girlfriend & AI Companion Chat (2026)',
    en: 'She remembers what you said yesterday. Lovescape brings voice, photos and a million characters. Explore Lovescape and other AI girlfriend tools on Erogram.pro.',
  },
  'girlfriendgpt-ai-girlfriend': {
    title: 'GirlfriendGPT: Best AI Girlfriend & NSFW Chat App (2026)',
    en: 'Build her from zero or pick from 25,000. GirlfriendGPT adds uncensored chat, images and voice. Explore GirlfriendGPT and other AI companion tools on Erogram.pro.',
  },
  'spicychat-ai-chat': {
    title: 'SpicyChat: Best Uncensored AI Chat & NSFW Sexting (2026)',
    en: 'No filters, no warnings, no limits. SpicyChat runs uncensored NSFW sexting and roleplay. Explore SpicyChat and other AI chat tools on Erogram.pro.',
  },
  'soulgen-ai-image': {
    title: 'SoulGen: Best AI NSFW Image Generator & Art Maker (2026)',
    en: 'Describe her and she appears. SoulGen turns text into photoreal and anime NSFW art. Explore SoulGen and other AI image generator tools on Erogram.pro.',
  },
};

/** Custom SEO meta for /ainsfw/{category-slug} hub pages */
export const CATEGORY_META: Record<string, AinsfwMetaEntry> = {
  'undress-ai': {
    title: '10 Best Undress AI Tools & Nudify Apps (2026)',
    en: 'Curious what she looks like underneath? The 10 best undress AI and nudify apps of 2026 strip any photo in seconds. Explore the full list on Erogram.pro.',
  },
  'ai-girlfriend': {
    title: '10 Best AI Girlfriend Apps & Companion Chats (2026)',
    en: 'Want a girl who never says no? The 10 best AI girlfriend apps of 2026 bring uncensored chat, photos and voice. Explore the full list on Erogram.pro.',
  },
  'ai-porn-generator': {
    title: '10 Best AI Porn Generators & NSFW Image Makers (2026)',
    en: 'The dirtiest idea, rendered in seconds. The 10 best AI porn generators of 2026 make NSFW images and videos on demand. Explore the full list on Erogram.pro.',
  },
  'ai-sexting-chat': {
    title: '10 Best AI Sexting Apps & Uncensored Chat Bots (2026)',
    en: 'Ready to text what you cannot say out loud? The 10 best AI sexting and uncensored chat apps of 2026 never break character. Explore the full list on Erogram.pro.',
  },
  'ai-nsfw-roleplay': {
    title: '10 Best NSFW AI Roleplay Sites & Erotic Story Chats (2026)',
    en: 'Some fantasies only work in words. The 10 best NSFW AI roleplay and erotic story sites of 2026 remember every scene. Explore the full list on Erogram.pro.',
  },
};

export function getAinsfwMetaTitle(slug: string): string | null {
  return META_DESCRIPTIONS[slug]?.title ?? null;
}

export function getAinsfwCategoryMeta(slug: string): AinsfwMetaEntry | null {
  return CATEGORY_META[slug] ?? null;
}

export function getAinsfwMetaDescription(slug: string, locale: 'en' | 'de' | 'es' | 'pt' = 'en'): string {
  const entry = META_DESCRIPTIONS[slug];
  if (!entry) return '';
  return entry[locale] || entry.en || '';
}
