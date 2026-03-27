'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocalePath } from '@/lib/i18n';
import { trackTrendingClick } from '@/lib/actions/onlyfansTracking';
import { getTrendingCreators } from '@/lib/actions/publicData';

interface ShowcaseCreator {
  id: string;
  name: string;
  username: string;
  avatar: string;
  url: string;
  bio: string;
  price: number;
  isFree: boolean;
  source: 'trending' | 'clicked';
  slug?: string;
}

function FeedCard({ creator }: { creator: ShowcaseCreator }) {
  const handleClick = () => {
    trackTrendingClick(creator.id);
    window.open(creator.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="group block w-full text-left rounded-2xl bg-white overflow-hidden shadow-md hover:shadow-xl transition-shadow cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00AFF0]"
    >
      <div className="relative aspect-[3/4] bg-gray-100">
        {creator.avatar ? (
          <img
            src={creator.avatar}
            alt={`${creator.name} OnlyFans`}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-gray-300 bg-gradient-to-br from-gray-100 to-gray-200">
            {creator.name.charAt(0)}
          </div>
        )}
      </div>
      <div className="px-2.5 pt-2 pb-2.5 sm:px-4 sm:pt-3 sm:pb-4">
        <h3 className="font-bold text-[13px] sm:text-[15px] text-gray-900 truncate leading-tight">
          {creator.name}
        </h3>
        <p className="text-[11px] sm:text-[13px] text-[#00AFF0] mt-0.5">@{creator.username}</p>
        {creator.bio && (
          <p className="mt-1.5 sm:mt-2 text-[11px] sm:text-[12px] text-gray-500 line-clamp-2 leading-relaxed">{creator.bio}</p>
        )}
        <span className="block w-full mt-2 sm:mt-3 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-[#00AFF0] to-[#00D4FF] text-white text-[13px] sm:text-sm font-bold text-center shadow-sm group-hover:shadow-md group-hover:from-[#009ADB] group-hover:to-[#00BFE8] transition-all">
          View profile
        </span>
      </div>
    </button>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl bg-white overflow-hidden shadow-md animate-pulse">
      <div className="aspect-[3/4] bg-gray-200" />
      <div className="px-2.5 pt-2 pb-2.5 sm:px-4 sm:pt-3 sm:pb-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-3.5 sm:h-4 bg-gray-200 rounded w-20 sm:w-24" />
          <div className="h-3.5 sm:h-4 bg-gray-200 rounded w-8 sm:w-10" />
        </div>
        <div className="h-3 bg-gray-100 rounded w-16 sm:w-20 mb-2" />
        <div className="space-y-1.5 mb-2 sm:mb-3">
          <div className="h-2.5 sm:h-3 bg-gray-100 rounded w-full" />
          <div className="h-2.5 sm:h-3 bg-gray-100 rounded w-3/4" />
        </div>
        <div className="h-8 sm:h-10 bg-gray-200 rounded-xl" />
      </div>
    </div>
  );
}

export default function OnlyFansShowcase() {
  const [creators, setCreators] = useState<ShowcaseCreator[]>([]);
  const [loaded, setLoaded] = useState(false);
  const lp = useLocalePath();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await getTrendingCreators();

        if (cancelled) return;

        const mapped: ShowcaseCreator[] = (data as any[])
          .slice(0, 3)
          .map((c: any) => ({
            id: c._id,
            name: c.name,
            username: c.username,
            avatar: c.avatar || '',
            url: c.url,
            bio: c.bio || '',
            price: 0,
            isFree: true,
            source: 'trending' as const,
          }));

        setCreators(mapped);
        setLoaded(true);
      } catch {
        setLoaded(true);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  if (loaded && creators.length === 0) return null;

  return (
    <div className="mt-8">
      <div className="relative">
        {/* Top gradient border */}
        <div className="h-[2px] rounded-t-2xl" style={{ background: 'linear-gradient(90deg, #00AFF0, #00D4FF, #0088cc, #00AFF0)' }} />

        {/* EROGRAM ONLYFANS SEARCH badge — top-right, overlapping border */}
        <div className="absolute -top-[1px] right-3 z-10">
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-b-md text-[9px] font-black uppercase tracking-[0.15em]"
            style={{ background: 'linear-gradient(135deg, #00AFF0, #00D4FF)', color: '#001820' }}
          >
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14 0-5.5 3-7 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.5-2.5 1.5-3.5l1 1z" />
            </svg>
            CREATORS TRENDING ON EROGRAM
          </span>
        </div>

        {/* Inner dark card */}
        <div
          className="relative rounded-b-[14px] overflow-hidden p-3 sm:p-4"
          style={{ background: 'linear-gradient(160deg, #060d12 0%, #081015 60%, #050b0f 100%)' }}
        >
          {/* Subtle glow */}
          <div className="absolute top-0 right-0 w-56 h-56 blur-3xl opacity-[0.06] rounded-full pointer-events-none" style={{ background: 'radial-gradient(ellipse, #00AFF0 0%, transparent 60%)' }} />
          <div className="absolute bottom-0 left-0 w-40 h-40 blur-3xl opacity-[0.04] rounded-full pointer-events-none" style={{ background: 'radial-gradient(ellipse, #00D4FF 0%, transparent 60%)' }} />

          {/* Creator grid */}
          {!loaded ? (
            <div className="relative grid grid-cols-3 gap-1.5 sm:gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : (
            <div className="relative grid grid-cols-3 gap-1.5 sm:gap-3">
              {creators.map((c) => (
                <FeedCard key={c.id} creator={c} />
              ))}
            </div>
          )}

          {/* CTA button */}
          <Link
            href={lp('/onlyfanssearch')}
            className="relative block mt-3 w-full text-center py-2.5 rounded-xl font-black text-[13px] transition-all hover:scale-[1.02]"
            style={{ background: 'linear-gradient(135deg, #00AFF0, #00D4FF)', color: '#001820' }}
          >
            🔥 Trending on OnlyFans Search
          </Link>
          <p className="mt-2 text-center text-[10px]" style={{ color: '#00AFF0' }}>
            Discover top OnlyFans creators · Updated daily
          </p>
        </div>
      </div>
    </div>
  );
}
