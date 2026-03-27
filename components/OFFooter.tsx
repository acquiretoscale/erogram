'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { RtaBadge } from './AgeGate';
import { ofCategoryUrl, OF_CATEGORIES } from '@/app/onlyfanssearch/constants';

export default function OFFooter() {
  return (
    <motion.footer
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="relative z-10 border-t border-white/[0.06] bg-[#0a0a0a]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-16">

        {/* Top grid — brand + columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">

          {/* Brand */}
          <div className="space-y-4 lg:col-span-1">
            <Link href="/" className="block">
              <span className="text-2xl font-black tracking-tighter text-white">
                ero<span className="text-[#00AFF0]">gram</span>
              </span>
            </Link>
            <p className="text-[#888] text-sm leading-relaxed">
              The #1 NSFW Hub.<br />
              Connect, explore, and indulge — safely and anonymously.
            </p>
            <a
              href="https://t.me/erogrampro"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-9 h-9 rounded-full border border-white/10 items-center justify-center text-[#888] hover:bg-[#00AFF0]/15 hover:text-[#00AFF0] hover:border-[#00AFF0]/30 transition-all"
              aria-label="Telegram"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 11.944 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
              </svg>
            </a>
          </div>

          {/* Discover */}
          <div>
            <h3 className="text-white text-sm font-bold uppercase tracking-wider mb-5">Discover</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/onlyfanssearch" className="text-[#888] text-sm hover:text-[#00AFF0] transition-colors">
                  OnlyFans Search
                </Link>
              </li>
              <li>
                <Link href="/best-onlyfans-creators" className="text-[#888] text-sm hover:text-[#00AFF0] transition-colors">
                  Best OnlyFans Creators
                </Link>
              </li>
              <li>
                <Link href="/best-onlyfans-accounts" className="text-[#888] text-sm hover:text-[#00AFF0] transition-colors">
                  Best OnlyFans Accounts
                </Link>
              </li>
              {OF_CATEGORIES.slice(0, 6).map((cat) => (
                <li key={cat.slug}>
                  <Link href={ofCategoryUrl(cat.slug)} className="text-[#888] text-sm hover:text-[#00AFF0] transition-colors">
                    {cat.name} OnlyFans
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Advertise */}
          <div>
            <h3 className="text-white text-sm font-bold uppercase tracking-wider mb-5">Advertise</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/ofmads" className="text-[#888] text-sm hover:text-[#00AFF0] transition-colors">
                  OFM Boost
                </Link>
              </li>
              <li>
                <Link href="/advertise" className="text-[#888] text-sm hover:text-[#00AFF0] transition-colors">
                  Advertise with Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-white text-sm font-bold uppercase tracking-wider mb-5">Support</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/about" className="text-[#888] text-sm hover:text-[#00AFF0] transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-[#888] text-sm hover:text-[#00AFF0] transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-[#888] text-sm hover:text-[#00AFF0] transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-[#888] text-sm hover:text-[#00AFF0] transition-colors">
                  Contact & Support
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/[0.05] pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[#555] text-xs">
            © {new Date().getUTCFullYear()} Erogram.pro — OnlyFans Creator Directory
          </p>
          <RtaBadge size="lg" />
        </div>

      </div>
    </motion.footer>
  );
}
