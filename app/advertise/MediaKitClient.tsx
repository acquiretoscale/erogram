'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AdvertiseStats from './AdvertiseStats';
import HeroSection from './HeroSection';
import AudienceCountries from './AudienceCountries';
import OrganicGrowth from './OrganicGrowth';
import AdvertiseContactForm from './AdvertiseContactForm';
import TrustedByLeaders from './TrustedByLeaders';

export default function MediaKitClient() {
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUsername = localStorage.getItem('username');
      if (storedUsername) setUsername(storedUsername);
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f5f5f5] overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-to-b from-[#0ea5e9]/8 to-transparent rounded-full blur-[120px] opacity-40" />
          <div className="absolute bottom-0 right-0 w-[800px] h-[800px] bg-[#0ea5e9]/5 rounded-full blur-[140px] opacity-20" />
        </div>

        {/* Erogram global navigation */}
        <Navbar username={username} setUsername={setUsername} />

        {/* Page-specific sub-nav */}
        <div className="sticky top-[64px] z-20 border-b border-[#0ea5e9]/20 bg-[#0a0a0a]/95 backdrop-blur-md">
          <div className="max-w-5xl mx-auto px-4 sm:px-8 flex items-center gap-1 sm:gap-2 overflow-x-auto scrollbar-none py-2">
            <span className="shrink-0 text-[10px] font-black uppercase tracking-widest text-[#0ea5e9] mr-2 hidden sm:block">Media Kit</span>
            <a href="#audience-stats" className="whitespace-nowrap px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white/50 hover:text-white hover:bg-white/10 transition-all">
              Audience Stats
            </a>
            <a href="#contact-form" className="whitespace-nowrap px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white/50 hover:text-white hover:bg-white/10 transition-all">
              Contact
            </a>
          </div>
        </div>

        <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-8 pt-8 sm:pt-14 pb-20">
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
            <div className="flex items-center gap-3 mb-5">
              <div className="w-1 h-5 bg-gradient-to-b from-[#0ea5e9] to-[#0369a1]" />
              <h3 className="text-xl font-black text-[#f5f5f5]">Erogram Website</h3>
            </div>
            <AudienceCountries />
            <OrganicGrowth />
          </motion.div>

          {/* Contact form */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="scroll-mt-28 mb-14"
          >
            <TrustedByLeaders />
            <div id="contact-form" className="scroll-mt-28 mt-10 max-w-2xl mx-auto p-6 sm:p-8" style={{ background: 'linear-gradient(180deg, #0c2d48 0%, #0a1929 100%)', border: '3px solid #0ea5e9', boxShadow: '6px 6px 0px #0ea5e9' }}>
              <div className="text-center mb-6">
                <h3 className="text-xl sm:text-2xl font-black text-white">Have a question?</h3>
                <p className="mt-1 text-sm text-white/50">
                  Send us a message and we&apos;ll get back to you shortly.
                </p>
              </div>
              <AdvertiseContactForm />
            </div>
          </motion.section>

        </main>

        <Footer />
      </div>
  );
}
