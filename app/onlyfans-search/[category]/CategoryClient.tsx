'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Search, ArrowLeft, Heart, Globe, Trash2, Flame, X, TrendingUp, ChevronUp } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { OF_CATEGORIES, ofCategoryUrl } from '../constants';

interface Creator {
  _id: string;
  name: string;
  username: string;
  slug: string;
  avatar: string;
  header: string;
  bio: string;
  subscriberCount: number;
  likesCount: number;
  mediaCount: number;
  photosCount: number;
  videosCount: number;
  price: number;
  isFree: boolean;
  isVerified: boolean;
  url: string;
  clicks?: number;
}

interface CountryLink {
  name: string;
  flag: string;
  href: string;
}

interface Props {
  creators: Creator[];
  category: string;
  label: string;
  countryLinks?: CountryLink[];
  canonicalUrl?: string;
}

export default function CategoryClient({ creators: initialCreators, category, label, countryLinks = [] }: Props) {
  const router = useRouter();
  const [creators, setCreators] = useState(initialCreators);
  const [navQuery, setNavQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'free' | 'paid' | 'price-low' | 'price-high'>('all');
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [allTrending, setAllTrending] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  const [afterCategoryCreators, setAfterCategoryCreators] = useState<Creator[]>([]);
  const [afterCategoryLoading, setAfterCategoryLoading] = useState(false);
  const [afterCategoryHasMore, setAfterCategoryHasMore] = useState(true);
  const [showBackToTop, setShowBackToTop] = useState(false);

  const TRENDING_SEARCHES = [
    'milf', 'asian', 'teen', 'blonde', 'latina',
    'redhead', 'big boobs', 'petite', 'big ass', 'amateur',
  ];

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

    fetch('/api/onlyfans/trending')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setAllTrending(data); })
      .catch(() => {});
  }, [category]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleSave = async (creatorId: string) => {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
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
  };

  const trackClick = (slug: string) => {
    fetch('/api/onlyfans/click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug }),
    }).catch(() => {});
  };

  const handleDelete = async (slug: string) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/onlyfans/creators/${slug}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setCreators((prev) => prev.filter((c) => c.slug !== slug));
      } else {
        const data = await res.json().catch(() => ({}));
        alert(`Delete failed: ${data.error || res.statusText}`);
      }
    } catch (e: any) {
      alert(`Delete failed: ${e.message}`);
    }
  };

  const sorted = useMemo(() => {
    let list = [...creators];
    if (filter === 'free') list = list.filter((c) => c.isFree);
    else if (filter === 'paid') list = list.filter((c) => !c.isFree);

    if (filter === 'price-low') list.sort((a, b) => a.price - b.price);
    else if (filter === 'price-high') list.sort((a, b) => b.price - a.price);
    else list.sort((a, b) => b.likesCount - a.likesCount);

    return list;
  }, [creators, filter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (navQuery.trim()) {
      router.push(`/onlyfans-search?q=${encodeURIComponent(navQuery.trim())}`);
    }
  };

  const loadMoreAfterCategory = useCallback(async () => {
    if (afterCategoryLoading || !afterCategoryHasMore) return;
    setAfterCategoryLoading(true);

    try {
      const categoryIds = creators.map((c) => c._id);
      const afterIds = afterCategoryCreators.map((c) => c._id);
      const excludeIds = [...categoryIds, ...afterIds].join(',');
      const res = await fetch(
        `/api/onlyfans/creators?skip=0&limit=20&exclude=${encodeURIComponent(excludeIds)}`,
      );
      const data = await res.json();
      if (data.creators && data.creators.length > 0) {
        setAfterCategoryCreators((prev) => {
          const existingIds = new Set(prev.map((c) => c._id));
          const fresh = data.creators.filter((c: Creator) => !existingIds.has(c._id));
          return [...prev, ...fresh];
        });
        setAfterCategoryHasMore(data.hasMore);
      } else {
        setAfterCategoryHasMore(false);
      }
    } catch (e) {
      console.error('Failed to load more after category:', e);
    } finally {
      setAfterCategoryLoading(false);
    }
  }, [afterCategoryLoading, afterCategoryHasMore, creators, afterCategoryCreators]);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 600);

      if (
        window.innerHeight + window.scrollY >= document.body.offsetHeight - 800 &&
        !afterCategoryLoading &&
        afterCategoryHasMore
      ) {
        loadMoreAfterCategory();
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadMoreAfterCategory, afterCategoryLoading, afterCategoryHasMore]);

  return (
    <div className="min-h-screen bg-[#111111] text-[#f5f5f5]">
      <Navbar variant="onlyfans" />

      <main className="pt-20">
        {/* Hero */}
        <section className="relative bg-gradient-to-b from-[#00AFF0]/10 via-[#00AFF0]/[0.04] to-[#111111] pt-6 pb-4 sm:pt-8 sm:pb-6 z-20">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-[#00AFF0]/[0.08] blur-[120px]" />
          </div>

          <div className="relative max-w-2xl mx-auto px-4 sm:px-6 text-center">
            <Link
              href="/onlyfans-search"
              className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-[#00AFF0] transition-colors mb-3"
            >
              <ArrowLeft size={14} />
              OnlyFans Search
            </Link>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="text-2xl sm:text-3xl lg:text-4xl font-black leading-tight tracking-tight"
            >
              Best {label}{' '}
              <span className="text-[#00AFF0]">OnlyFans</span> Creators
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.05 }}
              className="mt-2 text-sm sm:text-base text-white/50 max-w-lg mx-auto"
            >
              {creators.length > 0
                ? `Browse verified ${label.toLowerCase()} OnlyFans accounts. Compare prices and find the best ${label.toLowerCase()} creators.`
                : `No ${label.toLowerCase()} creators yet. Check back soon.`}
            </motion.p>

            {/* Search bar — navigates to /onlyfans-search */}
            <motion.form
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.08 }}
              onSubmit={handleSearchSubmit}
              className="mt-4 max-w-xl mx-auto"
            >
              <div className="relative" ref={searchBoxRef}>
                <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none">
                  <Search size={16} className="text-white/30" />
                </div>
                <input
                  type="text"
                  value={navQuery}
                  onChange={(e) => setNavQuery(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  placeholder="Search by name, keyword, location, ethnicity..."
                  className={`w-full pl-10 pr-10 py-2.5 bg-white/[0.06] border border-white/[0.08] text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-[#00AFF0]/40 focus:border-[#00AFF0]/30 transition-all ${searchFocused && !navQuery ? 'rounded-t-xl rounded-b-none border-b-0' : 'rounded-xl'}`}
                />
                {navQuery && (
                  <button
                    type="button"
                    onClick={() => setNavQuery('')}
                    className="absolute inset-y-0 right-3.5 flex items-center text-white/30 hover:text-white/70 transition-colors"
                  >
                    <X size={16} />
                  </button>
                )}

                {searchFocused && !navQuery && (
                  <div className="absolute left-0 right-0 top-full z-50 bg-[#1a1a1a] border border-white/[0.08] border-t-0 rounded-b-xl shadow-2xl overflow-hidden">
                    <div className="grid grid-cols-2">
                      {TRENDING_SEARCHES.map((term) => (
                        <button
                          key={term}
                          type="button"
                          onClick={() => {
                            setSearchFocused(false);
                            router.push(`/onlyfans-search?q=${encodeURIComponent(term)}`);
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
            </motion.form>

            {/* Category keyword pills */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.12 }}
              className="mt-3"
            >
              <div className="flex flex-wrap justify-center gap-1.5 sm:gap-1">
                <Link
                  href="/onlyfans-search"
                  className="px-2.5 py-1 sm:px-2 sm:py-0.5 rounded-full border text-[11px] sm:text-[10px] font-semibold transition-all bg-white/[0.06] border-white/[0.10] text-white/50 hover:bg-[#00AFF0]/10 hover:border-[#00AFF0]/30 hover:text-[#00AFF0]"
                >
                  All
                </Link>
                {OF_CATEGORIES.map((cat) => (
                  <Link
                    key={cat.slug}
                    href={ofCategoryUrl(cat.slug)}
                    className={`px-2.5 py-1 sm:px-2 sm:py-0.5 rounded-full border text-[11px] sm:text-[10px] font-semibold transition-all ${
                      cat.slug === category
                        ? 'bg-[#00AFF0]/15 border-[#00AFF0]/30 text-[#00AFF0]'
                        : 'bg-white/[0.06] border-white/[0.10] text-white/50 hover:bg-[#00AFF0]/10 hover:border-[#00AFF0]/30 hover:text-[#00AFF0]'
                    }`}
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* Results Grid */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          {/* Filter bar */}
          <div className="flex justify-center mb-4 sm:mb-6 -mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto scrollbar-hide">
            <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.08] flex-shrink-0">
              {([
                { key: 'all', label: 'All' },
                { key: 'free', label: 'Free' },
                { key: 'paid', label: 'Paid' },
              ] as const).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`px-3 py-2 sm:py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                    filter === key
                      ? 'bg-[#00AFF0]/20 text-[#00AFF0]'
                      : 'text-white/40 hover:text-white/70'
                  }`}
                >
                  {label}
                </button>
              ))}
              <button
                onClick={() => setFilter(filter === 'price-low' ? 'price-high' : 'price-low')}
                className={`px-3 py-2 sm:py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  filter === 'price-low' || filter === 'price-high'
                    ? 'bg-[#00AFF0]/20 text-[#00AFF0]'
                    : 'text-white/40 hover:text-white/70'
                }`}
              >
                {filter === 'price-high' ? 'Highest first' : 'Lowest first'}
              </button>
            </div>
          </div>

          {sorted.length === 0 && allTrending.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-white/30 text-lg">No creators in this category yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2.5 sm:gap-4 lg:gap-5">
              {(() => {
                const TRENDING_INTERVAL = 20;
                const FIRST_INSERT = 2;
                const items: React.ReactNode[] = [];
                let trendingIdx = 0;

                sorted.forEach((creator, i) => {
                  const shouldInsert = allTrending.length > 0 &&
                    (i === FIRST_INSERT || (i > FIRST_INSERT && (i - FIRST_INSERT) % TRENDING_INTERVAL === 0));

                  if (shouldInsert) {
                    const tc = allTrending[trendingIdx % allTrending.length];
                    items.push(
                      <motion.div
                        key={`trending-${tc._id}-${i}`}
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: Math.min(i * 0.012, 0.25) }}
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
                      transition={{ duration: 0.25, delay: Math.min(i * 0.012, 0.25) }}
                    >
                      <div className="relative">
                        <a
                          href={creator.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => trackClick(creator.slug)}
                          className="group block rounded-2xl bg-white overflow-hidden shadow-md hover:shadow-xl transition-shadow"
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
                          </div>

                          <div className="px-2.5 pt-2 pb-2.5 sm:px-4 sm:pt-3 sm:pb-4">
                            <div className="flex items-center gap-1.5 sm:gap-2">
                              <h3 className="font-bold text-[13px] sm:text-[15px] text-gray-900 truncate leading-tight">
                                {creator.name}
                              </h3>
                              <span className={`flex-shrink-0 px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wide ${
                                creator.isFree
                                  ? 'bg-emerald-400 text-white'
                                  : 'bg-[#00AFF0] text-white'
                              }`}>
                                {creator.isFree ? 'Free' : `$${creator.price.toFixed(0)}`}
                              </span>
                            </div>

                            <p className="text-[11px] sm:text-[13px] text-[#00AFF0] mt-0.5">
                              @{creator.username}
                            </p>

                            {creator.bio && (
                              <p className="mt-1.5 sm:mt-2 text-[11px] sm:text-[12px] text-gray-500 line-clamp-2 leading-relaxed">
                                {creator.bio}
                              </p>
                            )}

                            <button className="w-full mt-2 sm:mt-3 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-[#00AFF0] to-[#00D4FF] text-white text-[13px] sm:text-sm font-bold shadow-sm group-hover:shadow-md group-hover:from-[#009ADB] group-hover:to-[#00BFE8] transition-all">
                              View profile
                            </button>
                          </div>
                        </a>

                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleToggleSave(creator._id);
                          }}
                          className="absolute top-2 right-2 sm:top-3 sm:right-3 z-10 w-10 h-10 sm:w-9 sm:h-9 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center transition-all hover:scale-110"
                          title={savedIds.has(creator._id) ? 'Remove from saved' : 'Save creator'}
                        >
                          <Heart
                            size={18}
                            className={savedIds.has(creator._id) ? 'text-rose-500' : 'text-white/80'}
                            fill={savedIds.has(creator._id) ? 'currentColor' : 'none'}
                          />
                        </button>

                        {isAdmin && (
                          <div className="absolute top-3 left-3 z-10 flex gap-1.5">
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (confirm(`Delete ${creator.name}?`)) handleDelete(creator.slug);
                              }}
                              className="w-7 h-7 flex items-center justify-center rounded-full bg-red-500/80 hover:bg-red-500 text-white backdrop-blur-sm transition-all"
                              title="Delete profile"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                });

                return items;
              })()}

              {afterCategoryCreators.map((creator, i) => (
                <motion.div
                  key={`after-${creator._id}`}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: Math.min(i * 0.015, 0.3) }}
                >
                  <div className="relative">
                    <a
                      href={creator.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => trackClick(creator.slug)}
                      className="group block rounded-2xl bg-white overflow-hidden shadow-md hover:shadow-xl transition-shadow"
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
                      </div>

                      <div className="px-2.5 pt-2 pb-2.5 sm:px-4 sm:pt-3 sm:pb-4">
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <h3 className="font-bold text-[13px] sm:text-[15px] text-gray-900 truncate leading-tight">
                            {creator.name}
                          </h3>
                          <span className={`flex-shrink-0 px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wide ${
                            creator.isFree
                              ? 'bg-emerald-400 text-white'
                              : 'bg-[#00AFF0] text-white'
                          }`}>
                            {creator.isFree ? 'Free' : `$${creator.price.toFixed(0)}`}
                          </span>
                        </div>

                        <p className="text-[11px] sm:text-[13px] text-[#00AFF0] mt-0.5">
                          @{creator.username}
                        </p>

                        {creator.bio && (
                          <p className="mt-1.5 sm:mt-2 text-[11px] sm:text-[12px] text-gray-500 line-clamp-2 leading-relaxed">
                            {creator.bio}
                          </p>
                        )}

                        <button className="w-full mt-2 sm:mt-3 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-[#00AFF0] to-[#00D4FF] text-white text-[13px] sm:text-sm font-bold shadow-sm group-hover:shadow-md group-hover:from-[#009ADB] group-hover:to-[#00BFE8] transition-all">
                          View profile
                        </button>
                      </div>
                    </a>

                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleToggleSave(creator._id);
                      }}
                      className="absolute top-2 right-2 sm:top-3 sm:right-3 z-10 w-10 h-10 sm:w-9 sm:h-9 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center transition-all hover:scale-110"
                      title={savedIds.has(creator._id) ? 'Remove from saved' : 'Save creator'}
                    >
                      <Heart
                        size={18}
                        className={savedIds.has(creator._id) ? 'text-rose-500' : 'text-white/80'}
                        fill={savedIds.has(creator._id) ? 'currentColor' : 'none'}
                      />
                    </button>

                    {isAdmin && (
                      <div className="absolute top-3 left-3 z-10 flex gap-1.5">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (confirm(`Delete ${creator.name}?`)) handleDelete(creator.slug);
                          }}
                          className="w-7 h-7 flex items-center justify-center rounded-full bg-red-500/80 hover:bg-red-500 text-white backdrop-blur-sm transition-all"
                          title="Delete profile"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}

              {afterCategoryLoading &&
                Array.from({ length: 10 }, (_, i) => (
                  <div key={`skeleton-${i}`} className="rounded-2xl bg-white overflow-hidden shadow-md animate-pulse">
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
                ))}
            </div>
          )}
        </section>

        {/* Browse by country */}
        {countryLinks.length > 0 && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-20">
            <div className="border-t border-white/[0.06] pt-10">
              <div className="flex items-center gap-2 mb-5">
                <Globe size={18} className="text-[#00AFF0]" />
                <h2 className="text-lg font-bold text-white/80">
                  {label} OnlyFans by Country
                </h2>
              </div>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {countryLinks.map((cl) => (
                  <Link
                    key={cl.href}
                    href={cl.href}
                    className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 sm:py-2 rounded-xl text-[11px] sm:text-xs font-medium bg-white/[0.04] text-white/50 border border-white/[0.06] hover:bg-[#00AFF0]/10 hover:text-[#00AFF0] hover:border-[#00AFF0]/20 transition-all"
                  >
                    <span>{cl.flag}</span> {label} OnlyFans {cl.name}
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className={`fixed bottom-6 right-6 z-[9999] w-12 h-12 rounded-full bg-[#00AFF0] text-white shadow-xl shadow-[#00AFF0]/40 flex items-center justify-center hover:bg-[#009ADB] hover:scale-110 active:scale-95 transition-all duration-300 ${
          showBackToTop ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
        aria-label="Back to top"
      >
        <ChevronUp size={24} strokeWidth={2.5} />
      </button>
    </div>
  );
}
