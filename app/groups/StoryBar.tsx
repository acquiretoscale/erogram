'use client';

import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import type { StoryCategory } from './types';

interface StoryBarProps {
  storyData: StoryCategory[];
  seenStoryMap?: Record<string, string>;
  onOpenStory: (categoryIndex: number) => void;
}

function VerifiedBadge({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#3b82f6" className="shrink-0">
      <path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81C14.67.63 13.43-.25 12-.25S9.33.63 8.66 1.94c-1.39-.46-2.9-.2-3.91.81s-1.27 2.52-.81 3.91C2.63 7.33 1.75 8.57 1.75 12c0 1.43.88 2.67 2.19 3.34-.46 1.39-.2 2.9.81 3.91s2.52 1.27 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.67-.88 3.34-2.19c1.39.46 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z" />
    </svg>
  );
}

export default function StoryBar({ storyData, seenStoryMap = {}, onOpenStory }: StoryBarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);
    return () => {
      el?.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [storyData]);

  const scroll = (dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({
      left: dir === 'left' ? -240 : 240,
      behavior: 'smooth',
    });
  };

  const hasStories = storyData.length > 0;

  return (
    <section className="mb-6">
      {hasStories && (
        <style>{`
          @keyframes story-neon-spin {
            to { transform: rotate(360deg); }
          }
          .story-neon-ring {
            animation: story-neon-spin 3s linear infinite;
          }
          .story-neon-ring-slow {
            animation: story-neon-spin 5s linear infinite;
          }
        `}</style>
      )}

      <h3 className="sr-only">Recent Groups</h3>

      {/* Main card — warm orange gradient with glossy reflection */}
      {hasStories && <div className="relative rounded-2xl overflow-hidden" style={{
        background: 'linear-gradient(165deg, #1a1008 0%, #2a1a0a 40%, #1f1208 100%)',
        border: '1px solid rgba(245,158,11,0.2)',
        boxShadow: '0 4px 24px rgba(245,158,11,0.08), inset 0 1px 0 rgba(255,200,100,0.08)',
      }}>
        {/* Glossy reflection overlay */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'linear-gradient(180deg, rgba(255,180,60,0.07) 0%, transparent 40%, transparent 85%, rgba(245,158,11,0.04) 100%)',
        }} />

        {/* Compact header — dark with orange accent */}
        <div className="relative z-[1] px-4 py-2.5 flex items-center gap-2.5" style={{ background: '#0a0a0a' }}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="5" />
              <circle cx="12" cy="12" r="5" />
              <circle cx="17.5" cy="6.5" r="1.5" fill="white" stroke="none" />
            </svg>
          </div>
          <div>
            <h4 className="text-[13px] font-black uppercase tracking-widest leading-tight text-white">Erogram Stories</h4>
            <p className="text-[10px] font-medium leading-tight" style={{ color: '#f97316' }}>See what&apos;s new</p>
          </div>
          {/* Orange accent line at bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ background: 'linear-gradient(90deg, #f97316, #ea580c, #f59e0b)' }} />
        </div>

        {/* Scroll container */}
        <div className="relative group/scroll">
          {canScrollLeft && (
            <button
              onClick={() => scroll('left')}
              className="absolute left-0 top-0 bottom-0 z-10 w-10 flex items-center justify-start pl-1.5 opacity-0 group-hover/scroll:opacity-100 transition-opacity duration-200"
              style={{ background: 'linear-gradient(to right, #1a1008 40%, transparent)' }}
              aria-label="Scroll left"
            >
              <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><polyline points="15,18 9,12 15,6" /></svg>
              </div>
            </button>
          )}

          {canScrollRight && (
            <button
              onClick={() => scroll('right')}
              className="absolute right-0 top-0 bottom-0 z-10 w-10 flex items-center justify-end pr-1.5 opacity-0 group-hover/scroll:opacity-100 transition-opacity duration-200"
              style={{ background: 'linear-gradient(to left, #1a1008 40%, transparent)' }}
              aria-label="Scroll right"
            >
              <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><polyline points="9,6 15,12 9,18" /></svg>
              </div>
            </button>
          )}

          <div
            ref={scrollRef}
            className="flex gap-5 overflow-x-auto scrollbar-hide px-4 py-4 pb-5"
          >
            {storyData.map((cat, i) => (
              <StoryCircle
                key={cat.slug}
                category={cat}
                seenAt={seenStoryMap[cat.slug]}
                onClick={() => onOpenStory(i)}
              />
            ))}
            <PremiumUpgradeCircle />
          </div>
        </div>
      </div>}

      {/* Trending categories — always visible for SEO */}
      <nav aria-label="Trending Telegram group categories" className="mt-3 rounded-xl p-2.5 shadow-sm" style={{ background: 'linear-gradient(135deg, #1a1510, #191510)', border: '1px solid rgba(245,158,11,0.15)' }}>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[9px] font-black uppercase tracking-wider shrink-0 mr-0.5" style={{ color: '#f59e0b' }}>🔥 Trending Categories</span>
            {[
              { label: 'Russian', href: '/best-telegram-groups/russian' },
              { label: 'Amateur', href: '/best-telegram-groups/amateur' },
              { label: 'Threesome', href: '/best-telegram-groups/threesome' },
              { label: 'Lesbian', href: '/best-telegram-groups/lesbian' },
              { label: 'China', href: '/best-telegram-groups/china' },
              { label: 'Cosplay', href: '/best-telegram-groups/cosplay' },
              { label: 'Blowjob', href: '/best-telegram-groups/blowjob' },
              { label: 'Colombia', href: '/best-telegram-groups/colombia' },
            ].map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className="px-2 py-[3px] text-[9px] font-bold rounded-full transition-all duration-200 whitespace-nowrap hover:scale-105"
                style={{
                  background: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(234,88,12,0.15))',
                  color: '#fbbf24',
                  border: '1px solid rgba(245,158,11,0.25)',
                }}
              >
                {label}
              </Link>
            ))}
            <Link
              href="/premiumvault"
              className="px-3 py-1.5 text-[10px] font-black rounded-full transition-all duration-200 whitespace-nowrap hover:opacity-90 inline-flex items-center gap-1"
              style={{
                background: 'linear-gradient(135deg, #c9973a, #e8ba5a)',
                color: '#0d0c0a',
                boxShadow: '0 0 10px rgba(201,151,58,0.35)',
              }}
            >
              ⭐ EROGRAM PREMIUM
            </Link>
        </div>
      </nav>
    </section>
  );
}

function PremiumUpgradeCircle() {
  return (
    <Link
      href="/premium"
      target="_blank"
      className="flex flex-col items-center gap-2 shrink-0 group outline-none"
      aria-label="Upgrade to Erogram Premium"
    >
      <div className="relative w-[76px] h-[76px] md:w-[84px] md:h-[84px]">
        {/* Spinning golden ring */}
        <div className="absolute inset-0 rounded-full overflow-hidden">
          <div
            className="story-neon-ring absolute"
            style={{
              inset: '-24px',
              background: 'conic-gradient(from 0deg, #f59e0b, #ef4444, #f59e0b, #fbbf24, #f59e0b)',
            }}
          />
        </div>
        {/* Moat */}
        <div className="absolute inset-[3px] rounded-full" style={{ background: '#1a1008' }} />
        {/* Inner background */}
        <div
          className="absolute inset-[5px] rounded-full flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #1c1203, #2d1f04)' }}
        >
          <svg width="30" height="30" viewBox="0 0 24 24" fill="#f59e0b">
            <path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z"/>
          </svg>
        </div>
      </div>
      <span className="text-[9px] md:text-[10px] font-black uppercase tracking-tight text-center leading-tight text-amber-400 group-hover:text-amber-300 transition-colors max-w-[76px] md:max-w-[84px]">
        Upgrade<br />Premium
      </span>
    </Link>
  );
}

function StoryCircle({
  category,
  seenAt,
  onClick,
}: {
  category: StoryCategory;
  seenAt?: string;
  onClick: () => void;
}) {
  const hasContent = category.groups.length > 0 || (category.mediaSlides && category.mediaSlides.length > 0);
  const hasUnseen = (() => {
    if (!hasContent) return false;
    if (seenAt) {
      const seenMs = new Date(seenAt).getTime();
      const latestAt = category.groups[0]?.createdAt;
      if (latestAt) return new Date(latestAt).getTime() > seenMs;
      // For media-only categories (random girl, AI GF), always show as unseen if not seen yet
      return category.hasNewContent;
    }
    return true;
  })();

  const imgSrc =
    category.profileImage ||
    category.groups[0]?.image ||
    category.mediaSlides?.[0]?.mediaUrl ||
    '/assets/placeholder-no-image.png';

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 shrink-0 group outline-none"
      aria-label={`View ${category.label} stories`}
    >
      {/* Outer sizing wrapper */}
      <div className="relative w-[76px] h-[76px] md:w-[84px] md:h-[84px]">

        {/* Spinning neon ring layer — clipped to circle */}
        <div className="absolute inset-0 rounded-full overflow-hidden">
          {hasUnseen ? (
            /* Unseen: spinning pink-orange-yellow neon */
            <div
              className="story-neon-ring absolute"
              style={{
                inset: '-24px',
                background: 'conic-gradient(from 0deg, #ff006e, #fb5607, #ffbe0b, #ff6b35, #e91e8c, #ff006e)',
              }}
            />
          ) : (
            /* Seen: slow-spinning golden/amber — dimmed */
            <div
              className="story-neon-ring-slow absolute"
              style={{
                inset: '-24px',
                background: 'conic-gradient(from 0deg, #92400e, #d97706, #f59e0b, #ea580c, #92400e)',
                opacity: 0.55,
              }}
            />
          )}
        </div>

        {/* Moat between ring and image */}
        <div
          className="absolute inset-[3px] rounded-full"
          style={{ background: '#1a1008' }}
        />

        {/* Profile image */}
        <div className="absolute inset-[5px] rounded-full overflow-hidden" style={{ background: '#2a1a0a' }}>
          <img
            src={imgSrc}
            alt={category.label}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          />
        </div>
      </div>

      {/* Label + verified badge */}
      <span className={`flex items-center gap-0.5 text-[10px] md:text-[11px] font-semibold transition-colors duration-200 max-w-[76px] md:max-w-[84px] ${
        hasUnseen ? 'text-amber-200/90 group-hover:text-amber-100' : 'text-amber-200/30 group-hover:text-amber-200/50'
      }`}>
        <span className="truncate">{category.label}</span>
        {category.verified && <VerifiedBadge size={11} />}
      </span>
    </button>
  );
}
