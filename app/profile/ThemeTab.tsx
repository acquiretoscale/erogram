'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import type { CSSProperties } from 'react';
import {
  PROFILE_THEMES,
  getProfileTabColors,
  isFreeProfileTheme,
  profileBtnClass,
  type ProfileThemeId,
  type ProfileThemeTokens,
} from './profileTheme';
import { useProfileTheme } from './ProfileThemeContext';
import { ProfileEyebrow, ProfileHeading } from './ProfileTypography';

const OPTIONS: { id: ProfileThemeId; label: string }[] = [
  { id: 'light', label: 'Light' },
  { id: 'telegram', label: 'Telegram' },
  { id: 'night', label: 'Night' },
  { id: 'cyberpunk', label: 'Cyber punk' },
  { id: 'onlyfans', label: 'Onlyfans' },
  { id: 'pornhub', label: 'Pornhub' },
  { id: 'erogram', label: 'EROgram' },
  { id: 'console', label: 'Console' },
];

function UpgradePremiumBadge({ className = '' }: { className?: string }) {
  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ${className}`}
      style={{
        background: 'linear-gradient(135deg, #f5d061 0%, #c9973a 45%, #a67c00 100%)',
        border: '1px solid #e8c547',
        boxShadow: '0 0 10px rgba(201,151,58,0.45)',
      }}
    >
      <svg width="11" height="11" viewBox="0 0 24 24" fill="#2a1f00" aria-hidden className="shrink-0">
        <path d="M12 2l2.09 6.26L20 9.27l-4.45 4.7L16.91 20 12 16.9 7.09 20l1.36-6.03L4 9.27l5.91-1.01z" />
      </svg>
      <span className="text-[8px] font-black uppercase tracking-[0.14em] text-[#2a1f00] whitespace-nowrap">
        UPGRADE TO PREMIUM
      </span>
    </div>
  );
}

function getPreviewShellStyle(id: ProfileThemeId, t: ProfileThemeTokens): CSSProperties {
  const base: CSSProperties = { backgroundColor: t.bg };

  switch (id) {
    case 'cyberpunk':
      return {
        ...base,
        backgroundImage: `radial-gradient(160px circle at 18% 0%, rgba(34,197,94,0.38), transparent 70%), linear-gradient(180deg, ${t.bg} 0%, #020806 100%)`,
      };
    case 'erogram':
      return {
        ...base,
        backgroundImage: `radial-gradient(160px circle at 12% 0%, rgba(127,29,29,0.55), transparent 70%), linear-gradient(180deg, ${t.bg} 0%, #050505 100%)`,
      };
    case 'console':
      return {
        ...base,
        backgroundImage: `radial-gradient(160px circle at 18% 0%, rgba(255,94,42,0.22), transparent 70%), radial-gradient(120px circle at 85% 0%, rgba(179,27,27,0.18), transparent 70%), linear-gradient(180deg, ${t.bg} 0%, #0a0e16 100%)`,
      };
    case 'pornhub':
      return {
        ...base,
        backgroundImage: `radial-gradient(120px circle at 85% 0%, rgba(255,144,0,0.28), transparent 70%)`,
      };
    case 'onlyfans':
      return {
        ...base,
        backgroundImage: `radial-gradient(140px circle at 50% -10%, rgba(0,175,240,0.14), transparent 70%)`,
      };
    case 'telegram':
      return {
        ...base,
        backgroundImage: `radial-gradient(130px circle at 75% 0%, rgba(42,171,238,0.22), transparent 70%)`,
      };
    case 'night':
      return {
        ...base,
        backgroundImage: `radial-gradient(140px circle at 50% 0%, rgba(96,165,250,0.18), transparent 70%)`,
      };
    default:
      return base;
  }
}

function ThemePreviewMockup({ id }: { id: ProfileThemeId }) {
  const t = PROFILE_THEMES[id];
  const tab = getProfileTabColors(id);

  return (
    <div className="relative h-48 overflow-hidden" style={getPreviewShellStyle(id, t)}>
      <div
        className="flex h-6 items-center gap-1.5 border-b px-2.5"
        style={{ backgroundColor: t.adminBarBg, borderColor: t.border }}
      >
        <div className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: t.accent }} />
        <div className="h-1 w-14 rounded-full" style={{ backgroundColor: t.text, opacity: 0.75 }} />
        <div className="ml-auto h-1 w-6 rounded-full" style={{ backgroundColor: t.muted, opacity: 0.45 }} />
      </div>

      <div className="flex h-[calc(100%-24px)]">
        <div className="min-w-0 flex-1 p-2.5">
          <div
            className="flex h-full flex-col rounded-xl border p-2.5"
            style={{
              backgroundColor: t.card,
              borderColor: t.border,
              boxShadow: t.cardShadow,
            }}
          >
            <div className="mb-1 h-1.5 w-14 rounded-full" style={{ backgroundColor: t.text, opacity: 0.92 }} />
            <div className="mb-2.5 h-1 w-[72%] rounded-full" style={{ backgroundColor: t.muted, opacity: 0.55 }} />
            <div className="mb-2.5 flex gap-1">
              <div
                className="h-3.5 rounded-full px-2 text-[7px] font-bold uppercase leading-[14px] tracking-wide"
                style={{ backgroundColor: t.accent, color: t.ink }}
              >
                Save
              </div>
              <div
                className="h-3.5 rounded-full border px-2 text-[7px] font-bold uppercase leading-[14px] tracking-wide"
                style={{ backgroundColor: tab.tagBg, borderColor: t.border, color: t.muted }}
              >
                Tag
              </div>
            </div>
            <div className="mt-auto grid grid-cols-3 gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="aspect-[4/3] rounded-md border"
                  style={{
                    backgroundColor: i === 0 ? tab.cardHover : tab.pillBg,
                    borderColor: t.border,
                    opacity: i === 0 ? 1 : 0.85,
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        <div
          className="flex w-11 shrink-0 flex-col gap-1 border-l p-1.5"
          style={{ backgroundColor: t.card, borderColor: t.border }}
        >
          <div
            className="rounded-md px-1 py-1 text-center text-[6px] font-bold uppercase leading-none tracking-wide"
            style={{ backgroundColor: t.accent, color: t.ink }}
          >
            Tab
          </div>
          <div className="rounded-md py-1.5" style={{ backgroundColor: t.hover }} />
          <div className="rounded-md py-1.5" style={{ backgroundColor: t.hover, opacity: 0.65 }} />
          <div className="mt-auto rounded-full border" style={{ borderColor: t.border, backgroundColor: tab.pillBg, height: 14 }} />
        </div>
      </div>
    </div>
  );
}

export default function ThemeTab({ isPremium }: { isPremium: boolean }) {
  const router = useRouter();
  const {
    theme,
    savedTheme,
    previewTheme,
    saveTheme,
    tokens,
    themeSaving,
    themeSaved,
    themeDirty,
  } = useProfileTheme();

  const handleSave = () => {
    if (!themeDirty || themeSaving) return;
    if (!isPremium && !isFreeProfileTheme(theme)) return;
    void saveTheme();
  };

  const handleThemeClick = (id: ProfileThemeId) => {
    if (!isPremium && !isFreeProfileTheme(id)) {
      router.push('/premium');
      return;
    }
    previewTheme(id);
  };

  const saveBlocked = themeDirty && !isPremium && !isFreeProfileTheme(theme);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <ProfileEyebrow>Appearance</ProfileEyebrow>
      <div className="flex items-center gap-2 flex-wrap mb-2">
        <ProfileHeading size="xl" className="!mb-0">Theme</ProfileHeading>
        <span className="shrink-0 text-[9px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full bg-[#22c55e] text-white">
          New
        </span>
      </div>
      <p className="text-sm mb-8 max-w-xl" style={{ color: tokens.muted }}>
        {isPremium
          ? 'Pick a theme to preview it. Click Save theme to keep it on your account.'
          : 'Free accounts can use Light and Telegram. Upgrade to Premium to unlock all themes.'}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl">
        {OPTIONS.map((opt) => {
          const preview = PROFILE_THEMES[opt.id];
          const selected = theme === opt.id;
          const saved = savedTheme === opt.id;
          const locked = !isPremium && !isFreeProfileTheme(opt.id);
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => handleThemeClick(opt.id)}
              className="group relative text-left rounded-2xl border-2 overflow-hidden transition-all hover:scale-[1.01]"
              style={{
                borderColor: selected ? preview.accent : preview.border,
                boxShadow: selected ? `0 0 0 2px ${preview.accent}33, ${preview.cardShadow}` : preview.cardShadow,
              }}
            >
              <div className="relative">
                <ThemePreviewMockup id={opt.id} />
                {locked && (
                  <UpgradePremiumBadge className="absolute top-2.5 right-2.5 z-10" />
                )}
              </div>
              <div
                className="px-4 py-3 flex items-center justify-between border-t gap-2"
                style={{ backgroundColor: preview.card, borderColor: preview.border }}
              >
                <div className="min-w-0">
                  <span className="block text-sm font-bold truncate" style={{ color: preview.text }}>{opt.label}</span>
                  <span className="block text-[10px] truncate mt-0.5" style={{ color: preview.muted }}>
                    {locked ? 'Upgrade to unlock' : selected ? 'Previewing now' : 'Click to preview'}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {!locked && selected && (
                    <span
                      className="text-[9px] font-bold tracking-[0.14em] uppercase px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: preview.accent, color: preview.ink }}
                    >
                      Live
                    </span>
                  )}
                  {!locked && saved && (
                    <span
                      className="text-[9px] font-bold tracking-[0.14em] uppercase px-2 py-0.5 rounded-full border"
                      style={{ backgroundColor: preview.hover, borderColor: preview.border, color: preview.text }}
                    >
                      Saved
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-4 max-w-5xl">
        <button
          type="button"
          onClick={handleSave}
          disabled={!themeDirty || themeSaving || saveBlocked}
          className={`${profileBtnClass} disabled:opacity-40 disabled:cursor-not-allowed`}
          style={{ backgroundColor: tokens.accent, color: tokens.ink }}
        >
          {themeSaving ? 'Saving...' : 'Save theme'}
        </button>
        {saveBlocked && (
          <span className="text-sm font-semibold" style={{ color: tokens.muted }}>
            Premium themes require an upgrade.
          </span>
        )}
        {themeSaved && !themeSaving && (
          <span className="text-sm font-semibold" style={{ color: tokens.accent }}>
            Theme saved to your account.
          </span>
        )}
        {!themeDirty && !themeSaved && (
          <span className="text-sm" style={{ color: tokens.muted }}>
            Your current theme is saved.
          </span>
        )}
      </div>
    </motion.div>
  );
}
