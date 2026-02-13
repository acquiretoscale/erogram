'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function About() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    setUsername(localStorage.getItem('username'));
  }, []);

  const fadeInUp = {
    initial: { opacity: 0, y: 60 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: 'easeOut' },
  };

  const staggerContainer = {
    animate: {
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#111111] overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#b31b1b] rounded-full blur-3xl opacity-10"
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 100, 0],
            y: [0, -100, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#b31b1b] rounded-full blur-3xl opacity-10"
          animate={{
            scale: [1.2, 1, 1.2],
            x: [0, -100, 0],
            y: [0, 100, 0],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>

      {/* Navigation */}
      <Navbar username={username} setUsername={setUsername} />

      {/* Main Content */}
      <motion.main
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="relative z-10 max-w-4xl mx-auto px-6 pt-20 pb-20"
      >
        <motion.div
          variants={fadeInUp}
          className="text-center mb-16"
        >
          <h1 className="text-5xl md:text-6xl font-black mb-6 leading-tight">
            <span className="gradient-text">What is</span>{' '}
            <span className="text-[#f5f5f5]">erogram?</span>
          </h1>
          <p className="text-xl md:text-2xl text-[#999] max-w-3xl mx-auto">
            The ultimate directory for NSFW Telegram communities and AI companions
          </p>
        </motion.div>

        <div className="space-y-8">
          <motion.div
            variants={fadeInUp}
            className="glass rounded-2xl p-8 hover-glow"
          >
            <h2 className="text-3xl font-bold mb-4 text-[#f5f5f5]">
              NSFW Telegram Directory & AI Companion Hub
            </h2>
            <p className="text-lg text-[#999] leading-relaxed">
              <span className="text-[#b31b1b] font-semibold">erogram</span> is
              the ultimate destination for discovering NSFW Telegram groups and AI companions. We
              provide a curated, safe, and comprehensive platform where you can
              find adult-oriented communities and intelligent chat bots that match your interests.
            </p>
          </motion.div>

          <motion.div
            variants={fadeInUp}
            className="glass rounded-2xl p-8 hover-glow"
          >
            <h2 className="text-3xl font-bold mb-4 text-[#f5f5f5]">
              What We Offer
            </h2>
            <ul className="space-y-4 text-lg text-[#999]">
              <li className="flex items-start">
                <span className="text-[#b31b1b] mr-3 text-2xl">•</span>
                <span>
                  <strong className="text-[#f5f5f5]">Dual Directory:</strong>{' '}
                  Thousands of verified NSFW Telegram groups and AI companion bots organized by
                  category and location
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-[#b31b1b] mr-3 text-2xl">•</span>
                <span>
                  <strong className="text-[#f5f5f5]">AI Companions:</strong>{' '}
                  Discover intelligent chat bots, roleplay companions, and adult entertainment bots
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-[#b31b1b] mr-3 text-2xl">•</span>
                <span>
                  <strong className="text-[#f5f5f5]">Smart Discovery:</strong>{' '}
                  Advanced search and filtering to find communities and bots that match your
                  specific interests
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-[#b31b1b] mr-3 text-2xl">•</span>
                <span>
                  <strong className="text-[#f5f5f5]">Safety First:</strong> All
                  groups and bots are verified and moderated to ensure a safe browsing
                  experience
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-[#b31b1b] mr-3 text-2xl">•</span>
                <span>
                  <strong className="text-[#f5f5f5]">Regular Updates:</strong>{' '}
                  New groups and bots are added daily by our community, keeping the
                  directory fresh and current
                </span>
              </li>
            </ul>
          </motion.div>

          <motion.div
            variants={fadeInUp}
            className="glass rounded-2xl p-8 hover-glow"
          >
            <h2 className="text-3xl font-bold mb-4 text-[#f5f5f5]">
              How It Works
            </h2>
            <p className="text-lg text-[#999] leading-relaxed mb-4">
              Browse our extensive collection of NSFW Telegram groups and AI companion bots by category,
              country, or use our search feature to find exactly what you're
              looking for. Each listing provides key information including
              description, popularity metrics, and verification status.
            </p>
            <p className="text-lg text-[#999] leading-relaxed mb-4">
              For <strong className="text-[#f5f5f5]">groups</strong>, click to join and
              connect with like-minded individuals in private, secure Telegram
              communities. For <strong className="text-[#f5f5f5]">bots</strong>, click to start
              chatting with your new AI companion instantly.
            </p>
            <p className="text-lg text-[#999] leading-relaxed">
              Whether you're looking for community connections or intelligent conversation partners,
              erogram has everything you need in one convenient location.
            </p>
          </motion.div>

          <motion.div
            variants={fadeInUp}
            className="glass rounded-2xl p-8 hover-glow"
          >
            <h2 className="text-3xl font-bold mb-4 text-[#f5f5f5]">
              Contact Us
            </h2>
            <p className="text-lg text-[#999] leading-relaxed mb-4">
              Have questions, suggestions, or need assistance? We're here to help!
            </p>
            <div className="flex items-center gap-3 text-[#999]">
              <span className="text-2xl">📧</span>
              <a href="mailto:contact@eroverse.space" className="text-[#b31b1b] hover:underline text-lg">
                contact@eroverse.space
              </a>
            </div>
          </motion.div>

          <motion.div
            variants={fadeInUp}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-12"
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.push('/groups')}
              className="w-full sm:w-auto px-8 py-4 bg-[#b31b1b] hover-glow text-white rounded-lg text-lg font-semibold transition-all"
            >
              👥 Explore Groups
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.push('/bots')}
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg text-lg font-semibold transition-all hover-glow"
            >
              🤖 Explore Bots
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.push('/')}
              className="w-full sm:w-auto px-8 py-4 glass border border-[#b31b1b] text-[#b31b1b] rounded-lg text-lg font-semibold transition-all hover:bg-[#b31b1b]/10"
            >
              🏠 Back to Home
            </motion.button>
          </motion.div>
        </div>
      </motion.main>

      <Footer />
    </div>
  );
}

