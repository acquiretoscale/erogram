'use client';

import AdvertCard from '@/app/groups/AdvertCard';
import type { FeedCampaign } from '@/app/groups/types';
import { useIsTelegramBrowser } from '@/app/hooks/useIsTelegramBrowser';

interface BestPageAdBlockProps {
  ads: FeedCampaign[];
  placement: string;
}

/**
 * "TRENDING ON EROGRAM" 4-up block for the Top-10 pages.
 * Same look as the group/bot sidebar + AI NSFW tool block: 2 cols mobile, 4 cols desktop.
 * Client-only so the static page stays crawlable and ad links remain JS-driven (SEO-safe).
 */
export default function BestPageAdBlock({ ads, placement }: BestPageAdBlockProps) {
  const isTelegram = useIsTelegramBrowser();
  if (!ads.length || isTelegram) return null;

  return (
    <div className="rounded-2xl border border-[#00AFF0]/30 bg-white p-4 shadow-[0_18px_40px_-20px_rgba(0,175,240,0.45)] mb-12">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[#00AFF0]" style={{ fontSize: 14 }}>★</span>
        <h3 className="text-sm font-black text-[#0f172a]">TRENDING ON <span className="text-[#00AFF0]">EROGRAM</span></h3>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {ads.map((c, i) => (
          <AdvertCard key={`${placement}-${c._id}`} campaign={c} isIndex={i} forceVisible hidePromoted placementOverride={placement} />
        ))}
      </div>
    </div>
  );
}
