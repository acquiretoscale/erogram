'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Search, Bookmark, Crown, Trash2, X, Heart, Clock, TrendingUp, User } from 'lucide-react';
import { OF_CATEGORY_MAP, OF_SEARCH_HUB_CATEGORY_SLUGS } from './constants';
import { bestOfBlogSlug, getTopBestOfByType, BEST_OF_PAGE_MAP, type BestOfPage } from '@/app/best-onlyfans-accounts/bestOfPages';
import Navbar from '@/components/Navbar';
import HeaderBanner from '@/components/HeaderBanner';
import { ofCreatorProfileUrl } from '@/lib/onlyfanssearch/creatorUrls';
import { trackCreatorClick, trackTrendingClick } from '@/lib/actions/onlyfansTracking';
import { trackClick as trackCampaignClick } from '@/lib/actions/campaigns';
import { getTrendingCreators } from '@/lib/actions/publicData';
import { deleteCreatorBySlug } from '@/lib/actions/ofCreatorsBrowse';
import { useTranslation, useLocalePath } from '@/lib/i18n/client';
import Footer from '@/components/Footer';
import ProfileOFPremiumSearch from '@/app/profile/ProfileOFPremiumSearch';
import { OF_SEARCH_TOKENS, ofSearchNavProps } from '@/app/onlyfanssearch/ofSearchTokens';
import OnlyFansEditorialSeo from './OnlyFansEditorialSeo';

const POPULAR_ONLYFANS_CATEGORIES = [
  { label: 'Asian', slug: 'asian' },
  { label: 'Blonde', slug: 'blonde' },
  { label: 'Teen', slug: 'teen' },
  { label: 'MILF', slug: 'milf' },
  { label: 'Amateur', slug: 'amateur' },
  { label: 'Redhead', slug: 'redhead' },
  { label: 'Goth', slug: 'goth' },
  { label: 'Petite', slug: 'petite' },
  { label: 'Big Ass', slug: 'big-ass' },
  { label: 'Big Boobs', slug: 'big-boobs' },
  { label: 'Brunette', slug: 'brunette' },
  { label: 'Latina', slug: 'latina' },
  { label: 'Ahegao', slug: 'ahegao' },
  { label: 'Alt', slug: 'alt' },
  { label: 'Cosplay', slug: 'cosplay' },
  { label: 'Streamer', slug: 'streamer' },
  { label: 'Fitness', slug: 'fitness' },
  { label: 'JOI', slug: 'joi' },
  { label: 'Lesbian', slug: 'lesbian' },
  { label: 'Tattoo', slug: 'tattoo' },
  { label: 'Curvy', slug: 'curvy' },
  { label: 'Ebony', slug: 'ebony' },
  { label: 'Feet', slug: 'feet' },
  { label: 'Lingerie', slug: 'lingerie' },
  { label: 'Thick', slug: 'thick' },
  { label: 'Twerk', slug: 'twerk' },
  { label: 'Squirt', slug: 'squirt' },
] as const;

interface Creator {
  _id: string;
  name: string;
  username: string;
  slug: string;
  avatar: string;
  header?: string;
  categories?: string[];
  subscriberCount?: number;
  likesCount: number;
  photosCount: number;
  videosCount: number;
  price: number;
  isFree: boolean;
  url: string;
  clicks: number;
  redirectToOF?: boolean;
  liveHourStart?: number;
  liveHourEnd?: number;
}

interface TrendingCreatorItem {
  _id: string;
  name: string;
  username: string;
  slug: string;
  avatar: string;
  rank: number;
  points: number;
  pointsDelta: number;
  rankChange: number;
}

interface Props {
  initialCreators: Creator[];
  totalCreators: number;
  initialQuery?: string;
  topBannerCampaigns?: Array<{ _id: string; creative: string; destinationUrl: string; bannerDevice?: 'all' | 'mobile' | 'desktop' }>;
  trendingOnErogram?: TrendingCreatorItem[];
  paidFeatured?: any[];
  visitorCountryCode?: string;
  top10PreviewAvatars?: Record<string, string[]>;
  bestAccountsPreviewAvatars?: Record<string, string[]>;
}

function mergeFeaturedLists(paid: any[], rail: any[]) {
  const seen = new Set<string>();
  const out: any[] = [];
  for (const c of [...paid, ...rail]) {
    const u = (c.username || '').toLowerCase();
    if (!u || seen.has(u)) continue;
    seen.add(u);
    out.push(c);
  }
  return out;
}

function featuredCoverSrc(tc: { album?: string[]; avatar?: string }) {
  const album = tc.album?.find((url) => typeof url === 'string' && url.startsWith('http'));
  return album || tc.avatar || '';
}

function pickFeaturedBlock(list: any[]) {
  return [...list].sort(() => Math.random() - 0.5).slice(0, 4);
}

function isCreatorLiveNow(start: number, end: number): boolean {
  if (start < 0 || end < 0) return false;
  const gmtHour = new Date().getUTCHours();
  if (start <= end) return gmtHour >= start && gmtHour < end;
  return gmtHour >= start || gmtHour < end;
}

function FeaturedLiveBadge({ liveHourStart, liveHourEnd }: { liveHourStart?: number; liveHourEnd?: number }) {
  if (!isCreatorLiveNow(liveHourStart ?? -1, liveHourEnd ?? -1)) return null;
  return (
    <div className="absolute top-2 left-2 z-10 inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/55 backdrop-blur-sm">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
      </span>
      <span className="text-[10px] font-black text-white uppercase tracking-wider">Live</span>
    </div>
  );
}

const CREATOR_VIEW_PROFILE_BTN =
  'flex-1 flex items-center justify-center gap-2 py-2 sm:py-2.5 rounded-xl bg-[#0084BD] text-white text-[12px] sm:text-sm font-black text-center shadow-lg border border-[#0084BD] group-hover:bg-[#0070A3] transition-colors no-underline';

const CREATOR_PROFILE_ICON_BTN =
  'flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl bg-[#0084BD] text-white shadow-lg border border-[#0084BD] hover:bg-[#0070A3] transition-colors';

const FEATURED_CTA =
  'w-full py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-[#00AFF0] to-[#00D4FF] text-white text-[13px] sm:text-sm font-bold text-center shadow-sm group-hover:shadow-md group-hover:from-[#009ADB] group-hover:to-[#00BFE8] transition-all';

function formatCount(n: number) {
  if (!n) return '';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return `${n}K`;
}

function PreviewMosaic({ avatars }: { avatars: string[] }) {
  const pics = avatars.slice(0, 4);
  return (
    <div className="grid grid-cols-2 gap-px w-14 h-14 shrink-0 rounded-lg overflow-hidden border border-[rgba(43,27,40,0.1)]" aria-hidden="true">
      {Array.from({ length: 4 }).map((_, idx) => {
        const src = pics[idx];
        return (
          <div key={idx} className="relative aspect-square bg-[rgba(43,27,40,0.05)]">
            {src ? (
              <img
                src={src}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function BestAccountsLinksSection({ previewAvatars }: { previewAvatars: Record<string, string[]> }) {
  const lp = useLocalePath();

  const categories = useMemo(
    () =>
      OF_SEARCH_HUB_CATEGORY_SLUGS.map((slug) => OF_CATEGORY_MAP.get(slug))
        .filter((c): c is NonNullable<ReturnType<typeof OF_CATEGORY_MAP.get>> => !!c && BEST_OF_PAGE_MAP.has(c.slug)),
    [],
  );

  const columns = useMemo(() => {
    const perCol = Math.ceil(categories.length / 3);
    return [
      { key: 'look', title: '10 Best OnlyFans · Look & body', items: categories.slice(0, perCol) },
      { key: 'style', title: '10 Best OnlyFans · Style & vibe', items: categories.slice(perCol, perCol * 2) },
      { key: 'niche', title: '10 Best OnlyFans · Niches & kinks', items: categories.slice(perCol * 2) },
    ];
  }, [categories]);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-2" aria-label="Best OnlyFans accounts by category">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-3 px-0.5">
        <h2 className="text-base sm:text-lg font-black text-white">Best OnlyFans Accounts by Category</h2>
        <Link
          href={lp('/best-onlyfans-accounts')}
          className="text-[11px] sm:text-xs font-bold text-[#00AFF0] hover:text-[#009AD6] transition-colors"
        >
          View all categories →
        </Link>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5">
        {columns.map((col) => (
          <nav
            key={col.key}
            aria-label={col.title}
            className="rounded-xl border border-white/10 bg-white px-3 py-4 sm:px-4"
          >
            <h3 className="text-sm sm:text-[15px] font-bold text-[#2B1B28] mb-2.5 leading-snug">{col.title}</h3>
            <ul className="list-none m-0 p-0">
              {col.items.map((cat) => {
                const href = lp(`/best-onlyfans-accounts/${cat.slug}`);
                const linkText = `10 Best ${cat.name} OnlyFans Accounts`;
                return (
                  <li key={cat.slug} className="border-b border-[rgba(43,27,40,0.08)] last:border-b-0">
                    <Link
                      href={href}
                      className="flex items-start gap-2.5 py-2 text-[#2B1B28] no-underline hover:opacity-80 transition-opacity"
                    >
                      <PreviewMosaic avatars={previewAvatars[cat.slug] || []} />
                      <span className="text-[11px] sm:text-[12px] font-semibold leading-snug pt-0.5">{linkText}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        ))}
      </div>
    </section>
  );
}

function Top10RankingsSection({ previewAvatars }: { previewAvatars: Record<string, string[]> }) {
  const lp = useLocalePath();
  const niches = useMemo(() => getTopBestOfByType('niche'), []);
  const regions = useMemo(() => getTopBestOfByType('country'), []);
  const states = useMemo(() => getTopBestOfByType('state'), []);

  const groups: { key: string; title: string; items: BestOfPage[] }[] = [
    { key: 'niche', title: 'TOP 10 ranking by niches', items: niches },
    { key: 'region', title: 'Top 10 ranking by Region', items: regions },
    { key: 'state', title: 'Top 10 ranking by States in the United States', items: states },
  ];

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-2" aria-label="Top 10 OnlyFans model rankings">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5">
        {groups.map((group) => (
          <nav
            key={group.key}
            aria-label={group.title}
            className="rounded-xl border border-[rgba(43,27,40,0.1)] bg-[#F7F4EC] px-3 py-4 sm:px-4"
          >
            <h2 className="text-sm sm:text-[15px] font-bold text-[#2B1B28] mb-2.5 leading-snug">{group.title}</h2>
            <ul className="list-none m-0 p-0">
              {group.items.map((page) => {
                const href = lp(`/onlyfanssearch/${bestOfBlogSlug(page.slug)}`);
                const linkText = `Top 10 ${page.label} OnlyFans Models`;
                return (
                  <li key={page.slug} className="border-b border-[rgba(43,27,40,0.08)] last:border-b-0">
                    <Link
                      href={href}
                      className="flex items-start gap-2.5 py-2 text-[#2B1B28] no-underline"
                    >
                      <PreviewMosaic avatars={previewAvatars[page.slug] || []} />
                      <span className="text-[11px] sm:text-[12px] font-semibold leading-snug pt-0.5">{linkText}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        ))}
      </div>
    </section>
  );
}

function CreatorCard({
  creator,
  onClickTrack,
  isAdmin,
  onDelete,
  isSaved,
  onToggleSave,
}: {
  creator: Creator;
  onClickTrack: (slug: string) => void;
  isAdmin: boolean;
  onDelete?: (slug: string) => void;
  isSaved?: boolean;
  onToggleSave?: (creatorId: string) => void;
}) {
  const { t } = useTranslation();
  const [deleted, setDeleted] = useState(false);
  const [showHeader, setShowHeader] = useState(false);
  const hasHeader = !!creator.header;

  const handleViewProfileClick = () => {
    onClickTrack(creator.slug);
  };

  const handleErogramProfile = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const path = ofCreatorProfileUrl(creator.username);
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      window.open(`/join-erogram?redirect=${encodeURIComponent(path)}`, '_blank', 'noopener,noreferrer');
      return;
    }
    window.open(path, '_blank', 'noopener,noreferrer');
  };

  if (deleted) return null;

  const currentImg = showHeader && hasHeader ? creator.header : creator.avatar;

  return (
    <div className="relative h-full">
      {isAdmin && (
        <div className="absolute top-2 left-2 z-20 flex gap-1.5">
          <span className="h-7 px-2 flex items-center rounded-full bg-black/60 text-white text-[11px] font-bold backdrop-blur-sm tabular-nums" title="Total clicks">
            {creator.clicks ?? 0}
          </span>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!confirm(`Delete @${creator.username}?`)) return;
              onDelete?.(creator.slug);
              setDeleted(true);
            }}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-red-600/80 hover:bg-red-600 text-white backdrop-blur-sm transition-all"
            title="Delete creator"
          >
            <Trash2 size={13} />
          </button>
        </div>
      )}
      <div className="group h-full flex flex-col rounded-2xl bg-white overflow-hidden shadow-md hover:shadow-xl transition-shadow">
        <div className="flex-1 flex flex-col">
          <div className="relative aspect-[3/4] bg-gray-100">
            {currentImg ? (
              <img
                src={currentImg}
                alt={`${creator.name} OnlyFans`}
                className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-gray-300 bg-gradient-to-br from-gray-100 to-gray-200">
                {creator.name.charAt(0)}
              </div>
            )}
            {hasHeader && (
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowHeader(!showHeader); }}
                className="absolute bottom-2 left-2 z-10 flex gap-1"
              >
                <span className={`w-1.5 h-1.5 rounded-full transition-all ${!showHeader ? 'bg-white scale-110' : 'bg-white/40'}`} />
                <span className={`w-1.5 h-1.5 rounded-full transition-all ${showHeader ? 'bg-white scale-110' : 'bg-white/40'}`} />
              </button>
            )}
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleSave?.(creator._id); }}
              className={`absolute top-2 right-2 z-10 w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all backdrop-blur-sm ${
                isSaved
                  ? 'bg-[#00AFF0] text-white shadow-lg'
                  : 'bg-black/40 text-white/70 hover:bg-black/60 hover:text-white'
              }`}
              title={isSaved ? t('ofSearch.removeSaved') : t('ofSearch.saveCreator')}
            >
              <Bookmark size={14} fill={isSaved ? 'currentColor' : 'none'} />
            </button>
          </div>
          <div className="px-2.5 pt-2 sm:px-4 sm:pt-3">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h3 className="font-bold text-[13px] sm:text-[15px] text-gray-900 truncate leading-tight">
                {creator.name}
              </h3>
              <span className={`flex-shrink-0 px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wide ${
                creator.isFree ? 'bg-emerald-400 text-white' : 'bg-[#0084BD] text-white'
              }`}>
                {creator.isFree ? t('ofSearch.free') : `$${(creator.price ?? 0).toFixed(0)}`}
              </span>
            </div>
            <p className="text-[11px] sm:text-[13px] text-[#00AFF0] mt-0.5">@{creator.username}</p>
            {(creator.likesCount > 0 || (creator.subscriberCount ?? 0) > 0) && (
              <div className="flex items-center gap-1.5 mt-0.5 text-[10px] sm:text-[11px] text-gray-400">
                {(creator.subscriberCount ?? 0) > 0 && <span>{formatCount(creator.subscriberCount!)} {t('ofSearch.subscribers')}</span>}
                {creator.likesCount > 0 && <span>{(creator.subscriberCount ?? 0) > 0 ? '·' : ''} {formatCount(creator.likesCount)} {t('ofSearch.likes')}</span>}
              </div>
            )}
            {creator.categories && creator.categories.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {creator.categories.slice(0, 3).map((cat) => (
                  <span key={cat} className="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-[9px] sm:text-[10px] font-semibold rounded capitalize">
                    {cat}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="px-2.5 pb-2.5 pt-2 sm:px-4 sm:pb-4 sm:pt-3">
          <div className="flex gap-1.5 sm:gap-2">
            <a
              href={`/go/${creator.username}`}
              target="_blank"
              rel="noopener"
              onClick={handleViewProfileClick}
              className={CREATOR_VIEW_PROFILE_BTN}
            >
              {t('ofSearch.viewProfile')}
            </a>
            <button
              onClick={handleErogramProfile}
              className={CREATOR_PROFILE_ICON_BTN}
              title="View on Erogram"
            >
              <User size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CreatorPostModal({ creator, onClose }: { creator: Creator; onClose: () => void }) {
  const { t } = useTranslation();
  const [redirecting, setRedirecting] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  useEffect(() => {
    if (!redirecting || countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [redirecting, countdown]);

  useEffect(() => {
    if (redirecting && countdown === 0) {
      window.open(`/go/${creator.username}`, '_blank', 'noopener');
      setRedirecting(false);
    }
  }, [redirecting, countdown, creator.username]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-xs rounded-3xl bg-white overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative aspect-[3/4] bg-gray-100">
          {creator.avatar ? (
            <img
              src={creator.avatar}
              alt={creator.name}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-6xl font-bold text-gray-300 bg-gradient-to-br from-gray-100 to-gray-200">
              {creator.name.charAt(0)}
            </div>
          )}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
          >
            <X size={16} />
          </button>
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 pt-10">
            <h3 className="font-black text-white text-lg leading-tight truncate">{creator.name}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[#00AFF0] text-sm">@{creator.username}</span>
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wide ${creator.isFree ? 'bg-emerald-400 text-white' : 'bg-[#00AFF0] text-white'}`}>
                {creator.isFree ? t('ofSearch.free') : `$${(creator.price ?? 0).toFixed(0)}`}
              </span>
            </div>
          </div>
        </div>
        <div className="p-4">
          <button
            onClick={(e) => { e.preventDefault(); if (!redirecting) { setRedirecting(true); setCountdown(2); } }}
            disabled={redirecting}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-gradient-to-r from-[#00AFF0] to-[#00D4FF] text-white text-sm font-bold text-center hover:from-[#009ADB] hover:to-[#00BFE8] transition-all shadow-md"
          >
            {redirecting ? (
              <>
                <span className="inline-flex items-center gap-1 shrink-0" aria-hidden>
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-white animate-bounce"
                      style={{ animationDelay: `${i * 120}ms`, animationDuration: '0.65s' }}
                    />
                  ))}
                </span>
                {t('ofSearch.redirectingIn').replace('{n}', String(countdown))}
              </>
            ) : t('ofSearch.viewOnOnlyfans')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OnlyFansClient({ initialCreators, totalCreators, initialQuery = '', topBannerCampaigns = [], trendingOnErogram = [], paidFeatured = [], visitorCountryCode = '', top10PreviewAvatars = {}, bestAccountsPreviewAvatars = {} }: Props) {
  const { t } = useTranslation();
  const lp = useLocalePath();
  const [creators, setCreators] = useState<Creator[]>(initialCreators);
  const [selectedCreator, setSelectedCreator] = useState<Creator | null>(null);
  const [searchActive, setSearchActive] = useState(Boolean(initialQuery.trim()));

  const [isAdmin, setIsAdmin] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [allFeatured, setAllFeatured] = useState<any[]>([]);
  // Which stable album image each featured card is currently showing → for split-test click attribution.
  const shownVariantRef = useRef<Record<string, number>>({});
  const paidFeaturedRef = useRef(paidFeatured);
  const featuredLockedRef = useRef(false);
  const [blockFeatured, setBlockFeatured] = useState<any[]>([]);
  const ofSearchPlacement = (idx: number) => (idx >= 0 ? `of-search-featured:v${idx}` : 'of-search-featured');
  const clickFeaturedCreator = useCallback((tc: any) => {
    const variant = tc.albumIdx?.[0] ?? 0;
    shownVariantRef.current[tc._id] = variant;
    if (tc.isPaidCampaign && tc.campaignId) trackCampaignClick(tc.campaignId, ofSearchPlacement(variant));
    else trackTrendingClick(tc._id, variant);
    window.open(`/go/${tc.username}`, '_blank', 'noopener');
  }, []);
  useEffect(() => {
    setIsAdmin(localStorage.getItem('isAdmin') === 'true');

    const token = localStorage.getItem('token');
    if (token) {
      fetch('/api/onlyfans/save', { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data.savedIds)) setSavedIds(new Set(data.savedIds));
        })
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (featuredLockedRef.current) return;

    const lockFeatured = (merged: any[]) => {
      if (featuredLockedRef.current || merged.length === 0) return;
      featuredLockedRef.current = true;
      setAllFeatured(merged);
      setBlockFeatured(pickFeaturedBlock(merged));
    };

    getTrendingCreators()
      .then((data) => {
        const merged = Array.isArray(data)
          ? mergeFeaturedLists(paidFeaturedRef.current, data)
          : [...paidFeaturedRef.current];
        lockFeatured(merged);
      })
      .catch(() => {
        lockFeatured([...paidFeaturedRef.current]);
      });
  }, []);

  const handleToggleSave = useCallback(async (creatorId: string) => {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = `/login?redirect=${encodeURIComponent('/onlyfanssearch')}`;
      return;
    }

    const alreadySaved = savedIds.has(creatorId);
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (alreadySaved) next.delete(creatorId);
      else next.add(creatorId);
      return next;
    });

    try {
      await fetch('/api/onlyfans/save', {
        method: alreadySaved ? 'DELETE' : 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ creatorId }),
      });
    } catch {
      setSavedIds((prev) => {
        const next = new Set(prev);
        if (alreadySaved) next.add(creatorId);
        else next.delete(creatorId);
        return next;
      });
    }
  }, [savedIds]);

  const trackClick = (slug: string) => {
    trackCreatorClick(slug);
  };

  const handleDelete = async (slug: string) => {
    const token = localStorage.getItem('token');
    if (!token) { alert('Not logged in'); return; }
    try {
      await deleteCreatorBySlug(token, slug);
      const filterOut = (list: Creator[]) => list.filter((c) => c.slug !== slug);
      setCreators(filterOut);
    } catch (e: any) {
      alert(`Delete failed: ${e.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#111111] text-[#f5f5f5]">
      <Navbar variant="onlyfans" />

      <main className="pt-24 sm:pt-28">
        {topBannerCampaigns.length > 0 && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 mb-6">
            <HeaderBanner campaigns={topBannerCampaigns} />
          </div>
        )}
        <section className="bg-gradient-to-b from-[#00AFF0]/10 via-[#00AFF0]/[0.04] to-[#111111] pt-6 pb-8 sm:pt-8 sm:pb-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-6 sm:mb-8">
              <motion.h1
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="text-2xl sm:text-3xl lg:text-4xl font-black leading-tight tracking-tight"
              >
                {t('ofSearch.heroTitle')}{' '}
                <span className="text-[#00AFF0]">{t('ofSearch.heroTitleAccent')}</span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.05 }}
                className="mt-1.5 text-xs sm:text-sm text-white/50 max-w-md mx-auto"
              >
                {t('ofSearch.heroDesc')}
              </motion.p>
            </div>
            <ProfileOFPremiumSearch
              tokens={OF_SEARCH_TOKENS}
              isPremium={false}
              freeAccess
              hideHeading
              layout="hero"
              minimalFilters
              initialQuery={initialQuery}
              onActiveChange={setSearchActive}
              savedCreatorIds={savedIds}
              onToggleSave={handleToggleSave}
              loginRedirect={lp('/onlyfanssearch')}
              initialVisitorCountry={visitorCountryCode}
              paidFeatured={paidFeatured}
              {...ofSearchNavProps(lp)}
            />
            {!searchActive && (
              <div className="max-w-3xl mx-auto mt-6 sm:mt-8 text-center">
                <h2 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider">
                  Popular <span className="text-[#00AFF0]">Categories</span>
                </h2>
                <p className="text-[11px] sm:text-xs text-white/40 mt-1 leading-snug">
                  Explore the most popular OnlyFans categories. Find creators that match your interests across diverse content types.
                </p>
                <div className="flex flex-wrap justify-center gap-2 mt-3">
                  {POPULAR_ONLYFANS_CATEGORIES.map((cat) => (
                    <a
                      key={cat.slug}
                      href={lp(`/onlyfanssearch/${cat.slug}`)}
                      className="inline-flex items-center rounded-lg bg-[#00AFF0] px-3 py-1.5 text-[11px] sm:text-xs font-bold text-white transition-colors hover:bg-[#009AD6]"
                    >
                      {cat.label}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {!searchActive && (
          <>
            {/* Featured creators */}
            {blockFeatured.length > 0 && (
              <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-8 sm:pt-10 sm:pb-10">
                <div className="relative overflow-hidden rounded-2xl border border-[#00AFF0]/20 bg-gradient-to-br from-[#061018] via-[#0a1c2e] to-[#0d2844] shadow-[0_20px_50px_-12px_rgba(0,175,240,0.18),inset_0_1px_0_0_rgba(255,255,255,0.06)] p-4 sm:p-6">
                  <div className="pointer-events-none absolute -top-28 -right-20 h-56 w-56 rounded-full bg-[#00AFF0]/20 blur-3xl" />
                  <div className="pointer-events-none absolute -bottom-24 -left-16 h-48 w-48 rounded-full bg-[#00D4FF]/12 blur-3xl" />
                  <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Crown size={14} className="text-[#00AFF0]" fill="currentColor" />
                      <h2 className="text-sm sm:text-base font-black text-white">
                        Featured <span className="text-[#00AFF0]">OnlyFans Creators</span>
                      </h2>
                    </div>
                    <a href="/submit" target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-lg bg-white/[0.08] border border-white/[0.10] text-white/70 text-[10px] sm:text-xs font-black uppercase tracking-wider hover:bg-[#00AFF0]/15 hover:border-[#00AFF0]/30 hover:text-[#00AFF0] transition-colors">Submit Your Creator</a>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-5">
                    {blockFeatured.map((tc) => {
                      const cover = featuredCoverSrc(tc);
                      return (
                      <button key={`feat-${tc._id}`} type="button" onClick={() => clickFeaturedCreator(tc)} className="group w-full text-left rounded-2xl overflow-hidden bg-white ring-[2px] ring-[#00AFF0]/30 hover:ring-[#00AFF0] shadow-[0_8px_28px_-8px_rgba(0,175,240,0.25)] hover:shadow-[0_12px_36px_-6px_rgba(0,175,240,0.35)] hover:-translate-y-1 transition-all duration-300 cursor-pointer focus:outline-none">
                        <div className="relative aspect-[3/4] bg-[#f0f8ff]">
                          {cover ? (
                            <img
                              src={cover}
                              alt={`${tc.name} OnlyFans`}
                              className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500 ease-out"
                              loading="lazy"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-[#00AFF0] bg-[#f0f8ff]">{tc.name.charAt(0)}</div>
                          )}
                          <FeaturedLiveBadge liveHourStart={tc.liveHourStart} liveHourEnd={tc.liveHourEnd} />
                        </div>
                        <div className="px-3 pt-2.5 sm:px-4 sm:pt-3">
                          <h3 className="font-bold text-[13px] sm:text-[15px] text-gray-900 truncate leading-tight">{tc.name}</h3>
                          <p className="text-[11px] sm:text-[13px] text-[#00AFF0] font-semibold mt-0.5">@{tc.username}</p>
                          {(tc.likesCount > 0) && (
                            <p className="text-[10px] sm:text-[11px] text-gray-500 mt-0.5">{formatCount(tc.likesCount)} {t('ofSearch.likes')}</p>
                          )}
                          {tc.categories && tc.categories.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {tc.categories.slice(0, 2).map((cat: string) => (
                                <span key={cat} className="px-1.5 py-0.5 bg-[#00AFF0]/10 text-[#00AFF0] text-[8px] sm:text-[9px] font-bold rounded-md capitalize border border-[#00AFF0]/20">
                                  {cat}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="px-3 pb-3 pt-2 sm:px-4 sm:pb-4 sm:pt-3"><div className={FEATURED_CTA}>{t('ofSearch.viewProfile')}</div></div>
                      </button>
                      );
                    })}
                  </div>
                  </div>
                </div>
              </section>
            )}

            <BestAccountsLinksSection previewAvatars={bestAccountsPreviewAvatars} />

            <Top10RankingsSection previewAvatars={top10PreviewAvatars} />

            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4">
              <OnlyFansEditorialSeo />
            </section>
          </>
        )}
      </main>

      <Footer />

      {/* Creator post modal */}
      {selectedCreator && (
        <CreatorPostModal creator={selectedCreator} onClose={() => setSelectedCreator(null)} />
      )}
    </div>
  );
}
