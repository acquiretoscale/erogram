'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import axios from 'axios';
import dynamic from 'next/dynamic';
import Navbar from '@/components/Navbar';
import HeaderBanner from '@/components/HeaderBanner';
import Footer from '@/components/Footer';
import { Group, FeedCampaign, StoryCategory } from './types';
import GroupCard from './GroupCard';
import AdvertCard from './AdvertCard';
import VirtualizedGroupGrid from './VirtualizedGroupGrid';
import GroupsEditorialSeo from './GroupsEditorialSeo';
import { checkBookmarks } from '@/lib/actions/publicData';
import GroupCardSkeleton from './GroupCardSkeleton';
import { filterCategories } from './constants';
import { BOOST_WEIGHT, isGroupsInFeedPlacement } from '@/lib/adPlacements';
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
  trendingCategories?: Array<{ label: string; href: string; title?: string }>;
  categoryOptions?: string[];
  countryOptions?: string[];
  paginationCurrentPage?: number;
  paginationTotalPages?: number;
  groupsPageSize?: number;
}

function groupsPageHref(page: number): string {
  return page <= 1 ? '/groups' : `/groups/page/${page}`;
}

function groupsSessionStorageKey(page: number): string {
  return `erogram_groups_state_v5_p${page}`;
}

export default function GroupsClient({ initialGroups, feedCampaigns = [], initialCountry, initialIsMobile = false, initialIsTelegram = false, topBannerCampaigns = [], storyData = [], trendingCategories = [], categoryOptions = [], countryOptions = [], paginationCurrentPage = 1, paginationTotalPages = 1, groupsPageSize = 32 }: GroupsClientProps) {
  const STORY_SEEN_KEY = 'erogram:stories:seen:v1';
  const [username, setUsername] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState(initialCountry || 'All');
  const [selectedCountry, setSelectedCountry] = useState('All');
  const [selectedSort, setSelectedSort] = useState('newest');
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

  const getCategoryDisplay = (cat: string): string => {
    if (locale !== 'de') return cat;
    const deMap: Record<string, string> = {
      'Onlyfans': 'OnlyFans',
      'Instagram Models': 'Instagram-Models',
      'Feet': 'Füße',
      'MILF': 'MILF',
      'BDSM': 'BDSM',
      'Fetish': 'Fetisch',
      'Latina': 'Latinas',
      'Cosplay': 'Cosplay',
      'Onlyfans Leaks': 'OnlyFans Leaks',
      'TikTok': 'TikTok',
      'Asian': 'Asiatisch',
      'Blowjob': 'Blowjob',
      'Amateur': 'Amateur',
      'Lesbian': 'Lesbisch',
      'Uncensored AV': 'Unzensiertes AV',
    };
    return deMap[cat] || cat;
  };

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
  const [loading, setLoading] = useState(false);
  const [groupsLoadError, setGroupsLoadError] = useState(false);

  const [topGroups, setTopGroups] = useState<Group[]>([]);
  const [topGroupsLoading, setTopGroupsLoading] = useState(true);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewLoginPath, setReviewLoginPath] = useState('/groups');
  const [selectedGroupForReview, setSelectedGroupForReview] = useState<Group | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedGroupForReport, setSelectedGroupForReport] = useState<Group | null>(null);
  const [bookmarkedMap, setBookmarkedMap] = useState<Record<string, string>>({});
  // Initialize device detection from server props to prevent hydration mismatches
  const [isMobile, setIsMobile] = useState(initialIsMobile);
  const [isTelegram, setIsTelegram] = useState(initialIsTelegram);
  const lastVisibleIndexRef = useRef(-1);





  useEffect(() => {
    setTopGroupsLoading(true);

    fetch(`/api/groups?topGroup=true&limit=20&locale=${locale}`)
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

  




  const openReviewModal = (group: Group) => {
    setSelectedGroupForReview(group);
    setReviewLoginPath(group.slug ? `/${group.slug}` : '/groups');
    setShowReviewModal(true);
  };

  // Handle opening report modal
  const openReportModal = (group: Group) => {
    setSelectedGroupForReport(group);
    setShowReportModal(true);
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

  // Restore state from sessionStorage on mount (per pagination page — never bleed page 1 into page 2+)
  useEffect(() => {
    try {
      const storageKey = groupsSessionStorageKey(paginationCurrentPage);
      const savedState = sessionStorage.getItem(storageKey);
      if (savedState) {
        const { groups, scrollY, filters, timestamp } = JSON.parse(savedState);

        // Check if cache is expired (1 hour)
        const now = Date.now();
        if (timestamp && (now - timestamp > 60 * 60 * 1000)) {
          sessionStorage.removeItem(storageKey);
          return;
        }

        const currentFilters = {
          category: selectedCategory,
          sort: selectedSort,
          search: searchQuery
        };

        // Only restore if filters match this page's saved snapshot
        if (JSON.stringify(currentFilters) === JSON.stringify(filters)) {
          setRegularGroups(groups);
          isRestoredRef.current = true;
          isFirstLoad.current = false;

          // Restore scroll position after a brief delay to allow rendering
          setTimeout(() => {
            window.scrollTo(0, scrollY);
          }, 100);
        }
      }
    } catch (e) {
      console.error('Failed to restore state:', e);
    }
  }, [paginationCurrentPage]);

  // Deep link: /groups?category=X selects that category so the feed shows its
  // newest-first search results (used by the Trending Group Categories links).
  const searchParams = useSearchParams();
  const urlCategoryParam = searchParams.get('category');
  const effectiveCategory =
    urlCategoryParam && urlCategoryParam !== 'All' && categoryOptions.includes(urlCategoryParam)
      ? urlCategoryParam
      : selectedCategory;
  const prevUrlCategoryParam = useRef<string | null>(null);
  useEffect(() => {
    if (urlCategoryParam && urlCategoryParam !== 'All' && categoryOptions.includes(urlCategoryParam)) {
      setSelectedCategory(urlCategoryParam);
    } else if (prevUrlCategoryParam.current && !urlCategoryParam) {
      setSelectedCategory(initialCountry || 'All');
    }
    prevUrlCategoryParam.current = urlCategoryParam;
  }, [urlCategoryParam, categoryOptions, initialCountry]);

  // Save state to sessionStorage (scoped to current pagination page)
  useEffect(() => {
    const storageKey = groupsSessionStorageKey(paginationCurrentPage);
    const saveState = () => {
      const state = {
        page: paginationCurrentPage,
        groups: regularGroups,
        scrollY: window.scrollY,
        filters: {
          category: selectedCategory,
          sort: selectedSort,
          search: searchQuery
        },
        timestamp: Date.now()
      };
      sessionStorage.setItem(storageKey, JSON.stringify(state));
    };

    // Save on unmount
    return () => saveState();
  }, [regularGroups, selectedCategory, selectedSort, searchQuery, paginationCurrentPage]);

  // Save scroll position periodically while scrolling
  useEffect(() => {
    const storageKey = groupsSessionStorageKey(paginationCurrentPage);
    const handleScrollSave = () => {
      const savedState = sessionStorage.getItem(storageKey);
      if (savedState) {
        const state = JSON.parse(savedState);
        state.scrollY = window.scrollY;
        sessionStorage.setItem(storageKey, JSON.stringify(state));
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
  }, [paginationCurrentPage]);

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
        selectedSort === 'newest' &&
        !debouncedSearchQuery &&
        effectiveCategory === (initialCountry || 'All') &&
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
        const categoryParam = effectiveCategory !== 'All' ? `&category=${encodeURIComponent(effectiveCategory)}` : '';
        const countryParam = selectedCountry !== 'All' ? `&country=${encodeURIComponent(selectedCountry)}` : '';
        const response = await fetch(`/api/groups?skip=0&limit=${groupsPageSize}&sortBy=${selectedSort}${searchParam}${categoryParam}${countryParam}&locale=${locale}`, { cache: 'no-store' });
        const data = await response.json();
        if (!response.ok || !Array.isArray(data.groups)) {
          setGroupsLoadError(true);
          setRegularGroups([]);
          return;
        }
        if (data.groups && data.groups.length > 0) {
          setRegularGroups(data.groups);
        } else {
          setRegularGroups([]);
        }
      } catch (error) {
        console.error('Error fetching groups:', error);
        setGroupsLoadError(true);
        setRegularGroups([]);
      } finally {
        setLoading(false);
      }
    };

    fetchGroups();
    lastVisibleIndexRef.current = -1;
  }, [selectedSort, debouncedSearchQuery, effectiveCategory, selectedCountry, groupsPageSize, locale, initialCountry]);

  const isDefaultBrowse =
    selectedSort === 'newest' &&
    !debouncedSearchQuery &&
    effectiveCategory === (initialCountry || 'All') &&
    selectedCountry === 'All';

  const showTopGroups =
    isDefaultBrowse &&
    !searchQuery.trim() &&
    !topGroupsLoading &&
    topGroups.length > 0;

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
  // Paid boosted groups + assigned ads rotate together per spot (same law as Top Bots).
  // Boosted groups get BOOST_WEIGHT entries in the draw; swap pass guarantees every active
  // paid boost appears when a slot is available.
  const SPOT_PLACEMENT: Record<number, string> = { 0: 'top-groups-1', 1: 'top-groups-2', 2: 'top-groups-3', 3: 'top-groups-4' };
  // tierSlot of each spot's row (so we exclude the right feed row from the grid below).
  const SPOT_TIERSLOT: Record<number, number> = { 0: 6, 1: 1, 2: 11, 3: 5 };

  // Top Groups: paid boosted groups + assigned ads rotate together per spot (same law as Top Bots).
  type TopGroupsSpot = { kind: 'ad'; campaign: FeedCampaign } | { kind: 'group'; group: Group };
  const topSpotPicks = useMemo(() => {
    const empty = { 0: null, 1: null, 2: null, 3: null } as Record<number, TopGroupsSpot | null>;
    if (topGroupsLoading || topGroups.length === 0) return empty;

    const picks: Record<number, TopGroupsSpot | null> = { 0: null, 1: null, 2: null, 3: null };
    const usedKeys = new Set<string>();
    const boostedArr = topGroups.filter((g) => g.boosted);
    const nonBoosted = topGroups.filter((g) => !g.boosted);
    const manualBySpot: Record<number, Group | undefined> = {
      0: nonBoosted.find((g) => g.topGroupSlot === 1),
      1: nonBoosted.find((g) => g.topGroupSlot === 2),
    };
    const pinIds = new Set([manualBySpot[0]?._id, manualBySpot[1]?._id].filter(Boolean));

    const pickForSlot = (spot: number): TopGroupsSpot | null => {
      const tierSlot = SPOT_TIERSLOT[spot];
      const placement = SPOT_PLACEMENT[spot];
      const adPool = isTelegram
        ? []
        : feedCampaigns.filter(
            (c) => c.tierSlot === tierSlot && c.placement === placement && !usedKeys.has(`ad:${c._id}`),
          );
      const boostedPool = boostedArr.filter((g) => !usedKeys.has(`group:${g._id}`));

      type DrawEntry = TopGroupsSpot & { weight: number };
      const draw: DrawEntry[] = [];
      for (const c of adPool) {
        draw.push({
          kind: 'ad',
          campaign: c,
          weight: c.priority === 'boost' ? BOOST_WEIGHT : 1,
        });
      }
      for (const g of boostedPool) {
        draw.push({ kind: 'group', group: g, weight: BOOST_WEIGHT });
      }

      if (draw.length === 0) {
        const pin = manualBySpot[spot];
        if (pin && !usedKeys.has(`group:${pin._id}`)) {
          usedKeys.add(`group:${pin._id}`);
          return { kind: 'group', group: pin };
        }
        const fillerQueue = nonBoosted.filter(
          (g) => !pinIds.has(g._id) && g.topGroupSlot !== 1 && g.topGroupSlot !== 2,
        );
        const available = fillerQueue.filter((g) => !usedKeys.has(`group:${g._id}`));
        if (available.length === 0) return null;
        const g = available[Math.floor(Math.random() * available.length)];
        usedKeys.add(`group:${g._id}`);
        return { kind: 'group', group: g };
      }

      const expanded: TopGroupsSpot[] = [];
      for (const entry of draw) {
        for (let i = 0; i < entry.weight; i++) {
          expanded.push(
            entry.kind === 'ad'
              ? { kind: 'ad', campaign: entry.campaign }
              : { kind: 'group', group: entry.group },
          );
        }
      }
      const pick = expanded[Math.floor(Math.random() * expanded.length)];
      usedKeys.add(pick.kind === 'ad' ? `ad:${pick.campaign._id}` : `group:${pick.group._id}`);
      return pick;
    };

    for (let spot = 0; spot < 4; spot++) {
      picks[spot] = pickForSlot(spot);
    }

    // Paid boosts must always appear when slots allow — swap out ads if the draw missed any.
    for (const g of boostedArr) {
      const placed = Object.values(picks).some((p) => p?.kind === 'group' && p.group._id === g._id);
      if (placed) continue;
      const adSpot = [0, 1, 2, 3].find((s) => picks[s]?.kind === 'ad');
      if (adSpot == null) break;
      picks[adSpot] = { kind: 'group', group: g };
    }

    return picks;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedCampaigns, topGroups, topGroupsLoading, isTelegram]);

  const gridCampaigns = useMemo(() => {
    // Exclude only the exact slot ROWS consumed by Top Groups, not every row sharing that _id.
    // A multi-placement ad assigned to BOTH Top Groups and in-feed (tier 2/3/4) keeps its
    // in-feed copies so it still renders down the feed. We match _id + tierSlot of the picks.
    const usedKeys = new Set(
      Object.values(topSpotPicks)
        .filter((p): p is Extract<TopGroupsSpot, { kind: 'ad' }> => p?.kind === 'ad')
        .map((p) => `${p.campaign._id}-${p.campaign.tierSlot}`),
    );
    return feedCampaigns.filter((c) => {
      if (usedKeys.has(`${c._id}-${c.tierSlot}`)) return false;
      // Scroll feed: only explicit feed-* placements. Top Groups spots never leak here.
      if (c.placement) return isGroupsInFeedPlacement(c.placement);
      return c.tierSlot != null && c.tierSlot >= 2 && c.tierSlot <= 4;
    });
  }, [feedCampaigns, topSpotPicks]);

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
        <nav aria-label="Breadcrumb" className="mb-4">
          <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 list-none p-0 m-0 text-xs sm:text-sm text-gray-400">
            <li>
              <Link href={lp('/')} className="hover:text-white transition-colors">
                {t('slug.home')}
              </Link>
            </li>
            <li aria-hidden="true" className="text-gray-600 select-none">/</li>
            <li className="text-white font-medium" aria-current="page">
              {t('nav.groups')}
            </li>
          </ol>
        </nav>

        {/* Hero — same framework as AI NSFW (badge + title + subtitle) */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-6 sm:mb-8"
        >
          <h1 className="text-[32px] sm:text-[50px] md:text-[58px] font-black leading-[1.05] tracking-tight text-white mb-3">
            {t('groups.title')}
          </h1>
          <p className="text-white/50 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            {t('groups.heroSubtitle')}
          </p>
        </motion.div>

        {/* Filter bar — one sleek unified pill: search + filters + live stat, single line */}
        <div className="mb-6 sm:mb-8 flex justify-center items-center gap-3">
          <div className="flex items-center gap-1.5 sm:gap-2 w-full max-w-3xl rounded-full border border-white/10 bg-white/[0.03] backdrop-blur-sm p-1.5 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.6)]">
            {/* Category */}
            <div className="relative shrink-0">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value || 'All')}
                aria-label={t('common.category')}
                className="pl-2.5 pr-6 py-2 rounded-full bg-transparent hover:bg-white/[0.06] text-white text-[11px] font-bold focus:outline-none transition-colors appearance-none cursor-pointer"
              >
                <option value="All" className="bg-[#131a24]">{t('groups.allCategories')}</option>
                {categoryOptions.map((c) => (
                  <option key={c} value={c} className="bg-[#131a24]">{getCategoryDisplay(c)}</option>
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
                <option value="All" className="bg-[#131a24]">{t('groups.allCountries')}</option>
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
          </div>
        </div>

        {/* GO PREMIUM — mobile: compact strip */}
        <Link
          href={lp('/premium')}
          className="lg:hidden flex items-center justify-between gap-1.5 mb-3 mx-auto w-[52%] px-2.5 py-1.5 rounded-xl transition-all hover:brightness-105 active:scale-[0.99]"
          style={{
            background: 'linear-gradient(135deg, #b8860b 0%, #ffd700 40%, #fff8b0 55%, #ffd700 70%, #b8860b 100%)',
            boxShadow: '0 4px 24px -4px rgba(255,215,0,0.5), inset 0 1px 0 rgba(255,255,255,0.4)',
          }}
        >
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-black text-[#1a0f00] tracking-tight leading-tight">{t('groups.goPremium')}</div>
            <div className="text-[7px] font-semibold text-[#3d2800]/80 mt-0.5">{t('groups.unlockPremiumGroups')}</div>
          </div>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="#1a0f00" className="shrink-0" aria-hidden>
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
          </svg>
        </Link>

        {/* Trending Group Categories — every content category with 20+ listings.
            Real crawlable links to the newest-first filtered feed so Google reads
            each as a high-content category view. */}
        {trendingCategories.length > 0 && (
          <nav aria-label="Trending group categories" className="mb-4 sm:mb-6 flex flex-wrap items-center justify-center gap-1.5">
            <h2 className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-white/70 mr-0.5">
              <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#ff7a3d]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
              {t('groups.trendingGroupCategories')}
            </h2>
            {trendingCategories.map(({ label, href, title }) => {
              const isActive = effectiveCategory === label;
              return (
                <Link
                  key={href}
                  href={href}
                  title={title || `${label} Telegram groups`}
                  aria-label={title || `${label} Telegram groups`}
                  aria-current={isActive ? 'true' : undefined}
                  onClick={(e) => {
                    e.preventDefault();
                    setSelectedCategory(label);
                    window.history.replaceState(null, '', href);
                  }}
                  className={`px-2.5 py-1 rounded-full border text-[11px] font-bold transition-all whitespace-nowrap ${
                    isActive
                      ? 'border-[#ff5e2a] bg-[#ff5e2a]/15 text-white'
                      : 'border-white/10 bg-white/[0.03] text-white/70 hover:text-white hover:border-[#ff5e2a]/40 hover:bg-[#ff5e2a]/[0.06]'
                  }`}
                >
                  {getCategoryDisplay(label)}
                </Link>
              );
            })}
            {!isDefaultBrowse && (
              <button
                type="button"
                onClick={() => { setSelectedCategory(initialCountry || 'All'); setSelectedCountry('All'); setSearchQuery(''); setSelectedSort('newest'); }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-white/15 bg-white/[0.06] text-[11px] font-bold text-white/80 hover:text-white hover:border-white/30 transition-all whitespace-nowrap"
                aria-label={t('groups.resetFilters')}
              >
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                {t('groups.resetFilters')}
              </button>
            )}
          </nav>
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
            href={lp('/ofsearch')}
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
              {showTopGroups && (
                <div className="mb-5 relative rounded-2xl overflow-hidden bg-white">
                  <div className="relative p-3 sm:p-4">
                      {/* Header */}
                      <div className="flex items-baseline gap-2.5 mb-3">
                        <h2 className="text-base font-black text-[#0f172a] leading-none tracking-tight">{t('groups.topGroups')}</h2>
                        <span className="text-[#0f172a] text-xs font-bold">{t('groups.topGroupsDesc')}</span>
                      </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 rounded-2xl p-3 sm:p-4" style={{ background: 'linear-gradient(180deg, #0d1117 0%, #0a0e16 100%)' }}>
                      {(() => {
                        const renderGroupCard = (g: Group, idx: number) => {
                          const tgLink = g.isAdvertisement && g.advertisementUrl
                            ? g.advertisementUrl
                            : g.telegramLink || undefined;
                          return (
                            <GroupCard
                              key={`top-${g._id}-${idx}`}
                              group={g}
                              isIndex={idx}
                              onOpenReviewModal={openReviewModal}
                              onOpenReportModal={openReportModal}
                              isBookmarked={!!bookmarkedMap[g._id]}
                              bookmarkId={bookmarkedMap[g._id] || null}
                              directLink={tgLink}
                            />
                          );
                        };

                        const spots: React.ReactNode[] = [];
                        for (let spot = 0; spot < 4; spot++) {
                          const pick = topSpotPicks[spot];
                          if (!pick) continue;
                          if (pick.kind === 'ad') {
                            spots.push(
                              <AdvertCard
                                key={`spot-${spot}-${pick.campaign._id}`}
                                campaign={pick.campaign}
                                isIndex={spot}
                                shouldPreload={true}
                                onVisible={undefined}
                              />,
                            );
                          } else {
                            spots.push(renderGroupCard(pick.group, spot));
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
                <h2 className="text-2xl md:text-3xl font-black text-[#f5f5f5]">
                  {t('groups.discoverNsfw')}
                </h2>
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
                />

                {isDefaultBrowse && paginationTotalPages > 1 && (
                  <nav
                    aria-label="Groups pagination"
                    className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mt-8 sm:mt-10"
                  >
                    {paginationCurrentPage > 1 && (
                      <Link
                        href={groupsPageHref(paginationCurrentPage - 1)}
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
                          href={groupsPageHref(p)}
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
                        href={groupsPageHref(paginationCurrentPage + 1)}
                        className="px-4 py-2 rounded-xl border border-white/10 bg-white/[0.04] text-sm font-bold text-white/80 hover:border-[#ff5e2a]/40 hover:text-white transition-colors"
                        rel="next"
                      >
                        {t('groups.nextPage')}
                      </Link>
                    )}
                  </nav>
                )}

                {isDefaultBrowse && paginationCurrentPage === 1 && (
                  <GroupsEditorialSeo />
                )}
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

      <Footer />


      {/* Review Modal */}
      {showReviewModal && selectedGroupForReview && (
        <ReviewModal
          entityName={selectedGroupForReview.name}
          slug={selectedGroupForReview.slug}
          loginRedirectPath={reviewLoginPath}
          onClose={() => {
            setShowReviewModal(false);
            setSelectedGroupForReview(null);
          }}
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
