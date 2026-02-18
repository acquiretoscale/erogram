'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import axios from 'axios';
import dynamic from 'next/dynamic';
import Navbar from '@/components/Navbar';
import HeaderBanner from '@/components/HeaderBanner';
import { categories, countries } from './constants';
import { Group, FeedCampaign } from './types';
import GroupCard from './GroupCard';
import VirtualizedGroupGrid from './VirtualizedGroupGrid';
import GroupCardSkeleton from './GroupCardSkeleton';
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

interface GroupsClientProps {
  initialGroups: Group[];
  feedCampaigns?: FeedCampaign[];
  initialCountry?: string;
  initialIsMobile?: boolean;
  initialIsTelegram?: boolean;
  topBannerCampaigns?: Array<{ _id: string; creative: string; destinationUrl: string }>;
  /** Passed as separate strings to avoid hydration mismatch (stable serialization). */
  filterButtonText?: string;
  filterButtonUrl?: string;
}

export default function GroupsClient({ initialGroups, feedCampaigns = [], initialCountry, initialIsMobile = false, initialIsTelegram = false, topBannerCampaigns = [], filterButtonText = '', filterButtonUrl = '' }: GroupsClientProps) {
  const hasFilterButton = Boolean(filterButtonText?.trim() || filterButtonUrl?.trim());
  const [username, setUsername] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedCountry, setSelectedCountry] = useState(initialCountry || 'All');
  const [selectedSort, setSelectedSort] = useState('random');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showAddGroupModal, setShowAddGroupModal] = useState(false);

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
  const feedPlacementsMap = useMemo(() => {
    const map = new Map<number, FeedCampaign>();
    if (feedCampaigns) {
      feedCampaigns.forEach(c => {
        if (c.position != null) {
          map.set(c.position, c);
        }
      });
    }
    return map;
  }, [feedCampaigns]);

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

  // Since filtering is now handled at API level, use groups directly
  const displayGroups = useMemo(() => {
    return [...pinnedGroups, ...regularGroups];
  }, [pinnedGroups, regularGroups]);

  // Custom hook for debouncing
  // This hook was moved up to be defined before its first use.

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

              {/* Category Filter */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-[#f5f5f5] mb-3 flex items-center">
                  <span className="mr-2" suppressHydrationWarning>📂</span>
                  Category
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

              {/* Country Filter */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-[#f5f5f5] mb-3 flex items-center">
                  <span className="mr-2" suppressHydrationWarning>🌍</span>
                  Country
                </label>
                <select
                  value={selectedCountry}
                  onChange={(e) => setSelectedCountry(e.target.value)}
                  className="w-full p-4 border border-white/20 rounded-xl bg-white/5 text-[#f5f5f5] focus:ring-2 focus:ring-[#b31b1b] focus:border-transparent outline-none transition-all"
                >
                  {countries.map((country) => (
                    <option key={country} value={country} className="bg-[#222]">
                      {country}
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

              {/* Filter button – Advertiser Filter CTA or Settings fallback. Always same DOM (single <a>) to avoid hydration mismatch. */}
              <div className="mt-6">
                <a
                  href={hasFilterButton ? (filterButtonUrl?.trim() || '#') : '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 shadow-lg transition-all hover:scale-[1.02] ${hasFilterButton ? '' : 'pointer-events-none invisible'}`}
                  aria-hidden={!hasFilterButton}
                >
                  <span className="text-lg" aria-hidden>💋</span>
                  {hasFilterButton ? (filterButtonText?.trim() || 'Visit') : 'Visit'}
                </a>
              </div>
            </div>
          </aside>

          {/* Groups Grid - NO "Top Groups" section here; only All Groups + pinned + grid */}
          <div className="lg:w-3/4 min-w-0 shrink-0">
            {/* All Groups */}
            <div className="relative">
              {/* Popular categories – compact, SEO-friendly real links */}
              <section className="mb-6 rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-950/40 to-orange-950/20 px-4 py-3 shadow-md" aria-labelledby="popular-categories-heading">
                <h3 id="popular-categories-heading" className="text-sm font-bold text-amber-200/95 mb-2.5 flex items-center gap-1.5">
                  <span aria-hidden>🔥</span>
                  Popular categories
                </h3>
                <nav aria-label="Popular Telegram group categories">
                  <ul className="flex flex-wrap gap-2 list-none m-0 p-0">
                    {[
                      { label: 'Lesbian', href: '/best-telegram-groups/lesbian' },
                      { label: 'Threesome', href: '/best-telegram-groups/threesome' },
                      { label: 'Big Ass', href: '/best-telegram-groups/big%20ass' },
                      { label: 'Amateur', href: '/best-telegram-groups/amateur' },
                      { label: 'Onlyfans', href: '/best-telegram-groups/onlyfans' },
                      { label: 'Hentai', href: '/best-telegram-groups/hentai' },
                      { label: 'Thailand', href: '/groups/country/Thailand' },
                      { label: 'Russia', href: '/groups/country/Russia' },
                      { label: 'UK', href: '/groups/country/UK' },
                      { label: 'Germany', href: '/groups/country/Germany' },
                      { label: 'France', href: '/groups/country/France' },
                    ].map(({ label, href }) => (
                      <li key={href}>
                        <Link
                          href={href}
                          className="inline-block px-3 py-1.5 text-xs font-medium text-amber-50 bg-white/10 hover:bg-amber-500/30 border border-amber-400/30 rounded-lg text-[#f5f5f5] transition-colors hover:border-amber-400/50"
                        >
                          {label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>
              </section>

              <div className="text-center mb-6">
                <h2 className="text-2xl md:text-3xl font-black text-[#f5f5f5]">
                  🔥 All Groups
                </h2>
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
                {pinnedGroups.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                    {pinnedGroups.map((group, idx) => (
                      <GroupCard key={`pinned-${group._id}`} group={group} isIndex={idx} isFeatured={true} onOpenReviewModal={openReviewModal} onOpenReportModal={openReportModal} />
                    ))}
                  </div>
                )}
                <VirtualizedGroupGrid
                  groups={regularGroups}
                  feedPlacementsMap={feedPlacementsMap}
                  isTelegram={isTelegram}
                  onOpenReviewModal={openReviewModal}
                  onOpenReportModal={openReportModal}
                />
              </div>

              {loading && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
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
          categories={categories}
          countries={countries}
          onClose={() => setShowAddGroupModal(false)}
          onSuccess={() => {
            setShowAddGroupModal(false);
            // Optionally refresh groups if needed
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
