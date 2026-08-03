'use client';

import { motion } from 'framer-motion';
import { PROMO_ACCENT, PROMO_ACCENT_LIGHT, PROMO_BORDER, PROMO_CTA, PROMO_SHADOW } from './promoTheme';

export default function HeroSection() {
  return (
    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="text-center mb-12 sm:mb-16">
      <div
        className="inline-flex items-center gap-2 px-4 py-1.5 mb-6"
        style={{ border: PROMO_BORDER, boxShadow: PROMO_SHADOW, background: 'rgba(34,197,94,0.12)' }}
      >
        <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: PROMO_ACCENT }} />
        <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: PROMO_ACCENT_LIGHT }}>Advertising Partner Portal</span>
      </div>
      <h1 className="text-4xl sm:text-5xl md:text-6xl font-black leading-[1.1] mb-3">
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#22c55e] via-[#4ade80] to-[#86efac]">EROGRAM PRO</span>
        <br />
        <span className="text-white">MEDIA KIT.</span>
      </h1>
      <p className="text-[11px] sm:text-xs uppercase tracking-[0.18em] mb-4" style={{ color: `${PROMO_ACCENT}cc` }}>
        Updated March 2026
      </p>
    </motion.div>
  );
}
