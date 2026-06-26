'use client';

import Link from 'next/link';
import type { BlogFeaturedCreatorData } from '@/lib/actions/blogFeatured';
import { trackBlogFeaturedClick } from '@/lib/actions/blogFeatured';
import type { BlogTopAITool } from '@/lib/actions/ainsfw';
import type { BlogTopBot } from '@/lib/actions/botVotes';

function fmtVotes(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

/** OnlyFans brandmark — the same logo used in the OFsearch nav. */
function OnlyFansBadge() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="#00AFF0" aria-label="OnlyFans" className="shrink-0">
      <path d="M24 4.003h-4.015c-3.45 0-5.3.197-6.748 1.957a7.996 7.996 0 1 0 2.103 9.211c3.182-.231 5.39-2.134 6.085-5.173c0 0-2.399.585-4.43 0c4.018-.777 6.333-3.037 7.005-5.995M5.61 11.999A2.391 2.391 0 0 1 9.28 9.97a2.966 2.966 0 0 1 2.998-2.528h.008c-.92 1.778-1.407 3.352-1.998 5.263A2.392 2.392 0 0 1 5.61 12Zm2.386-7.996a7.996 7.996 0 1 0 7.996 7.996a7.996 7.996 0 0 0-7.996-7.996m0 10.394A2.399 2.399 0 1 1 10.395 12a2.396 2.396 0 0 1-2.399 2.398Z"/>
    </svg>
  );
}

type RankItem = { slug: string; name: string; category?: string; image: string; upvotes: number };

function RankList({
  eyebrow,
  title,
  href,
  items,
}: {
  eyebrow: string;
  title: string;
  href: string;
  items: RankItem[];
}) {
  return (
    <div className="rounded-2xl bg-[#0c0a09] ring-1 ring-white/[0.06] p-6 sm:p-7 flex flex-col shadow-[0_24px_60px_-34px_rgba(0,0,0,0.7)]">
      <div className="flex items-end justify-between gap-3 mb-4">
        <div>
          <div className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#c0392f] mb-2">{eyebrow}</div>
          <h3 className="font-sans font-black text-[1.45rem] sm:text-[1.6rem] leading-tight tracking-tight text-white">{title}</h3>
        </div>
        <Link href={href} className="shrink-0 text-[11px] font-semibold tracking-[0.24em] uppercase text-white/40 hover:text-white transition-colors pb-1">All →</Link>
      </div>
      <ol className="flex flex-col divide-y divide-white/[0.06] -my-1">
        {items.map((item, i) => (
          <li key={item.slug}>
            <Link href={`/${item.slug}`} className="group flex items-center gap-4 py-3">
              <span className="w-5 shrink-0 font-sans font-black text-[18px] tabular-nums text-white/25 group-hover:text-[#c0392f] transition-colors">{i + 1}</span>
              <span className="relative w-14 h-14 shrink-0 rounded-xl overflow-hidden bg-[#1a1410] ring-1 ring-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.image} alt={item.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" referrerPolicy="no-referrer" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block font-sans font-bold text-[15px] text-white truncate group-hover:text-[#e8b4ad] transition-colors">{item.name}</span>
                {item.category && <span className="block text-[12px] text-white/40 truncate">{item.category}</span>}
              </span>
              {/* Stock-style green up-tick */}
              <span className="flex items-center gap-1.5 shrink-0 rounded-full px-2.5 py-1" style={{ background: 'rgba(34,197,94,0.12)', color: '#4ade80' }} title={`${item.upvotes} upvotes`}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
                </svg>
                <span className="font-sans font-black text-[14px] tabular-nums">{fmtVotes(item.upvotes)}</span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** The Erogram Cover model card — usable standalone in the top row. */
export function CoverModelCard({ featuredCreator }: { featuredCreator: BlogFeaturedCreatorData | null }) {
  if (!featuredCreator) return null;
  const dest =
    featuredCreator.destinationUrl ||
    (featuredCreator.username ? `/${featuredCreator.username}-onlyfans` : '/onlyfanssearch');
  const cover = featuredCreator.coverImage || featuredCreator.avatar || '';

  return (
    <a
      href={dest}
      target={dest.startsWith('http') ? '_blank' : undefined}
      rel={dest.startsWith('http') ? 'noopener noreferrer' : undefined}
      onClick={() => { void trackBlogFeaturedClick(featuredCreator._id); }}
      className="group relative block overflow-hidden rounded-2xl aspect-[3/4] lg:aspect-auto lg:min-h-[420px] lg:h-full"
      style={{ background: '#0a0807' }}
    >
      {cover && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={cover}
          alt={featuredCreator.name}
          className="absolute inset-0 w-full h-full object-cover object-top opacity-90 transition-transform duration-[1600ms] ease-out group-hover:scale-[1.05]"
          referrerPolicy="no-referrer"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      )}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(5,3,2,0.96) 8%, rgba(5,3,2,0.55) 42%, rgba(5,3,2,0.15) 70%, transparent 100%)' }} />

      <div className="absolute top-6 left-6 flex items-center gap-2">
        <span className="inline-block w-7 h-px" style={{ background: 'linear-gradient(90deg,#e8c873,#b8924a)' }} />
        <span className="text-[11px] sm:text-[12px] font-black tracking-[0.3em] uppercase" style={{ color: '#e8c873' }}>
          Erogram Cover
        </span>
      </div>
      {featuredCreator.monthLabel && (
        <span className="absolute top-6 right-6 text-[10px] tracking-[0.28em] uppercase text-white/55">
          {featuredCreator.monthLabel}
        </span>
      )}

      <div className="absolute inset-x-0 bottom-0 p-7 sm:p-9">
        <div className="text-[10px] font-bold tracking-[0.3em] uppercase mb-3" style={{ color: '#e8c873' }}>
          Creator of the Month
        </div>
        <h3 className="font-sans font-black text-[2.2rem] sm:text-[2.8rem] leading-[1.0] tracking-tight text-white">
          {featuredCreator.name}
        </h3>
        {featuredCreator.username && (
          <div className="text-[13px] text-white/55 mt-1.5">@{featuredCreator.username}</div>
        )}
        <span className="inline-flex items-center gap-2.5 mt-7 text-[12px] font-black tracking-[0.16em] uppercase px-6 py-3.5 rounded-full text-[#0a0807] bg-white hover:bg-[#f1f1f1] transition-all group-hover:translate-x-1 shadow-[0_10px_34px_-10px_rgba(0,0,0,0.7)]">
          <OnlyFansBadge />
          Visit the profile
        </span>
      </div>

      <span className="absolute bottom-3 right-4 text-[9px] tracking-[0.22em] uppercase text-white/30">Featured Creator</span>
    </a>
  );
}

/** Reader favourites — Top 5 AI NSFW + Top 5 Telegram Bots, side by side. */
export function ReaderFavourites({ topAINsfw, topBots = [] }: { topAINsfw: BlogTopAITool[]; topBots?: BlogTopBot[] }) {
  if (topAINsfw.length === 0 && topBots.length === 0) return null;
  return (
    <section className="my-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
      {topAINsfw.length > 0 && (
        <RankList
          eyebrow="Reader Favourites"
          title="Top 5 AI NSFW"
          href="/ainsfw"
          items={topAINsfw.map((t) => ({ slug: t.slug, name: t.name, category: t.category, image: t.image, upvotes: t.upvotes }))}
        />
      )}
      {topBots.length > 0 && (
        <RankList
          eyebrow="Most Upvoted"
          title="Top 5 Telegram Bots"
          href="/bots"
          items={topBots.map((b) => ({ slug: b.slug, name: b.name, image: b.image, upvotes: b.upvotes }))}
        />
      )}
    </section>
  );
}

