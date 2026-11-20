'use client';

import Image from 'next/image';
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
  whiteBg?: boolean,
  listingsCount?: number,
  hideUsers?: boolean,
  liveAudience?: { pageViews: number; activeVisitors: number } | null,
  monthlyVisitsText = '250 to 300K',
  hideTelegramSubscribers = false,
  hideGeos = false,
  aiNsfwOnlyListings = false,
): StatDef[] {
  const listingStats: StatDef[] = aiNsfwOnlyListings
    ? [{
        id: 'ainsfw',
        label: 'Total AI NSFW tools listed on Erogram',
        type: 'count',
        target: aiNsfwCount,
        format: (n) => `${Math.round(n).toLocaleString()}+`,
        live: true,
      }]
    : combineListings
    ? [{
        id: 'listings',
        label: 'Total AI NSFW tools, TG groups & bots and adult websites listing.',
        type: 'count',
        target: listingsCount ?? (aiNsfwCount + groupsAndBotsCount),
        format: (n) => `${Math.round(n).toLocaleString()}+`,
        live: true,
      }]
    : [
        { id: 'ainsfw', label: 'AI NSFW Tools Listed', type: 'count', target: aiNsfwCount, format: (n) => `${Math.round(n).toLocaleString()}+`, live: true },
        { id: 'groups', label: 'Adult Groups & Bots', type: 'count', target: groupsAndBotsCount, format: (n) => `${Math.round(n).toLocaleString()}+`, live: true },
      ];
  const liveStats: StatDef[] = liveAudience
    ? [
        {
          id: 'totalPageViews',
          label: 'Total page views',
          type: 'count',
          target: liveAudience.pageViews,
          format: (n) => Math.round(n).toLocaleString(),
          live: true,
        },
        ...(liveAudience.activeVisitors > 0
          ? [{
              id: 'browsing',
              label: <>People browsing EROGRAM<span className="font-black text-red-500">X</span> right now</>,
              type: 'count' as const,
              target: liveAudience.activeVisitors,
              format: (n: number) => Math.round(n).toLocaleString(),
              live: true,
            }]
          : []),
      ]
    : [];
  const stats: StatDef[] = [
    ...liveStats,
    { id: 'visits', label: 'Monthly Visits', type: 'text', text: monthlyVisitsText },
    ...(hideGeos
      ? []
      : [{ id: 'tier1', label: geo?.label ?? TOP_GEO_FLAGS, type: 'text' as const, text: geo?.text ?? 'TOP GEOS:' }]),
    ...(hideUsers
      ? []
      : [{ id: 'users', label: <><span className={`font-black ${whiteBg ? 'text-black' : 'text-white'}`}>EROGRAM</span><span className="font-black text-red-500">X</span> users</>, type: 'count' as const, target: totalUsers, format: (n: number) => Math.round(n).toLocaleString('en-US'), live: true }]),
    ...(hideTelegramSubscribers
      ? []
      : [{ id: 'telegram', label: 'Subscribers across our Telegram network', type: 'count' as const, target: 30, format: (n: number) => `${Math.round(n)}K+` }]),
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
      className="font-black text-[1.05rem] sm:text-[1.15rem] leading-none tabular-nums shrink-0"
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
  emphasizeMonthlyVisits = false,
}: {
  stat: StatDef;
  active: boolean;
  accent: string;
  staticColor: string;
  valueTextClass: string;
  emphasizeMonthlyVisits?: boolean;
}) {
  if (stat.type === 'text') {
    const visitsEmphasis =
      emphasizeMonthlyVisits && stat.id === 'visits'
        ? 'text-xl sm:text-2xl text-[#16a34a] tracking-tight'
        : '';
    return (
      <span
        className={`font-black leading-none shrink-0 whitespace-nowrap transition-opacity duration-500 ${valueTextClass} ${visitsEmphasis} ${active ? 'opacity-100' : 'opacity-0'}`}
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
  listingsCount,
  hideUsers = false,
  liveAudience = null,
  whiteStats = false,
  compact = false,
  monthlyVisitsText,
  stackedRows = false,
  headerOnly = false,
  hideReachLabel = false,
  hideTelegramSubscribers = false,
  emphasizeMonthlyVisits = false,
  hideGeos = false,
  aiNsfwOnlyListings = false,
  discoveryBannerTitle = false,
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
  listingsCount?: number;
  hideUsers?: boolean;
  liveAudience?: { pageViews: number; activeVisitors: number } | null;
  whiteStats?: boolean;
  compact?: boolean;
  monthlyVisitsText?: string;
  /** Promo media kit: two columns — name (left), details (right). */
  stackedRows?: boolean;
  /** Media kit: title bar only — no stat rows below. */
  headerOnly?: boolean;
  hideReachLabel?: boolean;
  hideTelegramSubscribers?: boolean;
  /** Mediakit: larger green monthly visits figure */
  emphasizeMonthlyVisits?: boolean;
  hideGeos?: boolean;
  aiNsfwOnlyListings?: boolean;
  /** Mediakit: banner image instead of the EROGRAMX.com title. */
  discoveryBannerTitle?: boolean;
}) {
  const theme = THEMES[variant];
  const stats = buildStatDefs(
    aiNsfwCount,
    groupsAndBotsCount,
    totalUsers,
    pageViews,
    geo,
    combineListings,
    whiteBg || whiteStats,
    listingsCount,
    hideUsers,
    liveAudience,
    monthlyVisitsText,
    hideTelegramSubscribers,
    hideGeos,
    aiNsfwOnlyListings,
  );
  const [active, setActive] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setActive(true), 120);
    return () => window.clearTimeout(t);
  }, []);

  const lightStats = whiteBg || whiteStats;
  const surfaceBg = whiteBg ? '#ffffff' : whiteStats ? '#ffffff' : theme.surface;
  const headerBg = whiteBg ? '#ffffff' : theme.headerBg;
  const statBg = lightStats ? '#ffffff' : theme.statBg;
  const liveStatBg = lightStats ? '#ffffff' : theme.liveStatBg;
  const staticColor = lightStats ? '#111827' : '#fff';
  const valueTextClass = lightStats ? 'text-black' : 'text-white';
  const labelClass = lightStats ? 'text-black/60' : 'text-white/65';
  const headerTextClass = whiteBg ? 'text-black' : 'text-white';
  const cellBorderClass = stackedRows
    ? lightStats
      ? 'border-b border-black/[0.08]'
      : 'border-b border-white/[0.06]'
    : lightStats
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
      {discoveryBannerTitle ? (
        <Image
          src="/assets/erogram-discovery-hub-banner.webp"
          alt="EROGRAM Adult Entertainment Discovery Hub"
          width={1024}
          height={225}
          className="block h-auto w-full"
        />
      ) : (
      <div
        className={`flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b ${theme.borderClass} ${
          compact ? 'px-3 py-1.5 sm:px-4' : 'px-4 py-3 sm:px-5'
        }`}
        style={{ background: headerBg }}
      >
        {!hideReachLabel ? (
          <span className="text-[9px] font-bold tracking-[0.28em] uppercase" style={{ color: theme.accent }}>
            Reach
          </span>
        ) : null}
        <h2 className={`font-black text-[1rem] sm:text-[1.1rem] leading-none tracking-tight ${headerTextClass}`}>
          {redBrandX ? (
            <>
              <span className={`font-black ${whiteBg ? 'text-black' : 'text-white'}`}>EROGRAM</span>
              <span className="font-black text-red-500">X</span>
              .com (Previously Erogram.pro)
            </>
          ) : (
            'EROGRAMX.com (Previously Erogram.pro)'
          )}
        </h2>
      </div>
      )}

      {headerOnly ? null : stackedRows ? (
        <div className="flex flex-col">
          {!compact ? (
            <div
              className="grid grid-cols-2 gap-4 border-b border-black/10 px-4 py-2.5 sm:px-5"
              style={{ background: statBg }}
            >
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-black/45">Name</span>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-black/45 text-right">Details</span>
            </div>
          ) : null}
          {stats.map((stat) => {
            const labelTextClass = compact ? 'text-[11px] leading-snug' : 'text-sm leading-snug';
            const name =
              stat.id === 'tier1' && stat.type === 'text' ? (
                <span className={`font-semibold text-black ${labelTextClass}`}>{stat.text}</span>
              ) : (
                <span className={`font-semibold min-w-0 ${labelClass} ${labelTextClass}`}>{stat.label}</span>
              );
            const details = active ? (
              stat.id === 'tier1' && stat.type === 'text' ? (
                <span className={`font-semibold text-black text-right ${labelTextClass}`}>{stat.label}</span>
              ) : (
                <div className="flex justify-end">
                  <StatValue
                    stat={stat}
                    active={active}
                    accent={theme.accent}
                    staticColor={staticColor}
                    valueTextClass={valueTextClass}
                    emphasizeMonthlyVisits={emphasizeMonthlyVisits}
                  />
                </div>
              )
            ) : (
              <div className="flex justify-end">
                <StatSkeleton whiteBg={lightStats} />
              </div>
            );
            return (
              <div
                key={stat.id}
                className={`grid grid-cols-[minmax(0,1fr)_auto] gap-2 sm:gap-3 items-center ${cellBorderClass} ${
                  compact ? 'px-3 py-2 sm:px-4' : 'px-4 py-3 sm:px-5'
                }`}
                style={{ background: stat.live ? liveStatBg : statBg }}
              >
                <div className="min-w-0">{name}</div>
                <div className="min-w-0">{details}</div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2">
          {stats.map((stat) => (
            <div
              key={stat.id}
              className={`flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:gap-2.5 ${cellBorderClass} ${
                compact ? 'px-4 py-3 sm:px-4 sm:py-2' : 'px-4 py-3 sm:px-4 sm:py-2.5'
              }`}
              style={{
                background: stat.live ? liveStatBg : statBg,
              }}
            >
              {stat.id === 'tier1' && stat.type === 'text' ? (
                <div className="flex flex-col gap-2 w-full sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                  <span className={`text-sm font-black leading-snug ${valueTextClass}`}>{stat.text}</span>
                  <span className="text-lg leading-none">{stat.label}</span>
                </div>
              ) : (
                <>
                  {active ? (
                    <StatValue
                      stat={stat}
                      active={active}
                      accent={theme.accent}
                      staticColor={staticColor}
                      valueTextClass={`${valueTextClass} text-xl sm:text-[1.15rem]`}
                      emphasizeMonthlyVisits={emphasizeMonthlyVisits}
                    />
                  ) : (
                    <StatSkeleton whiteBg={whiteBg} />
                  )}
                  <p className={`text-sm sm:text-[12px] leading-snug min-w-0 ${labelClass}`}>
                    {stat.label}
                  </p>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
