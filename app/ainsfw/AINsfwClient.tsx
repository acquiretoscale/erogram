'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import HeaderBanner from '@/components/HeaderBanner';
import Footer from '@/components/Footer';
import ToolCard from './ToolCard';
import AdvertCard from '../groups/AdvertCard';
import type { FeedCampaign } from '../groups/types';
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
  topBannerCampaigns?: Array<{ _id: string; creative: string; destinationUrl: string; bannerDevice?: 'all' | 'mobile' | 'desktop' }>;
  /** Generic ads assigned to the 'ainsfw-featured' placement — rendered as cards in the Top AI NSFW grid. */
  topAdCampaigns?: FeedCampaign[];
  /** In-feed ads (feedPlacement 'ainsfw' or 'both') — interleaved into the main tool grid like Groups/Bots. */
  feedCampaigns?: FeedCampaign[];
}

const CATEGORY_ACTIVE: Record<AINsfwCategory, string> = {
  All: 'bg-white text-black',
  'AI Girlfriend': 'bg-[#22c55e] text-black',
  'Undress AI': 'bg-[#22c55e] text-black',
  'AI Chat': 'bg-[#22c55e] text-black',
  'AI Image': 'bg-[#22c55e] text-black',
  'AI Roleplay': 'bg-[#22c55e] text-black',
};

const PAYMENT_ICON: Record<string, string> = {
  'Credit Cards': '💳',
  'Crypto': '₿',
  'PayPal': 'P',
};

function ToolCardSkeleton() {
  return (
    <div className="bg-[#111] rounded-xl overflow-hidden h-full flex flex-col border border-white/10 animate-pulse">
      <div className="w-full h-32 sm:h-36 bg-[#1a1a1a]" />
      <div className="p-2.5 sm:p-3 flex-grow flex flex-col">
        <div className="h-4 bg-white/10 rounded mb-2 w-3/4" />
        <div className="h-3 bg-white/5 rounded mb-2 w-1/2" />
        <div className="space-y-1.5 mb-3 flex-grow">
          <div className="h-3 bg-white/5 rounded" />
          <div className="h-3 bg-white/5 rounded w-5/6" />
        </div>
        <div className="h-7 bg-white/10 rounded" />
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

function TopAINsfwBlock({ tools, allStats, scores, featuredSlugs, featuredCampaignMap, topAdCampaigns, onVoteChange }: { tools: AINsfwTool[]; allStats?: Record<string, ToolStatsData>; scores: Record<string, number>; featuredSlugs: string[]; featuredCampaignMap: Record<string, string>; topAdCampaigns: FeedCampaign[]; onVoteChange: (slug: string, score: number) => void }) {
  const { t } = useTranslation();
  const featuredSet = new Set(featuredSlugs);

  const scoreSorted = [...tools]
    .filter((tool) => (scores[tool.slug] ?? 0) > 0)
    .sort((a, b) => (scores[b.slug] ?? 0) - (scores[a.slug] ?? 0));

  const allFeatured = tools.filter((t) => featuredSet.has(t.slug));
  const nonFeaturedByScore = scoreSorted.filter((t) => !featuredSet.has(t.slug));
  // Assigned generic ads take the first spots; tools fill the remaining ones (4 total).
  // Dedupe by id so the same ad never appears twice in the Top AI NSFW grid at once.
  const seenAdIds = new Set<string>();
  const ads = topAdCampaigns.filter((c) => (seenAdIds.has(c._id) ? false : (seenAdIds.add(c._id), true))).slice(0, 4);
  const topTools = [...allFeatured, ...nonFeaturedByScore].slice(0, Math.max(0, 4 - ads.length));

  if (topTools.length === 0 && ads.length === 0) return null;

  return (
    <section className="mb-10 sm:mb-14">
      <div className="bg-white rounded-2xl border border-black/10 p-4 sm:p-5">
        <div className="flex items-center justify-between mb-4 sm:mb-5">
          <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-black">{t('ainsfw.topTitle')}</h2>
          <span className="text-[10px] sm:text-xs font-black bg-[#22c55e] text-black rounded px-2 py-0.5">
            {t('ainsfw.topBadge')}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {ads.map((c, i) => (
            // Dark-blue cell so the translucent AdvertCard ("glass") is readable inside the white block,
            // and sized to fill the cell like a ToolCard.
            <div key={`ainsfw-ad-${c._id}`} className="h-full rounded-xl overflow-hidden bg-[#0a0a0a] border border-white/10 [&>*]:h-full">
              <AdvertCard campaign={c} isIndex={i} placementOverride="ainsfw-featured" />
            </div>
          ))}
          {topTools.map((tool, i) => (
            <ToolCard key={tool.slug} tool={tool} index={ads.length + i} initialStats={allStats?.[tool.slug]} onVoteChange={onVoteChange} featured={featuredSet.has(tool.slug)} campaignId={featuredCampaignMap[tool.slug]} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default function AINsfwClient({ tools, allStats, featuredSlugs = [], featuredCampaignMap = {}, topBannerCampaigns = [], topAdCampaigns = [], feedCampaigns = [] }: AINsfwClientProps) {
  const [activeCategory, setActiveCategory] = useState<AINsfwCategory>('All');
  const [activePayment, setActivePayment] = useState<PaymentOption | 'All'>('All');
  const [search, setSearch] = useState('');
  const [scores, setScores] = useState<Record<string, number>>({});
  const [visibleCount, setVisibleCount] = useState(INITIAL_LOAD);
  const [loading, setLoading] = useState(false);
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
    <div className="ainsfw-page ainsfw-bg min-h-screen text-white">
      <Navbar />

      <div className="max-w-6xl mx-auto px-5 sm:px-8 lg:px-12 pt-24 sm:pt-28 pb-8">
        {/* Hero — same content, futuristic condensed italic scanline design treatment */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8 sm:mb-10"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#22c55e]/10 border border-[#22c55e]/30 text-[#22c55e] text-xs font-bold uppercase tracking-[2px] mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
            Curated &amp; Reviewed
          </div>
          <h1 className="ainsfw-hero-title text-[44px] sm:text-[64px] md:text-[76px] mb-4">
            {t('ainsfw.heroTitle', 'Best AI NSFW Tools')}
          </h1>
          <p className="text-white/50 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            {t('ainsfw.heroSubtitle')}
          </p>
        </motion.div>

        {topBannerCampaigns.length > 0 && (
          <div className="w-full mb-6">
            <HeaderBanner campaigns={topBannerCampaigns} />
          </div>
        )}

        {/* Compact, centered filter bar: category pills + accepted payment + search (right). */}
        <div id="ainsfw-tools" className="mb-6 sm:mb-8 scroll-mt-24">
          <div className="flex flex-wrap items-center justify-center gap-2">
            {/* Category pills */}
            {AINSFW_CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat;
              const label = cat === 'All' ? 'View All' : cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  aria-pressed={isActive}
                  className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                    isActive
                      ? 'bg-[#22c55e] text-black border-[#22c55e]'
                      : 'bg-[#0a1f12] text-white/70 border-[#22c55e]/20 hover:border-[#22c55e]/50 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              );
            })}

            {/* Accepted payment filter */}
            <div className="relative">
              <select
                value={activePayment}
                onChange={(e) => setActivePayment(e.target.value as PaymentOption | 'All')}
                aria-label="Accepted payment"
                className="pl-3 pr-7 py-1.5 rounded-full bg-[#0a1f12] border border-[#22c55e]/20 text-white text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#22c55e]/50 focus:border-[#22c55e]/40 transition-all appearance-none cursor-pointer"
              >
                <option value="All" className="bg-[#0a1f12]">Accepted Payment</option>
                {ALL_PAYMENT_OPTIONS.map((pay) => (
                  <option key={pay} value={pay} className="bg-[#0a1f12]">{pay}</option>
                ))}
              </select>
              <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-white/40 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6"/></svg>
            </div>

            {/* Search — right side, white background, compact */}
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                aria-label="Search AI NSFW tools"
                className="w-44 pl-8 pr-7 py-1.5 rounded-full bg-white border border-[#22c55e]/20 text-black text-xs placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#22c55e]/50 focus:border-[#22c55e]/40 transition-all"
              />
              {search && (
                <button onClick={() => setSearch('')} aria-label="Clear search" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black transition-colors">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              )}
            </div>
          </div>
        </div>

        <div>
          {/* Main Content — full width now that the sidebar is gone */}
          <div className="min-w-0">
            {/* Top AI NSFW Block — hidden when a search or category filter is active */}
            {activeCategory === 'All' && activePayment === 'All' && !search.trim() && (
              <TopAINsfwBlock tools={tools} allStats={allStats} scores={scores} featuredSlugs={featuredSlugs} featuredCampaignMap={featuredCampaignMap} topAdCampaigns={topAdCampaigns} onVoteChange={handleVoteChange} />
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {(() => {
                const featuredTools = tools.filter((t) => featuredSlugs.includes(t.slug));
                const displayedSet = new Set(displayed.map((t) => t.slug));
                const items: React.ReactNode[] = [];
                let featuredIdx = 0;
                let adIdx = 0;

                displayed.forEach((tool, i) => {
                  // Interleave an in-feed ad every 6 tools (same idea as Groups/Bots feed).
                  if (i > 0 && i % 6 === 0 && feedCampaigns.length > 0) {
                    const ad = feedCampaigns[adIdx % feedCampaigns.length];
                    items.push(
                      <AdvertCard key={`ad-${i}-${ad._id}`} campaign={ad} isIndex={i} placementOverride="ainsfw-feed" />
                    );
                    adIdx++;
                  }
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
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-3">
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
          <div className="bg-[#0a1f12] rounded-2xl border border-[#22c55e]/15 p-5 sm:p-7">
            <h2 className="text-2xl sm:text-3xl font-black text-white mb-2 text-center">{t('ainsfw.guideTitle')}</h2>
            <p className="text-center text-white/50 text-sm sm:text-base mb-6">{t('ainsfw.guideSubtitle')}</p>

            <div className="text-white/80 text-sm sm:text-base leading-relaxed space-y-4 text-left">
              <h3 className="text-white font-bold text-lg">{t('ainsfw.guideWelcomeH')}</h3>
              <p>{t('ainsfw.guideWelcomeP')}</p>

              <h3 className="text-white font-bold text-lg pt-2">{t('ainsfw.guideExploreH')}</h3>
              <p>{t('ainsfw.guideExploreP')}</p>

              <h3 className="text-white font-bold text-lg pt-2">{t('ainsfw.guideGfH')}</h3>
              <p>{t('ainsfw.guideGfP')}</p>

              <h3 className="text-white font-bold text-lg pt-2">{t('ainsfw.guideUndressH')}</h3>
              <p>{t('ainsfw.guideUndressP')}</p>

              <h3 className="text-white font-bold text-lg pt-2">{t('ainsfw.guideChatH')}</h3>
              <p>{t('ainsfw.guideChatP')}</p>

              <h3 className="text-white font-bold text-lg pt-2">{t('ainsfw.guideImageH')}</h3>
              <p>{t('ainsfw.guideImageP')}</p>

              <h3 className="text-white font-bold text-lg pt-2">{t('ainsfw.guideRpH')}</h3>
              <p>{t('ainsfw.guideRpP')}</p>

              <h3 className="text-white font-bold text-lg pt-2">{t('ainsfw.guidePicksH')}</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li><span className="font-bold text-white">DreamGF</span>: {t('ainsfw.guidePick1')}</li>
                <li><span className="font-bold text-white">Clothoff.net</span>: {t('ainsfw.guidePick2')}</li>
                <li><span className="font-bold text-white">SpicyChat</span>: {t('ainsfw.guidePick3')}</li>
              </ul>

              <h3 className="text-white font-bold text-lg pt-2">{t('ainsfw.guideAboutH')}</h3>
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
              <details key={faq.q} className="group bg-[#0a1f12] rounded-xl border border-[#22c55e]/15 overflow-hidden">
                <summary className="flex items-center justify-between cursor-pointer px-5 py-4 text-white font-semibold text-sm sm:text-base">
                  {faq.q}
                  <svg className="w-4 h-4 text-white/50 transition-transform group-open:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
                </summary>
                <p className="px-5 pb-4 text-white/70 text-sm leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
}
