'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import type { StoryCategory, StorySlide, StoryMediaSlide, StoryGroup, PremiumGroupItem } from './types';

interface StoryViewerProps {
  storyData: StoryCategory[];
  initialCategoryIndex: number;
  onCategorySeen?: (slug: string) => void;
  onClose: () => void;
}

const R2_BASE = 'https://pub-5800916b33a845e4b67e2d5be553c1e3.r2.dev';
const FALLBACK_BG_VIDEO = `${R2_BASE}/tgempire/booty-bazaar/wmremove-transformed.mp4`;

const SLIDE_DURATION = 6000;

export default function StoryViewer({
  storyData,
  initialCategoryIndex,
  onCategorySeen,
  onClose,
}: StoryViewerProps) {
  const [catIndex, setCatIndex] = useState(initialCategoryIndex);
  const [slideIndex, setSlideIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showHeartAnim, setShowHeartAnim] = useState(false);
  const [likedSlides, setLikedSlides] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      return new Set(JSON.parse(localStorage.getItem('erogram:story:likes') || '[]'));
    } catch { return new Set(); }
  });

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);
  const longPressRef = useRef(false);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const swipeUsedRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const bgVideoRef = useRef<HTMLVideoElement | null>(null);
  const navigatingRef = useRef(false);
  const durationRef = useRef(SLIDE_DURATION);
  const seenCatsRef = useRef(new Set<string>());
  const lastTapRef = useRef(0);

  const cat = storyData[catIndex];

  // Build slides: groups first, then media slides
  const slides: StorySlide[] = useMemo(() => {
    if (!cat) return [];
    const result: StorySlide[] = [];
    for (const g of cat.groups) result.push({ type: 'group', data: g });
    for (const m of cat.mediaSlides ?? []) result.push({ type: 'media', data: m });
    return result;
  }, [cat]);

  const currentSlide = slides[slideIndex] ?? null;

  // If this category has no slides, skip to the next one (or close)
  useEffect(() => {
    if (slides.length === 0 && cat) {
      if (catIndex < storyData.length - 1) {
        setCatIndex(ci => ci + 1);
        setSlideIndex(0);
      } else {
        onClose();
      }
    }
  }, [slides.length, cat, catIndex, storyData.length, onClose]);

  if (currentSlide) {
    durationRef.current = SLIDE_DURATION;
  }

  // Background video for group slides without their own video
  const bgVideoUrl = useMemo(() => {
    if (!currentSlide || currentSlide.type !== 'group') return null;
    if (currentSlide.data.videoUrl) return null;
    if (cat?.r2Folder) return `${R2_BASE}/${cat.r2Folder}/wmremove-transformed.mp4`;
    return FALLBACK_BG_VIDEO;
  }, [currentSlide, cat]);

  // Mount + lock scroll
  useEffect(() => {
    setMounted(true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Mark category seen
  useEffect(() => {
    const slug = storyData[catIndex]?.slug;
    if (slug && !seenCatsRef.current.has(slug)) {
      seenCatsRef.current.add(slug);
      onCategorySeen?.(slug);
    }
  }, [catIndex, storyData, onCategorySeen]);

  // Track story slide views
  const trackedSlidesRef = useRef(new Set<string>());
  useEffect(() => {
    if (!currentSlide) return;
    const key = currentSlide.type === 'group'
      ? `g:${currentSlide.data._id}`
      : `s:${currentSlide.data._id}`;
    if (trackedSlidesRef.current.has(key)) return;
    trackedSlidesRef.current.add(key);

    const payload: Record<string, string> = {};
    if (currentSlide.type === 'group') payload.groupId = currentSlide.data._id;
    else payload.slideId = currentSlide.data._id;

    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/stories/track-view', new Blob([JSON.stringify(payload)], { type: 'application/json' }));
      } else {
        fetch('/api/stories/track-view', { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' }, keepalive: true }).catch(() => {});
      }
    } catch { /* non-critical */ }
  }, [currentSlide]);

  const storyDataLen = storyData.length;
  const slidesLen = slides.length;

  const goNext = useCallback(() => {
    if (navigatingRef.current) return;
    navigatingRef.current = true;
    setTimeout(() => { navigatingRef.current = false; }, 50);

    setSlideIndex(prev => {
      if (prev < slidesLen - 1) {
        setProgress(0);
        return prev + 1;
      }
      setCatIndex(ci => {
        if (ci < storyDataLen - 1) {
          setProgress(0);
          return ci + 1;
        }
        onClose();
        return ci;
      });
      return 0;
    });
  }, [slidesLen, storyDataLen, onClose]);

  const goPrev = useCallback(() => {
    if (navigatingRef.current) return;
    navigatingRef.current = true;
    setTimeout(() => { navigatingRef.current = false; }, 50);

    setSlideIndex(prev => {
      if (prev > 0) {
        setProgress(0);
        return prev - 1;
      }
      setCatIndex(ci => {
        if (ci > 0) {
          setProgress(0);
          const prevCat = storyData[ci - 1];
          if (prevCat) {
            const count = (prevCat.groups?.length ?? 0) + (prevCat.mediaSlides?.length ?? 0);
            setSlideIndex(Math.max(0, count - 1));
          }
          return ci - 1;
        }
        return ci;
      });
      return prev;
    });
  }, [storyData]);

  const goNextRef = useRef(goNext);
  const goPrevRef = useRef(goPrev);
  useEffect(() => { goNextRef.current = goNext; }, [goNext]);
  useEffect(() => { goPrevRef.current = goPrev; }, [goPrev]);

  // Timer
  useEffect(() => {
    if (!currentSlide || isPaused) return;
    const dur = durationRef.current;
    startTimeRef.current = Date.now();
    setProgress(0);
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.min(elapsed / dur, 1);
      setProgress(pct);
      if (pct >= 1) {
        if (timerRef.current) clearInterval(timerRef.current);
        goNextRef.current();
      }
    }, 30);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slideIndex, catIndex, isPaused]);

  // Video duration override
  const handleVideoMeta = useCallback((e: React.SyntheticEvent<HTMLVideoElement>) => {
    const secs = e.currentTarget.duration;
    if (Number.isFinite(secs) && secs > 0) {
      durationRef.current = Math.min(Math.max(secs * 1000, 3000), 30000);
    }
  }, []);

  // Keyboard
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') goNextRef.current();
      if (e.key === 'ArrowLeft') goPrevRef.current();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Pointer handlers
  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('a') || target.closest('button[data-story-cta]')) return;

    pointerStartRef.current = { x: e.clientX, y: e.clientY };
    swipeUsedRef.current = false;
    longPressRef.current = false;
    const timeout = setTimeout(() => {
      longPressRef.current = true;
      setIsPaused(true);
    }, 200);
    (window as any).__storyLP = timeout;
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerStartRef.current || swipeUsedRef.current) return;
    const dx = e.clientX - pointerStartRef.current.x;
    const dy = e.clientY - pointerStartRef.current.y;
    if (Math.abs(dx) > 42 && Math.abs(dx) > Math.abs(dy)) {
      swipeUsedRef.current = true;
      clearTimeout((window as any).__storyLP);
      if (longPressRef.current) { longPressRef.current = false; setIsPaused(false); }
      if (dx < 0) goNextRef.current(); else goPrevRef.current();
    }
  }, []);

  const currentSlideId = currentSlide?.type === 'media' ? currentSlide.data._id : null;
  const isLiked = currentSlideId ? likedSlides.has(currentSlideId) : false;

  const handleLike = useCallback(() => {
    if (!currentSlideId) return;
    if (likedSlides.has(currentSlideId)) return;

    setLikedSlides(prev => {
      const next = new Set(prev);
      next.add(currentSlideId);
      localStorage.setItem('erogram:story:likes', JSON.stringify([...next]));
      return next;
    });

    setShowHeartAnim(true);
    setTimeout(() => setShowHeartAnim(false), 900);

    try {
      fetch('/api/stories/like', {
        method: 'POST',
        body: JSON.stringify({ slideId: currentSlideId }),
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
      }).catch(() => {});
    } catch { /* non-critical */ }
  }, [currentSlideId, likedSlides]);

  const handleLikeRef = useRef(handleLike);
  useEffect(() => { handleLikeRef.current = handleLike; }, [handleLike]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    clearTimeout((window as any).__storyLP);
    if (swipeUsedRef.current) { pointerStartRef.current = null; return; }
    if (longPressRef.current) { setIsPaused(false); pointerStartRef.current = null; return; }

    const target = e.target as HTMLElement;
    if (target.closest('a') || target.closest('button[data-story-cta]') || target.closest('button[data-story-like]')) {
      pointerStartRef.current = null;
      return;
    }

    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      lastTapRef.current = 0;
      handleLikeRef.current();
      pointerStartRef.current = null;
      return;
    }
    lastTapRef.current = now;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width * 0.3) goPrevRef.current(); else goNextRef.current();
    pointerStartRef.current = null;
  }, []);

  const handlePointerCancel = useCallback(() => {
    clearTimeout((window as any).__storyLP);
    if (longPressRef.current) setIsPaused(false);
    pointerStartRef.current = null;
    swipeUsedRef.current = false;
  }, []);

  const stopPointer = useCallback((e: React.PointerEvent) => { e.stopPropagation(); }, []);

  // Prefetch
  useEffect(() => {
    const next = slides[slideIndex + 1];
    if (next?.type === 'group') { const img = new window.Image(); img.src = next.data.image; }
    else if (next?.type === 'media' && next.data.mediaType === 'image') {
      const img = new window.Image(); img.src = next.data.mediaUrl;
    }
  }, [slideIndex, slides]);

  // Pause/play videos
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    if (isPaused) vid.pause(); else vid.play().catch(() => {});
  }, [isPaused, slideIndex, catIndex]);

  useEffect(() => {
    const vid = bgVideoRef.current;
    if (!vid) return;
    if (isPaused) vid.pause(); else vid.play().catch(() => {});
  }, [isPaused, bgVideoUrl]);

  if (!mounted || !currentSlide) return null;

  const dur = durationRef.current;
  const remainingSecs = Math.max(0, Math.ceil((dur - dur * progress) / 1000));
  const profileImg = cat?.profileImage || cat?.groups[0]?.image || cat?.mediaSlides?.[0]?.mediaUrl || '/assets/placeholder-no-image.png';

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-black flex items-center justify-center"
      style={{ touchAction: 'none' }}
    >
      <style>{`
        @keyframes heartPop {
          0% { transform: scale(0); opacity: 1; }
          30% { transform: scale(1.3); opacity: 1; }
          50% { transform: scale(1); opacity: 1; }
          100% { transform: scale(1); opacity: 0; }
        }
      `}</style>
      <div
        className="relative w-full h-full max-w-[480px] mx-auto overflow-hidden select-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        {/* ── Slide content ── */}
        {currentSlide.type === 'group' ? (
          <GroupSlideView
            slide={currentSlide.data}
            cat={cat}
            bgVideoUrl={bgVideoUrl}
            bgVideoRef={bgVideoRef}
            videoRef={videoRef}
            onVideoMeta={handleVideoMeta}
            stopPointer={stopPointer}
          />
        ) : currentSlide.data.mediaType === 'premium-grid' ? (
          <PremiumGridSlideView
            slide={currentSlide.data}
            stopPointer={stopPointer}
          />
        ) : (
          <MediaSlideView
            slide={currentSlide.data}
            cat={cat}
            videoRef={videoRef}
            onVideoMeta={handleVideoMeta}
            stopPointer={stopPointer}
            onCtaClick={() => {
              const id = currentSlide.data._id;
              if (!id.startsWith('rg-') && !id.startsWith('ad-')) {
                fetch('/api/stories/click', {
                  method: 'POST',
                  body: JSON.stringify({ slideId: id }),
                  headers: { 'Content-Type': 'application/json' },
                  keepalive: true,
                }).catch(() => {});
              }
            }}
          />
        )}

        {/* Progress bars */}
        <div className="absolute top-0 left-0 right-0 z-20 flex gap-[3px] px-3 pt-3">
          {slides.map((_, i) => (
            <div key={i} className="flex-1 h-[2.5px] rounded-full bg-white/20 overflow-hidden">
              <div
                className="h-full rounded-full bg-white transition-none"
                style={{
                  width: i < slideIndex ? '100%' : i === slideIndex ? `${progress * 100}%` : '0%',
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-5 left-0 right-0 z-20 flex items-center justify-between px-3 pt-2">
          <div className="flex items-center gap-2.5">
            <div className="relative w-9 h-9 shrink-0">
              <div
                className="absolute inset-0 rounded-full"
                style={{ background: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)' }}
              />
              <div className="absolute inset-[2px] rounded-full bg-black" />
              <div className="absolute inset-[3px] rounded-full overflow-hidden bg-[#1a1a1a]">
                <img src={profileImg} alt={cat?.label || ''} className="w-full h-full object-cover" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white text-[13px] font-bold drop-shadow-lg">{cat?.label}</span>
              {currentSlide.type === 'group' && currentSlide.data.createdAt && (
                <span className="text-white/50 text-[11px] font-medium">{timeAgo(currentSlide.data.createdAt)}</span>
              )}
              {cat?.storyType === 'advert' && (
                <span className="text-white/40 text-[10px] font-medium">Sponsored</span>
              )}
            </div>
            {/* 24h countdown — like Instagram */}
            {(() => {
              const lifetime = cat?.storyType === 'advert' ? 0 : 24;
              if (lifetime === 0) return null;
              const ts = currentSlide.type === 'group'
                ? currentSlide.data.createdAt
                : undefined;
              if (!ts) return null;
              const left = expiresIn(ts, lifetime);
              if (!left) return null;
              return (
                <span className="flex items-center gap-1 ml-auto text-white/40 text-[10px] font-medium drop-shadow">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="opacity-60">
                    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                  </svg>
                  {left}
                </span>
              );
            })()}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-white/50 text-[11px] font-mono tabular-nums">{remainingSecs}s</span>
            <button
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              onPointerDown={stopPointer}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-sm border border-white/10 text-white hover:bg-black/60 transition-colors"
              aria-label="Close stories"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Navigation arrows */}
        <button
          onClick={(e) => { e.stopPropagation(); goPrev(); }}
          onPointerDown={stopPointer}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/30 backdrop-blur-sm border border-white/[0.08] flex items-center justify-center text-white/60 hover:text-white hover:bg-black/50 transition-all duration-200 active:scale-90 opacity-0 hover:opacity-100 md:opacity-60"
          aria-label="Previous"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15,18 9,12 15,6" /></svg>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); goNext(); }}
          onPointerDown={stopPointer}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/30 backdrop-blur-sm border border-white/[0.08] flex items-center justify-center text-white/60 hover:text-white hover:bg-black/50 transition-all duration-200 active:scale-90 opacity-0 hover:opacity-100 md:opacity-60"
          aria-label="Next"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9,6 15,12 9,18" /></svg>
        </button>

        {/* Like button — all media slides */}
        {currentSlide.type === 'media' && (
          <button
            data-story-like="true"
            onClick={(e) => { e.stopPropagation(); handleLike(); }}
            onPointerDown={stopPointer}
            className="absolute bottom-20 right-4 z-20 flex flex-col items-center gap-1.5 pointer-events-auto"
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-md border-2 transition-all duration-200 active:scale-90 ${
              isLiked ? 'bg-red-500/25 border-red-500/50' : 'bg-black/40 border-white/15 hover:bg-black/60'
            }`}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill={isLiked ? '#ef4444' : 'none'} stroke={isLiked ? '#ef4444' : 'white'} strokeWidth="2" strokeLinecap="round">
                <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
              </svg>
            </div>
            <span className="text-white/60 text-[10px] font-semibold">{isLiked ? 'Liked' : 'Like'}</span>
          </button>
        )}

        {/* Double-tap heart animation */}
        {showHeartAnim && (
          <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
            <svg
              width="100" height="100" viewBox="0 0 24 24" fill="#ef4444"
              className="animate-[heartPop_0.9s_ease-out_forwards]"
              style={{ filter: 'drop-shadow(0 0 20px rgba(239,68,68,0.6))' }}
            >
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
            </svg>
          </div>
        )}

        {/* Pause indicator */}
        {isPaused && (
          <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
            <div className="bg-black/50 backdrop-blur-sm rounded-full p-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

// ── Group slide (EROGRAM newest additions) ──
function GroupSlideView({
  slide, cat, bgVideoUrl, bgVideoRef, videoRef, onVideoMeta, stopPointer,
}: {
  slide: StoryGroup;
  cat: StoryCategory | undefined;
  bgVideoUrl: string | null;
  bgVideoRef: React.RefObject<HTMLVideoElement | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onVideoMeta: (e: React.SyntheticEvent<HTMLVideoElement>) => void;
  stopPointer: (e: React.PointerEvent) => void;
}) {
  return (
    <div className="absolute inset-0">
      {/* Animated gradient background */}
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 40%, #24243e 100%)',
      }} />
      <div className="absolute inset-0 opacity-30" style={{
        background: 'radial-gradient(ellipse at 30% 20%, rgba(88,60,255,0.4) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(0,180,255,0.3) 0%, transparent 60%)',
      }} />

      {/* Background video layer */}
      {bgVideoUrl && (
        <video
          key={bgVideoUrl}
          ref={bgVideoRef}
          src={bgVideoUrl}
          className="absolute inset-0 w-full h-full object-cover opacity-25"
          autoPlay muted loop playsInline preload="auto"
        />
      )}

      {slide.videoUrl ? (
        <video
          key={slide.videoUrl}
          src={slide.videoUrl}
          poster={slide.image}
          className="absolute inset-0 w-full h-full object-cover opacity-25"
          autoPlay muted playsInline preload="metadata"
          ref={videoRef}
          onLoadedMetadata={onVideoMeta}
        />
      ) : !bgVideoUrl ? (
        <div className="absolute inset-0">
          <img
            src={slide.image}
            alt={slide.name}
            className="absolute inset-0 w-full h-full object-cover opacity-20 blur-sm scale-110"
            draggable={false}
          />
        </div>
      ) : null}

      {/* Top/bottom gradients */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-transparent h-32 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />

      {/* Centered group card */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-5 pointer-events-none">

        {/* NEW badge */}
        <div className="mb-5 flex flex-col items-center gap-2.5">
          <div className="relative">
            <div className="absolute -inset-1 rounded-full opacity-60 blur-md" style={{ background: 'linear-gradient(135deg, #f97316, #ef4444)' }} />
            <div className="relative flex items-center gap-2.5 px-6 py-2.5 rounded-full border border-orange-400/40 shadow-lg shadow-orange-500/20"
              style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.3) 0%, rgba(239,68,68,0.25) 100%)', backdropFilter: 'blur(16px)' }}
            >
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500" />
              </span>
              <span className="text-white font-black text-[14px] tracking-[0.2em] uppercase">
                NEW
              </span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-orange-400 shrink-0">
                <path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z" fill="currentColor"/>
              </svg>
            </div>
          </div>
          <span className="text-white/50 text-[11px] font-semibold tracking-wider uppercase">
            Just added to {cat?.label || 'Erogram'}
          </span>
        </div>

        {/* Card */}
        <div className="w-full max-w-[320px] rounded-2xl overflow-hidden border border-white/[0.12] shadow-2xl pointer-events-auto"
          style={{ background: 'linear-gradient(180deg, rgba(30,30,36,0.95) 0%, rgba(22,22,28,0.98) 100%)', backdropFilter: 'blur(20px)' }}
          onPointerDown={stopPointer}
        >
          {/* Group image */}
          <div className="relative w-full aspect-[16/10] bg-[#1a1a20] overflow-hidden">
            <img src={slide.image} alt={slide.name} className="w-full h-full object-cover" draggable={false} />
            <div className="absolute inset-0 bg-gradient-to-t from-[#16161c] via-transparent to-transparent" />
            {/* Floating category pill on image */}
            <div className="absolute top-3 left-3 flex gap-1.5">
              <span className="px-2.5 py-1 rounded-full text-white text-[9px] font-bold uppercase tracking-wider shadow-lg"
                style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }}>
                {slide.category}
              </span>
              {slide.country && (
                <span className="px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-sm text-white/80 text-[9px] font-bold uppercase tracking-wider">
                  {slide.country}
                </span>
              )}
            </div>
          </div>

          {/* Info section */}
          <div className="px-4 pt-3 pb-1">
            <h3 className="text-white font-bold text-[17px] truncate leading-tight">{slide.name}</h3>
            <div className="flex items-center gap-3 mt-2">
              {(slide.memberCount ?? 0) > 0 && (
                <span className="flex items-center gap-1.5 text-blue-300/80 text-[12px] font-semibold">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="opacity-80">
                    <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                  </svg>
                  {formatMembers(slide.memberCount!)} members
                </span>
              )}
              {slide.createdAt && (
                <span className="text-white/30 text-[11px]">
                  {(() => {
                    const h = Math.floor((Date.now() - new Date(slide.createdAt).getTime()) / 3600000);
                    return h < 1 ? 'Just now' : h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
                  })()}
                </span>
              )}
            </div>
            {slide.description && (
              <p className="text-white/30 text-[12px] mt-2 line-clamp-2 leading-relaxed">{slide.description}</p>
            )}
          </div>

          {/* CTA button */}
          <div className="px-4 pt-2.5 pb-4">
            <Link
              href={`/${slide.slug}`}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-bold text-white text-[15px] transition-all duration-200 active:scale-[0.96] shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:brightness-110"
              style={{ background: 'linear-gradient(135deg, #2AABEE 0%, #229ED9 100%)' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.665 3.717l-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701h-.002l.002.001-.314 4.692c.46 0 .663-.211.921-.46l2.211-2.15 4.599 3.397c.848.467 1.457.227 1.668-.785l3.019-14.228c.309-1.239-.473-1.8-1.282-1.434z"/>
              </svg>
              View &amp; Join Group
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="opacity-70"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Media slide (random girl / AI GF / announcements) ──
function MediaSlideView({
  slide, cat, videoRef, onVideoMeta, stopPointer, onCtaClick,
}: {
  slide: StoryMediaSlide;
  cat: StoryCategory | undefined;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onVideoMeta: (e: React.SyntheticEvent<HTMLVideoElement>) => void;
  stopPointer: (e: React.PointerEvent) => void;
  onCtaClick: () => void;
}) {
  return (
    <div className="absolute inset-0">
      {slide.mediaType === 'video' ? (
        <video
          key={slide.mediaUrl}
          src={slide.mediaUrl}
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay muted playsInline preload="auto"
          ref={videoRef}
          onLoadedMetadata={onVideoMeta}
        />
      ) : (
        <img
          src={slide.mediaUrl}
          alt={cat?.label || 'Story'}
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />
      )}

      {/* Gradients */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-transparent h-28 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />

      {/* Caption-only overlay (no CTA) */}
      {slide.caption && !slide.ctaText && (
        <div className="absolute inset-0 z-10 flex items-center justify-center px-6 pointer-events-none">
          <p className="text-white text-base font-semibold drop-shadow-lg text-center leading-relaxed">{slide.caption}</p>
        </div>
      )}

      {/* CTA — centered on the slide */}
      {slide.ctaText && slide.ctaUrl && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 px-5 pointer-events-none">
          {slide.caption && (
            <p className="text-white text-base font-semibold drop-shadow-lg text-center leading-relaxed">{slide.caption}</p>
          )}
          <Link
            href={slide.ctaUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => { e.stopPropagation(); onCtaClick(); }}
            onPointerDown={stopPointer}
            className="flex items-center justify-center gap-2.5 w-full max-w-[300px] py-4 rounded-xl text-white text-[16px] font-bold tracking-wide transition-all duration-200 active:scale-[0.96] shadow-xl pointer-events-auto"
            style={{ background: 'linear-gradient(135deg, #2AABEE 0%, #229ED9 100%)', boxShadow: '0 8px 32px rgba(34,158,217,0.4)' }}
          >
            {slide.ctaText}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      )}

      {/* Client name badge */}
      {slide.clientName && (
        <div className="absolute bottom-8 left-0 right-0 z-10 flex justify-center">
          <span className="text-white/30 text-[10px] font-medium">by {slide.clientName}</span>
        </div>
      )}
    </div>
  );
}

// ── Premium Grid slide (latest additions to premium) ──
function PremiumGridSlideView({
  slide,
  stopPointer,
}: {
  slide: StoryMediaSlide;
  stopPointer: (e: React.PointerEvent) => void;
}) {
  const groups: PremiumGroupItem[] = slide.premiumGroups ?? [];

  return (
    <div className="absolute inset-0 flex flex-col">
      {/* Background */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(160deg, #0d0515 0%, #1a0630 45%, #0a0a1a 100%)',
        }}
      />
      {/* Glow blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full opacity-30 blur-3xl"
          style={{ background: 'radial-gradient(circle, #7c3aed 0%, transparent 70%)' }}
        />
        <div
          className="absolute bottom-24 right-0 w-64 h-64 rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, #f59e0b 0%, transparent 70%)' }}
        />
      </div>

      {/* Top gradients (for progress bar visibility) */}
      <div className="absolute top-0 left-0 right-0 h-28 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.55), transparent)' }}
      />

      {/* Content — pointer-events-none so taps pass through to story nav */}
      <div className="relative z-10 flex flex-col h-full px-4 pt-20 pb-6 pointer-events-none">

        {/* Caption header */}
        <div className="flex flex-col items-center mb-5">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                <path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z" />
              </svg>
            </div>
            <span
              className="text-[13px] font-black uppercase tracking-[0.18em]"
              style={{ color: '#f59e0b' }}
            >
              {slide.caption || 'Latest additions to premium'}
            </span>
          </div>
          <div className="h-px w-40 opacity-40"
            style={{ background: 'linear-gradient(90deg, transparent, #f59e0b, transparent)' }}
          />
        </div>

        {/* 2×2 grid of channel cards — purely visual, no click targets */}
        <div className="grid grid-cols-2 gap-3 flex-1">
          {groups.slice(0, 4).map((g) => (
            <PremiumChannelCard key={g.slug} group={g} />
          ))}
          {Array.from({ length: Math.max(0, 4 - groups.length) }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="rounded-2xl border border-white/5"
              style={{ background: 'rgba(255,255,255,0.03)' }}
            />
          ))}
        </div>

        {/* CTA — only interactive element */}
        <div className="mt-4 pointer-events-auto" onPointerDown={stopPointer}>
          <Link
            href={slide.ctaUrl || '/premium'}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            className="flex items-center justify-center gap-2.5 w-full py-4 rounded-2xl font-black text-white text-[15px] tracking-wide transition-all duration-200 active:scale-[0.97]"
            style={{
              background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 50%, #2563eb 100%)',
              boxShadow: '0 8px 32px rgba(124,58,237,0.45)',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            {slide.ctaText || 'Unlock Premium'}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}

function PremiumChannelCard({
  group,
}: {
  group: PremiumGroupItem;
}) {
  const half = Math.ceil(group.name.length / 2);
  const visiblePart = group.name.slice(0, half);
  const blurredPart = group.name.slice(half);

  return (
    <div
      className="rounded-2xl overflow-hidden flex flex-col border border-white/10"
      style={{ background: 'linear-gradient(180deg, rgba(30,20,50,0.9) 0%, rgba(18,10,35,0.95) 100%)' }}
    >
      {/* Thumbnail */}
      <div className="relative w-full aspect-[4/3] bg-[#120a23] overflow-hidden">
        <img
          src={group.image}
          alt=""
          className="w-full h-full object-cover opacity-80"
          draggable={false}
          onError={(e) => { (e.target as HTMLImageElement).src = '/assets/placeholder-no-image.png'; }}
        />
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to top, rgba(10,5,20,0.85) 0%, transparent 55%)' }}
        />
        <div
          className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(124,58,237,0.8)', backdropFilter: 'blur(8px)' }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <div className="absolute bottom-2 left-2">
          <span
            className="px-2 py-0.5 rounded-full text-white text-[8px] font-bold uppercase tracking-wider"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
          >
            {group.category}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="px-2.5 py-2">
        <p className="text-[12px] font-bold leading-tight mb-1 whitespace-nowrap overflow-hidden">
          <span className="text-white">{visiblePart}</span>
          <span className="text-white/80" style={{ filter: 'blur(5px)', userSelect: 'none' }}>{blurredPart}</span>
        </p>
        {(group.memberCount ?? 0) > 0 && (
          <span className="flex items-center gap-1 text-blue-300/70 text-[10px] font-semibold">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
            </svg>
            {formatMembers(group.memberCount!)}
          </span>
        )}
      </div>
    </div>
  );
}

function timeAgo(dateIso: string): string {
  const ms = Date.now() - new Date(dateIso).getTime();
  const mins = Math.max(1, Math.floor(ms / 60000));
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function expiresIn(dateIso: string, lifetimeHours = 24): string | null {
  const postedMs = new Date(dateIso).getTime();
  const expiresMs = postedMs + lifetimeHours * 3600_000;
  const leftMs = expiresMs - Date.now();
  if (leftMs <= 0) return null;
  const leftMins = Math.floor(leftMs / 60_000);
  if (leftMins < 60) return `${leftMins}m left`;
  const leftH = Math.floor(leftMins / 60);
  return `${leftH}h left`;
}

function formatMembers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K`;
  return n.toString();
}
