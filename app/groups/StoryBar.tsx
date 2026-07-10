'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import type { StoryCategory } from './types';
import { useTranslation, useLocale } from '@/lib/i18n';

interface StoryBarProps {
  storyData?: StoryCategory[];
  seenStoryMap?: Record<string, string>;
  onOpenStory?: (categoryIndex: number) => void;
  /** 🔥 Trending categories — top 6 by group count (computed server-side). */
  trendingCategories?: Array<{ label: string; href: string }>;
  /** 🌍 Trending countries — top 6 by group count (computed server-side). */
  trendingCountries?: Array<{ label: string; href: string }>;
  onToggleFilter?: () => void;
  filterOpen?: boolean;
  activeFilterCount?: number;
}

// Fallback used only if the server didn't pass trending categories (e.g. DB hiccup).
const FALLBACK_CATEGORIES: Array<{ label: string; href: string }> = [
  { label: 'Telegram Porn', href: '/best-telegram-groups/telegram-porn' },
  { label: 'Amateur', href: '/best-telegram-groups/amateur' },
  { label: 'Cosplay', href: '/best-telegram-groups/cosplay' },
  { label: 'Onlyfans', href: '/best-telegram-groups/onlyfans' },
  { label: 'Latina', href: '/best-telegram-groups/latina' },
  { label: 'Blowjob', href: '/best-telegram-groups/blowjob' },
];
const FALLBACK_COUNTRIES: Array<{ label: string; href: string }> = [
  { label: 'USA', href: '/best-telegram-groups/usa' },
  { label: 'Brazil', href: '/best-telegram-groups/brazil' },
  { label: 'UK', href: '/best-telegram-groups/uk' },
  { label: 'Germany', href: '/best-telegram-groups/germany' },
  { label: 'Italy', href: '/best-telegram-groups/italy' },
  { label: 'Spain', href: '/best-telegram-groups/spain' },
];

function TrendingRow({ heading, items }: { heading: string; items: Array<{ label: string; href: string }> }) {
  return (
    <div className="flex items-baseline gap-1.5 flex-wrap">
      <span
        className="text-[11px] font-black uppercase tracking-wider shrink-0 mr-0.5"
        style={{
          backgroundImage: 'linear-gradient(135deg, #ff5e2a, #ff9432)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
        }}
      >
        TOP {heading}
      </span>
        {items.map(({ label, href }) => (
        <Link
          key={href}
          href={href}
          className="px-2.5 py-1 text-[12px] font-semibold rounded-full transition-all duration-200 whitespace-nowrap hover:scale-105 text-gray-200 hover:text-white"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)' }}
        >
          {getCatDisplay(label)}
        </Link>
      ))}
    </div>
  );
}

export default function StoryBar({ trendingCategories = [], trendingCountries = [], onToggleFilter, filterOpen = false, activeFilterCount = 0 }: StoryBarProps) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const cats = trendingCategories.length > 0 ? trendingCategories.slice(0, 6) : FALLBACK_CATEGORIES;
  const countries = (trendingCountries.length > 0 ? trendingCountries : FALLBACK_COUNTRIES).slice(0, 4);

  const getCatDisplay = (label: string) => {
    if (locale !== 'de') return label;
    const m: Record<string, string> = {
      'Onlyfans': 'OnlyFans', 'Instagram Models': 'Instagram-Models', 'Feet': 'Füße', 'MILF': 'MILF',
      'BDSM': 'BDSM', 'Fetish': 'Fetisch', 'Latina': 'Latinas', 'Cosplay': 'Cosplay',
      'Onlyfans Leaks': 'OnlyFans Leaks', 'TikTok': 'TikTok', 'Asian': 'Asiatisch',
      'Blowjob': 'Blowjob', 'Amateur': 'Amateur', 'Lesbian': 'Lesbisch', 'Uncensored AV': 'Unzensiertes AV',
      'Telegram Porn': 'Telegram Porn',
    };
    return m[label] || label;
  };

  return (
    <section className="mt-4 mb-3">
      <h3 className="sr-only">Trending Telegram Groups</h3>

      <nav aria-label="Trending Telegram group categories" className="rounded-2xl px-4 py-3.5 flex items-center gap-3" style={{ background: 'linear-gradient(135deg, #131a24, #0d1117)', border: '1px solid rgba(255,255,255,0.08)' }}>
        {/* Trending area — inline headings, wrapping pills (compact) */}
        <div className="flex flex-col gap-2 flex-1 min-w-0 max-w-[640px]">
          <TrendingRow heading="CATEGORIES" items={cats} />
          <TrendingRow heading="COUNTRIES" items={countries} />
        </div>

        {/* Right: visiting now only on mobile (Filter moved to bottom CTA row). On desktop show Filter here. */}
        <div className="shrink-0 flex items-center gap-3 pl-3 self-stretch" style={{ borderLeft: '1px solid rgba(255,255,255,0.08)' }}>
          {onToggleFilter && (
            <button
              onClick={onToggleFilter}
              aria-expanded={filterOpen}
              aria-label="Toggle filters"
              className="hidden lg:flex items-center gap-1 px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-wide transition-all duration-200 hover:brightness-110 active:scale-95"
              style={
                filterOpen
                  ? { background: '#334155', border: '1px solid transparent', color: '#ffffff' }
                  : activeFilterCount > 0
                    ? { background: 'linear-gradient(135deg, #6fd44a, #43c326)', border: '1px solid transparent', color: '#052e16', boxShadow: '0 4px 14px -5px rgba(67,195,38,0.5)' }
                    : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: '#d1d5db' }
              }
            >
              {filterOpen ? (
                <>
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                  CLOSE
                </>
              ) : (
                <>
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                  </svg>
                  Filter
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                  {activeFilterCount > 0 && (
                    <span className="flex items-center justify-center min-w-[12px] h-[12px] px-0.5 rounded-full bg-[#052e16] text-[6px] font-black text-[#6fd44a]">
                      {activeFilterCount}
                    </span>
                  )}
                </>
              )}
            </button>
          )}

          <VisitingNowCard />
        </div>
      </nav>
    </section>
  );
}

function VisitingNowCard() {
  const [count, setCount] = useState(0);

  const fetchCount = useCallback(() => {
    fetch('/api/advertise-stats', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => { if (typeof d.activeVisitors === 'number') setCount(d.activeVisitors); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchCount();
    const id = setInterval(fetchCount, 300_000);
    return () => clearInterval(id);
  }, [fetchCount]);

  return (
    <div className="flex items-center gap-1.5 text-[13px]">
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
      </span>
      <span className="font-black text-white/90 tabular-nums leading-none text-[15px]">{count > 0 ? count.toLocaleString('en-US') : '—'}</span>
      <span className="text-[10px] font-medium text-white/40 whitespace-nowrap leading-none">visiting now</span>
    </div>
  );
}

