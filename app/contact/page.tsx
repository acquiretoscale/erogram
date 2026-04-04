'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const contacts = [
  {
    department: 'General Support',
    description: 'Questions, account issues, or anything else.',
    email: 'support@erogram.biz',
    href: 'mailto:support@erogram.biz',
  },
  {
    department: 'Content Removal',
    description: 'DMCA requests, privacy concerns, takedown inquiries.',
    email: 'removal@erogram.biz',
    href: 'mailto:removal@erogram.biz',
  },
  {
    department: 'Partnership & Advertising',
    description: 'Ad placements, sponsorships, and brand collaborations.',
    email: 'isabella@erogram.biz',
    href: 'mailto:isabella@erogram.biz',
  },
  {
    department: 'Telegram',
    description: 'For direct messages and urgent matters.',
    email: '@RVN8888',
    href: 'https://t.me/RVN8888',
    external: true,
  },
];

export default function ContactPage() {
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    setUsername(localStorage.getItem('username'));
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f5f5f5]">
      <Navbar username={username} setUsername={setUsername} />

      <main className="max-w-3xl mx-auto px-4 sm:px-8 pt-28 pb-28">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-16"
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#b31b1b] mb-4">Contact</p>
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-tight mb-4">
            Get in touch.
          </h1>
        </motion.div>

        {/* Contact list */}
        <div className="divide-y divide-white/[0.06]">
          {contacts.map((c, i) => (
            <motion.a
              key={c.department}
              href={c.href}
              target={c.external ? '_blank' : undefined}
              rel={c.external ? 'noopener noreferrer' : undefined}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.1 + i * 0.07 }}
              className="group flex items-center justify-between py-6 gap-6 hover:bg-white/[0.02] -mx-4 px-4 transition-colors duration-150"
            >
              <div>
                <p className="text-base font-bold text-white mb-1">{c.department}</p>
                <p className="text-sm text-[#555]">{c.description}</p>
              </div>
              <div className="shrink-0 flex items-center gap-3">
                <span className="text-sm font-mono text-[#444] group-hover:text-[#b31b1b] transition-colors duration-150">
                  {c.email}
                </span>
                <span className="text-[#b31b1b] opacity-0 group-hover:opacity-100 transition-opacity duration-150 text-base font-bold">→</span>
              </div>
            </motion.a>
          ))}
        </div>

      </main>

      <Footer />
    </div>
  );
}
