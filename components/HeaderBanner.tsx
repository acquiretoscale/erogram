'use client';

import { useState, useMemo, useCallback } from 'react';
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
}

const DEVICE_CLASS: Record<string, string> = {
  mobile: 'md:hidden',
  desktop: 'hidden md:block',
};

/**
 * Header banner: no max-width, no fixed height. Full width of container, image natural size.
 * Shows exactly one banner per page; a different one is picked each time the user views a page (on mount).
 * Respects bannerDevice: 'mobile' renders only on <md, 'desktop' only on md+, 'all' everywhere.
 */
export default function HeaderBanner({ campaigns = [], className = '' }: HeaderBannerProps) {
  const items = useMemo(() => (campaigns ?? []).filter((c) => c?.creative), [campaigns]);
  const [currentIndex] = useState(() =>
    items.length > 1 ? Math.floor(Math.random() * items.length) : 0
  );

  const current = items[currentIndex] ?? items[0];

  const handleClick = useCallback((campaign: HeaderBannerCampaign) => {
    trackClick(campaign._id, 'top-banner');
    window.open(campaign.destinationUrl, '_blank', 'noopener,noreferrer');
  }, []);

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
              className="w-full h-auto md:w-auto md:h-auto md:max-w-[50vw] md:max-h-[280px]"
              style={{ display: 'block' }}
            />
          </a>
          <a
            href="/advertise"
            className="absolute bottom-1 right-1.5 text-[9px] font-medium text-white/40 hover:text-white/60 transition-colors drop-shadow-sm"
          >
            Sponsored
          </a>
        </div>
      </div>
    </div>
  );
}
