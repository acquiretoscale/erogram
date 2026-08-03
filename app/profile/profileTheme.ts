export type ProfileThemeId = 'light' | 'night' | 'cyberpunk' | 'onlyfans' | 'pornhub' | 'telegram' | 'erogram' | 'console';

export const PROFILE_THEME_KEY = 'profile_theme';

export type ProfileThemeTokens = {
  id: ProfileThemeId;
  bg: string;
  card: string;
  text: string;
  muted: string;
  border: string;
  ink: string;
  accent: string;
  hover: string;
  cardShadow: string;
  footerGradient: string;
  adminBarBg: string;
};

export type ProfileTabColors = {
  accent: string;
  accentDim: string;
  activeBg: string;
  activeTxt: string;
  cardBg: string;
  cardBorder: string;
  cardHover: string;
  tagBg: string;
  tagBorder: string;
  divider: string;
  pillBg: string;
  pillBorder: string;
  leftAccent: string;
  viewBtnBg: string;
  viewBtnTxt: string;
  text: string;
  textMuted: string;
};

export const PROFILE_THEMES: Record<ProfileThemeId, ProfileThemeTokens> = {
  light: {
    id: 'light',
    bg: '#F7F4EC',
    card: '#F7F4EC',
    text: '#2B1B28',
    muted: '#6B6568',
    border: 'rgba(43,27,40,0.12)',
    ink: '#FDFDFD',
    accent: '#2B1B28',
    hover: 'rgba(43,27,40,0.05)',
    cardShadow: '0 30px 80px -30px rgba(43,27,40,0.2)',
    footerGradient: 'linear-gradient(to bottom, #3d2538 0%, #2B1B28 100%)',
    adminBarBg: 'rgba(247,244,236,0.95)',
  },
  night: {
    id: 'night',
    bg: '#0B1220',
    card: '#111B2E',
    text: '#E8EEF8',
    muted: '#8B9BB8',
    border: 'rgba(148,163,184,0.18)',
    ink: '#0B1220',
    accent: '#60A5FA',
    hover: 'rgba(96,165,250,0.08)',
    cardShadow: '0 30px 80px -30px rgba(0,0,0,0.5)',
    footerGradient: 'linear-gradient(to bottom, #0f172a 0%, #0B1220 100%)',
    adminBarBg: 'rgba(17,27,46,0.95)',
  },
  cyberpunk: {
    id: 'cyberpunk',
    bg: '#04140c',
    card: '#0a1f12',
    text: '#FFFFFF',
    muted: 'rgba(255,255,255,0.65)',
    border: 'rgba(34,197,94,0.15)',
    ink: '#000000',
    accent: '#22c55e',
    hover: 'rgba(34,197,94,0.08)',
    cardShadow: '0 30px 80px -30px rgba(0,0,0,0.55)',
    footerGradient: 'linear-gradient(to bottom, #0a1f12 0%, #04140c 100%)',
    adminBarBg: 'rgba(4,20,12,0.92)',
  },
  onlyfans: {
    id: 'onlyfans',
    bg: '#FFFFFF',
    card: '#FFFFFF',
    text: '#1A1A1A',
    muted: '#64748B',
    border: 'rgba(0,175,240,0.22)',
    ink: '#FFFFFF',
    accent: '#00AFF0',
    hover: 'rgba(0,175,240,0.06)',
    cardShadow: '0 12px 32px -8px rgba(0,175,240,0.18)',
    footerGradient: 'linear-gradient(to bottom, #00AFF0 0%, #0095D5 100%)',
    adminBarBg: 'rgba(255,255,255,0.95)',
  },
  pornhub: {
    id: 'pornhub',
    bg: '#000000',
    card: '#1B1B1B',
    text: '#FFFFFF',
    muted: '#A3A3A3',
    border: 'rgba(255,144,0,0.28)',
    ink: '#000000',
    accent: '#FF9000',
    hover: 'rgba(255,144,0,0.10)',
    cardShadow: '0 24px 64px -24px rgba(255,144,0,0.35)',
    footerGradient: 'linear-gradient(to bottom, #FF9000 0%, #CC7400 100%)',
    adminBarBg: 'rgba(27,27,27,0.95)',
  },
  telegram: {
    id: 'telegram',
    bg: '#0E1621',
    card: '#17212B',
    text: '#FFFFFF',
    muted: '#8BA4BC',
    border: 'rgba(42,171,238,0.16)',
    ink: '#FFFFFF',
    accent: '#2AABEE',
    hover: 'rgba(42,171,238,0.12)',
    cardShadow: '0 16px 48px -20px rgba(42,171,238,0.18)',
    footerGradient: 'linear-gradient(to bottom, #17212B 0%, #0E1621 100%)',
    adminBarBg: 'rgba(14,22,33,0.92)',
  },
  erogram: {
    id: 'erogram',
    bg: '#0a0a0a',
    card: '#0a0a0a',
    text: '#FDFDFD',
    muted: '#a89090',
    border: 'rgba(185,28,28,0.35)',
    ink: '#FFFFFF',
    accent: '#991b1b',
    hover: 'rgba(185,28,28,0.14)',
    cardShadow: '0 24px 64px -24px rgba(127,29,29,0.5)',
    footerGradient: 'linear-gradient(to bottom, #7f1d1d 0%, #0a0a0a 100%)',
    adminBarBg: 'rgba(10,10,10,0.95)',
  },
  console: {
    id: 'console',
    bg: '#0d1117',
    card: '#0f0f0f',
    text: '#FFFFFF',
    muted: '#8b949e',
    border: 'rgba(255,255,255,0.10)',
    ink: '#FFFFFF',
    accent: '#ff5e2a',
    hover: 'rgba(255,94,42,0.10)',
    cardShadow: '0 8px 30px -12px rgba(0,0,0,0.6)',
    footerGradient: 'linear-gradient(to bottom, #131a24 0%, #0d1117 100%)',
    adminBarBg: 'rgba(15,15,15,0.95)',
  },
};

export const FREE_PROFILE_THEMES: ProfileThemeId[] = ['light', 'telegram'];

export function isFreeProfileTheme(id: ProfileThemeId): boolean {
  return FREE_PROFILE_THEMES.includes(id);
}

export function clampProfileThemeForPremium(id: ProfileThemeId, isPremium: boolean): ProfileThemeId {
  if (isPremium || isFreeProfileTheme(id)) return id;
  return 'light';
}

export const profileCyberShellClass = 'profile-cyberpunk ainsfw-bg ainsfw-scanlines';

export const profilePornhubShellClass = 'profile-pornhub';

export const profileOnlyfansShellClass = 'profile-onlyfans';

export const profileTelegramShellClass = 'profile-telegram';

export const profileErogramShellClass = 'profile-erogram';

export const profileConsoleShellClass = 'profile-console';

export function isCyberpunkProfile(theme: ProfileThemeId) {
  return theme === 'cyberpunk';
}

export function isPornhubProfile(theme: ProfileThemeId) {
  return theme === 'pornhub';
}

export function isOnlyfansProfile(theme: ProfileThemeId) {
  return theme === 'onlyfans';
}

export function isTelegramProfile(theme: ProfileThemeId) {
  return theme === 'telegram';
}

export function isErogramProfile(theme: ProfileThemeId) {
  return theme === 'erogram';
}

export function isConsoleProfile(theme: ProfileThemeId) {
  return theme === 'console';
}

export const profileCardClass = 'rounded-2xl border';
export const profileEyebrowClass = 'text-[10px] font-bold tracking-[0.32em] uppercase';
export const profileTitleClass = 'font-[family-name:var(--font-baloo)] font-extrabold leading-[0.95] tracking-tight';
export const profileBtnClass = 'inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.24em] uppercase rounded-full px-6 py-3 transition-opacity hover:opacity-90';

const THEME_TAB_EXTRAS: Record<ProfileThemeId, Pick<ProfileTabColors, 'cardHover' | 'tagBg' | 'pillBg' | 'leftAccent'>> = {
  light: {
    cardHover: 'rgba(43,27,40,0.08)',
    tagBg: 'rgba(43,27,40,0.06)',
    pillBg: '#F7F4EC',
    leftAccent: 'linear-gradient(180deg, transparent, rgba(43,27,40,0.15), transparent)',
  },
  night: {
    cardHover: 'rgba(96,165,250,0.22)',
    tagBg: 'rgba(96,165,250,0.08)',
    pillBg: '#0B1220',
    leftAccent: 'linear-gradient(180deg, transparent, rgba(96,165,250,0.25), transparent)',
  },
  cyberpunk: {
    cardHover: 'rgba(34,197,94,0.22)',
    tagBg: 'rgba(34,197,94,0.08)',
    pillBg: '#04140c',
    leftAccent: 'linear-gradient(180deg, transparent, rgba(34,197,94,0.25), transparent)',
  },
  onlyfans: {
    cardHover: 'rgba(0,175,240,0.10)',
    tagBg: 'rgba(0,175,240,0.08)',
    pillBg: '#FFFFFF',
    leftAccent: 'linear-gradient(180deg, transparent, rgba(0,175,240,0.20), transparent)',
  },
  pornhub: {
    cardHover: 'rgba(255,144,0,0.18)',
    tagBg: 'rgba(255,144,0,0.10)',
    pillBg: '#0a0a0a',
    leftAccent: 'linear-gradient(180deg, transparent, rgba(255,144,0,0.35), transparent)',
  },
  telegram: {
    cardHover: 'rgba(42,171,238,0.16)',
    tagBg: 'rgba(42,171,238,0.12)',
    pillBg: '#0E1621',
    leftAccent: 'linear-gradient(180deg, transparent, rgba(42,171,238,0.35), transparent)',
  },
  erogram: {
    cardHover: 'rgba(185,28,28,0.22)',
    tagBg: 'rgba(127,29,29,0.35)',
    pillBg: '#0a0a0a',
    leftAccent: 'linear-gradient(180deg, transparent, rgba(185,28,28,0.4), transparent)',
  },
  console: {
    cardHover: 'rgba(255,94,42,0.14)',
    tagBg: 'rgba(255,94,42,0.10)',
    pillBg: '#131a24',
    leftAccent: 'linear-gradient(180deg, transparent, rgba(255,94,42,0.35), transparent)',
  },
};

const FIELD_BG: Record<ProfileThemeId, string> = {
  light: 'rgba(43,27,40,0.03)',
  night: 'rgba(96,165,250,0.06)',
  cyberpunk: 'rgba(34,197,94,0.06)',
  onlyfans: 'rgba(0,175,240,0.06)',
  pornhub: 'rgba(255,144,0,0.08)',
  telegram: 'rgba(42,171,238,0.10)',
  erogram: 'rgba(127,29,29,0.28)',
  console: 'rgba(255,255,255,0.04)',
};

const INPUT_BG: Record<ProfileThemeId, string> = {
  light: '#ffffff',
  night: 'rgba(15,23,42,0.6)',
  cyberpunk: '#0a1f12',
  onlyfans: '#FFFFFF',
  pornhub: '#141414',
  telegram: '#142029',
  erogram: '#0f0a0a',
  console: '#131a24',
};

const TAB_FROM_THEME = (t: ProfileThemeTokens): ProfileTabColors => {
  const extras = THEME_TAB_EXTRAS[t.id];
  return {
    accent: t.accent,
    accentDim: t.muted,
    activeBg: t.accent,
    activeTxt: t.ink,
    cardBg: t.card,
    cardBorder: t.border,
    cardHover: extras.cardHover,
    tagBg: extras.tagBg,
    tagBorder: t.border,
    divider: t.border,
    pillBg: extras.pillBg,
    pillBorder: t.border,
    leftAccent: extras.leftAccent,
    viewBtnBg: t.accent,
    viewBtnTxt: t.ink,
    text: t.text,
    textMuted: t.muted,
  };
};

export function getProfileTabColors(id: ProfileThemeId): ProfileTabColors {
  return TAB_FROM_THEME(getProfileThemeTokens(id));
}

export function readProfileTheme(): ProfileThemeId {
  if (typeof window === 'undefined') return 'light';
  const raw = localStorage.getItem(PROFILE_THEME_KEY);
  if (raw === 'dark' || raw === 'night') return 'night';
  if (raw === 'cyberpunk') return 'cyberpunk';
  if (raw === 'onlyfans') return 'onlyfans';
  if (raw === 'pornhub') return 'pornhub';
  if (raw === 'telegram') return 'telegram';
  if (raw === 'erogram') return 'erogram';
  if (raw === 'console') return 'console';
  return 'light';
}

export function writeProfileTheme(id: ProfileThemeId) {
  localStorage.setItem(PROFILE_THEME_KEY, id);
}

export function getProfileThemeTokens(id: ProfileThemeId): ProfileThemeTokens {
  return PROFILE_THEMES[id];
}

export function isProfileThemedMode(mode?: ProfileThemeId): mode is ProfileThemeId {
  return mode === 'light' || mode === 'night' || mode === 'cyberpunk' || mode === 'onlyfans' || mode === 'pornhub' || mode === 'telegram' || mode === 'erogram' || mode === 'console';
}

/** Shared colors for profile sub-components (AvatarPicker, etc.) */
export function profileComponentColors(mode: ProfileThemeId) {
  const t = getProfileThemeTokens(mode);
  const fieldBg = FIELD_BG[mode];
  const inputBg = INPUT_BG[mode];
  return {
    text: t.text,
    muted: t.muted,
    border: t.border,
    fieldBg,
    fieldBorder: t.border,
    btnBg: t.accent,
    btnText: t.ink,
    inputBg,
    inputText: t.text,
    pillActiveBg: t.accent,
    pillActiveText: t.ink,
    pillIdleText: t.muted,
    avatarBorder: t.border,
    avatarEmptyBg: fieldBg,
    isLight: mode === 'light' || mode === 'onlyfans',
  };
}

export type VaultTabColors = {
  bg: string;
  headerBg: string;
  headerBorder: string;
  glowColor: string;
  cardBg: string;
  cardBorder: string;
  cardHover: string;
  catBg: string;
  catBorder: string;
  catColor: string;
  catDim: string;
  text: string;
  textDim: string;
  textMuted: string;
  inputBg: string;
  inputBorder: string;
  pillBg: string;
  pillBorder: string;
  pillActive: string;
  pillActiveText: string;
  pillText: string;
  gold: string;
  goldText: string;
  lockBg: string;
  blurOverlay: string;
  subsBg: string;
  accent: string;
  ink: string;
  badgeBg: string;
  badgeBorder: string;
  panelBorder: string;
  adminSelectBg: string;
};

export function getVaultTabColors(themeId: ProfileThemeId, lightMode: boolean): VaultTabColors {
  const t = getProfileThemeTokens(themeId);
  const tab = getProfileTabColors(themeId);
  const inputBg = INPUT_BG[themeId];
  const fieldBg = FIELD_BG[themeId];
  const accent = t.accent;

  return {
    bg: lightMode ? t.bg : 'transparent',
    headerBg: `linear-gradient(135deg, ${t.card} 0%, ${t.bg} 100%)`,
    headerBorder: `1px solid ${t.border}`,
    glowColor: accent,
    cardBg: t.card,
    cardBorder: t.border,
    cardHover: tab.cardHover,
    catBg: tab.tagBg,
    catBorder: t.border,
    catColor: accent,
    catDim: t.muted,
    text: t.text,
    textDim: t.muted,
    textMuted: t.muted,
    inputBg,
    inputBorder: t.border,
    pillBg: tab.pillBg,
    pillBorder: t.border,
    pillActive: accent,
    pillActiveText: t.ink,
    pillText: t.muted,
    gold: accent,
    goldText: accent,
    lockBg: fieldBg,
    blurOverlay: t.bg,
    subsBg: tab.tagBg,
    accent,
    ink: t.ink,
    badgeBg: tab.tagBg,
    badgeBorder: t.border,
    panelBorder: t.border,
    adminSelectBg: inputBg,
  };
}
