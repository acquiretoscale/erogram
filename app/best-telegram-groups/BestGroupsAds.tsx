'use client';

import AdvertCard from '@/app/groups/AdvertCard';
import FallbackImage from '@/components/FallbackImage';
import type { FeedCampaign } from '@/app/groups/types';
import { useIsTelegramBrowser } from '@/app/hooks/useIsTelegramBrowser';
import { trackClick } from '@/lib/actions/campaigns';

interface BestGroupsAdsProps {
  ads: FeedCampaign[];
  variant: 'top' | 'grid';
}

/** Human label + neutral fallback copy per ad type, so every ad reads clearly. */
const AD_TYPE_META: Record<string, { label: string; blurb: string }> = {
  'onlyfans-creator': { label: 'Featured OnlyFans Creator', blurb: 'Featured OnlyFans creator on Erogram — browse photos, videos and more.' },
  'featured-nsfw': { label: 'Featured AI NSFW', blurb: 'Featured AI NSFW tool on Erogram — generate and explore.' },
  'featured-bot': { label: 'Featured Telegram Bot', blurb: 'Featured Telegram bot on Erogram.' },
  'premium': { label: 'Erogram Premium', blurb: 'Unlock Erogram Premium — exclusive groups and perks.' },
  'advertiser': { label: 'Featured', blurb: 'Featured on Erogram.' },
};

function adTypeMeta(adType?: string) {
  return AD_TYPE_META[adType || 'advertiser'] || AD_TYPE_META['advertiser'];
}

/**
 * Agnostic ad surfaces for the Best Telegram Groups Top-10 pages.
 * - variant="top": a single ad rendered in the EXACT same big card layout as a group entry,
 *   so it blends in. Carries a FEATURED badge (not a rank number). JS-click only → SEO-safe.
 * - variant="grid": a 4-up (2 on mobile) agnostic block before the 6th group, dark-integrated.
 * Client-only so the static page stays crawlable and ad links remain JS-driven.
 */
export default function BestGroupsAds({ ads, variant }: BestGroupsAdsProps) {
  const isTelegram = useIsTelegramBrowser();
  if (!ads.length || isTelegram) return null;

  if (variant === 'top') {
    const ad = ads[0];
    const meta = adTypeMeta(ad.adType);
    const go = () => {
      trackClick(ad._id, 'best-groups').catch(() => {});
      const url = (ad.destinationUrl || '').trim();
      if (url.startsWith('/')) window.location.href = url;
      else if (/^https?:\/\//.test(url)) window.open(url, '_blank', 'noopener,noreferrer');
    };
    return (
      <div
        onClick={go}
        role="link"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && go()}
        className="rounded-3xl p-6 md:p-8 border border-[#00AFF0]/30 bg-gradient-to-br from-[#00AFF0]/[0.10] to-[#7c3aed]/[0.08] relative overflow-hidden mb-12 cursor-pointer group"
      >
        {/* FEATURED badge — blends with the rank-badge spot, but never claims a rank. */}
        <div className="absolute top-0 left-0 bg-[#00AFF0] text-white px-5 py-2 rounded-br-3xl font-black text-sm z-10 uppercase tracking-[0.08em]">
          Featured
        </div>

        <div className="flex flex-col md:flex-row gap-8 mt-4">
          <div className="w-full md:w-1/3 flex-shrink-0">
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-gray-800 shadow-2xl">
              <FallbackImage
                src={ad.creative}
                alt={ad.name || 'Featured'}
                className="object-cover group-hover:scale-110 transition-transform duration-500"
              />
            </div>
          </div>

          <div className="flex-grow flex flex-col justify-center">
            {/* Ad type tag — clean dot marker, no emoji. */}
            <span className="inline-flex w-fit items-center gap-1.5 px-2.5 py-1 mb-2 rounded-full bg-[#00AFF0]/10 border border-[#00AFF0]/25 text-[#00AFF0] text-[10px] font-bold uppercase tracking-[0.08em]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00AFF0]" />
              {meta.label}
            </span>

            <h2 className="text-3xl font-bold mb-3 group-hover:text-[#00AFF0] transition-colors">{ad.name}</h2>

            <div className="flex flex-wrap gap-3 mb-4">
              {ad.category && ad.category !== 'All' && (
                <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-gray-300">
                  📂 {ad.category}
                </span>
              )}
              {ad.country && ad.country !== 'All' && (
                <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-gray-300">
                  🌍 {ad.country}
                </span>
              )}
            </div>

            <p className="text-gray-400 text-lg mb-8 leading-relaxed line-clamp-3">
              {(ad.description || '').trim() || meta.blurb}
            </p>

            <div className="mt-auto">
              <span
                className="inline-block w-full md:w-auto text-center text-white font-black py-3 px-8 rounded-xl transition-all group-hover:brightness-110 group-hover:scale-[1.02]"
                style={{ background: 'linear-gradient(135deg, #ff5e2a, #ff9432)', color: '#ffffff', boxShadow: '0 4px 14px -5px rgba(255,94,42,0.5)' }}
              >
                {ad.buttonText || 'Visit site'}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 md:p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[#00AFF0]" style={{ fontSize: 14 }}>★</span>
        <h3 className="text-sm font-black text-white/80">FEATURED ON <span className="text-[#00AFF0]">EROGRAM</span></h3>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {ads.map((c, i) => (
          <AdvertCard key={`best-groups-${c._id}`} campaign={c} isIndex={i} forceVisible hidePromoted placementOverride="best-groups" />
        ))}
      </div>
    </div>
  );
}
