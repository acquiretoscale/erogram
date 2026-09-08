'use client';

import { useState } from 'react';

const BORDER = '3px solid #000000';
const SHADOW = '6px 6px 0px #000000';
const ACCENT = '#22c55e';

export function ZoomableImage({ src, alt }: { src: string; alt: string }) {
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
        <div className="p-4 sm:p-5 md:p-6">
          <div className="flex flex-col gap-3 max-w-2xl mx-auto">
            <div className="overflow-hidden bg-gray-50" style={{ border: `2px solid ${ACCENT}` }}>
              <ZoomableImage src="/assets/promo/erogram1.png" alt="Google Search Console showing Erogram organic traffic growth" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
