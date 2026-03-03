'use client';

import { motion } from 'framer-motion';

export default function HeroSection() {
  return (
    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="text-center mb-12 sm:mb-16">
      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass border-white/10 bg-white/5 mb-6">
        <span className="w-2 h-2 rounded-full bg-[#ff3366] animate-pulse" />
        <span className="text-[11px] font-bold uppercase tracking-widest text-white/80">Advertising Partner Portal</span>
      </div>
      <h1 className="text-4xl sm:text-5xl md:text-6xl font-black leading-[1.1] mb-3">
        <span className="gradient-text">EROGRAM PRO</span>
        <br />
        <span className="text-[#f5f5f5]">MEDIA KIT.</span>
      </h1>
      <p className="text-[11px] sm:text-xs text-[#ff3366]/80 uppercase tracking-[0.18em] mb-4">
        Updated February 25, 2026
      </p>
      <p className="text-[#999] max-w-xl mx-auto text-base sm:text-lg">
        Erogram Pro connects brands with a high-intent, mobile-first, Tier-1 audience through performance-driven placements. We deliver attention, clicks, and scalable exposure inside a fast-growing ecosystem.
      </p>
    </motion.div>
  );
}
