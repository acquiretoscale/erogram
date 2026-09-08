'use client';

import { useEffect, useState, type ReactNode } from 'react';

const THEMES = {
  green: {
    accent: '#22c55e',
    surface: '#0a1f12',
    headerBg: 'linear-gradient(160deg, #04140c 0%, #0a2e1a 60%, #064e3b 100%)',
    statBg: 'linear-gradient(180deg, rgba(34,197,94,0.06) 0%, rgba(255,255,255,0.02) 100%)',
    liveStatBg: 'linear-gradient(90deg, rgba(34,197,94,0.14) 0%, rgba(255,255,255,0.02) 70%)',
    borderClass: 'border-[#22c55e]/15',
  },
  onlyfans: {
    accent: '#00AFF0',
    surface: '#0a1628',
    headerBg: 'linear-gradient(160deg, #041828 0%, #0a2840 55%, #0d3550 100%)',
    statBg: 'linear-gradient(180deg, rgba(0,175,240,0.06) 0%, rgba(255,255,255,0.02) 100%)',
    liveStatBg: 'linear-gradient(90deg, rgba(0,175,240,0.14) 0%, rgba(255,255,255,0.02) 70%)',
    borderClass: 'border-[#00AFF0]/15',
  },
} as const;

type StatDef =
  | { id: string; label: ReactNode; type: 'text'; text: string; live?: boolean }
  | { id: string; label: ReactNode; type: 'count'; target: number; format: (n: number) => string; live?: boolean };

const TOP_GEO_FLAGS = (
  <span
    className="text-[17px] leading-none"
    style={{
      color: 'black',
      fontFamily: '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif',
    }}
  >
    🇺🇸 🇩🇪 🇧🇷 🇳🇱 🇪🇸 🇬🇧 🇨🇦
  </span>
);

function buildStatDefs(
  aiNsfwCount: number,
  groupsAndBotsCount: number,
  totalUsers: number,
  pageViews?: number | null,
  geo?: { text: string; label: ReactNode },
  combineListings?: boolean,
): StatDef[] {
  const listingStats: StatDef[] = combineListings
    ? [{
        id: 'listings',
        label: 'Total AI NSFW tools, TG groups & bots and adult websites listing.',
        type: 'count',
        target: aiNsfwCount + groupsAndBotsCount,
        format: (n) => `${Math.round(n).toLocaleString()}+`,
        live: true,
      }]
    : [
        { id: 'ainsfw', label: 'AI NSFW Tools Listed', type: 'count', target: aiNsfwCount, format: (n) => `${Math.round(n).toLocaleString()}+`, live: true },
        { id: 'groups', label: 'Adult Groups & Bots', type: 'count', target: groupsAndBotsCount, format: (n) => `${Math.round(n).toLocaleString()}+`, live: true },
      ];
  const stats: StatDef[] = [
    { id: 'growth', label: 'Month-over-Month Google Growth', type: 'count', target: 40, format: (n) => `${Math.round(n)}%+` },
    { id: 'visits', label: 'Monthly Visits', type: 'count', target: 280, format: (n) => `${Math.round(n)}K+` },
    { id: 'tier1', label: geo?.label ?? TOP_GEO_FLAGS, type: 'text', text: geo?.text ?? 'TOP GEOS:' },
    { id: 'users', label: <><span className="font-black text-white">EROGRAM</span><span className="font-black text-red-500">X</span> users</>, type: 'count', target: totalUsers, format: (n) => Math.round(n).toLocaleString('en-US'), live: true },
    { id: 'telegram', label: 'Subscribers across our Telegram network', type: 'count', target: 30, format: (n) => `${Math.round(n)}K+` },
    ...listingStats,
  ];
  if (pageViews !== undefined) {
    stats.push({
      id: 'pageviews',
      label: 'Page views',
      type: 'count',
      target: pageViews ?? 0,
      format: (n) => (pageViews == null ? '—' : Math.round(n).toLocaleString('en-US')),
      live: true,
    });
  }
  return stats;
}

function useCountUp(target: number, active: boolean, duration = 1000) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active) return;
    setValue(0);
    const start = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(target * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, active, duration]);

  return value;
}

function CountStatValue({
  target,
  format,
  active,
  live = false,
  accent,
  staticColor,
}: {
  target: number;
  format: (n: number) => string;
  active: boolean;
  live?: boolean;
  accent: string;
  staticColor: string;
}) {
  const value = useCountUp(target, active);
  return (
    <span
      className="font-black text-[1.05rem] sm:text-[1.15rem] leading-none tabular-nums shrink-0 min-w-[4.25rem] sm:min-w-[4.75rem]"
      style={{ color: live ? accent : staticColor }}
    >
      {active ? format(value) : '—'}
    </span>
  );
}

function StatValue({
  stat,
  active,
  accent,
  staticColor,
  valueTextClass,
}: {
  stat: StatDef;
  active: boolean;
  accent: string;
  staticColor: string;
  valueTextClass: string;
}) {
  if (stat.type === 'text') {
    return (
      <span
        className={`font-black text-[1.05rem] sm:text-[1.15rem] leading-none shrink-0 whitespace-nowrap min-w-[4.25rem] sm:min-w-[4.75rem] transition-opacity duration-500 ${valueTextClass} ${active ? 'opacity-100' : 'opacity-0'}`}
      >
        {stat.text}
      </span>
    );
  }

  return (
    <CountStatValue
      target={stat.target}
      format={stat.format}
      active={active}
      live={stat.live}
      accent={accent}
      staticColor={staticColor}
    />
  );
}

function StatSkeleton({ whiteBg }: { whiteBg: boolean }) {
  return <div className={`h-4 w-14 rounded animate-pulse shrink-0 ${whiteBg ? 'bg-black/10' : 'bg-white/10'}`} />;
}

export default function PartnershipStats({
  aiNsfwCount,
  groupsAndBotsCount,
  totalUsers,
  pageViews,
  variant = 'green',
  embedded = false,
  redBrandX = false,
  whiteBg = false,
  geo,
  combineListings = false,
}: {
  aiNsfwCount: number;
  groupsAndBotsCount: number;
  totalUsers: number;
  pageViews?: number | null;
  variant?: keyof typeof THEMES;
  embedded?: boolean;
  redBrandX?: boolean;
  whiteBg?: boolean;
  geo?: { text: string; label: ReactNode };
  combineListings?: boolean;
}) {
  const theme = THEMES[variant];
  const stats = buildStatDefs(aiNsfwCount, groupsAndBotsCount, totalUsers, pageViews, geo, combineListings);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setActive(true), 120);
    return () => window.clearTimeout(t);
  }, []);

  const surfaceBg = whiteBg ? '#ffffff' : theme.surface;
  const headerBg = whiteBg ? '#ffffff' : theme.headerBg;
  const statBg = whiteBg ? '#ffffff' : theme.statBg;
  const liveStatBg = whiteBg ? '#ffffff' : theme.liveStatBg;
  const staticColor = whiteBg ? '#111827' : '#fff';
  const valueTextClass = whiteBg ? 'text-black' : 'text-white';
  const labelClass = whiteBg ? 'text-black/60' : 'text-white/65';
  const headerTextClass = whiteBg ? 'text-black' : 'text-white';
  const cellBorderClass = whiteBg
    ? 'border-b border-black/[0.06] sm:[&:nth-child(odd)]:border-r sm:[&:nth-child(odd)]:border-black/[0.06]'
    : 'border-b border-white/[0.06] sm:[&:nth-child(odd)]:border-r sm:[&:nth-child(odd)]:border-white/[0.06]';

  return (
    <section
      className={
        embedded
          ? 'overflow-hidden'
          : `mb-6 overflow-hidden rounded-2xl border ${theme.borderClass} shadow-[0_16px_40px_-20px_rgba(0,0,0,0.55)]`
      }
      style={{ backgroundColor: surfaceBg }}
    >
      <div
        className={`flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-3 sm:px-5 border-b ${theme.borderClass}`}
        style={{ background: headerBg }}
      >
        <span className="text-[9px] font-bold tracking-[0.28em] uppercase" style={{ color: theme.accent }}>
          Reach
        </span>
        <h2 className={`font-black text-[1rem] sm:text-[1.1rem] leading-none tracking-tight ${headerTextClass}`}>
          {redBrandX ? (
            <>
              <span className="font-black text-white">EROGRAM</span>
              <span className="font-black text-red-500">X</span>
              .com (Previously Erogram.pro)
            </>
          ) : (
            'EROGRAMX.com (Previously Erogram.pro)'
          )}
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2">
        {stats.map((stat) => (
          <div
            key={stat.id}
            className={`flex items-center gap-2.5 px-3 py-2 sm:px-4 ${cellBorderClass}`}
            style={{
              background: stat.live ? liveStatBg : statBg,
            }}
          >
            {active ? (
              <StatValue
                stat={stat}
                active={active}
                accent={theme.accent}
                staticColor={staticColor}
                valueTextClass={valueTextClass}
              />
            ) : (
              <StatSkeleton whiteBg={whiteBg} />
            )}
            <p className={`text-[11px] sm:text-[12px] leading-snug min-w-0 ${stat.id === 'tier1' ? '' : labelClass}`}>{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
