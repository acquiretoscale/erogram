import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import axios from 'axios';
import { Advert } from './types';
import { useIsTelegramBrowser } from '../hooks/useIsTelegramBrowser';

interface AdvertCardProps {
    advert: Advert;
    isIndex: number;
    shouldPreload?: boolean;
    onVisible?: () => void;
    forceVisible?: boolean;
}

export default function AdvertCard({ advert, isIndex = 0, shouldPreload = false, onVisible, forceVisible = false }: AdvertCardProps) {
    const isTelegram = useIsTelegramBrowser();
    const [isHovered, setIsHovered] = useState(false);
    const [imageSrc, setImageSrc] = useState(advert.image || '/assets/image.jpg');
    const [isInView, setIsInView] = useState(forceVisible);
    const hasFetchedRef = useRef(false);
    const imgRef = useRef<HTMLDivElement>(null);
    const [liveCount, setLiveCount] = useState<number>(0);

    // Button text variations
    const buttonTexts = [
        'Try now',
        'See More',
        'Show Me',
        'Continue →',
        'Next →',
        'Details',
        'More Info',
        'View',
        'Preview',
        'Begin',
        'Visit',
        'Check It Out',
        'Learn More',
        'Get Started',
        'Continue to Site',
        'Visit Site',
        'Open Now',
        'Explore',
        'Watch Video',
        'Join Now',
        'Sign Up Free',
        'Claim Offer',
        'Start Now',
        'Access Now',
        'Enter Site',
        'View Content',
        'See Action',
        'Instant Access',
        'Unlock Now',
        'Tap to View'
    ];

    // Color gradient options that fit the site
    const colorSchemes = [
        { from: 'from-orange-500', to: 'to-red-600', hoverFrom: 'hover:from-orange-600', hoverTo: 'hover:to-red-700', border: 'border-orange-500/50', hoverBorder: 'hover:border-orange-500' },
        { from: 'from-blue-500', to: 'to-purple-600', hoverFrom: 'hover:from-blue-600', hoverTo: 'hover:to-purple-700', border: 'border-blue-500/50', hoverBorder: 'hover:border-blue-500' },
        { from: 'from-purple-500', to: 'to-pink-600', hoverFrom: 'hover:from-purple-600', hoverTo: 'hover:to-pink-700', border: 'border-purple-500/50', hoverBorder: 'hover:border-purple-500' },
        { from: 'from-green-500', to: 'to-teal-600', hoverFrom: 'hover:from-green-600', hoverTo: 'hover:to-teal-700', border: 'border-green-500/50', hoverBorder: 'hover:border-green-500' },
        { from: 'from-pink-500', to: 'to-red-600', hoverFrom: 'hover:from-pink-600', hoverTo: 'hover:to-red-700', border: 'border-pink-500/50', hoverBorder: 'hover:border-pink-500' },
        { from: 'from-yellow-500', to: 'to-orange-600', hoverFrom: 'hover:from-yellow-600', hoverTo: 'hover:to-orange-700', border: 'border-yellow-500/50', hoverBorder: 'hover:border-yellow-500' },
        { from: 'from-cyan-500', to: 'to-blue-600', hoverFrom: 'hover:from-cyan-600', hoverTo: 'hover:to-blue-700', border: 'border-cyan-500/50', hoverBorder: 'hover:border-cyan-500' },
        { from: 'from-indigo-500', to: 'to-purple-600', hoverFrom: 'hover:from-indigo-600', hoverTo: 'hover:to-purple-700', border: 'border-indigo-500/50', hoverBorder: 'hover:border-indigo-500' },
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

    // Use advert ID + index as seed for consistent random selection (same on server and client)
    const seed = `${advert._id}-${isIndex}`;

    // Use configured button text if available, otherwise random
    const buttonText = advert.buttonText || buttonTexts[Math.floor(seededRandom(seed) * buttonTexts.length)];
    const colorScheme = colorSchemes[Math.floor(seededRandom(seed + 'color') * colorSchemes.length)];

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

    // Preload image if shouldPreload is true (for next 6 items)
    useEffect(() => {
        if (shouldPreload && imageSrc === '/assets/image.jpg' && advert._id && !hasFetchedRef.current) {
            hasFetchedRef.current = true;
            // Preload image in the background
            fetch(`/api/adverts/${advert._id}/image`)
                .then(res => res.json())
                .then(data => {
                    if (data.image && data.image !== '/assets/image.jpg') {
                        setImageSrc(data.image);
                    }
                })
                .catch(err => {
                    // Silently fail for preloads
                });
        }
    }, [shouldPreload, imageSrc, advert._id]);

    // Fetch actual image when in view and it's the placeholder
    useEffect(() => {
        if (isInView && imageSrc === '/assets/image.jpg' && advert._id && !hasFetchedRef.current) {
            hasFetchedRef.current = true;
            // Load immediately - browser handles parallel requests efficiently
            fetch(`/api/adverts/${advert._id}/image`)
                .then(res => res.json())
                .then(data => {
                    if (data.image && data.image !== '/assets/image.jpg') {
                        setImageSrc(data.image);
                    }
                })
                .catch(err => {
                    console.error('Failed to load advert image:', err);
                });
        }
    }, [isInView, imageSrc, advert._id]);

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

    // Badge Logic
    const badgeRand = seededRandom(seed + 'badge');
    let badge = { text: 'Featured', icon: '⭐', color: 'bg-gradient-to-r from-yellow-400 to-orange-500' }; // Default fallback

    // Make badges rarer (20% chance, was 80%)
    const showBadge = badgeRand > 0.8;

    if (showBadge) {
        const badges = [
            { text: 'Trending', icon: '🔥', color: 'bg-red-500' },
            { text: 'Hot', icon: '🌶️', color: 'bg-orange-500' },
            { text: 'New', icon: '✨', color: 'bg-green-500' },
            { text: 'Premium', icon: '👑', color: 'bg-purple-500' },
            { text: 'Verified', icon: '✅', color: 'bg-blue-500' },
            { text: 'Best Value', icon: '💎', color: 'bg-pink-500' },
            { text: 'Editor\'s Pick', icon: '🎯', color: 'bg-indigo-500' }
        ];
        badge = badges[Math.floor(seededRandom(seed + 'badgeType') * badges.length)];
    }

    // Fake Stats Logic
    const statsRand = seededRandom(seed + 'stats');
    let fakeCount = null;
    let isLiveCount = false;

    // Make stats rarer (30% chance, was 70%)
    if (statsRand > 0.7) {
        const type = seededRandom(seed + 'statsType');
        if (type < 0.33) {
            // Initialize live count
            if (liveCount === 0) {
                setLiveCount(Math.floor(seededRandom(seed + 'count1') * 400 + 120));
            }
            isLiveCount = true;
            fakeCount = `${liveCount} visiting now`;
        }
        else if (type < 0.66) fakeCount = `${(seededRandom(seed + 'count2') * 5 + 1).toFixed(1)}k clicks today`;
        else fakeCount = `Trending #${Math.floor(seededRandom(seed + 'count3') * 5 + 1)}`;
    }

    // Dynamic Live Count Effect
    useEffect(() => {
        if (isLiveCount) {
            const interval = setInterval(() => {
                setLiveCount(prev => {
                    const change = Math.floor(Math.random() * 9) - 3; // -3 to +5
                    return Math.max(10, prev + change); // Ensure it doesn't go below 10
                });
            }, 3000 + Math.random() * 2000); // Random interval 3-5s

            return () => clearInterval(interval);
        }
    }, [isLiveCount]);

    // Update fakeCount text when liveCount changes
    if (isLiveCount) {
        fakeCount = `${liveCount} visiting now`;
    }

    // Verified Logic - Make rarer (20% chance, was 50%)
    const showVerified = seededRandom(seed + 'verified') > 0.8;

    // Sponsored Badge Logic for Native Ads (10% chance)
    const showSponsored = seededRandom(seed + 'sponsored') < 0.1;

    if (isTelegram) {
        return null;
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
                <div className={`glass rounded-3xl overflow-hidden h-full flex flex-col backdrop-blur-xl border transition-all duration-500 group relative border-white/5 hover:border-white/20 hover:shadow-2xl hover:shadow-black/50`}>
                    {/* Advert Image */}
                    <div ref={imgRef} className="relative w-full h-52 overflow-hidden bg-[#1a1a1a]">
                        <Image
                            src={imageSrc}
                            alt={advert.name}
                            fill
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            className="object-cover transition-transform duration-700 group-hover:scale-110"
                            priority={forceVisible || isIndex < 12}
                            onError={() => setImageSrc('/assets/image.jpg')}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent opacity-80" />

                        {/* Badges - Subtle "Sponsored" */}
                        {showSponsored && (
                            <div className="absolute top-3 left-3 flex gap-2 flex-wrap">
                                <div className="bg-white/10 backdrop-blur-md border border-white/10 text-gray-300 text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider flex items-center gap-1">
                                    <span>📢</span> Sponsored
                                </div>
                            </div>
                        )}

                        {/* Stats Overlay (Fake to match group card feel) */}
                        <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
                            <div className="flex gap-2 flex-wrap">
                                <div className="bg-black/60 backdrop-blur-md border border-white/10 px-2 py-1 rounded-lg flex items-center gap-1.5">
                                    <span className="text-xs">👁️</span>
                                    <span className="text-xs font-bold text-white">{Math.floor(seededRandom(seed + 'views') * 50000 + 5000).toLocaleString()}</span>
                                </div>
                                <div className="bg-black/60 backdrop-blur-md border border-white/10 px-2 py-1 rounded-lg flex items-center gap-1.5">
                                    <span className="text-xs">👥</span>
                                    <span className="text-xs font-bold text-white">{Math.floor(seededRandom(seed + 'members') * 10000 + 1000).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-5 flex-grow flex flex-col relative">
                        {/* Title */}
                        <h3 className="text-xl font-black text-white mb-3 line-clamp-2 leading-tight group-hover:text-blue-400 transition-colors flex items-center gap-2">
                            {advert.name}
                            {showVerified && (
                                <span className="shrink-0 inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-500 text-white text-[8px] shadow-sm" title="Verified">
                                    ✓
                                </span>
                            )}
                        </h3>

                        {/* Tags */}
                        <div className="flex flex-wrap gap-2 mb-4">
                            <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/5 text-gray-300 text-xs font-medium hover:bg-white/10 transition-colors">
                                {advert.category}
                            </span>
                            <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/5 text-gray-300 text-xs font-medium hover:bg-white/10 transition-colors">
                                {advert.country}
                            </span>
                        </div>

                        {/* Description */}
                        <div className="mb-6 flex-grow">
                            <p className="text-gray-400 text-sm line-clamp-3 leading-relaxed">
                                {advert.description}
                            </p>
                        </div>

                        {/* Footer Actions */}
                        <div className="mt-auto space-y-3">
                            {/* Rating Row (Fake) */}
                            <div className="flex items-center justify-between px-1">
                                <div className="flex items-center gap-1">
                                    <span className="text-yellow-500 text-sm">⭐</span>
                                    <span className="text-white font-bold text-sm">{(seededRandom(seed + 'rating') * 1.5 + 3.5).toFixed(1)}</span>
                                    <span className="text-gray-500 text-xs">({Math.floor(seededRandom(seed + 'reviews') * 50 + 10)})</span>
                                </div>
                                <div className="text-xs text-gray-500 font-medium">
                                    Promoted
                                </div>
                            </div>

                            {/* Main Button */}
                            <button
                                onClick={handleClick}
                                className={`group/btn relative flex items-center justify-center w-full overflow-hidden rounded-xl py-3.5 px-4 font-black text-white shadow-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] bg-gradient-to-r from-blue-600 to-purple-600 hover:shadow-blue-500/40`}
                            >
                                <div className="absolute inset-0 bg-white/20 opacity-0 transition-opacity duration-300 group-hover/btn:opacity-100" />
                                <span className={`relative flex items-center justify-center gap-2 text-sm uppercase tracking-wider`}>
                                    <span className="text-lg">🚀</span> {buttonText}
                                </span>
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
            <div className={`glass rounded-2xl overflow-hidden h-full flex flex-col backdrop-blur-lg border-2 ${colorScheme.border} ${colorScheme.hoverBorder} transition-all duration-300 ${isHovered ? 'hover-glow scale-[1.02]' : ''} relative shadow-lg shadow-black/40`}>
                {/* Random Badge */}
                {showBadge && (
                    <div className="absolute top-3 right-3 z-10">
                        <span className={`px-3 py-1 rounded-full ${badge.color} text-white text-xs font-black uppercase tracking-wider shadow-lg flex items-center gap-1 animate-pulse`}>
                            <span>{badge.icon}</span> {badge.text}
                        </span>
                    </div>
                )}

                {/* Advert Image */}
                <div ref={imgRef} className="relative w-full h-48 overflow-hidden bg-gray-800">
                    <Image
                        src={imageSrc}
                        alt={advert.name}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover transition-transform duration-700"
                        style={{ transform: isHovered ? 'scale(1.1)' : 'scale(1)' }}
                        priority={forceVisible || isIndex < 12}
                        onError={() => setImageSrc('/assets/image.jpg')}
                    />
                    {/* Gradient Overlay for text readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-80"></div>

                    {/* Fake Stats Overlay */}
                    {fakeCount && (
                        <div className="absolute bottom-3 left-3 flex gap-2">
                            <div className="bg-black/80 backdrop-blur-md border border-white/10 px-2 py-1 rounded-lg flex items-center gap-1.5 shadow-lg">
                                <span className="text-xs text-red-400">⚡</span>
                                <span className="text-xs font-bold text-white">{fakeCount}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Card Content */}
                <div className="p-5 flex-grow flex flex-col relative">
                    <h3 className="text-xl md:text-2xl font-black text-white mb-3 text-center drop-shadow-md flex items-center justify-center gap-2">
                        <span className="line-clamp-2">
                            {advert.name}
                        </span>
                        {showVerified && (
                            <span className="shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-500 text-white text-[10px] shadow-sm" title="Verified">
                                ✓
                            </span>
                        )}
                    </h3>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-2 mb-4 justify-center">
                        <span className="px-2 py-0.5 rounded-md bg-white/10 border border-white/10 text-gray-300 text-[10px] font-bold uppercase tracking-wide">
                            {advert.category}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-white/10 border border-white/5 text-gray-300 text-[10px] font-bold uppercase tracking-wide">
                            {advert.country}
                        </span>
                    </div>

                    {/* Description */}
                    <div className="mb-6 flex-grow">
                        <p className="text-gray-300 text-center text-sm line-clamp-3 leading-relaxed font-medium">
                            {advert.description}
                        </p>
                    </div>

                    {/* Action Button */}
                    <button
                        onClick={handleClick}
                        className={`group relative w-full overflow-hidden rounded-xl py-3.5 px-4 font-black text-white shadow-lg transition-all duration-300 hover:scale-[1.03] hover:shadow-xl bg-gradient-to-r ${colorScheme.from} ${colorScheme.to} ${colorScheme.hoverFrom} ${colorScheme.hoverTo}`}
                    >
                        <div className="absolute inset-0 flex items-center justify-center bg-white/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
                        <span className="relative flex items-center justify-center gap-2 text-lg uppercase tracking-wide">
                            {buttonText}
                            <span className="animate-pulse">🚀</span>
                        </span>
                    </button>
                </div>
            </div>
        </motion.div>
    );
}
