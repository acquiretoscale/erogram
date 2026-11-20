'use client';

import { useState, type ReactNode } from 'react';
import { PROMO_HEADER_BG, PROMO_ACCENT } from './promoTheme';

const CARD_BORDER = '3px solid #000000';
const CARD_SHADOW = '6px 6px 0px #000000';

/** Bust CDN/browser cache after swapping in full-resolution PNGs (~3400px). */
const CACHE_BUST = '?hq=3';

type ProofImage = { path: string; width: number; height: number; alt: string };

const PROOF: Record<'ga4July' | 'ga4AugSept', ProofImage> = {
  ga4July: {
    path: '/assets/promo/mediakit-ga4-july-august.png',
    width: 3414,
    height: 1546,
    alt: 'Google Analytics user attributes overview for Erogram',
  },
  ga4AugSept: {
    path: '/assets/promo/mediakit-ga4-aug-sept.png',
    width: 3412,
    height: 1564,
    alt: 'Google Analytics user attributes overview for Erogram',
  },
};

function srcUrl(path: string) {
  return `${path}${CACHE_BUST}`;
}

function HighResProofImage({ image }: { image: ProofImage }) {
  const [open, setOpen] = useState(false);
  const src = srcUrl(image.path);
  const sizes = '(min-width: 1280px) 880px, 100vw';

  return (
  <>
      {/* Native dimensions + width descriptor so the browser never picks a tiny cached variant on Retina. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        srcSet={`${src} ${image.width}w`}
        sizes={sizes}
        alt={image.alt}
        width={image.width}
        height={image.height}
        className="block w-full h-auto max-w-full cursor-zoom-in"
        loading="eager"
        decoding="async"
        fetchPriority="high"
        onClick={() => setOpen(true)}
      />
      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/92 p-3 sm:p-6"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal
          aria-label="Full size screenshot"
        >
          <div className="relative flex max-h-[94vh] max-w-[min(96vw,100%)] items-center justify-center" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={image.alt}
              width={image.width}
              height={image.height}
              className="max-h-[94vh] w-auto max-w-[96vw] object-contain rounded-lg shadow-2xl"
            />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute -top-2 -right-2 flex h-9 w-9 items-center justify-center rounded-full bg-white text-sm font-black text-gray-900 shadow-lg"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function ProofCard({
  title,
  caption,
  children,
}: {
  title: string;
  caption: string;
  children: ReactNode;
}) {
  return (
    <article style={{ border: CARD_BORDER, boxShadow: CARD_SHADOW }}>
      <div className="px-4 py-3 sm:px-5 sm:py-3.5" style={{ background: PROMO_HEADER_BG }}>
        <h3 className="text-sm font-black uppercase leading-snug tracking-wide text-white sm:text-base">{title}</h3>
        <p className="mt-2 border-t border-white/15 pt-2 text-xs font-semibold leading-relaxed text-white sm:text-sm">{caption}</p>
      </div>
      <div className="p-3 sm:p-4 md:p-5">{children}</div>
    </article>
  );
}

function ImageFrame({ image }: { image: ProofImage }) {
  return (
    <div
      className="mx-auto w-full max-w-[min(100%,880px)] rounded-md"
      style={{ border: `2px solid ${PROMO_ACCENT}` }}
    >
      <HighResProofImage image={image} />
    </div>
  );
}

const sectionTitleClass =
  'mb-5 text-center text-xl font-black uppercase tracking-tight text-white sm:mb-6 sm:text-2xl md:text-3xl';

export default function MediaKitSeoAudienceOverview() {
  return (
    <div className="mx-auto mb-10 px-3 sm:mb-12 sm:px-6 lg:px-8" style={{ maxWidth: 1360 }}>
      <section id="audience-overview" className="scroll-mt-28" aria-labelledby="audience-overview-title">
        <h2 id="audience-overview-title" className={sectionTitleClass}>
          Audience Overview
        </h2>
        <ProofCard
          title="GA4 Traffic Overview"
          caption="2 different GA4 snapshots to help you visualise how the traffic fluctuates on Erogram. Top countries and cities, active users, and language."
        >
          <div className="flex flex-col gap-4 sm:gap-5">
            <ImageFrame image={PROOF.ga4July} />
            <ImageFrame image={PROOF.ga4AugSept} />
          </div>
        </ProofCard>
      </section>
    </div>
  );
}