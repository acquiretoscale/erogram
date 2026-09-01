import type { ProfileThemeTokens } from '@/app/profile/profileTheme';

export const OF_SEARCH_TOKENS: ProfileThemeTokens = {
  id: 'night',
  bg: '#111111',
  card: '#1a1a1a',
  text: '#f5f5f5',
  muted: 'rgba(255,255,255,0.5)',
  border: 'rgba(255,255,255,0.08)',
  ink: '#ffffff',
  accent: '#00AFF0',
  hover: 'rgba(255,255,255,0.06)',
  cardShadow: '0 12px 32px -8px rgba(0,175,240,0.18)',
  footerGradient: 'linear-gradient(to bottom, #111111 0%, #0a0a0a 100%)',
  adminBarBg: 'rgba(17,17,17,0.95)',
};

export function ofSearchNavProps(lp: (path: string) => string) {
  return {
    bestModelsHref: lp('/ofsearch/best'),
    bestFreeHref: lp('/ofsearch/best'),
  };
}
