'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import axios from 'axios';
import dynamic from 'next/dynamic';
import Navbar from '@/components/Navbar';
import HeaderBanner from '@/components/HeaderBanner';
import { Group, FeedCampaign, StoryCategory } from './types';
import GroupCard from './GroupCard';
import AdvertCard from './AdvertCard';
import VirtualizedGroupGrid from './VirtualizedGroupGrid';
import { checkBookmarks } from '@/lib/actions/publicData';
import GroupCardSkeleton from './GroupCardSkeleton';
import { filterCategories } from './constants';
import type { VaultTeaserItem } from './VaultTeaserFeed';
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

interface GroupsClientProps {
  initialGroups: Group[];
  feedCampaigns?: FeedCampaign[];
  initialCountry?: string;
  initialIsMobile?: boolean;
  initialIsTelegram?: boolean;
  topBannerCampaigns?: Array<{ _id: string; creative: string; destinationUrl: string }>;
  storyData?: StoryCategory[];
  vaultTeaserGroups?: VaultTeaserItem[];
  trendingCategories?: Array<{ label: string; href: string }>;
  trendingCountries?: Array<{ label: string; href: string }>;
  categoryOptions?: string[];
  countryOptions?: string[];
}

export default function GroupsClient({ initialGroups, feedCampaigns = [], initialCountry, initialIsMobile = false, initialIsTelegram = false, topBannerCampaigns = [], storyData = [], vaultTeaserGroups = [], trendingCategories = [], trendingCountries = [], categoryOptions = [], countryOptions = [] }: GroupsClientProps) {
  const TOP_SLOT_GROWTH: number[] = [14.2, 11.8, 9.6, 12.9];
  const STORY_SEEN_KEY = 'erogram:stories:seen:v1';
  const [username, setUsername] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState(initialCountry || 'All');
  const [selectedCountry, setSelectedCountry] = useState('All');
  const [selectedSort, setSelectedSort] = useState('random');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchExpanded, setSearchExpanded] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
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
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedGroupForReview, setSelectedGroupForReview] = useState<Group | null>(null);
  const [groupReviews, setGroupReviews] = useState<any[]>([]);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedGroupForReport, setSelectedGroupForReport] = useState<Group | null>(null);
  const [bookmarkedMap, setBookmarkedMap] = useState<Record<string, string>>({});
  // Initialize device detection from server props to prevent hydration mismatches
  const [isMobile, setIsMobile] = useState(initialIsMobile);
  const [isTelegram, setIsTelegram] = useState(initialIsTelegram);
  const lastVisibleIndexRef = useRef(-1);





  useEffect(() => {
    setTopGroupsLoading(true);

    fetch(`/api/groups?topGroup=true&limit=4&locale=${locale}`)
      .then(r => r.json())
      .then(data => { if (data.groups) setTopGroups(data.groups); })
      .catch(err => console.error('Failed to fetch top groups:', err))
      .finally(() => setTopGroupsLoading(false));

  }, []);

  const allGroupIds = useMemo(() => {
    const ids = new Set<string>();
    regularGroups.forEach(g => ids.add(g._id));
    topGroups.forEach(g => ids.add(g._id));
    return Array.from(ids);
  }, [regularGroups, topGroups]);

  useEffect(() => {
    if (typeof window === 'undefined' || allGroupIds.length === 0) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    const uncheckedIds = allGroupIds.filter(id => !(id in bookmarkedMap));
    if (uncheckedIds.length === 0) return;

    checkBookmarks(token, uncheckedIds)
      .then(data => {
        if (data.bookmarked) {
          setBookmarkedMap(prev => ({ ...prev, ...data.bookmarked }));
        }
      })
      .catch(() => {});
  }, [allGroupIds]);

  useEffect(() => {
    // Get username from localStorage on mount
    if (typeof window !== 'undefined') {
      const storedUsername = localStorage.getItem('username');
      if (storedUsername) {
        setUsername(storedUsername);
      }

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
        selectedCountry === 'All' &&
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
        const countryParam = selectedCountry !== 'All' ? `&country=${encodeURIComponent(selectedCountry)}` : '';
        const response = await fetch(`/api/groups?skip=0&limit=12&sortBy=${selectedSort}${searchParam}${categoryParam}${countryParam}&locale=${locale}`, { cache: 'no-store' });
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
  }, [selectedSort, debouncedSearchQuery, selectedCategory, selectedCountry]);

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
        const countryParam = selectedCountry !== 'All' ? `&country=${encodeURIComponent(selectedCountry)}` : '';
        const excludeParam = selectedSort === 'random' && regularGroups.length > 0
          ? `&exclude=${encodeURIComponent(regularGroups.map(g => g._id).join(','))}`
          : '';
        const skipParam = selectedSort === 'random' ? 0 : skip;
        fetch(`/api/groups?skip=${skipParam}&limit=12&sortBy=${selectedSort}${searchParam}${categoryParam}${countryParam}${excludeParam}&locale=${locale}`)
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
  }, [skip, loading, hasMore, selectedSort, debouncedSearchQuery, selectedCategory, selectedCountry, regularGroups]);

  const displayGroups = useMemo(() => {
    return regularGroups;
  }, [regularGroups]);

  // Top Groups versatile slots (brain: versatile-slots node):
  //   Spot 1 → MIXED (any adType: OF creator, AI NSFW, affiliate, group/bot…). Tier 6 preferred.
  //   Spot 2 → MIXED (any adType). Tier 1 preferred, else any leftover campaign.
  //   Spot 4 → MIXED (any adType). Tier 5 preferred, else any leftover campaign.
  //   Spot 3 → organic random group (handled in render).
  //   Tier 2/3/4 → main grid (positions after 2, 8, 12 groups).

  // ── Top Groups spot allocation — AGNOSTIC ROTATING AD NETWORK ──
  // BRAIN LAW (versatile-slots / ad-vision): whatever I assign to a Top Groups spot SHOWS in
  // that spot and ROTATES with every other ad assigned to the same spot. Boosted ads get MORE
  // visibility (weighted), not exclusivity. Same rule for spots 1/2/3/4. The named placements
  // top-groups-1..4 map to tierSlots 6/1/11/5 server-side — that's just internal plumbing.
  const SPOT_TIERSLOT: Record<number, number> = { 0: 6, 1: 1, 2: 11, 3: 5 };

  const topSpotCampaigns = useMemo(() => {
    const picks: Record<number, FeedCampaign | null> = { 0: null, 1: null, 2: null, 3: null };
    // An ad assigned to several spots must appear in only ONE at a time — never the same ad
    // duplicated across spots simultaneously. We track ad ids already placed and exclude them.
    const usedIds = new Set<string>();

    // Weighted rotation: a boosted ad gets several entries in the draw so it appears more often,
    // but non-boosted ads assigned to the same spot still rotate in. Per page load.
    const pickForSlot = (tierSlot: number): FeedCampaign | null => {
      const pool = feedCampaigns.filter((c) => c.tierSlot === tierSlot && !usedIds.has(c._id));
      if (pool.length === 0) return null;
      const draw: FeedCampaign[] = [];
      for (const c of pool) {
        const weight = c.priority === 'boost' ? 3 : 1;
        for (let i = 0; i < weight; i++) draw.push(c);
      }
      return draw[Math.floor(Math.random() * draw.length)];
    };

    for (let spot = 0; spot < 4; spot++) {
      const pick = pickForSlot(SPOT_TIERSLOT[spot]);
      if (pick) {
        picks[spot] = pick;
        usedIds.add(pick._id);
      }
    }
    return picks;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedCampaigns]);

  const gridCampaigns = useMemo(() => {
    // Exclude only the exact slot ROWS consumed by Top Groups, not every row sharing that _id.
    // A multi-placement ad assigned to BOTH Top Groups and in-feed (tier 2/3/4) keeps its
    // in-feed copies so it still renders down the feed. We match _id + tierSlot of the picks.
    const usedKeys = new Set(
      Object.values(topSpotCampaigns)
        .filter(Boolean)
        .map((c) => `${c!._id}-${c!.tierSlot}`),
    );
    return feedCampaigns.filter(c => !usedKeys.has(`${c._id}-${c.tierSlot}`));
  }, [feedCampaigns, topSpotCampaigns]);

  return (
    <div className="min-h-screen bg-[#0d1117]">
      <style>{`
        @keyframes vault-led-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#ff5e2a] rounded-full blur-3xl opacity-10"
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
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#ff9432] rounded-full blur-3xl opacity-10"
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
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 xl:px-16 pt-20 sm:pt-24 pb-8 min-h-screen">
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
            {t('groups.title')}
          </h1>
          <p className="text-white/50 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            {t('groups.heroSubtitle', 'Browse and join the best Adult and Porn Telegram groups, curated, verified and updated daily.')}
          </p>
        </motion.div>

        {/* Filter bar — one sleek unified pill: search + filters + live stat, single line */}
        <div className="mb-6 sm:mb-8 flex justify-center">
          <div className="flex items-center gap-1.5 sm:gap-2 w-full max-w-3xl rounded-full border border-white/10 bg-white/[0.03] backdrop-blur-sm p-1.5 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.6)]">
            {/* Category */}
            <div className="relative shrink-0">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value || 'All')}
                aria-label={t('common.category')}
                className="pl-2.5 pr-6 py-2 rounded-full bg-transparent hover:bg-white/[0.06] text-white text-[11px] font-bold focus:outline-none transition-colors appearance-none cursor-pointer"
              >
                <option value="All" className="bg-[#131a24]">All Categories</option>
                {categoryOptions.map((c) => (
                  <option key={c} value={c} className="bg-[#131a24]">{c}</option>
                ))}
              </select>
              <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/40 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6"/></svg>
            </div>

            <div className="h-5 w-px bg-white/10 shrink-0" />

            {/* Country */}
            <div className="relative shrink-0">
              <select
                value={selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value || 'All')}
                aria-label={t('common.country')}
                className="pl-2.5 pr-6 py-2 rounded-full bg-transparent hover:bg-white/[0.06] text-white text-[11px] font-bold focus:outline-none transition-colors appearance-none cursor-pointer"
              >
                <option value="All" className="bg-[#131a24]">All Countries</option>
                {countryOptions.map((c) => (
                  <option key={c} value={c} className="bg-[#131a24]">{c}</option>
                ))}
              </select>
              <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/40 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6"/></svg>
            </div>

            <div className="h-5 w-px bg-white/10 shrink-0" />

            {/* Spacer — pushes the stat right while search is collapsed */}
            {!(searchExpanded || searchQuery) && <div className="flex-1" />}

            {/* Search — compact icon that expands on click (top-tier pattern) */}
            <div className={`relative flex items-center ${searchExpanded || searchQuery ? 'flex-1 min-w-0' : 'shrink-0'}`}>
              <button
                type="button"
                onClick={() => { setSearchExpanded(true); setTimeout(() => searchInputRef.current?.focus(), 50); }}
                aria-label={t('groups.searchGroups')}
                className={`flex items-center justify-center w-8 h-8 rounded-full text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors ${searchExpanded || searchQuery ? 'absolute left-0.5 top-1/2 -translate-y-1/2 pointer-events-none' : ''}`}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              </button>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onBlur={() => { if (!searchQuery) setSearchExpanded(false); }}
                placeholder={t('groups.searchGroups')}
                aria-label={t('groups.searchGroups')}
                className={`rounded-full bg-transparent text-white text-sm placeholder:text-white/35 focus:outline-none transition-all duration-300 ${
                  searchExpanded || searchQuery ? 'w-full pl-9 pr-8 py-2 opacity-100' : 'w-0 p-0 opacity-0 pointer-events-none'
                }`}
              />
              {searchQuery && (
                <button onClick={() => { setSearchQuery(''); setSearchExpanded(false); }} aria-label="Clear search" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              )}
            </div>

            <div className="h-5 w-px bg-white/10 shrink-0" />

            {/* Live visiting stat — anchored right */}
            <div className="flex items-center gap-1.5 pl-1 pr-3 shrink-0">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
              <VisitingCount />
            </div>
          </div>
        </div>

        {/* Trending on Erogram — top 6 categories, homogeneous with the filter bar */}
        {trendingCategories.length > 0 && (
          <div className="mb-6 sm:mb-8 flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-white/70 mr-0.5">
              <svg className="w-3.5 h-3.5 text-[#ff7a3d]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
              Trending on Erogram
            </span>
            {trendingCategories.slice(0, 8).map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className="px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.03] text-white/70 text-xs font-bold hover:text-white hover:border-[#ff5e2a]/40 hover:bg-[#ff5e2a]/[0.06] transition-all whitespace-nowrap"
              >
                {label}
              </Link>
            ))}
          </div>
        )}

        {/* Global top banner (below stories) */}
        <div className="w-full mb-4">
          <HeaderBanner campaigns={topBannerCampaigns} />
        </div>

        {/* Explore navigation — mobile only (Neo-brutalism). */}
        <div className="lg:hidden grid grid-cols-3 gap-1.5 mb-3">
          <Link
            href={lp('/bots')}
            className="flex items-center justify-center gap-1 px-1 py-2.5 text-[10px] font-black uppercase tracking-tight rounded-lg whitespace-nowrap transition-all duration-150 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_#fff] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
            style={{ background: '#00AFF0', color: '#ffffff', border: '2px solid #fff', boxShadow: '4px 4px 0 0 #fff' }}
          >
            Telegram Bots
          </Link>
          <Link
            href={lp('/ainsfw')}
            className="flex items-center justify-center gap-1 px-1 py-2.5 text-[10px] font-black uppercase tracking-tight rounded-lg whitespace-nowrap transition-all duration-150 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_#fff] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
            style={{ background: '#00AFF0', color: '#ffffff', border: '2px solid #fff', boxShadow: '4px 4px 0 0 #fff' }}
          >
            AI NSFW
          </Link>
          <Link
            href={lp('/onlyfanssearch')}
            className="flex items-center justify-center gap-1 px-1 py-2.5 text-[10px] font-black uppercase tracking-tight rounded-lg whitespace-nowrap transition-all duration-150 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_#fff] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
            style={{ background: '#ffffff', color: '#0f172a', border: '2px solid #cbd5e1', boxShadow: '4px 4px 0 0 #cbd5e1' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#00AFF0" className="shrink-0">
              <path d="M24 4.003h-4.015c-3.45 0-5.3.197-6.748 1.957a7.996 7.996 0 1 0 2.103 9.211c3.182-.231 5.39-2.134 6.085-5.173c0 0-2.399.585-4.43 0c4.018-.777 6.333-3.037 7.005-5.995M5.61 11.999A2.391 2.391 0 0 1 9.28 9.97a2.966 2.966 0 0 1 2.998-2.528h.008c-.92 1.778-1.407 3.352-1.998 5.263A2.392 2.392 0 0 1 5.61 12Zm2.386-7.996a7.996 7.996 0 1 0 7.996 7.996a7.996 7.996 0 0 0-7.996-7.996m0 10.394A2.399 2.399 0 1 1 10.395 12a2.396 2.396 0 0 1-2.399 2.398Z" />
            </svg>
            OF Search
          </Link>
        </div>

        <div className="flex flex-col gap-6">

          <div className="w-full min-w-0">
            <div className="relative">
              {/* Top Groups — hidden during search or when a filter is active */}
              {!debouncedSearchQuery && selectedCategory === (initialCountry || 'All') && selectedCountry === 'All' && topGroups.length > 0 && (
                <div className="mb-5 relative rounded-2xl overflow-hidden bg-white">
                  <div className="relative p-3 sm:p-4">
                      {/* Header */}
                      <div className="flex items-baseline gap-2.5 mb-3">
                        <h2 className="text-base font-black text-[#0f172a] leading-none tracking-tight">{t('groups.topGroups')}</h2>
                        <span className="text-[#0f172a] text-xs font-bold">{t('groups.topGroupsDesc')}</span>
                      </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 rounded-2xl p-3 sm:p-4" style={{ background: 'linear-gradient(180deg, #0d1117 0%, #0a0e16 100%)' }}>
                      {(() => {
                        // PRIORITY (ad-network wins): for each of the 4 spots,
                        //   assigned ad campaign  >  manual pin  >  boosted group  >  organic
                        // An ASSIGNED ad ALWAYS takes its spot — nothing overrides a paid ad placement.
                        const nonBoosted = topGroups.filter((g: any) => !g.boosted);
                        const boostedArr = topGroups.filter((g: any) => g.boosted);
                        const manualBySpot: Record<number, Group | undefined> = {
                          0: nonBoosted.find((g: any) => g.topGroupSlot === 1),
                          1: nonBoosted.find((g: any) => g.topGroupSlot === 2),
                        };
                        // Rotating ad per spot (Spot1=tier6, Spot2=tier1, Spot3=tier11, Spot4=tier5).
                        // Any spot with no assigned ad falls back to manual pin → organic below.
                        const campBySpot: Record<number, FeedCampaign | null> = {
                          0: !isTelegram ? topSpotCampaigns[0] : null,
                          1: !isTelegram ? topSpotCampaigns[1] : null,
                          2: !isTelegram ? topSpotCampaigns[2] : null,
                          3: !isTelegram ? topSpotCampaigns[3] : null,
                        };

                        const renderGroupCard = (g: Group, idx: number) => {
                          const tgLink = g.isAdvertisement && g.advertisementUrl
                            ? g.advertisementUrl
                            : g.telegramLink || undefined;
                          return (
                            <GroupCard
                              key={`top-${g._id}`}
                              group={g}
                              isIndex={idx}
                              onOpenReviewModal={openReviewModal}
                              onOpenReportModal={openReportModal}
                              isBookmarked={!!bookmarkedMap[g._id]}
                              bookmarkId={bookmarkedMap[g._id] || null}
                              directLink={tgLink}
                              growthPercent={TOP_SLOT_GROWTH[idx]}
                            />
                          );
                        };

                        // Organic fillers (boosted first, then the rest), used only for spots NO ad claims
                        // and that have no manual pin. Pinned groups are excluded so they don't double-show.
                        const pinIds = new Set([manualBySpot[0]?._id, manualBySpot[1]?._id].filter(Boolean));
                        const fillerQueue: Group[] = [
                          ...boostedArr.filter((g: any) => !pinIds.has(g._id)),
                          ...nonBoosted.filter((g: any) => !pinIds.has(g._id) && g.topGroupSlot !== 1 && g.topGroupSlot !== 2),
                        ];
                        let fillerIdx = 0;

                        const spots: React.ReactNode[] = [];
                        for (let spot = 0; spot < 4; spot++) {
                          const camp = campBySpot[spot];
                          if (camp) {
                            // Assigned ad ALWAYS wins this spot.
                            spots.push(
                              <AdvertCard
                                key={`spot-${spot}-${camp._id}`}
                                campaign={camp}
                                isIndex={spot}
                                shouldPreload={true}
                                onVisible={undefined}
                                growthPercent={TOP_SLOT_GROWTH[spot]}
                              />
                            );
                            continue;
                          }
                          // No ad → manual pin for this spot, else next organic/boosted filler.
                          const pin = manualBySpot[spot];
                          if (pin) {
                            spots.push(renderGroupCard(pin, spot));
                          } else {
                            const g = fillerQueue[fillerIdx++];
                            if (g) spots.push(renderGroupCard(g, spot));
                          }
                        }

                        return spots;
                      })()}
                    </div>
                  </div>
                </div>
              )}

              {/* Featured Groups section removed (brain: versatile-slots). Paid featured now lives in Top Groups Spot 1. */}

              <div className="text-center mb-6">
                <h1 className="text-2xl md:text-3xl font-black text-[#f5f5f5]">
                  Discover NSFW Telegram Groups
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
                  bookmarkedMap={bookmarkedMap}
                  vaultTeaserGroups={vaultTeaserGroups}
                />
              </div>

              {loading && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6 mt-6">
                  {Array.from({ length: 8 }, (_, i) => (
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

// Live "visiting now" count — text only (the pulsing dot lives in the filter bar).
function VisitingCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const fetchCount = () => {
      fetch('/api/advertise-stats', { cache: 'no-store' })
        .then((r) => r.json())
        .then((d) => { if (typeof d.activeVisitors === 'number') setCount(d.activeVisitors); })
        .catch(() => {});
    };
    fetchCount();
    const id = setInterval(fetchCount, 300_000);
    return () => clearInterval(id);
  }, []);

  return (
    <span className="flex items-baseline gap-1 whitespace-nowrap">
      <span className="font-black text-white/90 tabular-nums leading-none text-[13px]">
        {count > 0 ? count.toLocaleString('en-US') : '—'}
      </span>
      <span className="font-medium text-white/40 text-[10px]">visiting now</span>
    </span>
  );
}

