'use client';

import Link from 'next/link';
import BlogCardItem from './BlogCard';
import { EditorialMasthead, EditorialFooter } from './EditorialChrome';
import NewsletterSignup from './NewsletterSignup';
import type { BlogCard } from '@/lib/actions/blog';

const COVER_TINTS = [
  'linear-gradient(135deg, #3a0f1e 0%, #240a14 50%, #0c0508 100%)',
  'linear-gradient(135deg, #2a1606 0%, #1c0e04 55%, #0c0703 100%)',
  'linear-gradient(135deg, #160f2a 0%, #0f0a1c 55%, #07060c 100%)',
];

function monthYear(iso: string | null): string {
  const d = iso ? new Date(iso) : new Date();
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();
}

export default function BlogHubClient({
  articles,
  heading,
  tagline,
}: {
  articles: BlogCard[];
  allArticles?: BlogCard[];
  topArticles?: BlogCard[];
  activeCategory?: string;
  heading: string;
  eyebrow?: string;
  tagline?: string;
}) {
  const cover = articles.find((a) => a.featured) || null;
  const features = cover ? articles.filter((a) => a._id !== cover._id) : articles;
  const coverTag = cover?.tags?.[0] || '';

  const now = new Date();
  const currentMonth = now.toLocaleDateString('en-US', { month: 'long' }).toUpperCase();
  const currentMonthYear = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();

  return (
    <div className="min-h-screen bg-white text-[#0f0c0a]">
      {/* Dark masthead stays dark */}
      <EditorialMasthead />

      <main className="max-w-[1180px] mx-auto px-6 sm:px-8">
        {/* Editorial hero */}
        <section className="pt-12 pb-10">
          <h1 className="font-sans font-black text-[3rem] sm:text-[4rem] leading-[0.95] tracking-tight text-[#0f0c0a] flex flex-wrap items-baseline gap-x-4 gap-y-2">
            <span>ERO <span className="text-[#c0392f]">Blog</span>.</span>
            <span className="text-[12px] sm:text-[13px] font-semibold tracking-[0.28em] uppercase text-[#9a8f88] whitespace-nowrap">{currentMonthYear}</span>
          </h1>
          <p className="text-[15px] text-[#6a6258] mt-5 max-w-xl leading-relaxed">
            {tagline || 'Field reports, long reviews and conversations from inside the adult internet — written by people who actually use the products.'}
          </p>
        </section>

        {/* Must-read — full-width magazine card */}
        {cover && (
          <section className="mt-0 mb-5 sm:mb-8">
            <div className="flex flex-col lg:flex-row rounded-2xl overflow-hidden bg-[#0a0807] text-white shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6)]">
              <Link href={`/blog/${cover.slug}`} className="group block relative lg:w-[62%] shrink-0">
                <div className="relative w-full aspect-[16/10] lg:h-full overflow-hidden" style={{ background: COVER_TINTS[0] }}>
                  {cover.featuredImage && (
                    <img src={cover.featuredImage} alt={cover.title} referrerPolicy="no-referrer"
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1400ms] ease-out group-hover:scale-[1.04]"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  )}
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 55%, rgba(0,0,0,0.45) 100%)' }} />
                  <div className="absolute top-5 left-5 flex items-center gap-2.5">
                    <span className="inline-block w-7 h-px bg-[#c0392f]" />
                    <span className="text-[10px] sm:text-[11px] font-black tracking-[0.28em] uppercase text-[#c0392f]">
                      {currentMonth}&rsquo;s Must Read
                    </span>
                  </div>
                </div>
              </Link>
              <div className="flex flex-col flex-1 justify-center p-7 sm:p-9 lg:p-10">
                <div className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#c0392f] mb-1.5">
                  {coverTag ? `Cover Story · ${coverTag}` : 'Cover Story'}
                </div>
                <Link href={`/blog/${cover.slug}`}>
                  <h2 className="font-sans font-black text-[1.9rem] sm:text-[2.4rem] leading-[1.05] tracking-tight text-white hover:text-[#e8b4ad] transition-colors">
                    {cover.title}
                  </h2>
                </Link>
                {cover.excerpt && (
                  <p className="text-[15px] leading-[1.7] text-white/60 mt-4 line-clamp-3">{cover.excerpt}</p>
                )}
                <div className="flex items-center gap-0 mt-6 text-[10px] tracking-[0.22em] uppercase text-white/45">
                  <span className="text-[#e0796f]">By {cover.authorName}</span>
                  <span className="mx-3">·</span>
                  <span className="tabular-nums">{cover.readMinutes} Min</span>
                  <span className="mx-3">·</span>
                  <span>{monthYear(cover.publishedAt)}</span>
                </div>
                <Link
                  href={`/blog/${cover.slug}`}
                  className="inline-flex items-center gap-2 mt-7 self-start text-[11px] font-bold tracking-[0.24em] uppercase text-[#0a0807] bg-white hover:bg-[#e8b4ad] px-6 py-3 rounded-full transition-colors"
                >
                  read our featured article
                </Link>
              </div>
            </div>
          </section>
        )}

        {articles.length === 0 && (
          <p className="text-[#6a6258] text-[15px] py-24 text-center border-t border-black/[0.08]">No articles here yet.</p>
        )}
      </main>

      {features.length > 0 && (
        <div className="bg-[#f3f0ec] border-t border-black/[0.06]">
          <div className="max-w-[1180px] mx-auto px-6 sm:px-8 py-0">
            <section className="pt-6 sm:pt-10 pb-10 sm:pb-14">
              <div className="border-b border-black/[0.09] pb-3 mb-4">
                <div className="text-[10px] font-bold tracking-[0.32em] uppercase text-[#c0392f] mb-3">Latest</div>
                <h2 className="font-sans font-black text-[2rem] sm:text-[2.4rem] leading-tight tracking-tight text-[#0f0c0a]">All articles</h2>
              </div>
              <div className="flex flex-col gap-4">
                {features.map((a, i) => (
                  <BlogCardItem key={a._id} article={a} index={i + 1} horizontal />
                ))}
              </div>
            </section>
          </div>
        </div>
      )}

      {/* ── Newsletter — full bleed dark band ── */}
      <NewsletterSignup source="blog" />

      <div style={{ background: 'linear-gradient(to bottom, #1e0808 0%, #0a0807 100%)' }}>
        <EditorialFooter />
      </div>
    </div>
  );
}
