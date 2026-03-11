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

function VaultTeaserSection({ items }: { items: VaultTeaserItem[]; catOrder?: string[] }) {
  const fmtNum = (n: number) => n >= 1_000_000 ? (n/1_000_000).toFixed(1)+'M' : n >= 1_000 ? (n/1_000).toFixed(n>=10_000?0:1)+'K' : n > 0 ? String(n) : null;

  return (
    <Link href="/premium" target="_blank" className="block mb-8 group cursor-pointer">
      <div className="text-center mb-4">
        <span
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.25em] mb-3"
          style={{ background: 'rgba(201,151,58,0.08)', border: '1px solid rgba(201,151,58,0.2)', color: '#b8964e' }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          Private Vault
        </span>
        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
          Premium <span style={{ background: 'linear-gradient(135deg, #c9973a, #e8ba5a)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Secret Vault</span>
        </h2>
        <p className="text-white/30 text-xs mt-1">Exclusive groups only visible to Premium members</p>
      </div>

      <div
        className="relative rounded-2xl overflow-hidden p-3 sm:p-4 transition-all group-hover:scale-[1.01]"
        style={{ background: 'linear-gradient(160deg, #0f0d09 0%, #110e08 60%, #0d0b07 100%)', border: '1px solid #2a1f0e' }}
      >
        <div className="absolute top-0 right-0 w-56 h-56 blur-3xl opacity-[0.06] rounded-full pointer-events-none" style={{ background: 'radial-gradient(ellipse, #c9973a 0%, transparent 60%)' }} />

        <div className="relative grid grid-cols-2 gap-1.5">
          {items.map(g => {
            const fmt = fmtNum(g.memberCount);
            const cats = g.vaultCategories && g.vaultCategories.length > 0 ? g.vaultCategories : ((g as any).categories?.length ? (g as any).categories : [g.category]);
            return (
              <div
                key={g._id}
                className="relative rounded-lg flex items-center gap-2 px-2 py-1.5 select-none"
                style={{ background: 'linear-gradient(135deg, #120f09 0%, #150f08 100%)', border: '1px solid #2a1f0e' }}
              >
                <div className="absolute left-0 top-0 bottom-0 w-px" style={{ background: 'linear-gradient(180deg, transparent, #c9973a44, transparent)' }} />
                <div className="shrink-0 w-8 h-8 rounded-md overflow-hidden" style={{ border: '1px solid #2e2010' }}>
                  <img src={g.image || '/assets/placeholder-no-image.png'} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = '/assets/placeholder-no-image.png'; }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-[10px] truncate leading-tight mb-0.5 select-none pointer-events-none" aria-hidden="true">
                    <span className="text-white">{g.name.slice(0, 4)}</span><span style={{ filter: 'blur(4px)', color: '#fff' }}>{g.name.slice(4) || '····'}</span>
                  </div>
                  <div className="flex items-center gap-1 flex-wrap">
                    {cats.map((c: string, i: number) => (
                      <span key={c} className="text-[7px] font-black uppercase tracking-[0.06em] px-1 py-0.5 rounded shrink-0" style={{ background: i === 0 ? '#1a1408' : '#12100a', border: '1px solid #c9973a22', color: i === 0 ? '#c9973a' : '#7a6040' }}>{c}</span>
                    ))}
                    {g.country && <span className="text-[8px] font-semibold truncate" style={{ color: '#5a4830' }}>{g.country}</span>}
                    {fmt && <span className="text-[8px] font-semibold shrink-0" style={{ color: '#4a3820' }}>· {fmt}</span>}
                  </div>
                </div>
                <svg className="shrink-0" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#c9973a55" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
            );
          })}
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none" style={{ background: 'linear-gradient(to bottom, transparent, #0f0d09)' }} />
      </div>

      <div className="mt-3 flex items-center justify-center gap-2 py-2.5 rounded-xl font-black text-sm transition-all group-hover:scale-[1.02]"
        style={{ background: 'linear-gradient(135deg, #c9973a, #a67c2e)', color: '#0d0c0a' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
        Unlock the Full Vault
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      </div>
      <p className="mt-2 text-center text-[10px]" style={{ color: '#4a3820' }}>100+ exclusive groups · Updated regularly</p>
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
    fetch(`/api/groups?limit=1000${categoryParam}`)
      .then(res => res.json())
      .then(data => {
        if (data.groups) {
          const pinned = data.groups.filter((g: Group) => g.pinned);
          setPinnedGroups(pinned);
        }
      })
      .catch(err => console.error('Failed to fetch pinned groups:', err));
  }, [selectedCategory]);




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
        const response = await fetch(`/api/groups?skip=0&limit=12&sortBy=${selectedSort}${searchParam}${categoryParam}`, { cache: 'no-store' });
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
  }, [selectedSort, debouncedSearchQuery, selectedCategory]);

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
        fetch(`/api/groups?skip=${skip}&limit=12&sortBy=${selectedSort}${searchParam}${categoryParam}`)
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
  }, [skip, loading, hasMore, selectedSort, debouncedSearchQuery, selectedCategory]);

  const displayGroups = useMemo(() => {
    return [...pinnedGroups.slice(0, 2), ...regularGroups];
  }, [pinnedGroups, regularGroups]);

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
                {(() => {
                  if (vaultTeaser.length === 0) {
                    return (
                      <VirtualizedGroupGrid
                        groups={displayGroups}
                        feedCampaigns={gridCampaigns}
                        isTelegram={isTelegram}
                        onOpenReviewModal={openReviewModal}
                        onOpenReportModal={openReportModal}
                      />
                    );
                  }
                  const FIRST = 20;
                  const INTERVAL = 16;
                  const chunks: React.ReactNode[] = [];
                  let cursor = 0;

                  // First chunk: 1 post, then vault
                  const firstSlice = displayGroups.slice(cursor, cursor + FIRST);
                  if (firstSlice.length > 0) {
                    chunks.push(
                      <VirtualizedGroupGrid key={`chunk-${cursor}`} groups={firstSlice} feedCampaigns={cursor === 0 ? gridCampaigns : []} isTelegram={isTelegram} onOpenReviewModal={openReviewModal} onOpenReportModal={openReportModal} />
                    );
                    cursor += FIRST;
                    chunks.push(<VaultTeaserSection key={`vault-${cursor}`} items={vaultTeaser} catOrder={vaultCatOrder} />);
                  }

                  // Subsequent chunks: every 15 posts, insert vault
                  while (cursor < displayGroups.length) {
                    const slice = displayGroups.slice(cursor, cursor + INTERVAL);
                    chunks.push(
                      <VirtualizedGroupGrid key={`chunk-${cursor}`} groups={slice} feedCampaigns={[]} isTelegram={isTelegram} onOpenReviewModal={openReviewModal} onOpenReportModal={openReportModal} />
                    );
                    cursor += INTERVAL;
                    if (cursor < displayGroups.length) {
                      chunks.push(<VaultTeaserSection key={`vault-${cursor}`} items={vaultTeaser} catOrder={vaultCatOrder} />);
                    }
                  }

                  return <>{chunks}</>;
                })()}
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
