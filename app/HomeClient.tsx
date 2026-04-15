'use client';

import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { shouldUseLightAnimations, animationClasses, getStaggerDelay } from '@/lib/utils/animations';
import Footer from '@/components/Footer';

import AdBanner from '@/components/AdBanner';
import HeaderBanner from '@/components/HeaderBanner';
import { formatDate } from '@/lib/i18n/date';
import type { Locale } from '@/lib/i18n/config';
import { useTranslation, useLocalePath } from '@/lib/i18n/client';

// Lazy load non-critical components
const Navbar = dynamic(() => import('@/components/Navbar'), {
  // IMPORTANT: Navbar is `position: fixed`, so the loading placeholder must also be fixed.
  // Otherwise the placeholder takes layout space and is removed on load => massive CLS.
  loading: () => (
    <div
      aria-hidden
      className="fixed top-0 left-0 right-0 z-50 h-[72px] border-b border-[#333] bg-[#111111]/95 backdrop-blur-md pointer-events-none"
    />
  )
});

interface Article {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  featuredImage: string;
  tags: string[];
  publishedAt: string | null;
  views: number;
  author: {
    _id: string;
    username: string;
  };
}

interface NewGroup {
  _id: string;
  name: string;
  slug: string;
  image: string;
  category: string;
  country: string;
  description: string;
  memberCount: number;
  views: number;
}

interface CampaignData {
  _id: string;
  creative: string;
  destinationUrl: string;
  slot: string;
}

interface SiteStats {
  groupCount: number;
  botCount: number;
  totalMembers: number;
  totalViews: number;
}

interface HomeClientProps {
  featuredArticles: Article[];
  heroCampaigns?: CampaignData[];
  newGroups?: NewGroup[];
  stats?: SiteStats;
  locale?: Locale;
}

const GROUP_BASE = 4_000;
const ACTIVE_USERS_POLL = 300_000;

function useCountUp(target: number, duration = 1800) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!ref.current || started.current || target <= 0) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const tick = (now: number) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setValue(Math.round(eased * target));
            if (progress < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);

  return { value, ref };
}

function LiveStatCard({ target, label, icon }: { target: number; label: string; icon: string }) {
  const { value, ref } = useCountUp(target);
  const [display, setDisplay] = useState(target);

  useEffect(() => {
    if (value < target) {
      setDisplay(value);
      return;
    }
    setDisplay(target);
    const interval = setInterval(() => {
      setDisplay((prev) => {
        const drift = Math.random() < 0.5 ? 1 : -1;
        return Math.max(target - 2, prev + drift);
      });
    }, 3000 + Math.random() * 4000);
    return () => clearInterval(interval);
  }, [value, target]);

  return (
    <div
      ref={ref}
      className="glass rounded-xl sm:rounded-2xl px-3 py-3 sm:p-5 text-center hover-glow transition-all duration-300 border-white/5 bg-white/[0.02]"
    >
      <div className="text-[17px] sm:text-2xl md:text-3xl font-bold text-white mb-0.5 tracking-tight tabular-nums leading-tight">
        {display.toLocaleString('en-US')}
      </div>
      <div className="flex items-center justify-center gap-1 sm:gap-1.5 text-white/40 text-[10px] sm:text-xs font-semibold uppercase tracking-wider">
        <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 bg-green-500" />
        </span>
        {label}
      </div>
    </div>
  );
}

function useActiveUsers() {
  const [count, setCount] = useState<number>(0);
  useEffect(() => {
    const fetchActive = () => {
      fetch('/api/advertise-stats', { cache: 'no-store' })
        .then(r => r.json())
        .then(d => { if (typeof d.activeVisitors === 'number') setCount(d.activeVisitors); })
        .catch(() => {});
    };
    fetchActive();
    const id = setInterval(fetchActive, ACTIVE_USERS_POLL);
    return () => clearInterval(id);
  }, []);
  return count;
}

export default function HomeClient({ featuredArticles, heroCampaigns = [], newGroups = [], stats, locale = 'en' }: HomeClientProps) {
  const { t, dict } = useTranslation();
  const lp = useLocalePath();
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);
  const [useLightAnimations, setUseLightAnimations] = useState(false);
  const activeUsers = useActiveUsers();
  useEffect(() => {
    // Client-only: read from localStorage (avoid breaking SSR and restricted envs)
    try {
      if (typeof window !== 'undefined') {
        setUsername(window.localStorage.getItem('username'));
        setUseLightAnimations(shouldUseLightAnimations());
      }
    } catch {
      // Ignore storage access errors (privacy modes, blocked storage, etc.)
    }

    // Defer analytics scripts until user interaction
    const loadAnalytics = () => {
      try {
        if (typeof document === 'undefined') return;
        if (!document.querySelector('script[data-ahrefs-analytics]')) {
          const s = document.createElement('script');
          s.src = 'https://analytics.ahrefs.com/analytics.js';
          s.async = true;
          s.setAttribute('data-key', 'CJGEsTnW9vzpHo3UhOPWDg');
          s.setAttribute('data-ahrefs-analytics', '1');
          document.head.appendChild(s);
          console.log('[Analytics] Ahrefs analytics script injected');
        }
      } catch (e) {
        console.warn('[Analytics] Failed to inject Ahrefs script', e);
      }
    };

    // Load analytics on scroll or after 3 seconds as fallback
    const handleScroll = () => {
      loadAnalytics();
      window.removeEventListener('scroll', handleScroll);
    };

    // Client-only guards (should always be true in useEffect, but keeps this safe)
    if (typeof window === 'undefined') return;

    window.addEventListener('scroll', handleScroll, { passive: true });

    const fallbackTimer = setTimeout(() => {
      loadAnalytics();
      window.removeEventListener('scroll', handleScroll);
    }, 3000);

    return () => {
      clearTimeout(fallbackTimer);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const fadeInUp = {
    initial: { opacity: 0, y: 60 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: 'easeOut' },
  };


  return (
    <div className="min-h-screen bg-[#111111] overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-to-b from-[#ff0000]/10 to-transparent rounded-full blur-[100px] opacity-30"></div>
        <div className="absolute bottom-0 right-0 w-[800px] h-[800px] bg-[#ff3366]/5 rounded-full blur-[120px] opacity-20"></div>
      </div>

      {/* Navigation */}
      <Navbar username={username} setUsername={setUsername} />

      {/* Hero Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-16 sm:pt-28 pb-20">
        {/* Homepage Hero Banner – same style as header horizontal ads (Groups/Bots/Articles): 900×250, no crop, no label */}
        {heroCampaigns.length > 0 && (
          <div className="w-full mb-8">
            <HeaderBanner campaigns={heroCampaigns} />
          </div>
        )}

        <div className="text-center max-w-4xl mx-auto">
          {useLightAnimations ? (
            <>
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full glass border-white/10 bg-white/5 mb-4 sm:mb-8 ${animationClasses.fadeInUp}`}>
                <span className="w-2 h-2 rounded-full bg-[#ff3366] animate-pulse"></span>
                <span className="text-sm font-medium text-white/80">{t('home.badge', 'The #1 NSFW & Porn Telegram and AI Directory')}</span>
              </div>
              <h1 className={`text-3xl sm:text-5xl md:text-6xl font-black mb-4 sm:mb-8 leading-tight tracking-tight ${animationClasses.fadeInUp}`} style={{ animationDelay: '0.1s' }}>
                <span className="text-[#f5f5f5]">{t('home.heroTitle1', 'Best Telegram Porn & NSFW Groups,')}</span>
                <span className="block sm:inline"> </span>
                <span className="gradient-text">{t('home.heroTitle2', 'Bots & AI Tools Directory')}</span>
              </h1>
            </>
          ) : (
            <>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border-white/10 bg-white/5 mb-4 sm:mb-8"
              >
                <span className="w-2 h-2 rounded-full bg-[#ff3366] animate-pulse"></span>
                <span className="text-sm font-medium text-white/80">{t('home.badge', 'The #1 NSFW & Porn Telegram and AI Directory')}</span>
              </motion.div>
              <motion.h1
                className="text-3xl sm:text-5xl md:text-6xl font-black mb-4 sm:mb-8 leading-tight tracking-tight"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.2, 0.8, 0.2, 1], delay: 0.1 }}
                style={{ willChange: 'transform, opacity' }}
              >
                <span className="text-[#f5f5f5]">{t('home.heroTitle1', 'Best Telegram Porn & NSFW Groups,')}</span>
                <span className="block sm:inline"> </span>
                <span className="gradient-text">{t('home.heroTitle2', 'Bots & AI Tools Directory')}</span>
              </motion.h1>
            </>
          )}

          {useLightAnimations ? (
            <p className={`text-base sm:text-xl md:text-2xl text-[#999] mb-6 sm:mb-10 max-w-3xl mx-auto px-4 leading-relaxed ${animationClasses.fadeInUp}`} style={{ animationDelay: '0.2s' }}>
              {t('home.heroDesc1', 'Your #1 hub for NSFW Telegram groups & bots, AI companions & tools, and 1.8M+ OnlyFans creators.')}{' '}
              {t('home.heroDesc2', 'Explore and save your favorites all in one place.')}
            </p>
          ) : (
            <motion.p
              className="text-base sm:text-xl md:text-2xl text-[#999] mb-6 sm:mb-10 max-w-3xl mx-auto px-4 leading-relaxed"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.2, 0.8, 0.2, 1], delay: 0.2 }}
              style={{ willChange: 'transform, opacity' }}
            >
              {t('home.heroDesc1', 'Your #1 hub for NSFW Telegram groups & bots, AI companions & tools, and 1.8M+ OnlyFans creators.')}{' '}
              {t('home.heroDesc2', 'Explore and save your favorites all in one place.')}
            </motion.p>
          )}

          {useLightAnimations ? (
            <div className={`flex flex-wrap sm:flex-nowrap gap-2 sm:gap-2.5 md:gap-4 justify-center items-center w-full mb-6 sm:mb-8 ${animationClasses.fadeInUp}`} style={{ animationDelay: '0.4s' }}>
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setTimeout(() => router.push(lp('/groups')), 0); }}
                className="flex-1 sm:flex-initial sm:w-auto flex items-center justify-center gap-1.5 md:gap-2.5 px-4 py-2.5 md:px-8 md:py-4 bg-[#0088cc] border border-[#0088cc] text-white hover:bg-[#009dd9] hover:border-[#009dd9] rounded-lg md:rounded-xl text-[14px] md:text-lg font-semibold transition-all hover:scale-105 whitespace-nowrap"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" className="shrink-0 md:!w-5 md:!h-5">
                  <path d="M20.665 3.717l-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701h-.002l.002.001-.314 4.692c.46 0 .663-.211.921-.46l2.211-2.15 4.599 3.397c.848.467 1.457.227 1.668-.785l3.019-14.228c.309-1.239-.473-1.8-1.282-1.434z"/>
                </svg>
                Explore Groups
              </button>
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setTimeout(() => router.push(lp('/bots')), 0); }}
                className="flex-1 sm:flex-initial sm:w-auto flex items-center justify-center gap-1.5 md:gap-2.5 px-4 py-2.5 md:px-8 md:py-4 bg-[#0088cc] border border-[#0088cc] text-white hover:bg-[#009dd9] hover:border-[#009dd9] rounded-lg md:rounded-xl text-[14px] md:text-lg font-semibold transition-all hover:scale-105 whitespace-nowrap"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 md:!w-5 md:!h-5">
                  <rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="9" cy="16" r="1"/><circle cx="15" cy="16" r="1"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>
                </svg>
                Explore Bots
              </button>
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setTimeout(() => router.push(lp('/ainsfw')), 0); }}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 md:gap-2.5 px-4 py-2.5 md:px-8 md:py-4 bg-[#0088cc] border border-[#0088cc] text-white hover:bg-[#009dd9] hover:border-[#009dd9] rounded-lg md:rounded-xl text-[14px] md:text-lg font-semibold transition-all hover:scale-105 whitespace-nowrap"
              >
                <span className="text-sm md:text-lg leading-none shrink-0">🔞</span>
                Explore AI NSFW
              </button>
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setTimeout(() => router.push('/onlyfanssearch'), 0); }}
                className="relative w-full sm:w-auto px-4 py-2.5 sm:px-5 md:px-8 md:py-4 bg-[#00AFF0] hover:bg-[#009dd9] text-white rounded-lg md:rounded-xl transition-all hover:scale-105 flex items-center justify-center gap-1.5 md:gap-2.5 whitespace-nowrap"
              >
                <span className="text-[14px] md:text-lg font-semibold">
                  <span className="font-black">ONLYFANS SEARCH</span> +1.8M creators
                </span>
              </button>
            </div>
                      ) : (
            <motion.div
              className="flex flex-wrap sm:flex-nowrap gap-2 sm:gap-2.5 md:gap-4 justify-center items-center w-full mb-6 sm:mb-8"
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut', delay: 0.4 }}
              style={{ willChange: 'transform, opacity' }}
            >
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setTimeout(() => router.push(lp('/groups')), 0); }}
                className="flex-1 sm:flex-initial sm:w-auto flex items-center justify-center gap-1.5 md:gap-2.5 px-4 py-2.5 md:px-8 md:py-4 bg-[#0088cc] border border-[#0088cc] text-white hover:bg-[#009dd9] hover:border-[#009dd9] rounded-lg md:rounded-xl text-[14px] md:text-lg font-semibold transition-all hover:scale-105 whitespace-nowrap"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" className="shrink-0 md:!w-5 md:!h-5">
                  <path d="M20.665 3.717l-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701h-.002l.002.001-.314 4.692c.46 0 .663-.211.921-.46l2.211-2.15 4.599 3.397c.848.467 1.457.227 1.668-.785l3.019-14.228c.309-1.239-.473-1.8-1.282-1.434z"/>
                </svg>
                Explore Groups
              </button>
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setTimeout(() => router.push(lp('/bots')), 0); }}
                className="flex-1 sm:flex-initial sm:w-auto flex items-center justify-center gap-1.5 md:gap-2.5 px-4 py-2.5 md:px-8 md:py-4 bg-[#0088cc] border border-[#0088cc] text-white hover:bg-[#009dd9] hover:border-[#009dd9] rounded-lg md:rounded-xl text-[14px] md:text-lg font-semibold transition-all hover:scale-105 whitespace-nowrap"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 md:!w-5 md:!h-5">
                  <rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="9" cy="16" r="1"/><circle cx="15" cy="16" r="1"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>
                </svg>
                Explore Bots
              </button>
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setTimeout(() => router.push(lp('/ainsfw')), 0); }}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 md:gap-2.5 px-4 py-2.5 md:px-8 md:py-4 bg-[#0088cc] border border-[#0088cc] text-white hover:bg-[#009dd9] hover:border-[#009dd9] rounded-lg md:rounded-xl text-[14px] md:text-lg font-semibold transition-all hover:scale-105 whitespace-nowrap"
              >
                <span className="text-sm md:text-lg leading-none shrink-0">🔞</span>
                Explore AI NSFW
              </button>
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setTimeout(() => router.push('/onlyfanssearch'), 0); }}
                className="relative w-full sm:w-auto px-4 py-2.5 sm:px-5 md:px-8 md:py-4 bg-[#00AFF0] hover:bg-[#009dd9] text-white rounded-lg md:rounded-xl transition-all hover:scale-105 flex items-center justify-center gap-1.5 md:gap-2.5 whitespace-nowrap"
              >
                <span className="text-[14px] md:text-lg font-semibold">
                  <span className="font-black">ONLYFANS SEARCH</span> +1.8M creators
                </span>
              </button>
            </motion.div>
          )}

          {/* Stats — live counters, tight under CTA */}
          {useLightAnimations ? (
            <div className={`grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 max-w-4xl mx-auto ${animationClasses.fadeInUp}`} style={{ animationDelay: '0.5s' }}>
              <div className="glass rounded-xl sm:rounded-2xl px-3 py-3 sm:p-5 text-center hover-glow transition-all duration-300 border-white/5 bg-white/[0.02]">
                <div className="text-[17px] sm:text-2xl md:text-3xl font-bold text-white mb-0.5 tracking-tight leading-tight">+5K</div>
                <div className="text-white/40 text-[10px] sm:text-xs font-semibold uppercase tracking-wider">{t('home.statsGroups', 'Groups')}</div>
              </div>
              <LiveStatCard target={activeUsers} label="Visiting Now" icon="" />
              <LiveStatCard target={stats?.totalViews ?? 0} label={t('home.statsViews', 'Views')} icon="" />
              <div className="glass rounded-xl sm:rounded-2xl px-3 py-3 sm:p-5 text-center hover-glow transition-all duration-300 border-white/5 bg-white/[0.02]">
                <div className="text-[17px] sm:text-2xl md:text-3xl font-bold text-white mb-0.5 tracking-tight leading-tight">+1.8M</div>
                <div className="text-white/40 text-[10px] sm:text-xs font-semibold uppercase tracking-wider">OnlyFans Creators</div>
              </div>
            </div>
          ) : (
            <motion.div
              className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 max-w-4xl mx-auto"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut', delay: 0.5 }}
              style={{ willChange: 'transform, opacity' }}
            >
              <div className="glass rounded-xl sm:rounded-2xl px-3 py-3 sm:p-5 text-center hover-glow transition-all duration-300 border-white/5 bg-white/[0.02]">
                <div className="text-[17px] sm:text-2xl md:text-3xl font-bold text-white mb-0.5 tracking-tight leading-tight">+5K</div>
                <div className="text-white/40 text-[10px] sm:text-xs font-semibold uppercase tracking-wider">{t('home.statsGroups', 'Groups')}</div>
              </div>
              <LiveStatCard target={activeUsers} label="Visiting Now" icon="" />
              <LiveStatCard target={stats?.totalViews ?? 0} label={t('home.statsViews', 'Views')} icon="" />
              <div className="glass rounded-xl sm:rounded-2xl px-3 py-3 sm:p-5 text-center hover-glow transition-all duration-300 border-white/5 bg-white/[0.02]">
                <div className="text-[17px] sm:text-2xl md:text-3xl font-bold text-white mb-0.5 tracking-tight leading-tight">+1.8M</div>
                <div className="text-white/40 text-[10px] sm:text-xs font-semibold uppercase tracking-wider">OnlyFans Creators</div>
              </div>
            </motion.div>
          )}

        </div>

        {/* New Additions Section */}
        {newGroups.length > 0 && (
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeInUp}
            className="mt-20 sm:mt-40 max-w-7xl mx-auto px-4"
            style={{ willChange: 'transform, opacity' }}
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center mb-4 text-[#f5f5f5]">
              {t('home.freshTitle1', 'Fresh')} <span className="gradient-text">{t('home.freshTitle2', 'New Additions')}</span>
            </h2>
            <p className="text-center text-[#999] text-sm mb-12 sm:mb-16 max-w-xl mx-auto">
              {t('home.freshSubtitle', 'The latest groups added to Erogram — updated daily')}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {newGroups.map((group, idx) => (
                <motion.div
                  key={group._id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: idx * 0.05 }}
                >
                  <Link
                    href={lp(`/${group.slug}`)}
                    className="block glass rounded-2xl overflow-hidden border border-white/5 hover:border-[#b31b1b]/50 transition-all duration-300 hover:scale-[1.03] group"
                  >
                    <div className="aspect-square relative overflow-hidden bg-[#1a1a1a]">
                      <Image
                        src={group.image && (group.image.startsWith('https://') || group.image.startsWith('/')) ? group.image : '/assets/placeholder-no-image.png'}
                        alt={group.name}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        className="object-cover group-hover:scale-110 transition-transform duration-500"
                        onError={(e) => { (e.target as HTMLImageElement).src = '/assets/placeholder-no-image.png'; }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                      <div className="absolute top-2 left-2">
                        <span className="px-2 py-0.5 rounded-full bg-[#b31b1b]/90 text-white text-[10px] font-bold uppercase tracking-wide">
                          {t('home.new', 'New')}
                        </span>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <h3 className="text-white font-bold text-sm leading-tight line-clamp-2 drop-shadow-lg">
                          {group.name}
                        </h3>
                      </div>
                    </div>
                    <div className="p-3 flex items-center justify-between">
                      <span className="text-[10px] text-[#999] font-medium uppercase tracking-wide truncate">
                        {group.category}
                      </span>
                      {group.memberCount > 0 && (
                        <span className="text-[10px] text-[#999] flex items-center gap-1 shrink-0">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
                          {group.memberCount >= 1000 ? `${(group.memberCount / 1000).toFixed(1)}K` : group.memberCount}
                        </span>
                      )}
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
            <div className="text-center mt-8">
              <Link
                href={lp('/groups')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#b31b1b] hover:bg-[#d32f2f] text-white rounded-lg text-lg font-semibold transition-all hover:scale-105"
              >
                {t('home.browseAllGroups', 'Browse All Groups')}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </Link>
            </div>
          </motion.div>
        )}

        {/* Top Lists Section */}
        <motion.div
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeInUp}
          className="mt-20 sm:mt-40 max-w-7xl mx-auto px-4"
          style={{ willChange: 'transform, opacity' }}
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center mb-12 sm:mb-16 text-[#f5f5f5]">
            {t('home.curatedTitle1', 'Curated')} <span className="gradient-text">{t('home.curatedTitle2', 'Top Lists')}</span>
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              'Amateur', 'Anime', 'Onlyfans',
              'Asian', 'Anal', 'Roleplay', 'Fetish',
              'Lesbian', 'MILF', 'BDSM', 'Cosplay'
            ].map((cat, idx) => (
              <Link
                key={cat}
                href={lp(`/best-telegram-groups/${cat.toLowerCase()}`)}
                className="glass p-4 rounded-xl border border-white/5 hover:border-[#b31b1b] transition-all hover:scale-105 text-center group"
              >
                <div className="text-lg font-bold text-[#f5f5f5] group-hover:text-[#b31b1b] transition-colors">
                  {t('home.bestGroups', 'Best {category} Groups').replace('{category}', cat)}
                </div>
                <div className="text-xs text-[#999] mt-1">
                  {t('home.topCollections', 'Top 10 Collections')}
                </div>
              </Link>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link
              href={lp('/best-telegram-groups')}
              className="text-[#999] hover:text-[#b31b1b] text-sm underline transition-colors"
            >
              {t('home.viewAllCategories', 'View all categories')}
            </Link>
          </div>
        </motion.div>

        {/* Articles Section — English only */}
        {locale === 'en' && featuredArticles.length > 0 && (
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeInUp}
            className="mt-20 sm:mt-40 max-w-7xl mx-auto px-4"
            style={{ willChange: 'transform, opacity' }}
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center mb-12 sm:mb-16 text-[#f5f5f5]">
              {t('home.latestTitle1', 'Latest')} <span className="gradient-text">{t('home.latestTitle2', 'Articles')}</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredArticles.map((article, idx) => (
                <motion.div
                  key={article._id}
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: idx * 0.1 }}
                  whileHover={{ y: -10 }}
                  className="glass rounded-2xl overflow-hidden hover-glow"
                  style={{ willChange: 'transform, opacity' }}
                >
                  <Link href={lp(`/articles/${article.slug}`)}>
                    {article.featuredImage && (
                      <div className="aspect-video overflow-hidden relative">
                        <Image
                          src={article.featuredImage}
                          alt={article.title}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          className="object-cover hover:scale-105 transition-transform duration-300"
                          priority={idx < 3}
                        />
                      </div>
                    )}
                    <div className="p-6">
                      <h3 className="text-xl font-bold mb-3 text-[#f5f5f5] line-clamp-2">
                        {article.title}
                      </h3>
                      <p className="text-[#999] text-sm mb-4 line-clamp-3">
                        {article.excerpt}
                      </p>
                      <div className="flex items-center justify-between text-xs text-[#999]">
                        <span>{t('home.by', 'By')} {article.author.username}</span>
                        {article.publishedAt && (
                          <span>
                            {formatDate(article.publishedAt, locale)}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
            <div className="text-center mt-8">
              <Link href={lp('/articles')}>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-6 py-3 bg-[#b31b1b] hover-glow text-white rounded-lg text-lg font-semibold transition-all"
                  style={{ willChange: 'transform' }}
                >
                  {t('home.viewAllArticles', 'View All Articles')}
                </motion.button>
              </Link>
            </div>
          </motion.div>
        )}

        {/* FAQ Section */}
        <motion.div
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeInUp}
          className="mt-20 sm:mt-40 max-w-4xl mx-auto px-4"
          style={{ willChange: 'transform, opacity' }}
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center mb-12 sm:mb-16 text-[#f5f5f5]">
            {t('home.faqTitle1', 'Frequently Asked')} <span className="gradient-text">{t('home.faqTitle2', 'Questions')}</span>
          </h2>
          <div className="space-y-6">
            {(dict.home?.faq as { q: string; a: string }[] || []).map((faq: { q: string; a: string }, idx: number) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="glass rounded-2xl p-6 hover-glow"
                style={{ willChange: 'transform, opacity' }}
              >
                <h3 className="text-lg sm:text-xl font-bold mb-3 text-[#f5f5f5]">
                  {faq.q}
                </h3>
                <p className="text-[#999] text-sm sm:text-base leading-relaxed">
                  {faq.a}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
