'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ToolCard from '@/app/ainsfw/ToolCard';
import RecentAdditionsBlock from '@/app/ainsfw/RecentAdditionsBlock';
import type { AINsfwTool } from '@/app/ainsfw/types';
import type { ToolStatsData } from '@/lib/actions/ainsfw';
import AinsfwHeaderActions from '@/components/AinsfwHeaderActions';
import { CANONICAL_BASE } from '@/lib/seo/socialMeta';
import { categoryToSlug } from '@/app/ainsfw/data';

interface Props {
  category: string;
  tools: AINsfwTool[];
  allStats: Record<string, ToolStatsData>;
  recentTools: AINsfwTool[];
  recentStats: Record<string, ToolStatsData>;
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
  verifiedSlugs = [],
}: Props) {
  const desc = CATEGORY_DESC[category] || `Browse the best ${category} tools — reviewed and ranked by Erogram.`;

  return (
    <div className="ainsfw-page ainsfw-bg min-h-screen text-white">
      <Navbar />

      {/* Breadcrumb */}
      <div className="relative z-10 px-4 sm:px-6 py-3 sm:py-3.5 border-b border-[#22c55e]/15 bg-[#04140c]/80 backdrop-blur-xl mt-24 sm:mt-28">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <nav className="flex items-center text-xs text-gray-500 gap-1.5 min-w-0">
            <Link href="/" className="hover:text-white transition-colors shrink-0">Home</Link>
            <span className="shrink-0">/</span>
            <Link href="/ainsfw" className="hover:text-white transition-colors shrink-0">AI NSFW Tools</Link>
            <span className="shrink-0">/</span>
            <span className="text-white font-semibold truncate">{category}</span>
          </nav>
          <AinsfwHeaderActions
            shareText={`Check out ${category} AI NSFW tools on Erogram`}
            emailSubject={`${category} AI NSFW Tools on Erogram`}
            fallbackUrl={`${CANONICAL_BASE}/ainsfw/${categoryToSlug(category)}`}
          />
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
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#22c55e]/10 border border-[#22c55e]/30 text-[#22c55e] text-xs font-bold uppercase tracking-[2px] mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
            {tools.length} Tools Reviewed
          </div>
          <h1 className="ainsfw-hero-title text-[36px] sm:text-[52px] md:text-[64px] mb-4">
            Best {category} Tools
          </h1>
          <p className="text-white/50 text-sm sm:text-base max-w-xl mx-auto leading-relaxed mb-6">
            {desc}
          </p>
          <Link
            href="/ainsfw"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#22c55e] hover:text-white transition-colors border border-[#22c55e]/30 hover:border-[#22c55e]/60 rounded-full px-4 py-1.5"
          >
            ← View All AI NSFW Tools
          </Link>
        </motion.div>

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
