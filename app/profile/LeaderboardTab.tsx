'use client';

import { useEffect, useState } from 'react';
import { getActiveUserLeaderboard, type LeaderboardEntry, type LeaderboardPeriod } from '@/lib/actions/userLeaderboard';
import { useProfileTheme } from './ProfileThemeContext';
import { ProfileHeading } from './ProfileTypography';
import type { ProfileThemeTokens } from './profileTheme';

function rankStyle(rank: number): { bg: string; color: string } {
  if (rank === 1) return { bg: 'rgba(201,151,58,0.25)', color: '#c9973a' };
  if (rank === 2) return { bg: 'rgba(160,160,170,0.2)', color: '#a8a8b3' };
  if (rank === 3) return { bg: 'rgba(180,120,80,0.2)', color: '#b87850' };
  return { bg: 'rgba(255,255,255,0.06)', color: 'inherit' };
}

function formatLastLogin(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function LeaderboardAvatar({
  photoUrl,
  name,
  tokens,
}: {
  photoUrl: string | null;
  name: string;
  tokens: ProfileThemeTokens;
}) {
  const [failed, setFailed] = useState(false);
  const initial = name.charAt(0).toUpperCase();

  if (!photoUrl || failed) {
    return (
      <span
        className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold leading-none"
        style={{ backgroundColor: tokens.hover, color: tokens.muted }}
      >
        {initial}
      </span>
    );
  }

  return (
    <img
      src={photoUrl}
      alt=""
      className="w-7 h-7 rounded-full object-cover shrink-0"
      referrerPolicy="no-referrer"
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

const PERIODS: { key: LeaderboardPeriod; label: string }[] = [
  { key: 'all', label: 'All time' },
  { key: '30d', label: '30 days' },
  { key: '7d', label: '7 days' },
];

function LeaderboardList({
  entries,
  loading,
  tokens,
}: {
  entries: LeaderboardEntry[];
  loading: boolean;
  tokens: ProfileThemeTokens;
}) {
  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ borderColor: tokens.border, backgroundColor: tokens.hover }}
    >
      <div
        className="hidden sm:grid grid-cols-[2.5rem_1fr_5rem_4rem_6.5rem] gap-2 px-3 py-2 text-[9px] font-bold uppercase tracking-[0.12em] border-b"
        style={{ color: tokens.muted, borderColor: tokens.border, backgroundColor: tokens.card }}
      >
        <span>#</span>
        <span>Member</span>
        <span className="text-right">Score</span>
        <span className="text-center">Flag</span>
        <span className="text-right">Last login</span>
      </div>

      <div className="divide-y" style={{ borderColor: tokens.border }}>
        {loading ? (
          Array.from({ length: 12 }, (_, i) => (
            <div key={i} className="h-10 animate-pulse" style={{ backgroundColor: tokens.card }} />
          ))
        ) : entries.length === 0 ? (
          <p className="text-[12px] px-4 py-6 text-center" style={{ color: tokens.muted }}>
            No activity yet.
          </p>
        ) : (
          entries.map((entry) => {
            const rs = rankStyle(entry.rank);
            return (
              <div
                key={entry.userId}
                className="grid grid-cols-[2.5rem_1fr_auto] sm:grid-cols-[2.5rem_1fr_5rem_4rem_6.5rem] gap-2 items-center px-3 py-2"
                style={{
                  backgroundColor: entry.isCurrentUser ? tokens.hover : tokens.card,
                  outline: entry.isCurrentUser ? `1px inset ${tokens.border}` : undefined,
                }}
              >
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black tabular-nums"
                  style={{ backgroundColor: rs.bg, color: rs.color === 'inherit' ? tokens.muted : rs.color }}
                >
                  {entry.rank}
                </span>

                <div className="flex items-center gap-2 min-w-0">
                  <LeaderboardAvatar photoUrl={entry.photoUrl} name={entry.displayName} tokens={tokens} />
                  {entry.countryFlag ? (
                    <span className="text-sm leading-none shrink-0 sm:hidden" aria-hidden>
                      {entry.countryFlag}
                    </span>
                  ) : null}
                  <span className="text-[12px] font-semibold truncate" style={{ color: tokens.text }}>
                    {entry.displayName}
                  </span>
                </div>

                <span className="text-[11px] font-bold tabular-nums text-right sm:order-none order-last col-span-1" style={{ color: tokens.muted }}>
                  {entry.score}
                </span>

                <span className="hidden sm:block text-center text-sm leading-none">
                  {entry.countryFlag || '—'}
                </span>

                <span className="hidden sm:block text-[10px] tabular-nums text-right whitespace-nowrap" style={{ color: tokens.muted }}>
                  {formatLastLogin(entry.lastLogin)}
                </span>

                <span className="sm:hidden col-span-3 text-[10px] pl-9 -mt-1" style={{ color: tokens.muted }}>
                  Last login: {formatLastLogin(entry.lastLogin)}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function LeaderboardTab({ currentUserId }: { currentUserId?: string | null }) {
  const { tokens } = useProfileTheme();
  const [period, setPeriod] = useState<LeaderboardPeriod>('all');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getActiveUserLeaderboard(currentUserId, 100, period)
      .then((rows) => { if (!cancelled) setEntries(rows); })
      .catch(() => { if (!cancelled) setEntries([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [currentUserId, period]);

  return (
    <div>
      <ProfileHeading size="xl" className="mb-4">Leaderboard</ProfileHeading>

      <div
        className="inline-flex flex-wrap gap-0 mb-4 rounded-lg border overflow-hidden"
        style={{ borderColor: tokens.border }}
      >
        {PERIODS.map((item) => {
          const active = period === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setPeriod(item.key)}
              className="px-4 py-2 text-[11px] font-bold uppercase tracking-[0.08em] transition-colors border-r last:border-r-0"
              style={{
                borderColor: tokens.border,
                backgroundColor: active ? tokens.accent : tokens.card,
                color: active ? tokens.ink : tokens.muted,
              }}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <LeaderboardList entries={entries} loading={loading} tokens={tokens} />
    </div>
  );
}
