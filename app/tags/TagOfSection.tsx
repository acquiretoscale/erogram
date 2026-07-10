'use client';

import Link from 'next/link';
import { useLocalePath } from '@/lib/i18n/client';
import type { TagCreatorResult, TagTop10Block } from '@/lib/actions/tags';
import type { TagRankingPage } from '@/lib/tags/rankings';

const HEADING = '#331a26';
const COUNT_TEXT = '#888888';

function formatCount(n: number) {
  if (!n) return '';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return `${n}`;
}

function PreviewMosaic({ avatars }: { avatars: string[] }) {
  const pics = avatars.slice(0, 4);
  return (
    <div
      className="grid h-14 w-14 shrink-0 grid-cols-2 gap-px overflow-hidden rounded-lg border border-[rgba(43,27,40,0.1)]"
      aria-hidden="true"
    >
      {Array.from({ length: 4 }).map((_, idx) => {
        const src = pics[idx];
        return (
          <div key={idx} className="relative aspect-square bg-[rgba(43,27,40,0.05)]">
            {src ? (
              <img
                src={src}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function OfCreatorCard({ creator }: { creator: TagCreatorResult }) {
  const profileHref = creator.slug ? `/${creator.slug}-onlyfans` : '#';

  const openProfile = () => {
    if (profileHref !== '#') window.open(profileHref, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-md transition-shadow hover:shadow-xl">
      <div className="relative aspect-[3/4] bg-gray-100">
        {creator.avatar ? (
          <img
            src={creator.avatar}
            alt={`${creator.name} OnlyFans`}
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 text-4xl font-bold text-gray-300">
            {creator.name.charAt(0)}
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col px-2.5 pt-2 sm:px-4 sm:pt-3">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <h3 className="truncate text-[13px] font-bold leading-tight text-gray-900 sm:text-[15px]">
            {creator.name}
          </h3>
          <span
            className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide sm:px-2 sm:text-[10px] ${
              creator.isFree ? 'bg-emerald-400 text-white' : 'bg-[#00AFF0] text-white'
            }`}
          >
            {creator.isFree ? 'Free' : `$${(creator.price ?? 0).toFixed(0)}`}
          </span>
        </div>
        <p className="mt-0.5 text-[11px] text-[#00AFF0] sm:text-[13px]">@{creator.username}</p>
        {(creator.likesCount > 0 || creator.subscriberCount > 0) && (
          <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-gray-400 sm:text-[11px]">
            {creator.subscriberCount > 0 && (
              <span>
                {formatCount(creator.subscriberCount)} subs
              </span>
            )}
            {creator.likesCount > 0 && (
              <span>
                {creator.subscriberCount > 0 ? '·' : ''} {formatCount(creator.likesCount)} likes
              </span>
            )}
          </div>
        )}
      </div>
      <div className="px-2.5 pb-2.5 pt-2 sm:px-4 sm:pb-4 sm:pt-3">
        <button
          type="button"
          onClick={openProfile}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#00AFF0] to-[#00D4FF] py-2 text-[13px] font-bold text-white shadow-sm transition-all hover:from-[#009ADB] hover:to-[#00BFE8] group-hover:shadow-md sm:py-2.5 sm:text-sm"
        >
          View Profile
        </button>
      </div>
    </div>
  );
}

function Top10Card({ block }: { block: TagTop10Block }) {
  const lp = useLocalePath();

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_8px_30px_-14px_rgba(0,0,0,0.25)]">
      <div className="border-b border-gray-100 px-5 pb-4 pt-5">
        <h3 className="text-lg font-black tracking-tight text-gray-900 sm:text-xl">
          Top 10 OnlyFans {block.label} Creators
        </h3>
      </div>
      <div className="flex-1 px-2 py-1">
        <div className="space-y-0.5">
          {block.creators.map((c, i) => (
            <button
              key={c._id}
              type="button"
              onClick={() => window.open(`/${c.slug}-onlyfans`, '_blank', 'noopener,noreferrer')}
              className="group flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-gray-50"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-900 text-[10px] font-black tabular-nums text-white">
                {i + 1}
              </span>
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                {c.avatar ? (
                  <img
                    src={c.avatar}
                    alt={c.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm font-bold text-gray-400">
                    {c.name.charAt(0)}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-bold leading-tight text-gray-900 transition-colors group-hover:text-[#00AFF0]">
                  {c.name}
                </p>
                <p className="truncate text-[11px] text-gray-500">@{c.username}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
      <div className="border-t border-gray-100 px-4 pb-4 pt-3">
        <Link
          href={lp(block.href)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-1 rounded-xl bg-gradient-to-r from-[#00AFF0] to-[#00D4FF] py-3 text-sm font-bold text-white transition-all hover:from-[#009ADB] hover:to-[#00BFE8]"
        >
          View Full Top 10 Ranking
        </Link>
      </div>
    </div>
  );
}

export default function TagOfSection({
  label,
  rankingPages,
  top10,
  categoryBrowseHref,
  creators,
  creatorCount,
}: {
  label: string;
  rankingPages: (TagRankingPage & { previewAvatars: string[] })[];
  top10: TagTop10Block | null;
  categoryBrowseHref: string | null;
  creators: TagCreatorResult[];
  creatorCount: number;
}) {
  const lp = useLocalePath();

  if (!rankingPages.length && !top10 && !creators.length && !categoryBrowseHref) return null;

  return (
    <section className="mt-12 border-t border-[#ececec] pt-10">
      <h2 className="mb-6 text-xl font-bold" style={{ color: HEADING }}>
        OnlyFans
      </h2>

      {rankingPages.length > 0 && (
        <div className="mb-8">
          <h3 className="mb-3 text-sm font-bold text-[#2B1B28]">Top 10 Rankings</h3>
          <nav
            aria-label={`${label} OnlyFans rankings`}
            className="rounded-xl border border-[rgba(43,27,40,0.1)] bg-[#F7F4EC] px-3 py-4 sm:px-4"
          >
            <ul className="m-0 list-none p-0">
              {rankingPages.map((page) => (
                <li
                  key={page.slug}
                  className="border-b border-[rgba(43,27,40,0.08)] last:border-b-0"
                >
                  <Link
                    href={lp(page.href)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-start gap-2.5 py-2.5 text-[#2B1B28] no-underline ${
                      page.isPrimary ? 'bg-white/40 -mx-1 px-1 rounded-lg' : ''
                    }`}
                  >
                    <PreviewMosaic avatars={page.previewAvatars} />
                    <span className="pt-0.5 text-[11px] font-semibold leading-snug sm:text-[12px]">
                      {page.isPrimary && (
                        <span className="mb-0.5 block text-[10px] font-black uppercase tracking-wide text-[#00AFF0]">
                          Featured ranking
                        </span>
                      )}
                      Top 10 {page.label} OnlyFans Models
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      )}

      {top10 && (
        <div className="mb-8 max-w-md">
          <Top10Card block={top10} />
        </div>
      )}

      {categoryBrowseHref && (
        <Link
          href={lp(categoryBrowseHref)}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-8 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-[#00AFF0] to-[#00D4FF] px-5 py-3 text-sm font-bold text-white transition-all hover:from-[#009ADB] hover:to-[#00BFE8]"
        >
          Browse all {label} on OnlyFans Search →
        </Link>
      )}

      {creators.length > 0 && (
        <div>
          <h3 className="mb-4 text-sm font-bold text-[#2B1B28]">
            More {label} Creators
            <span className="ml-2 text-base font-normal" style={{ color: COUNT_TEXT }}>
              ({creatorCount})
            </span>
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {creators.map((c) => (
              <OfCreatorCard key={c._id} creator={c} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
