'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';

const INFEED_IMAGE_EXAMPLE = '/assets/promo/infeed-image-ad-example.webp';
const CARD_HEIGHT = '480px';

const VERIFIED_BADGE = (
  <svg className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" viewBox="0 0 24 24" fill="#1D9BF0" aria-hidden="true">
    <path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81C14.67.63 13.43-.25 12-.25S9.33.63 8.66 1.94c-1.39-.46-2.9-.2-3.91.81s-1.27 2.52-.81 3.91C2.63 7.33 1.75 8.57 1.75 12c0 1.43.88 2.67 2.19 3.34-.46 1.39-.2 2.9.81 3.91s2.52 1.27 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.67-.88 3.34-2.19c1.39.46 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z"/>
  </svg>
);

function InFeedImageAdTemplate() {
  return (
    <div
      className="rounded-2xl sm:rounded-3xl overflow-hidden flex flex-col border border-white/10 bg-[#0a0a0a] shadow-2xl shadow-black/50"
      style={{ height: CARD_HEIGHT }}
    >
      <div className="relative w-full h-[52%] min-h-[220px] overflow-hidden bg-[#1a1a1a] shrink-0">
        <Image
          src={INFEED_IMAGE_EXAMPLE}
          alt=""
          fill
          sizes="280px"
          className="object-cover object-top"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent opacity-80" />
        <div className="absolute bottom-3 left-3">
          <div className="bg-black/60 backdrop-blur-md border border-white/10 px-2 py-1 rounded-lg flex items-center gap-1.5 shadow-lg">
            <span className="text-xs text-red-400">⚡</span>
            <span className="text-xs font-bold text-white">247 visiting now</span>
          </div>
        </div>
      </div>
      <div className="p-4 sm:p-5 flex flex-col flex-1 min-h-0 bg-[#0a0a0a]">
        <h3 className="font-black text-white mb-2 sm:mb-3 leading-tight flex items-center gap-1.5 text-lg sm:text-xl">
          <span className="truncate min-w-0">Your Brand Here</span>
          {VERIFIED_BADGE}
        </h3>
        <p className="text-gray-400 text-sm line-clamp-3 leading-relaxed flex-1">
          Native in-feed image placement. Same card format users see across EROGRAM feed and pages.
        </p>
        <div className="mt-auto space-y-3 pt-3">
          <div className="flex items-center gap-1 px-1">
            <span className="text-yellow-500 text-sm">⭐</span>
            <span className="text-white font-bold text-sm">4.7</span>
            <span className="text-gray-500 text-xs">(19)</span>
          </div>
          <div className="w-full py-3.5 px-4 rounded-xl font-black text-white text-sm uppercase tracking-wide bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg text-center">
            Visit Site
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InFeedAdFormatComparison() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { e.isIntersecting ? el.play().catch(() => {}) : el.pause(); },
      { threshold: 0.3 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section className="mb-12">
      <div className="overflow-hidden bg-white" style={{ border: '3px solid #000', boxShadow: '6px 6px 0px #000', color: '#000' }}>
        <div className="px-6 py-5 sm:px-8 text-center" style={{ background: 'linear-gradient(160deg, #04140c 0%, #0a2e1a 60%, #064e3b 100%)' }}>
          <h2 className="text-xl sm:text-2xl font-black text-white leading-tight uppercase tracking-tight">
            Example of our In feed integrated ads.
          </h2>
        </div>

        <div className="px-4 sm:px-8 py-6 sm:py-8 bg-gray-50">
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-center sm:items-start">

            {/* Video ad */}
            <div className="w-full max-w-[280px] sm:w-[280px] shrink-0">
              <div className="relative rounded-3xl p-[2px] bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 shadow-[0_0_30px_rgba(245,158,11,0.25)]">
                <div className="rounded-[22px] overflow-hidden bg-[#0a0a0a] flex flex-col" style={{ height: CARD_HEIGHT }}>
                  <div className="relative flex-1 h-full overflow-hidden bg-gradient-to-br from-[#1a1020] via-[#1a0a1a] to-[#0d0d18]">
                    <video
                      ref={videoRef}
                      src="https://pub-5800916b33a845e4b67e2d5be553c1e3.r2.dev/tgempire/booty-bazaar/wmremove-transformed.mp4"
                      muted
                      playsInline
                      loop
                      preload="metadata"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/10 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 right-0 p-5 z-10 flex flex-col gap-2.5">
                      <div className="flex justify-start">
                        <div className="bg-black/80 backdrop-blur-md border border-white/10 px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-lg">
                          <span className="text-xs text-red-400">⚡</span>
                          <span className="text-xs font-bold text-white">412 visiting now</span>
                        </div>
                      </div>
                      <h3 className="text-xl font-black text-white leading-tight drop-shadow-lg flex items-center gap-1.5">
                        <span className="truncate min-w-0">Your Brand Here</span>
                        {VERIFIED_BADGE}
                      </h3>
                      <p className="text-gray-300 text-sm line-clamp-2 leading-relaxed drop-shadow">
                        Autoplay video ad. Motion captures attention as users scroll through the feed.
                      </p>
                      <div className="flex items-center gap-1">
                        <span className="text-yellow-500 text-sm">⭐</span>
                        <span className="text-white font-bold text-sm drop-shadow">4.8</span>
                        <span className="text-gray-400 text-xs drop-shadow">(24)</span>
                      </div>
                      <div className="w-full py-3.5 px-4 rounded-xl font-black text-white text-sm uppercase tracking-wide bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg text-center">
                        Visit Site
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Image ad — static in-feed template */}
            <div className="w-full max-w-[280px] sm:w-[280px] shrink-0 pointer-events-none select-none">
              <InFeedImageAdTemplate />
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
