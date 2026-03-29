'use client';

import { useState } from 'react';
import Image from 'next/image';

function ZoomableImage({ src, alt, width, height, className }: { src: string; alt: string; width: number; height: number; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Image src={src} alt={alt} width={width} height={height} className={`${className ?? ''} cursor-zoom-in`} onClick={() => setOpen(true)} />
      {open && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="relative flex items-center justify-center" style={{ maxWidth: '95vw', maxHeight: '90vh' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={alt} style={{ maxWidth: '95vw', maxHeight: '90vh', width: 'auto', height: 'auto', objectFit: 'contain' }} className="rounded-xl shadow-2xl" />
            <button onClick={() => setOpen(false)} className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white text-gray-900 flex items-center justify-center text-sm font-black shadow-lg">✕</button>
          </div>
        </div>
      )}
    </>
  );
}

export default function OrganicGrowth() {
  return (
    <div className="rounded-2xl p-4 sm:p-6 md:p-8 mb-6 overflow-hidden bg-white border border-gray-100 shadow-sm">
      <div className="rounded-xl border border-gray-200 overflow-hidden">

        {/* Header */}
        <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-gray-200 flex items-start sm:items-center gap-2 sm:gap-3 bg-white">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" strokeLinecap="round" strokeLinejoin="round" />
              <polyline points="16 7 22 7 22 13" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="min-w-0">
            <h3 className="text-xs sm:text-sm font-bold text-gray-900 leading-tight">Explosive Google traffic growth — month over month</h3>
            <p className="text-[9px] sm:text-[10px] text-gray-500 leading-tight mt-0.5">2,800+ daily clicks from Google alone · +80% MoM · Google Search Console verified</p>
          </div>
        </div>

        {/* Two charts side by side */}
        <div className="flex flex-col lg:flex-row bg-white divide-y lg:divide-y-0 lg:divide-x divide-gray-100">

          {/* Google Search Console */}
          <div className="flex-1 p-3 sm:p-4">
            <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 sm:mb-3">Google Search Console</p>
            <div className="rounded-xl overflow-hidden border border-gray-100 shadow-sm">
              <ZoomableImage
                src="/assets/google-search-console-mar2026.png"
                alt="Google Search Console — explosive growth to 2,800+ daily clicks"
                width={1024} height={540} className="w-full h-auto"
              />
            </div>
          </div>

          {/* SimilarWeb */}
          <div className="flex-1 p-3 sm:p-4 flex flex-col">
            <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 sm:mb-3">SimilarWeb Overview</p>
            <div className="flex-1 flex items-center justify-center">
              <div className="rounded-xl overflow-hidden border border-gray-100 shadow-sm w-full max-w-[260px] mx-auto">
                <ZoomableImage
                  src="/assets/similarweb-stats.png"
                  alt="SimilarWeb traffic chart — erogram.pro"
                  width={700} height={900} className="w-full h-auto"
                />
              </div>
            </div>
            <div className="flex items-center justify-center gap-1.5 mt-3">
              <svg className="w-3 h-3 text-[#0ea5e9] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              <a href="https://pro.similarweb.com/?domain=erogram.pro" target="_blank" rel="noopener noreferrer"
                className="text-[10px] font-bold text-[#0ea5e9] hover:underline">
                pro.similarweb.com — erogram.pro
              </a>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
