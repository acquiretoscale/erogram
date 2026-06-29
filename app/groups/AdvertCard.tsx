import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Advert, FeedCampaign } from './types';
import { useIsTelegramBrowser } from '../hooks/useIsTelegramBrowser';
import { trackClick as trackCampaignClick, trackImpression } from '@/lib/actions/campaigns';
import { trackTrendingClick } from '@/lib/actions/onlyfansTracking';

interface AdvertCardProps {
    advert?: Advert;
    campaign?: FeedCampaign;
    isIndex: number;
    shouldPreload?: boolean;
    onVisible?: () => void;
    forceVisible?: boolean;
    hidePromoted?: boolean;
    /** Explicit ad-space name for click tracking when not resolvable from tierSlot
     *  (e.g. 'group-sidebar', 'ainsfw-featured', 'best-of', 'best-groups', 'of-cat'). */
    placementOverride?: string;
    growthPercent?: number;
}

/**
 * VideoAdCard — displayed when a FeedCampaign has a videoUrl.
 * Matches GroupCard dimensions exactly (h-full flex-col, h-52 media, flex-grow content).
 * SEO/Performance:
 *  - preload="none"  → zero network cost at page load
 *  - poster          → static image shown until video plays (no CLS)
 *  - src set via JS  → only when card enters viewport (IntersectionObserver)
 *  - muted + playsInline + loop → browser-safe autoplay, no sound
 *  - pause on leave  → saves CPU/bandwidth when scrolled away
 */
function seededRandomVideo(seed: string) {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        const char = seed.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash) / 2147483647;
}

function formatCount(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K`;
    return String(n);
}

// LIVE schedule check (GMT). -1 = never live; 0/0 = always live; otherwise within [start,end) GMT,
// wrapping past midnight when start > end. Matches the OF Featured admin convention.
function isCreatorLiveNow(start?: number, end?: number): boolean {
    if (start == null || end == null || start < 0 || end < 0) return false;
    if (start === 0 && end === 0) return true;
    const h = new Date().getUTCHours();
    return start <= end ? h >= start && h < end : h >= start || h < end;
}

function GrowthTrendBadge({ growthPercent }: { growthPercent?: number }) {
    if (typeof growthPercent !== 'number') return null;
    return (
        <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-black text-[#34d399]">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 17L17 7" />
                <path d="M10 7h7v7" />
            </svg>
            +{growthPercent.toFixed(1)}%
        </span>
    );
}

function OnlyFansCreatorAdCard({ campaign, handleClick, growthPercent }: { campaign: FeedCampaign; handleClick: (shownVariantIdx?: number) => void; growthPercent?: number }) {
    const cardRef = useRef<HTMLDivElement>(null);
    const impressionFiredRef = useRef(false);
    const [imgError, setImgError] = useState(false);
    const trendingId = campaign.ofTrendingId || '';

    // Split-test rotation (one unified creator album):
    //  ofAlbum = [avatar, ...extraPhotos] MINUS any paused image, already prepared server-side.
    //  We random-pick ONE album entry per render, CLIENT-SIDE, so the pick varies per visitor and
    //  is never frozen by the page's ISR cache. Album index i is tagged ":v{i}" for per-picture CTR.
    const album = campaign.ofAlbum ?? [];
    // Roll the rotation AFTER mount (client-only). If we picked during the SSR initializer, the
    // server HTML would freeze one image under the page cache and every visitor would see it.
    // Starting at 0 then re-rolling on mount makes the shown image vary per page view.
    const [variantIdx, setVariantIdx] = useState<number>(0);
    useEffect(() => {
        if (album.length > 1) setVariantIdx(Math.floor(Math.random() * album.length));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const displayImage = (variantIdx >= 0 && album[variantIdx])
        ? album[variantIdx]
        : (album[0] || campaign.creative || '');

    const onCardClick = () => {
        if (trendingId) trackTrendingClick(trendingId);
        handleClick(variantIdx);
    };

    useEffect(() => {
        const el = cardRef.current;
        if (!el) return;
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting && !impressionFiredRef.current) {
                impressionFiredRef.current = true;
                if (campaign._id) trackImpression(campaign._id);
            }
        }, { threshold: 0.3 });
        observer.observe(el);
        return () => observer.disconnect();
    }, [campaign._id]);

    const displayName = campaign.name || campaign.ofUsername || 'Creator';
    const likesCount = campaign.ofLikesCount || 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="h-full"
        >
            <div
                ref={cardRef}
                onClick={onCardClick}
                className="group relative h-full min-h-[280px] sm:min-h-[480px] rounded-2xl sm:rounded-3xl overflow-hidden cursor-pointer border border-[#00AFF0]/25 hover:border-[#00AFF0]/60 hover:shadow-2xl hover:shadow-[#00AFF0]/15 transition-all duration-500 bg-[#0a0a0a]"
                role="link"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && onCardClick()}
            >
                {/* Image fills the entire card */}
                {displayImage && !imgError ? (
                    <img
                        src={displayImage}
                        alt={`${displayName} OnlyFans`}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-700 ease-out"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        onError={() => setImgError(true)}
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-6xl font-black text-[#00AFF0]/30 bg-gradient-to-br from-[#00AFF0]/10 to-[#00D4FF]/5">
                        {displayName.charAt(0)}
                    </div>
                )}

                {/* Gradient ONLY at the bottom — keeps the photo bright and popping */}
                <div className="absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-black via-black/65 to-transparent pointer-events-none" />

                {/* LIVE badge — reflects the schedule set in OF Featured (green blinking dot) */}
                {isCreatorLiveNow(campaign.ofLiveHourStart, campaign.ofLiveHourEnd) && (
                    <div className="absolute top-3 left-3 z-10 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/55 backdrop-blur-sm">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                        </span>
                        <span className="text-[10px] font-black text-white uppercase tracking-wider">Live</span>
                    </div>
                )}

                {/* Bottom content overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-5 z-10 flex flex-col gap-2 sm:gap-2.5">
                    {/* Transparent featured label */}
                    <span className="text-[8px] sm:text-[9px] font-bold text-white/50 uppercase tracking-wider">Featured Onlyfans Creator</span>

                    {/* Name + verified + trending % */}
                    <h3 className="font-black text-white leading-tight drop-shadow-lg flex items-center gap-1.5 min-w-0 text-lg sm:text-2xl">
                        <span className="truncate min-w-0">{displayName}</span>
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" viewBox="0 0 24 24" fill="#1D9BF0" aria-label="Verified"><path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81C14.67.63 13.43-.25 12-.25S9.33.63 8.66 1.94c-1.39-.46-2.9-.2-3.91.81s-1.27 2.52-.81 3.91C2.63 7.33 1.75 8.57 1.75 12c0 1.43.88 2.67 2.19 3.34-.46 1.39-.2 2.9.81 3.91s2.52 1.27 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.67-.88 3.34-2.19c1.39.46 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z"/></svg>
                        {typeof growthPercent === 'number' && (
                            <span className="shrink-0"><GrowthTrendBadge growthPercent={growthPercent} /></span>
                        )}
                    </h3>

                    {/* Total likes */}
                    {likesCount > 0 && (
                        <div className="text-white/80 text-xs sm:text-sm font-semibold">
                            {formatCount(likesCount)} likes
                        </div>
                    )}

                    {/* View Profile button */}
                    <button
                        onClick={(e) => { e.stopPropagation(); onCardClick(); }}
                        className="w-full py-2.5 sm:py-3 rounded-full bg-white hover:bg-white/90 text-[#0a0a0a] text-sm sm:text-base font-black text-center shadow-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                    >
                        {campaign.buttonText || 'View Profile'}
                    </button>
                </div>
            </div>
        </motion.div>
    );
}

function VideoAdCard({ campaign, handleClick, hidePromoted = false, growthPercent }: { campaign: FeedCampaign; handleClick: () => void; hidePromoted?: boolean; growthPercent?: number }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const cardRef = useRef<HTMLDivElement>(null);
    const videoImpressionFiredRef = useRef(false);

    const seed = campaign._id;
    const initialVisiting = Math.floor(300 + seededRandomVideo(seed + 'visiting') * 350);
    const [visitingCount, setVisitingCount] = useState(initialVisiting);

    useEffect(() => {
        const video = videoRef.current;
        const card = cardRef.current;
        if (!video || !card) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        if (!video.src) {
                            video.src = campaign.videoUrl!;
                            video.load();
                        }
                        video.play().catch(() => {});
                        if (!videoImpressionFiredRef.current) {
                            videoImpressionFiredRef.current = true;
                            trackImpression(campaign._id);
                        }
                    } else {
                        video.pause();
                    }
                });
            },
            { threshold: 0.3 }
        );

        observer.observe(card);
        return () => observer.disconnect();
    }, [campaign.videoUrl, campaign._id]);

    useEffect(() => {
        const interval = setInterval(() => {
            setVisitingCount((prev) => {
                const change = Math.floor(Math.random() * 9) - 3;
                return Math.max(300, prev + change);
            });
        }, 3000 + Math.random() * 2000);
        return () => clearInterval(interval);
    }, []);

    const buttonText = (campaign.buttonText && campaign.buttonText.trim()) ? campaign.buttonText.trim() : 'Visit Now';

    const rating = (seededRandomVideo(seed + 'rating') * 0.7 + 4.2).toFixed(1);
    const reviewCount = Math.floor(seededRandomVideo(seed + 'reviews') * 38 + 5);

    return (
        <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="h-full"
        >
            <div
                ref={cardRef}
                className="rounded-2xl sm:rounded-3xl overflow-hidden h-full min-h-[280px] sm:min-h-[480px] relative cursor-pointer group border border-white/5 hover:border-white/20 transition-all duration-500 hover:shadow-2xl hover:shadow-black/50 bg-[#0a0a0a]"
                onClick={handleClick}
                role="link"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleClick()}
                aria-label={campaign.name}
            >
                {/* Video fills the entire card */}
                <video
                    ref={videoRef}
                    poster={campaign.creative || undefined}
                    muted
                    playsInline
                    loop
                    preload="none"
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    style={campaign.creative ? undefined : { background: '#0a0a0a' }}
                    aria-hidden="true"
                />

                {/* Gradient for text readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/10 pointer-events-none" />

                {/* Bottom content */}
                <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-5 z-10 flex flex-col gap-1.5 sm:gap-2.5">
                    <div className="flex justify-start">
                        <div className="bg-black/80 backdrop-blur-md border border-white/10 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg flex items-center gap-1 sm:gap-1.5 shadow-lg">
                            <span className="text-[10px] sm:text-xs text-red-400">⚡</span>
                            <span className="text-[10px] sm:text-xs font-bold text-white">{visitingCount} visiting</span>
                        </div>
                    </div>
                    <h3 className={`font-black text-white leading-tight drop-shadow-lg flex items-center justify-between gap-2 ${typeof growthPercent === 'number' ? 'text-sm sm:text-lg' : 'text-sm sm:text-xl'}`}>
                        <span className="flex items-center gap-1 min-w-0">
                            <span className="truncate min-w-0">{campaign.name}</span>
                            <svg className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" viewBox="0 0 24 24" fill="#1D9BF0" aria-label="Verified"><path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81C14.67.63 13.43-.25 12-.25S9.33.63 8.66 1.94c-1.39-.46-2.9-.2-3.91.81s-1.27 2.52-.81 3.91C2.63 7.33 1.75 8.57 1.75 12c0 1.43.88 2.67 2.19 3.34-.46 1.39-.2 2.9.81 3.91s2.52 1.27 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.67-.88 3.34-2.19c1.39.46 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z"/></svg>
                        </span>
                        <span className="shrink-0">
                            <GrowthTrendBadge growthPercent={growthPercent} />
                        </span>
                    </h3>

                    {campaign.description && (
                        <p className="text-gray-300 text-xs sm:text-sm line-clamp-1 sm:line-clamp-2 leading-relaxed drop-shadow">
                            {campaign.description}
                        </p>
                    )}

                    {/* Star rating row */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                            <span className="text-yellow-500 text-[10px] sm:text-sm">⭐</span>
                            <span className="text-white font-bold text-[10px] sm:text-sm drop-shadow">{rating}</span>
                            <span className="text-gray-400 text-[10px] sm:text-xs drop-shadow">({reviewCount})</span>
                        </div>
                    </div>

                    <button
                        onClick={(e) => { e.stopPropagation(); handleClick(); }}
                        className="w-full py-2.5 sm:py-3 px-3 rounded-xl font-black text-white text-sm transition-all duration-300 hover:brightness-110 hover:scale-[1.02] active:scale-[0.98]"
                        style={{ background: 'linear-gradient(135deg, #ff5e2a, #ff9432)', color: '#ffffff', boxShadow: '0 4px 14px -5px rgba(255,94,42,0.5)' }}
                    >
                        {buttonText}
                    </button>
                </div>
            </div>
        </motion.div>
    );
}

function PremiumMosaicCard({ campaign, handleClick, growthPercent }: { campaign: FeedCampaign; handleClick: () => void; growthPercent?: number }) {
    const [imgIdx, setImgIdx] = useState(0);
    const [liveCount, setLiveCount] = useState(0);
    const cardRef = useRef<HTMLDivElement>(null);
    const impressionFiredRef = useRef(false);
    const groups = campaign.premiumGroups || [];
    const fmtNum = (n: number) => n >= 1_000_000 ? (n/1_000_000).toFixed(1)+'M' : n >= 1_000 ? (n/1_000).toFixed(n>=10_000?0:1)+'K' : '';

    const seededRandom = (s: string) => {
        let hash = 0;
        for (let i = 0; i < s.length; i++) { hash = ((hash << 5) - hash) + s.charCodeAt(i); hash = hash & hash; }
        return Math.abs(hash) / 2147483647;
    };
    const seed = `premium-${campaign._id}`;

    const proofSetting = campaign.socialProof || 'random';
    let resolvedProof = proofSetting;
    if (resolvedProof === 'random') {
        const r = seededRandom(seed + 'stats');
        if (r > 0.7) {
            const t = seededRandom(seed + 'statsType');
            resolvedProof = t < 0.5 ? 'visiting' : 'trending';
        } else {
            resolvedProof = 'none';
        }
    }

    let fakeCount: string | null = null;
    let isLiveCount = false;
    if (resolvedProof === 'visiting') {
        if (liveCount === 0) setLiveCount(Math.floor(seededRandom(seed + 'count1') * 400 + 120));
        isLiveCount = true;
        fakeCount = `${liveCount} visiting now`;
    } else if (resolvedProof === 'trending') {
        fakeCount = `Trending #${Math.floor(seededRandom(seed + 'count3') * 5 + 1)}`;
    }
    if (isLiveCount) fakeCount = `${liveCount} visiting now`;

    useEffect(() => {
        if (!isLiveCount) return;
        const interval = setInterval(() => {
            setLiveCount(prev => Math.max(10, prev + Math.floor(Math.random() * 9) - 3));
        }, 3000 + Math.random() * 2000);
        return () => clearInterval(interval);
    }, [isLiveCount]);

    useEffect(() => {
        if (groups.length <= 4) return;
        const interval = setInterval(() => {
            setImgIdx(prev => (prev + 4) % groups.length);
        }, 12000);
        return () => clearInterval(interval);
    }, [groups.length]);

    useEffect(() => {
        const el = cardRef.current;
        if (!el) return;
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting && !impressionFiredRef.current) {
                impressionFiredRef.current = true;
                trackImpression(campaign._id);
            }
        }, { threshold: 0.3 });
        observer.observe(el);
        return () => observer.disconnect();
    }, [campaign._id]);

    if (groups.length === 0) return null;

    const visible = Array.from({ length: 4 }, (_, i) => groups[(imgIdx + i) % groups.length]);
    const catLabel = campaign.premiumCategory || 'Premium';

    return (
        <div ref={cardRef} onClick={handleClick} className="block h-full cursor-pointer" role="link" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && handleClick()}>
            <div className="relative h-full">
                <div className="glass rounded-2xl sm:rounded-3xl overflow-hidden h-full flex flex-col backdrop-blur-xl hover:shadow-2xl hover:shadow-black/50 transition-all duration-500 group border border-white/5 hover:border-white/20">
                    {/* 2x2 mosaic — square grid */}
                    <div className="relative w-full p-2 sm:p-3 overflow-hidden">
                        <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                            {visible.map((g, i) => (
                                <div key={`${g._id}-${i}`} className="relative rounded-lg sm:rounded-xl overflow-hidden transition-all duration-1000 aspect-square">
                                    <img
                                        src={g.image || '/assets/placeholder-no-image.png'}
                                        alt=""
                                        className="absolute inset-0 w-full h-full object-cover"
                                        onError={e => { (e.target as HTMLImageElement).src = '/assets/placeholder-no-image.png'; }}
                                    />
                                    <div className="absolute inset-0 rounded-lg sm:rounded-xl ring-1 ring-orange-500/40" />
                                    <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 30%, rgba(0,0,0,0.85) 100%)' }} />
                                    <div className="absolute bottom-0 left-0 right-0 p-1 sm:p-1.5">
                                        <p className="text-[8px] sm:text-[10px] font-bold text-white truncate leading-tight">
                                            {(g.name || '').slice(0, 6)}<span style={{ display: 'inline-block', width: '3.5em', height: '0.75em', background: 'rgba(255,255,255,0.9)', borderRadius: '3px', verticalAlign: 'middle', marginLeft: '2px', filter: 'blur(2px)', userSelect: 'none' as const }} />
                                        </p>
                                        <div className="flex items-center gap-0.5">
                                            {g.memberCount ? <span className="text-[8px] sm:text-[10px] font-black text-orange-400 leading-none">{fmtNum(g.memberCount)}</span> : null}
                                            <span className="text-[7px] sm:text-[8px] font-bold text-white/40 leading-none truncate">· {g.category}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Content area — flex-grow pushes button to bottom like other feed cards */}
                    <div className="p-3 sm:p-5 flex-grow flex flex-col relative">
                        {fakeCount && (
                            <div className="mb-2">
                                <div className="inline-flex bg-black/60 backdrop-blur-md border border-white/10 px-2 py-1 rounded-lg items-center gap-1.5 shadow-lg">
                                    <span className="text-xs text-red-400">⚡</span>
                                    <span className="text-xs font-bold text-white">{fakeCount}</span>
                                </div>
                            </div>
                        )}
                        <h3 className={`font-black text-white mb-1 sm:mb-2 leading-tight group-hover:text-orange-400 transition-colors flex items-center justify-between gap-2 ${typeof growthPercent === 'number' ? 'text-sm sm:text-lg' : 'text-sm sm:text-xl'}`}>
                            <span className="truncate min-w-0">🔒 {campaign.name || `Premium ${catLabel}`}</span>
                            <span className="shrink-0">
                                <GrowthTrendBadge growthPercent={growthPercent} />
                            </span>
                        </h3>
                        <div className="mb-3 sm:mb-6 flex-grow">
                            <p className="text-gray-400 text-xs sm:text-sm line-clamp-2 sm:line-clamp-3 leading-relaxed">
                                {campaign.description || `Unlock the best ${catLabel} groups`}
                            </p>
                        </div>
                        <div className="mt-auto">
                            <button
                                onClick={(e) => { e.stopPropagation(); handleClick(); }}
                                className="w-full py-2.5 sm:py-3 px-3 rounded-xl font-black text-sm transition-all duration-300 hover:brightness-110 hover:scale-[1.02] active:scale-[0.98]"
                                style={{ background: 'linear-gradient(135deg, #fb5607, #ffbe0b)', color: '#1a0800', boxShadow: '0 4px 14px -6px rgba(251,86,7,0.6)' }}
                            >
                                🔓 {campaign.buttonText || 'Unlock the vault'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function AdvertCard({ advert, campaign, isIndex = 0, shouldPreload = false, onVisible, forceVisible = false, hidePromoted = false, placementOverride, growthPercent }: AdvertCardProps) {
    const isTelegram = useIsTelegramBrowser();

    // Normalize: support both legacy Advert and new FeedCampaign
    const ad = campaign
      ? {
          _id: campaign._id,
          name: campaign.name,
          image: campaign.creative,
          url: campaign.destinationUrl,
          description: campaign.description,
          category: campaign.category,
          country: campaign.country,
          buttonText: campaign.buttonText || 'Visit Site',
          isCampaign: true,
        }
      : {
            _id: advert?._id || '',
            name: advert?.name || '',
            image: advert?.image || '/assets/image.jpg',
            url: advert?.url || '',
            description: advert?.description || '',
            category: advert?.category || '',
            country: advert?.country || '',
            buttonText: advert?.buttonText || 'Visit Site',
            isCampaign: false,
          };

    const [isHovered, setIsHovered] = useState(false);
    const [imageSrc, setImageSrc] = useState(ad.image || '/assets/image.jpg');
    const [isInView, setIsInView] = useState(forceVisible);
    const hasFetchedRef = useRef(false);
    const impressionFiredRef = useRef(false);
    const imgRef = useRef<HTMLDivElement>(null);
    const [liveCount, setLiveCount] = useState<number>(0);

    // Button text variations
    // Curated fallback labels — sentence-case, clean, no gimmicks.
    // Only used when admin hasn't set buttonText. Seeded so the same ad always shows the same label.
    const buttonTexts = [
        'Visit site',
        'Get started',
        'View content',
        'Try free',
        'Learn more',
    ];


    // Seeded random function for consistent server/client rendering
    const seededRandom = (seed: string) => {
        let hash = 0;
        for (let i = 0; i < seed.length; i++) {
            const char = seed.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash) / 2147483647; // Normalize to 0-1
    };

    // Use ad ID + index as seed for consistent random selection (same on server and client)
    const seed = `${ad._id}-${isIndex}`;

    // CTA button: use only buttonText from the ad (never description)
    const displayButtonText = (ad.buttonText && String(ad.buttonText).trim()) ? String(ad.buttonText).trim() : (buttonTexts[Math.floor(seededRandom(seed) * buttonTexts.length)]);

    // Determine if this should be a "Native" ad (looks like a group card)
    // 50% chance to be native (increased from 40%)
    const isNative = seededRandom(seed + 'native') < 0.5;

    // Intersection Observer for lazy loading
    useEffect(() => {
        if (forceVisible) {
            setIsInView(true);
            return;
        }

        if (!imgRef.current) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setIsInView(true);
                        onVisible?.(); // Report visibility to parent
                        observer.disconnect();
                    }
                });
            },
            {
                rootMargin: '200px', // Start loading 200px before entering viewport - load more images in parallel
                threshold: 0.01,
            }
        );

        observer.observe(imgRef.current);

        return () => {
            observer.disconnect();
        };
    }, [onVisible, forceVisible]);

    // Track impression when a campaign ad enters the viewport (fire once)
    useEffect(() => {
        if (isInView && ad.isCampaign && ad._id && !impressionFiredRef.current) {
            impressionFiredRef.current = true;
            trackImpression(ad._id);
        }
    }, [isInView, ad.isCampaign, ad._id]);

    // Preload image if shouldPreload is true (for next 6 items) -- legacy adverts only
    useEffect(() => {
        if (!ad.isCampaign && shouldPreload && imageSrc === '/assets/image.jpg' && ad._id && !hasFetchedRef.current) {
            hasFetchedRef.current = true;
            fetch(`/api/adverts/${ad._id}/image`)
                .then(res => res.json())
                .then(data => {
                    if (data.image && data.image !== '/assets/image.jpg') {
                        setImageSrc(data.image);
                    }
                })
                .catch(() => {});
        }
    }, [shouldPreload, imageSrc, ad._id, ad.isCampaign]);

    // Fetch actual image when in view and it's the placeholder -- legacy adverts only
    useEffect(() => {
        if (!ad.isCampaign && isInView && imageSrc === '/assets/image.jpg' && ad._id && !hasFetchedRef.current) {
            hasFetchedRef.current = true;
            fetch(`/api/adverts/${ad._id}/image`)
                .then(res => res.json())
                .then(data => {
                    if (data.image && data.image !== '/assets/image.jpg') {
                        setImageSrc(data.image);
                    }
                })
                .catch((err) => {
                    console.error('Failed to load advert image:', err);
                });
        }
    }, [isInView, imageSrc, ad._id, ad.isCampaign]);

    const handleClick = (shownVariantIdx?: number) => {
        if (ad.isCampaign) {
            // Per-placement tracking: tag the REAL ad space so the dashboard can break clicks out
            // by placement instead of dumping everything into "feed". Same CampaignClick collection — additive.
            // Priority: explicit placementOverride (sidebar / Top-10 / AI NSFW contexts)
            //   → the canonical `placement` the FEED already stamped (top-groups-*/top-bots-*/feed-*)
            //   → 'feed' fallback. We no longer re-guess from tierSlot; the feed is the source of truth.
            let placementName = placementOverride
                || (campaign?.placement as string | undefined)
                || 'feed';
            // Variant tier (least critical): tag the ACTUALLY-SHOWN split-test image so per-picture
            // CTR reads from the SAME CampaignClick placement breakdown. No new field/collection.
            const vIdx = typeof shownVariantIdx === 'number' ? shownVariantIdx : -1;
            if (vIdx >= 0) placementName = `${placementName}:v${vIdx}`;
            trackCampaignClick(ad._id, placementName);
        } else {
            fetch('/api/adverts/track', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ advertId: ad._id }),
            }).catch(() => {});
        }
        const url = (ad.url || '').trim();
        if (url && url.startsWith('/')) {
            window.location.href = url;
        } else if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
            window.open(url, '_blank', 'noopener,noreferrer');
        }
    };

    // Social Proof — controlled via campaign.socialProof
    const proofSetting = campaign?.socialProof || 'random';
    let fakeCount: string | null = null;
    let isLiveCount = false;

    let resolvedProof = proofSetting;
    if (resolvedProof === 'random') {
        const statsRand = seededRandom(seed + 'stats');
        if (statsRand > 0.7) {
            const type = seededRandom(seed + 'statsType');
            resolvedProof = type < 0.5 ? 'visiting' : 'trending';
        } else {
            resolvedProof = 'none';
        }
    }

    if (resolvedProof === 'visiting') {
        if (liveCount === 0) {
            setLiveCount(Math.floor(seededRandom(seed + 'count1') * 400 + 120));
        }
        isLiveCount = true;
        fakeCount = `${liveCount} visiting now`;
    } else if (resolvedProof === 'trending') {
        fakeCount = `Trending #${Math.floor(seededRandom(seed + 'count3') * 5 + 1)}`;
    }

    useEffect(() => {
        if (isLiveCount) {
            const interval = setInterval(() => {
                setLiveCount(prev => {
                    const change = Math.floor(Math.random() * 9) - 3;
                    return Math.max(10, prev + change);
                });
            }, 3000 + Math.random() * 2000);
            return () => clearInterval(interval);
        }
    }, [isLiveCount]);

    if (isLiveCount) {
        fakeCount = `${liveCount} visiting now`;
    }

    // Verified checkmark: controlled from admin panel (campaign.verified field)
    const showVerified = true;

    if (isTelegram) {
        return null;
    }

    // ONLYFANS CREATOR CARD — portrait layout matching /onlyfanssearch style
    if (campaign?.adType === 'onlyfans-creator') {
        return <OnlyFansCreatorAdCard campaign={campaign} handleClick={handleClick} growthPercent={growthPercent} />;
    }

    // FEATURED BOT CARD — slot 5 bot spotlight
    if (campaign?.adType === 'featured-bot') {
        return (
            <motion.div
                initial={{ opacity: 0, y: 60 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: isIndex * 0.1 }}
                onHoverStart={() => setIsHovered(true)}
                onHoverEnd={() => setIsHovered(false)}
                className="h-full"
            >
                <div className={`glass rounded-2xl sm:rounded-3xl overflow-hidden h-full flex flex-col backdrop-blur-xl border transition-all duration-500 group relative border-cyan-500/20 hover:border-cyan-400/50 hover:shadow-2xl hover:shadow-cyan-500/20`}>
                    {/* Image */}
                    <div ref={imgRef} className="relative w-full h-32 sm:h-52 overflow-hidden bg-[#1a1a1a]">
                        <Image
                            src={imageSrc}
                            alt={ad.name}
                            fill
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            className="object-cover transition-transform duration-700 group-hover:scale-110"
                            priority={forceVisible || isIndex < 12}
                            onError={() => setImageSrc('/assets/image.jpg')}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent opacity-80" />
                        <div className="absolute bottom-1.5 right-1.5 z-10">
                            <span className="text-[8px] sm:text-[9px] font-bold text-white/40 uppercase tracking-wider">🤖 Featured Bot</span>
                        </div>
                    </div>
                    {/* Content */}
                    <div className="p-3 sm:p-5 flex-grow flex flex-col relative">
                        <h3 className={`font-black text-white mb-2 sm:mb-3 leading-tight group-hover:text-cyan-400 transition-colors flex items-center justify-between gap-2 ${typeof growthPercent === 'number' ? 'text-sm sm:text-lg' : 'text-sm sm:text-xl'}`}>
                            <span className="flex items-center gap-1 min-w-0">
                                <span className="truncate min-w-0">{ad.name}</span>
                                {showVerified && (
                                    <svg className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" viewBox="0 0 24 24" fill="#1D9BF0" aria-label="Verified"><path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81C14.67.63 13.43-.25 12-.25S9.33.63 8.66 1.94c-1.39-.46-2.9-.2-3.91.81s-1.27 2.52-.81 3.91C2.63 7.33 1.75 8.57 1.75 12c0 1.43.88 2.67 2.19 3.34-.46 1.39-.2 2.9.81 3.91s2.52 1.27 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.67-.88 3.34-2.19c1.39.46 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z"/></svg>
                                )}
                            </span>
                            <span className="shrink-0">
                                <GrowthTrendBadge growthPercent={growthPercent} />
                            </span>
                        </h3>
                        <div className="mb-3 sm:mb-6 flex-grow">
                            <p className="text-gray-400 text-xs sm:text-sm line-clamp-2 sm:line-clamp-3 leading-relaxed">{ad.description}</p>
                        </div>
                        <button
                            onClick={() => handleClick()}
                            className="w-full py-2.5 sm:py-3 px-3 rounded-xl font-black text-white text-sm transition-all duration-300 hover:brightness-110 hover:scale-[1.02] active:scale-[0.98]"
                            style={{ background: 'linear-gradient(135deg, #ff5e2a, #ff9432)', color: '#ffffff', boxShadow: '0 4px 14px -5px rgba(255,94,42,0.5)' }}
                        >
                            {ad.buttonText || 'Try this bot'}
                        </button>
                    </div>
                </div>
            </motion.div>
        );
    }

    // PREMIUM MOSAIC CARD — group grid for premium category ads
    if (campaign?.adType === 'premium' && campaign.premiumGroups?.length) {
        return <PremiumMosaicCard campaign={campaign} handleClick={handleClick} growthPercent={growthPercent} />;
    }

    // VIDEO AD CARD — only when campaign has a videoUrl
    if (campaign?.videoUrl) {
        return <VideoAdCard campaign={campaign} handleClick={handleClick} hidePromoted={hidePromoted} growthPercent={growthPercent} />;
    }

    // NATIVE AD CARD (Looks like GroupCard)
    if (isNative) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 60 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: isIndex * 0.1 }}
                onHoverStart={() => setIsHovered(true)}
                onHoverEnd={() => setIsHovered(false)}
                className="h-full"
            >
                <div className={`glass rounded-2xl sm:rounded-3xl overflow-hidden h-full flex flex-col backdrop-blur-xl border transition-all duration-500 group relative border-white/5 hover:border-white/20 hover:shadow-2xl hover:shadow-black/50`}>
                    {/* Advert Image */}
                    <div ref={imgRef} className="relative w-full h-32 sm:h-52 overflow-hidden bg-[#1a1a1a]">
                        <Image
                            src={imageSrc}
                            alt={ad.name}
                            fill
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            className="object-cover transition-transform duration-700 group-hover:scale-110"
                            priority={forceVisible || isIndex < 12}
                            onError={() => setImageSrc('/assets/image.jpg')}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent opacity-80" />
                    </div>

                    {/* Card Content */}
                    <div className="p-3 sm:p-5 flex-grow flex flex-col relative">
                        {/* Title */}
                        <h3 className={`font-black text-white mb-2 sm:mb-3 leading-tight group-hover:text-blue-400 transition-colors flex items-center justify-between gap-2 ${typeof growthPercent === 'number' ? 'text-sm sm:text-lg' : 'text-sm sm:text-xl'}`}>
                            <span className="flex items-center gap-1 min-w-0">
                                <span className="truncate min-w-0">{ad.name}</span>
                                {showVerified && (
                                    <svg className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" viewBox="0 0 24 24" fill="#1D9BF0" aria-label="Verified"><path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81C14.67.63 13.43-.25 12-.25S9.33.63 8.66 1.94c-1.39-.46-2.9-.2-3.91.81s-1.27 2.52-.81 3.91C2.63 7.33 1.75 8.57 1.75 12c0 1.43.88 2.67 2.19 3.34-.46 1.39-.2 2.9.81 3.91s2.52 1.27 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.67-.88 3.34-2.19c1.39.46 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z"/></svg>
                                )}
                            </span>
                            <span className="shrink-0">
                                <GrowthTrendBadge growthPercent={growthPercent} />
                            </span>
                        </h3>

                        {/* Description */}
                        <div className="mb-3 sm:mb-6 flex-grow">
                            <p className="text-gray-400 text-xs sm:text-sm line-clamp-2 sm:line-clamp-3 leading-relaxed">
                                {ad.description}
                            </p>
                        </div>

                        {/* Footer Actions */}
                        <div className="mt-auto space-y-2 sm:space-y-3">
                            {/* Rating Row */}
                            <div className="flex items-center justify-between px-1">
                                <div className="flex items-center gap-1">
                                    <span className="text-yellow-500 text-[10px] sm:text-sm">⭐</span>
                                    <span className="text-white font-bold text-[10px] sm:text-sm">{(seededRandom(seed + 'rating') * 0.7 + 4.2).toFixed(1)}</span>
                                    <span className="text-gray-500 text-[10px] sm:text-xs">({Math.floor(seededRandom(seed + 'reviews') * 38 + 5)})</span>
                                </div>
                            </div>

                            {/* Main Button */}
                            <button
                                onClick={() => handleClick()}
                                className="w-full py-2.5 sm:py-3 px-3 rounded-xl font-black text-white text-sm transition-all duration-300 hover:brightness-110 hover:scale-[1.02] active:scale-[0.98]"
                                style={{ background: 'linear-gradient(135deg, #ff5e2a, #ff9432)', color: '#ffffff', boxShadow: '0 4px 14px -5px rgba(255,94,42,0.5)' }}
                            >
                                {displayButtonText}
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>
        );
    }

    // STANDARD AD CARD (Flashy)
    return (
        <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: isIndex * 0.1 }}
            onHoverStart={() => setIsHovered(true)}
            onHoverEnd={() => setIsHovered(false)}
        >
            <div className={`glass rounded-2xl overflow-hidden h-full flex flex-col backdrop-blur-xl border transition-all duration-300 ${isHovered ? 'scale-[1.02] shadow-2xl shadow-black/50 border-white/20' : 'border-white/5'} relative`}>
                {/* Advert Image */}
                <div ref={imgRef} className="relative w-full h-32 sm:h-48 overflow-hidden bg-[#1a1a1a]">
                    <Image
                        src={imageSrc}
                        alt={ad.name}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover transition-transform duration-700"
                        style={{ transform: isHovered ? 'scale(1.1)' : 'scale(1)' }}
                        priority={forceVisible || isIndex < 12}
                        onError={() => setImageSrc('/assets/image.jpg')}
                    />
                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent opacity-80"></div>
                    {/* Social Proof Overlay */}
                    {fakeCount && (
                        <div className="absolute bottom-3 left-3 flex gap-2">
                            <div className="bg-black/60 backdrop-blur-md border border-white/20 px-2 py-1 rounded-lg flex items-center gap-1.5 shadow-lg">
                                <span className="text-xs text-red-400">⚡</span>
                                <span className="text-xs font-bold text-white">{fakeCount}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Card Content */}
                <div className="p-3 sm:p-5 flex-grow flex flex-col relative">
                    <h3 className={`font-black text-white mb-2 sm:mb-3 flex items-center justify-between gap-2 ${typeof growthPercent === 'number' ? 'text-sm sm:text-lg' : 'text-sm sm:text-xl md:text-2xl'} ${typeof growthPercent === 'number' ? 'text-left' : 'text-center'}`}>
                        <span className={`flex items-center gap-1 min-w-0 ${typeof growthPercent === 'number' ? '' : 'justify-center w-full'}`}>
                            <span className="truncate min-w-0">{ad.name}</span>
                            {showVerified && (
                                <svg className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" viewBox="0 0 24 24" fill="#1D9BF0" aria-label="Verified"><path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81C14.67.63 13.43-.25 12-.25S9.33.63 8.66 1.94c-1.39-.46-2.9-.2-3.91.81s-1.27 2.52-.81 3.91C2.63 7.33 1.75 8.57 1.75 12c0 1.43.88 2.67 2.19 3.34-.46 1.39-.2 2.9.81 3.91s2.52 1.27 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.67-.88 3.34-2.19c1.39.46 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z"/></svg>
                            )}
                        </span>
                        <span className="shrink-0">
                            <GrowthTrendBadge growthPercent={growthPercent} />
                        </span>
                    </h3>

                    {/* Description */}
                    <div className="mb-3 sm:mb-6 flex-grow">
                        <p className="text-gray-400 text-center text-xs sm:text-sm line-clamp-2 sm:line-clamp-3 leading-relaxed font-medium">
                            {ad.description}
                        </p>
                    </div>

                    {/* Action Button */}
                    <button
                        onClick={() => handleClick()}
                        className="w-full py-2.5 sm:py-3 px-3 rounded-xl font-black text-white text-sm transition-all duration-300 hover:brightness-110 hover:scale-[1.02] active:scale-[0.98]"
                        style={{ background: 'linear-gradient(135deg, #ff5e2a, #ff9432)', color: '#ffffff', boxShadow: '0 4px 14px -5px rgba(255,94,42,0.5)' }}
                    >
                        {displayButtonText}
                    </button>
                </div>
            </div>
        </motion.div>
    );
}
