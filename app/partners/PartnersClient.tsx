'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { LINK_EXCHANGE_PARTNERS } from '@/lib/partners/linkExchangePartners';

export default function PartnersClient() {
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    setUsername(localStorage.getItem('username'));
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f5f5f5]">
      <Navbar username={username} setUsername={setUsername} />

      <main className="mx-auto max-w-5xl px-4 pb-16 pt-28 sm:px-8">
        <div className="mb-5 flex items-center gap-1.5 text-xs text-gray-500">
          <Link href="/" className="transition-colors hover:text-white">
            Home
          </Link>
          <span>/</span>
          <span className="font-semibold text-white">Partners</span>
        </div>

        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mb-8 text-center text-3xl font-black tracking-tight text-white sm:mb-10 sm:text-4xl"
        >
          Partners
        </motion.h1>

        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5">
          {LINK_EXCHANGE_PARTNERS.map((partner, index) => (
            <motion.li
              key={partner.href}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.05 + index * 0.05 }}
            >
              <a
                href={partner.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group block h-full"
                aria-label={partner.name}
              >
                <div className="flex h-full min-h-[140px] items-center justify-center rounded-2xl border border-white/[0.08] bg-white px-6 py-10 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-white/25 group-hover:shadow-[0_16px_40px_rgba(0,0,0,0.35)] sm:min-h-[160px] sm:px-8 sm:py-12">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={partner.logo}
                    alt={`${partner.name} logo`}
                    className="h-12 w-auto max-w-[220px] object-contain sm:h-14"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              </a>
            </motion.li>
          ))}
        </ul>
      </main>

      <Footer />
    </div>
  );
}
