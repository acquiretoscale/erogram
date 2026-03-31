'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Search, ArrowLeft, Heart, Crown, X, TrendingUp } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { OF_CATEGORIES, ofCategoryUrl } from '../constants';
import { trackCreatorClick } from '@/lib/actions/onlyfansTracking';
import { useTranslation, useLocalePath } from '@/lib/i18n/client';

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
  mediaCount: number;
  price: number;
  isFree: boolean;
  url: string;
}

function TopCreatorCard({ creator, index, savedIds, onToggleSave, onTrack }: {
  creator: Creator; index: number; savedIds: Set<string>; onToggleSave: (id: string) => void; onTrack: (slug: string) => void;
}) {
  const { t } = useTranslation();
  const [redirecting, setRedirecting] = useState(false);
  const [countdown, setCountdown] = useState(0);

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

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (redirecting) return;
    onTrack(creator.slug);
    setRedirecting(true);
    setCountdown(2);
  };

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        className="group block w-full text-left rounded-2xl bg-white overflow-hidden shadow-md hover:shadow-xl transition-shadow"
      >
        <div className="relative aspect-[3/4] bg-gray-100">
          {creator.avatar ? (
            <img src={creator.avatar} alt={`${creator.name} OnlyFans`} className="absolute inset-0 w-full h-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-gray-300 bg-gradient-to-br from-gray-100 to-gray-200">{creator.name.charAt(0)}</div>
          )}
          {index < 10 && (
            <div className="absolute top-2 left-2 sm:top-3 sm:left-3">
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-md sm:rounded-lg bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center text-[10px] sm:text-[11px] font-black text-white shadow-sm">{index + 1}</div>
            </div>
          )}
        </div>
        <div className="px-2.5 pt-2 pb-2.5 sm:px-4 sm:pt-3 sm:pb-4">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <h3 className="font-bold text-[13px] sm:text-[15px] text-gray-900 truncate leading-tight">{creator.name}</h3>
            <span className={`flex-shrink-0 px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wide ${creator.isFree ? 'bg-emerald-400 text-white' : 'bg-[#00AFF0] text-white'}`}>
              {creator.isFree ? t('ofSearch.free') : `$${creator.price.toFixed(0)}`}
            </span>
          </div>
          <p className="text-[11px] sm:text-[13px] text-[#00AFF0] mt-0.5">@{creator.username}</p>
          {creator.bio && <p className="mt-1.5 sm:mt-2 text-[11px] sm:text-[12px] text-gray-500 line-clamp-2 leading-relaxed">{creator.bio}</p>}
          <div className="flex items-center justify-center gap-2 w-full mt-2 sm:mt-3 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-[#00AFF0] to-[#00D4FF] text-white text-[13px] sm:text-sm font-bold text-center shadow-sm group-hover:shadow-md group-hover:from-[#009ADB] group-hover:to-[#00BFE8] transition-all">
            {redirecting ? (
              <>
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin shrink-0" />
                {t('ofSearch.redirectingIn').replace('{n}', String(countdown))}
              </>
            ) : t('ofSearch.viewProfile')}
          </div>
        </div>
      </button>
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleSave(creator._id); }}
        className="absolute top-2 right-2 sm:top-3 sm:right-3 z-10 w-10 h-10 sm:w-9 sm:h-9 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center transition-all hover:scale-110"
        title={savedIds.has(creator._id) ? t('ofSearch.removeSaved') : t('ofSearch.saveCreator')}
      >
        <Heart size={18} className={savedIds.has(creator._id) ? 'text-rose-500' : 'text-white/80'} fill={savedIds.has(creator._id) ? 'currentColor' : 'none'} />
      </button>
    </div>
  );
}

interface Props {
  creators: Creator[];
}

export default function TopCreatorsClient({ creators }: Props) {
  const { t } = useTranslation();
  const lp = useLocalePath();
  const router = useRouter();
  const [navQuery, setNavQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'free' | 'paid' | 'price-low' | 'price-high'>('all');
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [searchFocused, setSearchFocused] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  const TRENDING_SEARCHES = [
    'milf', 'asian', 'teen', 'blonde', 'latina',
    'redhead', 'big boobs', 'petite', 'big ass', 'amateur',
  ];

  useEffect(() => {
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
    const handleClickOutside = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleSave = useCallback(async (creatorId: string) => {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = `/login?redirect=${encodeURIComponent('/onlyfanssearch/top-creators-2026')}`;
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

  const sorted = useMemo(() => {
    let list = [...creators];
    if (filter === 'free') list = list.filter((c) => c.isFree);
    else if (filter === 'paid') list = list.filter((c) => !c.isFree);

    if (filter === 'price-low') list.sort((a, b) => a.price - b.price);
    else if (filter === 'price-high') list.sort((a, b) => b.price - a.price);
    else list.sort((a, b) => b.likesCount - a.likesCount);

    return list;
  }, [creators, filter]);

  const trackClick = (slug: string) => {
    trackCreatorClick(slug);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (navQuery.trim()) {
      router.push(`${lp('/onlyfanssearch')}?q=${encodeURIComponent(navQuery.trim())}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#111111] text-[#f5f5f5]">
      <Navbar variant="onlyfans" />

      <main className="pt-20">
        <section className="bg-gradient-to-b from-[#00AFF0]/10 via-[#00AFF0]/[0.04] to-[#111111] pt-6 pb-4 sm:pt-8 sm:pb-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <Link
              href={lp('/onlyfanssearch')}
              className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-[#00AFF0] transition-colors mb-3"
            >
              <ArrowLeft size={14} />
              {t('ofSearch.onlyfansSearch')}
            </Link>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="text-2xl sm:text-3xl lg:text-4xl font-black leading-tight tracking-tight"
            >
              {t('ofSearch.topOnlyfansCreators')}{' '}
              <span className="text-[#00AFF0]">{t('ofSearch.topCreatorsYear')}</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.05 }}
              className="mt-2 text-sm sm:text-base text-white/50 max-w-lg mx-auto"
            >
              {creators.length > 0
                ? t('ofSearch.topCreatorsDesc').replace('{count}', String(creators.length))
                : t('ofSearch.noTopCreators')}
            </motion.p>

            {/* Search bar — navigates to /onlyfanssearch */}
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
                  placeholder={t('ofSearch.searchPlaceholderCategory')}
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
                            router.push(`${lp('/onlyfanssearch')}?q=${encodeURIComponent(term)}`);
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
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex flex-wrap gap-2 mb-6">
            {([
              { key: 'all' as const, label: t('ofSearch.all') },
              { key: 'free' as const, label: t('ofSearch.free') },
              { key: 'paid' as const, label: t('ofSearch.paid') },
            ]).map(({ key, label }) => (
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
              {filter === 'price-high' ? t('ofSearch.highestFirst') : t('ofSearch.lowestFirst')}
            </button>
          </div>

          {sorted.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-white/30 text-lg">{t('ofSearch.noTopCreators')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
              {sorted.map((creator, i) => (
                <motion.div
                  key={creator._id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: Math.min(i * 0.008, 0.3) }}
                >
                  <TopCreatorCard
                    creator={creator}
                    index={i}
                    savedIds={savedIds}
                    onToggleSave={handleToggleSave}
                    onTrack={trackClick}
                  />
                </motion.div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
