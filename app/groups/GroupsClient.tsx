'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import axios from 'axios';
import dynamic from 'next/dynamic';
import Navbar from '@/components/Navbar';
import HeaderBanner from '@/components/HeaderBanner';
import { filterOptions, filterCategories } from './constants';
import { Group, FeedCampaign, StoryCategory } from './types';
import GroupCard from './GroupCard';
import AdvertCard from './AdvertCard';
import VirtualizedGroupGrid from './VirtualizedGroupGrid';
import GroupCardSkeleton from './GroupCardSkeleton';
import StoryBar from './StoryBar';
import { useTranslation, useLocalePath, useLocale } from '@/lib/i18n';
// Lazy load modals to reduce initial bundle size
const ReviewModal = dynamic(() => import('./ReviewModal'), {
  loading: () => <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50"><div className="text-white">Loading...</div></div>
});

const ReportModal = dynamic(() => import('./ReportModal'), {
  loading: () => <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50"><div className="text-white">Loading...</div></div>
});

const AddGroupModal = dynamic(() => import('./AddGroupModal'), {
  loading: () => <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50"><div className="text-white">Loading...</div></div>
});

const StoryViewer = dynamic(() => import('./StoryViewer'), { ssr: false });

interface VaultTeaserItem {
  _id: string;
  name: string;
  image: string;
  category: string;
  country: string;
  memberCount: number;
  vaultCategories?: string[];
}

function VaultTeaserCard({ items, isLoggedIn = false }: { items: VaultTeaserItem[]; isLoggedIn?: boolean }) {
  const lp = useLocalePath();
  const [imgIdx, setImgIdx] = useState(0);
  const cardRef = useRef<HTMLAnchorElement>(null);
  const impressionFired = useRef(false);
  const fmtNum = (n: number) => n >= 1_000_000 ? (n/1_000_000).toFixed(1)+'M' : n >= 1_000 ? (n/1_000).toFixed(n>=10_000?0:1)+'K' : '';

  useEffect(() => {
    if (items.length <= 4) return;
    const interval = setInterval(() => {
      setImgIdx(prev => (prev + 4) % items.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [items.length]);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !impressionFired.current) {
        impressionFired.current = true;
        fetch('/api/vault/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'impression' }),
        }).catch(() => {});
      }
    }, { threshold: 0.3 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleClick = () => {
    fetch('/api/vault/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'click' }),
    }).catch(() => {});
  };

  if (!items.length) return null;

  const visible = Array.from({ length: 4 }, (_, i) => items[(imgIdx + i) % items.length]);

  return (
    <Link ref={cardRef} href="/premium" target="_blank" className="block h-full" onClick={handleClick}>
      {/* Serpent LED border: rotating conic-gradient behind the card */}
      <div className="relative h-full rounded-2xl sm:rounded-3xl p-[2px] overflow-hidden" style={{ background: 'transparent' }}>
        <style>{`
          @keyframes vault-led-spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          .vault-led-ring::before {
            content: '';
            position: absolute;
            inset: -60%;
            background: conic-gradient(
              from 0deg,
              transparent 0deg,
              transparent 60deg,
              #ff6a00 80deg,
              #ff9500 90deg,
              #ffffff 100deg,
              #ff9500 110deg,
              #ff6a00 120deg,
              transparent 140deg,
              transparent 360deg
            );
            animation: vault-led-spin 5s linear infinite;
            border-radius: inherit;
          }
        `}</style>
        <div className="vault-led-ring absolute inset-0 rounded-2xl sm:rounded-3xl overflow-hidden pointer-events-none" />
        <div className="relative glass rounded-2xl sm:rounded-3xl overflow-hidden h-full flex flex-col hover:shadow-2xl hover:shadow-orange-500/30 transition-all duration-500 group" style={{ background: '#0a0a0a' }}>
          {/* 2x2 mosaic — flex-[7] takes ~70% of card height */}
          <div className="relative flex-[7] min-h-0 overflow-hidden">
            <div className="grid grid-cols-2 grid-rows-2 w-full h-full gap-[2px] p-[2px]">
              {visible.map((g, i) => {
                const cats = g.vaultCategories && g.vaultCategories.length > 0 ? g.vaultCategories : [g.category];
                const topCat = cats[0] || '';
                return (
                  <div key={`${g._id}-${i}`} className="relative rounded-md sm:rounded-lg overflow-hidden transition-all duration-1000 border border-orange-500/60">
                    <img
                      src={g.image || '/assets/placeholder-no-image.png'}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={e => { (e.target as HTMLImageElement).src = '/assets/placeholder-no-image.png'; }}
                    />
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 20%, rgba(0,0,0,0.85) 100%)' }} />
                    <div className="absolute bottom-0 left-0 right-0 p-1 sm:p-1.5">
                      <p className="text-[8px] sm:text-[10px] font-bold text-white truncate leading-tight">
                        {(g.name || '').slice(0, 6)}<span style={{ display: 'inline-block', width: '3.5em', height: '0.75em', background: 'rgba(255,255,255,0.9)', borderRadius: '3px', verticalAlign: 'middle', marginLeft: '2px', filter: 'blur(2px)', userSelect: 'none' as const }} />
                      </p>
                      <div className="flex items-center gap-0.5">
                        {g.memberCount ? <span className="text-[8px] sm:text-[10px] font-black text-orange-400 leading-none">{fmtNum(g.memberCount)}</span> : null}
                        {topCat && <span className="text-[7px] sm:text-[8px] font-bold text-white/40 leading-none truncate">· {topCat}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom ~30% — compact title + CTA */}
          <div className="flex-[3] p-2 sm:p-3 flex flex-col justify-center relative" style={{ background: 'linear-gradient(180deg, #1a0f00, #0a0a0a)' }}>
            <h3 className="text-xs sm:text-sm font-black text-white mb-1 sm:mb-1.5 leading-tight group-hover:text-orange-400 transition-colors">🔒 Premium Vault</h3>
            <p className="text-orange-300 text-[10px] sm:text-xs font-bold mb-1.5 sm:mb-2 leading-snug uppercase tracking-wide">Unlock instantly thousands of hand-picked groups</p>
            <div className="group/btn relative flex items-center justify-center w-full overflow-hidden rounded-lg sm:rounded-xl py-1.5 sm:py-2.5 px-2 sm:px-3 font-black text-white shadow-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] bg-gradient-to-r from-orange-500 to-red-600 hover:shadow-orange-500/40">
              <div className="absolute inset-0 bg-white/20 opacity-0 transition-opacity duration-300 group-hover/btn:opacity-100" />
              <span className="relative flex items-center justify-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs uppercase tracking-wider font-black">
                <span className="text-sm sm:text-base">🔓</span> Unlock The Vault
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

interface GroupsClientProps {
  initialGroups: Group[];
  feedCampaigns?: FeedCampaign[];
  initialCountry?: string;
  initialIsMobile?: boolean;
  initialIsTelegram?: boolean;
  topBannerCampaigns?: Array<{ _id: string; creative: string; destinationUrl: string }>;
  storyData?: StoryCategory[];
  vaultTeaser?: VaultTeaserItem[];
  vaultCatOrder?: string[];
}

export default function GroupsClient({ initialGroups, feedCampaigns = [], initialCountry, initialIsMobile = false, initialIsTelegram = false, topBannerCampaigns = [], storyData = [], vaultTeaser = [], vaultCatOrder = [] }: GroupsClientProps) {
  const STORY_SEEN_KEY = 'erogram:stories:seen:v1';
  const [username, setUsername] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState(initialCountry || 'All');
  const [selectedSubcategory, setSelectedSubcategory] = useState('All');
  const [selectedSort, setSelectedSort] = useState('random');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showAddGroupModal, setShowAddGroupModal] = useState(false);
  const [isStoryOpen, setIsStoryOpen] = useState(false);
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const [seenStoryMap, setSeenStoryMap] = useState<Record<string, string>>({});
  const { t } = useTranslation();
  const lp = useLocalePath();
  const { locale } = useLocale();

  const markStoryCategorySeen = (slug?: string) => {
    if (!slug || typeof window === 'undefined') return;
    setSeenStoryMap((prev) => {
      const next = { ...prev, [slug]: new Date().toISOString() };
      localStorage.setItem(STORY_SEEN_KEY, JSON.stringify(next));
      return next;
    });
  };

  const handleOpenStory = (categoryIndex: number) => {
    markStoryCategorySeen(storyData[categoryIndex]?.slug);
    setActiveStoryIndex(categoryIndex);
    setIsStoryOpen(true);
  };

  // Split real groups vs DB-backed advert-groups (isAdvertisement=true)
  const initialAdvertGroups = initialGroups.filter(g => g.isAdvertisement);
  const initialRealGroups = initialGroups.filter(g => !g.isAdvertisement);

  // Shuffle DB adverts (Group-based adverts) on every client mount
  const shuffleArray = <T,>(arr: T[]) => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  const [regularGroups, setRegularGroups] = useState<Group[]>(initialRealGroups);
  const [skip, setSkip] = useState(initialRealGroups.length);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [groupsLoadError, setGroupsLoadError] = useState(false);

  const [topGroups, setTopGroups] = useState<Group[]>([]);
  const [topGroupsLoading, setTopGroupsLoading] = useState(true);
  const [featuredGroups, setFeaturedGroups] = useState<Group[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [boostedGroup, setBoostedGroup] = useState<Group | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedGroupForReview, setSelectedGroupForReview] = useState<Group | null>(null);
  const [groupReviews, setGroupReviews] = useState<any[]>([]);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedGroupForReport, setSelectedGroupForReport] = useState<Group | null>(null);
  // Initialize device detection from server props to prevent hydration mismatches
  const [isMobile, setIsMobile] = useState(initialIsMobile);
  const [isTelegram, setIsTelegram] = useState(initialIsTelegram);
  const lastVisibleIndexRef = useRef(-1);





  useEffect(() => {
    setTopGroupsLoading(true);
    setFeaturedLoading(true);

    fetch(`/api/groups?boosted=true&locale=${locale}`)
      .then(res => res.json())
      .then(data => {
        const boosted = data.groups?.[0] || null;
        setBoostedGroup(boosted);
        return fetch(`/api/groups?topGroup=true&limit=4&locale=${locale}`);
      })
      .then(res => res.json())
      .then(data => { if (data.groups) setTopGroups(data.groups); })
      .catch(err => console.error('Failed to fetch top groups:', err))
      .finally(() => setTopGroupsLoading(false));

    fetch(`/api/groups?featured=true&limit=8&locale=${locale}`)
      .then(res => res.json())
      .then(data => { if (data.groups) setFeaturedGroups(data.groups); })
      .catch(err => console.error('Failed to fetch featured groups:', err))
      .finally(() => setFeaturedLoading(false));
  }, []);

  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Get username from localStorage on mount
    if (typeof window !== 'undefined') {
      const storedUsername = localStorage.getItem('username');
      if (storedUsername) {
        setUsername(storedUsername);
      }
      const token = localStorage.getItem('token');
      if (token) setIsLoggedIn(true);

      // Only update device detection if we don't have server-side values
      if (!initialIsMobile) {
        const checkMobile = () => {
          setIsMobile(window.innerWidth < 768);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
      }

      if (!initialIsTelegram) {
        const checkTelegram = () => {
          const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera || '';
          setIsTelegram(/Telegram/i.test(userAgent));
        };
        checkTelegram();
      }
    }
  }, [initialIsMobile, initialIsTelegram]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORY_SEEN_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const cleaned = Object.fromEntries(
          Object.entries(parsed).filter(
            ([key, value]) => typeof key === 'string' && typeof value === 'string'
          )
        );
        setSeenStoryMap(cleaned as Record<string, string>);
      }
    } catch {
      // Ignore malformed localStorage content and keep defaults
    }
  }, []);

  




  // Handle opening review modal
  const openReviewModal = async (group: Group) => {
    setSelectedGroupForReview(group);
    setShowReviewModal(true);

    // Fetch reviews for this group
    try {
      const response = await axios.get(`/api/groups/${group._id}/reviews`);
      setGroupReviews(response.data);
    } catch (error) {
      console.error('Error fetching group reviews:', error);
      setGroupReviews([]);
    }
  };

  // Handle opening report modal
  const openReportModal = (group: Group) => {
    setSelectedGroupForReport(group);
    setShowReportModal(true);
  };

  // Handle submitting a review
  const handleSubmitReview = async (reviewData: { rating: number; content: string; authorName: string }) => {
    if (!selectedGroupForReview) return;

    try {
      await axios.post(`/api/groups/${selectedGroupForReview._id}/reviews`, {
        content: reviewData.content,
        rating: reviewData.rating,
        authorName: reviewData.authorName
      });
      setShowReviewModal(false);
      setSelectedGroupForReview(null);
      // Optionally refresh the page or show success message
      alert(t('groups.reviewSuccess'));
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to submit review');
    }
  };

  // Client-side randomization to avoid deterministic ordering from SSR/cache
  const shuffle = <T,>(arr: T[]) => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  // FULL randomization: ignore server order entirely

  // Build placements map from campaign positions (exact positions from DB)
  // feedCampaigns array is passed directly to VirtualizedGroupGrid (random placement is client-side)

  // Debounce search input
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
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const isRestoredRef = useRef(false);
  const isFirstLoad = useRef(true);

  // Restore state from sessionStorage on mount
  useEffect(() => {
    try {
      const savedState = sessionStorage.getItem('erogram_groups_state_v5');
      if (savedState) {
        const { groups, skip: savedSkip, hasMore: savedHasMore, scrollY, filters, timestamp } = JSON.parse(savedState);

        // Check if cache is expired (1 hour)
        const now = Date.now();
        if (timestamp && (now - timestamp > 60 * 60 * 1000)) {
          sessionStorage.removeItem('erogram_groups_state_v5');
          return;
        }

        const currentFilters = {
          category: selectedCategory,
          sort: selectedSort,
          search: searchQuery
        };

        // Only restore if filters match
        if (JSON.stringify(currentFilters) === JSON.stringify(filters)) {
          setRegularGroups(groups);
          setSkip(savedSkip);
          setHasMore(savedHasMore);
          isRestoredRef.current = true;
          isFirstLoad.current = false; // Mark as loaded if restored

          // Restore scroll position after a brief delay to allow rendering
          setTimeout(() => {
            window.scrollTo(0, scrollY);
          }, 100);
        }
      }
    } catch (e) {
      console.error('Failed to restore state:', e);
    }
  }, []);

  // Save state to sessionStorage
  useEffect(() => {
    const saveState = () => {
      const state = {
        groups: regularGroups,
        skip,
        hasMore,
        scrollY: window.scrollY,
        filters: {
          category: selectedCategory,
          sort: selectedSort,
          search: searchQuery
        },
        timestamp: Date.now()
      };
      sessionStorage.setItem('erogram_groups_state_v5', JSON.stringify(state));
    };

    // Save on unmount
    return () => saveState();
  }, [regularGroups, skip, hasMore, selectedCategory, selectedSort, searchQuery]);

  // Save scroll position periodically while scrolling
  useEffect(() => {
    const handleScrollSave = () => {
      const savedState = sessionStorage.getItem('erogram_groups_state_v5');
      if (savedState) {
        const state = JSON.parse(savedState);
        state.scrollY = window.scrollY;
        sessionStorage.setItem('erogram_groups_state_v5', JSON.stringify(state));
      }
    };

    // Throttle scroll save
    let timeoutId: NodeJS.Timeout;
    const throttledScroll = () => {
      if (timeoutId) return;
      timeoutId = setTimeout(() => {
        handleScrollSave();
        timeoutId = undefined as any;
      }, 500);
    };

    window.addEventListener('scroll', throttledScroll);
    return () => window.removeEventListener('scroll', throttledScroll);
  }, []);

  // Refetch groups when sort, search, category, or country changes
  useEffect(() => {
    // Skip fetch if we just restored state
    if (isRestoredRef.current) {
      isRestoredRef.current = false;
      return;
    }

    const fetchGroups = async () => {
      // Skip initial fetch if filters match defaults (SSR data is already present)
      if (
        isFirstLoad.current &&
        selectedSort === 'random' &&
        !debouncedSearchQuery &&
        selectedCategory === (initialCountry || 'All') &&
        selectedSubcategory === 'All' &&
        regularGroups.length > 0
      ) {
        isFirstLoad.current = false;
        return;
      }
      isFirstLoad.current = false;

      setLoading(true);
      setGroupsLoadError(false);
      try {
        const searchParam = debouncedSearchQuery ? `&search=${encodeURIComponent(debouncedSearchQuery)}` : '';
        const categoryParam = selectedCategory !== 'All' ? `&category=${encodeURIComponent(selectedCategory)}` : '';
        const subcategoryParam = selectedSubcategory !== 'All' ? `&subcategory=${encodeURIComponent(selectedSubcategory)}` : '';
        const response = await fetch(`/api/groups?skip=0&limit=12&sortBy=${selectedSort}${searchParam}${categoryParam}${subcategoryParam}&locale=${locale}`, { cache: 'no-store' });
        const data = await response.json();
        if (!response.ok || !Array.isArray(data.groups)) {
          setGroupsLoadError(true);
          setRegularGroups([]);
          setSkip(0);
          setHasMore(false);
          return;
        }
        if (data.groups && data.groups.length > 0) {
          setRegularGroups(data.groups);
          setSkip(data.groups.length);
          setHasMore(data.hasMore ?? false);
        } else {
          setRegularGroups([]);
          setSkip(0);
          setHasMore(false);
        }
      } catch (error) {
        console.error('Error fetching groups:', error);
        setGroupsLoadError(true);
        setRegularGroups([]);
        setSkip(0);
        setHasMore(false);
      } finally {
        setLoading(false);
      }
    };

    fetchGroups();
    lastVisibleIndexRef.current = -1;
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
        fetch(`/api/groups?skip=${skip}&limit=12&sortBy=${selectedSort}${searchParam}${categoryParam}${subcategoryParam}&locale=${locale}`)
          .then(res => res.json())
          .then(data => {
            if (data.groups && data.groups.length > 0) {
              setRegularGroups(prev => {
                const existingIds = new Set(prev.map(g => g._id));
                const newGroups = data.groups.filter((g: Group) => !existingIds.has(g._id));
                return [...prev, ...newGroups];
              });
              setSkip(prev => prev + data.groups.length);
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

  const displayGroups = useMemo(() => {
    return regularGroups;
  }, [regularGroups]);

  const filterValue = selectedCategory;

  const handleFilterChange = (value: string) => {
    setSelectedCategory(value || 'All');
  };

  // Split feed campaigns by tier:
  // Tier 1 → Top Groups section (position 2)
  // Tier 2+3 → main grid (positions 3 and 8, then looping)
  const tier1Campaign = useMemo(() => {
    return feedCampaigns.find(c => c.tierSlot === 1) ?? null;
  }, [feedCampaigns]);

  const gridCampaigns = useMemo(() => {
    return feedCampaigns.filter(c => c.tierSlot !== 1);
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
        />
      </div>

      {/* Navigation */}
      <Navbar
        username={username}
        setUsername={setUsername}
        showAddGroup={true}
        onAddGroupClick={() => setShowAddGroupModal(true)}
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
              {showFilters ? t('groups.hideFilters') : t('groups.showFilters')}
            </button>
          </div>

          {/* Sidebar Filters */}
          <aside className={`${showFilters ? 'block' : 'hidden'} lg:block lg:w-1/4 min-w-0 shrink-0`} suppressHydrationWarning>
            <div className="glass rounded-2xl p-6 backdrop-blur-lg border border-white/10">
              {/* Header */}
              <div className="text-center mb-8">
                <h2 className="text-2xl font-black text-[#f5f5f5] mb-2">🔍 {t('groups.filters')}</h2>
                <p className="text-[#999] text-sm">{t('groups.findPerfect')}</p>
              </div>

              {/* Category */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-[#f5f5f5] mb-3 flex items-center">
                  <span className="mr-2" suppressHydrationWarning>📂</span>
                  {t('common.category')}
                </label>
                <select
                  value={filterValue}
                  onChange={(e) => handleFilterChange(e.target.value)}
                  className="w-full p-4 border border-white/20 rounded-xl bg-white/5 text-[#f5f5f5] focus:ring-2 focus:ring-[#b31b1b] focus:border-transparent outline-none transition-all"
                >
                  <option value="All" className="bg-[#222]">All</option>
                  {filterOptions.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-[#222]">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subcategory */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-[#f5f5f5] mb-3 flex items-center">
                  <span className="mr-2" suppressHydrationWarning>🏷️</span>
                  {t('common.subcategory')}
                </label>
                <select
                  value={selectedSubcategory}
                  onChange={(e) => setSelectedSubcategory(e.target.value)}
                  className="w-full p-4 border border-white/20 rounded-xl bg-white/5 text-[#f5f5f5] focus:ring-2 focus:ring-[#b31b1b] focus:border-transparent outline-none transition-all"
                >
                  <option value="All" className="bg-[#222]">All</option>
                  {filterOptions.map((opt) => (
                    <option key={`sub-${opt.value}`} value={opt.value} className="bg-[#222]">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Search */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-[#f5f5f5] mb-3 flex items-center">
                  <span className="mr-2" suppressHydrationWarning>🔍</span>
                  {t('groups.searchGroups')}
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('groups.searchByName')}
                  className="w-full p-4 border border-white/20 rounded-xl bg-white/5 text-[#f5f5f5] placeholder:text-gray-500 focus:ring-2 focus:ring-[#b31b1b] focus:border-transparent outline-none transition-all"
                />
              </div>

              {/* Filter Actions */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    setShowFilters(false);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="w-full px-4 py-3 bg-[#b31b1b] hover:bg-[#c42b2b] text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <span className="text-lg">🔍</span>
                  {filterValue !== 'All' || selectedSubcategory !== 'All' || searchQuery
                    ? t('groups.applyFilters')
                    : t('groups.showResults')}
                </button>

                {(filterValue !== 'All' || selectedSubcategory !== 'All' || searchQuery) && (
                  <button
                    onClick={() => {
                      handleFilterChange('All');
                      setSelectedSubcategory('All');
                      setSearchQuery('');
                    }}
                    className="w-full px-4 py-3 bg-white/5 hover:bg-white/10 text-[#999] hover:text-white rounded-xl font-bold transition-colors border border-white/10"
                  >
                    {t('groups.resetFilters')}
                  </button>
                )}
              </div>

            </div>
          </aside>

          <div className="lg:w-3/4 min-w-0 shrink-0">
            <div className="relative">
              {/* Story circles (replaces old Popular Categories) */}
              <StoryBar
                storyData={storyData}
                seenStoryMap={seenStoryMap}
                onOpenStory={handleOpenStory}
              />

              {/* Top Groups — boosted group takes Spot 1 when active */}
              {(topGroups.length > 0 || topGroupsLoading) && (
                <div className="mb-10 relative rounded-3xl p-[2px]" style={{ background: 'linear-gradient(135deg, #f59e0b, #ea580c, #dc2626, #ea580c, #f59e0b)' }}>
                  <div className="rounded-[22px] bg-[#111111] relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-900/20 via-orange-900/10 to-red-900/10" />
                    <div className="relative p-4 sm:p-6">
                      <div className="text-center mb-4 sm:mb-6">
                        <h2 className="text-2xl sm:text-3xl font-black text-[#f5f5f5] drop-shadow-2xl">
                          🏆 {t('groups.topGroups')}
                        </h2>
                        <p className="text-amber-300/60 text-sm mt-1 font-medium">{t('groups.topGroupsDesc')}</p>
                      </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                      {topGroupsLoading ? (
                        Array.from({ length: 4 }, (_, i) => (
                          <GroupCardSkeleton key={`top-skeleton-${i}`} />
                        ))
                      ) : (() => {
                        const organicGroups = boostedGroup
                          ? topGroups.filter(g => g._id !== boostedGroup._id).slice(0, 3)
                          : topGroups.slice(0, 4);
                        const finalGroups = boostedGroup
                          ? [boostedGroup, ...organicGroups].slice(0, 4)
                          : organicGroups;

                        return (
                          <>
                            {finalGroups[0] && (
                              <GroupCard
                                key={`top-${finalGroups[0]._id}`}
                                group={finalGroups[0]}
                                isIndex={0}
                                isFeatured
                                onOpenReviewModal={openReviewModal}
                                onOpenReportModal={openReportModal}
                              />
                            )}
                            {tier1Campaign && !isTelegram ? (
                              <AdvertCard
                                key={`tier1-${tier1Campaign._id}`}
                                campaign={tier1Campaign}
                                isIndex={1}
                                shouldPreload={true}
                                onVisible={undefined}
                              />
                            ) : finalGroups[1] ? (
                              <GroupCard
                                key={`top-${finalGroups[1]._id}`}
                                group={finalGroups[1]}
                                isIndex={1}
                                isFeatured
                                onOpenReviewModal={openReviewModal}
                                onOpenReportModal={openReportModal}
                              />
                            ) : null}
                            {(tier1Campaign && !isTelegram ? finalGroups.slice(1, 3) : finalGroups.slice(2, 4)).map((g, i) => (
                              <GroupCard
                                key={`top-${g._id}`}
                                group={g}
                                isIndex={i + 2}
                                isFeatured
                                onOpenReviewModal={openReviewModal}
                                onOpenReportModal={openReportModal}
                              />
                            ))}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
                </div>
              )}

              {/* Featured Groups — below Top Groups (only render when there are featured groups) */}
              {featuredGroups.length > 0 && (
                <div className="mb-10 relative rounded-3xl p-[2px]" style={{ background: 'linear-gradient(135deg, #a855f7, #7c3aed, #6d28d9, #7c3aed, #a855f7)' }}>
                  <div className="rounded-[22px] bg-[#111111] relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-violet-900/10 to-purple-900/10" />
                    <div className="relative p-4 sm:p-6">
                      <div className="text-center mb-4 sm:mb-6">
                        <h2 className="text-2xl sm:text-3xl font-black text-[#f5f5f5] drop-shadow-2xl">
                          ⭐ Featured Groups
                        </h2>
                        <p className="text-purple-300/60 text-sm mt-1 font-medium">Hand-picked for you</p>
                      </div>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                        {featuredGroups.map((g, i) => (
                          <GroupCard
                            key={`feat-${g._id}`}
                            group={g}
                            isIndex={i}
                            isFeatured
                            onOpenReviewModal={openReviewModal}
                            onOpenReportModal={openReportModal}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="text-center mb-6">
                <h1 className="text-2xl md:text-3xl font-black text-[#f5f5f5]">
                  {t('groups.title')}
                </h1>
              </div>

              <div className="relative">
                {displayGroups.length === 0 && (
                  <div className="text-center py-20">
                    <div className="text-6xl mb-4">😔</div>
                    <p className="text-[#999] text-xl">
                      {groupsLoadError
                        ? t('groups.dbError')
                        : t('groups.noGroupsFound')}
                    </p>
                  </div>
                )}
                <VirtualizedGroupGrid
                  groups={displayGroups}
                  feedCampaigns={gridCampaigns}
                  isTelegram={isTelegram}
                  onOpenReviewModal={openReviewModal}
                  onOpenReportModal={openReportModal}
                  vaultItems={vaultTeaser.length > 0 ? vaultTeaser : undefined}
                  isLoggedIn={isLoggedIn}
                  VaultCard={vaultTeaser.length > 0 ? VaultTeaserCard : undefined}
                />
              </div>

              {loading && (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 mt-6">
                  {Array.from({ length: 6 }, (_, i) => (
                    <GroupCardSkeleton key={`skeleton-${i}`} />
                  ))}
                </div>
              )}
            </div>


          </div>
        </div>
      </main>


      {/* Review Modal */}
      {showReviewModal && selectedGroupForReview && (
        <ReviewModal
          group={selectedGroupForReview}
          reviews={groupReviews}
          onClose={() => {
            setShowReviewModal(false);
            setSelectedGroupForReview(null);
            setGroupReviews([]);
          }}
          onSubmitReview={handleSubmitReview}
        />
      )}

      {/* Report Modal */}
      {showReportModal && selectedGroupForReport && (
        <ReportModal
          group={selectedGroupForReport}
          onClose={() => {
            setShowReportModal(false);
            setSelectedGroupForReport(null);
          }}
        />
      )}

      {/* Add Group Modal */}
      {showAddGroupModal && (
        <AddGroupModal
          categories={filterCategories}
          onClose={() => setShowAddGroupModal(false)}
          onSuccess={() => {
            setShowAddGroupModal(false);
            // Optionally refresh groups if needed
            window.location.reload();
          }}
        />
      )}

      {/* Story Viewer (fullscreen portal overlay) */}
      {isStoryOpen && storyData.length > 0 && (
        <StoryViewer
          storyData={storyData}
          initialCategoryIndex={activeStoryIndex}
          onCategorySeen={markStoryCategorySeen}
          onClose={() => setIsStoryOpen(false)}
        />
      )}
    </div>
  );
}
