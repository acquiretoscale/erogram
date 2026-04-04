'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Search, Bookmark, Crown, Trash2, X, Heart, Shuffle, Clock, Plus, TrendingUp } from 'lucide-react';
import Navbar from '@/components/Navbar';
import HeaderBanner from '@/components/HeaderBanner';
import { OF_CATEGORIES, ofCategoryUrl } from './constants';
import { trackCreatorClick, trackTrendingClick } from '@/lib/actions/onlyfansTracking';
import { getTrendingCreators } from '@/lib/actions/publicData';
import { browseCreators, searchCreators, deleteCreatorBySlug } from '@/lib/actions/ofCreatorsBrowse';
import { getOFMTrending, createOFMTrendingSlot } from '@/lib/actions/ofm';
import { useTranslation, useLocalePath } from '@/lib/i18n/client';
import Footer from '@/components/Footer';



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
  liveHourStart?: number;
  liveHourEnd?: number;
}

interface Top10List {
  category: string;
  label: string;
  creators: Creator[];
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
  top10Lists?: Top10List[];
  recentlyAdded?: Creator[];
  topBannerCampaigns?: Array<{ _id: string; creative: string; destinationUrl: string; bannerDevice?: 'all' | 'mobile' | 'desktop' }>;
  trendingOnErogram?: TrendingCreatorItem[];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function isCreatorLiveNow(start: number, end: number): boolean {
  if (start < 0 || end < 0) return false;
  const gmtHour = new Date().getUTCHours();
  if (start <= end) return gmtHour >= start && gmtHour < end;
  return gmtHour >= start || gmtHour < end;
}

function formatCount(n: number) {
  if (!n) return '';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return `${n}K`;
}

function CreatorCard({
  creator,
  onClickTrack,
  isAdmin,
  onDelete,
  onSendToFeatured,
  isSaved,
  onToggleSave,
}: {
  creator: Creator;
  onClickTrack: (slug: string) => void;
  isAdmin: boolean;
  onDelete?: (slug: string) => void;
  onSendToFeatured?: (creator: Creator) => void;
  isSaved?: boolean;
  onToggleSave?: (creatorId: string) => void;
}) {
  const { t } = useTranslation();
  const [deleted, setDeleted] = useState(false);
  const [showHeader, setShowHeader] = useState(false);
  const hasHeader = !!creator.header;

  const handleViewProfile = (e: React.MouseEvent) => {
    e.preventDefault();
    onClickTrack(creator.slug);
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      window.open(creator.url, '_blank', 'noopener,noreferrer');
      return;
    }
    window.open(`/${creator.slug}`, '_blank', 'noopener,noreferrer');
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
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSendToFeatured?.(creator); }}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-[#FF6A00]/80 hover:bg-[#FF6A00] text-white backdrop-blur-sm transition-all"
            title="Add as Featured (paid client)"
          >
            <Crown size={13} fill="currentColor" />
          </button>
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
                creator.isFree ? 'bg-emerald-400 text-white' : 'bg-[#00AFF0] text-white'
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
          <button
            onClick={handleViewProfile}
            className="flex items-center justify-center gap-2 w-full py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-[#00AFF0] to-[#00D4FF] text-white text-[13px] sm:text-sm font-bold text-center shadow-sm group-hover:shadow-md group-hover:from-[#009ADB] group-hover:to-[#00BFE8] transition-all"
          >
            {t('ofSearch.viewProfile')}
          </button>
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
      window.open(creator.url, '_blank', 'noopener,noreferrer');
      setRedirecting(false);
    }
  }, [redirecting, countdown, creator.url]);

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
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin shrink-0" />
                {t('ofSearch.redirectingIn').replace('{n}', String(countdown))}
              </>
            ) : t('ofSearch.viewOnOnlyfans')}
          </button>
        </div>
      </div>
    </div>
  );
}

function Top10CategoryCard({ list }: { list: Top10List }) {
  const lp = useLocalePath();
  const top10 = list.creators.slice(0, 10);

  const handleCreatorClick = (c: Creator) => {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      window.location.href = `/join-erogram?redirect=/${c.slug}`;
      return;
    }
    window.open(`/${c.slug}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="rounded-2xl bg-white border border-gray-200 overflow-hidden shadow-[0_8px_30px_-14px_rgba(0,0,0,0.25)] flex flex-col">
      <div className="px-5 pt-5 pb-4 border-b border-gray-100">
        <h3 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight">
          Top 10 OnlyFans {list.label} Creators
        </h3>
      </div>
      <div className="flex-1 px-2 py-1">
        <div className="space-y-0.5">
          {top10.map((c, i) => (
            <button
              key={c._id}
              onClick={() => handleCreatorClick(c)}
              className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors group text-left"
            >
              <span className="w-6 h-6 rounded-full bg-gray-900 text-white text-[10px] font-black flex items-center justify-center shrink-0 tabular-nums">
                {i + 1}
              </span>
              <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                {c.avatar ? (
                  <img src={c.avatar} alt={c.name} className="w-full h-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sm font-bold text-gray-400">{c.name.charAt(0)}</div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold text-gray-900 truncate leading-tight group-hover:text-[#00AFF0] transition-colors">
                  {c.name}
                </p>
                <p className="text-[11px] text-gray-500 truncate">@{c.username}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
      <div className="px-4 pb-4 pt-3 border-t border-gray-100">
        <Link
          href={lp(ofCategoryUrl(list.category))}
          className="flex items-center justify-center gap-1 w-full py-3 rounded-xl bg-gradient-to-r from-[#00AFF0] to-[#00D4FF] text-white text-sm font-bold hover:from-[#009ADB] hover:to-[#00BFE8] transition-all"
        >
          View All {list.label}
        </Link>
      </div>
    </div>
  );
}

function CreatorCardSkeleton() {
  return (
    <div className="rounded-2xl bg-white overflow-hidden shadow-md animate-pulse">
      <div className="aspect-[3/4] bg-gray-200" />
      <div className="px-2.5 pt-2 pb-2.5 sm:px-4 sm:pt-3 sm:pb-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-3.5 sm:h-4 bg-gray-200 rounded w-20 sm:w-24" />
          <div className="h-3.5 sm:h-4 bg-gray-200 rounded w-8 sm:w-10" />
        </div>
        <div className="h-3 bg-gray-100 rounded w-16 sm:w-20 mb-2" />
        <div className="space-y-1.5 mb-2 sm:mb-3">
          <div className="h-2.5 sm:h-3 bg-gray-100 rounded w-full" />
          <div className="h-2.5 sm:h-3 bg-gray-100 rounded w-3/4" />
        </div>
        <div className="h-8 sm:h-10 bg-gray-200 rounded-xl" />
      </div>
    </div>
  );
}

export default function OnlyFansClient({ initialCreators, totalCreators, initialQuery = '', top10Lists = [], recentlyAdded = [], topBannerCampaigns = [], trendingOnErogram = [] }: Props) {
  const { t } = useTranslation();
  const lp = useLocalePath();
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);

  // Default browse state — category sections, no infinite scroll
  const [creators, setCreators] = useState<Creator[]>(initialCreators);
  const [selectedCreator, setSelectedCreator] = useState<Creator | null>(null);

  // Search state — progressive batch loading
  const [searchResults, setSearchResults] = useState<Creator[]>([]);
  const [searchDone, setSearchDone] = useState(false);
  const [progress, setProgress] = useState<{ loaded: number; total: number } | null>(null);

  const [fetchingFromOF, setFetchingFromOF] = useState(false);

  // Infinite scroll after search results are exhausted
  const [afterSearchCreators, setAfterSearchCreators] = useState<Creator[]>([]);
  const [afterSearchLoading, setAfterSearchLoading] = useState(false);
  const [afterSearchHasMore, setAfterSearchHasMore] = useState(true);

  const [isAdmin, setIsAdmin] = useState(false);
  const [liveUsers, setLiveUsers] = useState(0);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [trendingToast, setTrendingToast] = useState('');
  const [allFeatured, setAllFeatured] = useState<any[]>([]);
  const [blockFeatured, setBlockFeatured] = useState<any[]>([]);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchAbortRef = useRef<AbortController | null>(null);
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const isLiveVisitors = liveUsers > 0;

  const [recentPool, setRecentPool] = useState<Creator[]>(recentlyAdded);
  const [recentPicks, setRecentPicks] = useState<Creator[]>(() => recentlyAdded.slice(0, 4));
  const shuffleRecent = () => setRecentPicks(shuffle(recentPool).slice(0, 4));

  useEffect(() => {
    if (recentlyAdded.length > 0) {
      setRecentPicks(shuffle(recentlyAdded).slice(0, 4));
    }
  }, []);

  const TRENDING_CATEGORIES = OF_CATEGORIES.slice(0, 10);

  const isSearchMode = debouncedQuery.trim().length > 0;

  useEffect(() => {
    setIsAdmin(localStorage.getItem('isAdmin') === 'true');

    if (initialQuery) submitSearch(initialQuery);

    const token = localStorage.getItem('token');
    if (token) {
      fetch('/api/onlyfans/save', { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data.savedIds)) setSavedIds(new Set(data.savedIds));
        })
        .catch(() => {});
    }

    getTrendingCreators()
      .then(data => {
        if (Array.isArray(data)) {
          setAllFeatured(data);
          setBlockFeatured([...data].sort(() => Math.random() - 0.5).slice(0, 4));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const submitSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;

    setDebouncedQuery(trimmed);
    setSearchResults([]);
    setSearchDone(false);
    setAfterSearchCreators([]);
    setAfterSearchHasMore(true);
    setProgress({ loaded: 0, total: 1 });

    try {
      const data = await searchCreators(trimmed, 1000, 0);
      const results: Creator[] = data.creators || [];

      const seen = new Set<string>();
      const unique = results.filter((c) => {
        if (seen.has(c._id)) return false;
        seen.add(c._id);
        return true;
      });

      setSearchResults(unique);
      setProgress({ loaded: unique.length, total: data.total || 0 });

      if (data.shouldScrape && data.scrapeQuery) {
        const sq = data.scrapeQuery;
        const looksLikeUsername = /^[a-z0-9._-]+$/i.test(sq) && !sq.includes(' ');
        const nameAsUsername = sq.replace(/\s+/g, '').toLowerCase();
        const usernames = looksLikeUsername ? [sq] : [nameAsUsername];
        const body: Record<string, any> = { category: sq, maxItems: 15, source: 'search', usernames };
        setFetchingFromOF(true);
        fetch('/api/onlyfans/scrape', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }).catch(() => {});

        const retrySearch = async (attempt: number) => {
          if (attempt > 8) { setFetchingFromOF(false); return; }
          const delay = attempt <= 2 ? 5000 : attempt <= 4 ? 10000 : 15000;
          await new Promise((r) => setTimeout(r, delay));
          try {
            const retry = await searchCreators(trimmed, 1000, 0);
            const retryResults: Creator[] = retry.creators || [];
            if (retryResults.length > 0) {
              const seen2 = new Set<string>();
              setSearchResults(retryResults.filter((c) => { if (seen2.has(c._id)) return false; seen2.add(c._id); return true; }));
              setFetchingFromOF(false);
              return;
            }
          } catch {}
          retrySearch(attempt + 1);
        };
        retrySearch(1);
      }
    } catch (e: any) {
      console.error('Search error:', e);
    } finally {
      setSearchDone(true);
      setProgress(null);
    }
  }, []);

  // Infinite scroll loader for after-search browsing (excludes search result IDs)
  const loadMoreAfterSearch = useCallback(async () => {
    if (afterSearchLoading || !afterSearchHasMore) return;
    setAfterSearchLoading(true);

    try {
      const searchIds = searchResults.map((c) => c._id);
      const afterIds = afterSearchCreators.map((c) => c._id);
      const exclude = [...searchIds, ...afterIds];
      const data = await browseCreators(exclude, 80);
      if (data.creators && data.creators.length > 0) {
        setAfterSearchCreators((prev) => {
          const existingIds = new Set(prev.map((c) => c._id));
          const fresh = data.creators.filter((c: Creator) => !existingIds.has(c._id));
          return [...prev, ...fresh];
        });
        setAfterSearchHasMore(data.hasMore);
      } else {
        setAfterSearchHasMore(false);
      }
    } catch (e) {
      console.error('Failed to load more after search:', e);
    } finally {
      setAfterSearchLoading(false);
    }
  }, [afterSearchLoading, afterSearchHasMore, searchResults, afterSearchCreators]);

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

  useEffect(() => {
    const fetchActive = () => {
      fetch('/api/advertise-stats', { cache: 'no-store' })
        .then(r => r.json())
        .then(d => { if (typeof d.activeVisitors === 'number') setLiveUsers(d.activeVisitors); })
        .catch(() => {});
    };
    fetchActive();
    const id = setInterval(fetchActive, 300_000);
    return () => clearInterval(id);
  }, []);

  const trackClick = (slug: string) => {
    trackCreatorClick(slug);
  };

  const handleDelete = async (slug: string) => {
    const token = localStorage.getItem('token');
    if (!token) { alert('Not logged in'); return; }
    try {
      await deleteCreatorBySlug(token, slug);
      const filterOut = (list: Creator[]) => list.filter((c) => c.slug !== slug);
      setSearchResults(filterOut);
      setCreators(filterOut);
      setAfterSearchCreators(filterOut);
      setRecentPool(filterOut);
      setRecentPicks(filterOut);
    } catch (e: any) {
      alert(`Delete failed: ${e.message}`);
    }
  };

  const showTrendingToast = (msg: string) => {
    setTrendingToast(msg);
    setTimeout(() => setTrendingToast(''), 3000);
  };

  const refreshTrending = useCallback(() => {
    getTrendingCreators()
      .then(data => {
        if (Array.isArray(data)) {
          setAllFeatured(data);
          setBlockFeatured([...data].sort(() => Math.random() - 0.5).slice(0, 4));
        }
      })
      .catch(() => {});
  }, []);

  const handleSendToFeatured = async (creator: Creator) => {
    const token = localStorage.getItem('token');
    if (!token) { showTrendingToast('Login required'); return; }
    try {
      const slots = await getOFMTrending(token);
      const occupied = new Set<number>();
      if (Array.isArray(slots)) {
        for (const s of slots as any[]) occupied.add(s.position);
      }
      let targetSlot = 0;
      for (let i = 1; i <= 12; i++) {
        if (!occupied.has(i)) { targetSlot = i; break; }
      }
      if (targetSlot === 0) targetSlot = 1;
      await createOFMTrendingSlot(token, {
        name: creator.name,
        username: creator.username,
        avatar: creator.avatar,
        url: creator.url,
        bio: '',
        categories: creator.categories || [],
        position: targetSlot,
        active: true,
      });
      showTrendingToast(`👑 ${creator.name} added as Featured`);
      refreshTrending();
    } catch (e: any) {
      showTrendingToast(`Failed: ${e.message || 'Unknown error'}`);
    }
  };

  // Scroll handler — search mode: infinite scroll continues after search results
  useEffect(() => {
    if (!isSearchMode || !searchDone) return;

    const handleScroll = () => {
      if (
        window.innerHeight + window.scrollY >= document.body.offsetHeight - 800 &&
        !afterSearchLoading &&
        afterSearchHasMore
      ) {
        loadMoreAfterSearch();
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isSearchMode, searchDone, afterSearchLoading, afterSearchHasMore, loadMoreAfterSearch]);


  const clearSearch = () => {
    setQuery('');
    setDebouncedQuery('');
    setSearchResults([]);
    setSearchDone(false);
    setProgress(null);
    searchAbortRef.current?.abort();
  };

  return (
    <div className="min-h-screen bg-[#111111] text-[#f5f5f5]">
      <Navbar variant="onlyfans" />

      <main className="pt-20">
        {topBannerCampaigns.length > 0 && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 mb-4">
            <HeaderBanner campaigns={topBannerCampaigns} />
          </div>
        )}
        {/* Hero — compact */}
        <section className="bg-gradient-to-b from-[#00AFF0]/10 via-[#00AFF0]/[0.04] to-[#111111] pt-6 pb-4 sm:pt-8 sm:pb-6 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="text-3xl sm:text-4xl lg:text-5xl font-black leading-tight tracking-tight"
            >
              {t('ofSearch.heroTitle')}{' '}
              <span className="text-[#00AFF0]">{t('ofSearch.heroTitleAccent')}</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.05 }}
              className="mt-2 text-sm sm:text-base text-white/50 max-w-lg mx-auto"
            >
              {t('ofSearch.heroDesc')}
            </motion.p>

            {/* Search bar + visiting indicator */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.08 }}
              className="mt-4 flex items-center gap-3 max-w-xl mx-auto"
            >
              <div className="relative flex-1" ref={searchBoxRef}>
                <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none">
                  <Search size={16} className="text-white/30" />
                </div>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && query.trim()) { setSearchFocused(false); submitSearch(query); } }}
                  onFocus={() => setSearchFocused(true)}
                  placeholder={t('ofSearch.searchPlaceholder')}
                  className={`w-full pl-10 pr-10 py-2.5 bg-white/[0.06] border border-white/[0.08] text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-[#00AFF0]/40 focus:border-[#00AFF0]/30 transition-all ${searchFocused && !query ? 'rounded-t-xl rounded-b-none border-b-0' : 'rounded-xl'}`}
                />
                {query && (
                  <button
                    onClick={clearSearch}
                    className="absolute inset-y-0 right-3.5 flex items-center text-white/30 hover:text-white/70 transition-colors"
                  >
                    <X size={16} />
                  </button>
                )}

                {/* Trending suggestions dropdown — links to category pages */}
                {searchFocused && !query && (
                  <div className="absolute left-0 right-0 top-full z-50 bg-[#1a1a1a] border border-white/[0.08] border-t-0 rounded-b-xl shadow-2xl overflow-hidden">
                    <div className="grid grid-cols-2">
                      {TRENDING_CATEGORIES.map((cat) => (
                        <Link
                          key={cat.slug}
                          href={lp(ofCategoryUrl(cat.slug))}
                          onClick={() => setSearchFocused(false)}
                          className="flex items-center gap-2.5 px-3.5 py-2 text-left hover:bg-white/[0.05] transition-colors border-b border-r border-white/[0.04] last:border-b-0 [&:nth-last-child(2):nth-child(odd)]:border-b-0"
                        >
                          <Search size={12} className="text-white/25 flex-shrink-0" />
                          <span className="text-sm text-white/70">{cat.name}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className="relative flex h-2 w-2">
                  {isLiveVisitors && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  )}
                  <span
                    className={`relative inline-flex rounded-full h-2 w-2 ${
                      isLiveVisitors ? 'bg-emerald-500' : 'bg-white/20'
                    }`}
                  />
                </span>
                <span className="font-bold text-white text-sm tabular-nums">{liveUsers > 0 ? liveUsers.toLocaleString() : '—'}</span>
                <span className="text-white/40 text-[11px] sm:text-sm">{t('ofSearch.visitingNow')}</span>
              </div>
            </motion.div>

            {/* Quick Category Access — hidden in search mode */}
            {!isSearchMode && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.12 }}
                className="mt-3"
              >
                <div className="flex flex-wrap justify-center gap-1.5 sm:gap-1">
                  <Link
                    href={lp('/onlyfanssearch')}
                    className="px-2.5 py-1 sm:px-2 sm:py-0.5 rounded-full bg-[#00AFF0]/15 border border-[#00AFF0]/30 text-[#00AFF0] text-[11px] sm:text-[10px] font-semibold transition-all"
                  >
                    {t('ofSearch.all')}
                  </Link>
                  {OF_CATEGORIES.map((cat) => (
                    <Link
                      key={cat.slug}
                      href={lp(ofCategoryUrl(cat.slug))}
                      className="px-2.5 py-1 sm:px-2 sm:py-0.5 rounded-full bg-white/[0.06] border border-white/[0.10] text-white/50 text-[11px] sm:text-[10px] font-semibold hover:bg-[#00AFF0]/10 hover:border-[#00AFF0]/30 hover:text-[#00AFF0] transition-all"
                    >
                      {cat.name}
                    </Link>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </section>

        {/* ── SEARCH MODE ─────────────────────────────────────────── */}
        {isSearchMode ? (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
            <div className="flex items-start sm:items-center justify-between gap-3 mb-4 sm:mb-6">
              <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-[#00AFF0] to-[#00D4FF] flex items-center justify-center flex-shrink-0">
                  <Search size={14} className="text-white sm:hidden" />
                  <Search size={16} className="text-white hidden sm:block" />
                </div>
                <h2 className="text-base sm:text-xl font-black text-white/90 truncate">
                  {t('ofSearch.resultsFor')} &ldquo;{debouncedQuery}&rdquo;
                </h2>
              </div>
              <button
                onClick={clearSearch}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white/40 text-xs sm:text-sm hover:bg-white/[0.10] hover:text-white/70 transition-all flex-shrink-0"
              >
                <X size={14} />
                <span className="hidden sm:inline">{t('ofSearch.clear')}</span>
              </button>
            </div>

            {/* Progress bar */}
            {progress && (
              <div className="mb-4">
                <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#00AFF0] to-[#00D4FF] transition-all duration-300 ease-out"
                    style={{ width: `${progress.total > 0 ? Math.max(5, (progress.loaded / progress.total) * 100) : 5}%` }}
                  />
                </div>
              </div>
            )}

            {progress && searchResults.length === 0 ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
                {Array.from({ length: 8 }, (_, i) => (
                  <CreatorCardSkeleton key={`sk-${i}`} />
                ))}
              </div>
            ) : searchDone && searchResults.length === 0 ? (
              <div className="text-center py-20">
                {fetchingFromOF ? (
                  <>
                    <div className="flex items-center justify-center gap-3 mb-3">
                      <span className="w-5 h-5 border-2 border-[#00AFF0]/30 border-t-[#00AFF0] rounded-full animate-spin" />
                      <p className="text-white/60 text-lg font-semibold">Searching OnlyFans for &ldquo;{debouncedQuery}&rdquo;...</p>
                    </div>
                    <p className="text-white/30 text-sm">This may take a few seconds. Results will appear automatically.</p>
                  </>
                ) : (
                  <>
                    <p className="text-white/30 text-lg">{t('ofSearch.noCreatorsFound')} &ldquo;{debouncedQuery}&rdquo;</p>
                    <p className="text-white/20 text-sm mt-2">{t('ofSearch.tryDifferent')}</p>
                  </>
                )}
              </div>
            ) : searchResults.length > 0 ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
                {(() => {
                  const AD_EVERY = 9;
                  const items: React.ReactNode[] = [];
                  let adIdx = 0;

                  searchResults.forEach((creator, i) => {
                    if (allFeatured.length > 0 && i > 0 && i % AD_EVERY === 0) {
                      const tc = allFeatured[adIdx % allFeatured.length];
                      const slotNum = Math.floor(i / AD_EVERY);
                      items.push(
                        <motion.div
                          key={`search-ad-slot-${slotNum}`}
                          initial={{ opacity: 0, y: 14 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                          className="relative"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              trackTrendingClick(tc._id);
                              window.open(tc.url, '_blank', 'noopener,noreferrer');
                            }}
                            className="group w-full text-left rounded-2xl overflow-hidden bg-gradient-to-br from-[#0B1D3A] via-[#122B53] to-[#1A3F73] shadow-[0_14px_36px_-12px_rgba(6,16,36,0.9)] hover:shadow-[0_18px_44px_-10px_rgba(10,27,58,0.95)] ring-[3px] ring-[#FF6A00] hover:ring-[#FF8C3A] transition-all duration-300 cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-[#C7DAFF]/50"
                          >
                            <div className="relative aspect-[3/4] bg-[#0F274C] ring-1 ring-inset ring-[#9FC3FF]/30">
                              {tc.avatar ? (
                                <img
                                  src={tc.avatar}
                                  alt={`${tc.name} OnlyFans`}
                                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500 ease-out"
                                  loading="lazy"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-[#C7DAFF] bg-[#0F274C]">
                                  {tc.name.charAt(0)}
                                </div>
                              )}
                              <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#EAF1FF] text-[#1F4076] text-[9px] font-black uppercase tracking-widest shadow-md ring-1 ring-white/70">
                                  <Crown size={8} fill="currentColor" className="text-[#1F4076]" />
                                  {t('ofSearch.featured')}
                                </span>
                              </div>
                            </div>
                            <div className="px-2.5 pt-2 sm:px-4 sm:pt-3">
                              <div className="flex items-center gap-1.5">
                                <h3 className="font-bold text-[13px] sm:text-[15px] text-white truncate leading-tight drop-shadow-sm">
                                  {tc.name}
                                </h3>
                                {isCreatorLiveNow(tc.liveHourStart ?? -1, tc.liveHourEnd ?? -1) && (
                                  <span className="inline-flex items-center gap-1 shrink-0">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-[pulse_2s_ease-in-out_infinite]" />
                                    <span className="text-[9px] font-bold text-emerald-400 uppercase">Live</span>
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] sm:text-[13px] text-[#BFD7FF] font-semibold mt-0.5">@{tc.username}</p>
                            </div>
                            <div className="px-2.5 pb-2.5 pt-2 sm:px-4 sm:pb-4 sm:pt-3">
                              <div className="w-full py-2 sm:py-2.5 rounded-xl bg-[#FF6A00] text-white text-[13px] sm:text-sm font-black text-center border border-[#FFC08A] shadow-[0_8px_18px_-8px_rgba(255,106,0,0.95)] hover:bg-[#FF7A1A] hover:border-[#FFD0A8] transition-all">
                                {t('ofSearch.viewProfile')}
                              </div>
                            </div>
                          </button>
                        </motion.div>
                      );
                      adIdx++;
                    }

                    items.push(
                      <motion.div
                        key={creator._id}
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25, delay: Math.min(i * 0.02, 0.4) }}
                      >
                        <CreatorCard
                          creator={creator}
                          onClickTrack={trackClick}
                          isAdmin={isAdmin}
                          onDelete={handleDelete}
                          onSendToFeatured={handleSendToFeatured}
                          isSaved={savedIds.has(creator._id)}
                          onToggleSave={handleToggleSave}
                        />
                      </motion.div>
                    );
                  });

                  return items;
                })()}

                {afterSearchCreators
                  .filter((c) => !searchResults.some((s) => s._id === c._id))
                  .map((creator, i) => (
                  <motion.div
                    key={`after-${creator._id}`}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: Math.min(i * 0.015, 0.3) }}
                  >
                    <CreatorCard
                      creator={creator}
                      onClickTrack={trackClick}
                      isAdmin={isAdmin}
                      onDelete={handleDelete}
                          onSendToFeatured={handleSendToFeatured}
                      isSaved={savedIds.has(creator._id)}
                      onToggleSave={handleToggleSave}
                    />
                  </motion.div>
                ))}

                {(afterSearchLoading || progress) &&
                  Array.from({ length: 10 }, (_, i) => (
                    <CreatorCardSkeleton key={`after-sk-${i}`} />
                  ))}
              </div>
            ) : null}
          </section>
        ) : (
          /* ── DEFAULT BROWSE MODE ──────────────────────────────── */
          <>
            {/* Featured creators */}
            {blockFeatured.length > 0 && (
              <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
                <div className="rounded-2xl border border-[#1E3A6E] bg-gradient-to-br from-[#071526] via-[#0D2140] to-[#122B58] p-4 sm:p-6 shadow-[0_24px_60px_-18px_rgba(4,12,28,0.98)]">
                  <div className="flex items-center gap-2 mb-4">
                    <Crown size={14} className="text-[#FF9A50]" fill="currentColor" />
                    <h2 className="text-sm sm:text-base font-black text-white/90">
                      Featured <span className="text-[#FF9A50]">OnlyFans Creators</span>
                    </h2>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-5">
                    {blockFeatured.map((tc) => (
                      <button key={`feat-${tc._id}`} type="button" onClick={() => { trackTrendingClick(tc._id); window.open(tc.url, '_blank', 'noopener,noreferrer'); }} className="group w-full text-left rounded-2xl overflow-hidden bg-gradient-to-br from-[#0B1D3A] via-[#122B53] to-[#1A3F73] ring-[3px] ring-[#FF6A00] hover:ring-[#FF8C3A] shadow-[0_8px_28px_-8px_rgba(255,106,0,0.45)] hover:shadow-[0_12px_36px_-6px_rgba(255,106,0,0.55)] hover:-translate-y-1 transition-all duration-300 cursor-pointer focus:outline-none">
                        <div className="relative aspect-[3/4] bg-[#0F274C]">
                          {tc.avatar ? <img src={tc.avatar} alt={`${tc.name} OnlyFans`} className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500 ease-out" loading="lazy" referrerPolicy="no-referrer" /> : <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-[#C7DAFF] bg-[#0F274C]">{tc.name.charAt(0)}</div>}
                        </div>
                        <div className="px-3 pt-2.5 sm:px-4 sm:pt-3">
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-bold text-[13px] sm:text-[15px] text-white truncate leading-tight">{tc.name}</h3>
                            {isCreatorLiveNow(tc.liveHourStart ?? -1, tc.liveHourEnd ?? -1) && (
                              <span className="inline-flex items-center gap-1 shrink-0">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-[pulse_2s_ease-in-out_infinite]" />
                                <span className="text-[9px] font-bold text-emerald-400 uppercase">Live</span>
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] sm:text-[13px] text-[#7BAEFF] font-semibold mt-0.5">@{tc.username}</p>
                          {(tc.likesCount > 0) && (
                            <p className="text-[10px] sm:text-[11px] text-[#FF9A50] mt-0.5">{formatCount(tc.likesCount)} {t('ofSearch.likes')}</p>
                          )}
                          {tc.categories && tc.categories.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {tc.categories.slice(0, 2).map((cat: string) => (
                                <span key={cat} className="px-1.5 py-0.5 bg-[#FF6A00]/15 text-[#FF9A50] text-[8px] sm:text-[9px] font-bold rounded-md capitalize border border-[#FF6A00]/25">
                                  {cat}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="px-3 pb-3 pt-2 sm:px-4 sm:pb-4 sm:pt-3"><div className="w-full py-2 sm:py-2.5 rounded-xl bg-[#FF6A00] text-white text-[12px] sm:text-sm font-black text-center shadow-lg border border-[#FF9A50] group-hover:bg-[#FF7A1A] transition-colors">{t('ofSearch.viewProfile')}</div></div>
                      </button>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Trending on Erogram */}
            {trendingOnErogram.length > 0 && (
              <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
                <div className="relative overflow-hidden rounded-2xl border border-[#00AFF0]/20 bg-gradient-to-br from-[#061018] via-[#0a1c2e] to-[#0d2844] p-4 sm:p-6 shadow-[0_20px_50px_-12px_rgba(0,175,240,0.18),inset_0_1px_0_0_rgba(255,255,255,0.06)]">
                  <div className="pointer-events-none absolute -top-28 -right-20 h-56 w-56 rounded-full bg-[#00AFF0]/20 blur-3xl" />
                  <div className="pointer-events-none absolute -bottom-24 -left-16 h-48 w-48 rounded-full bg-[#00D4FF]/12 blur-3xl" />
                  <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(0,175,240,0.06)_0%,transparent_45%,rgba(0,212,255,0.04)_100%)]" />
                  <div className="relative">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-[#00AFF0] to-[#00D4FF] flex items-center justify-center shrink-0 shadow-lg shadow-[#00AFF0]/30">
                        <TrendingUp size={18} className="text-white" />
                      </div>
                      <div>
                        <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                          Trending on <span className="text-[#00D4FF]">Erogram</span>
                        </h2>
                        <p className="text-[11px] text-white/50 font-semibold">Top {trendingOnErogram.length} chart · Last 7 days</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                      {[0, 1, 2, 3].map((col) => {
                        const perCol = Math.ceil(trendingOnErogram.length / 4);
                        const chunk = trendingOnErogram.slice(col * perCol, col * perCol + perCol);
                        if (chunk.length === 0) return null;
                        return (
                          <div key={col} className="rounded-xl bg-white overflow-hidden shadow-md">
                            {chunk.map((tc, j) => (
                              <a
                                key={tc._id}
                                href={`/onlyfans/${tc.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => trackClick(tc.slug)}
                                className={`w-full flex items-center hover:brightness-95 transition-all ${
                                  j < chunk.length - 1 ? 'border-b border-gray-100' : ''
                                }`}
                              >
                                <span className="w-6 h-6 rounded-md bg-gray-900 text-white text-[10px] font-black flex items-center justify-center shrink-0 tabular-nums ml-2">
                                  {tc.rank}
                                </span>
                                <div className="flex items-center gap-3 px-2 py-2.5 flex-1 min-w-0">
                                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                                    {tc.avatar ? (
                                      <img src={tc.avatar} alt={tc.name} className="w-full h-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-sm font-bold text-gray-400">{tc.name.charAt(0)}</div>
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-[13px] font-bold text-gray-900 truncate">{tc.name}</p>
                                    <p className="text-[11px] font-black text-gray-500 tabular-nums mt-0.5">{tc.points.toLocaleString()} pts</p>
                                  </div>
                                </div>
                              </a>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Recently Added */}
            {recentPicks.length > 0 && (
              <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
                <div className="relative overflow-hidden rounded-2xl border border-[#00AFF0]/20 bg-gradient-to-br from-[#061018] via-[#0a1c2e] to-[#0d2844] shadow-[0_20px_50px_-12px_rgba(0,175,240,0.18),inset_0_1px_0_0_rgba(255,255,255,0.06)]">
                  <div className="pointer-events-none absolute -top-28 -right-20 h-56 w-56 rounded-full bg-[#00AFF0]/20 blur-3xl" />
                  <div className="pointer-events-none absolute -bottom-24 -left-16 h-48 w-48 rounded-full bg-[#00D4FF]/12 blur-3xl" />
                  <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(0,175,240,0.06)_0%,transparent_45%,rgba(0,212,255,0.04)_100%)]" />
                  <div className="relative p-4 sm:p-6 lg:p-7">
                    <div className="flex items-center justify-between gap-2 mb-3 sm:mb-4 w-full">
                      <h2 className="text-sm sm:text-base font-black text-white/90 tracking-tight whitespace-nowrap">
                        {t('ofSearch.recentlyAdded')} <span className="text-[#00D4FF]">OnlyFans</span> {t('ofSearch.onlyfansCreators')}
                      </h2>
                      <button
                        onClick={shuffleRecent}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg bg-white/[0.08] border border-white/[0.10] text-white/60 text-[11px] sm:text-xs font-bold hover:bg-[#00AFF0]/15 hover:border-[#00AFF0]/30 hover:text-[#00AFF0] transition-all active:scale-[0.98] whitespace-nowrap shrink-0"
                      >
                        <Shuffle size={13} className="shrink-0" />
                        {t('ofSearch.shuffleProfiles')}
                      </button>
                      <Link
                        href={lp('/submit')}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg bg-white/[0.08] border border-white/[0.10] text-white/60 text-[11px] sm:text-xs font-bold hover:bg-[#00AFF0]/15 hover:border-[#00AFF0]/30 hover:text-[#00AFF0] transition-all active:scale-[0.98] whitespace-nowrap shrink-0"
                      >
                        <Plus size={13} className="shrink-0" />
                        {t('ofSearch.addNewCreator')}
                      </Link>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
                      {recentPicks.map((creator, i) => (
                        <motion.div
                          key={creator._id}
                          initial={{ opacity: 0, y: 14 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.25, delay: i * 0.05 }}
                        >
                          <CreatorCard
                            creator={creator}
                            onClickTrack={trackClick}
                            isAdmin={isAdmin}
                            onDelete={handleDelete}
                            onSendToFeatured={handleSendToFeatured}
                            isSaved={savedIds.has(creator._id)}
                            onToggleSave={handleToggleSave}
                          />
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            )}

          {/* Top by Category */}
            {top10Lists.filter((l) => l.creators.length > 0).length > 0 && (
              <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-[#00AFF0] to-[#00D4FF] flex items-center justify-center flex-shrink-0">
                    <Crown size={18} className="text-white" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">Top 10 OnlyFans Creators by Category</h2>
                  <div className="flex-1 h-px bg-white/[0.06]" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
                  {top10Lists.filter((l) => l.creators.length > 0).map((list) => (
                    <Top10CategoryCard key={`top-${list.category}`} list={list} />
                  ))}
                </div>
              </section>
            )}

          </>
        )}
      </main>

      <Footer />

      {/* Creator post modal */}
      {selectedCreator && (
        <CreatorPostModal creator={selectedCreator} onClose={() => setSelectedCreator(null)} />
      )}

      {/* Trending toast */}
      {trendingToast && (
        <div className="fixed bottom-6 right-6 z-50 px-5 py-3 bg-[#1a2a30] border border-[#00AFF0]/30 text-[#00AFF0] text-sm font-semibold rounded-xl shadow-xl animate-in fade-in slide-in-from-bottom-3">
          {trendingToast}
        </div>
      )}
    </div>
  );
}
