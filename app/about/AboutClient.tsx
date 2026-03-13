'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useTranslation, useLocalePath } from '@/lib/i18n';

export default function AboutClient() {
  const router = useRouter();
  const { t } = useTranslation();
  const lp = useLocalePath();
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

      <Navbar username={username} setUsername={setUsername} />

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
            <span className="gradient-text">{t('about.whatIs')}</span>{' '}
            <span className="text-[#f5f5f5]">{t('about.erogram')}</span>
          </h1>
          <p className="text-xl md:text-2xl text-[#999] max-w-3xl mx-auto">
            {t('about.subtitle')}
          </p>
        </motion.div>

        <div className="space-y-8">
          <motion.div
            variants={fadeInUp}
            className="glass rounded-2xl p-8 hover-glow"
          >
            <h2 className="text-3xl font-bold mb-4 text-[#f5f5f5]">
              {t('about.hubTitle')}
            </h2>
            <p className="text-lg text-[#999] leading-relaxed">
              {t('about.hubDesc')}
            </p>
          </motion.div>

          <motion.div
            variants={fadeInUp}
            className="glass rounded-2xl p-8 hover-glow"
          >
            <h2 className="text-3xl font-bold mb-4 text-[#f5f5f5]">
              {t('about.whatWeOffer')}
            </h2>
            <ul className="space-y-4 text-lg text-[#999]">
              <li className="flex items-start">
                <span className="text-[#b31b1b] mr-3 text-2xl">•</span>
                <span>
                  <strong className="text-[#f5f5f5]">{t('about.dualDir')}</strong>{' '}
                  {t('about.dualDirDesc')}
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-[#b31b1b] mr-3 text-2xl">•</span>
                <span>
                  <strong className="text-[#f5f5f5]">{t('about.aiComp')}</strong>{' '}
                  {t('about.aiCompDesc')}
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-[#b31b1b] mr-3 text-2xl">•</span>
                <span>
                  <strong className="text-[#f5f5f5]">{t('about.smartDisc')}</strong>{' '}
                  {t('about.smartDiscDesc')}
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-[#b31b1b] mr-3 text-2xl">•</span>
                <span>
                  <strong className="text-[#f5f5f5]">{t('about.safety')}</strong>{' '}
                  {t('about.safetyDesc')}
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-[#b31b1b] mr-3 text-2xl">•</span>
                <span>
                  <strong className="text-[#f5f5f5]">{t('about.updates')}</strong>{' '}
                  {t('about.updatesDesc')}
                </span>
              </li>
            </ul>
          </motion.div>

          <motion.div
            variants={fadeInUp}
            className="glass rounded-2xl p-8 hover-glow"
          >
            <h2 className="text-3xl font-bold mb-4 text-[#f5f5f5]">
              {t('about.howItWorks')}
            </h2>
            <p className="text-lg text-[#999] leading-relaxed mb-4">
              {t('about.howP1')}
            </p>
            <p className="text-lg text-[#999] leading-relaxed mb-4">
              {t('about.howP2')}
            </p>
            <p className="text-lg text-[#999] leading-relaxed">
              {t('about.howP3')}
            </p>
          </motion.div>

          <motion.div
            variants={fadeInUp}
            className="glass rounded-2xl p-8 hover-glow"
          >
            <h2 className="text-3xl font-bold mb-4 text-[#f5f5f5]">
              {t('about.contactUs')}
            </h2>
            <p className="text-lg text-[#999] leading-relaxed mb-4">
              {t('about.contactDesc')}
            </p>
            <div className="flex items-center gap-3 text-[#999]">
              <span className="text-2xl">📧</span>
              <a href="mailto:erogrampro@gmail.com" className="text-[#b31b1b] hover:underline text-lg">
                erogrampro@gmail.com
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
              onClick={() => router.push(lp('/groups'))}
              className="w-full sm:w-auto px-8 py-4 bg-[#b31b1b] hover-glow text-white rounded-lg text-lg font-semibold transition-all"
            >
              👥 {t('about.exploreGroups')}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.push(lp('/bots'))}
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg text-lg font-semibold transition-all hover-glow"
            >
              🤖 {t('about.exploreBots')}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.push(lp('/'))}
              className="w-full sm:w-auto px-8 py-4 glass border border-[#b31b1b] text-[#b31b1b] rounded-lg text-lg font-semibold transition-all hover:bg-[#b31b1b]/10"
            >
              🏠 {t('about.backHome')}
            </motion.button>
          </motion.div>
        </div>
      </motion.main>

      <Footer />
    </div>
  );
}
