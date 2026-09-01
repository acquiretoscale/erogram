'use client';

import { useCallback } from 'react';
import Link from 'next/link';
import { useLocalePath, useTranslation } from '@/lib/i18n/client';
import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ToolCard from '@/app/ainsfw/ToolCard';
import RecentAdditionsBlock from '@/app/ainsfw/RecentAdditionsBlock';
import TopAINsfwBlock from '@/app/ainsfw/TopAINsfwBlock';
import type { AINsfwTool } from '@/app/ainsfw/types';
import type { ToolStatsData } from '@/lib/actions/ainsfw';
import AinsfwHeaderActions from '@/components/AinsfwHeaderActions';

interface Props {
  category: string;
  tools: AINsfwTool[];
  allStats: Record<string, ToolStatsData>;
  recentTools: AINsfwTool[];
  recentStats: Record<string, ToolStatsData>;
  featuredHubSlugs: string[];
  featuredCatalogTools: AINsfwTool[];
  featuredHubStats: Record<string, ToolStatsData>;
  verifiedSlugs?: string[];
}

const CATEGORY_DESC: Record<string, string> = {
  'AI Companion': 'The best AI companion apps — virtual partners with memory, personality, and explicit chat.',
  'Undress AI': 'Top undress AI tools that generate realistic images. Reviewed for quality and privacy.',
  'AI Sexting / Chat': 'The best AI sexting and chat platforms for uncensored roleplay and adult conversations.',
  'AI NSFW Image Generator': 'Best AI NSFW image generators for adult content creation.',
  'AI Porn Generator': 'AI porn generators that turn prompts into custom adult images and video.',
  'AI NSFW Roleplay': 'Top AI NSFW roleplay platforms for immersive adult storytelling and character interaction.',
  'Adult Games': 'Adult games and interactive 3D experiences, reviewed and listed separately from AI tools.',
};

export default function CategoryClient({
  category,
  tools,
  allStats,
  recentTools,
  recentStats,
  featuredHubSlugs,
  featuredCatalogTools,
  featuredHubStats,
  verifiedSlugs = [],
}: Props) {
  const { t } = useTranslation();
  const lp = useLocalePath();
  const catLabel = (cat: string) => t(`ainsfw.categories.${cat}`, cat);
  const desc = CATEGORY_DESC[category] || `Browse the best ${category} tools — reviewed and ranked by Erogram.`;
  const handleFeaturedVoteChange = useCallback((_slug: string, _score: number) => {}, []);

  return (
    <div className="ainsfw-page ainsfw-bg min-h-screen text-white">
      <Navbar />

      {/* Breadcrumb */}
      <div className="relative z-10 px-4 sm:px-6 py-3 sm:py-3.5 border-b border-[#22c55e]/15 bg-[#04140c]/80 backdrop-blur-xl mt-24 sm:mt-28">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <nav className="flex items-center text-xs text-gray-500 gap-1.5 min-w-0">
            <Link href={lp('/')} className="hover:text-white transition-colors shrink-0">{t('ainsfw.home', 'Home')}</Link>
            <span className="shrink-0">/</span>
            <Link href={lp('/ainsfw')} className="hover:text-white transition-colors shrink-0">{t('ainsfw.breadcrumbHub', 'AI NSFW Tools')}</Link>
            <span className="shrink-0">/</span>
            <span className="text-white font-semibold truncate">{catLabel(category)}</span>
          </nav>
          <AinsfwHeaderActions part="submit" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 lg:py-14">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <h1 className="ainsfw-hero-title text-[36px] sm:text-[52px] md:text-[64px] mb-4">
            {t('ainsfw.bestCategoryTools', 'Best {category} Tools').replace(/\{category\}/g, catLabel(category))}
          </h1>
          <p className="text-white/50 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            {desc}
          </p>
        </motion.div>

        <TopAINsfwBlock
          tools={featuredCatalogTools}
          featuredHubSlugs={featuredHubSlugs}
          allStats={featuredHubStats}
          onVoteChange={handleFeaturedVoteChange}
          verifiedSlugs={verifiedSlugs}
        />

        <RecentAdditionsBlock tools={recentTools} allStats={recentStats} verifiedSlugs={verifiedSlugs} />

        {/* Tool grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {tools.map((tool, i) => (
            <ToolCard
              key={tool.slug}
              tool={tool}
              index={i}
              initialStats={allStats[tool.slug]}
              verified={verifiedSlugs.includes(tool.slug)}
            />
          ))}
        </div>

        {tools.length === 0 && (
          <p className="text-center text-gray-400 py-20">No tools found in this category yet.</p>
        )}
      </div>

      <Footer />
    </div>
  );
}
