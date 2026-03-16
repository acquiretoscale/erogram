'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Footer from '@/components/Footer';
import AdvertiseStats from './AdvertiseStats';
import HeroSection from './HeroSection';
import AudienceDevices from './AudienceDevices';
import AudienceCountries from './AudienceCountries';
import OrganicGrowth from './OrganicGrowth';
import TelegramEcosystem from './TelegramEcosystem';
import PageReplica from './PageReplica';
import AdShop from './AdShop';
import CreativeSpecs from './CreativeSpecs';

interface TgGroup { name: string; memberCount: number }
interface TgEcosystem { groups: TgGroup[]; totalSubscribers: number; groupCount: number }

export default function MediaKitClient() {
  const [tgEcosystem, setTgEcosystem] = useState<TgEcosystem | null>(null);

  useEffect(() => {
    fetch('/api/advertise-stats', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => { if (d.telegramEcosystem) setTgEcosystem(d.telegramEcosystem); })
      .catch(() => { });
  }, []);

  return (
    <div className="min-h-screen bg-[#111111] text-[#f5f5f5] overflow-hidden">
        {/* Animated Background — same as Erogram homepage */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-to-b from-[#ff0000]/10 to-transparent rounded-full blur-[100px] opacity-30" />
          <div className="absolute bottom-0 right-0 w-[800px] h-[800px] bg-[#ff3366]/5 rounded-full blur-[120px] opacity-20" />
        </div>

        {/* Top bar */}
        <header className="relative z-10 border-b border-[#333] bg-[#111111]/95 backdrop-blur-md">
          <div className="max-w-5xl mx-auto px-4 sm:px-8 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 shrink-0">
              <div className="w-8 h-8 rounded-lg bg-[#b31b1b] flex items-center justify-center text-sm font-black text-white">E</div>
              <div>
                <span className="text-sm font-bold text-[#f5f5f5]">Erogram.pro</span>
                <span className="text-xs text-[#999] ml-2 hidden sm:inline">Media Kit</span>
              </div>
            </div>
            <nav className="flex items-center gap-2 overflow-x-auto scrollbar-none">
              <a href="#audience-stats" className="whitespace-nowrap px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider text-[#ccc] hover:text-white hover:bg-white/10 transition-all">
                Audience Stats
              </a>
              <a href="#website-ads" className="whitespace-nowrap px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider text-[#ccc] hover:text-white hover:bg-white/10 transition-all">
                Ad Placements
              </a>
              <a href="#ad-pricing-list" className="whitespace-nowrap px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider bg-[#b31b1b] text-white hover:bg-[#991b1b] transition-all">
                Advertising Rates
              </a>
            </nav>
          </div>
        </header>

        <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-8 pt-12 sm:pt-20 pb-20">
          {/* Hero */}
          <HeroSection />

          {/* Live Stats */}
          <div id="audience-stats">
            <AdvertiseStats />
          </div>

          {/* Audience Insights */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mb-14"
          >
            {/* PART 1: Erogram Website */}
            <AudienceDevices />
            <AudienceCountries />
            <OrganicGrowth />

            {/* PART 2: Telegram Ecosystem */}
            {tgEcosystem && tgEcosystem.groups.length > 0 && (
              <TelegramEcosystem
                groups={tgEcosystem.groups}
                totalSubscribers={tgEcosystem.totalSubscribers}
                groupCount={tgEcosystem.groupCount}
              />
            )}
          </motion.div>

          {/* ── Section divider ── */}
          <div className="my-16 flex items-center gap-4">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#b31b1b]/40 to-transparent" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#b31b1b]/50">Ad Placements</span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#b31b1b]/40 to-transparent" />
          </div>

          {/* Interactive page replica — ad slot preview */}
          <motion.section
            id="website-ads"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="scroll-mt-28 mb-10"
          >
            <div className="text-center mb-10">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight">
                <span className="gradient-text">EROGRAM</span>
                <span className="text-[#f5f5f5]"> ADS PLACEMENTS</span>
              </h2>
              <p className="mt-3 text-sm sm:text-base text-[#999] max-w-xl mx-auto">
                Visual overview of every ad location across the website. Click any highlighted slot for specs and pricing.
              </p>
            </div>
            <PageReplica />
          </motion.section>

          {/* Pricing */}
          <motion.section
            id="ad-pricing-list"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="scroll-mt-28 mb-14"
          >
            <div className="text-center mb-10">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight">
                <span className="gradient-text">ADVERTISING</span>
                <span className="text-[#f5f5f5]"> RATES</span>
              </h2>
              <p className="mt-3 text-sm sm:text-base text-[#999] max-w-xl mx-auto">
                Transparent pricing for every placement. Multi-month bookings unlock up to{' '}
                <span className="font-black text-white">30% discount</span>.
              </p>
            </div>
            <AdShop />
          </motion.section>

          {/* Ad specs */}
          <motion.section
            id="ad-specs"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="scroll-mt-28"
          >
            <div className="text-center mb-10">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight">
                <span className="gradient-text">CREATIVE SPECS</span>
                <span className="text-[#f5f5f5]"> FOR LIVE PLACEMENTS</span>
              </h2>
              <p className="mt-3 text-sm sm:text-base text-[#999] max-w-xl mx-auto">
                Specs below are based on the current live ad render on Erogram.pro and advertiser placements.
              </p>
            </div>
            <CreativeSpecs />
          </motion.section>

        </main>

        <Footer />
      </div>
  );
}
