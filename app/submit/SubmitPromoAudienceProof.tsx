'use client';

import { useState } from 'react';
import SubmitAudienceCountries from '@/app/submit/SubmitAudienceCountries';

const SURFACE = '#0a1628';
const HEADER_BG = 'linear-gradient(160deg, #041828 0%, #0a2840 55%, #0d3550 100%)';

function ZoomableImage({ src, alt }: { src: string; alt: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="w-full h-auto cursor-zoom-in block"
        loading="lazy"
        decoding="async"
        onClick={() => setOpen(true)}
      />
      {open && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="relative flex items-center justify-center max-w-[96vw] max-h-[92vh]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={alt}
              className="max-w-[96vw] max-h-[92vh] w-auto h-auto object-contain rounded-xl shadow-2xl"
            />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white text-gray-900 flex items-center justify-center text-sm font-black shadow-lg"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default function SubmitPromoAudienceProof() {
  return (
    <section
      className="overflow-hidden rounded-2xl border border-[#00AFF0]/30 shadow-[0_16px_40px_-20px_rgba(0,40,80,0.55)]"
      style={{ backgroundColor: SURFACE }}
    >
      <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-white/[0.08]" style={{ background: HEADER_BG }}>
        <p className="text-sm sm:text-base text-white/80 leading-relaxed">
          Erogram has grown with consistent 40% month-over-month organic traffic growth from Google.
        </p>
      </div>

      <div className="p-4 sm:p-5 md:p-6 space-y-4">
        <div className="overflow-hidden rounded-xl border border-[#00AFF0]/25 bg-[#071222]">
          <ZoomableImage src="/assets/promo/erogram1.png" alt="Google Search Console showing Erogram organic traffic growth" />
        </div>

        <p className="text-sm sm:text-base text-white/70 leading-relaxed px-1">
          With visitors mainly from Tier 1 and Tier 2 markets like the US, UK, Germany, Canada, Australia, and other high-value countries, your profile gets in front of fans with strong purchasing power.
        </p>

        <div className="overflow-hidden rounded-xl border border-[#00AFF0]/25 bg-[#071222]">
          <ZoomableImage src="/assets/promo/erogram2.png" alt="Google Analytics showing Erogram visitor geography by country" />
        </div>

        <SubmitAudienceCountries embedded />
      </div>
    </section>
  );
}
