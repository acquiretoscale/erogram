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

      {hasStories && <div className="relative rounded-xl overflow-hidden flex items-stretch" style={{
        background: 'linear-gradient(165deg, #0a1520 0%, #0d1a2a 40%, #091218 100%)',
        border: '1px solid rgba(0,175,240,0.2)',
        boxShadow: '0 4px 24px rgba(0,175,240,0.08), inset 0 1px 0 rgba(100,200,255,0.06)',
      }}>
        <div className="absolute inset-0 pointer-events-none z-0" style={{
          background: 'linear-gradient(180deg, rgba(0,175,240,0.05) 0%, transparent 40%, transparent 85%, rgba(0,136,204,0.03) 100%)',
        }} />

        <div className="relative z-[1] shrink-0 flex flex-col items-center justify-center px-1 py-1" style={{
          background: 'linear-gradient(180deg, #0a0f15 0%, #0c1520 100%)',
          borderRight: '1px solid rgba(0,175,240,0.15)',
        }}>
          <p className="text-[10px] font-black uppercase tracking-widest text-white/60 whitespace-nowrap" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>Stories</p>
        </div>

        <div className="relative flex-1 min-w-0 group/scroll">
          {canScrollLeft && (
            <button
              onClick={() => scroll('left')}
              className="absolute left-0 top-0 bottom-0 z-10 w-8 flex items-center justify-start pl-1 opacity-0 group-hover/scroll:opacity-100 transition-opacity duration-200"
              style={{ background: 'linear-gradient(to right, #0a1520 40%, transparent)' }}
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
              style={{ background: 'linear-gradient(to left, #0a1520 40%, transparent)' }}
              aria-label="Scroll right"
            >
              <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><polyline points="9,6 15,12 9,18" /></svg>
              </div>
            </button>
          )}

          <div
            ref={scrollRef}
            className="flex gap-3 overflow-x-auto scrollbar-hide px-2.5 py-2"
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

      <nav aria-label="Trending Telegram group categories" className="mt-1.5 rounded-lg px-2 py-1.5 shadow-sm" style={{ background: 'linear-gradient(135deg, #0a1520, #0d1825)', border: '1px solid rgba(0,175,240,0.15)' }}>
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-[8px] font-black uppercase tracking-wider shrink-0 mr-0.5" style={{ color: '#00AFF0' }}>🔥 Trending on Erogram</span>
            {[
              { label: 'Telegram Porn', href: '/best-telegram-groups/porn-telegram' },
              { label: 'Lesbian', href: '/best-telegram-groups/lesbian' },
              { label: 'Threesome', href: '/best-telegram-groups/threesome' },
              { label: 'Blowjob', href: '/best-telegram-groups/blowjob' },
              { label: 'Amateur', href: '/best-telegram-groups/amateur' },
              { label: 'Onlyfans', href: '/best-telegram-groups/onlyfans' },
              { label: 'BDSM', href: '/best-telegram-groups/bdsm' },
              { label: 'Germany', href: '/groups/country/Germany' },
            ].map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className="px-1.5 py-[2px] text-[8px] font-bold rounded-full transition-all duration-200 whitespace-nowrap hover:scale-105"
                style={{
                  background: 'linear-gradient(135deg, rgba(0,175,240,0.15), rgba(0,136,204,0.10))',
                  color: '#7dd3fc',
                  border: '1px solid rgba(0,175,240,0.25)',
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
      <div className="relative w-[76px] h-[76px] md:w-[84px] md:h-[84px]">
        <div className="absolute inset-0 rounded-full overflow-hidden">
          <div
            className="story-neon-ring absolute"
            style={{
              inset: '-24px',
              background: 'conic-gradient(from 0deg, #00AFF0, #0088cc, #00D4FF, #38bdf8, #00AFF0)',
            }}
          />
        </div>
        <div className="absolute inset-[3px] rounded-full" style={{ background: '#0a1520' }} />
        <div
          className="absolute inset-[5px] rounded-full flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #0c1a2a, #0d2035)' }}
        >
          <svg width="30" height="30" viewBox="0 0 24 24" fill="#00AFF0">
            <path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z"/>
          </svg>
        </div>
      </div>
      <span className="text-[7px] md:text-[8px] font-black uppercase tracking-tight text-center leading-none text-sky-300 group-hover:text-sky-200 transition-colors whitespace-nowrap">
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
    const id = setInterval(fetchCount, 300_000);
    return () => clearInterval(id);
  }, [fetchCount]);

  return (
    <div className="shrink-0 flex flex-col justify-center gap-2 pl-3 ml-1" style={{ borderLeft: '1px solid rgba(255,255,255,0.06)' }}>
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

      <div className="relative rounded-full p-[2px] overflow-hidden" style={{
        background: 'conic-gradient(from 0deg, #4ade80, #16a34a, #bbf7d0, #22c55e, #4ade80)',
      }}>
        <Link
          href="/premium"
          target="_blank"
          className="relative z-10 flex items-center justify-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-black whitespace-nowrap transition-all duration-200 hover:brightness-110"
          style={{
            background: 'linear-gradient(180deg, #4ade80 0%, #16a34a 100%)',
            color: '#fff',
            boxShadow: '0 0 12px rgba(74,222,128,0.55)',
            textShadow: '0 1px 2px rgba(0,0,0,0.3)',
          }}
        >
          ⭐ EROGRAM PREMIUM
        </Link>
      </div>
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
  const hasContent = category.groups.length > 0 || (category.mediaSlides && category.mediaSlides.length > 0);
  const hasUnseen = (() => {
    if (!hasContent) return false;
    if (seenAt) {
      const seenMs = new Date(seenAt).getTime();
      const latestAt = category.groups[0]?.createdAt;
      if (latestAt) return new Date(latestAt).getTime() > seenMs;
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
      <div className="relative w-[76px] h-[76px] md:w-[84px] md:h-[84px]">
        <div className="absolute inset-0 rounded-full overflow-hidden">
          {hasUnseen ? (
            <div
              className="story-neon-ring absolute"
              style={{
                inset: '-24px',
                background: 'conic-gradient(from 0deg, #00AFF0, #0088cc, #00D4FF, #38bdf8, #7dd3fc, #00AFF0)',
              }}
            />
          ) : (
            <div
              className="story-neon-ring-slow absolute"
              style={{
                inset: '-24px',
                background: 'conic-gradient(from 0deg, #1e3a5f, #0c4a6e, #0369a1, #1e3a5f)',
                opacity: 0.55,
              }}
            />
          )}
        </div>

        <div
          className="absolute inset-[3px] rounded-full"
          style={{ background: '#0a1520' }}
        />

        <div className="absolute inset-[5px] rounded-full overflow-hidden" style={{ background: '#0d1a2a' }}>
          <img
            src={imgSrc}
            alt={category.label}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          />
        </div>
      </div>

      <span className={`flex items-center gap-0.5 text-[10px] md:text-[11px] font-semibold transition-colors duration-200 max-w-[76px] md:max-w-[84px] ${
        hasUnseen ? 'text-sky-200/90 group-hover:text-sky-100' : 'text-sky-300/30 group-hover:text-sky-300/50'
      }`}>
        <span className="truncate">{category.label}</span>
        {category.verified && <VerifiedBadge size={11} />}
      </span>
    </button>
  );
}
