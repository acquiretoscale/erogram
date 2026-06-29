'use client';

import Link from 'next/link';
import BlogCardItem from '../blog/BlogCard';
import { EditorialMasthead, EditorialFooter } from '../blog/EditorialChrome';
import NewsletterSignup from '../blog/NewsletterSignup';
import { CoverModelCard, ReaderFavourites } from '../blog/BlogSpotlight';
import HomeAdBlock from './HomeAdBlock';
import { BLOG_CATEGORY_MAP } from '@/lib/blog/categories';
import type { FeedCampaign } from '@/app/groups/types';
import type { BlogCard } from '@/lib/actions/blog';
import type { BlogFeaturedCreatorData } from '@/lib/actions/blogFeatured';
import type { BlogTopAITool } from '@/lib/actions/ainsfw';
import type { BlogTopBot } from '@/lib/actions/botVotes';

const COVER_TINT = 'linear-gradient(135deg, #3a0f1e 0%, #240a14 50%, #0c0508 100%)';

export default function SpotlightClient({
  articles,
  featuredCreator,
  topAINsfw,
  topBots,
  homeBlock1Ads = [],
  homeBlock2Ads = [],
}: {
  articles: BlogCard[];
  featuredCreator: BlogFeaturedCreatorData | null;
  topAINsfw: BlogTopAITool[];
  topBots: BlogTopBot[];
  homeBlock1Ads?: FeedCampaign[];
  homeBlock2Ads?: FeedCampaign[];
}) {
  const cover = articles[0];
  const coverCat = cover ? BLOG_CATEGORY_MAP[cover.blogCategory] : undefined;
  const blogTeaser = articles.slice(0, 4);

  const now = new Date();
  const currentMonth = now.toLocaleDateString('en-US', { month: 'long' }).toUpperCase();
  const currentMonthYear = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();

  // ── TEST PALETTE v2 (home page only) — plum buttons + off-white button typo ──
  const CREAM = '#F7F4EC';   // page background (v1 cream)
  const PLUM = '#2B1B28';    // button bg + primary dark typo (from owner example)
  const INK = '#FDFDFD';     // button / on-plum typo color
  const MUTED = '#6B6568';   // secondary body on cream
  return (
    <div className="min-h-screen font-[family-name:var(--font-baloo)]" style={{ backgroundColor: CREAM, color: PLUM }}>
      <EditorialMasthead />

      <main className="max-w-[1180px] mx-auto px-6 sm:px-8">
        {/* Hero */}
        <section className="pt-12 pb-8">
          <h1 className="font-[family-name:var(--font-baloo)] font-extrabold text-[3rem] sm:text-[4rem] leading-[0.95] tracking-tight flex flex-wrap items-baseline gap-x-4 gap-y-2" style={{ color: PLUM }}>
            <span>TRENDING ON <span style={{ color: PLUM }}>EROGRAM</span>.</span>
            <span className="text-[12px] sm:text-[13px] font-semibold tracking-[0.28em] uppercase whitespace-nowrap" style={{ color: MUTED }}>{currentMonthYear}</span>
          </h1>
        </section>

        {/* Top row: Must-read (vertical) + Erogram Cover model */}
        {cover && (
          <section className="mb-8 grid grid-cols-1 lg:grid-cols-[1.25fr_1fr] gap-6 items-stretch">
            <div className="flex flex-col rounded-2xl overflow-hidden border shadow-[0_30px_80px_-30px_rgba(43,27,40,0.2)]" style={{ backgroundColor: CREAM, color: PLUM, borderColor: 'rgba(43,27,40,0.12)' }}>
              <Link href={`/blog/${cover.slug}`} className="group block relative">
                <div className="relative w-full aspect-[16/10] overflow-hidden" style={{ background: COVER_TINT }}>
                  {cover.featuredImage && (
                    <img src={cover.featuredImage} alt={cover.title} referrerPolicy="no-referrer"
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1400ms] ease-out group-hover:scale-[1.04]"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  )}
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 55%, rgba(0,0,0,0.45) 100%)' }} />
                  <div className="absolute top-5 left-5 flex items-center gap-2.5">
                    <span className="inline-block w-7 h-px" style={{ backgroundColor: INK }} />
                    <span className="text-[10px] sm:text-[11px] font-black tracking-[0.28em] uppercase" style={{ color: INK }}>{currentMonth}&rsquo;s Must Read</span>
                  </div>
                </div>
              </Link>
              <div className="flex flex-col flex-1 p-7 sm:p-9">
                <div className="text-[10px] font-bold tracking-[0.3em] uppercase mb-3" style={{ color: PLUM }}>Cover Story · {coverCat?.eyebrow || 'Feature'}</div>
                <Link href={`/blog/${cover.slug}`}>
                  <h2 className="font-[family-name:var(--font-baloo)] font-extrabold text-[1.9rem] sm:text-[2.4rem] leading-[1.05] tracking-tight transition-colors" style={{ color: PLUM }}>{cover.title}</h2>
                </Link>
                {cover.excerpt && <p className="text-[15px] leading-[1.7] mt-4 line-clamp-3" style={{ color: MUTED }}>{cover.excerpt}</p>}
                <div className="flex items-center gap-0 mt-6 text-[10px] tracking-[0.22em] uppercase" style={{ color: MUTED }}>
                  <span style={{ color: PLUM }}>By {cover.authorName}</span>
                  <span className="mx-3">·</span>
                  <span className="tabular-nums">{cover.readMinutes} Min</span>
                </div>
                <Link href={`/blog/${cover.slug}`} className="inline-flex items-center gap-2 mt-7 self-start text-[11px] font-bold tracking-[0.24em] uppercase rounded-full px-6 py-3 transition-opacity hover:opacity-90" style={{ color: INK, backgroundColor: PLUM }}>Read the feature →</Link>
              </div>
            </div>

            {featuredCreator && <CoverModelCard featuredCreator={featuredCreator} />}
          </section>
        )}

        {/* TRENDING Adspace 1 — between the cover/Creator-of-the-Month and Reader Favourites */}
        <HomeAdBlock ads={homeBlock1Ads} placement="home-block-1" />

        {/* Reader favourites — Top 5 AI NSFW + Top 5 Telegram Bots */}
        <ReaderFavourites topAINsfw={topAINsfw} topBots={topBots} />

        {/* From Erogram Blog — teaser into the full blog */}
        {blogTeaser.length > 0 && (
          <section className="pt-16 pb-20 border-t mt-4" style={{ borderColor: 'rgba(43,27,40,0.12)' }}>
            <div className="flex items-end justify-between gap-6 border-b pb-7 mb-12" style={{ borderColor: 'rgba(43,27,40,0.14)' }}>
              <div>
                <div className="text-[10px] font-bold tracking-[0.32em] uppercase mb-3" style={{ color: PLUM }}>Latest Reads</div>
                <h2 className="font-[family-name:var(--font-baloo)] font-extrabold text-[2rem] sm:text-[2.4rem] leading-tight tracking-tight" style={{ color: PLUM }}>From the Erogram Blog</h2>
              </div>
              <Link href="/blog" className="hidden sm:inline-flex shrink-0 text-[11px] font-semibold tracking-[0.28em] uppercase transition-colors pb-2" style={{ color: MUTED }}>Read the Blog →</Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-7 gap-y-10">
              {blogTeaser.map((a, i) => <BlogCardItem key={a._id} article={a} index={i + 1} />)}
            </div>
            <div className="mt-10 text-center">
              <Link href="/blog" className="inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.24em] uppercase rounded-full px-8 py-4 transition-opacity hover:opacity-90" style={{ color: INK, backgroundColor: PLUM }}>Explore the full Blog →</Link>
            </div>
          </section>
        )}
      </main>

      <NewsletterSignup source="spotlight" />

      {/* TRENDING Adspace 2 — below the newsletter */}
      <div className="max-w-[1180px] mx-auto px-6 sm:px-8">
        <HomeAdBlock ads={homeBlock2Ads} placement="home-block-2" />
      </div>

      <div style={{ background: 'linear-gradient(to bottom, #3d2538 0%, #2B1B28 100%)' }}>
        <EditorialFooter />
      </div>
    </div>
  );
}
