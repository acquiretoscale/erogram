'use client';

import { useEffect, useRef, useState } from 'react';
import { requestHubVideoPlay, releaseHubVideoPlay } from '@/lib/ainsfw/hubVideoPlayManager';

type HubPreviewVideoProps = {
  slug: string;
  mp4: string;
  poster?: string;
  alt: string;
  title: string;
  eager?: boolean;
  className?: string;
  hoverScale?: boolean;
};

/** Hub card preview — same lazy-activate pattern as LazyClickableVideoAd. */
export default function HubPreviewVideo({
  slug,
  mp4,
  poster,
  alt,
  title,
  eager = false,
  className = '',
  hoverScale = false,
}: HubPreviewVideoProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const activatedRef = useRef(false);
  const [src, setSrc] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    let cancelled = false;

    const activate = () => {
      if (cancelled || activatedRef.current) return;
      activatedRef.current = true;
      setSrc(mp4);
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

    const afterPageLoad = () => {
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(activate, { timeout: 2000 });
      } else {
        setTimeout(activate, 500);
      }
    };

    if (document.readyState === 'complete') afterPageLoad();
    else window.addEventListener('load', afterPageLoad, { once: true });

    return () => {
      cancelled = true;
      io.disconnect();
      el.removeEventListener('mouseenter', onHover);
      window.removeEventListener('load', afterPageLoad);
      releaseHubVideoPlay(slug);
    };
  }, [mp4, slug]);

  useEffect(() => {
    if (!src || !videoRef.current) return;
    const v = videoRef.current;
    const play = () => {
      requestHubVideoPlay(slug, v);
      v.play()
        .then(() => setPlaying(true))
        .catch(() => setPlaying(false));
    };
    play();
    if (v.readyState < 2) v.addEventListener('loadeddata', play, { once: true });
    return () => {
      v.pause();
      releaseHubVideoPlay(slug);
    };
  }, [src, slug]);

  const scaleCls = hoverScale ? ' group-hover:scale-[1.03] transition-transform duration-500 ease-out' : '';

  return (
    <div ref={wrapRef} className={`relative w-full h-full overflow-hidden${scaleCls} ${className}`.trim()}>
      <video
        ref={videoRef}
        {...(src ? { src } : {})}
        poster={poster}
        muted
        loop
        playsInline
        autoPlay
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        style={{ opacity: playing ? 1 : 0, transition: 'opacity 300ms', background: '#000' }}
      />
      {poster && !playing ? (
        <img
          src={poster}
          alt={alt}
          title={title}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
        />
      ) : null}
    </div>
  );
}
