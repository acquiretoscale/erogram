'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import HeaderBanner from '@/components/HeaderBanner';
import Footer from '@/components/Footer';
import ToolCard from './ToolCard';
import type { AINsfwTool, AINsfwCategory, PaymentOption } from './types';
import { AINSFW_CATEGORIES, ALL_PAYMENT_OPTIONS } from './types';
import { useTranslation } from '@/lib/i18n';
import type { ToolStatsData } from '@/lib/actions/ainsfw';

const INITIAL_LOAD = 12;
const LOAD_MORE = 8;

interface AINsfwClientProps {
  tools: AINsfwTool[];
  allStats?: Record<string, ToolStatsData>;
  featuredSlugs?: string[];
  featuredCampaignMap?: Record<string, string>;
  topBannerCampaigns?: Array<{ _id: string; creative: string; destinationUrl: string; bannerDevice?: string }>;
}

const CATEGORY_ACTIVE: Record<AINsfwCategory, string> = {
  All: 'bg-black text-white border-black shadow-[2px_2px_0_#555]',
  'AI Girlfriend': 'bg-blue-700 text-white border-black shadow-[2px_2px_0_#000]',
  'Undress AI': 'bg-slate-700 text-white border-black shadow-[2px_2px_0_#000]',
  'AI Chat': 'bg-emerald-700 text-white border-black shadow-[2px_2px_0_#000]',
  'AI Image': 'bg-amber-600 text-white border-black shadow-[2px_2px_0_#000]',
  'AI Roleplay': 'bg-zinc-800 text-white border-black shadow-[2px_2px_0_#000]',
};

const PAYMENT_ICON: Record<string, string> = {
  'Credit Cards': '💳',
  'Crypto': '₿',
  'PayPal': 'P',
};

function ToolCardSkeleton() {
  return (
    <div className="bg-white rounded-xl overflow-hidden h-full flex flex-col border-2 border-black/10 animate-pulse">
      <div className="w-full h-32 sm:h-36 bg-gray-200" />
      <div className="p-2.5 sm:p-3 flex-grow flex flex-col">
        <div className="h-4 bg-gray-200 rounded mb-2 w-3/4" />
        <div className="h-3 bg-gray-100 rounded mb-2 w-1/2" />
        <div className="space-y-1.5 mb-3 flex-grow">
          <div className="h-3 bg-gray-100 rounded" />
          <div className="h-3 bg-gray-100 rounded w-5/6" />
        </div>
        <div className="h-7 bg-gray-200 rounded border-2 border-gray-200" />
      </div>
    </div>
  );
}

function getScore(slug: string, scores: Record<string, number>): number {
  return scores[slug] ?? 0;
}

function loadAllScores(allStats?: Record<string, ToolStatsData>): Record<string, number> {
  const map: Record<string, number> = {};
  if (allStats) {
    for (const [slug, stats] of Object.entries(allStats)) {
      map[slug] = (stats.upvotes ?? 0) - (stats.downvotes ?? 0);
    }
  }
  return map;
}

function TopAINsfwBlock({ tools, allStats, scores, featuredSlugs, featuredCampaignMap, onVoteChange }: { tools: AINsfwTool[]; allStats?: Record<string, ToolStatsData>; scores: Record<string, number>; featuredSlugs: string[]; featuredCampaignMap: Record<string, string>; onVoteChange: (slug: string, score: number) => void }) {
  const { t } = useTranslation();
  const featuredSet = new Set(featuredSlugs);

  const scoreSorted = [...tools]
    .filter((tool) => (scores[tool.slug] ?? 0) > 0)
    .sort((a, b) => (scores[b.slug] ?? 0) - (scores[a.slug] ?? 0));

  // Build top 4: first 3 by score, 4th slot reserved for a featured tool
  const top3 = scoreSorted.filter((t) => !featuredSet.has(t.slug)).slice(0, 3);
  const featuredTool = tools.find((t) => featuredSet.has(t.slug));

  const topTools = featuredTool
    ? [...top3, featuredTool].slice(0, 4)
    : scoreSorted.slice(0, 4);

  if (topTools.length === 0) return null;

  return (
    <section className="mb-10 sm:mb-14">
      <div className="bg-white rounded-2xl border-2 border-black shadow-[4px_4px_0_#000] p-4 sm:p-5">
        <div className="flex items-center justify-between mb-4 sm:mb-5">
          <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-black">{t('ainsfw.topTitle')}</h2>
          <span className="text-[10px] sm:text-xs font-black bg-blue-700 text-white border-2 border-black rounded px-2 py-0.5 shadow-[2px_2px_0_#000]">
            {t('ainsfw.topBadge')}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {topTools.map((tool, i) => (
            <ToolCard key={tool.slug} tool={tool} index={i} initialStats={allStats?.[tool.slug]} onVoteChange={onVoteChange} featured={featuredSet.has(tool.slug)} campaignId={featuredCampaignMap[tool.slug]} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default function AINsfwClient({ tools, allStats, featuredSlugs = [], featuredCampaignMap = {}, topBannerCampaigns = [] }: AINsfwClientProps) {
  const [activeCategory, setActiveCategory] = useState<AINsfwCategory>('All');
  const [activePayment, setActivePayment] = useState<PaymentOption | 'All'>('All');
  const [search, setSearch] = useState('');
  const [scores, setScores] = useState<Record<string, number>>({});
  const [visibleCount, setVisibleCount] = useState(INITIAL_LOAD);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  useEffect(() => {
    setScores(loadAllScores(allStats));
  }, [allStats]);

  const handleVoteChange = useCallback((slug: string, score: number) => {
    setScores((prev) => ({ ...prev, [slug]: score }));
  }, []);

  const filtered = tools
    .filter((t) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.vendor.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    })
    .filter((t) => activeCategory === 'All' || t.category === activeCategory)
    .filter((t) => activePayment === 'All' || t.payment.includes(activePayment))
    .slice()
    .sort((a, b) => getScore(b.slug, scores) - getScore(a.slug, scores));

  const hasMore = visibleCount < filtered.length;
  const displayed = filtered.slice(0, visibleCount);

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(INITIAL_LOAD);
  }, [activeCategory, activePayment, search]);

  // Infinite scroll — load more when sentinel enters viewport
  useEffect(() => {
    if (!loadMoreRef.current || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading && hasMore) {
          setLoading(true);
          setTimeout(() => {
            setVisibleCount((prev) => Math.min(prev + LOAD_MORE, filtered.length));
            setLoading(false);
          }, 600);
        }
      },
      { rootMargin: '400px', threshold: 0.01 }
    );
    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading, filtered.length]);

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-24 sm:pt-28 pb-8">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10 sm:mb-12"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-600/15 border border-blue-500/25 text-blue-300 text-xs font-bold uppercase tracking-widest mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            Curated &amp; Reviewed
          </div>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white mb-4 leading-tight">
            {t('ainsfw.heroTitle', 'Best AI NSFW Tools').split('AI NSFW')[0]}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-sky-400 to-emerald-400">AI NSFW</span>
            {t('ainsfw.heroTitle', 'Best AI NSFW Tools').split('AI NSFW')[1]}
          </h1>
          <p className="text-white/40 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            {t('ainsfw.heroSubtitle')}
          </p>
        </motion.div>

        {topBannerCampaigns.length > 0 && (
          <div className="w-full mb-6">
            <HeaderBanner campaigns={topBannerCampaigns} />
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* Mobile: Filter toggle */}
          <div className="lg:hidden">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="w-full px-4 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 text-white shadow-lg shadow-blue-900/30"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></svg>
              {showFilters ? 'Hide Filters' : 'Filter Tools'}
            </button>
          </div>

          {/* Sidebar Filters */}
          <aside className={`${showFilters ? 'block' : 'hidden'} lg:block lg:w-1/4 min-w-0 shrink-0`}>
            <div className="rounded-2xl border border-white/[0.08] bg-[#111]/80 backdrop-blur-lg overflow-hidden">
              {/* Sidebar header */}
              <div className="px-5 py-4 border-b border-white/[0.06] bg-gradient-to-r from-blue-600/20 to-sky-500/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-sky-500 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></svg>
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-white leading-none">Filter Tools</h2>
                    <p className="text-[11px] text-white/40 mt-0.5">Find the perfect AI</p>
                  </div>
                </div>
              </div>

              <div className="p-5 space-y-5">
                {/* Category */}
                <div>
                  <label className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-white/40 mb-2">
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h8v8H3zm10 0h8v8h-8zM3 13h8v8H3zm10 0h8v8h-8z"/></svg>
                    Category
                  </label>
                  <select
                    value={activeCategory}
                    onChange={(e) => setActiveCategory(e.target.value as AINsfwCategory)}
                    className="w-full px-3 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.10] text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/40 transition-all appearance-none cursor-pointer"
                  >
                    {AINSFW_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat} className="bg-[#1a1a1a]">{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Payment */}
                <div>
                  <label className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-white/40 mb-2">
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="1" y="4" width="22" height="16" rx="2"/><path d="M1 10h22"/></svg>
                    Payment
                  </label>
                  <select
                    value={activePayment}
                    onChange={(e) => setActivePayment(e.target.value as PaymentOption | 'All')}
                    className="w-full px-3 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.10] text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/40 transition-all appearance-none cursor-pointer"
                  >
                    <option value="All" className="bg-[#1a1a1a]">All Payments</option>
                    {ALL_PAYMENT_OPTIONS.map((pay) => (
                      <option key={pay} value={pay} className="bg-[#1a1a1a]">{pay}</option>
                    ))}
                  </select>
                </div>

                {/* Search */}
                <div>
                  <label className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-white/40 mb-2">
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                    Search
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search by name..."
                      className="w-full pl-3 pr-8 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.10] text-white text-sm placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/40 transition-all"
                    />
                    {search && (
                      <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors">
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                      </button>
                    )}
                  </div>
                </div>

                {/* Active filter badges */}
                {(activeCategory !== 'All' || activePayment !== 'All' || search) && (
                  <div className="flex flex-wrap gap-1.5">
                    {activeCategory !== 'All' && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-300 text-[11px] font-semibold">
                        {activeCategory}
                        <button onClick={() => setActiveCategory('All')} className="hover:text-white transition-colors"><svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
                      </span>
                    )}
                    {activePayment !== 'All' && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-sky-600/20 border border-sky-500/30 text-sky-300 text-[11px] font-semibold">
                        {activePayment}
                        <button onClick={() => setActivePayment('All')} className="hover:text-white transition-colors"><svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
                      </span>
                    )}
                    {search && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold">
                        &ldquo;{search}&rdquo;
                        <button onClick={() => setSearch('')} className="hover:text-white transition-colors"><svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
                      </span>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-col gap-2 pt-1">
                  <button
                    onClick={() => { setShowFilters(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className="w-full py-2.5 rounded-xl font-bold text-sm transition-all bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 text-white shadow-md shadow-blue-900/30"
                  >
                    {activeCategory !== 'All' || activePayment !== 'All' || search ? 'Apply Filters' : 'Show All'}
                  </button>
                  {(activeCategory !== 'All' || activePayment !== 'All' || search) && (
                    <button
                      onClick={() => { setActiveCategory('All'); setActivePayment('All'); setSearch(''); }}
                      className="w-full py-2.5 rounded-xl font-bold text-sm text-white/40 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] transition-all"
                    >
                      Reset All
                    </button>
                  )}
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <div className="lg:w-3/4 min-w-0 shrink-0">
            {/* Top AI NSFW Block */}
            <TopAINsfwBlock tools={tools} allStats={allStats} scores={scores} featuredSlugs={featuredSlugs} featuredCampaignMap={featuredCampaignMap} onVoteChange={handleVoteChange} />

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3">
              {(() => {
                const featuredTools = tools.filter((t) => featuredSlugs.includes(t.slug));
                const displayedSet = new Set(displayed.map((t) => t.slug));
                const items: React.ReactNode[] = [];
                let featuredIdx = 0;

                displayed.forEach((tool, i) => {
                  if (i > 0 && i % 8 === 0 && featuredTools.length > 0) {
                    const ft = featuredTools[featuredIdx % featuredTools.length];
                    if (!displayedSet.has(ft.slug) || featuredSlugs.includes(ft.slug)) {
                      items.push(
                        <ToolCard key={`featured-${i}-${ft.slug}`} tool={ft} index={i} initialStats={allStats?.[ft.slug]} onVoteChange={handleVoteChange} featured campaignId={featuredCampaignMap[ft.slug]} />
                      );
                      featuredIdx++;
                    }
                  }
                  items.push(
                    <ToolCard key={tool.slug} tool={tool} index={i} initialStats={allStats?.[tool.slug]} onVoteChange={handleVoteChange} featured={featuredSlugs.includes(tool.slug)} campaignId={featuredCampaignMap[tool.slug]} />
                  );
                });

                return items;
              })()}
            </div>

            {/* Skeleton loading placeholders */}
            {(loading || hasMore) && (
              <>
                {loading && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3 mt-3">
                    {Array.from({ length: LOAD_MORE }, (_, i) => (
                      <ToolCardSkeleton key={`skeleton-${i}`} />
                    ))}
                  </div>
                )}
                <div ref={loadMoreRef} className="h-4" />
              </>
            )}

            {filtered.length === 0 && (
              <div className="text-center py-20">
                <p className="text-gray-500 text-sm">{t('ainsfw.noResults')}</p>
              </div>
            )}
          </div>
        </div>

        {/* SEO Content Block */}
        <section className="mt-16 sm:mt-24 max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl border-2 border-black shadow-[4px_4px_0_#000] p-5 sm:p-7">
            <h2 className="text-2xl sm:text-3xl font-black text-black mb-2 text-center">{t('ainsfw.guideTitle')}</h2>
            <p className="text-center text-gray-600 text-sm sm:text-base mb-6">{t('ainsfw.guideSubtitle')}</p>

            <div className="text-gray-700 text-sm sm:text-base leading-relaxed space-y-4 text-left">
              <h3 className="text-black font-bold text-lg">{t('ainsfw.guideWelcomeH')}</h3>
              <p>{t('ainsfw.guideWelcomeP')}</p>

              <h3 className="text-black font-bold text-lg pt-2">{t('ainsfw.guideExploreH')}</h3>
              <p>{t('ainsfw.guideExploreP')}</p>

              <h3 className="text-black font-bold text-lg pt-2">{t('ainsfw.guideGfH')}</h3>
              <p>{t('ainsfw.guideGfP')}</p>

              <h3 className="text-black font-bold text-lg pt-2">{t('ainsfw.guideUndressH')}</h3>
              <p>{t('ainsfw.guideUndressP')}</p>

              <h3 className="text-black font-bold text-lg pt-2">{t('ainsfw.guideChatH')}</h3>
              <p>{t('ainsfw.guideChatP')}</p>

              <h3 className="text-black font-bold text-lg pt-2">{t('ainsfw.guideImageH')}</h3>
              <p>{t('ainsfw.guideImageP')}</p>

              <h3 className="text-black font-bold text-lg pt-2">{t('ainsfw.guideRpH')}</h3>
              <p>{t('ainsfw.guideRpP')}</p>

              <h3 className="text-black font-bold text-lg pt-2">{t('ainsfw.guidePicksH')}</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li><span className="font-bold">DreamGF</span>: {t('ainsfw.guidePick1')}</li>
                <li><span className="font-bold">Clothoff.net</span>: {t('ainsfw.guidePick2')}</li>
                <li><span className="font-bold">SpicyChat</span>: {t('ainsfw.guidePick3')}</li>
              </ul>

              <h3 className="text-black font-bold text-lg pt-2">{t('ainsfw.guideAboutH')}</h3>
              <p>{t('ainsfw.guideAboutP')}</p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="mt-12 sm:mt-16 max-w-4xl mx-auto">
          <h2 className="text-xl sm:text-2xl font-black text-white mb-6 text-center">{t('ainsfw.faqTitle')}</h2>
          <div className="space-y-4">
            {[
              { q: t('ainsfw.faqQ1'), a: t('ainsfw.faqA1') },
              { q: t('ainsfw.faqQ2'), a: t('ainsfw.faqA2') },
              { q: t('ainsfw.faqQ3'), a: t('ainsfw.faqA3') },
              { q: t('ainsfw.faqQ4'), a: t('ainsfw.faqA4') },
            ].map((faq) => (
              <details key={faq.q} className="group bg-white rounded-xl border-2 border-black shadow-[3px_3px_0_#000] overflow-hidden">
                <summary className="flex items-center justify-between cursor-pointer px-5 py-4 text-black font-semibold text-sm sm:text-base">
                  {faq.q}
                  <svg className="w-4 h-4 text-gray-500 transition-transform group-open:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
                </summary>
                <p className="px-5 pb-4 text-gray-700 text-sm leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
}
