'use client';

import { useEffect, useState } from 'react';
import type { HomeFeaturedOfCreator } from '@/lib/explore/homeFeaturedOfCreator';
import { trackClick as trackCampaignClick } from '@/lib/actions/campaigns';
import { trackTrendingClick } from '@/lib/actions/onlyfansTracking';

function OnlyFansIcon({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg className={`shrink-0 ${className}`} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M24 4.003h-4.015c-3.45 0-5.3.197-6.748 1.957a7.996 7.996 0 1 0 2.103 9.211c3.182-.231 5.39-2.134 6.085-5.173c0 0-2.399.585-4.43 0c4.018-.777 6.333-3.037 7.005-5.995M5.61 11.999A2.391 2.391 0 0 1 9.28 9.97a2.966 2.966 0 0 1 2.998-2.528h.008c-.92 1.778-1.407 3.352-1.998 5.263A2.392 2.392 0 0 1 5.61 12Zm2.386-7.996a7.996 7.996 0 1 0 7.996 7.996a7.996 7.996 0 0 0-7.996-7.996m0 10.394A2.399 2.399 0 1 1 10.395 12a2.396 2.396 0 0 1-2.399 2.398Z" />
    </svg>
  );
}

function isCreatorLiveNow(start?: number, end?: number): boolean {
  if (start == null || end == null || start < 0 || end < 0) return false;
  if (start === 0 && end === 0) return true;
  const h = new Date().getUTCHours();
  return start <= end ? h >= start && h < end : h >= start || h < end;
}

/** Wide join card: photo + meta row, full-width CTA docked at bottom. */
export default function JoinGroupFeaturedOfBlock({ creator }: { creator: HomeFeaturedOfCreator }) {
  const album =
    creator.album && creator.album.length > 0 ? creator.album : creator.avatar ? [creator.avatar] : [];
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
  const cover = pickReady && !imgError ? album[pos] || creator.avatar : creator.avatar;
  const showLive = isCreatorLiveNow(creator.liveHourStart, creator.liveHourEnd);

  const onNavigateClick = () => {
    const placement = `join-of:v${shownVariantIdx}`;
    if (creator.campaignId) void trackCampaignClick(creator.campaignId, placement);
    else if (creator.trendingId) void trackTrendingClick(creator.trendingId, shownVariantIdx);
  };

  return (
    <div className="relative z-10 mt-6 w-full">
      <a
        href={creator.onlyfansUrl}
        target="_blank"
        rel="sponsored noopener noreferrer"
        onClick={onNavigateClick}
        className="group block no-underline focus:outline-none focus-visible:ring-4 focus-visible:ring-[#00AFF0]/40 rounded-[1.35rem]"
      >
        <article className="relative flex flex-col overflow-hidden rounded-[1.35rem] border border-[#00AFF0]/25 bg-white shadow-[0_16px_40px_-16px_rgba(0,175,240,0.28)] transition-shadow group-hover:shadow-[0_20px_48px_-12px_rgba(0,175,240,0.4)]">
          <div className="flex flex-col sm:flex-row">
            <div className="relative flex h-[22rem] w-full shrink-0 items-center justify-center overflow-hidden bg-white sm:h-auto sm:min-h-[17rem] sm:w-[58%]">
              {cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={cover}
                  alt={`${creator.username} OnlyFans`}
                  className="h-full w-full object-contain object-center"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  onError={() => setImgError(true)}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-4xl font-black text-[#00AFF0]/25">@</div>
              )}
              {showLive ? (
                <div className="absolute top-3 right-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 backdrop-blur-sm">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-wider text-white">Live</span>
                </div>
              ) : null}
            </div>

            <div className="flex min-w-0 flex-1 flex-col justify-center border-t border-black/[0.06] px-5 py-6 sm:border-t-0 sm:border-l sm:px-7 sm:py-8">
              <p className="mb-3 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.18em] text-[#00AFF0]">
                <OnlyFansIcon className="h-3 w-3" />
                Featured creator
              </p>
              <p className="truncate text-[1.2rem] font-black text-[#0084BD] sm:text-[1.4rem]">@{creator.username}</p>

              {creator.hashtags && creator.hashtags.length > 0 ? (
                <div className="mt-3 flex flex-wrap justify-center gap-1.5 sm:justify-start">
                  {creator.hashtags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md border border-[#00AFF0]/35 bg-[#00AFF0]/10 px-2 py-0.5 text-[9px] font-black capitalize text-[#0084BD]"
                    >
                      #{tag.replace(/\s+/g, '')}
                    </span>
                  ))}
                </div>
              ) : null}

              {creator.showNewToOfBadge ? (
                <span className="mt-3 inline-flex w-fit items-center gap-1 rounded-md border border-emerald-600 bg-emerald-500 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-white">
                  <span aria-hidden>🔥</span>
                  New to OF
                </span>
              ) : null}
            </div>
          </div>

          <div className="border-t border-black/[0.06] bg-white px-4 pb-4 pt-3 sm:px-6 sm:pb-5 sm:pt-4">
            <div
              className="mx-auto flex w-full max-w-xl items-center justify-center gap-3 whitespace-nowrap rounded-2xl border border-[#00AFF0] px-6 py-4 text-[16px] font-black uppercase tracking-[0.06em] text-white shadow-[0_10px_32px_rgba(0,175,240,0.45)] transition-shadow group-hover:shadow-[0_14px_40px_rgba(0,175,240,0.55)] sm:gap-4 sm:py-5 sm:text-[18px]"
              style={{
                background: 'linear-gradient(135deg, #00D4FF 0%, #00AFF0 50%, #0088bb 100%)',
              }}
            >
              <OnlyFansIcon className="h-7 w-7 sm:h-8 sm:w-8" />
              Visit OnlyFans
            </div>
          </div>
        </article>
      </a>
    </div>
  );
}
