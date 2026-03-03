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

  if (storyData.length === 0) return null;

  return (
    <section className="mb-6">
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

      <h3 className="sr-only">Recent Groups</h3>

      {/* Main card — matches screenshot: very dark bg, subtle rounded border */}
      <div className="relative rounded-2xl overflow-hidden" style={{ background: '#111114', border: '1px solid rgba(255,255,255,0.08)' }}>

        {/* Header */}
        <div className="px-4 pt-3.5 pb-2.5 flex items-center gap-2.5">
          {/* Camera icon */}
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #ff6b35, #e91e8c)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
              <path d="M12 15.2A3.2 3.2 0 1 1 12 8.8a3.2 3.2 0 0 1 0 6.4zM20 4h-3.17L15 2H9L7.17 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/>
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-bold text-white leading-tight tracking-tight">Stories</h4>
            <p className="text-[11px] text-white/40 leading-tight">See what&apos;s new</p>
          </div>
        </div>

        {/* Thin separator */}
        <div className="h-px mx-4" style={{ background: 'rgba(255,255,255,0.06)' }} />

        {/* Scroll container */}
        <div className="relative group/scroll">
          {canScrollLeft && (
            <button
              onClick={() => scroll('left')}
              className="absolute left-0 top-0 bottom-0 z-10 w-10 flex items-center justify-start pl-1.5 opacity-0 group-hover/scroll:opacity-100 transition-opacity duration-200"
              style={{ background: 'linear-gradient(to right, #111114 40%, transparent)' }}
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
              style={{ background: 'linear-gradient(to left, #111114 40%, transparent)' }}
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
          </div>
        </div>
      </div>

      {/* Trending categories — orange/gold pills, max 2 lines on mobile */}
      <nav aria-label="Popular Telegram group categories" className="mt-3 rounded-xl p-2.5 shadow-sm" style={{ background: 'linear-gradient(135deg, #1a1510, #191510)', border: '1px solid rgba(245,158,11,0.15)' }}>
        <div className="flex items-center gap-1.5 overflow-hidden max-h-[52px]">
          <span className="text-[9px] font-black uppercase tracking-wider shrink-0 mr-0.5" style={{ color: '#f59e0b' }}>🔥 Trending</span>
          <div className="flex flex-wrap gap-1 overflow-hidden max-h-[52px]">
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
          </div>
        </div>
      </nav>
    </section>
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

        {/* Dark moat between ring and image */}
        <div
          className="absolute inset-[3px] rounded-full"
          style={{ background: '#111114' }}
        />

        {/* Profile image */}
        <div className="absolute inset-[5px] rounded-full overflow-hidden" style={{ background: '#1e1e22' }}>
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
        hasUnseen ? 'text-white/90 group-hover:text-white' : 'text-white/35 group-hover:text-white/55'
      }`}>
        <span className="truncate">{category.label}</span>
        {category.verified && <VerifiedBadge size={11} />}
      </span>
    </button>
  );
}
