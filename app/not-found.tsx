'use client';

import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { motion } from 'framer-motion';

export default function NotFound() {
    return (
        <div className="min-h-screen bg-[#0a0a0a] text-[#f5f5f5] font-sans selection:bg-[#b31b1b] selection:text-white">
            <Navbar />

            <main className="flex flex-col items-center justify-center min-h-[80vh] px-4 text-center relative overflow-hidden">
                {/* Background Effects */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/20 blur-[100px] rounded-full pointer-events-none"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-purple-600/20 blur-[80px] rounded-full pointer-events-none"></div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="relative z-10"
                >
                    <h1 className="text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 mb-4">
                        404
                    </h1>
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                        Page Not Found
                    </h2>
                    <p className="text-gray-400 text-lg md:text-xl max-w-lg mx-auto mb-10">
                        Oops! The page you are looking for has vanished into the digital void.
                        It might have been moved, deleted, or never existed.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            href="/"
                            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-900/20 hover:-translate-y-1"
                        >
                            Return Home 🏠
                        </Link>
                        <Link
                            href="/groups"
                            className="px-8 py-4 bg-[#1a1a1a] hover:bg-[#222] border border-white/10 text-white font-bold rounded-xl transition-all hover:border-white/20 hover:-translate-y-1"
                        >
                            Browse Groups 🔍
                        </Link>
                    </div>
                </motion.div>
            </main>
        </div>
    );
}
