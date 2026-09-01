'use client';

import { useEffect, useState } from 'react';

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
  | { id: string; label: string; type: 'text'; text: string; live?: boolean }
  | { id: string; label: string; type: 'count'; target: number; format: (n: number) => string; live?: boolean };

function buildStatDefs(aiNsfwCount: number, groupsAndBotsCount: number, totalUsers: number): StatDef[] {
  return [
    { id: 'growth', label: 'Month-over-Month Google Growth', type: 'count', target: 40, format: (n) => `${Math.round(n)}%+` },
    { id: 'visits', label: 'Monthly Visits', type: 'count', target: 180, format: (n) => `${Math.round(n)}K+` },
    { id: 'tier1', label: 'US, UK, DE, NL, AU, CA & IT', type: 'text', text: 'Tier 1' },
    { id: 'users', label: 'EROgram users', type: 'count', target: totalUsers, format: (n) => Math.round(n).toLocaleString('en-US'), live: true },
    { id: 'telegram', label: 'Subscribers across our Telegram network', type: 'count', target: 30, format: (n) => `${Math.round(n)}K+` },
    { id: 'creators', label: 'Listed Content Creators', type: 'count', target: 1.8, format: (n) => `${n.toFixed(1)}M+` },
    { id: 'ainsfw', label: 'AI NSFW Tools Listed', type: 'count', target: aiNsfwCount, format: (n) => `${Math.round(n).toLocaleString()}+`, live: true },
    { id: 'groups', label: 'Adult Groups & Bots', type: 'count', target: groupsAndBotsCount, format: (n) => `${Math.round(n).toLocaleString()}+`, live: true },
  ];
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
}: {
  target: number;
  format: (n: number) => string;
  active: boolean;
  live?: boolean;
  accent: string;
}) {
  const value = useCountUp(target, active);
  return (
    <span
      className="font-black text-[1.05rem] sm:text-[1.15rem] leading-none tabular-nums shrink-0 min-w-[4.25rem] sm:min-w-[4.75rem]"
      style={{ color: live ? accent : '#fff' }}
    >
      {active ? format(value) : '—'}
    </span>
  );
}

function StatValue({
  stat,
  active,
  accent,
}: {
  stat: StatDef;
  active: boolean;
  accent: string;
}) {
  if (stat.type === 'text') {
    return (
      <span
        className={`font-black text-[1.05rem] sm:text-[1.15rem] leading-none text-white shrink-0 w-[4.25rem] sm:w-[4.75rem] transition-opacity duration-500 ${active ? 'opacity-100' : 'opacity-0'}`}
      >
        {stat.text}
      </span>
    );
  }

  return <CountStatValue target={stat.target} format={stat.format} active={active} live={stat.live} accent={accent} />;
}

function StatSkeleton() {
  return <div className="h-4 w-14 rounded bg-white/10 animate-pulse shrink-0" />;
}

export default function PartnershipStats({
  aiNsfwCount,
  groupsAndBotsCount,
  totalUsers,
  variant = 'green',
  embedded = false,
}: {
  aiNsfwCount: number;
  groupsAndBotsCount: number;
  totalUsers: number;
  variant?: keyof typeof THEMES;
  embedded?: boolean;
}) {
  const theme = THEMES[variant];
  const stats = buildStatDefs(aiNsfwCount, groupsAndBotsCount, totalUsers);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setActive(true), 120);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <section
      className={
        embedded
          ? 'overflow-hidden'
          : `mb-6 overflow-hidden rounded-2xl border ${theme.borderClass} shadow-[0_16px_40px_-20px_rgba(0,0,0,0.55)]`
      }
      style={{ backgroundColor: theme.surface }}
    >
      <div
        className={`flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-2.5 sm:px-5 border-b ${theme.borderClass}`}
        style={{ background: theme.headerBg }}
      >
        <span className="text-[9px] font-bold tracking-[0.28em] uppercase" style={{ color: theme.accent }}>
          Reach
        </span>
        <h2 className="font-black text-[1rem] sm:text-[1.1rem] leading-none tracking-tight text-white">
          EROGRAM in Numbers
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2">
        {stats.map((stat) => (
          <div
            key={stat.id}
            className="flex items-center gap-2.5 px-3 py-2 sm:px-4 border-b border-white/[0.06] sm:[&:nth-child(odd)]:border-r sm:[&:nth-child(odd)]:border-white/[0.06]"
            style={{
              background: stat.live ? theme.liveStatBg : theme.statBg,
            }}
          >
            {active ? <StatValue stat={stat} active={active} accent={theme.accent} /> : <StatSkeleton />}
            <p className="text-[11px] sm:text-[12px] leading-snug text-white/65 min-w-0">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
