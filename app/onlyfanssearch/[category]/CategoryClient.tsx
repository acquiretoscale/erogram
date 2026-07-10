'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Search, Heart, Trash2, Crown, X, TrendingUp, ChevronUp, Star, Shuffle, ArrowLeft, User } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { trackCreatorClick, trackTrendingClick } from '@/lib/actions/onlyfansTracking';
import { getTrendingCreators } from '@/lib/actions/publicData';
import { browseCreators, deleteCreatorBySlug } from '@/lib/actions/ofCreatorsBrowse';
import { getOFMTrending, createOFMTrendingSlot } from '@/lib/actions/ofm';
import { useTranslation, useLocalePath } from '@/lib/i18n/client';
import type { FeedCampaign } from '@/app/groups/types';
import { trackClick as trackCampaignClick } from '@/lib/actions/campaigns';

/** Featured-creator image that rotates the split-test album client-side (per view, ISR-safe). */
function RotatingImg({ album, albumIdx, fallback, alt, className, onPick }: { album?: string[]; albumIdx?: number[]; fallback: string; alt: string; className: string; onPick?: (stableIdx: number) => void }) {
  const pool = (album && album.length > 0) ? album : (fallback ? [fallback] : []);
  const [idx, setIdx] = useState(0);
  const [err, setErr] = useState(false);
  useEffect(() => {
    const p = pool.length > 1 ? Math.floor(Math.random() * pool.length) : 0;
    setIdx(p);
    // Report the STABLE album index of the shown image so the click can attribute it (split test).
    if (onPick) onPick(albumIdx?.[p] ?? p);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const src = pool[idx] || fallback;
  if (!src || err) return null;
  return <img src={src} alt={alt} className={className} loading="lazy" referrerPolicy="no-referrer" onError={() => setErr(true)} />;
}

function formatCount(n: number) {
  if (!n) return '';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return `${n}K`;
}

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
  categories?: string[];
}


function CategoryCreatorCard({ creator, onTrack, onSave, onDelete, onSendToTrending, onSendToFeatured, savedIds, isAdmin }: {
  creator: Creator;
  onTrack: (slug: string) => void;
  onSave: (id: string) => void;
  onDelete: (slug: string) => void;
  onSendToTrending?: (creator: Creator) => void;
  onSendToFeatured?: (creator: Creator) => void;
  savedIds: Set<string>;
  isAdmin: boolean;
}) {
  const { t } = useTranslation();
  const [showHeader, setShowHeader] = useState(false);
  const hasHeader = !!creator.header;
  const currentImg = showHeader && hasHeader ? creator.header : creator.avatar;
  const isSaved = savedIds.has(creator._id);

  const handleViewProfileClick = () => {
    onTrack(creator.slug);
  };

  const handleErogramProfile = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const path = `/${creator.username}-onlyfans`;
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      window.open(`/join-erogram?redirect=${encodeURIComponent(path)}`, '_blank', 'noopener,noreferrer');
      return;
    }
    window.open(path, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="relative">
      <div className="group rounded-2xl bg-white overflow-hidden shadow-md hover:shadow-xl transition-shadow">
        <div className="relative aspect-[3/4] bg-gray-100">
          {currentImg ? (
            <img
              src={currentImg}
              alt={`${creator.name} OnlyFans`}
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
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
        </div>
        <div className="px-2.5 pt-2 sm:px-4 sm:pt-3">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <h3 className="font-bold text-[13px] sm:text-[15px] text-gray-900 truncate leading-tight">
              {creator.name}
            </h3>
            <span className={`flex-shrink-0 px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wide ${
              creator.isFree ? 'bg-emerald-400 text-white' : 'bg-[#00AFF0] text-white'
            }`}>
              {creator.isFree ? t('ofSearch.free') : `$${creator.price.toFixed(0)}`}
            </span>
          </div>
          <p className="text-[11px] sm:text-[13px] text-[#00AFF0] mt-0.5">@{creator.username}</p>
          {(creator.likesCount > 0 || creator.subscriberCount > 0) && (
            <div className="flex items-center gap-1.5 mt-0.5 text-[10px] sm:text-[11px] text-gray-400">
              {creator.subscriberCount > 0 && <span>{formatCount(creator.subscriberCount)} {t('ofSearch.subscribers')}</span>}
              {creator.likesCount > 0 && <span>{creator.subscriberCount > 0 ? '· ' : ''}{formatCount(creator.likesCount)} {t('ofSearch.likes')}</span>}
            </div>
          )}
        </div>
        <div className="px-2.5 pb-2.5 pt-2 sm:px-4 sm:pb-4 sm:pt-3">
          <div className="flex gap-1.5 sm:gap-2">
            <a
              href={`/go/${creator.username}`}
              target="_blank"
              rel="noopener"
              onClick={handleViewProfileClick}
              className="flex-1 flex items-center justify-center gap-2 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-[#00AFF0] to-[#00D4FF] text-white text-[13px] sm:text-sm font-bold text-center shadow-sm group-hover:shadow-md group-hover:from-[#009ADB] group-hover:to-[#00BFE8] transition-all no-underline"
            >
              {t('ofSearch.viewProfile')}
            </a>
            <button
              onClick={handleErogramProfile}
              className="flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl bg-gradient-to-r from-[#00AFF0] to-[#00D4FF] text-white shadow-sm group-hover:shadow-md group-hover:from-[#009ADB] group-hover:to-[#00BFE8] transition-all"
              title="View on Erogram"
            >
              <User size={16} />
            </button>
          </div>
        </div>
      </div>
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSave(creator._id); }}
        className={`absolute top-2 right-2 sm:top-3 sm:right-3 z-10 w-10 h-10 sm:w-9 sm:h-9 rounded-full backdrop-blur-sm flex items-center justify-center transition-all hover:scale-110 ${
          isSaved ? 'bg-rose-500/80' : 'bg-black/20'
        }`}
        title={isSaved ? t('ofSearch.removeSaved') : t('ofSearch.saveCreator')}
      >
        <Heart size={18} className={isSaved ? 'text-white' : 'text-white/80'} fill={isSaved ? 'currentColor' : 'none'} />
      </button>
      {isAdmin && (
        <div className="absolute top-3 left-3 z-10 flex gap-1.5">
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSendToFeatured?.(creator); }}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-[#FF6A00]/80 hover:bg-[#FF6A00] text-white backdrop-blur-sm transition-all"
            title="Add as Featured (paid client)"
          >
            <Crown size={13} fill="currentColor" />
          </button>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSendToTrending?.(creator); }}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-amber-500/80 hover:bg-amber-500 text-white backdrop-blur-sm transition-all"
            title="Add as Trending (free pick)"
          >
            <Star size={13} fill="currentColor" />
          </button>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (confirm(`Delete ${creator.name}?`)) onDelete(creator.slug); }}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-red-500/80 hover:bg-red-500 text-white backdrop-blur-sm transition-all"
            title="Delete profile"
          >
            <Trash2 size={13} />
          </button>
        </div>
      )}
    </div>
  );
}

interface Props {
  creators: Creator[];
  category: string;
  label: string;
  canonicalUrl?: string;
  paidFeatured?: any[];
  agnosticAds?: FeedCampaign[];
}

export default function CategoryClient({ creators: initialCreators, category, label, paidFeatured = [] }: Props) {
  const { t } = useTranslation();
  const lp = useLocalePath();
  const router = useRouter();
  const [creators, setCreators] = useState(initialCreators);
  const [navQuery, setNavQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'free' | 'paid' | 'price-low' | 'price-high' | 'most-liked' | 'least-liked' | 'shuffle'>('all');
  const [shuffleKey, setShuffleKey] = useState(0);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [allTrending, setAllTrending] = useState<any[]>([]);
  // Which stable album image each featured card is showing → for split-test click attribution.
  const shownVariantRef = useRef<Record<string, number>>({});
  // Build the of-cat placement tag with the shown image's stable index.
  const ofCatPlacement = (idx: number) => (idx >= 0 ? `of-cat:v${idx}` : 'of-cat');
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

    // Category-targeted rail: niche creators for this page. Paid of-cat creators (server)
    // are prepended so they always lead the featured slots.
    getTrendingCreators(category)
      .then(data => {
        const rail = Array.isArray(data) ? data : [];
        // De-dupe paid creators out of the rail by username, paid wins the lead.
        const paidNames = new Set((paidFeatured || []).map((p) => (p.username || '').toLowerCase()));
        const railClean = rail.filter((r: any) => !paidNames.has((r.username || '').toLowerCase()));
        setAllTrending([...(paidFeatured || []), ...railClean]);
      })
      .catch(() => { if ((paidFeatured || []).length) setAllTrending([...paidFeatured]); });
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
    trackCreatorClick(slug);
  };

  const handleDelete = async (slug: string) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      await deleteCreatorBySlug(token, slug);
      setCreators((prev) => prev.filter((c) => c.slug !== slug));
      setAfterCategoryCreators((prev) => prev.filter((c) => c.slug !== slug));
    } catch (e: any) {
      alert(`Delete failed: ${e.message}`);
    }
  };

  const [trendingToast, setTrendingToast] = useState('');

  const handleSendToTrending = async (creator: Creator) => {
    const token = localStorage.getItem('token');
    if (!token) { setTrendingToast('Login required'); setTimeout(() => setTrendingToast(''), 3000); return; }
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
        isStarPick: true,
      });
      setTrendingToast(`✓ ${creator.name} added to Trending`);
      setTimeout(() => setTrendingToast(''), 3000);
    } catch (e: any) {
      setTrendingToast(`Failed: ${e.message || 'Unknown error'}`);
      setTimeout(() => setTrendingToast(''), 3000);
    }
  };

  const handleSendToFeatured = async (creator: Creator) => {
    const token = localStorage.getItem('token');
    if (!token) { setTrendingToast('Login required'); setTimeout(() => setTrendingToast(''), 3000); return; }
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
        isStarPick: false,
      });
      setTrendingToast(`👑 ${creator.name} added as Featured`);
      setTimeout(() => setTrendingToast(''), 3000);
    } catch (e: any) {
      setTrendingToast(`Failed: ${e.message || 'Unknown error'}`);
      setTimeout(() => setTrendingToast(''), 3000);
    }
  };

  const sorted = useMemo(() => {
    let list = [...creators];
    if (filter === 'free') list = list.filter((c) => c.isFree);
    else if (filter === 'paid') list = list.filter((c) => !c.isFree);

    if (filter === 'shuffle') {
      for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [list[i], list[j]] = [list[j], list[i]];
      }
    } else if (filter === 'price-low') list.sort((a, b) => a.price - b.price);
    else if (filter === 'price-high') list.sort((a, b) => b.price - a.price);
    else if (filter === 'most-liked') list.sort((a, b) => b.likesCount - a.likesCount);
    else if (filter === 'least-liked') list.sort((a, b) => a.likesCount - b.likesCount);
    else list.sort((a, b) => (b.clicks || 0) - (a.clicks || 0));

    return list;
  }, [creators, filter, shuffleKey]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (navQuery.trim()) {
      router.push(`${lp('/onlyfanssearch')}?q=${encodeURIComponent(navQuery.trim())}`);
    }
  };

  const loadMoreAfterCategory = useCallback(async () => {
    if (afterCategoryLoading || !afterCategoryHasMore) return;
    setAfterCategoryLoading(true);

    try {
      const categoryIds = creators.map((c) => c._id);
      const afterIds = afterCategoryCreators.map((c) => c._id);
      const exclude = [...categoryIds, ...afterIds];
      const data = await browseCreators(exclude, 20);
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
        <section className="bg-gradient-to-b from-[#00AFF0]/10 via-[#00AFF0]/[0.04] to-[#111111] pt-6 pb-4 sm:pt-8 sm:pb-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="text-2xl sm:text-3xl lg:text-4xl font-black leading-tight tracking-tight"
            >
              {t('ofSearch.bestLabel').replace('{label}', label)}{' '}
              <span className="text-[#00AFF0]">OnlyFans</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.05 }}
              className="mt-2 text-sm sm:text-base text-white/50 max-w-lg mx-auto"
            >
              {creators.length > 0
                ? t('ofSearch.browseVerified').replace(/\{label\}/g, label.toLowerCase())
                : t('ofSearch.noCreatorsLabel').replace('{label}', label.toLowerCase())}
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

          </div>
        </section>

        {/* Results Grid */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Back button */}
          <div className="flex justify-center mb-3">
            <Link
              href={lp('/onlyfanssearch')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white/50 hover:text-white/80 hover:bg-white/[0.08] text-xs font-medium transition-all"
            >
              <ArrowLeft size={13} />
              {t('ofSearch.ofSearchMain')}
            </Link>
          </div>

          {/* Filter bar */}
          <div className="flex justify-center mb-4 sm:mb-6 -mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto scrollbar-hide">
            <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.08] flex-shrink-0">
              {([
                { key: 'all', label: t('ofSearch.all') },
                { key: 'free', label: t('ofSearch.free') },
                { key: 'paid', label: t('ofSearch.paid') },
              ] as const).map(({ key, label: filterLabel }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`px-3 py-2 sm:py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                    filter === key
                      ? 'bg-[#00AFF0]/20 text-[#00AFF0]'
                      : 'text-white/40 hover:text-white/70'
                  }`}
                >
                  {filterLabel}
                </button>
              ))}
              <button
                onClick={() => setFilter(filter === 'most-liked' ? 'least-liked' : 'most-liked')}
                className={`px-3 py-2 sm:py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  filter === 'most-liked' || filter === 'least-liked'
                    ? 'bg-[#00AFF0]/20 text-[#00AFF0]'
                    : 'text-white/40 hover:text-white/70'
                }`}
              >
                {filter === 'least-liked' ? t('ofSearch.leastLikes') : t('ofSearch.mostLikes')}
              </button>
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
              <button
                onClick={() => { setFilter('shuffle'); setShuffleKey((k) => k + 1); }}
                className={`inline-flex items-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  filter === 'shuffle'
                    ? 'bg-[#00AFF0]/20 text-[#00AFF0]'
                    : 'text-white/40 hover:text-white/70'
                }`}
                title="Shuffle order"
              >
                <Shuffle size={12} />
                {t('ofSearch.shuffle')}
              </button>
            </div>
          </div>

          {sorted.length === 0 && allTrending.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-white/30 text-lg">{t('ofSearch.noCreatorsInCategory')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
              {(() => {
                // Real-estate rules (owner spec):
                //  • FIRST slot is ALWAYS a featured OF creator (paid of-cat campaign first, then niche rail).
                //  • A featured OF creator every 8 results, so featured stay visible while scrolling.
                //  • A "FEATURED ONLYFANS CREATORS" block of 4 (OF creators ONLY — never agnostic),
                //    first early (after ~16) then every 80 results.
                const FEATURED_EVERY = 8;
                const BLOCK_FIRST_AT = 18;
                const AD_BLOCK_EVERY = 83;
                const items: React.ReactNode[] = [];
                let featIdx = 0;

                // One featured OF creator card. Paid campaigns track via of-cat; rail via trending.
                // Routing: paid/featured ALWAYS go straight to OnlyFans (advertisers want the traffic).
                const renderFeatured = (slotKey: string) => {
                  if (allTrending.length === 0) return null;
                  const tc = allTrending[featIdx % allTrending.length];
                  featIdx++;
                  return (
                    <motion.div
                      key={slotKey}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className="relative"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          const vIdx = shownVariantRef.current[tc._id] ?? -1;
                          if (tc.isPaidCampaign && tc.campaignId) trackCampaignClick(tc.campaignId, ofCatPlacement(vIdx));
                          else if (tc._id) trackTrendingClick(tc._id, vIdx);
                          window.open(`/go/${tc.username}`, '_blank', 'noopener');
                        }}
                        className="group w-full text-left rounded-2xl overflow-hidden bg-gradient-to-br from-[#0B1D3A] via-[#122B53] to-[#1A3F73] shadow-[0_14px_36px_-12px_rgba(6,16,36,0.9)] hover:shadow-[0_18px_44px_-10px_rgba(10,27,58,0.95)] ring-[3px] ring-[#FF6A00] hover:ring-[#FF8C3A] transition-all duration-300 cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-[#C7DAFF]/50"
                      >
                        <div className="relative aspect-[3/4] bg-[#0F274C] ring-1 ring-inset ring-[#9FC3FF]/30">
                          {tc.avatar ? (
                            <RotatingImg
                              album={tc.album}
                              albumIdx={tc.albumIdx}
                              onPick={(v) => { shownVariantRef.current[tc._id] = v; }}
                              fallback={tc.avatar}
                              alt={`${tc.name} OnlyFans`}
                              className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500 ease-out"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-[#C7DAFF] bg-[#0F274C]">
                              {tc.name.charAt(0)}
                            </div>
                          )}
                          <div className="absolute top-2 left-2 z-10">
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#EAF1FF] text-[#1F4076] text-[9px] font-black uppercase tracking-widest shadow-md ring-1 ring-white/70">
                              <Crown size={8} fill="currentColor" className="text-[#1F4076]" />
                              {t('ofSearch.featured')}
                            </span>
                          </div>
                        </div>
                        <div className="px-2.5 pt-2 sm:px-4 sm:pt-3">
                          <h3 className="font-bold text-[13px] sm:text-[15px] text-white truncate leading-tight drop-shadow-sm">
                            {tc.name}
                          </h3>
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
                };

                // "FEATURED ONLYFANS CREATORS" block (full grid width) — OF creators ONLY, never agnostic.
                // Same white/ONLYFANS-blue design as the top browse block (no "Submit Your Creator").
                // Shows only the distinct creators available (never repeats one X4): up to 4 unique, no padding.
                const renderAdBlock = (blockNum: number) => {
                  if (allTrending.length === 0) return null;
                  const take = Math.min(4, allTrending.length);
                  const four = Array.from({ length: take }, (_, k) => allTrending[(featIdx + k) % allTrending.length]);
                  featIdx += take;
                  return (
                    <div key={`adblock-${blockNum}`} className="col-span-2 lg:col-span-4">
                      <div className="rounded-2xl border border-[#00AFF0]/20 bg-white p-4 sm:p-6 shadow-[0_24px_60px_-18px_rgba(0,175,240,0.15)]">
                        <div className="flex items-center gap-2 mb-4">
                          <Crown size={14} className="text-[#00AFF0]" fill="currentColor" />
                          <h2 className="text-sm sm:text-base font-black text-gray-900">Featured <span className="text-[#00AFF0]">OnlyFans Creators</span></h2>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-5">
                          {four.map((tc, k) => (
                            <button
                              key={`ofcat-${blockNum}-${tc._id || tc.username}-${k}`}
                              type="button"
                              onClick={() => {
                                const vIdx = shownVariantRef.current[tc._id] ?? -1;
                                if (tc.isPaidCampaign && tc.campaignId) trackCampaignClick(tc.campaignId, ofCatPlacement(vIdx));
                                else if (tc._id) trackTrendingClick(tc._id, vIdx);
                                window.open(`/go/${tc.username}`, '_blank', 'noopener');
                              }}
                              className="group w-full text-left rounded-2xl overflow-hidden bg-white ring-[2px] ring-[#00AFF0]/30 hover:ring-[#00AFF0] shadow-[0_8px_28px_-8px_rgba(0,175,240,0.25)] hover:shadow-[0_12px_36px_-6px_rgba(0,175,240,0.35)] hover:-translate-y-1 transition-all duration-300 cursor-pointer focus:outline-none"
                            >
                              <div className="relative aspect-[3/4] bg-[#f0f8ff]">
                                {tc.avatar ? (
                                  <RotatingImg album={tc.album} albumIdx={tc.albumIdx} onPick={(v) => { shownVariantRef.current[tc._id] = v; }} fallback={tc.avatar} alt={`${tc.name} OnlyFans`} className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500 ease-out" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-[#00AFF0] bg-[#f0f8ff]">{tc.name.charAt(0)}</div>
                                )}
                              </div>
                              <div className="px-3 pt-2.5 sm:px-4 sm:pt-3">
                                <h3 className="font-bold text-[13px] sm:text-[15px] text-gray-900 truncate leading-tight">{tc.name}</h3>
                                <p className="text-[11px] sm:text-[13px] text-[#00AFF0] font-semibold mt-0.5">@{tc.username}</p>
                                {(tc.likesCount > 0) && (
                                  <p className="text-[10px] sm:text-[11px] text-gray-500 mt-0.5">{formatCount(tc.likesCount)} {t('ofSearch.likes')}</p>
                                )}
                              </div>
                              <div className="px-3 pb-3 pt-2 sm:px-4 sm:pb-4 sm:pt-3"><div className="w-full py-2 sm:py-2.5 rounded-xl bg-[#00AFF0] text-white text-[12px] sm:text-sm font-black text-center shadow-lg border border-[#00AFF0] group-hover:bg-[#009AD6] transition-colors">{t('ofSearch.viewProfile')}</div></div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                };

                // Grid is 2-col (mobile) / 4-col (desktop). The full-width block (col-span-4) must ONLY
                // be inserted on a 4-cell row boundary, or it leaves empty cells (the "black gap").
                // So we track single-cell items emitted and gate the block on cellCount % 4 === 0.
                // FEATURED_EVERY / BLOCK targets are approximate — alignment wins over exact spacing.
                let cellCount = 0;
                let blocksShown = 0;
                const pushCell = (node: React.ReactNode) => { items.push(node); cellCount++; };

                // FIRST slot — always a featured OF creator.
                const first = renderFeatured('featured-first');
                if (first) pushCell(first);

                sorted.forEach((creator, i) => {
                  // Single featured creator every ~8 (1 cell).
                  if (i > 0 && i % FEATURED_EVERY === 0) {
                    const feat = renderFeatured(`featured-${Math.floor(i / FEATURED_EVERY)}`);
                    if (feat) pushCell(feat);
                  }

                  // Full-width block: once we've passed the threshold AND we're on a clean 4-cell row.
                  const threshold = BLOCK_FIRST_AT + blocksShown * AD_BLOCK_EVERY;
                  if (cellCount >= threshold && cellCount % 4 === 0) {
                    const block = renderAdBlock(blocksShown);
                    if (block) { items.push(block); blocksShown++; }
                  }

                  pushCell(
                    <motion.div
                      key={creator._id}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: Math.min(i * 0.012, 0.25) }}
                    >
                      <CategoryCreatorCard creator={creator} onTrack={trackClick} onSave={handleToggleSave} onDelete={handleDelete} onSendToTrending={handleSendToTrending} onSendToFeatured={handleSendToFeatured} savedIds={savedIds} isAdmin={isAdmin} />
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
                  <CategoryCreatorCard creator={creator} onTrack={trackClick} onSave={handleToggleSave} onDelete={handleDelete} onSendToTrending={handleSendToTrending} onSendToFeatured={handleSendToFeatured} savedIds={savedIds} isAdmin={isAdmin} />
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

      {trendingToast && (
        <div className="fixed bottom-6 left-6 z-50 px-5 py-3 bg-[#1a2a30] border border-[#00AFF0]/30 text-[#00AFF0] text-sm font-semibold rounded-xl shadow-xl animate-in fade-in slide-in-from-bottom-3">
          {trendingToast}
        </div>
      )}
    </div>
  );
}
