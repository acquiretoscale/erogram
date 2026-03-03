'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import axios from 'axios';
import dynamic from 'next/dynamic';
import Navbar from '@/components/Navbar';
import HeaderBanner from '@/components/HeaderBanner';
import { filterOptions, filterCategories, filterCountries } from './constants';
import { Group, FeedCampaign, StoryCategory } from './types';
import GroupCard from './GroupCard';
import AdvertCard from './AdvertCard';
import VirtualizedGroupGrid from './VirtualizedGroupGrid';
import GroupCardSkeleton from './GroupCardSkeleton';
import StoryBar from './StoryBar';
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
}

export default function GroupsClient({ initialGroups, feedCampaigns = [], initialCountry, initialIsMobile = false, initialIsTelegram = false, topBannerCampaigns = [], storyData = [] }: GroupsClientProps) {
  const STORY_SEEN_KEY = 'erogram:stories:seen:v1';
  const [username, setUsername] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedCountry, setSelectedCountry] = useState(initialCountry || 'All');
  const [selectedSort, setSelectedSort] = useState('random');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showAddGroupModal, setShowAddGroupModal] = useState(false);
  const [isStoryOpen, setIsStoryOpen] = useState(false);
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const [seenStoryMap, setSeenStoryMap] = useState<Record<string, string>>({});

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

  const [regularGroups, setRegularGroups] = useState<Group[]>(initialRealGroups.filter(g => !g.pinned));
  const [pinnedGroups, setPinnedGroups] = useState<Group[]>(initialRealGroups.filter(g => g.pinned));
  const [skip, setSkip] = useState(initialGroups.filter(g => !g.pinned).length);
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
  // Initialize device detection from server props to prevent hydration mismatches
  const [isMobile, setIsMobile] = useState(initialIsMobile);
  const [isTelegram, setIsTelegram] = useState(initialIsTelegram);
  const lastVisibleIndexRef = useRef(-1);





  useEffect(() => {
    setTopGroupsLoading(true);
    fetch('/api/groups?topGroup=true&limit=4')
      .then(res => res.json())
      .then(data => { if (data.groups) setTopGroups(data.groups); })
      .catch(err => console.error('Failed to fetch top groups:', err))
      .finally(() => setTopGroupsLoading(false));
  }, []);

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

  // Fetch pinned groups that match current filters
  useEffect(() => {
    const categoryParam = selectedCategory !== 'All' ? `&category=${encodeURIComponent(selectedCategory)}` : '';
    const countryParam = selectedCountry !== 'All' ? `&country=${encodeURIComponent(selectedCountry)}` : '';
    fetch(`/api/groups?limit=1000${categoryParam}${countryParam}`)
      .then(res => res.json())
      .then(data => {
        if (data.groups) {
          const pinned = data.groups.filter((g: Group) => g.pinned);
          setPinnedGroups(pinned);
        }
      })
      .catch(err => console.error('Failed to fetch pinned groups:', err));
  }, [selectedCategory, selectedCountry]);




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
      alert('Review submitted successfully! It will be published after approval.');
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
          country: selectedCountry,
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
          country: selectedCountry,
          sort: selectedSort,
          search: searchQuery
        },
        timestamp: Date.now()
      };
      sessionStorage.setItem('erogram_groups_state_v5', JSON.stringify(state));
    };

    // Save on unmount
    return () => saveState();
  }, [regularGroups, skip, hasMore, selectedCategory, selectedCountry, selectedSort, searchQuery]);

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
        selectedCategory === 'All' &&
        selectedCountry === (initialCountry || 'All') &&
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
        const response = await fetch(`/api/groups?skip=0&limit=12&sortBy=${selectedSort}${searchParam}${categoryParam}${countryParam}`, { cache: 'no-store' });
        const data = await response.json();
        if (!response.ok || !Array.isArray(data.groups)) {
          setGroupsLoadError(true);
          setRegularGroups([]);
          setSkip(0);
          setHasMore(false);
          return;
        }
        const regular = data.groups.filter((g: Group) => !g.pinned);
        if (regular && regular.length > 0) {
          setRegularGroups(regular);
          setSkip(regular.length);
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
        fetch(`/api/groups?skip=${skip}&limit=12&sortBy=${selectedSort}${searchParam}${categoryParam}${countryParam}`)
          .then(res => res.json())
          .then(data => {
            if (data.groups && data.groups.length > 0) {
              // Filter out duplicates by checking _id to prevent duplicate keys
              setRegularGroups(prev => {
                const existingIds = new Set(prev.map(g => g._id));
                const newGroups = data.groups.filter((g: Group) => !existingIds.has(g._id) && !g.pinned);
                return [...prev, ...newGroups];
              });
              setSkip(prev => prev + data.groups.filter((g: Group) => !g.pinned).length);
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
  }, [skip, loading, hasMore, selectedSort, debouncedSearchQuery, selectedCategory, selectedCountry]);

  const displayGroups = useMemo(() => {
    return [...pinnedGroups.slice(0, 2), ...regularGroups];
  }, [pinnedGroups, regularGroups]);

  const filterValue = useMemo(() => {
    if (selectedCategory !== 'All') return `cat:${selectedCategory}`;
    if (selectedCountry !== 'All') return `country:${selectedCountry}`;
    return 'All';
  }, [selectedCategory, selectedCountry]);

  const handleFilterChange = (value: string) => {
    if (value === 'All') {
      setSelectedCategory('All');
      setSelectedCountry('All');
    } else if (value.startsWith('cat:')) {
      setSelectedCategory(value.slice(4));
      setSelectedCountry('All');
    } else if (value.startsWith('country:')) {
      setSelectedCategory('All');
      setSelectedCountry(value.slice(8));
    }
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
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </button>
          </div>

          {/* Sidebar Filters */}
          <aside className={`${showFilters ? 'block' : 'hidden'} lg:block lg:w-1/4 min-w-0 shrink-0`} suppressHydrationWarning>
            <div className="glass rounded-2xl p-6 backdrop-blur-lg border border-white/10">
              {/* Header */}
              <div className="text-center mb-8">
                <h2 className="text-2xl font-black text-[#f5f5f5] mb-2">🔍 Filters</h2>
                <p className="text-[#999] text-sm">Find your perfect group</p>
              </div>

              {/* Browse By (flat merged list of categories + countries) */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-[#f5f5f5] mb-3 flex items-center">
                  <span className="mr-2" suppressHydrationWarning>📂</span>
                  Browse By
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

              {/* Search */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-[#f5f5f5] mb-3 flex items-center">
                  <span className="mr-2" suppressHydrationWarning>🔍</span>
                  Search Groups
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name..."
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
                  {filterValue !== 'All' || searchQuery
                    ? 'Apply Filters'
                    : 'Show Results'}
                </button>

                {(filterValue !== 'All' || searchQuery) && (
                  <button
                    onClick={() => {
                      handleFilterChange('All');
                      setSearchQuery('');
                    }}
                    className="w-full px-4 py-3 bg-white/5 hover:bg-white/10 text-[#999] hover:text-white rounded-xl font-bold transition-colors border border-white/10"
                  >
                    Reset Filters
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

              {/* Top Groups (most clicked last 3 days) */}
              {(topGroups.length > 0 || topGroupsLoading) && (
                <div className="mb-10 relative rounded-3xl p-[2px]" style={{ background: 'linear-gradient(135deg, #f59e0b, #ea580c, #dc2626, #ea580c, #f59e0b)' }}>
                  <div className="rounded-[22px] bg-[#111111] relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-900/20 via-orange-900/10 to-red-900/10" />
                    <div className="relative p-4 sm:p-6">
                      <div className="text-center mb-4 sm:mb-6">
                        <h2 className="text-2xl sm:text-3xl font-black text-[#f5f5f5] drop-shadow-2xl">
                          🏆 Top Groups
                        </h2>
                        <p className="text-amber-300/60 text-sm mt-1 font-medium">Most popular this week</p>
                      </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                      {topGroupsLoading ? (
                        Array.from({ length: 4 }, (_, i) => (
                          <GroupCardSkeleton key={`top-skeleton-${i}`} />
                        ))
                      ) : (
                        <>
                          {/* Position 1: First top group */}
                          {topGroups[0] && (
                            <GroupCard
                              key={`top-${topGroups[0]._id}`}
                              group={topGroups[0]}
                              isIndex={0}
                              isFeatured
                              onOpenReviewModal={openReviewModal}
                              onOpenReportModal={openReportModal}
                            />
                          )}
                          {/* Position 2: Tier 1 in-feed ad (or second top group) */}
                          {tier1Campaign && !isTelegram ? (
                            <AdvertCard
                              key={`tier1-${tier1Campaign._id}`}
                              campaign={tier1Campaign}
                              isIndex={1}
                              shouldPreload={true}
                              onVisible={undefined}
                            />
                          ) : topGroups[1] ? (
                            <GroupCard
                              key={`top-${topGroups[1]._id}`}
                              group={topGroups[1]}
                              isIndex={1}
                              isFeatured
                              onOpenReviewModal={openReviewModal}
                              onOpenReportModal={openReportModal}
                            />
                          ) : null}
                          {/* Position 3 & 4: remaining top groups (shifted by 1 if ad present) */}
                          {(tier1Campaign && !isTelegram ? topGroups.slice(1, 3) : topGroups.slice(2, 4)).map((g, i) => (
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
                      )}
                    </div>
                  </div>
                </div>
                </div>
              )}

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
                        ? 'Couldn’t load groups. The app needs a working database connection — if you’re running locally, set MONGODB_URI in .env.local and ensure MongoDB is reachable.'
                        : 'No groups found'}
                    </p>
                  </div>
                )}
                <VirtualizedGroupGrid
                  groups={displayGroups}
                  feedCampaigns={gridCampaigns}
                  isTelegram={isTelegram}
                  onOpenReviewModal={openReviewModal}
                  onOpenReportModal={openReportModal}
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
          countries={filterCountries}
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
