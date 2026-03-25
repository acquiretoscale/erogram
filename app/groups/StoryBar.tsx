'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
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
    <section className="mb-3">
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

      {/* Single-row card: label on left, circles scroll right */}
      {hasStories && <div className="relative rounded-xl overflow-hidden flex items-stretch" style={{
        background: 'linear-gradient(165deg, #1a1008 0%, #2a1a0a 40%, #1f1208 100%)',
        border: '1px solid rgba(245,158,11,0.2)',
        boxShadow: '0 4px 24px rgba(245,158,11,0.08), inset 0 1px 0 rgba(255,200,100,0.08)',
      }}>
        {/* Glossy reflection overlay */}
        <div className="absolute inset-0 pointer-events-none z-0" style={{
          background: 'linear-gradient(180deg, rgba(255,180,60,0.07) 0%, transparent 40%, transparent 85%, rgba(245,158,11,0.04) 100%)',
        }} />

        {/* Left label — compact horizontal */}
        <div className="relative z-[1] shrink-0 flex flex-col items-center justify-center px-0.5 md:px-1 py-1" style={{
          background: 'linear-gradient(180deg, #0d0d0d 0%, #111008 100%)',
          borderRight: '1px solid rgba(245,158,11,0.15)',
        }}>
          <p className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-white/60 whitespace-nowrap" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>Stories</p>
        </div>

        {/* Scrollable circles */}
        <div className="relative flex-1 min-w-0 group/scroll">
          {canScrollLeft && (
            <button
              onClick={() => scroll('left')}
              className="absolute left-0 top-0 bottom-0 z-10 w-8 flex items-center justify-start pl-1 opacity-0 group-hover/scroll:opacity-100 transition-opacity duration-200"
              style={{ background: 'linear-gradient(to right, #1a1008 40%, transparent)' }}
              aria-label="Scroll left"
            >
              <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><polyline points="15,18 9,12 15,6" /></svg>
              </div>
            </button>
          )}

          {canScrollRight && (
            <button
              onClick={() => scroll('right')}
              className="absolute right-0 top-0 bottom-0 z-10 w-8 flex items-center justify-end pr-1 opacity-0 group-hover/scroll:opacity-100 transition-opacity duration-200"
              style={{ background: 'linear-gradient(to left, #1a1008 40%, transparent)' }}
              aria-label="Scroll right"
            >
              <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><polyline points="9,6 15,12 9,18" /></svg>
              </div>
            </button>
          )}

          <div
            ref={scrollRef}
            className="flex gap-1.5 md:gap-3 overflow-x-auto scrollbar-hide px-1.5 md:px-2.5 py-2"
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
            <VisitingNowCard />
          </div>
        </div>
      </div>}

      {/* Trending categories — always visible for SEO */}
      <nav aria-label="Trending Telegram group categories" className="mt-1.5 rounded-lg px-2 py-1.5 shadow-sm" style={{ background: 'linear-gradient(135deg, #1a1510, #191510)', border: '1px solid rgba(245,158,11,0.15)' }}>
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-[8px] font-black uppercase tracking-wider shrink-0 mr-0.5" style={{ color: '#f59e0b' }}>🔥 Trending</span>
            {[
              { label: 'Telegram Porn', href: '/best-telegram-groups/porn-telegram' },
              { label: 'Lesbian', href: '/best-telegram-groups/lesbian' },
              { label: 'Threesome', href: '/best-telegram-groups/threesome' },
              { label: 'Big Ass', href: '/best-telegram-groups/big%20ass' },
              { label: 'Blowjob', href: '/best-telegram-groups/blowjob' },
              { label: 'Amateur', href: '/best-telegram-groups/amateur' },
              { label: 'Onlyfans', href: '/best-telegram-groups/onlyfans' },
              { label: 'Russia', href: '/groups/country/Russia' },
              { label: 'BDSM', href: '/best-telegram-groups/bdsm' },
              { label: 'Germany', href: '/groups/country/Germany' },
            ].map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className="px-1.5 py-[2px] text-[8px] font-bold rounded-full transition-all duration-200 whitespace-nowrap hover:scale-105"
                style={{
                  background: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(234,88,12,0.15))',
                  color: '#fbbf24',
                  border: '1px solid rgba(245,158,11,0.25)',
                }}
              >
                {label}
              </Link>
            ))}
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
      className="flex flex-col items-center gap-1 shrink-0 group outline-none"
      aria-label="Upgrade to Erogram Premium"
    >
      <div className="relative w-[64px] h-[64px] md:w-[84px] md:h-[84px]">
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
      <span className="text-[7px] md:text-[8px] font-black uppercase tracking-tight text-center leading-none text-amber-400 group-hover:text-amber-300 transition-colors whitespace-nowrap">
        ⭐ Erogram<br />Premium
      </span>
    </Link>
  );
}

function VisitingNowCard() {
  const [count, setCount] = useState(0);

  const fetchCount = useCallback(() => {
    fetch('/api/advertise-stats', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => { if (typeof d.activeVisitors === 'number') setCount(d.activeVisitors); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchCount();
    const id = setInterval(fetchCount, 60_000);
    return () => clearInterval(id);
  }, [fetchCount]);

  return (
    <div className="shrink-0 flex flex-col justify-center gap-2 pl-2 md:pl-3 ml-0.5 md:ml-1" style={{ borderLeft: '1px solid rgba(255,255,255,0.06)' }}>
      {/* Visiting now — subtle stat */}
      <div className="flex items-center gap-1.5">
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
        </span>
        <div className="flex flex-col leading-none">
          <span className="text-[17px] font-black text-white/80 tabular-nums">{count > 0 ? count.toLocaleString('en-US') : '—'}</span>
          <span className="text-[10px] font-medium text-white/40 mt-0.5">visiting now</span>
        </div>
      </div>

      {/* Advertise CTA */}
      <Link
        href="/advertise"
        className="flex items-center gap-0.5 px-1.5 py-0.5 rounded font-black text-[7px] uppercase tracking-wider transition-all hover:opacity-90 active:scale-95 whitespace-nowrap"
        style={{
          background: 'linear-gradient(135deg, #b31b1b, #7f1d1d)',
          color: 'white',
          boxShadow: '0 1px 4px rgba(179,27,27,0.3)',
        }}
      >
        <svg width="6" height="6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
        Advertise
      </Link>
    </div>
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
  const isCreators = category.storyType === 'creators';
  const hasContent = category.groups.length > 0 || (category.mediaSlides && category.mediaSlides.length > 0) || (category.creators && category.creators.length > 0);
  const hasUnseen = (() => {
    if (!hasContent) return false;
    if (isCreators) return !seenAt;
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
      className="flex flex-col items-center gap-1 shrink-0 group outline-none"
      aria-label={`View ${category.label} stories`}
    >
      <div className="relative w-[64px] h-[64px] md:w-[84px] md:h-[84px]">

        {/* Spinning neon ring layer — clipped to circle */}
        <div className="absolute inset-0 rounded-full overflow-hidden">
          {hasUnseen ? (
            <div
              className="story-neon-ring absolute"
              style={{
                inset: '-24px',
                background: isCreators
                  ? 'conic-gradient(from 0deg, #0088cc, #4ab3f4, #0088cc, #4ab3f4, #0088cc)'
                  : 'conic-gradient(from 0deg, #ff006e, #fb5607, #ffbe0b, #ff6b35, #e91e8c, #ff006e)',
              }}
            />
          ) : (
            <div
              className="story-neon-ring-slow absolute"
              style={{
                inset: '-24px',
                background: isCreators
                  ? 'conic-gradient(from 0deg, #004466, #006699, #0088cc, #006699, #004466)'
                  : 'conic-gradient(from 0deg, #92400e, #d97706, #f59e0b, #ea580c, #92400e)',
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

        {/* Content: dark blue 18+ for creators, profile image for others */}
        {isCreators ? (
          <div className="absolute inset-[5px] rounded-full flex items-center justify-center"
            style={{ background: 'rgba(0, 136, 204, 0.15)' }}>
            <span className="text-[#4ab3f4] font-black text-[9px] leading-[1.1] text-center select-none">OnlyFans<br/>Search</span>
          </div>
        ) : (
          <div className="absolute inset-[5px] rounded-full overflow-hidden" style={{ background: '#2a1a0a' }}>
            <img
              src={imgSrc}
              alt={category.label}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
            />
          </div>
        )}
      </div>

      {/* Label + verified badge */}
      <span className={`flex items-center gap-0.5 text-[10px] md:text-[11px] font-semibold transition-colors duration-200 max-w-[64px] md:max-w-[84px] ${
        isCreators
          ? (hasUnseen ? 'text-[#4ab3f4] group-hover:text-[#6ec6f7]' : 'text-[#4ab3f4]/40 group-hover:text-[#4ab3f4]/60')
          : (hasUnseen ? 'text-amber-200/90 group-hover:text-amber-100' : 'text-amber-200/30 group-hover:text-amber-200/50')
      }`}>
        <span className="truncate">{category.label}</span>
        {category.verified && <VerifiedBadge size={11} />}
      </span>
    </button>
  );
}
