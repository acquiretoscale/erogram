'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Link from 'next/link';
import axios from 'axios';
import Navbar from '@/components/Navbar';
import HeaderBanner from '@/components/HeaderBanner';
import BotCardSkeleton from './BotCardSkeleton';
import AdvertCard from '../groups/AdvertCard';
import type { FeedCampaign } from '../groups/types';
import { PLACEHOLDER_IMAGE_URL } from '@/lib/placeholder';
import { useTranslation, useLocalePath } from '@/lib/i18n';
import { voteOnBot, unvoteOnBot, getAllBotStats } from '@/lib/actions/botVotes';
import type { BotStatsData } from '@/lib/actions/botVotes';
// Removed react-window import as virtualization is no longer used




import { categories } from './constants';

// Bot and Advert interfaces

interface Bot {
  _id: string;
  name: string;
  slug: string;
  category: string;
  country: string;
  description: string;
  image: string;
  telegramLink?: string;
  isAdvertisement?: boolean;
  advertisementUrl?: string;
  pinned?: boolean;
  topBot?: boolean;
  showVerified?: boolean;
  clickCount?: number;
  memberCount?: number;
  createdBy?: {
    username?: string;
    showNicknameUnderGroups?: boolean;
  } | null;
}

interface Advert {
  _id: string;
  name: string;
  slug: string;
  category: string;
  country: string;
  url: string;
  description: string;
  image: string;
  status: string;
  pinned?: boolean;
  clickCount: number;
}

interface BotsClientProps {
  initialBots: Bot[];
  initialAdverts: Advert[];
  feedCampaigns?: FeedCampaign[];
  initialIsMobile: boolean;
  initialIsTelegram: boolean;
  initialCountry?: string;
  topBannerCampaigns?: Array<{ _id: string; creative: string; destinationUrl: string }>;
  allBotStats?: Record<string, BotStatsData>;
  trendingErogramCampaigns?: FeedCampaign[];
  paginationCurrentPage?: number;
  paginationTotalPages?: number;
  botsPageSize?: number;
}

function botsPageHref(page: number): string {
  return page <= 1 ? '/bots' : `/bots/page/${page}`;
}

export default function BotsClient({ initialBots, initialAdverts, feedCampaigns = [], initialIsMobile, initialIsTelegram, initialCountry, topBannerCampaigns = [], allBotStats, trendingErogramCampaigns = [], paginationCurrentPage = 1, paginationTotalPages = 1, botsPageSize = 16 }: BotsClientProps) {
  const [username, setUsername] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedSubcategory, setSelectedSubcategory] = useState('All');
  const [selectedSort, setSelectedSort] = useState('upvotes');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddBotModal, setShowAddBotModal] = useState(false);
  const [bots, setBots] = useState(initialBots);
  const [pinnedBots, setPinnedBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(false);
  const isFirstLoad = useRef(true);
  const { t } = useTranslation();
  const lp = useLocalePath();

  const [botScores, setBotScores] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    if (allBotStats) {
      for (const [slug, s] of Object.entries(allBotStats)) {
        map[slug] = (s.upvotes ?? 0) - (s.downvotes ?? 0);
      }
    }
    return map;
  });

  const handleBotVoteChange = useCallback((slug: string, score: number) => {
    setBotScores(prev => ({ ...prev, [slug]: score }));
  }, []);

  useEffect(() => {
    // Get username from localStorage on mount
    if (typeof window !== 'undefined') {
      const storedUsername = localStorage.getItem('username');
      if (storedUsername) {
        setUsername(storedUsername);
      }
    }
  }, []);


  // Fetch all pinned bots
  useEffect(() => {
    fetch('/api/bots?limit=1000')
      .then(res => res.json())
      .then(data => {
        if (data.bots) {
          const pinned = data.bots.filter((b: Bot) => b.pinned);
          setPinnedBots(pinned);
        }
      })
      .catch(err => console.error('Failed to fetch pinned bots:', err));
  }, []);

  // Separate pinned and regular bots/adverts
  const regularBots = bots;
  const pinnedAdverts = initialAdverts.filter(a => a.pinned);
  const regularAdverts = initialAdverts.filter(a => !a.pinned);

  // Use server-provided device detection to avoid client-only layout changes (CLS).
  const isMobile = initialIsMobile;
  const isTelegram = initialIsTelegram;

  console.log('BotsClient render - pinned bots:', pinnedBots.length, 'regular bots:', regularBots.length);
  console.log('Pinned bot IDs:', pinnedBots.map(b => ({ id: b._id, name: b.name, pinned: b.pinned })));

  const [topBots, setTopBots] = useState<Bot[]>([]);
  const [topBotsLoading, setTopBotsLoading] = useState(true);

  useEffect(() => {
    setTopBotsLoading(true);
    fetch('/api/bots?topBot=true&limit=10')
      .then(res => res.json())
      .then(data => {
        if (data.bots) {
          setTopBots(data.bots);
        }
      })
      .catch(err => console.error('Failed to fetch top bots:', err))
      .finally(() => setTopBotsLoading(false));
  }, []);

  // Debounce search input
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Refetch bots when sort or search changes
  useEffect(() => {
    const fetchBots = async () => {
      // Skip initial fetch if filters match defaults (SSR data is already present)
      if (
        isFirstLoad.current &&
        selectedSort === 'upvotes' &&
        !debouncedSearchQuery &&
        selectedCategory === 'All' &&
        selectedSubcategory === 'All' &&
        bots.length > 0
      ) {
        isFirstLoad.current = false;
        return;
      }
      isFirstLoad.current = false;

      setLoading(true);
      try {
        const searchParam = debouncedSearchQuery ? `&search=${encodeURIComponent(debouncedSearchQuery)}` : '';
        const categoryParam = selectedCategory !== 'All' ? `&category=${encodeURIComponent(selectedCategory)}` : '';
        const subcategoryParam = selectedSubcategory !== 'All' ? `&subcategory=${encodeURIComponent(selectedSubcategory)}` : '';
        const response = await fetch(`/api/bots?skip=0&limit=${botsPageSize}&sortBy=${selectedSort}${searchParam}${categoryParam}${subcategoryParam}`, { cache: 'no-store' });
        const data = await response.json();
        const regular = (data.bots || []).filter((b: Bot) => !b.pinned);
        if (regular.length > 0) {
          setBots(regular);
          const newSlugs = regular.map((b: Bot) => b.slug).filter((s: string) => !(s in botScores));
          if (newSlugs.length > 0) {
            getAllBotStats(newSlugs).then(stats => {
              setBotScores(prev => {
                const next = { ...prev };
                for (const [slug, s] of Object.entries(stats)) next[slug] = (s.upvotes ?? 0) - (s.downvotes ?? 0);
                return next;
              });
            }).catch(() => {});
          }
        } else {
          setBots([]);
        }
      } catch (error) {
        console.error('Error fetching bots:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBots();
  }, [selectedSort, debouncedSearchQuery, selectedCategory, selectedSubcategory, botsPageSize]);

  const isDefaultBrowse =
    selectedSort === 'upvotes' &&
    !debouncedSearchQuery &&
    selectedCategory === 'All' &&
    selectedSubcategory === 'All';

  const filteredBots = useMemo(() => {
    return regularBots.filter((bot) => {
      if (selectedCategory === 'All') return true;
      const cats = (bot as any).categories?.length ? (bot as any).categories : [bot.category, bot.country].filter(Boolean);
      return cats.includes(selectedCategory);
    });
  }, [regularBots, selectedCategory]);

  const filteredPinnedBots = useMemo(() => {
    return pinnedBots.filter((bot) => {
      if (selectedCategory === 'All') return true;
      const cats = (bot as any).categories?.length ? (bot as any).categories : [bot.category, bot.country].filter(Boolean);
      return cats.includes(selectedCategory);
    });
  }, [pinnedBots, selectedCategory]);

  const displayBots = useMemo(() => {
    return [...filteredPinnedBots, ...filteredBots];
  }, [filteredPinnedBots, filteredBots]);

  // Custom hook for debouncing
  function useDebounce(value: string, delay: number) {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
      const handler = setTimeout(() => {
        setDebouncedValue(value);
      }, delay);

      return () => {
        clearTimeout(handler);
      };
    }, [value, delay]);

    return debouncedValue;
  }

  // Client-side advert randomization (fast, no extra network calls)
  // We ignore server ordering entirely to guarantee different ads per refresh
  const advertPlacementsMap = useMemo(() => {
    if (!initialAdverts || initialAdverts.length === 0) return new Map<number, Advert>();

    // Shuffle adverts cheaply on client
    const shuffled = [...initialAdverts];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Place adverts every 3–5 groups
    const map = new Map<number, Advert>();
    let advertIndex = 0;
    for (let position = 2; position <= 100 && advertIndex < shuffled.length; position += 3 + Math.floor(Math.random() * 3)) {
      map.set(position, shuffled[advertIndex]);
      advertIndex++;
    }

    return map;
  }, [initialAdverts]);

  const advertPositions = useMemo(() => {
    return new Set(advertPlacementsMap.keys());
  }, [advertPlacementsMap]);

  // Top Bots ad spots 1-4 (tierSlot 7-10 = named placements top-bots-1..4). Spot 1 keyed at index 0, etc.
  const topBotsAds = useMemo(() => {
    const map = new Map<number, FeedCampaign>();
    if (feedCampaigns?.length) {
      // An ad assigned to several Top Bots spots must show in only ONE at a time — never the
      // same ad duplicated across spots. Place each ad id once, into its lowest assigned spot.
      const usedIds = new Set<string>();
      for (let slot = 0; slot < 4; slot++) {
        const tierSlot = slot + 7;
        const placement = `top-bots-${slot + 1}`;
        // Match on the stamped named placement (authoritative) so an ad only claims the
        // exact Top Bots spot it was assigned to — never a neighbouring card.
        const pick = feedCampaigns.find(
          (c) => c.tierSlot === tierSlot && c.placement === placement && !usedIds.has(c._id),
        );
        if (pick) {
          map.set(slot, pick);
          usedIds.add(pick._id);
        }
      }
    }
    return map;
  }, [feedCampaigns]);

  // Feed ads from Admin → Feed Ads (placement = Bots or Both). One ad every 5 entries at 5, 10, 15, ...
  const feedPlacementsMap = useMemo(() => {
    const map = new Map<number, FeedCampaign>();
    if (feedCampaigns?.length) {
      feedCampaigns.forEach((c) => {
        if (c.position != null) map.set(c.position, c);
      });
    }
    return map;
  }, [feedCampaigns]);

  return (
    <div className="min-h-screen bg-[#111111]">
      <style>{`
        @keyframes vault-led-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#b31b1b] rounded-full blur-3xl opacity-10"
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 100, 0],
            y: [0, -100, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{ willChange: 'transform' }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#b31b1b] rounded-full blur-3xl opacity-10"
          animate={{
            scale: [1.2, 1, 1.2],
            x: [0, -100, 0],
            y: [0, 100, 0],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{ willChange: 'transform' }}
        />
      </div>

      {/* Navigation */}
      <Navbar
        username={username}
        setUsername={setUsername}
        showAddGroup={true}
        onAddGroupClick={() => setShowAddBotModal(true)}
      />

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 pb-8 min-h-screen">
        {/* Hero — same framework as AI NSFW (badge + title + subtitle) */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-6 sm:mb-8"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#ff5e2a]/10 border border-[#ff5e2a]/30 text-[#ff7a3d] text-xs font-bold uppercase tracking-[2px] mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ff7a3d] animate-pulse" />
            Curated &amp; Verified
          </div>
          <h1 className="text-[32px] sm:text-[50px] md:text-[58px] font-black leading-[1.05] tracking-tight text-white mb-3">
            {t('bots.title')}
          </h1>
          <p className="text-white/50 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            {t('bots.heroSubtitle', 'Discover the best NSFW Telegram bots — curated, verified and updated daily.')}
          </p>
        </motion.div>

        {/* Global top banner (single campaign) */}
        <div className="w-full mb-4">
          <HeaderBanner campaigns={topBannerCampaigns} />
        </div>

        {/* Filter bar — same framework as AI NSFW: compact, centered, inline */}
        <div className="mb-6 sm:mb-8 flex flex-wrap items-center justify-center gap-2">
          {/* Category */}
          <div className="relative">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              aria-label={t('common.category')}
              className="pl-3 pr-7 py-1.5 rounded-full bg-[#131a24] border border-[#ff5e2a]/20 text-white text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#ff5e2a]/50 focus:border-[#ff5e2a]/40 transition-all appearance-none cursor-pointer"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat} className="bg-[#131a24]">{cat === 'All' ? 'All Categories' : cat}</option>
              ))}
            </select>
            <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-white/40 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6"/></svg>
          </div>

          {/* Sort */}
          <div className="relative">
            <select
              value={selectedSort}
              onChange={(e) => setSelectedSort(e.target.value)}
              aria-label={t('bots.sortBy')}
              className="pl-3 pr-7 py-1.5 rounded-full bg-[#131a24] border border-[#ff5e2a]/20 text-white text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#ff5e2a]/50 focus:border-[#ff5e2a]/40 transition-all appearance-none cursor-pointer"
            >
              <option value="upvotes" className="bg-[#131a24]">{t('bots.topUpvoted')}</option>
              <option value="newest" className="bg-[#131a24]">{t('bots.newestFirst')}</option>
              <option value="random" className="bg-[#131a24]">{t('bots.randomDiscovery')}</option>
              <option value="popular" className="bg-[#131a24]">{t('bots.mostPopular')}</option>
              <option value="oldest" className="bg-[#131a24]">{t('bots.oldestFirst')}</option>
            </select>
            <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-white/40 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6"/></svg>
          </div>

          {/* Search — white background, compact */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('bots.searchByName')}
              aria-label={t('bots.searchBots')}
              className="w-44 pl-8 pr-7 py-1.5 rounded-full bg-white border border-[#ff5e2a]/20 text-black text-xs placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#ff5e2a]/50 focus:border-[#ff5e2a]/40 transition-all"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} aria-label="Clear search" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black transition-colors">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            )}
          </div>
        </div>

        <div>
          {/* Bots Grid — full width */}
          <div>
            {/* Top Bots Section — hidden when a search or filter is active */}
            {!debouncedSearchQuery && selectedCategory === 'All' && selectedSubcategory === 'All' && (topBots.length > 0 || topBotsLoading) && (
              <div className="mb-5 relative rounded-2xl p-[2px]" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706, #92400e, #d97706, #f59e0b, #fcd34d, #f59e0b)' }}>
                <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
                  <div className="absolute inset-0 opacity-30" style={{ background: 'linear-gradient(105deg, transparent 40%, rgba(252,211,77,0.4) 50%, transparent 60%)', animation: 'shimmer 3s infinite' }} />
                </div>
                <style>{`@keyframes shimmer { 0%,100%{transform:translateX(-100%)} 50%{transform:translateX(100%)} }`}</style>
                <div className="relative rounded-[20px] overflow-hidden" style={{ background: 'linear-gradient(145deg, #0f0f0f 0%, #141008 40%, #0f0f0f 100%)' }}>
                <div className="relative p-3 sm:p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <svg className="w-4 h-4 text-amber-400 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm2 3a1 1 0 000 2h10a1 1 0 000-2H7z"/>
                    </svg>
                    <h2 className="text-sm font-black text-white leading-none">{t('bots.topBots')}</h2>
                    <span className="text-amber-400/60 text-xs font-medium">{t('bots.topBotsDesc')}</span>
                  </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
                  {topBotsLoading ? (
                    Array.from({ length: 4 }, (_, i) => (
                      <BotCardSkeleton key={`top-skeleton-${i}`} />
                    ))
                  ) : (
                    (() => {
                      // 4 spots. Each spot shows its assigned Top Bots ad (top-bots-1..4) if any,
                      // otherwise the next-highest-scored bot. Legacy fallback: spot 4 = first feed ad.
                      const sortedBots = [...topBots].sort((a, b) => (botScores[b.slug] ?? 0) - (botScores[a.slug] ?? 0));
                      const hasNamedAds = topBotsAds.size > 0;
                      const cells: React.ReactNode[] = [];
                      let botIdx = 0;
                      for (let spot = 0; spot < 4; spot++) {
                        const ad = topBotsAds.get(spot) ?? (!hasNamedAds && spot === 3 && feedCampaigns.length > 0 ? feedCampaigns[0] : null);
                        if (ad) {
                          cells.push(<div key={`top-ad-${spot}`} className="h-full"><AdvertCard campaign={ad} isIndex={spot} /></div>);
                        } else {
                          const bot = sortedBots[botIdx++];
                          if (bot) cells.push(
                            <div key={`top-${bot._id}`} className="h-full">
                              <BotCard bot={bot} isIndex={spot} directLink={bot.isAdvertisement && bot.advertisementUrl ? bot.advertisementUrl : bot.telegramLink || undefined} initialStats={allBotStats?.[bot.slug]} onVoteChange={handleBotVoteChange} />
                            </div>
                          );
                        }
                      }
                      return <>{cells}</>;
                    })()
                  )}
                </div>
              </div>
              </div>
              </div>
            )}

            {/* Trending on Erogram — unified mixed block below Top Bots (same 4-up style). */}
            {!debouncedSearchQuery && selectedCategory === 'All' && selectedSubcategory === 'All' && (() => {
              const usedIds = new Set(Array.from(topBotsAds.values()).map((c: any) => c._id));
              const trendingAds = (trendingErogramCampaigns || []).filter((c: any) => !usedIds.has(c._id)).slice(0, 4);
              if (trendingAds.length === 0) return null;
              return (
                <div className="mb-5">
                  <div className="flex items-baseline gap-2.5 mb-3 px-1">
                    <h2 className="text-base font-black text-white leading-none tracking-tight">Trending on Erogram</h2>
                    <span className="text-white/60 text-xs font-bold">What&apos;s hot right now</span>
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 rounded-2xl p-3 sm:p-4" style={{ background: 'linear-gradient(180deg, #0d1117 0%, #0a0e16 100%)' }}>
                    {trendingAds.map((camp, i) => (
                      <AdvertCard key={`bot-trending-${camp._id}`} campaign={camp} isIndex={i} shouldPreload={false} />
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* All Bots */}
            <div className="relative">
              {displayBots.length === 0 ? (
                <div className="text-center py-20">
                  <div className="text-6xl mb-4">😔</div>
                  <p className="text-[#999] text-xl">{t('bots.noBotsFound')}</p>
                </div>
              ) : (
                <div className="relative">
                  <VirtualizedBotGrid
                    bots={displayBots}
                    advertPlacementsMap={advertPlacementsMap}
                    feedCampaigns={feedCampaigns ?? []}
                    isMobile={isMobile}
                    isTelegram={isTelegram}
                    allBotStats={allBotStats}
                    onVoteChange={handleBotVoteChange}
                  />
                </div>
              )}

              {isDefaultBrowse && paginationTotalPages > 1 && (
                <nav
                  aria-label="Bots pagination"
                  className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mt-8 sm:mt-10"
                >
                  {paginationCurrentPage > 1 && (
                    <Link
                      href={botsPageHref(paginationCurrentPage - 1)}
                      className="px-4 py-2 rounded-xl border border-white/10 bg-white/[0.04] text-sm font-bold text-white/80 hover:border-[#ff5e2a]/40 hover:text-white transition-colors"
                      rel="prev"
                    >
                      ← Previous
                    </Link>
                  )}
                  {Array.from({ length: paginationTotalPages }, (_, i) => i + 1).map((p) => {
                    const isActive = p === paginationCurrentPage;
                    return (
                      <Link
                        key={p}
                        href={botsPageHref(p)}
                        aria-current={isActive ? 'page' : undefined}
                        className={`min-w-[2.5rem] px-3 py-2 rounded-xl text-sm font-bold text-center transition-colors ${
                          isActive
                            ? 'bg-[#ff5e2a] text-white border border-[#ff5e2a]'
                            : 'border border-white/10 bg-white/[0.04] text-white/70 hover:border-[#ff5e2a]/40 hover:text-white'
                        }`}
                      >
                        {p}
                      </Link>
                    );
                  })}
                  {paginationCurrentPage < paginationTotalPages && (
                    <Link
                      href={botsPageHref(paginationCurrentPage + 1)}
                      className="px-4 py-2 rounded-xl border border-white/10 bg-white/[0.04] text-sm font-bold text-white/80 hover:border-[#ff5e2a]/40 hover:text-white transition-colors"
                      rel="next"
                    >
                      Next →
                    </Link>
                  )}
                </nav>
              )}

              {loading && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6 mt-6">
                  {Array.from({ length: 4 }, (_, i) => (
                    <BotCardSkeleton key={`skeleton-${i}`} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Add Bot Modal */}
      {showAddBotModal && (
        <AddBotModal
          categories={categories}
          onClose={() => setShowAddBotModal(false)}
          onSuccess={() => {
            setShowAddBotModal(false);
            // Optionally refresh bots if needed
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}

const BotCard = React.memo(function BotCard({ bot, isFeatured = false, isIndex = 0, directLink, initialStats, onVoteChange }: { bot: Bot; isFeatured?: boolean; isIndex: number; directLink?: string; initialStats?: BotStatsData; onVoteChange?: (slug: string, score: number) => void }) {
  const { t } = useTranslation();
  const [isHovered, setIsHovered] = useState(false);
  const [imageSrc, setImageSrc] = useState(bot.image || 'PLACEHOLDER_IMAGE_URL');
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const hasFetchedRef = useRef(false);
  const imgRef = useRef<HTMLDivElement>(null);

  const [votes, setVotes] = useState({ up: initialStats?.upvotes ?? 0, down: initialStats?.downvotes ?? 0 });
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(null);
  const score = votes.up - votes.down;

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`bot_vote_${bot.slug}`) as 'up' | 'down' | null;
      if (saved) setUserVote(saved);
    } catch {}
  }, [bot.slug]);

  const handleVote = async (e: React.MouseEvent, dir: 'up' | 'down') => {
    e.preventDefault();
    e.stopPropagation();
    if (userVote === dir) {
      setUserVote(null);
      localStorage.setItem(`bot_vote_${bot.slug}`, '');
      const result = await unvoteOnBot(bot.slug, dir);
      setVotes({ up: result.upvotes, down: result.downvotes });
      onVoteChange?.(bot.slug, result.upvotes - result.downvotes);
    } else {
      if (userVote) await unvoteOnBot(bot.slug, userVote);
      setUserVote(dir);
      localStorage.setItem(`bot_vote_${bot.slug}`, dir);
      const result = await voteOnBot(bot.slug, dir);
      setVotes({ up: result.upvotes, down: result.downvotes });
      onVoteChange?.(bot.slug, result.upvotes - result.downvotes);
    }
  };

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!imgRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '50px', // Start loading 50px before entering viewport
        threshold: 0.01,
      }
    );

    observer.observe(imgRef.current);

    return () => {
      observer.disconnect();
    };
  }, []);

  // Fetch actual image when in view and it's the placeholder
  useEffect(() => {
    if (isInView && imageSrc === 'PLACEHOLDER_IMAGE_URL' && bot._id && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      // Small delay to prevent too many simultaneous requests
      const delay = isIndex * 50;
      const timer = setTimeout(() => {
        fetch(`/api/bots/${bot._id}/image`)
          .then(res => res.json())
          .then(data => {
            if (data.image && data.image !== 'PLACEHOLDER_IMAGE_URL') {
              setImageSrc(data.image);
            }
          })
          .catch(err => {
            console.error('Failed to load bot image:', err);
          });
      }, delay);
      return () => clearTimeout(timer);
    } else if (imageSrc && imageSrc !== 'PLACEHOLDER_IMAGE_URL') {
      setImageLoaded(true);
    }
  }, [isInView, imageSrc, bot._id, isIndex]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 60 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: isIndex * 0.1 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="h-full"
      style={{ willChange: 'transform, opacity' }}
    >
      <div className={`glass rounded-2xl sm:rounded-3xl overflow-hidden h-full flex flex-col backdrop-blur-xl border transition-all duration-500 group relative ${isFeatured
        ? 'border-yellow-500/30 shadow-[0_0_30px_rgba(234,179,8,0.1)] hover:border-yellow-500/60 hover:shadow-[0_0_50px_rgba(234,179,8,0.2)]'
        : 'border-white/5 hover:border-white/20 hover:shadow-2xl hover:shadow-black/50'
        }`}>
        {/* Bot Image */}
        <div ref={imgRef} className="relative w-full aspect-square overflow-hidden bg-[#1a1a1a]">
          <img
            src={imageSrc}
            alt={bot.name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            style={{ transform: isHovered ? 'scale(1.1)' : 'scale(1)' }}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageSrc('PLACEHOLDER_IMAGE_URL')}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent opacity-80" />

          {/* Badges */}
          <div className="absolute top-3 left-3 flex gap-2">
            {isFeatured && (
              <div className="bg-yellow-500 text-black text-[10px] font-black px-2 py-1 rounded-md shadow-lg uppercase tracking-wider flex items-center gap-1">
                <span>⭐</span> {t('common.featured')}
              </div>
            )}
            {bot.pinned && !isFeatured && (
              <div className="bg-blue-500 text-white text-[10px] font-black px-2 py-1 rounded-md shadow-lg uppercase tracking-wider flex items-center gap-1">
                <span>📌</span> {t('common.pinned')}
              </div>
            )}
          </div>

          {/* Stats Overlay */}
          <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
            <div className="flex gap-1.5">
              {bot.memberCount && bot.memberCount > 0 && (
                <div className="bg-black/60 backdrop-blur-md border border-white/10 px-2 py-1 rounded-lg flex items-center gap-1.5">
                  <span className="text-xs">👥</span>
                  <span className="text-xs font-bold text-white">{bot.memberCount.toLocaleString()}</span>
                </div>
              )}
              {bot.clickCount && bot.clickCount > 0 && (
                <div className="bg-black/60 backdrop-blur-md border border-white/10 px-2 py-1 rounded-lg flex items-center gap-1.5">
                  <span className="text-xs">👆</span>
                  <span className="text-xs font-bold text-white">{bot.clickCount.toLocaleString()}</span>
                </div>
              )}
            </div>
            {/* Vote buttons on image */}
            <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md border border-white/10 px-1.5 py-1 rounded-lg">
              <button
                onClick={(e) => handleVote(e, 'up')}
                title="Upvote"
                className={`flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold transition-all ${
                  userVote === 'up'
                    ? 'bg-green-500 text-white'
                    : 'text-white/60 hover:text-green-300'
                }`}
              >
                <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4l8 8H4z"/></svg>
              </button>
              <span className={`text-[10px] font-black px-1 tabular-nums ${
                score > 0 ? 'text-green-300' : score < 0 ? 'text-red-300' : 'text-white/40'
              }`}>
                {score > 0 ? `+${score}` : score}
              </span>
              <button
                onClick={(e) => handleVote(e, 'down')}
                title="Downvote"
                className={`flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold transition-all ${
                  userVote === 'down'
                    ? 'bg-red-500 text-white'
                    : 'text-white/60 hover:text-red-300'
                }`}
              >
                <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 20l-8-8h16z"/></svg>
              </button>
            </div>
          </div>
        </div>

        {/* Card Content */}
        <div className="p-3 sm:p-5 flex-grow flex flex-col relative">
          {/* Title */}
          <h3 className="text-sm sm:text-xl font-black text-white mb-2 sm:mb-3 leading-tight group-hover:text-blue-400 transition-colors flex items-center gap-1 sm:gap-2 min-w-0">
            <span className="truncate">{bot.name}</span>
            {bot.showVerified && (
              <span className="shrink-0 flex items-center justify-center w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 border border-white/30 shadow" title="Verified">
                <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" fill="currentColor" aria-hidden="true">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                </svg>
              </span>
            )}
          </h3>

          {/* Tags */}
          <div className="flex flex-wrap gap-1 sm:gap-2 mb-2 sm:mb-4">
            {[...new Set<string>((bot as any).categories?.length ? (bot as any).categories : [bot.category].filter(Boolean))].map((tag: string) => (
              <span key={tag} className="px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-lg bg-white/5 border border-white/5 text-gray-300 text-[10px] sm:text-xs font-medium">
                {tag}
              </span>
            ))}
          </div>

          {/* Description */}
          <div className="mb-3 sm:mb-6 flex-grow">
            <p className="text-gray-400 text-xs sm:text-sm line-clamp-2 sm:line-clamp-3 leading-relaxed">
              {bot.description}
            </p>
          </div>

          {/* Footer Actions */}
          <div className="mt-auto">
            <a
              href={directLink
                ? directLink
                : bot.isAdvertisement && bot.advertisementUrl
                  ? `/redirect.html?url=${encodeURIComponent(bot.advertisementUrl)}&bot=${bot._id}`
                  : `/${bot.slug}`}
              target="_blank"
              rel={bot.isAdvertisement ? "sponsored noopener noreferrer" : "noopener noreferrer"}
              onClick={() => {
                if (!bot.isAdvertisement) {
                  try {
                    const payload = JSON.stringify({ botId: bot._id });
                    if (navigator.sendBeacon) {
                      navigator.sendBeacon('/api/bots/track', new Blob([payload], { type: 'application/json' }));
                    } else {
                      axios.post('/api/bots/track', { botId: bot._id }).catch(() => {});
                    }
                  } catch {}
                }
              }}
              className={`group/btn relative flex items-center justify-center w-full overflow-hidden rounded-xl py-2.5 sm:py-3.5 px-3 sm:px-4 font-black text-white shadow-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] ${isFeatured
                ? 'bg-gradient-to-r from-yellow-500 to-red-600 hover:shadow-orange-500/40'
                : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:shadow-blue-500/40'
                }`}
            >
              <div className="absolute inset-0 bg-white/20 opacity-0 transition-opacity duration-300 group-hover/btn:opacity-100" />

              <span className="relative flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm uppercase tracking-wider">
                {bot.isAdvertisement ? (
                  <>
                    <span>🔗</span> {t('bots.visitLink')}
                  </>
                ) : (
                  <>
                    <span className="text-base sm:text-lg">🤖</span> {t('bots.useBot')}
                  </>
                )}
              </span>
            </a>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

const BOT_FIRST_AD_AFTER = 3;
const BOT_MIN_GAP = 4;
const BOT_MAX_GAP = 6;

function buildBotFeedItems(bots: Bot[], campaigns: FeedCampaign[]): Array<{ type: 'bot' | 'campaign'; data: Bot | FeedCampaign; index: number }> {
  const items: Array<{ type: 'bot' | 'campaign'; data: Bot | FeedCampaign; index: number }> = [];
  if (!campaigns.length) {
    bots.forEach((bot) => items.push({ type: 'bot', data: bot, index: items.length }));
    return items;
  }
  let botIdx = 0;
  let campaignIdx = 0;
  let botsSinceLastAd = 0;
  let nextAdAt = BOT_FIRST_AD_AFTER;

  while (botIdx < bots.length) {
    items.push({ type: 'bot', data: bots[botIdx], index: items.length });
    botIdx++;
    botsSinceLastAd++;

    if (botsSinceLastAd >= nextAdAt) {
      items.push({ type: 'campaign', data: campaigns[campaignIdx % campaigns.length], index: items.length });
      campaignIdx++;
      botsSinceLastAd = 0;
      nextAdAt = BOT_MIN_GAP + Math.floor(Math.random() * (BOT_MAX_GAP - BOT_MIN_GAP + 1));
    }
  }
  return items;
}

const VirtualizedBotGrid = React.memo(function VirtualizedBotGrid({ bots, advertPlacementsMap, feedCampaigns, isMobile, isTelegram, allBotStats, onVoteChange }: { bots: Bot[]; advertPlacementsMap: Map<number, Advert>; feedCampaigns: FeedCampaign[]; isMobile: boolean; isTelegram: boolean; allBotStats?: Record<string, BotStatsData>; onVoteChange?: (slug: string, score: number) => void }) {
  // SSR renders bots-only; useEffect inserts ads client-side to avoid hydration mismatch with Math.random()
  const [items, setItems] = React.useState<Array<{ type: 'bot' | 'campaign'; data: Bot | FeedCampaign; index: number }>>(() =>
    bots.map((bot, i) => ({ type: 'bot' as const, data: bot, index: i }))
  );

  React.useEffect(() => {
    if (!isTelegram && feedCampaigns.length > 0) {
      setItems(buildBotFeedItems(bots, feedCampaigns));
    } else {
      setItems(bots.map((bot, i) => ({ type: 'bot' as const, data: bot, index: i })));
    }
  }, [bots, feedCampaigns, isTelegram]);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
      {items.map((item) => {
        if (item.type === 'bot') {
          const b = item.data as Bot;
          return (
            <BotCard
              key={`bot-${b._id}`}
              bot={b}
              isIndex={Math.floor(item.index)}
              isFeatured={b.pinned}
              initialStats={allBotStats?.[b.slug]}
              onVoteChange={onVoteChange}
            />
          );
        }
        return (
          <AdvertCard
            key={`campaign-${(item.data as FeedCampaign)._id}-${item.index}`}
            campaign={item.data as FeedCampaign}
            isIndex={Math.floor(item.index)}
            shouldPreload={false}
          />
        );
      })}
    </div>
  );
});

const BotAdvertCard = React.memo(function BotAdvertCard({ advert, isIndex = 0, isMobile, isTelegram }: { advert: Advert; isIndex?: number; isMobile: boolean; isTelegram: boolean }) {
  const { t } = useTranslation();
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = async () => {
    // Track the click
    try {
      await axios.post('/api/adverts/track', { advertId: advert._id });
    } catch (err) {
      // Silently fail - tracking is not critical
      console.error('Error tracking advert click:', err);
    }
    // Open the URL
    window.open(advert.url, '_blank', 'noopener,noreferrer');
  };

  // Adverts disabled
  return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 60 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: isIndex * 0.1 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      style={{ willChange: 'transform, opacity' }}
    >
      <div className={`glass rounded-2xl overflow-hidden h-full flex flex-col backdrop-blur-lg border border-orange-500/50 hover:border-orange-500 transition-all duration-300 ${isHovered ? 'hover-glow' : ''} relative`}>
        {/* Advert Badge */}
        <div className="absolute top-4 right-4 z-10 bg-gradient-to-r from-orange-500 to-red-500 text-white font-black px-3 py-1 rounded-full text-xs">
          📢 {t('common.ad')}
        </div>

        {/* Advert Image */}
        <div className="relative w-full h-48 overflow-hidden">
          <img
            src={advert.image || 'PLACEHOLDER_IMAGE_URL'}
            alt={advert.name}
            className="w-full h-full object-cover transition-transform duration-700"
            style={{ transform: isHovered ? 'scale(1.1)' : 'scale(1)' }}
          />
        </div>

        {/* Card Content */}
        <div className="p-6 flex-grow flex flex-col">
          <h3 className="text-2xl font-bold text-[#f5f5f5] mb-4 text-center line-clamp-2">
            {advert.name}
          </h3>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-4 justify-center">
            <span className="px-3 py-1 rounded-full bg-red-500 text-white text-xs font-semibold">
              🏷️ {advert.category}
            </span>
          </div>

          {/* Description */}
          <div className="mb-6 flex-grow">
            <p className="text-gray-400 text-center text-sm line-clamp-3">
              {advert.description}
            </p>
          </div>

          {/* Action Button */}
          <button
            onClick={handleClick}
            className="block w-full text-center font-bold py-3 px-4 rounded-xl transition-all duration-300 bg-gradient-to-r from-orange-500 to-red-600 text-white hover:from-orange-600 hover:to-red-700 hover:scale-105"
          >
            🔗 {t('bots.visitSite')}
          </button>
        </div>
      </div>
    </motion.div>
  );
});



type BotSubmissionType = 'normal_listing' | 'instant_approval' | 'boost_week' | 'boost_month';

const BOT_TIERS: { type: BotSubmissionType; stars: number; label: string; perks: string[]; highlight: boolean; accent: string }[] = [
  { type: 'normal_listing', stars: 1000, label: 'Normal Listing', perks: ['Added to the bot directory', 'Up to 48h for approval', 'Regular listing position'], highlight: false, accent: '#22c55e' },
  { type: 'instant_approval', stars: 1500, label: 'Instant Approval', perks: ['Goes live immediately', 'Skip moderation queue', 'Regular listing position'], highlight: false, accent: '#06b6d4' },
  { type: 'boost_week', stars: 3000, label: 'Instant + Boost 1 Week', perks: ['Goes live immediately', '1 week in Top Bots section', '40× more exposure for 1 week'], highlight: true, accent: '#fb923c' },
  { type: 'boost_month', stars: 6000, label: 'Instant + Boost 1 Month', perks: ['Goes live immediately', '1 month in Most Popular Bots', '40× more exposure for 1 month'], highlight: false, accent: '#a855f7' },
];

function AddBotModal({ categories, onClose, onSuccess }: { categories: string[]; onClose: () => void; onSuccess: () => void }) {
  const { t } = useTranslation();
  const [botData, setBotData] = useState({
    name: '',
    categories: ['NSFW Bot'] as string[],
    telegramLink: '',
    description: '',
    imageFile: null as File | null
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [selectedTier, setSelectedTier] = useState<BotSubmissionType>('normal_listing');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBotData({ ...botData, imageFile: file });
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const toggleCategory = (cat: string) => {
    setBotData(prev => {
      const has = prev.categories.includes(cat);
      if (has) {
        const next = prev.categories.filter(c => c !== cat);
        return { ...prev, categories: next.length ? next : prev.categories };
      }
      if (prev.categories.length >= 3) return prev;
      return { ...prev, categories: [...prev.categories, cat] };
    });
  };

  const handleSubmit = async () => {
    setError('');
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError(t('bots.loginFirst'));
        setIsSubmitting(false);
        return;
      }

      if (!botData.name || botData.categories.length === 0 || !botData.telegramLink || !botData.description) {
        setError(t('bots.nameRequired'));
        setIsSubmitting(false);
        return;
      }

      if (botData.description.length < 30) {
        setError(t('bots.descMin30'));
        setIsSubmitting(false);
        return;
      }

      if (!botData.telegramLink.startsWith('https://t.me/')) {
        setError(t('bots.linkMustStart'));
        setIsSubmitting(false);
        return;
      }

      let imageUrl = null;
      if (botData.imageFile) {
        imageUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(botData.imageFile!);
        });
      }

      const { imageFile, ...rest } = botData;
      const res = await axios.post('/api/bots', {
        ...rest,
        category: rest.categories[0],
        image: imageUrl || 'PLACEHOLDER_IMAGE_URL'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const botId = res.data?._id;
      if (!botId) throw new Error('Bot creation failed');

      const payRes = await axios.post('/api/payments/group-submission', {
        groupId: botId,
        type: selectedTier,
        entityType: 'bot',
      });

      const paymentUrl = payRes.data?.url;
      if (!paymentUrl) throw new Error('Failed to create payment link');

      window.open(paymentUrl, '_blank');

      pollRef.current = setInterval(async () => {
        try {
          const check = await axios.get(`/api/bots/${botId}/status`);
          if (check.data?.paid) {
            if (pollRef.current) clearInterval(pollRef.current);
            onSuccess();
          }
        } catch {}
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || t('bots.failedCreate'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormFilled = botData.name && botData.categories.length > 0 && botData.telegramLink.startsWith('https://t.me/') && botData.description.length >= 30;
  const tierInfo = BOT_TIERS.find(t => t.type === selectedTier)!;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass rounded-3xl shadow-2xl p-6 sm:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-white/10"
        style={{ willChange: 'transform, opacity' }}
      >
        <div className="relative">
          <button onClick={onClose} className="absolute top-0 right-0 text-gray-500 hover:text-gray-200 text-3xl font-bold transition hover:scale-110 z-10">
            ✕
          </button>

          <div className="text-center mb-6">
            <h2 className="text-3xl sm:text-4xl font-black gradient-text mb-2">
              🤖 {t('bots.createTitle')}
            </h2>
            <p className="text-[#999] text-sm sm:text-lg">{t('bots.createDesc')}</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-400 text-sm">
              <span className="mr-2">⚠️</span>{error}
            </div>
          )}

          <div className="space-y-5">
            {/* Pricing Tiers */}
            <div>
              <label className="block text-sm font-bold text-[#f5f5f5] mb-3">⭐ Choose a plan</label>
              <div className="grid gap-3">
                {BOT_TIERS.map(tier => (
                  <button
                    key={tier.type}
                    type="button"
                    onClick={() => setSelectedTier(tier.type)}
                    className={`relative w-full text-left rounded-2xl p-4 border-2 transition-all ${
                      selectedTier === tier.type
                        ? 'border-opacity-100 scale-[1.01]'
                        : 'border-white/10 hover:border-white/20'
                    }`}
                    style={{
                      borderColor: selectedTier === tier.type ? tier.accent : undefined,
                      background: selectedTier === tier.type ? `linear-gradient(135deg, ${tier.accent}15, ${tier.accent}08)` : 'rgba(255,255,255,0.03)',
                    }}
                  >
                    {tier.highlight && (
                      <span className="absolute -top-2.5 right-4 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider text-white" style={{ background: `linear-gradient(135deg, ${tier.accent}, #ea580c)` }}>
                        Popular
                      </span>
                    )}
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-white font-bold text-sm sm:text-base">{tier.label}</h4>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {tier.perks.map(p => (
                            <span key={p} className="text-[10px] sm:text-xs text-white/50">✓ {p}</span>
                          ))}
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <span className="text-xl sm:text-2xl font-black" style={{ color: tier.accent }}>{tier.stars.toLocaleString()}</span>
                        <span className="text-white/40 text-sm ml-1">★</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Bot Image Upload */}
            <div className="glass rounded-2xl p-4 sm:p-6 border border-white/10">
              <label className="block text-sm font-bold text-[#f5f5f5] mb-3 flex items-center">
                <span className="mr-2">📸</span>{t('bots.botImage')}
              </label>
              <input type="file" accept="image/*" onChange={handleImageChange} className="w-full p-3 border-2 border-dashed border-white/20 rounded-xl bg-white/5 text-[#f5f5f5] cursor-pointer text-sm" />
              {imagePreview && <img src={imagePreview} alt="Preview" className="mt-3 w-full h-40 object-cover rounded-xl" />}
            </div>

            {/* Bot Name */}
            <div className="glass rounded-2xl p-4 sm:p-6 border border-white/10">
              <label className="block text-sm font-bold text-[#f5f5f5] mb-2 flex items-center">
                <span className="mr-2">🏷️</span>{t('bots.botName')} *
              </label>
              <input
                type="text"
                value={botData.name}
                onChange={(e) => setBotData({ ...botData, name: e.target.value })}
                className="w-full p-3 border border-white/20 rounded-xl bg-white/5 text-[#f5f5f5] placeholder:text-gray-500 focus:ring-2 focus:ring-[#b31b1b] outline-none"
                placeholder={t('bots.enterBotName')}
              />
            </div>

            {/* Categories */}
            <div className="glass rounded-2xl p-4 sm:p-6 border border-white/10">
              <label className="block text-sm font-bold text-[#f5f5f5] mb-1 flex items-center">
                <span className="mr-2">📂</span>{t('bots.categories')} * <span className="text-xs text-white/40 ml-2">({botData.categories.length}/3)</span>
              </label>
              <div className="flex flex-wrap gap-2 mt-2 max-h-36 overflow-y-auto">
                {categories.filter(c => c !== 'All').map(cat => {
                  const selected = botData.categories.includes(cat);
                  return (
                    <button key={cat} type="button" onClick={() => toggleCategory(cat)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${selected ? 'bg-[#b31b1b]/80 border-[#b31b1b] text-white' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'} ${!selected && botData.categories.length >= 3 ? 'opacity-40 cursor-not-allowed' : ''}`}
                    >{cat}</button>
                  );
                })}
              </div>
            </div>

            {/* Telegram Link */}
            <div className="glass rounded-2xl p-4 sm:p-6 border border-white/10">
              <label className="block text-sm font-bold text-[#f5f5f5] mb-2 flex items-center">
                <span className="mr-2">📱</span>{t('bots.telegramLink')} *
              </label>
              <input
                type="url"
                value={botData.telegramLink}
                onChange={(e) => setBotData({ ...botData, telegramLink: e.target.value })}
                className="w-full p-3 border border-white/20 rounded-xl bg-white/5 text-[#f5f5f5] placeholder:text-gray-500 focus:ring-2 focus:ring-[#b31b1b] outline-none"
                placeholder="https://t.me/yourbot"
              />
            </div>

            {/* Description */}
            <div className="glass rounded-2xl p-4 sm:p-6 border border-white/10">
              <label className="block text-sm font-bold text-[#f5f5f5] mb-2 flex items-center">
                <span className="mr-2">📝</span>{t('bots.description')} * ({t('bots.minChars')})
              </label>
              <textarea
                value={botData.description}
                onChange={(e) => setBotData({ ...botData, description: e.target.value })}
                className="w-full p-3 border border-white/20 rounded-xl bg-white/5 text-[#f5f5f5] placeholder:text-gray-500 focus:ring-2 focus:ring-[#b31b1b] outline-none resize-none"
                placeholder={t('bots.tellAboutBot')}
                rows={3}
              />
              <p className="text-xs text-gray-500 mt-1">{botData.description.length}/30 {t('bots.characters')}</p>
            </div>

            {/* Submit */}
            <motion.button
              onClick={handleSubmit}
              disabled={isSubmitting || !isFormFilled}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-4 rounded-xl font-black text-white text-base disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              style={{ background: isFormFilled ? `linear-gradient(135deg, ${tierInfo.accent}, ${tierInfo.accent}cc)` : '#333' }}
            >
              {isSubmitting ? '⏳ Submitting...' : `Submit & Pay ${tierInfo.stars.toLocaleString()}★`}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

