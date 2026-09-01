'use client';

import { useMemo } from 'react';
import type { ReactNode } from 'react';

const MOSAIC_COLS = 10;
const MOSAIC_ROWS = 22;

function buildMosaicTiles(avatars: string[]): string[] {
  if (!avatars.length) return [];
  const total = MOSAIC_COLS * MOSAIC_ROWS;
  return Array.from({ length: total }, (_, i) => avatars[i % avatars.length]);
}

export function AuthAvatarBackground({
  avatars,
  isAinsfwTheme,
}: {
  avatars: string[];
  isAinsfwTheme: boolean;
}) {
  const tiles = useMemo(() => buildMosaicTiles(avatars), [avatars]);

  if (!tiles.length) {
    return (
      <div className="absolute inset-0 pointer-events-none bg-[#060d17]">
        {isAinsfwTheme ? (
          <>
            <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-black rounded-full blur-[200px] opacity-[0.35]" />
            <div className="absolute bottom-1/4 right-1/3 w-[400px] h-[400px] bg-black rounded-full blur-[180px] opacity-[0.25]" />
          </>
        ) : (
          <>
            <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-[#00AFF0] rounded-full blur-[200px] opacity-[0.06]" />
            <div className="absolute bottom-1/4 right-1/3 w-[400px] h-[400px] bg-[#00D4FF] rounded-full blur-[180px] opacity-[0.04]" />
          </>
        )}
      </div>
    );
  }

  const overlay = isAinsfwTheme ? '#000000' : '#0a1525';

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none bg-[#060d17]">
      <div
        className="absolute inset-x-0 top-0 w-full"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${MOSAIC_COLS}, 1fr)`,
          gridAutoRows: '10vw',
          gap: '2px',
        }}
      >
        {tiles.map((src, i) => (
          <div key={i} className="relative overflow-hidden bg-[#060d17]">
            <img
              src={src}
              alt=""
              className="block w-full h-full object-cover"
              style={{ aspectRatio: '1 / 1' }}
              loading={i < 30 ? 'eager' : 'lazy'}
              referrerPolicy="no-referrer"
            />
          </div>
        ))}
      </div>
      <div
        className="absolute inset-0"
        style={{ backgroundColor: overlay, opacity: 0.38 }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: isAinsfwTheme
            ? 'radial-gradient(ellipse 72% 62% at 50% 44%, transparent 0%, rgba(0,0,0,0.42) 52%, rgba(0,0,0,0.92) 100%)'
            : 'radial-gradient(ellipse 72% 62% at 50% 44%, transparent 0%, rgba(10,21,37,0.42) 52%, rgba(10,21,37,0.92) 100%)',
        }}
      />
    </div>
  );
}

export function AuthCard({
  isAinsfwTheme,
  children,
  wide,
}: {
  isAinsfwTheme: boolean;
  children: ReactNode;
  wide?: boolean;
}) {
  if (isAinsfwTheme) {
    return (
      <div className="relative rounded-2xl border border-black/10 bg-white p-4 sm:p-5 shadow-2xl shadow-black/40">
        {children}
      </div>
    );
  }

  return (
    <div
      className="relative rounded-2xl border border-[#00AFF0]/20 p-4 sm:p-5 shadow-2xl shadow-black/50"
      style={{
        background: 'linear-gradient(155deg, #060d17 0%, #0a1525 100%)',
        boxShadow: '0 12px 32px -12px rgba(6, 13, 23, 0.55)',
      }}
    >
      {children}
    </div>
  );
}

export function AuthTabToggle({
  tab,
  setTab,
  isAinsfwTheme,
}: {
  tab: 'join' | 'signin';
  setTab: (t: 'join' | 'signin') => void;
  isAinsfwTheme: boolean;
}) {
  return (
    <div
      className={`flex items-center rounded-lg p-0.5 mb-3 ${
        isAinsfwTheme
          ? 'bg-black/[0.05] border border-black/10'
          : 'bg-white/[0.06] border border-white/10'
      }`}
    >
      {([
        { id: 'join' as const, label: 'Create account' },
        { id: 'signin' as const, label: 'Sign in' },
      ]).map(({ id, label }) => (
        <button
          key={id}
          type="button"
          onClick={() => setTab(id)}
          className={`flex-1 py-2 rounded-md text-xs font-bold transition-all ${
            tab === id
              ? isAinsfwTheme
                ? 'bg-[#22c55e] text-black'
                : 'bg-[#00AFF0] text-white'
              : isAinsfwTheme
                ? 'text-black/45 hover:text-black/70'
                : 'text-white/45 hover:text-white/70'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
