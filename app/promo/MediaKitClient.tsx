'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import ErogramDiscoveryBanner from '@/components/ErogramDiscoveryBanner';
import ErogramDevilGirlFooter from '@/components/ErogramDevilGirlFooter';
import Footer from '@/components/Footer';
import AdvertiseStats from './AdvertiseStats';
import PromoAudienceProof from './PromoAudienceProof';
import PartnershipStats from '../partnership/PartnershipStats';
import TrustedByLeaders from '../advertise/TrustedByLeaders';
import { PROMO_BORDER, PROMO_CTA, PROMO_SHADOW, PROMO_HEADER_BG, PROMO_ACCENT } from './promoTheme';

function GetInTouchButton({ href = '#contact' }: { href?: string }) {
  return (
    <a
      href={href}
      className="inline-flex w-full sm:w-auto items-center justify-center px-8 py-3.5 text-base sm:text-sm font-black uppercase tracking-widest text-black transition-all hover:brightness-105 active:translate-x-[2px] active:translate-y-[2px]"
      style={{ background: PROMO_CTA, border: PROMO_BORDER, boxShadow: PROMO_SHADOW }}
    >
      GET IN TOUCH
    </a>
  );
}

function PromoContactBlock({ id }: { id?: string }) {
  return (
    <section id={id} className="scroll-mt-28 max-w-2xl mx-auto w-full">
      <div
        className="rounded-xl px-6 py-8 sm:px-8 sm:py-10 text-center"
        style={{
          background: PROMO_HEADER_BG,
          border: `3px solid ${PROMO_ACCENT}`,
          boxShadow: `6px 6px 0px ${PROMO_ACCENT}`,
        }}
      >
        <p className="text-base sm:text-lg text-white/70 leading-relaxed mb-7 max-w-lg mx-auto">
          Need help? Have a question? Don&apos;t hesitate to get in touch:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto">
          <a
            href="mailto:isabella@erogram.biz"
            className="group flex flex-col items-center justify-center gap-2 rounded-lg bg-white px-5 py-5 text-center transition-transform hover:-translate-y-0.5"
            style={{ border: PROMO_BORDER, boxShadow: PROMO_SHADOW }}
          >
            <span className="text-2xl leading-none" aria-hidden="true">✉️</span>
            <span className="text-xs font-black uppercase tracking-[0.18em] text-black/40">Email</span>
            <span className="text-base sm:text-lg font-black text-black break-all">isabella@erogram.biz</span>
          </a>
          <a
            href="https://t.me/erogramDOTpro"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col items-center justify-center gap-2 rounded-lg px-5 py-5 text-center text-black transition-transform hover:-translate-y-0.5"
            style={{ background: PROMO_CTA, border: PROMO_BORDER, boxShadow: PROMO_SHADOW }}
          >
            <svg className="w-7 h-7 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.820 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" /></svg>
            <span className="text-xs font-black uppercase tracking-[0.18em] text-black/50">Telegram</span>
            <span className="text-base sm:text-lg font-black text-black">@erogramDOTpro</span>
          </a>
        </div>
      </div>
    </section>
  );
}

export default function MediaKitClient({
  aiNsfwCount,
  groupsAndBotsCount,
  totalUsers,
}: {
  aiNsfwCount: number;
  groupsAndBotsCount: number;
  totalUsers: number;
}) {
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

        <div id="audience-stats" className="max-w-5xl mx-auto px-4 sm:px-8 mb-8">
          <AdvertiseStats />
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-8 mb-8">
          <PartnershipStats
            aiNsfwCount={aiNsfwCount}
            groupsAndBotsCount={groupsAndBotsCount}
            totalUsers={totalUsers}
          />
        </div>

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
          <p className="text-xl sm:text-2xl font-black text-white leading-snug">
            1.8M+ content creators
          </p>
          <div className="pt-2 flex flex-col items-center gap-6">
            <GetInTouchButton href="#contact" />
            <PromoContactBlock id="contact" />
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-8 mb-10">
          <TrustedByLeaders variant="green" />
        </div>

        <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-8 pt-2 sm:pt-4 pb-4">
          <div className="flex justify-center mb-10 sm:mb-12">
            <GetInTouchButton href="#contact-bottom" />
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
                GET IN TOUCH.
              </h2>
            </div>
            <PromoAudienceProof />
          </motion.div>

          <div className="mb-14">
            <TrustedByLeaders variant="green" />
          </div>

          <div className="mb-14">
            <PromoContactBlock id="contact-bottom" />
          </div>

          <ErogramDevilGirlFooter />
        </main>

        <Footer />
      </div>
  );
}
