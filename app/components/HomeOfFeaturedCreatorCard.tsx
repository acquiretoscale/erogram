'use client';

import { useEffect, useState } from 'react';
import { ExternalLink, Users } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/client';
import type { HomeFeaturedOfCreator } from '@/lib/explore/homeFeaturedOfCreator';
import { trackClick as trackCampaignClick } from '@/lib/actions/campaigns';
import { trackTrendingClick } from '@/lib/actions/onlyfansTracking';
import TwitterVerifiedIcon from '@/components/TwitterVerifiedIcon';

function formatCount(n: number) {
  if (!n) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

/** GMT live window — matches /groups OF ads and OF Featured admin (-1 off; 0/0 = 24/7). */
function isCreatorLiveNow(start?: number, end?: number): boolean {
  if (start == null || end == null || start < 0 || end < 0) return false;
  if (start === 0 && end === 0) return true;
  const h = new Date().getUTCHours();
  return start <= end ? h >= start && h < end : h >= start || h < end;
}

function OnlyFansIcon({
  className = 'w-5 h-5',
  fill = '#ffffff',
}: {
  className?: string;
  fill?: string;
}) {
  return (
    <svg className={`flex-shrink-0 ${className}`} viewBox="0 0 24 24" fill={fill} aria-hidden="true">
      <path d="M24 4.003h-4.015c-3.45 0-5.3.197-6.748 1.957a7.996 7.996 0 1 0 2.103 9.211c3.182-.231 5.39-2.134 6.085-5.173c0 0-2.399.585-4.43 0c4.018-.777 6.333-3.037 7.005-5.995M5.61 11.999A2.391 2.391 0 0 1 9.28 9.97a2.966 2.966 0 0 1 2.998-2.528h.008c-.92 1.778-1.407 3.352-1.998 5.263A2.392 2.392 0 0 1 5.61 12Zm2.386-7.996a7.996 7.996 0 1 0 7.996 7.996a7.996 7.996 0 0 0-7.996-7.996m0 10.394A2.399 2.399 0 1 1 10.395 12a2.396 2.396 0 0 1-2.399 2.398Z" />
    </svg>
  );
}

export default function HomeOfFeaturedCreatorCard({
  creator,
  clickPlacementPrefix = 'home-of',
  className = '',
  showSubscriberCount = true,
  layout = 'home',
}: {
  creator: HomeFeaturedOfCreator;
  /** Split-test + campaign placement id prefix (e.g. join-of:v2 on group pages). */
  clickPlacementPrefix?: string;
  className?: string;
  showSubscriberCount?: boolean;
  /** `vertical` = tall image deck on top (Top Bots / feed slots); `home` = default homepage cell. */
  layout?: 'home' | 'vertical';
}) {
  const { t } = useTranslation();
  const followers = Math.max(creator.subscriberCount ?? 0, creator.likesCount ?? 0);

  const album =
    creator.album && creator.album.length > 0
      ? creator.album
      : creator.avatar
        ? [creator.avatar]
        : [];
  const albumIdx = creator.albumIdx ?? album.map((_, i) => i);

  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState(0);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setPos(album.length > 1 ? Math.floor(Math.random() * album.length) : 0);
    setMounted(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shownVariantIdx = albumIdx[pos] ?? albumIdx[0] ?? 0;
  const pickReady = mounted || album.length <= 1;
  const cover = pickReady && !imgError ? album[pos] || creator.avatar : '';
  const showLive = isCreatorLiveNow(creator.liveHourStart, creator.liveHourEnd);

  const onNavigateClick = () => {
    const placement = `${clickPlacementPrefix}:v${shownVariantIdx}`;
    if (creator.campaignId) trackCampaignClick(creator.campaignId, placement);
    else if (creator.trendingId) trackTrendingClick(creator.trendingId, shownVariantIdx);
  };

  const verticalHashtagRow =
    creator.hashtags && creator.hashtags.length > 0 ? (
      <div className="mt-1.5 flex w-full flex-wrap items-center justify-center gap-x-1 gap-y-0.5 px-0.5">
        {creator.hashtags.map((tag) => (
          <span
            key={tag}
            className="rounded border border-[#00AFF0]/30 bg-[#00AFF0]/[0.06] px-1 py-px text-[7px] font-bold leading-tight capitalize text-[#0084BD] sm:text-[8px]"
          >
            #{tag.replace(/\s+/g, '')}
          </span>
        ))}
      </div>
    ) : null;

  const verticalNewToOfChip = creator.showNewToOfBadge ? (
    <span className="mt-1 inline-flex items-center gap-0.5 text-[7px] font-bold uppercase tracking-wide text-emerald-700/90 sm:text-[8px]">
      <span aria-hidden>🔥</span>
      New to OF
    </span>
  ) : null;

  const verticalFooter = (
    <>
      <p className="flex items-center justify-center gap-1 min-w-0 text-center text-[13px] font-black text-[#0084BD] sm:text-[14px]">
        <span className="truncate">@{creator.username}</span>
        <TwitterVerifiedIcon className="h-4 w-4 shrink-0 sm:h-[18px] sm:w-[18px]" />
      </p>
      {verticalHashtagRow}
      {verticalNewToOfChip ? <div className="flex justify-center">{verticalNewToOfChip}</div> : null}
      {showSubscriberCount && followers > 0 ? (
        <span className="mt-1 inline-flex w-full items-center justify-center gap-1 text-[10px] font-black text-gray-700 sm:text-xs">
          <Users className="h-3 w-3 shrink-0 text-[#00AFF0]" aria-hidden />
          {formatCount(followers)} {t('ofSearch.subscribers')}
        </span>
      ) : null}
      <div
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-[#00AFF0] px-3 py-2.5 shadow-[0_6px_22px_rgba(0,175,240,0.35)] transition-shadow group-hover:shadow-[0_10px_32px_rgba(0,175,240,0.45)] sm:gap-2.5 sm:py-3"
        style={{
          background: 'linear-gradient(135deg, #00D4FF 0%, #00AFF0 50%, #0088bb 100%)',
        }}
      >
        <OnlyFansIcon className="h-6 w-6 sm:h-7 sm:w-7" />
        <span className="whitespace-nowrap text-[11px] font-black uppercase leading-none tracking-wide text-white sm:text-[13px]">
          VISIT ONLYFANS
        </span>
        <ExternalLink className="h-3.5 w-3.5 shrink-0 text-white/85 sm:h-4 sm:w-4" aria-hidden />
      </div>
    </>
  );

  const imagePanel = (
    <div
      className={
        layout === 'vertical'
          ? 'relative isolate w-full flex-[1] basis-[58%] overflow-hidden bg-[#0a0a0a] [min-height:15rem] sm:[min-height:17rem] sm:basis-[62%]'
          : 'relative isolate min-h-0 w-full flex-1 overflow-hidden bg-white'
      }
    >
      {cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={cover}
          alt={`${creator.name} OnlyFans`}
          className={`absolute inset-0 z-[1] h-full w-full transition-transform duration-500 ease-out ${
            layout === 'vertical'
              ? 'object-cover object-top group-hover:scale-[1.03]'
              : 'object-contain object-center group-hover:scale-[1.02]'
          }`}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
        />
      ) : (
        <div
          className={`absolute inset-0 flex items-center justify-center text-3xl font-bold text-[#00AFF0]/35 ${
            layout === 'vertical' ? 'bg-[#0a0a0a]' : 'bg-white'
          }`}
        >
          {creator.name.charAt(0)}
        </div>
      )}
      {layout === 'vertical' ? (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-[3] bg-gradient-to-b from-white/55 via-white/25 to-transparent px-3 pb-6 pt-2.5 sm:px-3.5 sm:pt-3">
          <p className="flex min-w-0 items-center justify-center gap-1.5 whitespace-nowrap text-[8px] font-black uppercase tracking-[0.16em] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)] sm:text-[9px]">
            <OnlyFansIcon className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" fill="#ffffff" />
            Featured creator
          </p>
        </div>
      ) : null}
      {showLive ? (
        <div
          className={`absolute z-[4] inline-flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 backdrop-blur-sm ${
            layout === 'vertical' ? 'top-10 right-3' : 'top-3 right-3'
          }`}
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <span className="text-[12px] sm:text-[11px] font-black uppercase tracking-wider text-white">Live</span>
        </div>
      ) : null}
    </div>
  );

  return (
    <a
      href={creator.onlyfansUrl}
      target="_blank"
      rel="sponsored noopener noreferrer"
      onClick={onNavigateClick}
      className={`group relative flex h-full w-full flex-col overflow-hidden rounded-2xl bg-white text-left ring-2 ring-[#00AFF0]/40 shadow-[0_8px_28px_-8px_rgba(0,175,240,0.2)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_40px_-6px_rgba(0,175,240,0.35)] hover:ring-[#00AFF0] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#00AFF0]/50 no-underline ${
        layout === 'vertical' ? 'min-h-[22rem] sm:min-h-[24rem]' : 'min-h-[280px]'
      } ${className}`.trim()}
    >
      {layout === 'home' ? (
        <>
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-black/[0.06] bg-white px-3 py-2 sm:px-4 sm:py-2.5">
            <p className="flex min-w-0 items-center gap-1 whitespace-nowrap text-[12px] sm:text-[11px] font-black uppercase tracking-[0.14em] sm:gap-1.5">
              <OnlyFansIcon className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" fill="#00AFF0" />
              <span className="text-[#00AFF0]">FEATURED CREATOR</span>
            </p>
          </div>
          {imagePanel}
          <div className="relative z-10 flex shrink-0 flex-col justify-center gap-2 border-t border-black/[0.06] bg-white px-3 pb-3 pt-2.5 sm:px-4 sm:pb-3.5 sm:pt-3">
            <p className="flex items-center justify-center gap-1 min-w-0 text-center text-[12px] sm:text-[11px] font-black text-[#0084BD]">
              <span className="truncate">@{creator.username}</span>
              <TwitterVerifiedIcon className="h-4 w-4 shrink-0 sm:h-[18px] sm:w-[18px]" />
            </p>
            <div
              className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-[#00AFF0] px-3 py-2.5 shadow-[0_6px_22px_rgba(0,175,240,0.35)] transition-shadow group-hover:shadow-[0_10px_32px_rgba(0,175,240,0.45)] sm:gap-3 sm:px-4 sm:py-3"
              style={{
                background: 'linear-gradient(135deg, #00D4FF 0%, #00AFF0 50%, #0088bb 100%)',
              }}
            >
              <OnlyFansIcon className="h-7 w-7 sm:h-8 sm:w-8" />
              <span className="text-[12px] sm:text-[11px] font-black uppercase leading-none tracking-wide text-white">
                VISIT ONLYFANS
              </span>
              <ExternalLink className="h-4 w-4 shrink-0 text-white/85 sm:h-[18px] sm:w-[18px]" aria-hidden />
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 py-2 sm:py-2.5">
              {showSubscriberCount && followers > 0 ? (
                <span className="inline-flex items-center gap-1.5 text-[12px] sm:text-[11px] font-black text-gray-800">
                  <Users className="h-3.5 w-3.5 shrink-0 text-[#00AFF0]" aria-hidden />
                  {formatCount(followers)} {t('ofSearch.subscribers')}
                </span>
              ) : null}
              {creator.showNewToOfBadge ? (
                <span className="inline-flex items-center gap-1 rounded-md border border-emerald-600 bg-emerald-500 px-1.5 py-0.5 text-[12px] sm:text-[11px] font-black uppercase tracking-wide text-white shadow-sm">
                  <span aria-hidden>🔥</span>
                  New to OF
                </span>
              ) : null}
            </div>
            {creator.hashtags && creator.hashtags.length > 0 ? (
              <div className="flex max-w-full flex-nowrap items-center justify-center gap-1 overflow-x-auto px-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {creator.hashtags.map((tag) => (
                  <span
                    key={tag}
                    className="shrink-0 whitespace-nowrap rounded-md border border-[#00AFF0]/35 bg-[#00AFF0]/10 px-1.5 py-0.5 text-[12px] sm:text-[11px] font-black capitalize text-[#0084BD] sm:px-2"
                  >
                    #{tag.replace(/\s+/g, '')}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </>
      ) : (
        <>
          {imagePanel}
          <div className="relative z-10 flex shrink-0 flex-col border-t border-black/[0.06] bg-white px-3 pb-3 pt-2.5 sm:px-3.5 sm:pb-3.5 sm:pt-3">
            {verticalFooter}
          </div>
        </>
      )}
    </a>
  );
}
