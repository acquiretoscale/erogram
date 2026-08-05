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

export type PricingModel = 'All' | 'Free' | 'Paid' | 'Freemium';

export const PRICING_MODEL_OPTIONS: PricingModel[] = ['All', 'Free', 'Paid', 'Freemium'];

export type AinsfwSortOption = 'default' | 'top-upvotes';

export const AINSFW_SORT_OPTIONS: { value: AinsfwSortOption; label: string }[] = [
  { value: 'default', label: 'Default' },
  { value: 'top-upvotes', label: 'Top upvotes' },
];

export function toolMatchesPricingModel(subscription: string, model: PricingModel): boolean {
  if (model === 'All') return true;
  const sub = subscription.toLowerCase();
  if (model === 'Freemium') return sub.includes('freemium');
  if (model === 'Paid') return sub.includes('paid');
  if (model === 'Free') return sub.includes('free') && !sub.includes('freemium');
  return true;
}
