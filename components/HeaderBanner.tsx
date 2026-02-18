'use client';

import { useState, useMemo } from 'react';

export interface HeaderBannerCampaign {
  _id: string;
  creative: string;
  destinationUrl: string;
}

interface HeaderBannerProps {
  campaigns?: HeaderBannerCampaign[];
  className?: string;
}

/**
 * Header banner: no max-width, no fixed height. Full width of container, image natural size.
 * Shows exactly one banner per page; a different one is picked each time the user views a page (on mount).
 */
export default function HeaderBanner({ campaigns = [], className = '' }: HeaderBannerProps) {
  const items = useMemo(() => (campaigns ?? []).filter((c) => c?.creative), [campaigns]);
  const [currentIndex] = useState(() =>
    items.length > 1 ? Math.floor(Math.random() * items.length) : 0
  );

  const current = items[currentIndex] ?? items[0];

  if (!items.length || !current) return null;

  const { creative: src, destinationUrl: href } = current;

  return (
    <div className={`w-full ${className}`.trim()}>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => {
          e.preventDefault();
          window.open(href, '_blank', 'noopener,noreferrer');
        }}
        className="block w-full overflow-hidden cursor-pointer"
      >
        <img
          src={src}
          alt="Banner"
          className="w-full h-auto"
          loading="eager"
          style={{ display: 'block', maxWidth: '100%' }}
        />
      </a>
    </div>
  );
}
