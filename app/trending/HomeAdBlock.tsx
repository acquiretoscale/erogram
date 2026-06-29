'use client';

import { useEffect, useState } from 'react';
import AdvertCard from '@/app/groups/AdvertCard';
import type { FeedCampaign } from '@/app/groups/types';
import { trackClick } from '@/lib/actions/campaigns';
import { useIsTelegramBrowser } from '@/app/hooks/useIsTelegramBrowser';

interface HomeAdBlockProps {
  ads: FeedCampaign[];
  /** Canonical ad-space name for click tracking (e.g. 'home-block'). */
  placement: string;
}

/**
 * Home In Feed block — VERSATILE + ROTATING.
 *
 * One placement, two possible looks, picked at random on each page view:
 *   • a single WIDE banner (image OR video) — blockFormat === 'banner'
 *   • the classic 4-up card grid (current format) — blockFormat === 'card'
 *
 * Rotation model (owner spec): every banner AND the whole card-grid are EQUAL
 * options in one pool. One option is shown per refresh — so one load shows a
 * video banner, the next an image banner, the next the 4-up grid.
 *
 * Client-only + null in Telegram WebView (ad-blocker / SEO safe). Clicks tracked
 * via same-domain server actions. No "Promoted/Sponsored" labels (natural look).
 */
export default function HomeAdBlock({ ads, placement }: HomeAdBlockProps) {
  const isTelegram = useIsTelegramBrowser();

  const banners = ads.filter((a) => a.blockFormat === 'banner' && (a.creative || a.videoUrl));
  const cards = ads.filter((a) => a.blockFormat !== 'banner');

  // Build the option pool: each banner is its own option; the grid (if any cards) is one option.
  // option = { kind: 'banner', ad } | { kind: 'grid' }
  const options: Array<{ kind: 'banner'; ad: FeedCampaign } | { kind: 'grid' }> = [
    ...banners.map((ad) => ({ kind: 'banner' as const, ad })),
    ...(cards.length > 0 ? [{ kind: 'grid' as const }] : []),
  ];

  // Pick on mount (useEffect → avoids SSR/hydration mismatch). -1 = not chosen yet.
  const [pick, setPick] = useState<number>(-1);
  useEffect(() => {
    if (options.length > 0) setPick(Math.floor(Math.random() * options.length));
  }, [options.length]);

  if (isTelegram || options.length === 0 || pick < 0) return null;
  const chosen = options[pick] ?? options[0];

  const handleBannerClick = (ad: FeedCampaign) => {
    trackClick(ad._id, placement);
    const url = (ad.destinationUrl || '').trim();
    if (url.startsWith('/')) window.location.href = url;
    else if (url) window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <section className="my-10">
      {chosen.kind === 'banner' ? (
        <a
          href={chosen.ad.destinationUrl || '#'}
          onClick={(e) => { e.preventDefault(); handleBannerClick(chosen.ad); }}
          className="block overflow-hidden rounded-2xl border border-black/[0.08] shadow-[0_18px_40px_-24px_rgba(0,0,0,0.4)] cursor-pointer group"
        >
          {chosen.ad.videoUrl ? (
            <video
              src={chosen.ad.videoUrl}
              poster={chosen.ad.creative || undefined}
              autoPlay
              muted
              loop
              playsInline
              className="w-full h-auto max-h-[300px] object-cover block"
            />
          ) : (
            <img
              src={chosen.ad.creative}
              alt={chosen.ad.name || 'Featured'}
              loading="lazy"
              className="w-full h-auto max-h-[300px] object-cover block transition-transform duration-[1200ms] ease-out group-hover:scale-[1.02]"
            />
          )}
        </a>
      ) : (
        <div className="rounded-2xl border border-black/[0.08] bg-white p-4 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.35)]">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[#c0392f]" style={{ fontSize: 14 }}>★</span>
            <h3 className="text-sm font-black text-[#0f0c0a] tracking-tight">FEATURED ON <span className="text-[#c0392f]">EROGRAM</span></h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {cards.slice(0, 4).map((c, i) => (
              <AdvertCard key={`${placement}-${c._id}`} campaign={c} isIndex={i} forceVisible hidePromoted placementOverride={placement} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
