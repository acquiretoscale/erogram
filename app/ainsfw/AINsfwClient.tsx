'use client';
import { useTranslation, useLocalePath } from '@/lib/i18n/client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ToolCard from './ToolCard';
import AdvertCard from '../groups/AdvertCard';
import type { FeedCampaign } from '../groups/types';
import type { AINsfwTool, AINsfwCategory, AinsfwSortOption, PaymentOption, PricingModel } from './types';
import { toolMatchesPricingModel } from './types';
import { renderAinsfwGuideText } from '@/lib/ainsfw/internalLinks';
import type { ToolStatsData } from '@/lib/actions/ainsfw';
import type { AuthorProfile } from '@/lib/actions/authors';
import { AINSFW_PAGE_SIZE } from './constants';
import { getPlacementFeedCampaigns, getActiveFeedCampaigns } from '@/lib/actions/campaigns';
import AinsfwHeaderActions from '@/components/AinsfwHeaderActions';
import TopAINsfwBlock, { loadAllScores } from './TopAINsfwBlock';
import RecentAdditionsBlock from './RecentAdditionsBlock';
import AinsfwToolsFilterBar from './AinsfwToolsFilterBar';
import { categoryToSlug } from './data';
import type { AINsfwToolCategory } from './types';

const HERO_CATEGORY_LINKS: AINsfwToolCategory[] = [
  'AI Companion',
  'Undress AI',
  'AI NSFW Image Generator',
  'AI NSFW Roleplay',
  'AI Sexting / Chat',
  'AI Porn Generator',
];

interface AINsfwClientProps {
  tools: AINsfwTool[];
  allStats?: Record<string, ToolStatsData>;
  featuredSlugs?: string[];
  boostFeaturedSlugs?: string[];
  featuredCampaignMap?: Record<string, string>;
  topBannerCampaigns?: Array<{ _id: string; creative: string; destinationUrl: string; bannerDevice?: 'all' | 'mobile' | 'desktop' }>;
  /** Generic ads assigned to the 'ainsfw-featured' placement — rendered as cards in the Top AI NSFW grid. */
  topAdCampaigns?: FeedCampaign[];
  /** In-feed ads (named placement ainsfw-feed) — interleaved into the main tool grid like Groups/Bots. */
  feedCampaigns?: FeedCampaign[];
  paginationCurrentPage?: number;
  paginationTotalPages?: number;
  pageSize?: number;
  guideAuthor?: AuthorProfile;
  recentTools?: AINsfwTool[];
  verifiedSlugs?: string[];
  featuredHubSlugs?: string[];
}

function GuideEditorNote({ author }: { author: AuthorProfile }) {
  const { t } = useTranslation();
  const lp = useLocalePath();
  return (
    <div className="mb-8 pb-8 border-b border-[#22c55e]/15">
      <p className="text-[10px] font-bold tracking-[0.32em] uppercase text-[#22c55e] mb-4">{t('ainsfw.guideEditorTitle')}</p>
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-5">
        {author.avatar && (
          <img
            src={author.avatar}
            alt={author.name}
            width={72}
            height={72}
            className="w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-full object-cover shrink-0 ring-2 ring-white/10"
            referrerPolicy="no-referrer"
          />
        )}
        <div className="space-y-3 text-white/75 text-sm sm:text-[15px] leading-relaxed">
          <p>{t('ainsfw.guideEditorP1')}</p>
          <p>{t('ainsfw.guideEditorP2')}</p>
          <p className="text-white/90 font-semibold text-sm pt-1">
            {author.name}{author.role ? `, ${author.role}` : ''}
          </p>
        </div>
      </div>
    </div>
  );
}

function GuideSectionHeading({ label }: { label: string }) {
  return <h3 className="text-white font-bold text-lg pt-2">{label}</h3>;
}

function GuideParagraph({ text }: { text: string }) {
  return <p>{renderAinsfwGuideText(text)}</p>;
}

function ainsfwPageHref(page: number): string {
  return page <= 1 ? '/ainsfw' : `/ainsfw/page/${page}`;
}

function getScore(slug: string, scores: Record<string, number>): number {
  return scores[slug] ?? 0;
}

function getUpvotes(slug: string, allStats?: Record<string, ToolStatsData>): number {
  return allStats?.[slug]?.upvotes ?? 0;
}

export default function AINsfwClient({ tools, allStats, featuredSlugs = [], boostFeaturedSlugs = [], featuredCampaignMap = {}, topBannerCampaigns = [], topAdCampaigns = [], feedCampaigns = [], paginationCurrentPage = 1, paginationTotalPages = 1, pageSize = AINSFW_PAGE_SIZE, guideAuthor, recentTools = [], verifiedSlugs = [], featuredHubSlugs = [] }: AINsfwClientProps) {
  const verifiedSet = new Set(verifiedSlugs);
  const [activeCategory, setActiveCategory] = useState<AINsfwCategory>('All');
  const [activePricing, setActivePricing] = useState<PricingModel>('All');
  const [activePayment, setActivePayment] = useState<PaymentOption | 'All'>('All');
  const [activeSort, setActiveSort] = useState<AinsfwSortOption>('default');
  const [search, setSearch] = useState('');
  const [scores, setScores] = useState<Record<string, number>>(() => loadAllScores(allStats));
  const { t } = useTranslation();
  const lp = useLocalePath();

  // LIVE ADS: page HTML is ISR-cached (up to 5 min stale), so the browser
  // refreshes ad campaigns right after load for real rotation.
  const [liveTopAds, setLiveTopAds] = useState<FeedCampaign[]>(topAdCampaigns);
  const [liveFeedAds, setLiveFeedAds] = useState<FeedCampaign[]>(feedCampaigns);

  useEffect(() => {
    Promise.all([
      getPlacementFeedCampaigns('ainsfw-featured', 4).catch(() => []),
      getActiveFeedCampaigns('ainsfw').catch(() => []),
    ]).then(([topAds, feed]) => {
      if ((topAds as any[]).length > 0) setLiveTopAds(topAds as any);
      if ((feed as any[]).length > 0) setLiveFeedAds(feed as any);
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    .filter((t) => toolMatchesPricingModel(t.subscription, activePricing))
    .filter((t) => activePayment === 'All' || t.payment.includes(activePayment))
    .slice()
    .sort((a, b) => {
      if (activeSort === 'top-upvotes') {
        return getUpvotes(b.slug, allStats) - getUpvotes(a.slug, allStats);
      }
      return getScore(b.slug, scores) - getScore(a.slug, scores);
    });

  const isDefaultBrowse =
    activeCategory === 'All' && activePricing === 'All' && activePayment === 'All' && activeSort === 'default' && !search.trim();

  const clearFilters = useCallback(() => {
    setActiveCategory('All');
    setActivePricing('All');
    setActivePayment('All');
    setActiveSort('default');
    setSearch('');
  }, []);

  const displayed = isDefaultBrowse
    ? filtered.slice((paginationCurrentPage - 1) * pageSize, paginationCurrentPage * pageSize)
    : filtered;

  return (
    <div className="ainsfw-page ainsfw-bg min-h-screen text-white">
      <Navbar />

      <div className="relative z-10 px-4 sm:px-6 py-3 sm:py-3.5 border-b border-[#22c55e]/15 bg-[#04140c]/80 backdrop-blur-xl mt-24 sm:mt-28">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <nav className="flex items-center text-xs text-gray-500 gap-1.5 min-w-0">
            <Link href={lp('/')} className="hover:text-white transition-colors shrink-0">{t('ainsfw.home', 'Home')}</Link>
            <span className="shrink-0">/</span>
            <span className="text-white font-semibold truncate">{t('ainsfw.breadcrumbHub', 'AI NSFW Tools')}</span>
          </nav>
          <AinsfwHeaderActions part="submit" />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-5 sm:px-8 lg:px-12 pt-8 sm:pt-10 pb-8">
        {/* Hero — same content, futuristic condensed italic scanline design treatment */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8 sm:mb-10"
        >
          <h1 className="ainsfw-hero-title text-[44px] sm:text-[64px] md:text-[76px] mb-4">
            {t('ainsfw.heroTitle', 'Best AI NSFW Tools')}
          </h1>
          <p className="text-white/50 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            {t('ainsfw.heroSubtitle')}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <Link
              href="/best-ai-nsfw-tools"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#22c55e] text-black text-xs font-black uppercase tracking-wide hover:bg-[#4ade80] transition-colors"
            >
              {t('ainsfw.top10Rankings', 'TOP 10 Rankings')}
            </Link>
            {HERO_CATEGORY_LINKS.map((category) => (
              <Link
                key={category}
                href={`/ainsfw/${categoryToSlug(category)}`}
                className="inline-flex items-center px-3 py-1.5 rounded-full bg-[#0a1f12] text-white/70 border border-[#22c55e]/20 hover:border-[#22c55e]/50 hover:text-white text-xs font-bold transition-all"
              >
                {category}
              </Link>
            ))}
          </div>
        </motion.div>

        <div>
          {/* Main Content — full width now that the sidebar is gone */}
          <div className="min-w-0">
            {/* Top AI NSFW Block — hidden when a search or category filter is active */}
            {isDefaultBrowse && (
              <TopAINsfwBlock tools={tools} featuredHubSlugs={featuredHubSlugs} allStats={allStats} featuredCampaignMap={featuredCampaignMap} onVoteChange={handleVoteChange} verifiedSlugs={verifiedSlugs} />
            )}

            {isDefaultBrowse && paginationCurrentPage === 1 && recentTools.length > 0 && (
              <RecentAdditionsBlock tools={recentTools} allStats={allStats} verifiedSlugs={verifiedSlugs} />
            )}

            <div id="ainsfw-tools" className="scroll-mt-24">
              <AinsfwToolsFilterBar
                activeCategory={activeCategory}
                activePricing={activePricing}
                activePayment={activePayment}
                activeSort={activeSort}
                search={search}
                onCategoryChange={setActiveCategory}
                onPricingChange={setActivePricing}
                onPaymentChange={setActivePayment}
                onSortChange={setActiveSort}
                onSearchChange={setSearch}
                onClear={clearFilters}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {(() => {
                const featuredTools = tools.filter((t) => featuredSlugs.includes(t.slug));
                const displayedSet = new Set(displayed.map((t) => t.slug));
                const items: React.ReactNode[] = [];
                let featuredIdx = 0;
                let adIdx = 0;

                displayed.forEach((tool, i) => {
                  // Interleave an in-feed ad every 6 tools (same idea as Groups/Bots feed).
                  if (i > 0 && i % 6 === 0 && liveFeedAds.length > 0) {
                    const ad = liveFeedAds[adIdx % liveFeedAds.length];
                    items.push(
                      <AdvertCard key={`ad-${i}-${ad._id}`} campaign={ad} isIndex={i} placementOverride="ainsfw-feed" />
                    );
                    adIdx++;
                  }
                  if (i > 0 && i % 8 === 0 && featuredTools.length > 0) {
                    for (let attempt = 0; attempt < featuredTools.length; attempt++) {
                      const ft = featuredTools[featuredIdx % featuredTools.length];
                      featuredIdx++;
                      if (displayedSet.has(ft.slug)) continue;
                      items.push(
                        <ToolCard key={`featured-${i}-${ft.slug}`} tool={ft} index={i} initialStats={allStats?.[ft.slug]} onVoteChange={handleVoteChange} featured campaignId={featuredCampaignMap[ft.slug]} verified={verifiedSet.has(ft.slug)} />
                      );
                      break;
                    }
                  }
                  items.push(
                    <ToolCard key={tool.slug} tool={tool} index={i} initialStats={allStats?.[tool.slug]} onVoteChange={handleVoteChange} featured={featuredSlugs.includes(tool.slug)} campaignId={featuredCampaignMap[tool.slug]} verified={verifiedSet.has(tool.slug)} />
                  );
                });

                return items;
              })()}
            </div>

            {isDefaultBrowse && paginationTotalPages > 1 && (
              <nav
                aria-label="AI NSFW pagination"
                className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mt-8 sm:mt-10"
              >
                {paginationCurrentPage > 1 && (
                  <Link
                    href={ainsfwPageHref(paginationCurrentPage - 1)}
                    className="px-4 py-2 rounded-xl border border-white/10 bg-white/[0.04] text-sm font-bold text-white/80 hover:border-[#22c55e]/40 hover:text-white transition-colors"
                    rel="prev"
                  >
                    {t('ainsfw.previous', '← Previous')}
                  </Link>
                )}
                {Array.from({ length: paginationTotalPages }, (_, i) => i + 1).map((p) => {
                  const isActive = p === paginationCurrentPage;
                  return (
                    <Link
                      key={p}
                      href={ainsfwPageHref(p)}
                      aria-current={isActive ? 'page' : undefined}
                      className={`min-w-[2.5rem] px-3 py-2 rounded-xl text-sm font-bold text-center transition-colors ${
                        isActive
                          ? 'bg-[#22c55e] text-black border border-[#22c55e]'
                          : 'border border-white/10 bg-white/[0.04] text-white/70 hover:border-[#22c55e]/40 hover:text-white'
                      }`}
                    >
                      {p}
                    </Link>
                  );
                })}
                {paginationCurrentPage < paginationTotalPages && (
                  <Link
                    href={ainsfwPageHref(paginationCurrentPage + 1)}
                    className="px-4 py-2 rounded-xl border border-white/10 bg-white/[0.04] text-sm font-bold text-white/80 hover:border-[#22c55e]/40 hover:text-white transition-colors"
                    rel="next"
                  >
                    {t('ainsfw.next', 'Next →')}
                  </Link>
                )}
              </nav>
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
            {guideAuthor && <GuideEditorNote author={guideAuthor} />}
            <h2 className="text-2xl sm:text-3xl font-black text-white mb-2 text-center">{t('ainsfw.guideTitle')}</h2>
            <p className="text-center text-white/50 text-sm sm:text-base mb-6">{t('ainsfw.guideSubtitle')}</p>

            <div className="text-white/80 text-sm sm:text-base leading-relaxed space-y-4 text-left">
              <h3 className="text-white font-bold text-lg">{t('ainsfw.guideWelcomeH')}</h3>
              <GuideParagraph text={t('ainsfw.guideWelcomeP')} />
              <GuideParagraph text={t('ainsfw.guideWelcomeP2')} />

              <GuideSectionHeading label={t('ainsfw.guideGfH')} />
              <GuideParagraph text={t('ainsfw.guideGfP')} />
              <GuideParagraph text={t('ainsfw.guideGfP2')} />
              <GuideParagraph text={t('ainsfw.guideGfP3')} />

              <GuideSectionHeading label={t('ainsfw.guideUndressH')} />
              <GuideParagraph text={t('ainsfw.guideUndressP')} />
              <GuideParagraph text={t('ainsfw.guideUndressP2')} />
              <GuideParagraph text={t('ainsfw.guideUndressP3')} />

              <GuideSectionHeading label={t('ainsfw.guideChatH')} />
              <GuideParagraph text={t('ainsfw.guideChatP')} />
              <GuideParagraph text={t('ainsfw.guideChatP2')} />
              <GuideParagraph text={t('ainsfw.guideChatP3')} />

              <GuideSectionHeading label={t('ainsfw.guideImageH')} />
              <GuideParagraph text={t('ainsfw.guideImageP')} />
              <GuideParagraph text={t('ainsfw.guideImageP2')} />
              <GuideParagraph text={t('ainsfw.guideImageP3')} />

              <GuideSectionHeading label={t('ainsfw.guidePornH')} />
              <GuideParagraph text={t('ainsfw.guidePornP')} />
              <GuideParagraph text={t('ainsfw.guidePornP2')} />
              <GuideParagraph text={t('ainsfw.guidePornP3')} />

              <GuideSectionHeading label={t('ainsfw.guideRpH')} />
              <GuideParagraph text={t('ainsfw.guideRpP')} />
              <GuideParagraph text={t('ainsfw.guideRpP2')} />
              <GuideParagraph text={t('ainsfw.guideRpP3')} />

              <GuideSectionHeading label={t('ainsfw.guideGamesH')} />
              <GuideParagraph text={t('ainsfw.guideGamesP')} />
              <GuideParagraph text={t('ainsfw.guideGamesP2')} />

              <GuideSectionHeading label={t('ainsfw.guideAccessH')} />
              <GuideParagraph text={t('ainsfw.guideAccessP')} />

              <GuideSectionHeading label={t('ainsfw.guideBeyondH')} />
              <GuideParagraph text={t('ainsfw.guideBeyondP')} />
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
              { q: t('ainsfw.faqQ5'), a: t('ainsfw.faqA5') },
              { q: t('ainsfw.faqQ6'), a: t('ainsfw.faqA6') },
              { q: t('ainsfw.faqQ7'), a: t('ainsfw.faqA7') },
              { q: t('ainsfw.faqQ8'), a: t('ainsfw.faqA8') },
              { q: t('ainsfw.faqQ9'), a: t('ainsfw.faqA9') },
              { q: t('ainsfw.faqQ10'), a: t('ainsfw.faqA10') },
            ].map((faq) => (
              <details key={faq.q} className="group bg-[#0a1f12] rounded-xl border border-[#22c55e]/15 overflow-hidden">
                <summary className="flex items-center justify-between cursor-pointer px-5 py-4 text-white font-semibold text-sm sm:text-base">
                  {faq.q}
                  <svg className="w-4 h-4 text-white/50 transition-transform group-open:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
                </summary>
                <p className="px-5 pb-4 text-white/70 text-sm leading-relaxed">{renderAinsfwGuideText(faq.a)}</p>
              </details>
            ))}
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
}
