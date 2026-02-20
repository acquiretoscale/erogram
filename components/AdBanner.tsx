'use client';

import { useState, useEffect, useCallback } from 'react';

interface CampaignData {
  _id: string;
  creative: string;
  destinationUrl: string;
  slot: string;
}

interface AdBannerProps {
  campaigns: CampaignData[];
  slot: 'top-banner' | 'homepage-hero';
  className?: string;
}

const ROTATION_INTERVAL = 8000;

export default function AdBanner({ campaigns, slot, className = '' }: AdBannerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    if (slot !== 'top-banner' || campaigns.length <= 1) return;
    const timer = setInterval(() => {
      setIsFading(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % campaigns.length);
        setIsFading(false);
      }, 300);
    }, ROTATION_INTERVAL);
    return () => clearInterval(timer);
  }, [slot, campaigns.length]);

  const handleClick = useCallback((campaign: CampaignData) => {
    fetch('/api/campaigns/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ campaignId: campaign._id, placement: slot }) }).catch(() => {});
    window.open(campaign.destinationUrl, '_blank', 'noopener,noreferrer');
  }, [slot]);

  if (!campaigns?.length) {
    return null;
  }

  // Single block: native img only, no Next/Image
  const imgBlock = (campaign: CampaignData, opts: { objectFit?: string; loading?: 'lazy' | 'eager' }) => (
    <BannerImg
      src={campaign.creative}
      alt="Sponsored"
      objectFit="cover"
      loading={opts.loading}
    />
  );

  if (slot === 'homepage-hero') {
    const campaign = campaigns[0];
    return (
      <button
        type="button"
        onClick={() => handleClick(campaign)}
        className={`block w-full rounded-2xl overflow-hidden border border-white/10 hover:border-white/20 transition-all cursor-pointer h-[120px] sm:h-[160px] relative bg-black/20 ${className}`}
      >
        {imgBlock(campaign, { loading: 'eager' })}
        <span className="absolute top-2 right-2 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider bg-black/60 text-white/60 rounded">
          Ad
        </span>
      </button>
    );
  }

  // Top-banner
  const campaign = campaigns[currentIndex];
  return (
    <button
      type="button"
      onClick={() => handleClick(campaign)}
      className={`block w-full min-w-0 max-w-full box-border rounded-2xl overflow-hidden border border-white/10 hover:border-white/20 transition-all cursor-pointer h-[225px] min-h-[225px] sm:h-[270px] sm:min-h-[270px] relative bg-black/20 ${className}`}
    >
      <div
        className="absolute inset-0 transition-opacity duration-300"
        style={{ opacity: isFading ? 0 : 1 }}
      >
        <BannerImg src={campaign.creative} alt="Sponsored" objectFit="cover" loading="lazy" />
      </div>
      <span className="absolute top-2 right-2 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider bg-black/60 text-white/60 rounded z-10">
        Ad
      </span>
      {campaigns.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
          {campaigns.map((_, i) => (
            <div
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${i === currentIndex ? 'bg-white' : 'bg-white/40'}`}
            />
          ))}
        </div>
      )}
    </button>
  );
}

/** Plain img only – no Next/Image. Ensures banner shows regardless of domain/format/size. */
function BannerImg({
  src,
  alt,
  objectFit = 'cover',
  loading = 'lazy',
}: {
  src: string;
  alt: string;
  objectFit?: string;
  loading?: 'lazy' | 'eager';
}) {
  const [failed, setFailed] = useState(false);

  if (!src) {
    return (
      <div className="absolute inset-0 flex items-center justify-center text-white/40 text-sm">
        No image
      </div>
    );
  }

  if (failed) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-white/5 text-white/50 text-sm">
        Ad (image could not be loaded)
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={loading}
      onError={() => setFailed(true)}
      className="w-full h-full"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        objectFit: objectFit as 'cover',
      }}
    />
  );
}
