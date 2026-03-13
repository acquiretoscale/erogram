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
}

export default function BotsClient({ initialBots, initialAdverts, feedCampaigns = [], initialIsMobile, initialIsTelegram, initialCountry, topBannerCampaigns = [] }: BotsClientProps) {
  const [username, setUsername] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedSubcategory, setSelectedSubcategory] = useState('All');
  const [selectedSort, setSelectedSort] = useState('random');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showAddBotModal, setShowAddBotModal] = useState(false);
  const [bots, setBots] = useState(initialBots.filter(b => !b.pinned));
  const [pinnedBots, setPinnedBots] = useState<Bot[]>(initialBots.filter(b => b.pinned));
  const [skip, setSkip] = useState(initialBots.filter(b => !b.pinned).length);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const isFirstLoad = useRef(true);
  const { t } = useTranslation();
  const lp = useLocalePath();

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
        selectedSort === 'random' &&
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
        const response = await fetch(`/api/bots?skip=0&limit=12&sortBy=${selectedSort}${searchParam}${categoryParam}${subcategoryParam}`, { cache: 'no-store' });
        const data = await response.json();
        const regular = data.bots.filter((b: Bot) => !b.pinned);
        if (regular && regular.length > 0) {
          setBots(regular);
          setSkip(regular.length);
          setHasMore(data.hasMore);
        } else {
          setBots([]);
          setSkip(0);
          setHasMore(false);
        }
      } catch (error) {
        console.error('Error fetching bots:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBots();
  }, [selectedSort, debouncedSearchQuery, selectedCategory, selectedSubcategory]);

  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + window.scrollY >= document.body.offsetHeight - 500 &&
        !loading &&
        hasMore
      ) {
        setLoading(true);
        const searchParam = debouncedSearchQuery ? `&search=${encodeURIComponent(debouncedSearchQuery)}` : '';
        const categoryParam = selectedCategory !== 'All' ? `&category=${encodeURIComponent(selectedCategory)}` : '';
        const subcategoryParam = selectedSubcategory !== 'All' ? `&subcategory=${encodeURIComponent(selectedSubcategory)}` : '';
        fetch(`/api/bots?skip=${skip}&limit=12&sortBy=${selectedSort}${searchParam}${categoryParam}${subcategoryParam}`)
          .then(res => res.json())
          .then(data => {
            if (data.bots && data.bots.length > 0) {
              setBots(prev => {
                const existingIds = new Set(prev.map(b => b._id));
                const newBots = data.bots.filter((b: Bot) => !existingIds.has(b._id) && !b.pinned);
                return [...prev, ...newBots];
              });
              setSkip(prev => prev + data.bots.filter((b: Bot) => !b.pinned).length);
              setHasMore(data.hasMore);
            } else {
              setHasMore(false);
            }
          })
          .catch(console.error)
          .finally(() => setLoading(false));
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [skip, loading, hasMore, selectedSort, debouncedSearchQuery, selectedCategory, selectedSubcategory]);

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
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-8 min-h-screen">
        {/* Global top banner (single campaign) */}
        <div className="w-full mb-4">
          <HeaderBanner campaigns={topBannerCampaigns} />
        </div>
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* Mobile: Filter toggle */}
          <div className="lg:hidden">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="w-full px-4 py-3 bg-[#b31b1b] hover:bg-[#c42b2b] text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
            >
              <span className="text-xl">🔍</span>
              {showFilters ? t('bots.hideFilters') : t('bots.showFilters')}
            </button>
          </div>

          {/* Sidebar Filters */}
          <aside className={`${showFilters ? 'block' : 'hidden'} lg:block lg:w-1/4`} suppressHydrationWarning>
            <div className="glass rounded-2xl p-6 backdrop-blur-lg border border-white/10">
              {/* Header */}
              <div className="text-center mb-8">
                <h2 className="text-2xl font-black text-[#f5f5f5] mb-2">🔍 {t('bots.filters')}</h2>
                <p className="text-[#999] text-sm">{t('bots.findPerfect')}</p>
              </div>

              {/* Category Filter */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-[#f5f5f5] mb-3 flex items-center">
                  <span className="mr-2">📂</span>
                  {t('common.category')}
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full p-4 border border-white/20 rounded-xl bg-white/5 text-[#f5f5f5] focus:ring-2 focus:ring-[#b31b1b] focus:border-transparent outline-none transition-all"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat} className="bg-[#222]">
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subcategory Filter */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-[#f5f5f5] mb-3 flex items-center">
                  <span className="mr-2">🏷️</span>
                  {t('common.subcategory')}
                </label>
                <select
                  value={selectedSubcategory}
                  onChange={(e) => setSelectedSubcategory(e.target.value)}
                  className="w-full p-4 border border-white/20 rounded-xl bg-white/5 text-[#f5f5f5] focus:ring-2 focus:ring-[#b31b1b] focus:border-transparent outline-none transition-all"
                >
                  {categories.map((cat) => (
                    <option key={`sub-${cat}`} value={cat} className="bg-[#222]">
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort By */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-[#f5f5f5] mb-3 flex items-center">
                  <span className="mr-2">📊</span>
                  {t('bots.sortBy')}
                </label>
                <select
                  value={selectedSort}
                  onChange={(e) => setSelectedSort(e.target.value)}
                  className="w-full p-4 border border-white/20 rounded-xl bg-white/5 text-[#f5f5f5] focus:ring-2 focus:ring-[#b31b1b] focus:border-transparent outline-none transition-all"
                >
                  <option value="newest" className="bg-[#222]">🆕 {t('bots.newestFirst')}</option>
                  <option value="random" className="bg-[#222]">🎲 {t('bots.randomDiscovery')}</option>
                  <option value="popular" className="bg-[#222]">🔥 {t('bots.mostPopular')}</option>
                  <option value="oldest" className="bg-[#222]">📅 {t('bots.oldestFirst')}</option>
                </select>
              </div>

              {/* Search */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-[#f5f5f5] mb-3 flex items-center">
                  <span className="mr-2">🔍</span>
                  {t('bots.searchBots')}
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('bots.searchByName')}
                  className="w-full p-4 border border-white/20 rounded-xl bg-white/5 text-[#f5f5f5] placeholder:text-gray-500 focus:ring-2 focus:ring-[#b31b1b] focus:border-transparent outline-none transition-all"
                />
              </div>

            </div>
          </aside>

          {/* Bots Grid */}
          <div className="lg:w-3/4">
            {/* Top Bots Section */}
            {(topBots.length > 0 || topBotsLoading) && (
              <div className="mb-16 relative">
                {/* Animated Background Gradient */}
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-600/10 via-orange-600/10 to-red-600/10 rounded-3xl"></div>

                {/* Section Header */}
                <div className="relative text-center mb-8 sm:mb-12">
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="inline-block"
                    style={{ willChange: 'transform, opacity' }}
                  >
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#f5f5f5] mb-3 sm:mb-4 drop-shadow-2xl">
                      🏆 {t('bots.topBots')}
                    </h2>
                    <div className="h-1 w-24 sm:w-32 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 mx-auto rounded-full animate-pulse"></div>
                  </motion.div>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="text-[#999] mt-3 sm:mt-4 text-base sm:text-lg px-4"
                    style={{ willChange: 'opacity' }}
                  >
                    {t('bots.topBotsDesc')}
                  </motion.p>
                </div>

                {/* Top Bots Grid: 2 bots + 1 feed ad */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 px-2 relative z-10">
                  {topBotsLoading ? (
                    Array.from({ length: 3 }, (_, i) => (
                      <BotCardSkeleton key={`top-skeleton-${i}`} />
                    ))
                  ) : (
                    <>
                      {topBots.slice(0, 2).map((bot, idx) => (
                        <motion.div
                          key={`top-${bot._id}`}
                          initial={{ opacity: 0, y: 50 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.6, delay: idx * 0.1 }}
                          className="relative h-full"
                          style={{ willChange: 'transform, opacity' }}
                        >
                          <div className="h-full">
                            <BotCard bot={bot} isIndex={idx} />
                          </div>
                          <div className="absolute -top-1 sm:-top-2 -left-1 sm:-left-2 w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg z-20 border-2 border-white">
                            <span className="text-black font-bold text-xs sm:text-sm">#{idx + 1}</span>
                          </div>
                          {(bot.clickCount || 0) > 0 && (
                            <div className="absolute -top-1 sm:-top-2 -right-1 sm:-right-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full shadow-lg z-20 border border-white/20 max-w-[60px] sm:max-w-none truncate">
                              <span className="hidden sm:inline">{bot.clickCount} {t('common.uses')}</span>
                              <span className="sm:hidden">{bot.clickCount}</span>
                            </div>
                          )}
                        </motion.div>
                      ))}
                      {feedCampaigns.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 50 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.6, delay: 0.2 }}
                          className="h-full"
                          style={{ willChange: 'transform, opacity' }}
                        >
                          <AdvertCard campaign={feedCampaigns[0]} isIndex={2} />
                        </motion.div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* All Bots */}
            <div className="relative">
              <div className="text-center mb-12">
                <h1 className="text-3xl md:text-4xl font-black text-[#f5f5f5] mb-4">
                  {t('bots.title')}
                </h1>
                <p className="text-[#999] text-lg">
                  {t('bots.subtitle')}
                </p>
              </div>

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
                  />
                </div>
              )}

              {loading && (
                <div className="text-center py-6 text-gray-400">
                  {t('bots.loadingMore')}
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

const BotCard = React.memo(function BotCard({ bot, isFeatured = false, isIndex = 0 }: { bot: Bot; isFeatured?: boolean; isIndex: number }) {
  const { t } = useTranslation();
  const [isHovered, setIsHovered] = useState(false);
  const [imageSrc, setImageSrc] = useState(bot.image || 'PLACEHOLDER_IMAGE_URL');
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const hasFetchedRef = useRef(false);
  const imgRef = useRef<HTMLDivElement>(null);

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
      <div className={`glass rounded-3xl overflow-hidden h-full flex flex-col backdrop-blur-xl border transition-all duration-500 group relative ${isFeatured
        ? 'border-yellow-500/30 shadow-[0_0_30px_rgba(234,179,8,0.1)] hover:border-yellow-500/60 hover:shadow-[0_0_50px_rgba(234,179,8,0.2)]'
        : 'border-white/5 hover:border-white/20 hover:shadow-2xl hover:shadow-black/50'
        }`}>
        {/* Bot Image */}
        <div ref={imgRef} className="relative w-full h-52 overflow-hidden bg-[#1a1a1a]">
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
            <div className="flex gap-2">
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
          </div>
        </div>

        {/* Card Content */}
        <div className="p-5 flex-grow flex flex-col relative">
          {/* Title */}
          <h3 className="text-xl font-black text-white mb-3 line-clamp-2 leading-tight group-hover:text-blue-400 transition-colors flex items-center gap-2 min-w-0">
            <span className="truncate">{bot.name}</span>
            {bot.showVerified && (
              <span className="shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 border border-white/30 shadow" title="Verified">
                <svg viewBox="0 0 24 24" className="w-3 h-3 text-white" fill="currentColor" aria-hidden="true">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                </svg>
              </span>
            )}
          </h3>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-4">
            {((bot as any).categories?.length ? (bot as any).categories : [bot.category].filter(Boolean)).map((tag: string) => (
              <span key={tag} className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/5 text-gray-300 text-xs font-medium hover:bg-white/10 transition-colors">
                {tag}
              </span>
            ))}
          </div>

          {/* Description */}
          <div className="mb-6 flex-grow">
            <p className="text-gray-400 text-sm line-clamp-3 leading-relaxed">
              {bot.description}
            </p>
          </div>

          {/* Footer Actions */}
          <div className="mt-auto">
            <a
              href={bot.isAdvertisement && bot.advertisementUrl
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
              className={`group/btn relative flex items-center justify-center w-full overflow-hidden rounded-xl py-3.5 px-4 font-black text-white shadow-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] ${isFeatured
                ? 'bg-gradient-to-r from-yellow-500 to-red-600 hover:shadow-orange-500/40'
                : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:shadow-blue-500/40'
                }`}
            >
              <div className="absolute inset-0 bg-white/20 opacity-0 transition-opacity duration-300 group-hover/btn:opacity-100" />

              <span className="relative flex items-center justify-center gap-2 text-sm uppercase tracking-wider">
                {bot.isAdvertisement ? (
                  <>
                    <span>🔗</span> {t('bots.visitLink')}
                  </>
                ) : (
                  <>
                    <span className="text-lg">🤖</span> {t('bots.useBot')}
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

const VirtualizedBotGrid = React.memo(function VirtualizedBotGrid({ bots, advertPlacementsMap, feedCampaigns, isMobile, isTelegram }: { bots: Bot[]; advertPlacementsMap: Map<number, Advert>; feedCampaigns: FeedCampaign[]; isMobile: boolean; isTelegram: boolean }) {
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {items.map((item) => {
        if (item.type === 'bot') {
          return (
            <BotCard
              key={`bot-${(item.data as Bot)._id}`}
              bot={item.data as Bot}
              isIndex={Math.floor(item.index)}
              isFeatured={(item.data as Bot).pinned}
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



function AddBotModal({ categories, onClose, onSuccess }: { categories: string[]; onClose: () => void; onSuccess: () => void }) {
  const { t } = useTranslation();
  const [botData, setBotData] = useState({
    name: '',
    categories: ['Amateur'] as string[],
    telegramLink: '',
    description: '',
    imageFile: null as File | null
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

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

      if (res.data) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || t('bots.failedCreate'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass rounded-3xl shadow-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-white/10"
        style={{ willChange: 'transform, opacity' }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-5 rounded-3xl"></div>

        <div className="relative">
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-200 text-3xl font-bold transition hover:scale-110 z-10">
            ✕
          </button>

          <div className="text-center mb-8">
            <h2 className="text-4xl font-black gradient-text mb-2">
              ✨ {t('bots.createTitle')}
            </h2>
            <p className="text-[#999] text-lg">{t('bots.createDesc')}</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-400 text-sm">
              <span className="mr-2">⚠️</span>
              {error}
            </div>
          )}

          <div className="space-y-6">
            {/* Bot Image Upload */}
            <div className="glass rounded-2xl p-6 border border-white/10">
              <label className="block text-sm font-bold text-[#f5f5f5] mb-3 flex items-center">
                <span className="mr-2">📸</span>
                {t('bots.botImage')}
              </label>
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full p-4 border-2 border-dashed border-white/20 rounded-xl bg-white/5 text-[#f5f5f5] cursor-pointer"
                />
              </div>
              {imagePreview && (
                <div className="mt-4">
                  <img src={imagePreview} alt="Preview" className="w-full h-48 object-cover rounded-xl" />
                </div>
              )}
            </div>

            {/* Bot Name */}
            <div className="glass rounded-2xl p-6 border border-white/10">
              <label className="block text-sm font-bold text-[#f5f5f5] mb-3 flex items-center">
                <span className="mr-2">🏷️</span>
                {t('bots.botName')} *
              </label>
              <input
                type="text"
                value={botData.name}
                onChange={(e) => setBotData({ ...botData, name: e.target.value })}
                className="w-full p-4 border border-white/20 rounded-xl bg-white/5 text-[#f5f5f5] placeholder:text-gray-500 focus:ring-2 focus:ring-[#b31b1b] focus:border-transparent outline-none"
                placeholder={t('bots.enterBotName')}
              />
            </div>

            {/* Categories (multi-select, up to 3) */}
            <div className="glass rounded-2xl p-6 border border-white/10">
              <label className="block text-sm font-bold text-[#f5f5f5] mb-1 flex items-center">
                <span className="mr-2">📂</span>
                {t('bots.categories')} * <span className="text-xs text-white/40 ml-2">({t('bots.pickUpTo3')})</span>
              </label>
              <p className="text-[10px] text-white/30 mb-3">
                {botData.categories.length}/3 {t('bots.selected')}
              </p>
              <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-1">
                {categories.filter(c => c !== 'All').map(cat => {
                  const selected = botData.categories.includes(cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleCategory(cat)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                        selected
                          ? 'bg-[#b31b1b]/80 border-[#b31b1b] text-white'
                          : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white/80'
                      } ${!selected && botData.categories.length >= 3 ? 'opacity-40 cursor-not-allowed' : ''}`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Telegram Link */}
            <div className="glass rounded-2xl p-6 border border-white/10">
              <label className="block text-sm font-bold text-[#f5f5f5] mb-3 flex items-center">
                <span className="mr-2">📱</span>
                {t('bots.telegramLink')} *
              </label>
              <input
                type="url"
                value={botData.telegramLink}
                onChange={(e) => setBotData({ ...botData, telegramLink: e.target.value })}
                className="w-full p-4 border border-white/20 rounded-xl bg-white/5 text-[#f5f5f5] placeholder:text-gray-500 focus:ring-2 focus:ring-[#b31b1b] focus:border-transparent outline-none"
                placeholder="https://t.me/yourbot"
              />
            </div>

            {/* Description */}
            <div className="glass rounded-2xl p-6 border border-white/10">
              <label className="block text-sm font-bold text-[#f5f5f5] mb-3 flex items-center">
                <span className="mr-2">📝</span>
                {t('bots.description')} * ({t('bots.minChars')})
              </label>
              <textarea
                value={botData.description}
                onChange={(e) => setBotData({ ...botData, description: e.target.value })}
                className="w-full p-4 border border-white/20 rounded-xl bg-white/5 text-[#f5f5f5] placeholder:text-gray-500 focus:ring-2 focus:ring-[#b31b1b] focus:border-transparent outline-none resize-none"
                placeholder={t('bots.tellAboutBot')}
                rows={4}
              />
              <p className="text-xs text-gray-500 mt-2">{botData.description.length}/30 {t('bots.characters')}</p>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <motion.button
                onClick={handleSubmit}
                disabled={isSubmitting}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white font-bold py-4 px-6 rounded-xl hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 transition-all text-lg disabled:opacity-50 disabled:cursor-not-allowed hover-glow"
              >
                {isSubmitting ? '⏳ ' + t('bots.submitting') : '✨ ' + t('bots.createBot') + ' ✨'}
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

