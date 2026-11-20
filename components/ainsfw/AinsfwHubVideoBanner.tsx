'use client';

import { useEffect, useState } from 'react';

const VIDEO_SRC = '/assets/ainsfw/videos/golove-ai-ad.mp4';
const HREF = 'https://go.cm-trk6.com/aff_c?offer_id=16115&aff_id=93961&url_id=0&aff_sub5=banner&source=ergoramx';
const CLOSED_KEY = 'ainsfw-hub-video-closed';

/** Autoplaying hub video ad. Click goes through the client tracker. Close stays hidden until hover. */
export default function AinsfwHubVideoBanner({ className = '' }: { className?: string }) {
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(CLOSED_KEY) === '1') setClosed(true);
    } catch {
      /* storage blocked: video stays visible */
    }
  }, []);

  if (closed) return null;

  const close = () => {
    setClosed(true);
    try {
      sessionStorage.setItem(CLOSED_KEY, '1');
    } catch {
      /* keep it closed for this view even if storage is blocked */
    }
  };

  return (
    <div className={`w-full ${className}`.trim()}>
      <div className="flex justify-center">
        <div className="group relative inline-block w-full md:w-auto">
          <a
            href={HREF}
            target="_blank"
            rel="sponsored noopener noreferrer"
            className="block overflow-hidden cursor-pointer rounded-lg"
          >
            <video
              src={VIDEO_SRC}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              className="w-full h-auto md:w-auto md:max-w-[50vw] md:max-h-[280px] object-contain bg-black"
            />
          </a>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="absolute top-1 right-1 z-10 flex h-3.5 w-3.5 items-center justify-center text-white/50 opacity-0 transition-opacity group-hover:opacity-70 hover:!opacity-100 [@media(hover:none)]:opacity-40"
          >
            <svg viewBox="0 0 12 12" className="h-2 w-2" aria-hidden="true">
              <path d="M2 2l8 8M10 2L2 10" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          </button>
          <a
            href="/promo"
            className="absolute bottom-1 right-1.5 z-10 text-[9px] font-medium text-white/40 opacity-0 transition-opacity group-hover:opacity-100 hover:text-white/60"
          >
            Sponsored
          </a>
        </div>
      </div>
    </div>
  );
}
