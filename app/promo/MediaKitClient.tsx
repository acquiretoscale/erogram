'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import ErogramDiscoveryBanner from '@/components/ErogramDiscoveryBanner';
import ErogramDevilGirlFooter from '@/components/ErogramDevilGirlFooter';
import Footer from '@/components/Footer';
import AdvertiseStats from './AdvertiseStats';
import PromoAudienceProof from './PromoAudienceProof';
import TrustedByLeaders from '../advertise/TrustedByLeaders';
import { PROMO_BORDER, PROMO_CTA, PROMO_SHADOW } from './promoTheme';

export default function MediaKitClient() {
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUsername = localStorage.getItem('username');
      if (storedUsername) setUsername(storedUsername);
    }
  }, []);

  return (
    <div className="ainsfw-page ainsfw-bg min-h-screen text-white overflow-hidden">
        <Navbar username={username} setUsername={setUsername} />
        <ErogramDiscoveryBanner />
        <h1 className="text-center font-black leading-none tracking-tighter whitespace-nowrap text-[clamp(1.55rem,7.2vw,3.75rem)] sm:text-6xl mt-4 sm:mt-6 mb-6 px-4">
          <span className="text-white">We have your </span>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#22c55e] via-[#4ade80] to-[#86efac]">customers.</span>
        </h1>

        <div className="max-w-3xl mx-auto px-4 sm:px-8 mb-10 space-y-4 text-center">
          <p className="text-base sm:text-lg text-white/75 leading-relaxed">
            Stop paying for cold traffic. EROGRAM connects your AI tool with users actively searching for premium AI experiences. Get discovered by thousands of high-intent buyers every day while your listing keeps generating visibility through our rapidly growing Google presence.
          </p>
          <p className="text-base sm:text-lg text-white/75 leading-relaxed">
            Get featured on one of the fastest-growing AI discovery platforms with 40% month-over-month organic growth.
          </p>
          <p className="text-xl sm:text-2xl font-black text-white leading-snug">
            Reach 180,000+ Monthly Visitors Ready to Buy.
          </p>
          <p className="text-sm sm:text-base text-white/60 leading-relaxed">
            Our top 10 countries: US 29%, Germany 7%, Netherlands 4%, UK 4%, Canada 4%, Italy 3%, Spain 2.5%, Australia 2%, Turkey 2%, Singapore 2%, Malaysia 2%.
          </p>
          <div className="pt-2">
            <Link
              href="/add/ainsfw"
              className="inline-flex w-full sm:w-auto items-center justify-center px-8 py-3.5 text-base sm:text-sm font-black uppercase tracking-widest text-black transition-all hover:brightness-105 active:translate-x-[2px] active:translate-y-[2px]"
              style={{ background: PROMO_CTA, border: PROMO_BORDER, boxShadow: PROMO_SHADOW }}
            >
              GET LISTED ON EROGRAM
            </Link>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-8 mb-10">
          <TrustedByLeaders variant="green" />
        </div>

        <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-8 pt-2 sm:pt-4 pb-4">
          <div id="audience-stats">
            <AdvertiseStats />
          </div>

          <div className="flex justify-center mb-10 sm:mb-12">
            <Link
              href="/add/ainsfw"
              className="inline-flex w-full sm:w-auto items-center justify-center px-8 py-3.5 text-base sm:text-sm font-black uppercase tracking-widest text-black transition-all hover:brightness-105 active:translate-x-[2px] active:translate-y-[2px]"
              style={{ background: PROMO_CTA, border: PROMO_BORDER, boxShadow: PROMO_SHADOW }}
            >
              GET LISTED ON EROGRAM
            </Link>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mb-14"
          >
            <div className="mb-6 sm:mb-8 text-center px-1 sm:px-2">
              <h2 className="text-lg sm:text-2xl md:text-3xl lg:text-[2rem] font-black uppercase tracking-tight text-white leading-snug max-w-4xl mx-auto">
                GET LISTED ON THE FASTEST GROWING ADULT ENTRETAINEMENT DISCOVERY HUB.
              </h2>
            </div>
            <PromoAudienceProof />
          </motion.div>

          <div className="mb-14">
            <TrustedByLeaders variant="green" />
          </div>

          <ErogramDevilGirlFooter />
        </main>

        <Footer />
      </div>
  );
}
