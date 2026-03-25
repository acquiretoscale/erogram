'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Search, Bookmark, Crown, Trash2, Star, Flame, X, TrendingUp } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { OF_CATEGORIES, ofCategoryUrl } from './constants';


interface Creator {
  _id: string;
  name: string;
  username: string;
  slug: string;
  avatar: string;
  bio: string;
  likesCount: number;
  photosCount: number;
  videosCount: number;
  price: number;
  isFree: boolean;
  url: string;
  clicks: number;
}

interface Props {
  initialCreators: Creator[];
  totalCreators: number;
  initialQuery?: string;
}

function CreatorCard({
  creator,
  onClickTrack,
  isAdmin,
  onDelete,
  onSendToTrending,
  isSaved,
  onToggleSave,
}: {
  creator: Creator;
  onClickTrack: (slug: string) => void;
  isAdmin: boolean;
  onDelete?: (slug: string) => void;
  onSendToTrending?: (creator: Creator) => void;
  isSaved?: boolean;
  onToggleSave?: (creatorId: string) => void;
}) {
  const [deleted, setDeleted] = useState(false);
  if (deleted) return null;

  return (
    <div className="relative">
      {isAdmin && (
        <div className="absolute top-2 left-2 z-20 flex gap-1.5">
          <span className="h-7 px-2 flex items-center rounded-full bg-black/60 text-white text-[11px] font-bold backdrop-blur-sm tabular-nums" title="Total clicks">
            {creator.clicks || 0}
          </span>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onSendToTrending?.(creator);
            }}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-amber-500/80 hover:bg-amber-500 text-white backdrop-blur-sm transition-all"
            title="Send to Trending"
          >
            <Star size={13} fill="currentColor" />
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
      <div className="group rounded-2xl bg-white overflow-hidden shadow-md hover:shadow-xl transition-shadow">
        <a
          href={creator.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => onClickTrack(creator.slug)}
          className="block"
        >
          <div className="relative aspect-[3/4] bg-gray-100">
            {creator.avatar ? (
              <img
                src={creator.avatar}
                alt={`${creator.name} OnlyFans`}
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-gray-300 bg-gradient-to-br from-gray-100 to-gray-200">
                {creator.name.charAt(0)}
              </div>
            )}
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleSave?.(creator._id); }}
              className={`absolute top-2 right-2 z-10 w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all backdrop-blur-sm ${
                isSaved
                  ? 'bg-[#00AFF0] text-white shadow-lg'
                  : 'bg-black/40 text-white/70 hover:bg-black/60 hover:text-white'
              }`}
              title={isSaved ? 'Remove from saved' : 'Save creator'}
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
                {creator.isFree ? 'Free' : `$${creator.price.toFixed(0)}`}
              </span>
            </div>
            <p className="text-[11px] sm:text-[13px] text-[#00AFF0] mt-0.5">@{creator.username}</p>
            {creator.bio && (
              <p className="mt-1.5 sm:mt-2 text-[11px] sm:text-[12px] text-gray-500 line-clamp-2 leading-relaxed">{creator.bio}</p>
            )}
          </div>
        </a>
        <div className="px-2.5 pb-2.5 pt-2 sm:px-4 sm:pb-4 sm:pt-3">
          <a
            href={creator.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onClickTrack(creator.slug)}
            className="block w-full py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-[#00AFF0] to-[#00D4FF] text-white text-[13px] sm:text-sm font-bold text-center shadow-sm group-hover:shadow-md group-hover:from-[#009ADB] group-hover:to-[#00BFE8] transition-all"
          >
            Try now
          </a>
        </div>
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

export default function OnlyFansClient({ initialCreators, totalCreators, initialQuery = '' }: Props) {
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);

  // Default browse state
  const [creators, setCreators] = useState<Creator[]>(initialCreators);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialCreators.length < totalCreators);

  // Search state — progressive batch loading
  const [searchResults, setSearchResults] = useState<Creator[]>([]);
  const [searchDone, setSearchDone] = useState(false);
  const [progress, setProgress] = useState<{ loaded: number; total: number } | null>(null);

  // Infinite scroll after search results are exhausted
  const [afterSearchCreators, setAfterSearchCreators] = useState<Creator[]>([]);
  const [afterSearchLoading, setAfterSearchLoading] = useState(false);
  const [afterSearchHasMore, setAfterSearchHasMore] = useState(true);

  const [isAdmin, setIsAdmin] = useState(false);
  const [liveUsers, setLiveUsers] = useState(0);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [trendingToast, setTrendingToast] = useState('');
  const [allTrending, setAllTrending] = useState<any[]>([]);
  const [featuredTrending, setFeaturedTrending] = useState<any[]>([]);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchAbortRef = useRef<AbortController | null>(null);
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const isLiveVisitors = liveUsers > 0;

  const TRENDING_SEARCHES = [
    'milf', 'asian', 'teen', 'blonde', 'latina',
    'redhead', 'big boobs', 'petite', 'big ass', 'amateur',
  ];

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

    fetch('/api/onlyfans/trending')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setAllTrending(data);
          const shuffled = [...data].sort(() => Math.random() - 0.5);
          setFeaturedTrending(shuffled.slice(0, 2));
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

  // Search: one fast DB fetch, all results at once (~1-2s)
  const submitSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;

    searchAbortRef.current?.abort();
    const controller = new AbortController();
    searchAbortRef.current = controller;

    setDebouncedQuery(trimmed);
    setSearchResults([]);
    setSearchDone(false);
    setAfterSearchCreators([]);
    setAfterSearchHasMore(true);
    setProgress({ loaded: 0, total: 1 });

    try {
      const res = await fetch(
        `/api/onlyfans/creators/search?q=${encodeURIComponent(trimmed)}&limit=1000&skip=0`,
        { signal: controller.signal },
      );
      const data = await res.json();
      const creators: Creator[] = data.creators || [];
      const total = data.total || 0;

      // Deduplicate by _id
      const seen = new Set<string>();
      const unique = creators.filter((c) => {
        if (seen.has(c._id)) return false;
        seen.add(c._id);
        return true;
      });

      setSearchResults(unique);
      setProgress({ loaded: unique.length, total });

      // Fire-and-forget background scrape (never blocks UI)
      if (data.shouldScrape && data.scrapeQuery) {
        fetch('/api/onlyfans/scrape', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ category: data.scrapeQuery, maxItems: 200, source: 'search' }),
        }).catch(() => {});
      }
    } catch (e: any) {
      if (e.name === 'AbortError') return;
      console.error('Search error:', e);
    } finally {
      if (!controller.signal.aborted) {
        setSearchDone(true);
        setProgress(null);
      }
    }
  }, []);

  // Infinite scroll loader for after-search browsing (excludes search result IDs)
  const loadMoreAfterSearch = useCallback(async () => {
    if (afterSearchLoading || !afterSearchHasMore) return;
    setAfterSearchLoading(true);

    try {
      const searchIds = searchResults.map((c) => c._id);
      const afterIds = afterSearchCreators.map((c) => c._id);
      const excludeIds = [...searchIds, ...afterIds].join(',');
      const res = await fetch(
        `/api/onlyfans/creators?skip=0&limit=80&exclude=${encodeURIComponent(excludeIds)}`,
      );
      const data = await res.json();
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
      window.location.href = `/login?redirect=${encodeURIComponent('/onlyfans-search')}`;
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
    const id = setInterval(fetchActive, 30_000);
    return () => clearInterval(id);
  }, []);

  const trackClick = (slug: string) => {
    fetch('/api/onlyfans/click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug }),
    }).catch(() => {});
  };

  const handleDelete = async (slug: string) => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Not logged in — cannot delete');
      return;
    }
    try {
      const res = await fetch(`/api/onlyfans/creators/${slug}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        if (isSearchMode) {
          setSearchResults((prev) => prev.filter((c) => c.slug !== slug));
        } else {
          setCreators((prev) => prev.filter((c) => c.slug !== slug));
        }
      } else {
        const data = await res.json().catch(() => ({}));
        alert(`Delete failed: ${data.error || res.statusText}`);
      }
    } catch (e: any) {
      alert(`Delete failed: ${e.message}`);
    }
  };

  const showTrendingToast = (msg: string) => {
    setTrendingToast(msg);
    setTimeout(() => setTrendingToast(''), 3000);
  };

  const refreshTrending = useCallback(() => {
    fetch('/api/onlyfans/trending')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setAllTrending(data);
          const shuffled = [...data].sort(() => Math.random() - 0.5);
          setFeaturedTrending(shuffled.slice(0, 2));
        }
      })
      .catch(() => {});
  }, []);

  const handleSendToTrending = async (creator: Creator) => {
    const token = localStorage.getItem('token');
    if (!token) {
      showTrendingToast('Login required');
      return;
    }

    try {
      const slotsRes = await fetch('/api/OFM/trending', { headers: { Authorization: `Bearer ${token}` } });
      const slotsData = await slotsRes.json();
      const occupied = new Set<number>();
      if (Array.isArray(slotsData)) {
        for (const s of slotsData) occupied.add(s.position);
      }

      let targetSlot = 0;
      for (let i = 1; i <= 12; i++) {
        if (!occupied.has(i)) { targetSlot = i; break; }
      }
      if (targetSlot === 0) targetSlot = 1;

      const res = await fetch('/api/OFM/trending', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: creator.name,
          username: creator.username,
          avatar: creator.avatar,
          url: creator.url,
          bio: creator.bio,
          categories: [],
          position: targetSlot,
          active: true,
        }),
      });

      if (res.ok) {
        showTrendingToast(`${creator.name} → Trending Spot #${targetSlot}`);
        refreshTrending();
      } else {
        const err = await res.json().catch(() => ({}));
        showTrendingToast(`Failed: ${err.error || res.statusText}`);
      }
    } catch {
      showTrendingToast('Failed to add to trending');
    }
  };

  // Infinite scroll — default browse mode
  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);

    try {
      const excludeIds = creators.map((c) => c._id).join(',');
      const res = await fetch(
        `/api/onlyfans/creators?skip=0&limit=80&exclude=${encodeURIComponent(excludeIds)}`,
      );
      const data = await res.json();
      if (data.creators && data.creators.length > 0) {
        setCreators((prev) => {
          const existingIds = new Set(prev.map((c) => c._id));
          const newCreators = data.creators.filter((c: Creator) => !existingIds.has(c._id));
          return [...prev, ...newCreators];
        });
        setHasMore(data.hasMore);
      } else {
        setHasMore(false);
      }
    } catch (e) {
      console.error('Failed to load more creators:', e);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, creators]);

  // Scroll handler — browse mode only
  useEffect(() => {
    if (isSearchMode) return;

    const handleScroll = () => {
      if (
        window.innerHeight + window.scrollY >= document.body.offsetHeight - 800 &&
        !loading &&
        hasMore
      ) {
        loadMore();
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadMore, loading, hasMore, isSearchMode]);

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
        {/* Hero — compact */}
        <section className="relative bg-gradient-to-b from-[#00AFF0]/10 via-[#00AFF0]/[0.04] to-[#111111] pt-6 pb-4 sm:pt-8 sm:pb-6 z-20">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-[#00AFF0]/[0.08] blur-[120px]" />
          </div>

          <div className="relative max-w-2xl mx-auto px-4 sm:px-6 text-center">
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="text-3xl sm:text-4xl lg:text-5xl font-black leading-tight tracking-tight"
            >
              OnlyFans{' '}
              <span className="text-[#00AFF0]">Search</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.05 }}
              className="mt-2 text-sm sm:text-base text-white/50 max-w-lg mx-auto"
            >
              Explore 1.8M+ OnlyFans creators. Search by keyword, bookmark your favorites, and filter by category.
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
                  placeholder="Search by name, keyword, ethnicity... press Enter"
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

                {/* Trending suggestions dropdown */}
                {searchFocused && !query && (
                  <div className="absolute left-0 right-0 top-full z-50 bg-[#1a1a1a] border border-white/[0.08] border-t-0 rounded-b-xl shadow-2xl overflow-hidden">
                    <div className="grid grid-cols-2">
                      {TRENDING_SEARCHES.map((term) => (
                        <button
                          key={term}
                          type="button"
                          onClick={() => {
                            setQuery(term);
                            setSearchFocused(false);
                            submitSearch(term);
                          }}
                          className="flex items-center gap-2.5 px-3.5 py-2 text-left hover:bg-white/[0.05] transition-colors border-b border-r border-white/[0.04] last:border-b-0 [&:nth-last-child(2):nth-child(odd)]:border-b-0"
                        >
                          <TrendingUp size={12} className="text-white/25 flex-shrink-0" />
                          <span className="text-sm text-white/70">{term}</span>
                        </button>
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
                <span className="text-white/40 text-[11px] sm:text-sm">Visiting now</span>
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
                    href="/onlyfans-search"
                    className="px-2.5 py-1 sm:px-2 sm:py-0.5 rounded-full bg-[#00AFF0]/15 border border-[#00AFF0]/30 text-[#00AFF0] text-[11px] sm:text-[10px] font-semibold transition-all"
                  >
                    All
                  </Link>
                  {OF_CATEGORIES.map((cat) => (
                    <Link
                      key={cat.slug}
                      href={ofCategoryUrl(cat.slug)}
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
          <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-12">
            <div className="flex items-start sm:items-center justify-between gap-3 mb-4 sm:mb-6">
              <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-[#00AFF0] to-[#00D4FF] flex items-center justify-center flex-shrink-0">
                  <Search size={14} className="text-white sm:hidden" />
                  <Search size={16} className="text-white hidden sm:block" />
                </div>
                <h2 className="text-base sm:text-xl font-black text-white/90 truncate">
                  Results for &ldquo;{debouncedQuery}&rdquo;
                </h2>
              </div>
              <button
                onClick={clearSearch}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white/40 text-xs sm:text-sm hover:bg-white/[0.10] hover:text-white/70 transition-all flex-shrink-0"
              >
                <X size={14} />
                <span className="hidden sm:inline">Clear</span>
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
              <div className="grid grid-cols-4 gap-2.5 sm:gap-4 lg:gap-5">
                {Array.from({ length: 8 }, (_, i) => (
                  <CreatorCardSkeleton key={`sk-${i}`} />
                ))}
              </div>
            ) : searchDone && searchResults.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-white/30 text-lg">No creators found for &ldquo;{debouncedQuery}&rdquo;</p>
                <p className="text-white/20 text-sm mt-2">Try a different search term</p>
              </div>
            ) : searchResults.length > 0 ? (
              <div className="grid grid-cols-4 gap-2.5 sm:gap-4 lg:gap-5">
                {(() => {
                  const TRENDING_INTERVAL = 20;
                  const FIRST_INSERT = 2;
                  const items: React.ReactNode[] = [];
                  let trendingIdx = 0;

                  searchResults.forEach((creator, i) => {
                    const shouldInsert = allTrending.length > 0 &&
                      (i === FIRST_INSERT || (i > FIRST_INSERT && (i - FIRST_INSERT) % TRENDING_INTERVAL === 0));

                    if (shouldInsert) {
                      const tc = allTrending[trendingIdx % allTrending.length];
                      items.push(
                        <motion.div
                          key={`trending-${tc._id}-${i}`}
                          initial={{ opacity: 0, y: 14 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: Math.min(i * 0.02, 0.4) }}
                          className="relative"
                        >
                          <div className="absolute -top-2.5 left-3 z-20">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-orange-500 to-rose-500 text-white text-[10px] font-black uppercase tracking-wider shadow-lg shadow-orange-500/40">
                              <Flame size={9} fill="currentColor" />
                              Trending
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              fetch(`/api/onlyfans/trending/${tc._id}/click`, { method: 'POST' }).catch(() => {});
                              window.open(tc.url, '_blank', 'noopener,noreferrer');
                            }}
                            className="group w-full text-left rounded-2xl bg-white overflow-hidden shadow-md ring-2 ring-orange-400/60 hover:ring-orange-400 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-orange-400/60"
                          >
                            <div className="relative aspect-[3/4] bg-gray-100">
                              {tc.avatar ? (
                                <img
                                  src={tc.avatar}
                                  alt={`${tc.name} OnlyFans`}
                                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500 ease-out"
                                  loading="lazy"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-gray-300 bg-gradient-to-br from-gray-100 to-gray-200">
                                  {tc.name.charAt(0)}
                                </div>
                              )}
                            </div>
                            <div className="px-2.5 pt-2 pb-2.5 sm:px-4 sm:pt-3 sm:pb-4">
                              <h3 className="font-bold text-[13px] sm:text-[15px] text-gray-900 truncate leading-tight group-hover:text-orange-500 transition-colors">
                                {tc.name}
                              </h3>
                              <p className="text-[11px] sm:text-[13px] text-[#00AFF0] mt-0.5">@{tc.username}</p>
                              {tc.bio && (
                                <p className="mt-1.5 sm:mt-2 text-[11px] sm:text-[12px] text-gray-500 line-clamp-2 leading-relaxed">{tc.bio}</p>
                              )}
                              <div className="w-full mt-2 sm:mt-3 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 text-white text-[13px] sm:text-sm font-bold text-center shadow-sm group-hover:shadow-md group-hover:from-orange-600 group-hover:to-rose-600 transition-all">
                                View profile
                              </div>
                            </div>
                          </button>
                        </motion.div>
                      );
                      trendingIdx++;
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
                          onSendToTrending={handleSendToTrending}
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
                      onSendToTrending={handleSendToTrending}
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
            {/* All Creators — trending inline then infinite scroll */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-12">
              <div className="flex items-center gap-2 sm:gap-2.5 mb-4 sm:mb-6">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-[#00AFF0] to-[#00D4FF] flex items-center justify-center">
                  <Crown size={14} className="text-white sm:hidden" />
                  <Crown size={16} className="text-white hidden sm:block" />
                </div>
                <h2 className="text-lg sm:text-xl font-black text-white/90">
                  OnlyFans Creators
                </h2>
              </div>

              {(() => {
                const CHUNK_SIZE = 160;
                const chunks: Creator[][] = [];
                for (let i = 0; i < creators.length; i += CHUNK_SIZE) {
                  chunks.push(creators.slice(i, i + CHUNK_SIZE));
                }

                return chunks.map((chunk, chunkIdx) => (
                  <div key={`chunk-${chunkIdx}`}>
                    <div className="grid grid-cols-4 gap-2.5 sm:gap-4 lg:gap-5">
                      {(() => {
                        const items: React.ReactNode[] = [];

                        {/* Trending block as first item, spans 2 columns */}
                        if (chunkIdx === 0 && featuredTrending.length > 0) {
                          items.push(
                            <motion.div
                              key="trending-block"
                              initial={{ opacity: 0, y: 14 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.4 }}
                              className="col-span-2 relative rounded-xl sm:rounded-2xl overflow-hidden border-2 border-orange-400/80 bg-gradient-to-br from-orange-500 via-orange-600 to-rose-600 p-0.5 shadow-[0_0_40px_-5px_rgba(249,115,22,0.80)]"
                            >
                              <div className="absolute inset-0 pointer-events-none">
                                <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-orange-500/20 blur-[80px]" />
                                <div className="absolute -bottom-12 -left-12 w-40 h-40 rounded-full bg-rose-500/15 blur-[70px]" />
                              </div>
                              <div className="relative rounded-[0.875rem] bg-gradient-to-br from-orange-500/30 via-orange-600/20 to-rose-600/20 backdrop-blur-sm px-2.5 py-3 sm:px-4 sm:py-5">
                                <div className="flex items-center gap-2 mb-3 sm:mb-4">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-orange-500 to-rose-500 text-white text-[9px] font-black uppercase tracking-wider shadow-lg shadow-orange-500/40">
                                    <Flame size={9} fill="currentColor" />
                                    Trending OnlyFans Creators
                                  </span>
                                  <div className="flex-1 h-px bg-gradient-to-r from-orange-500/30 to-transparent" />
                                </div>
                                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                                  {featuredTrending.map((tc, ti) => (
                                    <button
                                      key={`ft-${tc._id}`}
                                      type="button"
                                      onClick={() => {
                                        fetch(`/api/onlyfans/trending/${tc._id}/click`, { method: 'POST' }).catch(() => {});
                                        window.open(tc.url, '_blank', 'noopener,noreferrer');
                                      }}
                                      className="group w-full text-left rounded-lg sm:rounded-xl bg-white overflow-hidden shadow-md ring-1 ring-orange-400/50 hover:ring-orange-400 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 cursor-pointer focus:outline-none"
                                    >
                                      <div className="relative aspect-[3/4] bg-gray-100">
                                        {tc.avatar ? (
                                          <img
                                            src={tc.avatar}
                                            alt={`${tc.name} OnlyFans`}
                                            className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500 ease-out"
                                            loading="lazy"
                                            referrerPolicy="no-referrer"
                                          />
                                        ) : (
                                          <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-gray-300 bg-gradient-to-br from-gray-100 to-gray-200">
                                            {tc.name.charAt(0)}
                                          </div>
                                        )}
                                      </div>
                                      <div className="px-2 pt-2 pb-2 sm:px-3 sm:pt-2.5 sm:pb-3">
                                        <h3 className="font-bold text-[12px] sm:text-[13px] text-gray-900 truncate leading-tight group-hover:text-orange-500 transition-colors">
                                          {tc.name}
                                        </h3>
                                        <p className="text-[10px] sm:text-[11px] text-[#00AFF0] mt-0.5">@{tc.username}</p>
                                        {tc.bio && (
                                          <p className="mt-1 text-[10px] sm:text-[11px] text-gray-500 line-clamp-1 sm:line-clamp-2 leading-relaxed">{tc.bio}</p>
                                        )}
                                        <div className="w-full mt-1.5 sm:mt-2 py-1.5 sm:py-2 rounded-lg bg-gradient-to-r from-[#00AFF0] to-[#00D4FF] text-white text-[11px] sm:text-xs font-bold text-center group-hover:from-[#009ADB] group-hover:to-[#00BFE8] transition-all">
                                          View profile
                                        </div>
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </motion.div>
                          );
                        }

                        const TRENDING_INTERVAL = 20;
                        let trendingIdx = 0;
                        const globalOffset = chunkIdx * CHUNK_SIZE;

                        chunk.forEach((creator, i) => {
                          const globalPos = globalOffset + i;
                          if (allTrending.length > 0 && globalPos > 0 && globalPos % TRENDING_INTERVAL === 0) {
                            const tc = allTrending[trendingIdx % allTrending.length];
                            items.push(
                              <motion.div
                                key={`browse-trending-${tc._id}-${globalPos}`}
                                initial={{ opacity: 0, y: 14 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                                className="relative"
                              >
                                <div className="absolute -top-2.5 left-3 z-20">
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-orange-500 to-rose-500 text-white text-[10px] font-black uppercase tracking-wider shadow-lg shadow-orange-500/40">
                                    <Flame size={9} fill="currentColor" />
                                    Trending
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    fetch(`/api/onlyfans/trending/${tc._id}/click`, { method: 'POST' }).catch(() => {});
                                    window.open(tc.url, '_blank', 'noopener,noreferrer');
                                  }}
                                  className="group w-full text-left rounded-2xl bg-white overflow-hidden shadow-md ring-2 ring-orange-400/60 hover:ring-orange-400 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-orange-400/60"
                                >
                                  <div className="relative aspect-[3/4] bg-gray-100">
                                    {tc.avatar ? (
                                      <img
                                        src={tc.avatar}
                                        alt={`${tc.name} OnlyFans`}
                                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500 ease-out"
                                        loading="lazy"
                                        referrerPolicy="no-referrer"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-gray-300 bg-gradient-to-br from-gray-100 to-gray-200">
                                        {tc.name.charAt(0)}
                                      </div>
                                    )}
                                  </div>
                                  <div className="px-2.5 pt-2 pb-2.5 sm:px-4 sm:pt-3 sm:pb-4">
                                    <h3 className="font-bold text-[13px] sm:text-[15px] text-gray-900 truncate leading-tight group-hover:text-orange-500 transition-colors">
                                      {tc.name}
                                    </h3>
                                    <p className="text-[11px] sm:text-[13px] text-[#00AFF0] mt-0.5">@{tc.username}</p>
                                    {tc.bio && (
                                      <p className="mt-1.5 sm:mt-2 text-[11px] sm:text-[12px] text-gray-500 line-clamp-2 leading-relaxed">{tc.bio}</p>
                                    )}
                                    <div className="w-full mt-2 sm:mt-3 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 text-white text-[13px] sm:text-sm font-bold text-center shadow-sm group-hover:shadow-md group-hover:from-orange-600 group-hover:to-rose-600 transition-all">
                                      View profile
                                    </div>
                                  </div>
                                </button>
                              </motion.div>
                            );
                            trendingIdx++;
                          }

                          items.push(
                            <motion.div
                              key={creator._id}
                              initial={{ opacity: 0, y: 14 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.25, delay: Math.min(i * 0.02, 0.3) }}
                            >
                              <CreatorCard
                                creator={creator}
                                onClickTrack={trackClick}
                                isAdmin={isAdmin}
                                onDelete={handleDelete}
                                onSendToTrending={handleSendToTrending}
                                isSaved={savedIds.has(creator._id)}
                                onToggleSave={handleToggleSave}
                              />
                            </motion.div>
                          );
                        });

                        if (chunkIdx === chunks.length - 1 && loading) {
                          Array.from({ length: 10 }, (_, i) => {
                            items.push(<CreatorCardSkeleton key={`skeleton-${i}`} />);
                          });
                        }

                        return items;
                      })()}
                    </div>
                  </div>
                ));
              })()}
            </section>
          </>
        )}
      </main>

      {/* ── Footer with Categories ── */}
      <footer className="border-t border-white/[0.06] bg-[#0a0a0a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 lg:py-16">
          <h3 className="text-base sm:text-lg font-black text-white/70 mb-4 sm:mb-6">Browse by Category</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-8 gap-x-3 sm:gap-x-4 gap-y-1 sm:gap-y-2">
            {OF_CATEGORIES.map((cat) => (
              <Link
                key={cat.slug}
                href={ofCategoryUrl(cat.slug)}
                className="flex items-center gap-1.5 sm:gap-2 py-2 sm:py-1.5 text-[13px] sm:text-sm text-white/40 hover:text-[#00AFF0] transition-colors"
              >
                <span className="text-sm sm:text-base">{cat.emoji}</span>
                <span>{cat.name}</span>
              </Link>
            ))}
          </div>
          <div className="mt-8 pt-6 border-t border-white/[0.04] text-center">
            <p className="text-xs text-white/20">
              &copy; {new Date().getFullYear()} Erogram &mdash; OnlyFans Creator Directory
            </p>
          </div>
        </div>
      </footer>

      {/* Trending toast */}
      {trendingToast && (
        <div className="fixed bottom-6 right-6 z-50 px-5 py-3 bg-[#1a2a30] border border-[#00AFF0]/30 text-[#00AFF0] text-sm font-semibold rounded-xl shadow-xl animate-in fade-in slide-in-from-bottom-3">
          {trendingToast}
        </div>
      )}
    </div>
  );
}
