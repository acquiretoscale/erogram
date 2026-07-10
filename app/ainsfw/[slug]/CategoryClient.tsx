'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ToolCard from '@/app/ainsfw/ToolCard';
import type { AINsfwTool } from '@/app/ainsfw/types';
import type { ToolStatsData } from '@/lib/actions/ainsfw';

interface Props {
  category: string;
  tools: AINsfwTool[];
  allStats: Record<string, ToolStatsData>;
}

const CATEGORY_DESC: Record<string, string> = {
  'AI Girlfriend': 'The best AI girlfriend apps — virtual companions with memory, personality, and explicit chat.',
  'Undress AI': 'Top undress AI tools that generate realistic images. Reviewed for quality and privacy.',
  'AI Chat': 'The best AI NSFW chat platforms for uncensored roleplay and adult conversations.',
  'AI Image': 'Best AI image generators for NSFW and adult content creation.',
  'AI Roleplay': 'Top AI roleplay platforms for immersive adult storytelling and character interaction.',
};

export default function CategoryClient({ category, tools, allStats }: Props) {
  const desc = CATEGORY_DESC[category] || `Browse the best ${category} tools — reviewed and ranked by Erogram.`;

  return (
    <div className="ainsfw-page ainsfw-bg min-h-screen text-white">
      <Navbar />

      {/* Breadcrumb */}
      <div className="relative z-10 px-4 sm:px-6 py-3 border-b border-[#22c55e]/15 bg-[#04140c]/80 backdrop-blur-xl mt-14">
        <div className="max-w-7xl mx-auto">
          <nav className="flex items-center text-xs text-gray-500 gap-1.5">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <span>/</span>
            <Link href="/ainsfw" className="hover:text-white transition-colors">AI NSFW Tools</Link>
            <span>/</span>
            <span className="text-white font-semibold">{category}</span>
          </nav>
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

        {/* Tool grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {tools.map((tool, i) => (
            <ToolCard
              key={tool.slug}
              tool={tool}
              index={i}
              initialStats={allStats[tool.slug]}
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
