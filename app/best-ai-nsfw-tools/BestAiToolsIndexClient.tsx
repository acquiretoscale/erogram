'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { BEST_AI_NSFW_TOOLS_HUB } from '@/lib/bestAiNsfwTools/pages';

type HubPage = {
  slug: string;
  label: string;
};

type Props = {
  pages: HubPage[];
  curatedTitle: string;
  topLists: string;
  indexDesc: string;
  bestCategoryLabel: string;
  top10Label: string;
};

export default function BestAiToolsIndexClient({
  pages,
  curatedTitle,
  topLists,
  indexDesc,
  bestCategoryLabel,
  top10Label,
}: Props) {
  return (
    <div className="ainsfw-page ainsfw-bg min-h-screen text-white">
      <Navbar />

      <div className="relative z-10 px-4 sm:px-6 py-3 border-b border-[#22c55e]/15 bg-[#04140c]/80 backdrop-blur-xl mt-24">
        <div className="max-w-7xl mx-auto">
          <nav className="flex items-center text-xs text-gray-500 gap-1.5">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <span>/</span>
            <Link href="/ainsfw" className="hover:text-white transition-colors">AI NSFW Tools</Link>
            <span>/</span>
            <span className="text-white font-semibold">Top 10 Rankings</span>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 lg:py-14">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#22c55e]/10 border border-[#22c55e]/30 text-[#22c55e] text-xs font-bold uppercase tracking-[2px] mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
            {curatedTitle}
          </div>
          <h1 className="ainsfw-hero-title text-[36px] sm:text-[52px] md:text-[64px] mb-4">
            {topLists}
          </h1>
          <p className="text-white/50 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed mb-6">
            {indexDesc}
          </p>
          <Link
            href="/ainsfw"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#22c55e] hover:text-white transition-colors border border-[#22c55e]/30 hover:border-[#22c55e]/60 rounded-full px-4 py-1.5"
          >
            ← View All AI NSFW Tools
          </Link>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {pages.map((page, i) => (
            <motion.div
              key={page.slug}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.03 }}
            >
              <Link
                href={`/${BEST_AI_NSFW_TOOLS_HUB}/${page.slug}`}
                className="block h-full rounded-2xl border border-[#22c55e]/15 bg-[#04140c]/70 hover:border-[#22c55e]/40 hover:bg-[#0a1f12]/80 transition-all p-5 group"
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#22c55e] mb-2">
                  Top 10
                </p>
                <h2 className="text-lg font-black mb-2 group-hover:text-[#22c55e] transition-colors">
                  {bestCategoryLabel.replace('{category}', page.label)}
                </h2>
                <p className="text-sm text-white/45">
                  {top10Label.replace('{category}', page.label)}
                </p>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      <Footer />
    </div>
  );
}
