'use client';

import { Bookmark, Rocket, Search, Shield } from 'lucide-react';

export const JOIN_BENEFITS = [
  { icon: Search, text: 'Browse thousands of profiles by niche' },
  { icon: Bookmark, text: 'Bookmark and save your favourites' },
  { icon: Rocket, text: 'Unlock the full Erogram experience' },
  { icon: Shield, text: 'Unlock beta features' },
] as const;

export default function AuthJoinBenefits({ isAinsfwTheme }: { isAinsfwTheme: boolean }) {
  const accent = isAinsfwTheme ? '#22c55e' : '#00AFF0';
  const panelBg = isAinsfwTheme
    ? 'linear-gradient(155deg, #000000 0%, #0a0a0a 100%)'
    : 'linear-gradient(155deg, #060d17 0%, #0a1525 100%)';

  return (
    <div
      className="relative overflow-hidden rounded-xl p-3 sm:p-4"
      style={{
        background: panelBg,
        border: `1px solid ${isAinsfwTheme ? 'rgba(34, 197, 94, 0.18)' : 'rgba(0, 175, 240, 0.18)'}`,
        boxShadow: isAinsfwTheme
          ? '0 12px 32px -12px rgba(0, 0, 0, 0.55)'
          : '0 12px 32px -12px rgba(6, 13, 23, 0.55)',
      }}
    >
      <div
        className="pointer-events-none absolute -top-8 -right-8 h-28 w-28 rounded-full blur-3xl"
        style={{ background: `${accent}22` }}
      />
      <div
        className="pointer-events-none absolute -bottom-10 -left-6 h-24 w-24 rounded-full blur-3xl"
        style={{ background: isAinsfwTheme ? 'rgba(34, 197, 94, 0.1)' : 'rgba(0, 175, 240, 0.1)' }}
      />

      <div className="relative grid grid-cols-2 md:grid-cols-1 gap-2">
        {JOIN_BENEFITS.map(({ icon: Icon, text }) => (
          <div
            key={text}
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.06] px-2.5 py-2 backdrop-blur-sm"
          >
            <div
              className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md"
              style={{ background: `${accent}18`, border: `1px solid ${accent}33` }}
            >
              <Icon className="h-3 w-3" style={{ color: accent }} />
            </div>
            <span className="text-[11px] sm:text-xs font-medium leading-tight text-white/88">{text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
