'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bookmark, ExternalLink, MapPin, Search, SlidersHorizontal } from 'lucide-react';
import {
  profilePremiumSearchCreators,
  advancedSearchCreators,
  hubBrowseCreators,
  getTopClickedOnlyfansCreators,
  type ProfilePremiumPriceFilter,
} from '@/lib/actions/ofCreatorsBrowse';
import { getNearMeCreators } from '@/lib/actions/userProfile';
import { getNearMeCreatorsPublic, getNearMeByPlaceSlug, getVisitorNearMeLocation } from '@/lib/actions/nearMeCreators';
import { getFreeOnlyfansCreators } from '@/lib/actions/freeOnlyfansCreators';
import { getSearchResultFeaturedCampaigns, trackClick as trackCampaignClick } from '@/lib/actions/campaigns';
import { countryCodeToFlag, parseCity } from '@/lib/utils/geo';
import { nearMeAreaLabel as formatNearMeAreaLabel } from '@/lib/tags/nearMeMatch';
import { useTranslation } from '@/lib/i18n/client';
import { OfSearchResultsViewToggle } from './ProfileGridDensityToggle';
import { ProfileHeading } from './ProfileTypography';
import type { ProfileThemeTokens } from './profileTheme';
import {
  loadOfSearchResultsView,
  type OfSearchResultsView,
} from './profileGridDensity';
import OnlyFansHeroFilterPanel from '@/app/onlyfanssearch/OnlyFansHeroFilterPanel';
import { ofCreatorProfileUrl, onlyFansExternalUrl } from '@/lib/onlyfanssearch/creatorUrls';

function readCountryCookie(): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const m = document.cookie.match(/(?:^|;\s*)__ero_cc=([A-Za-z]{2})/);
  return m ? m[1].toUpperCase() : undefined;
}

interface CreatorResult {
  _id: string;
  name: string;
  username: string;
  slug: string;
  avatar: string;
  likesCount: number;
  photosCount?: number;
  videosCount?: number;
  mediaCount?: number;
  isFree: boolean;
  price: number;
  instagramUrl?: string;
  instagramUsername?: string;
  joinDate?: string;
  createdAt?: string;
  bio?: string;
  url?: string;
}

function bioSnippet(bio?: string, max = 72): string {
  const text = bio?.replace(/\s+/g, ' ').trim();
  if (!text) return '';
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()}…`;
}

function isFreeCreator(creator: { isFree?: boolean; price?: number }) {
  return Boolean(creator.isFree || creator.price === 0);
}

interface ProfileOFPremiumSearchProps {
  tokens: ProfileThemeTokens;
  isPremium: boolean;
  onUpgrade?: () => void;
  upgradeHref?: string;
  savedCreatorIds: Set<string>;
  onToggleSave: (creatorId: string) => void;
  /** Profile masthead typography; omit on other pages */
  profileHeading?: boolean;
  /** Skip premium gate (e.g. /onlyfanssearch hero) */
  freeAccess?: boolean;
  hideHeading?: boolean;
  initialQuery?: string;
  onActiveChange?: (active: boolean) => void;
  loginRedirect?: string;
  /** Compact centered layout with collapsible filters (/onlyfans hero) */
  layout?: 'profile' | 'hero';
  /** Hero only: Near me + price + likes + Instagram filters only */
  minimalFilters?: boolean;
  /** Server-detected ISO country for Near me flag */
  initialVisitorCountry?: string;
  /** Server-detected city for Near me banner */
  initialVisitorCity?: string;
  /** Link target for Near me on /onlyfans hub */
  nearMeHref?: string;
  /** Dedicated /onlyfanssearch/near-me page */
  nearMePage?: boolean;
  /** Server area label for near-me page banner */
  initialNearMeAreaLabel?: string;
  /** Chosen country/state slug on /onlyfanssearch/near-me */
  nearMePlaceSlug?: string;
  /** White hero surface (/onlyfans main) */
  heroLightBg?: boolean;
  /** Link target for Best Free on /onlyfans hub */
  bestFreeHref?: string;
  /** Link target for OnlyFans Models hub (/best) */
  bestModelsHref?: string;
  /** Dedicated /best — top clicked models */
  bestModelsPage?: boolean;
  /** Dedicated free hub /onlyfanssearch/best or free category /onlyfanssearch/best/free-{cat} */
  freeOnlyPage?: boolean;
  freeCategorySlug?: string;
  freeCategoryLabel?: string;
  /** Search submits to this hub (e.g. category browse pages) */
  searchHubHref?: string;
  /** Hide inline results grid — browse pages render their own listing */
  hideResults?: boolean;
  /** Single-line search for profile headers (redirects to hub on submit) */
  compactInline?: boolean;
  /** Narrow rail/card: 2-col nav grid, tighter input (profile sidebar) */
  compactBlock?: boolean;
  /** Hub search feed — paid featured OF creators (of-search-featured + keyword of-cat) */
  paidFeatured?: any[];
}

const MEDIA_THRESHOLDS = [0, 20, 50, 100, 500];
const JOIN_WITHIN_DAYS = [0, 30, 90, 365] as const;
const SEARCH_FEED_FEATURED_EVERY = 5;
const EMPTY_PAID_FEATURED: any[] = [];
const MOSAIC_RESULTS_GRID = 'grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5';

function searchFeedPlacement(idx: number) {
  return idx >= 0 ? `of-search-featured:v${idx}` : 'of-search-featured';
}

function formatFeaturedLikes(n: number) {
  if (!n) return '';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return `${n}`;
}

function isCreatorLiveNow(start: number, end: number): boolean {
  if (start < 0 || end < 0) return false;
  const gmtHour = new Date().getUTCHours();
  if (start <= end) return gmtHour >= start && gmtHour < end;
  return gmtHour >= start || gmtHour < end;
}

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

const HERO_OF_BTN =
  'inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-3.5 rounded-xl border-2 border-[#0099db] font-black text-[11px] sm:text-[12px] uppercase tracking-wide text-white bg-[#00AFF0] shadow-[4px_4px_0_0_#0099db] hover:bg-[#0099db] hover:shadow-[2px_2px_0_0_#0099db] hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] transition-all whitespace-nowrap';

const CREATOR_PROFILE_ICON_BTN =
  'shrink-0 w-9 h-9 rounded-xl bg-[#0084BD] text-white flex items-center justify-center shadow-lg border border-[#0084BD] hover:bg-[#0070A3] transition-colors';

const HERO_NEO_BLUE_BTN =
  'inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-3.5 rounded-xl border-[2.5px] border-black font-black text-[11px] sm:text-[12px] uppercase tracking-wide text-white bg-[#005a8c] shadow-[4px_4px_0_0_#000] hover:bg-[#006da8] hover:shadow-[2px_2px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] transition-all whitespace-nowrap';

const NEO_BRUTAL_BTN =
  'inline-flex items-center gap-1.5 px-2.5 sm:px-3.5 py-3 rounded-xl border-2 border-black font-black text-[11px] uppercase tracking-wide shadow-[4px_4px_0_0_#000] hover:shadow-[2px_2px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] transition-all';

const HERO_COMPACT_NEO_BTN =
  'inline-flex items-center justify-center gap-1 w-full min-w-0 px-2 py-2 rounded-lg border-[1.5px] border-black font-bold text-[10px] uppercase tracking-wide text-white bg-[#005a8c] shadow-[2px_2px_0_0_#000] hover:bg-[#006da8] active:translate-x-px active:translate-y-px active:shadow-[1px_1px_0_0_#000] transition-all';

const HERO_COMPACT_BRUTAL_BTN =
  'inline-flex items-center justify-center gap-1 w-full min-w-0 px-2 py-2 rounded-lg border-[1.5px] border-black font-bold text-[10px] uppercase tracking-wide shadow-[2px_2px_0_0_#000] active:translate-x-px active:translate-y-px active:shadow-[1px_1px_0_0_#000] transition-all';

type LikesSort = 'default' | 'asc' | 'desc';

function creatorMediaTotal(c: CreatorResult): number {
  if (c.mediaCount && c.mediaCount > 0) return c.mediaCount;
  return (c.photosCount || 0) + (c.videosCount || 0);
}

function hasInstagramProfile(c: CreatorResult): boolean {
  return Boolean(c.instagramUrl?.trim() || c.instagramUsername?.trim());
}

function withinAddedDays(c: CreatorResult, days: number): boolean {
  if (days <= 0) return true;
  const raw = c.createdAt;
  if (!raw) return false;
  const added = new Date(raw);
  if (Number.isNaN(added.getTime())) return false;
  return added.getTime() >= Date.now() - days * 86400000;
}

function applyPremiumFilters(
  list: CreatorResult[],
  price: ProfilePremiumPriceFilter,
  minMedia: number,
  minPrice: string,
  maxPrice: string,
  instagramOnly: boolean,
  joinWithinDays: number,
): CreatorResult[] {
  let out = list;

  if (price === 'free') out = out.filter((c) => c.isFree || c.price === 0);
  else if (price === 'paid') out = out.filter((c) => !c.isFree && c.price > 0);

  if (price === 'paid') {
    const min = parseFloat(minPrice);
    const max = parseFloat(maxPrice);
    if (Number.isFinite(min) && min > 0) out = out.filter((c) => c.price >= min);
    if (Number.isFinite(max) && max > 0) out = out.filter((c) => c.price <= max);
  }

  if (minMedia > 0) out = out.filter((c) => creatorMediaTotal(c) >= minMedia);
  if (instagramOnly) out = out.filter(hasInstagramProfile);
  if (joinWithinDays > 0) out = out.filter((c) => withinAddedDays(c, joinWithinDays));

  return out;
}

function joinLabel(value: number, t: (key: string) => string): string {
  if (value === 0) return t('ofSearch.joinDate');
  if (value === 30) return t('ofSearch.join30d');
  if (value === 90) return t('ofSearch.join90d');
  if (value === 365) return t('ofSearch.join1y');
  return `${value}d`;
}

function mediaLabel(value: number, allLabel: string): string {
  if (value === 0) return allLabel;
  return `${value}+`;
}

function OfButtonLoader() {
  return (
    <span className="inline-flex items-center gap-1" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-current animate-bounce"
          style={{ animationDelay: `${i * 120}ms`, animationDuration: '0.65s' }}
        />
      ))}
    </span>
  );
}

function OfResultsSkeleton({ count, hero, hoverBg, feed }: { count: number; hero?: boolean; hoverBg?: string; feed?: boolean }) {
  if (feed) {
    return (
      <>
        {Array.from({ length: count }, (_, i) => (
          <div
            key={i}
            className="w-full max-w-lg mx-auto rounded-2xl overflow-hidden border border-[#00AFF0]/20 bg-[#00AFF0]/[0.07] animate-pulse"
          >
            <div className="flex items-center gap-2.5 px-3 py-2.5">
              <div className="w-9 h-9 rounded-full bg-[#00AFF0]/20" />
              <div className="flex-1 space-y-1">
                <div className="h-3 w-24 rounded bg-[#00AFF0]/20" />
                <div className="h-2.5 w-16 rounded bg-[#00AFF0]/15" />
              </div>
            </div>
            <div className="aspect-[4/5] bg-[#00AFF0]/10" />
            <div className="p-3 space-y-2">
              <div className="h-2.5 w-full rounded bg-[#00AFF0]/15" />
              <div className="h-9 rounded-xl bg-[#00AFF0]/20" />
            </div>
          </div>
        ))}
      </>
    );
  }
  if (hero) {
    return (
      <>
        {Array.from({ length: count }, (_, i) => (
          <div
            key={i}
            className="aspect-[3/4] rounded-xl overflow-hidden border border-[#00AFF0]/20 bg-[#00AFF0]/[0.07] relative"
          >
            <div className="absolute inset-0 animate-[shimmer_1.35s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-[#00AFF0]/30 to-transparent" />
            <div className="absolute bottom-0 inset-x-0 h-1/3 bg-gradient-to-t from-[#00AFF0]/10 to-transparent" />
          </div>
        ))}
      </>
    );
  }
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="aspect-[3/4] rounded-xl animate-pulse"
          style={{ backgroundColor: hoverBg }}
        />
      ))}
    </>
  );
}

function pillClass(active: boolean) {
  return `shrink-0 px-2 py-1 rounded-md text-[10px] font-bold tracking-wide uppercase border transition-opacity hover:opacity-90 whitespace-nowrap`;
}

export default function ProfileOFPremiumSearch({
  tokens,
  isPremium,
  onUpgrade,
  upgradeHref,
  savedCreatorIds,
  onToggleSave,
  profileHeading = false,
  freeAccess = false,
  hideHeading = false,
  initialQuery = '',
  onActiveChange,
  loginRedirect = '/onlyfanssearch',
  layout = 'profile',
  minimalFilters = false,
  initialVisitorCountry = '',
  initialVisitorCity = '',
  nearMeHref,
  nearMePage = false,
  initialNearMeAreaLabel = '',
  nearMePlaceSlug,
  heroLightBg = false,
  bestFreeHref,
  bestModelsHref,
  bestModelsPage = false,
  freeOnlyPage = false,
  freeCategorySlug,
  freeCategoryLabel = '',
  searchHubHref,
  hideResults = false,
  compactInline = false,
  compactBlock = false,
  paidFeatured = EMPTY_PAID_FEATURED,
}: ProfileOFPremiumSearchProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const isHero = layout === 'hero';
  const isCompactBlock = compactBlock && isHero && minimalFilters;
  const canUse = freeAccess || isPremium;
  const [detectedPremium, setDetectedPremium] = useState(false);
  const canUsePremiumFilters = isPremium || detectedPremium;

  useEffect(() => {
    if (isPremium) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.premium) setDetectedPremium(true);
      })
      .catch(() => {});
  }, [isPremium]);
  const [query, setQuery] = useState(initialQuery);
  const [priceFilter, setPriceFilter] = useState<ProfilePremiumPriceFilter>('all');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minMedia, setMinMedia] = useState(0);
  const [likesSort, setLikesSort] = useState<LikesSort>('default');
  const [instagramOnly, setInstagramOnly] = useState(false);
  const [joinWithinDays, setJoinWithinDays] = useState(0);
  const [rawResults, setRawResults] = useState<CreatorResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [resultsView, setResultsView] = useState<OfSearchResultsView>('grid');

  useEffect(() => {
    setResultsView(loadOfSearchResultsView());
  }, []);

  const [nearMeActive, setNearMeActive] = useState(false);
  const [nearMeAreaLabel, setNearMeAreaLabel] = useState('');
  const [visitorCountry, setVisitorCountry] = useState(
    () => initialVisitorCountry || readCountryCookie() || '',
  );
  const [visitorCity, setVisitorCity] = useState(
    () => parseCity(initialVisitorCity) || initialVisitorCity || '',
  );
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const searchGen = useRef(0);
  const runSearchRef = useRef<(freshSeed?: string, qOverride?: string) => Promise<void>>(async () => {});
  const shownVariantRef = useRef<Record<string, number>>({});
  const [feedFeatured, setFeedFeatured] = useState<any[]>(paidFeatured);
  const resultsRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [nearMeHasMore, setNearMeHasMore] = useState(false);
  const [freeOnlyHasMore, setFreeOnlyHasMore] = useState(false);
  const [bestModelsHasMore, setBestModelsHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    onActiveChange?.(searched || nearMeActive);
  }, [searched, nearMeActive, onActiveChange]);

  useEffect(() => {
    if (paidFeatured.length) setFeedFeatured(paidFeatured);
  }, [paidFeatured]);

  const loadFeedFeatured = useCallback(async (q: string) => {
    try {
      const list = await getSearchResultFeaturedCampaigns(q, 8);
      setFeedFeatured(list.length ? list : paidFeatured);
    } catch {
      setFeedFeatured(paidFeatured);
    }
  }, [paidFeatured]);

  useEffect(() => {
    if (!isHero || !minimalFilters) return;
    const token = localStorage.getItem('token');
    const hint = readCountryCookie();
    getVisitorNearMeLocation(hint, token || undefined).then((loc) => {
      if (loc.countryCode) setVisitorCountry(loc.countryCode);
      const city = parseCity(loc.city) || loc.city;
      if (city) setVisitorCity(city);
    });
  }, [isHero, minimalFilters]);

  const visitorFlag = countryCodeToFlag(visitorCountry);
  const nearMeBannerLabel = nearMePage
    ? nearMeAreaLabel || formatNearMeAreaLabel(visitorCountry, visitorCity)
    : nearMeAreaLabel || initialNearMeAreaLabel;

  const openLogin = useCallback(() => {
    window.open(`/join-erogram?redirect=${encodeURIComponent(loginRedirect)}`, '_blank', 'noopener,noreferrer');
  }, [loginRedirect]);

  const requirePremiumForFilter = useCallback(() => {
    if (canUsePremiumFilters) return;
    if (onUpgrade) onUpgrade();
    else openLogin();
  }, [canUsePremiumFilters, onUpgrade, openLogin]);

  const heroGridWrap = isHero ? `max-w-7xl mx-auto ${nearMePage || freeOnlyPage || bestModelsPage ? 'mt-10' : 'mt-4'}` : '';

  const runNearMe = useCallback(async () => {
    if (!canUse) return;
    if (!freeAccess) {
      const token = localStorage.getItem('token');
      if (!token) {
        openLogin();
        return;
      }
    }
    const gen = ++searchGen.current;
    setLoading(true);
    setNearMeActive(true);
    setQuery('');
    setNearMeHasMore(false);
    if (!nearMePage) setNearMeAreaLabel('');
    try {
      const res = freeAccess
        ? nearMePlaceSlug
          ? await getNearMeByPlaceSlug(nearMePlaceSlug, String(Date.now()))
          : await getNearMeCreatorsPublic(
              String(Date.now()),
              readCountryCookie(),
              localStorage.getItem('token') || undefined,
            )
        : await getNearMeCreators(localStorage.getItem('token')!, String(Date.now()));
      if (gen !== searchGen.current) return;
      if (!res.ok) return;
      setRawResults(res.creators as CreatorResult[]);
      setNearMeAreaLabel(res.areaLabel || '');
      setNearMeHasMore(!!('hasMore' in res && res.hasMore));
      setSearched(true);
      void loadFeedFeatured('near me');
      requestAnimationFrame(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    } catch {
      setNearMeActive(false);
      setSearched(false);
    } finally {
      if (gen === searchGen.current) setLoading(false);
    }
  }, [canUse, freeAccess, openLogin, nearMePage, nearMePlaceSlug, loadFeedFeatured]);

  const runFreeOnly = useCallback(async () => {
    if (!canUse || !freeAccess) return;
    const gen = ++searchGen.current;
    setLoading(true);
    setNearMeActive(false);
    setNearMeAreaLabel('');
    setQuery('');
    setFreeOnlyHasMore(false);
    try {
      const res = await getFreeOnlyfansCreators([], undefined, freeCategorySlug);
      if (gen !== searchGen.current) return;
      if (!res.ok) return;
      setRawResults(res.creators as CreatorResult[]);
      setFreeOnlyHasMore(!!res.hasMore);
      setSearched(true);
      void loadFeedFeatured(freeCategorySlug || 'free');
    } catch {
      setSearched(false);
    } finally {
      if (gen === searchGen.current) setLoading(false);
    }
  }, [canUse, freeAccess, freeCategorySlug, loadFeedFeatured]);

  const loadMoreFreeOnly = useCallback(async () => {
    if (!freeOnlyPage || !freeAccess || loadingMore || !freeOnlyHasMore || loading) return;
    setLoadingMore(true);
    try {
      const exclude = rawResults.map((c) => c.username);
      const res = await getFreeOnlyfansCreators(exclude, undefined, freeCategorySlug);
      if (!res.ok) {
        setFreeOnlyHasMore(false);
        return;
      }
      if (res.creators.length) {
        setRawResults((prev) => [...prev, ...(res.creators as CreatorResult[])]);
      }
      setFreeOnlyHasMore(!!res.hasMore);
    } finally {
      setLoadingMore(false);
    }
  }, [freeOnlyPage, freeAccess, loadingMore, freeOnlyHasMore, loading, rawResults, freeCategorySlug]);

  const runBestModels = useCallback(async () => {
    if (!canUse || !freeAccess) return;
    const gen = ++searchGen.current;
    setLoading(true);
    setNearMeActive(false);
    setNearMeAreaLabel('');
    setQuery('');
    setBestModelsHasMore(false);
    try {
      const res = await getTopClickedOnlyfansCreators([]);
      if (gen !== searchGen.current) return;
      if (!res.ok) return;
      setRawResults(res.creators as CreatorResult[]);
      setBestModelsHasMore(!!res.hasMore);
      setSearched(true);
      void loadFeedFeatured('best');
    } catch {
      setSearched(false);
    } finally {
      if (gen === searchGen.current) setLoading(false);
    }
  }, [canUse, freeAccess, loadFeedFeatured]);

  const loadMoreBestModels = useCallback(async () => {
    if (!bestModelsPage || !freeAccess || loadingMore || !bestModelsHasMore || loading) return;
    setLoadingMore(true);
    try {
      const exclude = rawResults.map((c) => c.username);
      const res = await getTopClickedOnlyfansCreators(exclude);
      if (!res.ok) {
        setBestModelsHasMore(false);
        return;
      }
      if (res.creators.length) {
        setRawResults((prev) => [...prev, ...(res.creators as CreatorResult[])]);
      }
      setBestModelsHasMore(!!res.hasMore);
    } finally {
      setLoadingMore(false);
    }
  }, [bestModelsPage, freeAccess, loadingMore, bestModelsHasMore, loading, rawResults]);

  const loadMoreNearMe = useCallback(async () => {
    if (!nearMePage || !freeAccess || loadingMore || !nearMeHasMore || loading) return;
    setLoadingMore(true);
    try {
      const exclude = rawResults.map((c) => c.username);
      const res = nearMePlaceSlug
        ? await getNearMeByPlaceSlug(nearMePlaceSlug, String(Date.now()), exclude)
        : await getNearMeCreatorsPublic(
            String(Date.now()),
            readCountryCookie(),
            localStorage.getItem('token') || undefined,
            exclude,
          );
      if (!res.ok) {
        setNearMeHasMore(false);
        return;
      }
      if (res.creators.length) {
        setRawResults((prev) => [...prev, ...(res.creators as CreatorResult[])]);
      }
      setNearMeHasMore(!!res.hasMore);
    } finally {
      setLoadingMore(false);
    }
  }, [nearMePage, freeAccess, loadingMore, nearMeHasMore, loading, rawResults, nearMePlaceSlug]);

  useEffect(() => {
    if (!nearMePage || !nearMeHasMore || loadingMore) return;
    const el = loadMoreRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMoreNearMe();
      },
      { rootMargin: '240px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [nearMePage, nearMeHasMore, loadingMore, loadMoreNearMe, rawResults.length]);

  useEffect(() => {
    if (!freeOnlyPage || !freeOnlyHasMore || loadingMore) return;
    const el = loadMoreRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMoreFreeOnly();
      },
      { rootMargin: '240px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [freeOnlyPage, freeOnlyHasMore, loadingMore, loadMoreFreeOnly, rawResults.length]);

  useEffect(() => {
    if (!bestModelsPage || !bestModelsHasMore || loadingMore) return;
    const el = loadMoreRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMoreBestModels();
      },
      { rootMargin: '240px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [bestModelsPage, bestModelsHasMore, loadingMore, loadMoreBestModels, rawResults.length]);

  useEffect(() => {
    if (!freeOnlyPage || !canUse) return;
    runFreeOnly();
  }, [freeOnlyPage, canUse, runFreeOnly, freeCategorySlug]);

  useEffect(() => {
    if (!bestModelsPage || !canUse) return;
    runBestModels();
  }, [bestModelsPage, canUse, runBestModels]);

  useEffect(() => {
    if (!nearMePage || !canUse) return;
    runNearMe();
  }, [nearMePage, canUse, nearMePlaceSlug, runNearMe]);

  const runHubBrowse = useCallback(async (freshSeed?: string, qOverride?: string, catOverride?: string | null) => {
    if (!canUse) return;

    const trimmed = (qOverride ?? query).trim();
    const category = catOverride !== undefined ? catOverride : selectedCategory;
    const hasFilters =
      !!category ||
      priceFilter !== 'all' ||
      (canUsePremiumFilters && instagramOnly) ||
      (canUsePremiumFilters && joinWithinDays > 0);

    if (!trimmed && !hasFilters) {
      setRawResults((prev) => (prev.length === 0 ? prev : []));
      setSearched((prev) => (prev ? false : prev));
      return;
    }

    const gen = ++searchGen.current;
    setLoading(true);
    setNearMeActive(false);
    setNearMeAreaLabel('');
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') || undefined : undefined;
    try {
      const res = await hubBrowseCreators(
        {
          nicheGroups: category ? [[category]] : [],
          price: priceFilter,
          hasInstagram: canUsePremiumFilters && instagramOnly ? true : undefined,
          joinWithinDays: canUsePremiumFilters && joinWithinDays > 0 ? joinWithinDays : undefined,
          query: trimmed || undefined,
        },
        freshSeed || String(Date.now()),
        token,
      );
      if (gen !== searchGen.current) return;
      setRawResults(res.creators as CreatorResult[]);
      setSearched(true);
      if (trimmed) loadFeedFeatured(trimmed);
      else if (paidFeatured.length) setFeedFeatured(paidFeatured);
      if (category) {
        requestAnimationFrame(() => {
          resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      }
    } finally {
      if (gen === searchGen.current) setLoading(false);
    }
  }, [canUse, canUsePremiumFilters, query, selectedCategory, priceFilter, instagramOnly, joinWithinDays, loadFeedFeatured, paidFeatured]);

  const runSearch = useCallback(async (freshSeed?: string, qOverride?: string) => {
    if (isHero && minimalFilters) {
      await runHubBrowse(freshSeed, qOverride);
      return;
    }

    const trimmed = (qOverride ?? query).trim();
    if (!trimmed || !canUse) return;

    const gen = ++searchGen.current;

    setLoading(true);
    setNearMeActive(false);
    setNearMeAreaLabel('');
    try {
      if (freeAccess) {
        const token = localStorage.getItem('token') || undefined;
        const res = await advancedSearchCreators(trimmed, freshSeed || 'default', {
          hasInstagram: canUsePremiumFilters && instagramOnly ? true : undefined,
          joinWithinDays: canUsePremiumFilters && joinWithinDays > 0 ? joinWithinDays : undefined,
        }, token);
        if (gen !== searchGen.current) return;
        if (!res.ok) return;
        setRawResults(res.creators as CreatorResult[]);
        setSearched(true);
        return;
      }

      const token = localStorage.getItem('token');
      if (!token) return;

      const res = await profilePremiumSearchCreators(token, trimmed, freshSeed || 'default', {
        hasInstagram: instagramOnly,
        joinWithinDays: joinWithinDays > 0 ? joinWithinDays : undefined,
      });
      if (gen !== searchGen.current) return;
      if (!res.ok) return;
      setRawResults(res.creators as CreatorResult[]);
      setSearched(true);
    } finally {
      if (gen === searchGen.current) setLoading(false);
    }
  }, [query, canUse, canUsePremiumFilters, freeAccess, instagramOnly, joinWithinDays, isHero, minimalFilters, runHubBrowse]);

  const runHubBrowseRef = useRef(runHubBrowse);
  runHubBrowseRef.current = runHubBrowse;
  runSearchRef.current = runSearch;

  useEffect(() => {
    if (!isHero || !minimalFilters || !canUse || hideResults) return;

    const hasFilters =
      !!selectedCategory ||
      priceFilter !== 'all' ||
      (canUsePremiumFilters && instagramOnly) ||
      (canUsePremiumFilters && joinWithinDays > 0);

    if (!hasFilters) return;

    const timer = setTimeout(() => {
      runHubBrowseRef.current(String(Date.now()));
    }, 120);

    return () => clearTimeout(timer);
  }, [hideResults, isHero, minimalFilters, canUse, canUsePremiumFilters, priceFilter, instagramOnly, joinWithinDays, selectedCategory]);

  useEffect(() => {
    if (!canUse) return;
    const trimmedQ = initialQuery.trim();

    if (!trimmedQ) {
      if (isHero && minimalFilters) {
        setRawResults((prev) => (prev.length === 0 ? prev : []));
        setSearched((prev) => (prev ? false : prev));
        setSelectedCategory((prev) => (prev === null ? prev : null));
      }
      return;
    }
    setQuery(initialQuery);
    runSearchRef.current(String(Date.now()), trimmedQ);
  }, [initialQuery, canUse, isHero, minimalFilters]);

  const results = useMemo(() => {
    let list =
      isHero && minimalFilters
        ? rawResults
        : applyPremiumFilters(rawResults, priceFilter, minMedia, minPrice, maxPrice, instagramOnly, joinWithinDays);
    if (likesSort === 'asc') {
      list = [...list].sort((a, b) => a.likesCount - b.likesCount);
    } else if (likesSort === 'desc') {
      list = [...list].sort((a, b) => b.likesCount - a.likesCount);
    }
    return list;
  }, [rawResults, priceFilter, minMedia, minPrice, maxPrice, likesSort, instagramOnly, joinWithinDays, isHero, minimalFilters]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (compactInline || (isHero && minimalFilters)) {
      const hub = searchHubHref || loginRedirect || '/onlyfanssearch';
      if ((hideResults || compactInline) && trimmed) {
        router.push(`${hub}?q=${encodeURIComponent(trimmed)}`);
        return;
      }
      const url = trimmed ? `${hub}?q=${encodeURIComponent(trimmed)}` : hub;
      router.push(url);
      if (trimmed) {
        runSearch(String(Date.now()), trimmed);
      } else {
        setRawResults([]);
        setSearched(false);
      }
      return;
    }
    runSearch(String(Date.now()));
  };

  const clearFilters = useCallback(() => {
    setPriceFilter('all');
    setMinPrice('');
    setMaxPrice('');
    setMinMedia(0);
    setLikesSort('default');
    setInstagramOnly(false);
    setJoinWithinDays(0);
    setSelectedCategory(null);
    setNearMeActive(false);
    setNearMeAreaLabel('');
    setRawResults([]);
    setSearched(false);
  }, []);

  const selectCategory = useCallback(
    (slug: string) => {
      const categoryBase = searchHubHref || '/onlyfanssearch';
      if (selectedCategory === slug) {
        setSelectedCategory(null);
        router.push(loginRedirect || categoryBase);
        setRawResults([]);
        setSearched(false);
        return;
      }
      setSelectedCategory(slug);
      setFiltersOpen(false);
      router.push(`${categoryBase}/${slug}`);
    },
    [selectedCategory, loginRedirect, searchHubHref, router],
  );

  const pillStyle = (active: boolean) => ({
    borderColor: tokens.border,
    backgroundColor: active ? tokens.accent : tokens.hover,
    color: active ? tokens.ink : tokens.text,
  });

  const inputStyle = {
    backgroundColor: tokens.hover,
    borderColor: tokens.border,
    color: tokens.text,
  };

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (priceFilter !== 'all') n++;
    if (minPrice.trim() || maxPrice.trim()) n++;
    if (minMedia > 0) n++;
    if (likesSort !== 'default') n++;
    if (instagramOnly) n++;
    if (joinWithinDays > 0) n++;
    if (selectedCategory) n++;
    if (nearMeActive && !minimalFilters) n++;
    return n;
  }, [priceFilter, minPrice, maxPrice, minMedia, likesSort, instagramOnly, joinWithinDays, selectedCategory, nearMeActive, minimalFilters]);

  const toolbar = canUse ? (
    <div className={`flex items-center gap-2 flex-wrap ${isHero ? 'justify-center mb-3' : 'mt-3'}`}>
      <OfSearchResultsViewToggle
        value={resultsView}
        onChange={setResultsView}
        tokens={{
          pillBorder: tokens.border,
          pillBg: tokens.hover,
          viewBtnBg: tokens.accent,
          viewBtnTxt: tokens.ink,
          accentDim: tokens.muted,
        }}
      />
    </div>
  ) : null;

  const filterPills = (
    <div
      className={`flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none ${isHero ? 'flex-wrap justify-center' : 'mb-4'}`}
      style={{ scrollbarWidth: 'none' }}
    >
      {!minimalFilters && (
        <>
          <button
            type="button"
            onClick={() => runNearMe()}
            className={pillClass(nearMeActive)}
            style={pillStyle(nearMeActive)}
          >
            Near me
          </button>

          <span className="w-px h-4 shrink-0 mx-0.5" style={{ backgroundColor: tokens.border }} />
        </>
      )}

      {(['all', 'free', 'paid'] as const).map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => {
            setPriceFilter(key);
            if (key !== 'paid') {
              setMinPrice('');
              setMaxPrice('');
            }
          }}
          className={pillClass(priceFilter === key)}
          style={pillStyle(priceFilter === key)}
        >
          {t(`ofSearch.${key}`)}
        </button>
      ))}

      {!minimalFilters && priceFilter === 'paid' && (
        <div className="flex items-center gap-1 shrink-0 ml-0.5">
          <span className="text-[10px] font-bold" style={{ color: tokens.muted }}>$</span>
          <input
            type="number"
            min={0}
            step={1}
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            placeholder="min"
            className="w-11 px-1.5 py-1 rounded-md border text-[10px] focus:outline-none focus:ring-1 focus:ring-[#00AFF0]/40"
            style={inputStyle}
          />
          <span className="text-[10px]" style={{ color: tokens.muted }}>-</span>
          <input
            type="number"
            min={0}
            step={1}
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            placeholder="max"
            className="w-11 px-1.5 py-1 rounded-md border text-[10px] focus:outline-none focus:ring-1 focus:ring-[#00AFF0]/40"
            style={inputStyle}
          />
        </div>
      )}

      <span className="w-px h-4 shrink-0 mx-0.5" style={{ backgroundColor: tokens.border }} />

      <button
        type="button"
        onClick={() =>
          setLikesSort((s) => (s === 'default' ? 'asc' : s === 'asc' ? 'desc' : 'default'))
        }
        className={pillClass(likesSort !== 'default')}
        style={pillStyle(likesSort !== 'default')}
      >
        {likesSort === 'asc'
          ? t('ofSearch.leastLikes')
          : likesSort === 'desc'
            ? t('ofSearch.mostLikes')
            : t('ofSearch.likes')}
      </button>

      <span className="w-px h-4 shrink-0 mx-0.5" style={{ backgroundColor: tokens.border }} />

      <button
        type="button"
        onClick={() => {
          if (!canUsePremiumFilters) {
            requirePremiumForFilter();
            return;
          }
          setInstagramOnly((v) => !v);
        }}
        className={pillClass(instagramOnly)}
        style={pillStyle(instagramOnly)}
      >
        {t('ofSearch.hasInstagram')}
      </button>

      {!minimalFilters && (
        <>
          <span className="w-px h-4 shrink-0 mx-0.5" style={{ backgroundColor: tokens.border }} />

          {JOIN_WITHIN_DAYS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                if (value !== 0 && !canUsePremiumFilters) {
                  requirePremiumForFilter();
                  return;
                }
                setJoinWithinDays(value);
              }}
              className={pillClass(joinWithinDays === value && value !== 0)}
              style={pillStyle(joinWithinDays === value && value !== 0)}
            >
              {joinLabel(value, t)}
            </button>
          ))}

          <span className="w-px h-4 shrink-0 mx-0.5" style={{ backgroundColor: tokens.border }} />

          {MEDIA_THRESHOLDS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setMinMedia(value)}
              className={pillClass(minMedia === value)}
              style={pillStyle(minMedia === value)}
            >
              {mediaLabel(value, t('ofSearch.all'))}
            </button>
          ))}
        </>
      )}
    </div>
  );

  if (compactInline) {
    if (!canUse) {
      return (
        <section className="w-full">
          <a
            href={upgradeHref || '#'}
            className="block w-full py-2 px-3 rounded-lg border border-white/15 bg-white/[0.06] text-center text-xs font-bold text-white/60"
          >
            Premium search
          </a>
        </section>
      );
    }
    return (
      <section className="w-full">
        <form onSubmit={handleSubmit} className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('ofSearch.searchPlaceholder')}
            className="w-full pl-9 pr-10 py-2 rounded-lg border border-white/15 bg-white/[0.06] text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-[#00AFF0]/50 focus:ring-1 focus:ring-[#00AFF0]/30"
          />
          <button
            type="submit"
            disabled={loading}
            aria-label={t('common.search')}
            aria-busy={loading}
            className={`absolute right-1 top-1/2 -translate-y-1/2 flex items-center justify-center w-7 h-7 rounded-md bg-[#00AFF0] text-white hover:bg-[#009dd9] transition-colors ${loading ? 'opacity-70 cursor-wait' : 'disabled:opacity-50'}`}
          >
            {loading ? <OfButtonLoader /> : <Search size={14} strokeWidth={2.5} />}
          </button>
        </form>
      </section>
    );
  }

  const heroNavBtn = isCompactBlock
    ? HERO_COMPACT_NEO_BTN
    : heroLightBg
      ? HERO_OF_BTN
      : HERO_NEO_BLUE_BTN;

  return (
    <section className={hideHeading && !isHero ? '' : isHero ? (isCompactBlock ? '' : 'mb-2') : 'mb-10'}>
      {!hideHeading && !isHero && (
      <div className="border-b pb-4 mb-5" style={{ borderColor: tokens.border }}>
        {profileHeading ? (
          <ProfileHeading size="md" as="h3" className="!mt-0">
            Premium OF Search
          </ProfileHeading>
        ) : (
          <h3 className="text-base sm:text-lg font-black tracking-tight" style={{ color: tokens.text }}>
            Premium OF Search
          </h3>
        )}
        {toolbar}
      </div>
      )}

      {hideHeading && !isHero && canUse && toolbar}

      {!canUse ? (
        <div
          className="rounded-2xl border px-5 py-8 text-center"
          style={{ borderColor: tokens.border, backgroundColor: tokens.hover }}
        >
          <p className="text-sm mb-4" style={{ color: tokens.muted }}>
            Premium only.
          </p>
          {upgradeHref ? (
            <a
              href={upgradeHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-[11px] font-bold tracking-[0.2em] uppercase px-5 py-2.5 rounded-full border transition-opacity hover:opacity-90"
              style={{ borderColor: `${tokens.accent}66`, color: tokens.accent, backgroundColor: tokens.card }}
            >
              View plans
            </a>
          ) : (
            <button
              type="button"
              onClick={onUpgrade}
              className="text-[11px] font-bold tracking-[0.2em] uppercase px-5 py-2.5 rounded-full border transition-opacity hover:opacity-90"
              style={{ borderColor: 'rgba(201,151,58,0.4)', color: '#8a6115', backgroundColor: tokens.card }}
            >
              View plans
            </button>
          )}
        </div>
      ) : (
        <>
          <div className={isHero ? `${isCompactBlock ? 'w-full' : 'max-w-3xl mx-auto w-full'} ${heroLightBg ? 'pt-1 pb-2' : ''}` : undefined}>
            <form onSubmit={handleSubmit} className={`relative ${isHero ? `${nearMePage ? 'mb-2 mt-2' : isCompactBlock ? 'mb-1.5' : 'mb-2'}` : 'mb-3'}`}>
              <div className="relative w-full min-w-0">
                <Search
                  size={isCompactBlock ? 15 : isHero ? 18 : 16}
                  className={`absolute top-1/2 -translate-y-1/2 pointer-events-none ${isCompactBlock ? 'left-3' : 'left-4'}`}
                  style={{ color: isHero && minimalFilters ? '#9ca3af' : tokens.muted }}
                />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('ofSearch.searchPlaceholder')}
                  className={
                    isCompactBlock
                      ? 'w-full pl-9 pr-10 py-2 rounded-lg border-[1.5px] border-black bg-white text-[13px] text-gray-900 placeholder:text-gray-400 shadow-[2px_2px_0_0_#000] focus:outline-none focus:ring-0 focus:border-black'
                      : isHero && minimalFilters
                      ? heroLightBg
                        ? 'w-full h-full pl-11 pr-12 py-3.5 rounded-xl border-2 border-[#00AFF0]/35 bg-white text-[15px] text-gray-900 placeholder:text-gray-400 shadow-[0_4px_14px_-6px_rgba(0,175,240,0.35)] focus:outline-none focus:ring-2 focus:ring-[#00AFF0]/40 focus:border-[#00AFF0]'
                        : 'w-full h-full pl-11 pr-12 py-3.5 rounded-xl border-2 border-black bg-white text-[15px] text-gray-900 placeholder:text-gray-400 shadow-[4px_4px_0_0_#000] focus:outline-none focus:ring-0 focus:border-black'
                      : `w-full pl-10 pr-12 border text-sm focus:outline-none focus:ring-2 focus:ring-[#00AFF0]/40 ${isHero ? 'py-2 rounded-lg text-white placeholder:text-white/40' : 'py-2.5 rounded-xl'}`
                  }
                  style={isHero && minimalFilters && !isCompactBlock ? undefined : isHero && !isCompactBlock ? { ...inputStyle, color: '#ffffff' } : !isCompactBlock ? inputStyle : undefined}
                />
                <button
                  type="submit"
                  disabled={loading}
                  aria-label={t('common.search')}
                  aria-busy={loading}
                  className={
                    isCompactBlock
                      ? `absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center justify-center w-7 h-7 rounded-md bg-[#00AFF0] text-white border-[1.5px] border-black shadow-[1px_1px_0_0_#000] hover:bg-[#0099db] transition-colors ${loading ? 'cursor-wait' : ''}`
                      : isHero && minimalFilters
                      ? heroLightBg
                        ? `absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center w-9 h-9 rounded-lg bg-[#00AFF0] text-white hover:bg-[#0099db] transition-colors ${loading ? 'cursor-wait shadow-[0_0_16px_rgba(0,175,240,0.55)]' : ''}`
                        : `absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center w-9 h-9 rounded-lg bg-[#00AFF0] text-white border-2 border-black shadow-[2px_2px_0_0_#000] hover:bg-[#0099db] transition-colors ${loading ? 'cursor-wait shadow-[0_0_14px_rgba(0,175,240,0.5)]' : ''}`
                      : `absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 rounded-lg text-white transition-opacity hover:opacity-90 ${isHero ? 'bg-[#00AFF0]' : ''} ${loading ? 'cursor-wait opacity-100' : 'disabled:opacity-50'}`
                  }
                  style={!isHero ? { backgroundColor: tokens.accent } : undefined}
                >
                  {loading ? <OfButtonLoader /> : <Search size={isCompactBlock ? 14 : isHero && minimalFilters ? 18 : 16} strokeWidth={2.5} />}
                </button>
              </div>

              {isHero && !minimalFilters && (
                <button
                  type="button"
                  onClick={() => setFiltersOpen((v) => !v)}
                  className="relative shrink-0 inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[11px] font-bold uppercase tracking-wide transition-all hover:opacity-90"
                  style={{
                    borderColor: filtersOpen || activeFilterCount > 0 ? tokens.accent : tokens.border,
                    backgroundColor: filtersOpen ? tokens.accent : tokens.hover,
                    color: filtersOpen ? tokens.ink : tokens.text,
                  }}
                >
                  <SlidersHorizontal size={14} />
                  Filters
                  {activeFilterCount > 0 && (
                    <span
                      className="min-w-[1rem] h-4 px-1 rounded-full text-[9px] font-black leading-4 text-center"
                      style={{
                        backgroundColor: filtersOpen ? tokens.ink : tokens.accent,
                        color: filtersOpen ? tokens.accent : tokens.ink,
                      }}
                    >
                      {activeFilterCount}
                    </span>
                  )}
                </button>
              )}
            </form>

            {isHero && minimalFilters && (
              <div className={isCompactBlock ? 'grid grid-cols-2 gap-1.5 mb-1.5' : 'flex items-stretch gap-2 mb-3'}>
                {nearMeHref ? (
                  <a
                    href={nearMeHref}
                    aria-current={nearMePage ? 'page' : undefined}
                    className={`${heroNavBtn} ${!isCompactBlock ? 'flex-1' : ''} ${
                      nearMePage ? 'ring-2 ring-[#00AFF0] ring-offset-2 ring-offset-[#111111]' : ''
                    }`}
                  >
                    <MapPin size={isCompactBlock ? 12 : 15} strokeWidth={2.5} className="shrink-0" />
                    {nearMePage && visitorFlag ? (
                      <span className={`leading-none shrink-0 ${isCompactBlock ? 'text-xs' : 'text-sm'}`} aria-hidden="true">
                        {visitorFlag}
                      </span>
                    ) : null}
                    <span className="truncate">Near me</span>
                  </a>
                ) : !hideResults ? (
                  <button
                    type="button"
                    onClick={() => runNearMe()}
                    disabled={loading}
                    className={`${heroNavBtn} ${!isCompactBlock ? 'flex-1' : ''} disabled:opacity-50 ${
                      nearMeActive && !heroLightBg && !isCompactBlock ? 'bg-[#0077b6] ring-2 ring-[#00AFF0] ring-offset-2 ring-offset-[#111111]' : ''
                    } ${nearMeActive && heroLightBg ? 'ring-2 ring-[#00AFF0]/50 ring-offset-2 ring-offset-white' : ''}`}
                  >
                    <MapPin size={isCompactBlock ? 12 : 15} strokeWidth={2.5} className="shrink-0" />
                    <span className="truncate">Near me</span>
                  </button>
                ) : null}
                {bestModelsHref ? (
                  <a
                    href={bestModelsHref}
                    aria-current={bestModelsPage ? 'page' : undefined}
                    className={`${heroNavBtn} ${!isCompactBlock ? 'flex-1' : ''} ${
                      bestModelsPage ? 'ring-2 ring-[#00AFF0] ring-offset-2 ring-offset-[#111111]' : ''
                    }`}
                  >
                    <span className="truncate">{isCompactBlock ? 'BEST' : 'BEST MODELS'}</span>
                  </a>
                ) : null}
                {bestFreeHref ? (
                  <a
                    href={bestFreeHref}
                    aria-current={freeOnlyPage ? 'page' : undefined}
                    className={`${heroNavBtn} ${!isCompactBlock ? 'flex-1' : ''} ${
                      freeOnlyPage ? 'ring-2 ring-[#00AFF0] ring-offset-2 ring-offset-[#111111]' : ''
                    }`}
                  >
                    <span className="truncate">Best Free</span>
                  </a>
                ) : null}
                <button
                  type="button"
                  onClick={() => setFiltersOpen((v) => !v)}
                  className={`${!isCompactBlock ? 'flex-1 justify-center' : ''} ${
                    isCompactBlock
                      ? `${HERO_COMPACT_BRUTAL_BTN} ${filtersOpen || activeFilterCount > 0 ? 'bg-[#00AFF0] text-black' : 'bg-white text-black hover:bg-[#f0f9ff]'}`
                      : heroLightBg
                      ? `${HERO_OF_BTN} ${filtersOpen || activeFilterCount > 0 ? 'bg-[#0099db] border-[#0088cc] shadow-[2px_2px_0_0_#0088cc]' : ''}`
                      : `${NEO_BRUTAL_BTN} ${filtersOpen || activeFilterCount > 0 ? 'bg-[#00AFF0] text-black' : 'bg-white text-black hover:bg-[#f0f9ff]'}`
                  }`}
                >
                  <SlidersHorizontal size={isCompactBlock ? 12 : 15} strokeWidth={2.5} />
                  <span>Filters</span>
                  {activeFilterCount > 0 && (
                    <span
                      className={`rounded-md text-center font-black ${
                        isCompactBlock
                          ? 'min-w-[1rem] h-4 px-1 text-[9px] leading-4 border-[1.5px] border-black bg-black text-white'
                          : `min-w-[1.25rem] h-5 px-1.5 text-[10px] leading-[1.1rem] ${
                              heroLightBg
                                ? 'border-2 border-white/90 bg-white/20 text-white'
                                : 'border-2 border-black bg-black text-white'
                            }`
                      }`}
                    >
                      {activeFilterCount}
                    </span>
                  )}
                </button>
              </div>
            )}

            {nearMePage && nearMeBannerLabel && (
              <p className="text-base text-center text-white/60 mt-5 mb-8 px-4">
                Showing creators near{' '}
                {visitorFlag ? (
                  <span className="text-base leading-none align-middle" aria-hidden="true">
                    {visitorFlag}
                  </span>
                ) : null}{' '}
                {nearMeBannerLabel}
              </p>
            )}

            {(!isHero || filtersOpen) && (
              isHero && minimalFilters ? (
                <div className={isCompactBlock ? 'mt-1 mb-1.5' : 'mt-2 mb-3'}>
                  <OnlyFansHeroFilterPanel
                    compact={isCompactBlock}
                    priceFilter={priceFilter}
                    setPriceFilter={setPriceFilter}
                    selectedCategory={selectedCategory}
                    onSelectCategory={selectCategory}
                    instagramOnly={instagramOnly}
                    setInstagramOnly={setInstagramOnly}
                    joinWithinDays={joinWithinDays}
                    setJoinWithinDays={setJoinWithinDays}
                    onClear={clearFilters}
                    canUsePremiumFilters={canUsePremiumFilters}
                    onPremiumRequired={requirePremiumForFilter}
                  />
                </div>
              ) : (
                <div
                  className={isHero ? 'rounded-xl border p-3 mb-3' : undefined}
                  style={
                    isHero
                      ? { borderColor: tokens.border, backgroundColor: tokens.hover }
                      : undefined
                  }
                >
                  {isHero && toolbar}
                  {filterPills}
                  {activeFilterCount > 0 && (
                    <div className={`${isHero ? 'flex justify-center mt-3 pt-2 border-t border-white/10' : 'mt-3 pt-2 border-t'}`} style={!isHero ? { borderColor: tokens.border } : undefined}>
                      <button
                        type="button"
                        onClick={clearFilters}
                        className="text-[11px] font-bold uppercase tracking-wide text-[#00AFF0] hover:opacity-80 transition-opacity"
                      >
                        Clear filters
                      </button>
                    </div>
                  )}
                </div>
              )
            )}
          </div>

          {!hideResults && (
          <div ref={resultsRef}>
          {!hideResults && (loading || results.length > 0 || searched) && isHero && toolbar}
          {searched && query.trim() && (
            <h2
              className={`font-black tracking-tight leading-tight mb-5 sm:mb-6 ${
                isHero
                  ? 'text-center text-2xl sm:text-3xl lg:text-4xl text-white'
                  : 'text-2xl sm:text-3xl lg:text-4xl'
              }`}
              style={!isHero ? { color: tokens.text } : undefined}
            >
              Search results for &quot;<span className="text-[#00AFF0]">{query.trim()}</span>&quot;
            </h2>
          )}
          {loading ? (
            <div className={resultsView === 'feed' ? 'flex flex-col gap-4 max-w-lg mx-auto w-full' : `${MOSAIC_RESULTS_GRID} ${heroGridWrap}`}>
              <OfResultsSkeleton
                count={resultsView === 'feed' ? 4 : isHero ? 12 : 8}
                hero={isHero && minimalFilters}
                hoverBg={tokens.hover}
                feed={resultsView === 'feed'}
              />
            </div>
          ) : searched && results.length === 0 ? (
            <p className={`text-sm ${isHero ? `text-center max-w-xl mx-auto ${nearMePage ? 'mt-10' : 'mt-3'} ${heroLightBg ? 'text-gray-500' : 'text-white/60'}` : ''}`} style={!isHero ? { color: tokens.muted } : undefined}>
              {nearMeActive || !query.trim()
                ? t('ofSearch.noCreatorsFound')
                : `${t('ofSearch.noCreatorsFound')} "${query.trim()}"`}
            </p>
          ) : results.length > 0 ? (
            <div className={resultsView === 'feed' ? 'flex flex-col gap-4 sm:gap-5 max-w-lg mx-auto w-full' : `${MOSAIC_RESULTS_GRID} ${heroGridWrap}`}>
              {(() => {
                const isFeed = resultsView === 'feed';
                const injectFeatured =
                  isHero &&
                  minimalFilters &&
                  feedFeatured.length > 0 &&
                  (!!query.trim() || freeOnlyPage || bestModelsPage || nearMePage || nearMeActive);
                let featIdx = 0;
                const nodes: React.ReactNode[] = [];

                const renderFeatured = (slotKey: string) => {
                  const tc = feedFeatured[featIdx % feedFeatured.length];
                  featIdx += 1;
                  const img = (tc.album && tc.album[0]) || tc.avatar;
                  return (
                    <button
                      key={slotKey}
                      type="button"
                      onClick={() => {
                        const vIdx = shownVariantRef.current[tc._id] ?? -1;
                        if (tc.isPaidCampaign && tc.campaignId) {
                          trackCampaignClick(tc.campaignId, searchFeedPlacement(vIdx));
                        }
                        window.open(`/go/${tc.username}`, '_blank', 'noopener,noreferrer');
                      }}
                      className={`group w-full text-left rounded-2xl overflow-hidden bg-white border-2 border-[#00AFF0] shadow-[0_8px_28px_-8px_rgba(0,175,240,0.25)] hover:shadow-[0_12px_36px_-6px_rgba(0,175,240,0.35)] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer focus:outline-none ${isFeed ? 'max-w-lg mx-auto' : ''}`}
                    >
                      <div className={`relative bg-[#f0f8ff] ${isFeed ? 'aspect-[4/5]' : 'aspect-[3/4]'}`}>
                        {img ? (
                          <img
                            src={img}
                            alt={`${tc.name} OnlyFans`}
                            className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                            loading="lazy"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-[#00AFF0] bg-[#f0f8ff]">
                            {(tc.name || tc.username || '?').charAt(0)}
                          </div>
                        )}
                        <FeaturedLiveBadge liveHourStart={tc.liveHourStart} liveHourEnd={tc.liveHourEnd} />
                      </div>
                      <div className="px-3 pt-2.5 pb-3 sm:px-4 sm:pt-3 sm:pb-4 bg-white">
                        <p className="font-bold text-[13px] sm:text-[15px] text-gray-900 truncate">{tc.name}</p>
                        <p className="text-[11px] sm:text-[13px] text-[#00AFF0] font-semibold mt-0.5">@{tc.username}</p>
                        {tc.likesCount > 0 && (
                          <p className="text-[10px] sm:text-[11px] text-gray-500 mt-0.5">
                            {formatFeaturedLikes(tc.likesCount)} {t('ofSearch.likes')}
                          </p>
                        )}
                        <div className="w-full py-2 sm:py-2.5 mt-2 rounded-xl bg-gradient-to-r from-[#00AFF0] to-[#00D4FF] text-white text-[13px] sm:text-sm font-bold text-center shadow-sm group-hover:shadow-md group-hover:from-[#009ADB] group-hover:to-[#00BFE8] transition-all">
                          {t('ofSearch.viewProfile')}
                        </div>
                      </div>
                    </button>
                  );
                };

                if (injectFeatured) {
                  nodes.push(renderFeatured('featured-first'));
                }

                results.forEach((creator, i) => {
                  const erogramUrl = ofCreatorProfileUrl(creator.username || creator.slug);
                  const onlyfansUrl = onlyFansExternalUrl(creator.username || creator.slug, creator.url);
                  nodes.push(
                    <div
                      key={creator._id}
                      className={`group rounded-xl overflow-hidden border transition-all hover:opacity-95 relative flex flex-col ${isFeed ? 'w-full max-w-lg mx-auto rounded-2xl' : ''}`}
                      style={{ borderColor: tokens.border, backgroundColor: tokens.card }}
                    >
                      {isFeed && (
                        <div className="flex items-center gap-2.5 px-3 py-2.5" style={{ borderBottom: `1px solid ${tokens.border}` }}>
                          <img
                            src={creator.avatar}
                            alt=""
                            className="w-9 h-9 rounded-full object-cover shrink-0"
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/assets/placeholder-no-image.png';
                            }}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold truncate" style={{ color: tokens.text }}>
                              {creator.name || creator.username}
                            </p>
                            <p className="text-[11px] truncate" style={{ color: tokens.muted }}>
                              @{creator.username}
                            </p>
                          </div>
                          {isFreeCreator(creator) ? (
                            <span className="flex-shrink-0 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wide text-white" style={{ backgroundColor: '#22c55e' }}>
                              FREE
                            </span>
                          ) : creator.price ? (
                            <span className="flex-shrink-0 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wide text-white bg-[#0084BD]">
                              ${creator.price}
                            </span>
                          ) : null}
                        </div>
                      )}
                      <div className={`${isFeed ? 'aspect-[4/5]' : 'aspect-[3/4]'} overflow-hidden relative`}>
                        <img
                          src={creator.avatar}
                          alt=""
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/assets/placeholder-no-image.png';
                          }}
                        />
                      </div>
                      <div className={`${isFeed ? 'p-3' : 'p-2.5'} flex flex-col flex-1`}>
                        {!isFeed && (
                          <>
                            <div className="flex items-center justify-between gap-3 min-w-0">
                              <p className="text-sm font-bold truncate min-w-0 flex-1" style={{ color: tokens.text }}>
                                {creator.name || creator.username}
                              </p>
                              {isFreeCreator(creator) ? (
                                <span className="flex-shrink-0 ml-auto px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wide text-white" style={{ backgroundColor: '#22c55e' }}>
                                  FREE
                                </span>
                              ) : creator.price ? (
                                <span className="flex-shrink-0 ml-auto px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wide text-white bg-[#0084BD]">
                                  ${creator.price}
                                </span>
                              ) : null}
                            </div>
                            <p className="text-[11px] truncate mt-0.5" style={{ color: tokens.muted }}>
                              @{creator.username}
                            </p>
                          </>
                        )}
                        {creator.bio && (
                          <p
                            className={`text-[10px] leading-snug mt-1 ${isFeed ? 'line-clamp-3' : 'line-clamp-2'}`}
                            style={{ color: tokens.muted, opacity: 0.75 }}
                          >
                            {bioSnippet(creator.bio, isFeed ? 140 : 72)}
                          </p>
                        )}
                        <div className={`flex items-center gap-1.5 mt-auto ${isFeed ? 'pt-3' : 'pt-2.5'}`}>
                          <a
                            href={erogramUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 py-2 rounded-xl bg-[#0084BD] text-white text-[12px] sm:text-sm font-black text-center shadow-lg border border-[#0084BD] hover:bg-[#0070A3] transition-colors"
                          >
                            {t('ofSearch.viewProfile')}
                          </a>
                          <a
                            href={onlyfansUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={CREATOR_PROFILE_ICON_BTN}
                            aria-label="Open OnlyFans"
                          >
                            <ExternalLink size={16} strokeWidth={2} />
                          </a>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onToggleSave(creator._id);
                        }}
                        className={`absolute top-2 right-2 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all backdrop-blur-sm ${
                          savedCreatorIds.has(creator._id)
                            ? 'bg-[#00AFF0] text-white shadow-lg'
                            : 'bg-black/40 text-white/70 hover:bg-black/60 hover:text-white'
                        }`}
                        title={savedCreatorIds.has(creator._id) ? t('ofSearch.removeSaved') : t('ofSearch.saveCreator')}
                      >
                        <Bookmark size={14} fill={savedCreatorIds.has(creator._id) ? 'currentColor' : 'none'} />
                      </button>
                    </div>,
                  );

                  if (injectFeatured && (i + 1) % SEARCH_FEED_FEATURED_EVERY === 0) {
                    nodes.push(renderFeatured(`search-feat-${i}`));
                  }
                });

                return nodes;
              })()}
            </div>
          ) : null}
          {(nearMePage && nearMeHasMore) || (freeOnlyPage && freeOnlyHasMore) || (bestModelsPage && bestModelsHasMore) ? (
            !loading && (
            <div ref={loadMoreRef} className={`${heroGridWrap} mt-4 min-h-6 ${resultsView === 'feed' ? 'max-w-lg mx-auto w-full' : ''}`} aria-hidden>
              {loadingMore && (
                <div className={resultsView === 'feed' ? 'flex flex-col gap-4' : MOSAIC_RESULTS_GRID}>
                  <OfResultsSkeleton count={4} hero={isHero && minimalFilters} hoverBg={tokens.hover} feed={resultsView === 'feed'} />
                </div>
              )}
            </div>
            )
          ) : null}
          </div>
          )}
        </>
      )}
    </section>
  );
}
