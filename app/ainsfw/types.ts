export type AINsfwToolCategory =
  | 'AI Companion'
  | 'AI Girlfriend'
  | 'AI Chat'
  | 'AI Chatbot'
  | 'AI NSFW Chat'
  | 'AI Characters'
  | 'AI NSFW Character'
  | 'AI Sexting'
  | 'AI Sexting / Chat'
  | 'Undress AI'
  | 'AI Nudifier'
  | 'AI Clothes Remover'
  | 'AI Image Generator'
  | 'AI Art Generator'
  | 'AI NSFW Image Generator'
  | 'AI Porn Generator'
  | 'AI Face Swap'
  | 'AI Video Generator'
  | 'AI NSFW Roleplay'
  | 'AI Erotic Storytelling'
  | 'AI Story'
  | 'AI Fetish'
  | 'AI Anime Characters'
  | 'Adult Games';

export interface AINsfwTool {
  slug: string;
  name: string;
  category: AINsfwToolCategory;
  vendor: string;
  description: string;
  description_de?: string;
  description_es?: string;
  image: string;
  tags: string[];
  subscription: string;
  payment: string[];
  tryNowUrl: string;
  sourceUrl: string;
}

export type AINsfwCategory = 'All' | AINsfwToolCategory;

export const AINSFW_CATEGORIES: AINsfwCategory[] = [
  'All',
  'AI Companion',
  'AI Girlfriend',
  'AI Chat',
  'AI Chatbot',
  'AI NSFW Chat',
  'AI Characters',
  'AI NSFW Character',
  'AI Sexting',
  'AI Sexting / Chat',
  'Undress AI',
  'AI Nudifier',
  'AI Clothes Remover',
  'AI Image Generator',
  'AI Art Generator',
  'AI NSFW Image Generator',
  'AI Porn Generator',
  'AI Face Swap',
  'AI Video Generator',
  'AI NSFW Roleplay',
  'AI Erotic Storytelling',
  'AI Story',
  'AI Fetish',
  'AI Anime Characters',
  'Adult Games',
];

export const ALL_PAYMENT_OPTIONS = ['Credit Cards', 'Crypto', 'PayPal'] as const;
export type PaymentOption = typeof ALL_PAYMENT_OPTIONS[number];
