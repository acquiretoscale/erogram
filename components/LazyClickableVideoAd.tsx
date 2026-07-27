'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

export const JOI_AI_VIDEO_URL = 'https://pub-5800916b33a845e4b67e2d5be553c1e3.r2.dev/articles/joi-ai-promo-v111.mp4';
export const JOI_AI_VIDEO_POSTER = 'https://pub-5800916b33a845e4b67e2d5be553c1e3.r2.dev/articles/joi-ai-promo-v111-poster.webp';
export const JOI_AI_GO_URL = '/go/joi-ai';

type LazyClickableVideoAdProps = {
  href?: string;
  videoUrl?: string;
  posterUrl?: string;
  className?: string;
  maxWidth?: number;
  aspectRatio?: string;
  sponsored?: boolean;
};

export default function LazyClickableVideoAd({
  href = JOI_AI_GO_URL,
  videoUrl = JOI_AI_VIDEO_URL,
  posterUrl = JOI_AI_VIDEO_POSTER,
  className = '',
  maxWidth = 504,
  aspectRatio = '16 / 9',
  sponsored = true,
}: LazyClickableVideoAdProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    let cancelled = false;

    const activate = () => {
      if (cancelled || src) return;
      setSrc(videoUrl);
    };

    const afterPageLoad = () => {
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(activate, { timeout: 2500 });
      } else {
        setTimeout(activate, 600);
      }
    };

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) activate();
      },
      { rootMargin: '240px' },
    );
    io.observe(el);

    const onHover = () => activate();
    el.addEventListener('mouseenter', onHover, { once: true });

    if (document.readyState === 'complete') afterPageLoad();
    else window.addEventListener('load', afterPageLoad, { once: true });

    return () => {
      cancelled = true;
      io.disconnect();
      el.removeEventListener('mouseenter', onHover);
      window.removeEventListener('load', afterPageLoad);
    };
  }, [videoUrl, src]);

  useEffect(() => {
    if (!src || !videoRef.current) return;
    const v = videoRef.current;
    const play = () => { v.play().catch(() => setPlaying(false)); };
    if (v.readyState >= 2) play();
    else v.addEventListener('loadeddata', play, { once: true });
  }, [src]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  const togglePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => {});
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    const next = !muted;
    v.muted = next;
    setMuted(next);
    if (!next && v.paused) {
      v.play().catch(() => {});
      setPlaying(true);
    }
  };

  return (
    <div
      ref={wrapRef}
      className={`relative w-full mx-auto ${className}`.trim()}
      style={{ maxWidth }}
    >
      <Link
        href={href}
        target="_blank"
        rel="sponsored noopener noreferrer"
        className="group block overflow-hidden rounded-xl border border-white/10 shadow-[0_16px_40px_-20px_rgba(0,0,0,0.65)] cursor-pointer"
      >
        <video
          ref={videoRef}
          {...(src ? { src } : {})}
          poster={posterUrl}
          autoPlay
          muted
          loop
          playsInline
          preload="none"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          className="w-full transition-transform duration-300 group-hover:scale-[1.01]"
          style={{ aspectRatio, objectFit: 'cover', background: '#000' }}
        />
      </Link>

      <div className="absolute bottom-2 left-2 z-10 flex gap-1.5">
        <button
          type="button"
          onClick={togglePlay}
          aria-label={playing ? 'Pause video' : 'Play video'}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-black/65 text-white backdrop-blur-sm border border-white/15 hover:bg-black/80 transition-colors"
        >
          {playing ? (
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5" aria-hidden>
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5 ml-0.5" aria-hidden>
              <path d="M8 5.14v13.72L19 12 8 5.14z" />
            </svg>
          )}
        </button>
        <button
          type="button"
          onClick={toggleMute}
          aria-label={muted ? 'Turn sound on' : 'Turn sound off'}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-black/65 text-white backdrop-blur-sm border border-white/15 hover:bg-black/80 transition-colors"
        >
          {muted ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden>
              <path d="M11 5 6 9H3v6h3l5 4V5z" />
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden>
              <path d="M11 5 6 9H3v6h3l5 4V5z" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            </svg>
          )}
        </button>
      </div>

      {sponsored && (
        <Link
          href="/advertise"
          className="absolute bottom-2 right-3 z-10 text-[9px] font-medium text-white/40 hover:text-white/60 transition-colors drop-shadow-sm"
        >
          Sponsored
        </Link>
      )}
    </div>
  );
}
