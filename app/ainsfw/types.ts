export interface AINsfwTool {
  slug: string;
  name: string;
  category: 'AI Girlfriend' | 'Undress AI' | 'AI Chat' | 'AI Image' | 'AI Roleplay';
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

export type AINsfwCategory = 'All' | 'AI Girlfriend' | 'Undress AI' | 'AI Chat' | 'AI Image' | 'AI Roleplay';

export const AINSFW_CATEGORIES: AINsfwCategory[] = ['All', 'AI Girlfriend', 'Undress AI', 'AI Chat', 'AI Image', 'AI Roleplay'];

export const ALL_PAYMENT_OPTIONS = ['Credit Cards', 'Crypto', 'PayPal'] as const;
export type PaymentOption = typeof ALL_PAYMENT_OPTIONS[number];
