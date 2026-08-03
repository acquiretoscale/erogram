'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import BestToolRankCard from '@/app/best-ai-nsfw-tools/BestToolRankCard';
import type { Top10ToolRankEntry } from '@/lib/bestAiNsfwTools/top10List';
import { BEST_AI_NSFW_TOOLS_HUB } from '@/lib/bestAiNsfwTools/pages';

type Props = {
  pageLabel: string;
  ranking: Top10ToolRankEntry[];
  month: string;
  year: number;
  updatedLabel: string;
  theBestTemplate: string;
  theBestFallback: string;
  heroIntro: string;
  heroTitle?: string;
  moreDetailsLabel: string;
  userReviewsLabel: string;
  curatingMsg: string;
  wantMore: string;
  wantMoreDesc: string;
  browseAll: string;
};

export default function BestAiToolsCategoryClient({
  pageLabel,
  ranking,
  month,
  year,
  updatedLabel,
  theBestTemplate,
  theBestFallback,
  heroIntro,
  heroTitle,
  moreDetailsLabel,
  userReviewsLabel,
  curatingMsg,
  wantMore,
  wantMoreDesc,
  browseAll,
}: Props) {
  const h1Prefix =
    ranking.length > 0
      ? theBestTemplate.replace('{count}', String(Math.min(ranking.length, 10))).split('{category}')[0]
      : theBestFallback.split('{category}')[0];
  const h1Suffix = (ranking.length > 0 ? theBestTemplate : theBestFallback).split('{category}')[1] || '';
  const displayTitle = heroTitle ?? (
    <>
      {h1Prefix}
      <span className="text-[#22c55e]">{pageLabel}</span>
      {h1Suffix}
    </>
  );

  return (
    <div className="ainsfw-page ainsfw-bg min-h-screen text-white">
      <Navbar />

      <div className="relative z-10 px-4 sm:px-6 py-3 border-b border-[#22c55e]/15 bg-[#04140c]/80 backdrop-blur-xl mt-24">
        <div className="max-w-5xl mx-auto">
          <nav className="flex items-center flex-wrap text-xs text-gray-500 gap-1.5">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <span>/</span>
            <Link href="/ainsfw" className="hover:text-white transition-colors">AI NSFW Tools</Link>
            <span>/</span>
            <Link href={`/${BEST_AI_NSFW_TOOLS_HUB}`} className="hover:text-white transition-colors">Top 10 Rankings</Link>
            <span>/</span>
            <span className="text-white font-semibold">{pageLabel}</span>
          </nav>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 lg:py-14">
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#22c55e]/10 border border-[#22c55e]/30 text-[#22c55e] text-xs font-bold uppercase tracking-[2px] mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
            {updatedLabel.replace('{month}', month).replace('{year}', String(year))}
          </div>
          <h1 className="ainsfw-hero-title text-[32px] sm:text-[48px] md:text-[56px] mb-4 leading-tight">
            {displayTitle}
          </h1>
          <p className="text-white/50 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            {heroIntro}
          </p>
        </motion.header>

        {ranking.length > 0 ? (
          <div className="space-y-5 mb-14">
            {ranking.map((entry, index) => (
              <BestToolRankCard
                key={entry.tool.slug}
                entry={entry}
                index={index}
                moreDetailsLabel={moreDetailsLabel}
                userReviewsLabel={userReviewsLabel}
              />
            ))}
          </div>
        ) : (
          <p className="text-center text-white/45 py-16 mb-14">{curatingMsg}</p>
        )}

        <div className="text-center p-8 rounded-2xl border border-[#22c55e]/15 bg-[#04140c]/70">
          <h2 className="text-xl font-black mb-3">{wantMore}</h2>
          <p className="text-white/45 text-sm mb-6 max-w-lg mx-auto">{wantMoreDesc}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/ainsfw"
              className="inline-flex justify-center bg-yellow-400 hover:bg-yellow-300 text-black font-black py-3 px-8 rounded-xl text-sm transition-colors"
            >
              {browseAll}
            </Link>
            <Link
              href={`/${BEST_AI_NSFW_TOOLS_HUB}`}
              className="inline-flex justify-center border border-[#22c55e]/30 hover:border-[#22c55e]/60 text-[#22c55e] hover:text-white font-bold py-3 px-8 rounded-xl text-sm transition-colors"
            >
              All Top 10 Lists
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
