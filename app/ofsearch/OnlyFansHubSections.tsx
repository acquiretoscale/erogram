'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, Bookmark, Filter, TrendingUp, Globe } from 'lucide-react';
import { OF_CATEGORIES, OF_CATEGORY_MAP } from './constants';
import { getTopBestOfByType } from '@/app/best-onlyfans-accounts/bestOfPages';
import { rankingEnglishPublicPath } from '@/lib/bestOfPageContent/hottestUrls';
import { ofCreatorProfileUrl } from '@/lib/ofsearch/creatorUrls';
import { useTranslation, useLocalePath } from '@/lib/i18n/client';

const OF_CATEGORY_TABS = [
  { id: 'age', label: 'Age', slugs: ['teen', 'milf', 'mature', 'student'] },
  { id: 'ethnicity', label: 'Ethnicity', slugs: ['asian', 'latina', 'ebony', 'arab', 'colombian', 'brazilian', 'british'] },
  { id: 'hair', label: 'Hair', slugs: ['blonde', 'brunette', 'redhead'] },
  { id: 'body', label: 'Body type', slugs: ['petite', 'big-ass', 'big-boobs', 'curvy', 'thick', 'bbw', 'chubby', 'muscle'] },
  {
    id: 'style',
    label: 'Style & look',
    slugs: ['goth', 'alt', 'cosplay', 'lingerie', 'tattoo', 'piercing', 'fitness', 'influencer', 'celebrity', 'streamer', 'amateur'],
  },
  {
    id: 'specialty',
    label: 'Specialty / kink',
    slugs: ['joi', 'bdsm', 'feet', 'anal', 'asmr', 'roleplay', 'findom', 'ahegao', 'squirt', 'twerk', 'blowjob', 'submissive', 'nurse', 'teacher', 'housewife', 'pregnant', 'pornstar', 'no-ppv', 'couple', 'lesbian'],
  },
] as const;

interface TrendingChartItem {
  _id: string;
  name: string;
  username: string;
  slug: string;
  avatar: string;
  rank: number;
}

interface FeaturedTrendingItem {
  _id: string;
  name: string;
  username: string;
  avatar: string;
  likesCount?: number;
  url?: string;
  destinationUrl?: string;
}

function hubFormatCount(n: number) {
  if (!n) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}

/** Explore by country — main markets + owner picks on /onlyfans homepage. */
const EXPLORE_COUNTRY_MARKETS = [
  { slug: 'american', flag: '🇺🇸', label: 'United States' },
  { slug: 'british', flag: '🇬🇧', label: 'United Kingdom' },
  { slug: 'canadian', flag: '🇨🇦', label: 'Canada' },
  { slug: 'spanish', flag: '🇪🇸', label: 'Spain' },
  { slug: 'german', flag: '🇩🇪', label: 'Germany' },
  { slug: 'french', flag: '🇫🇷', label: 'France' },
  { slug: 'colombian', flag: '🇨🇴', label: 'Colombian', bestOnlyfansLabel: true },
  { slug: 'australian', flag: '🇦🇺', label: 'Australian', bestOnlyfansLabel: true },
  { slug: 'ukrainian', flag: '🇺🇦', label: 'Ukrainian', bestOnlyfansLabel: true },
] as const;

function getCountryPageMap() {
  return new Map(getTopBestOfByType('country', 200).map((p) => [p.slug, p]));
}

function getExploreCountryMarkets() {
  const map = getCountryPageMap();
  return EXPLORE_COUNTRY_MARKETS.filter((m) => map.has(m.slug));
}

function openCreatorProfile(username: string) {
  const path = ofCreatorProfileUrl(username);
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
  if (!token) {
    window.open(`/join-erogram?redirect=${encodeURIComponent(path)}`, '_blank', 'noopener,noreferrer');
    return;
  }
  window.open(path, '_blank', 'noopener,noreferrer');
}

function bestCategoryHref(slug: string, lp: (p: string) => string) {
  return lp(rankingEnglishPublicPath(slug, 'best'));
}

export function OnlyFansHubStats({ totalCreators }: { totalCreators: number }) {
  const countryCount = EXPLORE_COUNTRY_MARKETS.length;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-4" aria-label="Directory stats">
      <p className="text-center text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-[#00AFF0]/70 mb-3">
        Live data
      </p>
      <div className="grid grid-cols-3 gap-3 sm:gap-6 max-w-2xl mx-auto">
        <div className="text-center">
          <p className="text-xl sm:text-2xl font-black text-white tabular-nums">{hubFormatCount(totalCreators)}</p>
          <p className="text-[10px] sm:text-xs text-white/40 font-semibold mt-0.5">profiles</p>
        </div>
        <div className="text-center">
          <p className="text-xl sm:text-2xl font-black text-white tabular-nums">{OF_CATEGORIES.length}</p>
          <p className="text-[10px] sm:text-xs text-white/40 font-semibold mt-0.5">categories</p>
        </div>
        <div className="text-center">
          <p className="text-xl sm:text-2xl font-black text-white tabular-nums">{countryCount}</p>
          <p className="text-[10px] sm:text-xs text-white/40 font-semibold mt-0.5">countries</p>
        </div>
      </div>
    </section>
  );
}

export function OnlyFansCategoryBrowser() {
  const lp = useLocalePath();
  const [activeTab, setActiveTab] = useState<(typeof OF_CATEGORY_TABS)[number]['id']>(
    OF_CATEGORY_TABS[0].id,
  );

  const tabs = useMemo(
    () =>
      OF_CATEGORY_TABS.map((tab) => ({
        ...tab,
        items: tab.slugs.map((slug) => OF_CATEGORY_MAP.get(slug)).filter(Boolean) as (typeof OF_CATEGORIES)[number][],
      })).filter((tab) => tab.items.length > 0),
    [],
  );

  const active = tabs.find((t) => t.id === activeTab) || tabs[0];

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8" aria-label="Search by category">
      <h2 className="text-lg sm:text-xl font-black text-white text-center mb-4 sm:mb-5">Search by Category</h2>
      <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2 mb-4 sm:mb-5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-full text-[11px] sm:text-xs font-bold transition-all ${
              active?.id === tab.id
                ? 'bg-[#00AFF0] text-white shadow-lg shadow-[#00AFF0]/25'
                : 'bg-white/[0.06] border border-white/[0.10] text-white/50 hover:text-white/80 hover:border-white/20'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap justify-center gap-2 sm:gap-2.5">
        {active?.items.map((cat) => (
          <Link
            key={cat.slug}
            href={bestCategoryHref(cat.slug, lp)}
            className="px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white/70 text-xs sm:text-sm font-bold hover:bg-[#00AFF0]/12 hover:border-[#00AFF0]/35 hover:text-[#00AFF0] transition-all"
          >
            {cat.name}
          </Link>
        ))}
      </div>
    </section>
  );
}

export function OnlyFansCountryGrid() {
  const { t } = useTranslation();
  const lp = useLocalePath();
  const countries = useMemo(() => getExploreCountryMarkets(), []);

  if (countries.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8" aria-label="Browse by country">
      <div className="flex items-center justify-center gap-2 mb-4 sm:mb-5">
        <Globe size={18} className="text-[#00AFF0]" />
        <h2 className="text-lg sm:text-xl font-black text-white">{t('ofSearch.exploreByCountry')}</h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3 max-w-5xl mx-auto">
        {countries.map((c) => (
          <Link
            key={c.slug}
            href={bestCategoryHref(c.slug, lp)}
            className="group flex flex-col items-center text-center rounded-2xl border border-white/[0.08] bg-white/[0.04] px-3 py-4 sm:py-5 hover:border-[#00AFF0]/35 hover:bg-[#00AFF0]/[0.08] transition-all"
          >
            <span className="text-2xl sm:text-3xl leading-none mb-2" aria-hidden="true">
              {c.flag}
            </span>
            <span className="text-[10px] sm:text-[11px] font-black text-white leading-snug group-hover:text-[#00AFF0] transition-colors">
              {'bestOnlyfansLabel' in c && c.bestOnlyfansLabel
                ? t('ofSearch.bestOnlyfansCountry').replace('{country}', c.label)
                : c.label}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function OnlyFansTrendingSection({
  chartItems,
  featuredItems,
}: {
  chartItems: TrendingChartItem[];
  featuredItems: FeaturedTrendingItem[];
}) {
  const showChart = chartItems.length > 0;
  const showFeatured = featuredItems.length > 0;

  if (!showChart && !showFeatured) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8" aria-label="Trending creators">
      <div className="flex items-center gap-2 mb-4 sm:mb-5">
        <TrendingUp size={18} className="text-[#00AFF0]" />
        <h2 className="text-lg sm:text-xl font-black text-white">Trending Creators</h2>
      </div>

      {showChart && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5">
          {[0, 1, 2, 3].map((col) => {
            const perCol = Math.ceil(chartItems.length / 4);
            const chunk = chartItems.slice(col * perCol, col * perCol + perCol);
            if (chunk.length === 0) return null;
            return (
              <div key={col} className="rounded-xl bg-white overflow-hidden shadow-md">
                {chunk.map((tc, j) => (
                  <button
                    key={tc._id}
                    type="button"
                    onClick={() => openCreatorProfile(tc.username)}
                    className={`w-full flex items-center hover:brightness-95 transition-all text-left ${j < chunk.length - 1 ? 'border-b border-gray-100' : ''}`}
                  >
                    <div className="flex items-center gap-3 px-2 py-2.5 flex-1 min-w-0">
                      <span className="w-6 text-center text-xs font-black text-[#00AFF0] tabular-nums shrink-0">{tc.rank}</span>
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                        {tc.avatar ? (
                          <img src={tc.avatar} alt="" className="w-full h-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-400">{tc.name.charAt(0)}</div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-bold text-gray-900 truncate">{tc.name}</p>
                        <p className="text-[11px] text-gray-500 truncate">@{tc.username}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {showFeatured && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3 sm:gap-4">
          {featuredItems.slice(0, 8).map((tc) => (
            <button
              key={tc._id}
              type="button"
              onClick={() => {
                const dest = (tc.url || tc.destinationUrl || '').trim() || `https://onlyfans.com/${tc.username}`;
                window.open(dest, '_blank', 'noopener,noreferrer');
              }}
              className="group text-left rounded-2xl overflow-hidden bg-white/[0.04] border border-white/[0.08] hover:border-[#00AFF0]/30 transition-all"
            >
              <div className="relative aspect-[3/4] bg-[#0a1c2e]">
                {tc.avatar ? (
                  <img
                    src={tc.avatar}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-[#00AFF0]/40">{tc.name.charAt(0)}</div>
                )}
              </div>
              <div className="px-3 py-2.5">
                <p className="text-[13px] font-bold text-white truncate">{tc.name}</p>
                <p className="text-[11px] text-[#00AFF0] font-semibold truncate">@{tc.username}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

const HOW_STEPS = [
  { icon: Search, title: 'Search by keyword' },
  { icon: Bookmark, title: 'Bookmark your favorites' },
  { icon: Filter, title: 'Filter by category' },
] as const;

export function OnlyFansHowItWorks() {
  const { t } = useTranslation();

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 mb-2" aria-label="How it works">
      <h2 className="text-lg sm:text-xl font-black text-white text-center mb-6 sm:mb-8">{t('about.howItWorks')}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 max-w-4xl mx-auto">
        {HOW_STEPS.map((step, i) => (
          <div
            key={step.title}
            className="relative rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-5 sm:px-5 sm:py-6 text-center"
          >
            <span className="absolute top-3 left-3 w-6 h-6 rounded-full bg-[#00AFF0]/15 text-[#00AFF0] text-xs font-black flex items-center justify-center">
              {i + 1}
            </span>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00AFF0] to-[#00D4FF] flex items-center justify-center mx-auto mb-3 shadow-lg shadow-[#00AFF0]/20">
              <step.icon size={18} className="text-white" />
            </div>
            <h3 className="text-sm sm:text-base font-black text-white">{step.title}</h3>
          </div>
        ))}
      </div>
    </section>
  );
}
