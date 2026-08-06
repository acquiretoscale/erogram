'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { ofCreatorProfileUrl } from '@/lib/onlyfanssearch/creatorUrls';
import { motion } from 'framer-motion';
import { Heart, Trash2, Crown, User } from 'lucide-react';
import Navbar from '@/components/Navbar';
import ProfileOFPremiumSearch from '@/app/profile/ProfileOFPremiumSearch';
import { OfSearchResultsViewToggle } from '@/app/profile/ProfileGridDensityToggle';
import {
  loadOfSearchResultsView,
  type OfSearchResultsView,
} from '@/app/profile/profileGridDensity';
import { OF_SEARCH_TOKENS, ofSearchNavProps } from '@/app/onlyfanssearch/ofSearchTokens';
import { trackCreatorClick, trackTrendingClick } from '@/lib/actions/onlyfansTracking';
import { getTrendingCreators } from '@/lib/actions/publicData';
import { browseCreators, deleteCreatorBySlug } from '@/lib/actions/ofCreatorsBrowse';
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

function isCreatorLiveNow(start: number, end: number): boolean {
  if (start < 0 || end < 0) return false;
  const gmtHour = new Date().getUTCHours();
  if (start <= end) return gmtHour >= start && gmtHour < end;
  return gmtHour >= start || gmtHour < end;
}

const CREATOR_VIEW_PROFILE_BTN =
  'flex-1 flex items-center justify-center gap-2 py-2 sm:py-2.5 rounded-xl bg-[#0084BD] text-white text-[12px] sm:text-sm font-black text-center shadow-lg border border-[#0084BD] group-hover:bg-[#0070A3] transition-colors no-underline';

const CREATOR_PROFILE_ICON_BTN =
  'flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl bg-[#0084BD] text-white shadow-lg border border-[#0084BD] hover:bg-[#0070A3] transition-colors';

const FEATURED_CTA =
  'w-full py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-[#00AFF0] to-[#00D4FF] text-white text-[13px] sm:text-sm font-bold text-center shadow-sm group-hover:shadow-md group-hover:from-[#009ADB] group-hover:to-[#00BFE8] transition-all';

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


function CategoryCreatorCard({ creator, onTrack, onSave, onDelete, savedIds, isAdmin }: {
  creator: Creator;
  onTrack: (slug: string) => void;
  onSave: (id: string) => void;
  onDelete: (slug: string) => void;
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
    const path = ofCreatorProfileUrl(creator.username);
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
              creator.isFree ? 'bg-emerald-400 text-white' : 'bg-[#0084BD] text-white'
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
        <div className="absolute top-3 left-3 z-10">
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
  const [creators, setCreators] = useState(initialCreators);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [allTrending, setAllTrending] = useState<any[]>([]);
  // Which stable album image each featured card is showing → for split-test click attribution.
  const shownVariantRef = useRef<Record<string, number>>({});
  // Build the of-cat placement tag with the shown image's stable index.
  const ofCatPlacement = (idx: number) => (idx >= 0 ? `of-cat:v${idx}` : 'of-cat');
  const [isAdmin, setIsAdmin] = useState(false);
  const [resultsView, setResultsView] = useState<OfSearchResultsView>('grid');

  const [afterCategoryCreators, setAfterCategoryCreators] = useState<Creator[]>([]);
  const [afterCategoryLoading, setAfterCategoryLoading] = useState(false);
  const [afterCategoryHasMore, setAfterCategoryHasMore] = useState(true);

  useEffect(() => {
    setResultsView(loadOfSearchResultsView());
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

  const sorted = useMemo(() => {
    const list = [...creators];
    list.sort((a, b) => (b.clicks || 0) - (a.clicks || 0));
    return list;
  }, [creators]);

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
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-white/40 mb-4">
              <Link href={lp('/')} className="hover:text-[#00AFF0] transition-colors">
                {t('bestOnlyfans.breadcrumbHome')}
              </Link>
              <span aria-hidden="true">/</span>
              <Link href={lp('/onlyfanssearch')} className="hover:text-[#00AFF0] transition-colors">
                {t('bestOnlyfans.breadcrumbOfSearch')}
              </Link>
              <span aria-hidden="true">/</span>
              <span className="text-white/70">{label}</span>
            </nav>

            <div className="text-center">
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

            <ProfileOFPremiumSearch
              tokens={OF_SEARCH_TOKENS}
              isPremium={false}
              freeAccess
              hideHeading
              layout="hero"
              minimalFilters
              hideResults
              searchHubHref={lp('/onlyfanssearch')}
              loginRedirect={lp(`/onlyfanssearch/${category}`)}
              savedCreatorIds={savedIds}
              onToggleSave={handleToggleSave}
              {...ofSearchNavProps(lp)}
            />

            </div>
          </div>
        </section>

        {/* Results Grid */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {sorted.length > 0 && (
            <div className="flex justify-center mb-4">
              <OfSearchResultsViewToggle
                value={resultsView}
                onChange={setResultsView}
                tokens={{
                  pillBorder: 'rgba(255,255,255,0.12)',
                  pillBg: 'rgba(255,255,255,0.06)',
                  viewBtnBg: '#00AFF0',
                  viewBtnTxt: '#000000',
                  accentDim: 'rgba(255,255,255,0.45)',
                }}
              />
            </div>
          )}
          {sorted.length === 0 && allTrending.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-white/30 text-lg">{t('ofSearch.noCreatorsInCategory')}</p>
            </div>
          ) : (
            <div className={resultsView === 'feed' ? 'flex flex-col gap-4 sm:gap-5 max-w-lg mx-auto w-full' : 'grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5'}>
              {(() => {
                const isFeedView = resultsView === 'feed';
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
                        className="group w-full text-left rounded-2xl overflow-hidden bg-white ring-[2px] ring-[#00AFF0]/30 hover:ring-[#00AFF0] shadow-[0_8px_28px_-8px_rgba(0,175,240,0.25)] hover:shadow-[0_12px_36px_-6px_rgba(0,175,240,0.35)] hover:-translate-y-1 transition-all duration-300 cursor-pointer focus:outline-none"
                      >
                        <div className="relative aspect-[3/4] bg-[#f0f8ff]">
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
                            <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-[#00AFF0] bg-[#f0f8ff]">
                              {tc.name.charAt(0)}
                            </div>
                          )}
                          <FeaturedLiveBadge liveHourStart={tc.liveHourStart} liveHourEnd={tc.liveHourEnd} />
                        </div>
                        <div className="px-3 pt-2.5 sm:px-4 sm:pt-3">
                          <h3 className="font-bold text-[13px] sm:text-[15px] text-gray-900 truncate leading-tight">{tc.name}</h3>
                          <p className="text-[11px] sm:text-[13px] text-[#00AFF0] font-semibold mt-0.5">@{tc.username}</p>
                          {(tc.likesCount > 0) && (
                            <p className="text-[10px] sm:text-[11px] text-gray-500 mt-0.5">{formatCount(tc.likesCount)} {t('ofSearch.likes')}</p>
                          )}
                        </div>
                        <div className="px-3 pb-3 pt-2 sm:px-4 sm:pb-4 sm:pt-3">
                          <div className={FEATURED_CTA}>
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
                    <div key={`adblock-${blockNum}`} className={isFeedView ? 'w-full' : 'col-span-2 lg:col-span-4'}>
                      <div className="rounded-2xl border border-[#00AFF0]/20 bg-white p-4 sm:p-6 shadow-[0_24px_60px_-18px_rgba(0,175,240,0.15)]">
                        <div className="flex items-center gap-2 mb-4">
                          <Crown size={14} className="text-[#00AFF0]" fill="currentColor" />
                          <h2 className="text-sm sm:text-base font-black text-gray-900">Featured <span className="text-[#00AFF0]">OnlyFans Creators</span></h2>
                        </div>
                        <div className={isFeedView ? 'flex flex-col gap-3' : 'grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-5'}>
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
                                <FeaturedLiveBadge liveHourStart={tc.liveHourStart} liveHourEnd={tc.liveHourEnd} />
                              </div>
                              <div className="px-3 pt-2.5 sm:px-4 sm:pt-3">
                                <h3 className="font-bold text-[13px] sm:text-[15px] text-gray-900 truncate leading-tight">{tc.name}</h3>
                                <p className="text-[11px] sm:text-[13px] text-[#00AFF0] font-semibold mt-0.5">@{tc.username}</p>
                                {(tc.likesCount > 0) && (
                                  <p className="text-[10px] sm:text-[11px] text-gray-500 mt-0.5">{formatCount(tc.likesCount)} {t('ofSearch.likes')}</p>
                                )}
                              </div>
                              <div className="px-3 pb-3 pt-2 sm:px-4 sm:pb-4 sm:pt-3"><div className={FEATURED_CTA}>{t('ofSearch.viewProfile')}</div></div>
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
                  if (cellCount >= threshold && (isFeedView || cellCount % 4 === 0)) {
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
                      <CategoryCreatorCard creator={creator} onTrack={trackClick} onSave={handleToggleSave} onDelete={handleDelete} savedIds={savedIds} isAdmin={isAdmin} />
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
                  <CategoryCreatorCard creator={creator} onTrack={trackClick} onSave={handleToggleSave} onDelete={handleDelete} savedIds={savedIds} isAdmin={isAdmin} />
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
    </div>
  );
}
