'use client';

import Link from 'next/link';
import BlogCardItem from './BlogCard';
import { EditorialMasthead, EditorialFooter } from './EditorialChrome';
import NewsletterSignup from './NewsletterSignup';
import type { BlogCard } from '@/lib/actions/blog';
import { BLOG_CATEGORIES, BLOG_CATEGORY_MAP } from '@/lib/blog/categories';

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
  activeCategory,
  heading,
  tagline,
}: {
  articles: BlogCard[];
  topArticles?: BlogCard[];
  activeCategory?: string;
  heading: string;
  eyebrow?: string;
  tagline?: string;
}) {
  const cover = articles[0];
  const features = articles.slice(1);
  const coverCat = cover ? BLOG_CATEGORY_MAP[cover.blogCategory] : undefined;

  // Main hub: group the remaining articles by category, max 4 each, in the
  // canonical category order. On category pages we keep the simple flat grid.
  // "The Scene" (adult-entertainment) is hidden from the blog UI per owner —
  // kept in constants only as the routing/default fallback.
  const HIDDEN_BLOG_CATEGORIES = ['adult-entertainment'];
  const visibleCategories = BLOG_CATEGORIES.filter((c) => !HIDDEN_BLOG_CATEGORIES.includes(c.slug));

  const sections = !activeCategory
    ? visibleCategories
        .map((c) => ({
          cat: c,
          items: features.filter((a) => a.blogCategory === c.slug).slice(0, 4),
        }))
        .filter((s) => s.items.length > 0)
    : [];

  // Real counts per category from the loaded set.
  const counts: Record<string, number> = {};
  articles.forEach((a) => { counts[a.blogCategory] = (counts[a.blogCategory] || 0) + 1; });

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
            {activeCategory ? (
              <span>{heading}<span className="text-[#c0392f]">.</span></span>
            ) : (
              <>
                <span>ERO <span className="text-[#c0392f]">Blog</span>.</span>
                <span className="text-[12px] sm:text-[13px] font-semibold tracking-[0.28em] uppercase text-[#9a8f88] whitespace-nowrap">{currentMonthYear}</span>
              </>
            )}
          </h1>
          <p className="text-[15px] text-[#6a6258] mt-5 max-w-xl leading-relaxed">
            {tagline || 'Field reports, long reviews and conversations from inside the adult internet — written by people who actually use the products.'}
          </p>

          {/* Category pills — inline editorial style */}
          <div className="flex flex-wrap items-center gap-x-1 gap-y-2 mt-8">
            {visibleCategories.map((c, i) => {
              const active = activeCategory === c.slug;
              return (
                <span key={c.slug} className="flex items-center">
                  {i > 0 && <span className="text-[#d4cec9] mx-2 select-none text-[13px]">·</span>}
                  <Link
                    href={`/blog/category/${c.slug}`}
                    className={`text-[12px] font-medium tracking-[0.06em] transition-colors ${
                      active
                        ? 'text-[#0f0c0a]'
                        : 'text-[#8a8078] hover:text-[#0f0c0a]'
                    }`}
                  >
                    {c.name}
                    <span className={`ml-1.5 text-[11px] tabular-nums ${active ? 'text-[#c0392f]' : 'text-[#c2bab2]'}`}>
                      {counts[c.slug] || 0}
                    </span>
                  </Link>
                </span>
              );
            })}
          </div>
        </section>

        {/* Must-read — full-width magazine card */}
        {cover && (
          <section className="my-10">
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
                <div className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#c0392f] mb-3">
                  Cover Story · {coverCat?.eyebrow || 'Feature'}
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
                  Read the feature →
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Category page: flat grid */}
        {activeCategory && features.length > 0 && (
          <section className="pt-16 pb-20 border-t border-black/[0.08]">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-10">
              {features.map((a, i) => <BlogCardItem key={a._id} article={a} index={i + 1} />)}
            </div>
          </section>
        )}

        {articles.length === 0 && (
          <p className="text-[#6a6258] text-[15px] py-24 text-center border-t border-black/[0.08]">No articles here yet.</p>
        )}
      </main>

      {/* Hub: full-bleed warm band so white cards pop, one section per category, 4 each */}
      {!activeCategory && sections.length > 0 && (
        <div className="bg-[#f3f0ec] border-t border-black/[0.06]">
          <div className="max-w-[1180px] mx-auto px-6 sm:px-8 py-4">
            {sections.map((s) => (
              <section key={s.cat.slug} className="pt-14 pb-2">
                <div className="flex items-end justify-between gap-6 border-b border-black/[0.09] pb-7 mb-12">
                  <div>
                    <div className="text-[10px] font-bold tracking-[0.32em] uppercase text-[#c0392f] mb-3">{s.cat.eyebrow || 'Section'}</div>
                    <h2 className="font-sans font-black text-[2rem] sm:text-[2.4rem] leading-tight tracking-tight text-[#0f0c0a]">{s.cat.name}</h2>
                  </div>
                  <Link href={`/blog/category/${s.cat.slug}`} className="hidden sm:inline-flex shrink-0 text-[11px] font-semibold tracking-[0.28em] uppercase text-[#9a8f88] hover:text-[#0f0c0a] transition-colors pb-2">View All →</Link>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-7 gap-y-10">
                  {s.items.map((a, i) => <BlogCardItem key={a._id} article={a} index={i + 1} />)}
                </div>
                <div className="sm:hidden mt-8">
                  <Link href={`/blog/category/${s.cat.slug}`} className="inline-flex text-[11px] font-semibold tracking-[0.28em] uppercase text-[#9a8f88] hover:text-[#0f0c0a] transition-colors">View All {s.cat.name} →</Link>
                </div>
              </section>
            ))}
            <div className="pb-16" />
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
