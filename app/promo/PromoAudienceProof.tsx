'use client';

import { useState } from 'react';
import { AudienceCountriesPanel } from './AudienceCountries';

const HEADER_BG = 'linear-gradient(160deg, #04140c 0%, #0a2e1a 60%, #064e3b 100%)';
const BORDER = '3px solid #000000';
const SHADOW = '6px 6px 0px #000000';
const ACCENT = '#22c55e';

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

export default function PromoAudienceProof() {
  return (
    <div className="mb-6">
      <div className="overflow-hidden bg-white" style={{ border: BORDER, boxShadow: SHADOW }}>
        <div className="px-4 sm:px-5 py-4 sm:py-5" style={{ background: HEADER_BG }}>
          <p className="text-sm sm:text-base text-white/80 leading-relaxed">
            With <strong className="font-black text-white">consistent 40% month-over-month Google&apos;s organic growth.</strong> In just a few months, EROGRAM became one of the fastest Adult Discovery hubs online.
          </p>
          <p className="mt-3 text-sm sm:text-base text-white/70 leading-relaxed">
            Explosive Google traffic growth. Over 4000 people land on EROgram while actively searching for AI NSFW tools to use, Onlyfans creators to subscribe to, and premium Telegram Bots, giving our partners exposure to one of the fastest-growing adult discovery platforms on the web.
          </p>
          <p className="mt-3 text-sm sm:text-base text-white/70 leading-relaxed">
            With visitors mainy from Tier 1 & 2 countries like US, UK, Germany, Australia, and other high-value markets,{' '}
            <strong className="font-black text-white">your brand gets in front of people with high purchasing power and willing to spend on adult entretainement.</strong>
          </p>
        </div>

        <div className="p-4 sm:p-5 md:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4 items-stretch">
            <div className="flex flex-col gap-2 min-h-0">
              <div className="overflow-hidden bg-gray-50" style={{ border: `2px solid ${ACCENT}` }}>
                <ZoomableImage src="/assets/promo/erogram1.png" alt="Google Search Console showing Erogram organic traffic growth" />
              </div>
              <div className="overflow-hidden bg-gray-50" style={{ border: `2px solid ${ACCENT}` }}>
                <ZoomableImage src="/assets/promo/erogram2.png" alt="Google Analytics showing Erogram visitor geography by country" />
              </div>
            </div>
            <AudienceCountriesPanel embedded />
          </div>
        </div>
      </div>
    </div>
  );
}
