'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { trackClick } from '@/lib/actions/campaigns';

export interface HeaderBannerCampaign {
  _id: string;
  creative: string;
  destinationUrl: string;
  bannerDevice?: 'all' | 'mobile' | 'desktop';
}

interface HeaderBannerProps {
  campaigns?: HeaderBannerCampaign[];
  className?: string;
  /** Ad-space name for click tracking. Defaults to 'top-banner'; the homepage hero passes 'homepage-hero'
   *  so its clicks show as their own line on the dashboard instead of being lumped into Top Banner. */
  placement?: string;
  /** Homepage only: desktop caps are 40% larger (70vw / 392px). */
  enlargeDesktop?: boolean;
}

const DEVICE_CLASS: Record<string, string> = {
  mobile: 'md:hidden',
  desktop: 'hidden md:block',
};

const ROTATE_MS = 7000;

/**
 * Header banner: no max-width, no fixed height. Full width of container, image natural size.
 * One banner at a time. Multiple campaigns share the slot: random start, then rotate.
 * Respects bannerDevice: 'mobile' renders only on <md, 'desktop' only on md+, 'all' everywhere.
 */
export default function HeaderBanner({
  campaigns = [],
  className = '',
  placement = 'top-banner',
  enlargeDesktop = false,
}: HeaderBannerProps) {
  const items = useMemo(() => (campaigns ?? []).filter((c) => c?.creative), [campaigns]);
  const [currentIndex, setCurrentIndex] = useState(0);
  useEffect(() => {
    if (items.length <= 1) return;
    setCurrentIndex(Math.floor(Math.random() * items.length));
    const id = window.setInterval(() => {
      setCurrentIndex((i) => (i + 1) % items.length);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [items.length]);

  const current = items[currentIndex] ?? items[0];

  const handleClick = useCallback((campaign: HeaderBannerCampaign) => {
    trackClick(campaign._id, placement);
    window.open(campaign.destinationUrl, '_blank', 'noopener,noreferrer');
  }, [placement]);

  if (!items.length || !current) return null;

  const { creative: src, destinationUrl: href } = current;
  const deviceCls = DEVICE_CLASS[current.bannerDevice || ''] || '';

  return (
    <div className={`w-full ${deviceCls} ${className}`.trim()}>
      {/* Mobile: full-width stretch. Desktop: natural image size, max 50vw, centered. */}
      <div className="flex justify-center">
        <div className="relative inline-block w-full md:w-auto">
          <a
            href={href}
            target="_blank"
            rel="sponsored noopener noreferrer"
            onClick={(e) => {
              e.preventDefault();
              handleClick(current);
            }}
            className="block overflow-hidden cursor-pointer rounded-lg"
          >
            <img
              src={src}
              alt="Banner"
              loading="eager"
              className={
                enlargeDesktop
                  ? 'w-full h-auto md:w-auto md:h-auto md:max-w-[70vw] md:max-h-[392px]'
                  : 'w-full h-auto md:w-auto md:h-auto md:max-w-[50vw] md:max-h-[280px]'
              }
              style={{ display: 'block' }}
            />
          </a>
          <a
            href="/promo"
            className="absolute bottom-1 right-1.5 text-[9px] font-medium text-white/40 hover:text-white/60 transition-colors drop-shadow-sm"
          >
            Sponsored
          </a>
        </div>
      </div>
      {items.map((c) => (
        c._id === current._id ? null : (
          <img key={c._id} src={c.creative} alt="" aria-hidden="true" className="hidden" />
        )
      ))}
    </div>
  );
}
