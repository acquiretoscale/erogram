'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

export default function Footer() {
    const fadeInUp = {
        initial: { opacity: 0, y: 60 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.6, ease: 'easeOut' },
    };

    return (
        <motion.footer
            variants={fadeInUp}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="relative z-10 border-t border-white/5 mt-20 sm:mt-40 bg-[#0a0a0a]"
            style={{ willChange: 'transform, opacity' }}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 mb-16">
                    {/* Brand Column */}
                    <div className="space-y-6">
                        <Link href="/" className="block">
                            <span className="text-2xl font-black tracking-tighter text-white">
                                ero<span className="text-[#b31b1b]">gram</span>
                            </span>
                        </Link>
                        <p className="text-[#999] leading-relaxed">
                            The #1 Verified NSFW Directory.
                            <br />
                            Connect, explore, and indulge — safely and anonymously.
                        </p>
                        <div className="flex items-center gap-4">
                            <a
                                href="https://t.me/erogrampro"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-10 h-10 rounded-full glass flex items-center justify-center hover:bg-[#229ED9] hover:text-white transition-all duration-300 text-[#999]"
                                aria-label="Telegram"
                            >
                                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 11.944 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                                </svg>
                            </a>
                        </div>
                    </div>

                    {/* Discover Column */}
                    <div>
                        <h3 className="text-white font-bold mb-6">Discover</h3>
                        <ul className="space-y-4">
                            <li>
                                <Link href="/groups" className="text-[#999] hover:text-[#b31b1b] transition-colors">
                                    Telegram Groups
                                </Link>
                            </li>
                            <li>
                                <Link href="/bots" className="text-[#999] hover:text-[#b31b1b] transition-colors">
                                    AI Bots
                                </Link>
                            </li>
                            <li>
                                <Link href="/articles" className="text-[#999] hover:text-[#b31b1b] transition-colors">
                                    Articles & Guides
                                </Link>
                            </li>
                            <li>
                                <Link href="/best-telegram-groups/" className="text-[#999] hover:text-[#b31b1b] transition-colors">
                                    Top Lists
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Support Column */}
                    <div>
                        <h3 className="text-white font-bold mb-6">Support</h3>
                        <ul className="space-y-4">
                            <li>
                                <Link href="/about" className="text-[#999] hover:text-[#b31b1b] transition-colors">
                                    About Us
                                </Link>
                            </li>
                            <li>
                                <Link href="/privacy" className="text-[#999] hover:text-[#b31b1b] transition-colors">
                                    Privacy Policy
                                </Link>
                            </li>
                            <li>
                                <Link href="/terms" className="text-[#999] hover:text-[#b31b1b] transition-colors">
                                    Terms of Service
                                </Link>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-center items-center gap-4">
                    <div className="text-[#666] text-sm">
                        © {new Date().getUTCFullYear()} erogram. All rights reserved.
                    </div>
                </div>
            </div>
        </motion.footer>
    );
}
