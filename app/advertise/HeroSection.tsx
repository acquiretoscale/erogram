'use client';

import { motion } from 'framer-motion';

export default function HeroSection() {
  return (
    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="text-center mb-12 sm:mb-16">
      <div
        className="inline-flex items-center gap-2 px-4 py-1.5 mb-6"
        style={{ border: '2px solid #0ea5e9', boxShadow: '3px 3px 0px #0ea5e9', background: 'rgba(14,165,233,0.10)' }}
      >
        <span className="w-2 h-2 rounded-full bg-[#0ea5e9] animate-pulse" />
        <span className="text-[11px] font-bold uppercase tracking-widest text-[#7dd3fc]">Advertising Partner Portal</span>
      </div>
      <h1 className="text-4xl sm:text-5xl md:text-6xl font-black leading-[1.1] mb-3">
        <span style={{ background: 'linear-gradient(135deg, #0ea5e9, #38bdf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>EROGRAM PRO</span>
        <br />
        <span className="text-white">MEDIA KIT.</span>
      </h1>
      <p className="text-[11px] sm:text-xs text-[#0ea5e9]/80 uppercase tracking-[0.18em] mb-4">
        Updated March 2026
      </p>
    </motion.div>
  );
}
