import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Advert, FeedCampaign } from './types';
import { cardEntryProps } from './cardEntry';
import { useIsTelegramBrowser } from '../hooks/useIsTelegramBrowser';
import { trackClick as trackCampaignClick, trackImpression } from '@/lib/actions/campaigns';
import { trackTrendingClick } from '@/lib/actions/onlyfansTracking';
import { useTranslation } from '@/lib/i18n/client';
import VerifiedBadge from '@/components/VerifiedBadge';
import TwitterVerifiedIcon from '@/components/TwitterVerifiedIcon';
import HomeOfFeaturedCreatorCard from '@/app/components/HomeOfFeaturedCreatorCard';
import { feedCampaignToFeaturedCreator } from '@/lib/explore/feedCampaignToFeaturedCreator';

// PAUSED (2026-07-24, owner order) — performance experiment. Impression pings were
// server-action POSTs that forced a full re-render of force-dynamic pages on every
// ad view. Ad serving and daily caps use CLICKS only, so delivery is unaffected.
// To resume impressions: flip this to false (and the same flag in campaigns.ts + ToolCard.tsx).
const IMPRESSION_TRACKING_PAUSED = true;

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

const LIVE_AD_RATINGS = [4.8, 4.9] as const;
const LIVE_AD_RATING_FLOOR = 4.8;

function seededLiveAdRating(seedFn: (s: string) => number, seed: string): string {
    return LIVE_AD_RATINGS[Math.floor(seedFn(seed + 'rating') * LIVE_AD_RATINGS.length)].toFixed(1);
}

function displayAdRating(
    campaign: { adRating?: number | null; adReviewCount?: number | null },
    seedFn: (s: string) => number,
    seed: string,
): { rating: string; reviews: number } {
    if (campaign.adRating != null && campaign.adRating > 0) {
        const r = Math.max(LIVE_AD_RATING_FLOOR, Number(campaign.adRating));
        return {
            rating: r.toFixed(2),
            reviews: campaign.adReviewCount ?? 0,
        };
    }
    return {
        rating: seededLiveAdRating(seedFn, seed),
        reviews: Math.floor(seedFn(seed + 'reviews') * 38 + 5),
    };
}

function AdCardStarsRow({ rating, reviews, className = '' }: { rating: string; reviews: number; className?: string }) {
    return (
        <div className={`flex items-center justify-between px-1 ${className}`}>
            <div className="flex items-center gap-1">
                <span className="flex items-center gap-px text-yellow-500 text-[10px] sm:text-sm leading-none" aria-hidden>
                    {[1, 2, 3, 4, 5].map((star) => (
                        <span key={star}>★</span>
                    ))}
                </span>
                <span className="text-white font-bold text-[10px] sm:text-sm">{rating}</span>
                <span className="text-gray-500 text-[10px] sm:text-xs">({reviews})</span>
            </div>
        </div>
    );
}

/** Non-OF ads — same neon green as AI NSFW / “Build your AI” style CTAs. */
export const AFFILIATE_AD_BTN: React.CSSProperties = {
    background: '#39FF14',
    color: '#000000',
};

/** OnlyFans creator ads: solid blue, no glow. */
const OF_CREATOR_BTN: React.CSSProperties = {
    background: '#0088FF',
    color: '#FFFFFF',
};

function adButtonStyle(campaign: FeedCampaign | undefined): React.CSSProperties {
    if (campaign?.adType === 'onlyfans-creator') return OF_CREATOR_BTN;
    return AFFILIATE_AD_BTN;
}

const AD_BTN_CLASS = 'w-full py-2.5 sm:py-3 px-3 rounded-xl font-black text-sm active:scale-[0.98]';

const INSTACAM_FUN_CHAT_CAMPAIGN_ID = '69a81c337486e6d375e1818b';

function isStartAFunChatAd(campaign: FeedCampaign | undefined, name: string | undefined): boolean {
    if (campaign?._id === INSTACAM_FUN_CHAT_CAMPAIGN_ID) return true;
    const n = (name || campaign?.name || '').toLowerCase();
    if (n.includes('instacams')) return true;
    if (n.includes('start a fun chat')) return true;
    if (n.includes('start a conversation with someone new')) return true;
    return (campaign?.destinationUrl || '').toLowerCase().includes('offer_id=12348');
}

function AdCardVerifiedMark({
    show,
    className = 'w-4 h-4 sm:w-5 sm:h-5 shrink-0',
}: {
    show: boolean;
    className?: string;
}) {
    if (!show) return null;
    return <TwitterVerifiedIcon className={className} />;
}

function feedAdTitleSize(startAFunChat: boolean, growthPercent?: number, center = false): string {
    if (startAFunChat) return 'text-sm sm:text-base';
    if (typeof growthPercent === 'number') return 'text-sm sm:text-lg';
    if (center) return 'text-sm sm:text-xl md:text-2xl';
    return 'text-sm sm:text-xl';
}

function feedAdTitleTextClass(startAFunChat: boolean): string {
    if (startAFunChat) return 'min-w-0 truncate whitespace-nowrap';
    return 'min-w-0 truncate';
}

function feedAdHookClass(startAFunChat: boolean, centered = false): string {
    if (startAFunChat) {
        return `text-white/95 text-lg sm:text-xl font-normal leading-snug ${centered ? 'text-center' : 'text-left'}`;
    }
    const align = centered ? 'text-center' : '';
    return `text-gray-400 text-xs sm:text-sm line-clamp-2 sm:line-clamp-3 leading-relaxed font-medium ${align}`;
}

function feedAdImagePanelClass(startAFunChat: boolean, variant: 'native' | 'standard' | 'featured'): string {
    if (startAFunChat) return 'relative w-full h-44 sm:h-60 md:h-64 overflow-hidden bg-[#1a1a1a]';
    if (variant === 'standard') return 'relative w-full h-32 sm:h-48 overflow-hidden bg-[#1a1a1a]';
    return 'relative w-full h-32 sm:h-52 overflow-hidden bg-[#1a1a1a]';
}

function feedAdImageClass(startAFunChat: boolean): string {
    if (startAFunChat) {
        return 'object-cover object-top transition-transform duration-500 ease-out group-hover:scale-[1.03]';
    }
    return 'object-cover transition-transform duration-700 group-hover:scale-110';
}

function VisitingNowOverlay({ label, className = 'bottom-3 left-3' }: { label: string; className?: string }) {
    return (
        <div className={`absolute ${className} z-10 flex gap-2`}>
            <div className="bg-black/70 backdrop-blur-md border border-white/20 px-2 py-1 sm:px-2.5 sm:py-1 rounded-lg flex items-center gap-1 sm:gap-1.5 shadow-lg">
                <span className="text-[10px] sm:text-xs text-red-400">⚡</span>
                <span className="text-[10px] sm:text-xs font-bold text-white">{label}</span>
            </div>
        </div>
    );
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

function OnlyFansCreatorAdCard({ campaign, isIndex = 0 }: { campaign: FeedCampaign; handleClick?: (shownVariantIdx?: number) => void; growthPercent?: number; isIndex?: number }) {
    const cardRef = useRef<HTMLDivElement>(null);
    const impressionFiredRef = useRef(false);
    const creator = feedCampaignToFeaturedCreator(campaign);
    const placementBase = (campaign.placement || 'feed').trim();

    useEffect(() => {
        const el = cardRef.current;
        if (!el) return;
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting && !impressionFiredRef.current) {
                impressionFiredRef.current = true;
                if (!IMPRESSION_TRACKING_PAUSED && campaign._id) trackImpression(campaign._id);
            }
        }, { threshold: 0.3 });
        observer.observe(el);
        return () => observer.disconnect();
    }, [campaign._id]);

    const entry = cardEntryProps(isIndex);

    return (
        <div ref={cardRef} className={`h-full ${entry.className}`} style={entry.style}>
            <HomeOfFeaturedCreatorCard
                creator={creator}
                clickPlacementPrefix={placementBase}
                layout="vertical"
                showSubscriberCount={false}
                className="h-full"
            />
        </div>
    );
}

function VideoAdCard({ campaign, handleClick, hidePromoted = false, growthPercent, isIndex = 0 }: { campaign: FeedCampaign; handleClick: () => void; hidePromoted?: boolean; growthPercent?: number; isIndex?: number }) {
    const { t } = useTranslation();
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
                        if (!IMPRESSION_TRACKING_PAUSED && !videoImpressionFiredRef.current) {
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

    const buttonText = (campaign.buttonText && campaign.buttonText.trim()) ? campaign.buttonText.trim() : t('groups.visitNow');

    const { rating, reviews: reviewCount } = displayAdRating(campaign, seededRandomVideo, seed);
    const btnStyle = adButtonStyle(campaign);

    const entry = cardEntryProps(isIndex);

    return (
        <div
            className={`h-full ${entry.className}`}
            style={entry.style}
        >
            <div
                ref={cardRef}
                className="rounded-2xl sm:rounded-3xl overflow-hidden h-full min-h-[280px] sm:min-h-[480px] relative cursor-pointer group border border-white/5 bg-[#0a0a0a] flex flex-col"
                onClick={handleClick}
                role="link"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleClick()}
                aria-label={campaign.name}
            >
                <div className="relative w-full flex-1 min-h-[11.2rem] sm:min-h-[16.8rem] overflow-hidden bg-[#0a0a0a]">
                    <video
                        ref={videoRef}
                        poster={campaign.creative || undefined}
                        muted
                        playsInline
                        loop
                        preload="none"
                        className="absolute inset-0 w-full h-full object-contain"
                        style={campaign.creative ? undefined : { background: '#0a0a0a' }}
                        aria-hidden="true"
                    />
                    <div className="absolute bottom-2 left-2 sm:bottom-3 sm:left-3 z-10">
                        <div className="bg-black/80 backdrop-blur-md border border-white/10 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg flex items-center gap-1 sm:gap-1.5 shadow-lg">
                            <span className="text-[10px] sm:text-xs text-red-400">⚡</span>
                            <span className="text-[10px] sm:text-xs font-bold text-white">{visitingCount} visiting</span>
                        </div>
                    </div>
                </div>

                <div className="p-3 sm:p-5 flex flex-col gap-1.5 sm:gap-2.5 shrink-0">
                    <h3 className="font-black text-white leading-tight flex items-start justify-between gap-2 text-[11px] sm:text-xs">
                        <span className="flex items-start gap-1 min-w-0">
                            <span className="min-w-0 break-words">{campaign.name}</span>
                            {campaign.verified === true && (
                                <TwitterVerifiedIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 mt-0.5" />
                            )}
                        </span>
                        <span className="shrink-0">
                            <GrowthTrendBadge growthPercent={growthPercent} />
                        </span>
                    </h3>

                    {campaign.description && (
                        <p className="text-gray-300 text-xs sm:text-sm line-clamp-1 sm:line-clamp-2 leading-relaxed">
                            {campaign.description}
                        </p>
                    )}

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                            <span className="text-yellow-500 text-[10px] sm:text-sm">⭐</span>
                            <span className="text-white font-bold text-[10px] sm:text-sm">{rating}</span>
                            <span className="text-gray-400 text-[10px] sm:text-xs">({reviewCount})</span>
                        </div>
                    </div>

                    <button
                        onClick={(e) => { e.stopPropagation(); handleClick(); }}
                        className={AD_BTN_CLASS}
                        style={btnStyle}
                    >
                        {buttonText}
                    </button>
                </div>
            </div>
        </div>
    );
}

function capAinsfwAdWords(text: string, max = 18): string {
    if (!text) return '';
    const words = text.trim().split(/\s+/);
    if (words.length <= max) return text;
    return words.slice(0, max).join(' ') + '…';
}

/** Compact AI NSFW hub card — dark chrome; CTA matches unified affiliate green. */
function AinsfwHubAdCard({
    campaign,
    handleClick,
    imageSrc,
    setImageSrc,
    imgRef,
    isIndex,
    forceVisible = false,
    spotlight = false,
}: {
    campaign: FeedCampaign;
    handleClick: () => void;
    imageSrc: string;
    setImageSrc: (src: string) => void;
    imgRef: React.RefObject<HTMLDivElement | null>;
    isIndex: number;
    forceVisible?: boolean;
    spotlight?: boolean;
}) {
    const { t } = useTranslation();
    const showVerified = campaign.verified !== false;

    return (
        <div className="h-full">
            <div
                role="link"
                tabIndex={0}
                onClick={handleClick}
                onKeyDown={(e) => { if (e.key === 'Enter') handleClick(); }}
                className={spotlight
                    ? 'relative bg-[#ecfdf3] rounded-xl overflow-hidden h-full flex flex-col border-2 border-[#22c55e]/70 hover:border-[#16a34a] shadow-[0_10px_28px_-14px_rgba(34,197,94,0.7)] transition-all duration-150 group cursor-pointer'
                    : 'relative bg-white rounded-xl overflow-hidden h-full flex flex-col border border-black/10 hover:border-black/25 shadow-sm transition-all duration-150 group cursor-pointer'}
            >
                <div ref={imgRef} className={spotlight
                    ? 'relative w-full h-[154px] sm:h-[173px] overflow-hidden bg-[#d1fae5] shrink-0'
                    : 'relative w-full h-[154px] sm:h-[173px] overflow-hidden bg-gray-100 shrink-0'}>
                    <Image
                        src={imageSrc}
                        alt={campaign.name}
                        fill
                        sizes="(max-width: 768px) 50vw, 25vw"
                        className="object-cover"
                        priority={forceVisible || isIndex < 4}
                        onError={() => setImageSrc('/assets/image.jpg')}
                    />
                </div>
                <div className="p-2.5 sm:p-3 flex flex-col flex-grow">
                    <h3 className={spotlight
                        ? 'text-xs sm:text-sm font-black text-gray-900 mb-0.5 leading-tight truncate group-hover:text-[#15803d] transition-colors flex items-center gap-1 min-w-0'
                        : 'text-xs sm:text-sm font-black text-gray-900 mb-0.5 leading-tight truncate group-hover:text-black transition-colors flex items-center gap-1 min-w-0'}>
                        <span className="truncate">{campaign.name}</span>
                        {showVerified && <VerifiedBadge className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />}
                    </h3>
                    {campaign.description ? (
                        <p className={spotlight
                            ? 'text-gray-600 text-[10px] sm:text-xs line-clamp-2 leading-relaxed flex-grow mb-2'
                            : 'text-gray-600 text-[10px] sm:text-xs line-clamp-2 leading-relaxed flex-grow mb-2'}>
                            {capAinsfwAdWords(campaign.description)}
                        </p>
                    ) : (
                        <div className="flex-grow mb-2" />
                    )}
                    <div
                        className={`${AD_BTN_CLASS} cursor-pointer text-center text-[10px] sm:text-xs tracking-[0.06em] uppercase`}
                        style={adButtonStyle(campaign)}
                    >
                        {t('ainsfw.tryNow', 'TRY NOW →')}
                    </div>
                </div>
            </div>
        </div>
    );
}

function PremiumMosaicCard({ campaign, handleClick, growthPercent }: { campaign: FeedCampaign; handleClick: () => void; growthPercent?: number }) {
    const { t } = useTranslation();
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
    const btnStyle = adButtonStyle(campaign);

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
        if (liveCount === 0) setLiveCount(Math.floor(seededRandom(seed + 'count1') * 350 + 300));
        isLiveCount = true;
        fakeCount = `${liveCount} visiting`;
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
                if (!IMPRESSION_TRACKING_PAUSED) trackImpression(campaign._id);
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
                <div className="rounded-2xl sm:rounded-3xl overflow-hidden h-full flex flex-col bg-[#131a24] group border border-white/5">
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
                        <h3 className={`font-black text-white mb-1 sm:mb-2 leading-tight flex items-center justify-between gap-2 ${typeof growthPercent === 'number' ? 'text-sm sm:text-lg' : 'text-sm sm:text-xl'}`}>
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
                                className={AD_BTN_CLASS}
                                style={btnStyle}
                            >
                                🔓 {campaign.buttonText || t('groups.unlockTheVault')}
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
    const { t } = useTranslation();

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
          buttonText: campaign.buttonText || t('groups.visitSite'),
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
            buttonText: advert?.buttonText || t('groups.visitSite'),
            isCampaign: false,
          };

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
        t('groups.visitSite'),
        t('groups.visitNow'),
        t('groups.tryThisBot'),
        t('groups.visitSite'),
        t('groups.unlockTheVault'),
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
    const { rating: cardRating, reviews: cardReviews } = campaign
        ? displayAdRating(campaign, seededRandom, seed)
        : { rating: seededLiveAdRating(seededRandom, seed), reviews: Math.floor(seededRandom(seed + 'reviews') * 38 + 5) };

    const displayButtonText = (ad.buttonText && String(ad.buttonText).trim()) ? String(ad.buttonText).trim() : (buttonTexts[Math.floor(seededRandom(seed) * buttonTexts.length)]);

    const btnStyle = adButtonStyle(campaign);

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
        if (!IMPRESSION_TRACKING_PAUSED && isInView && ad.isCampaign && ad._id && !impressionFiredRef.current) {
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
        // Organic /go hop: open new tab. Promoted onlyfans-creator ads keep their own
        // destinationUrl / tracking link untouched (never rewrite to /go).
        if (url.startsWith('/go/')) {
            window.open(url, '_blank', 'noopener,noreferrer');
        } else if (url && url.startsWith('/')) {
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
            setLiveCount(Math.floor(seededRandom(seed + 'count1') * 350 + 300));
        }
        isLiveCount = true;
        fakeCount = `${liveCount} visiting`;
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
        fakeCount = `${liveCount} visiting`;
    }

    const showVerified = campaign?.verified === true;
    const startAFunChatAd = isStartAFunChatAd(campaign, ad.name);
    const adImageClass = feedAdImageClass(startAFunChatAd);
    const adImageGradientClass = startAFunChatAd
        ? 'bg-gradient-to-t from-[#0a0a0a]/75 via-transparent to-transparent opacity-55'
        : 'bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent opacity-80';

    const entry = cardEntryProps(isIndex);

    if (isTelegram) {
        return null;
    }

    // AI NSFW hub cards — ToolCard chrome, not the tall groups Featured Bot card
    const ainsfwPlacement = placementOverride === 'ainsfw-featured' || placementOverride === 'ainsfw-feed';
    if (ainsfwPlacement && campaign) {
        return (
            <AinsfwHubAdCard
                campaign={campaign}
                handleClick={() => handleClick()}
                imageSrc={imageSrc}
                setImageSrc={setImageSrc}
                imgRef={imgRef}
                isIndex={isIndex}
                forceVisible={forceVisible}
                spotlight={placementOverride === 'ainsfw-featured'}
            />
        );
    }

    // ONLYFANS CREATOR CARD — portrait layout matching /ofsearch style
    if (campaign?.adType === 'onlyfans-creator') {
        return <OnlyFansCreatorAdCard campaign={campaign} handleClick={handleClick} growthPercent={growthPercent} isIndex={isIndex} />;
    }

    // FEATURED BOT CARD — slot 5 bot spotlight
    if (campaign?.adType === 'featured-bot') {
        return (
            <div
                className={`h-full ${entry.className}`}
                style={entry.style}
            >
                <div className="rounded-2xl sm:rounded-3xl overflow-hidden h-full flex flex-col bg-[#131a24] border border-cyan-500/20 group relative">
                    {/* Image */}
                    <div ref={imgRef} className={feedAdImagePanelClass(startAFunChatAd, 'featured')}>
                        <Image
                            src={imageSrc}
                            alt={ad.name}
                            fill
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            className={adImageClass}
                            priority={forceVisible || isIndex < 12}
                            onError={() => setImageSrc('/assets/image.jpg')}
                        />
                        <div className={`absolute inset-0 ${adImageGradientClass}`} />
                        {fakeCount && <VisitingNowOverlay label={fakeCount} className="bottom-2 left-2 sm:bottom-3 sm:left-3" />}
                        <div className="absolute bottom-1.5 right-1.5 z-10">
                            <span className="text-[8px] sm:text-[9px] font-bold text-white/40 uppercase tracking-wider">🤖 Featured Bot</span>
                        </div>
                    </div>
                    {/* Content */}
                    <div className="p-3 sm:p-5 flex-grow flex flex-col relative">
                        <h3 className={`font-black text-white mb-2 sm:mb-3 leading-snug flex items-start justify-between gap-2 ${feedAdTitleSize(startAFunChatAd, growthPercent)}`}>
                            <span className="flex items-start gap-1 min-w-0 flex-1">
                                <span className={feedAdTitleTextClass(startAFunChatAd)}>{ad.name}</span>
                                <AdCardVerifiedMark show={showVerified} className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 mt-0.5" />
                            </span>
                            <span className="shrink-0">
                                <GrowthTrendBadge growthPercent={growthPercent} />
                            </span>
                        </h3>
                        {ad.description?.trim() ? (
                            <div className="mb-3 sm:mb-6 flex-grow">
                                <p className={feedAdHookClass(startAFunChatAd)}>{ad.description}</p>
                            </div>
                        ) : (
                            <div className="mb-2 sm:mb-3 flex-grow" />
                        )}
                        <div className="mt-auto space-y-2 sm:space-y-3">
                            <AdCardStarsRow rating={cardRating} reviews={cardReviews} />
                            <button
                                onClick={() => handleClick()}
                                className={AD_BTN_CLASS}
                                style={btnStyle}
                            >
                                {ad.buttonText || t('groups.tryThisBot')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // PREMIUM MOSAIC CARD — group grid for premium category ads
    if (campaign?.adType === 'premium' && campaign.premiumGroups?.length) {
        return <PremiumMosaicCard campaign={campaign} handleClick={handleClick} growthPercent={growthPercent} />;
    }

    // VIDEO AD CARD — only when campaign has a videoUrl
    if (campaign?.videoUrl) {
        return <VideoAdCard campaign={campaign} handleClick={handleClick} hidePromoted={hidePromoted} growthPercent={growthPercent} isIndex={isIndex} />;
    }

    // NATIVE AD CARD (Looks like GroupCard)
    if (isNative) {
        return (
            <div
                className={`h-full ${entry.className}`}
                style={entry.style}
            >
                <div className="rounded-2xl sm:rounded-3xl overflow-hidden h-full flex flex-col bg-[#131a24] border border-white/5 group relative">
                    {/* Advert Image */}
                    <div ref={imgRef} className={feedAdImagePanelClass(startAFunChatAd, 'native')}>
                        <Image
                            src={imageSrc}
                            alt={ad.name}
                            fill
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            className={adImageClass}
                            priority={forceVisible || isIndex < 12}
                            onError={() => setImageSrc('/assets/image.jpg')}
                        />
                        <div className={`absolute inset-0 ${adImageGradientClass}`} />
                        {fakeCount && <VisitingNowOverlay label={fakeCount} />}
                    </div>

                    {/* Card Content */}
                    <div className="p-3 sm:p-5 flex-grow flex flex-col relative">
                        {/* Title */}
                        <h3 className={`font-black text-white mb-2 sm:mb-3 leading-snug flex items-start justify-between gap-2 ${feedAdTitleSize(startAFunChatAd, growthPercent)}`}>
                            <span className="flex items-start gap-1 min-w-0 flex-1">
                                <span className={feedAdTitleTextClass(startAFunChatAd)}>{ad.name}</span>
                                <AdCardVerifiedMark show={showVerified} className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 mt-0.5" />
                            </span>
                            <span className="shrink-0">
                                <GrowthTrendBadge growthPercent={growthPercent} />
                            </span>
                        </h3>

                        {ad.description?.trim() ? (
                            <div className="mb-3 sm:mb-6 flex-grow">
                                <p className={feedAdHookClass(startAFunChatAd)}>{ad.description}</p>
                            </div>
                        ) : (
                            <div className="mb-2 sm:mb-3 flex-grow" />
                        )}

                        {/* Footer Actions */}
                        <div className="mt-auto space-y-2 sm:space-y-3">
                            {/* Rating Row */}
                            <AdCardStarsRow rating={cardRating} reviews={cardReviews} />

                            {/* Main Button */}
                            <button
                                onClick={() => handleClick()}
                                className={AD_BTN_CLASS}
                                style={btnStyle}
                            >
                                {displayButtonText}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // STANDARD AD CARD (Flashy)
    return (
        <div
            className={`group h-full ${entry.className}`}
            style={entry.style}
        >
            <div className="rounded-2xl overflow-hidden h-full flex flex-col bg-[#131a24] border border-white/5 relative">
                {/* Advert Image */}
                <div ref={imgRef} className={feedAdImagePanelClass(startAFunChatAd, 'standard')}>
                    <Image
                        src={imageSrc}
                        alt={ad.name}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className={adImageClass}
                        priority={forceVisible || isIndex < 12}
                        onError={() => setImageSrc('/assets/image.jpg')}
                    />
                    <div className={`absolute inset-0 ${adImageGradientClass}`} />
                    {fakeCount && <VisitingNowOverlay label={fakeCount} />}
                </div>

                {/* Card Content */}
                <div className="p-3 sm:p-5 flex-grow flex flex-col relative">
                    <h3 className={`font-black text-white mb-2 sm:mb-3 flex items-start justify-between gap-2 ${feedAdTitleSize(startAFunChatAd, growthPercent, true)} ${typeof growthPercent === 'number' || startAFunChatAd ? 'text-left' : 'text-center'}`}>
                        <span className={`flex items-start gap-1 min-w-0 flex-1 ${typeof growthPercent === 'number' || startAFunChatAd ? '' : 'justify-center w-full'}`}>
                            <span className={feedAdTitleTextClass(startAFunChatAd)}>{ad.name}</span>
                            <AdCardVerifiedMark show={showVerified} className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 mt-0.5" />
                        </span>
                        <span className="shrink-0">
                            <GrowthTrendBadge growthPercent={growthPercent} />
                        </span>
                    </h3>

                    {ad.description?.trim() ? (
                        <div className="mb-3 sm:mb-6 flex-grow">
                            <p className={feedAdHookClass(startAFunChatAd, !startAFunChatAd)}>{ad.description}</p>
                        </div>
                    ) : (
                        <div className="mb-2 sm:mb-3 flex-grow" />
                    )}

                    <div className="mt-auto space-y-2 sm:space-y-3">
                        <AdCardStarsRow rating={cardRating} reviews={cardReviews} />
                        <button
                            onClick={() => handleClick()}
                            className={AD_BTN_CLASS}
                            style={btnStyle}
                        >
                            {displayButtonText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
