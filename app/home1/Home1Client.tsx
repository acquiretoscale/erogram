'use client';

import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { shouldUseLightAnimations, animationClasses } from '@/lib/utils/animations';
import Footer from '@/components/Footer';
import HeaderBanner from '@/components/HeaderBanner';
import { formatDate } from '@/lib/i18n/date';
import type { Locale } from '@/lib/i18n/config';
import { useTranslation, useLocalePath } from '@/lib/i18n/client';

const Navbar = dynamic(() => import('@/components/Navbar'), {
  loading: () => (
    <div
      aria-hidden
      className="fixed top-0 left-0 right-0 z-50 h-[72px] border-b border-white/10 bg-[#0a0e1a]/95 backdrop-blur-md pointer-events-none"
    />
  ),
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
  author: { _id: string; username: string };
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
  groupCount?: number;
  botCount?: number;
  totalMembers?: number;
  totalViews: number;
  aiAndBotsCount?: number;
  ofCreatorsCount?: number;
}

interface OFCategoryPreview {
  slug: string;
  name: string;
  emoji: string;
  avatar: string;
}

interface HomeClientProps {
  featuredArticles: Article[];
  heroCampaigns?: CampaignData[];
  newGroups?: NewGroup[];
  stats?: SiteStats;
  ofCategories?: OFCategoryPreview[];
  locale?: Locale;
}

const ACTIVE_USERS_POLL = 300_000;

// ── Shared design tokens for the fresh "Erogram 2.0" skin ─────────────
// Glassy card surface used across every section (replaces old flat cards).
const CARD = 'rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl shadow-[0_8px_32px_-12px_rgba(0,0,0,0.5)] hover:border-[#00AFF0]/50 transition-all duration-300';
const GRADIENT_TEXT = 'text-transparent bg-clip-text bg-gradient-to-r from-[#00AFF0] via-[#38BDF8] to-[#00D4FF]';

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

function LiveStatCard({ target, label }: { target: number; label: string }) {
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
      className="rounded-2xl px-3 py-3 sm:p-5 text-center border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl hover:border-[#00AFF0]/40 transition-all duration-300"
    >
      <div className="text-[17px] sm:text-2xl md:text-3xl font-black text-white mb-0.5 tracking-tight tabular-nums leading-tight">
        {display.toLocaleString('en-US')}
      </div>
      <div className="flex items-center justify-center gap-1 sm:gap-1.5 text-white/45 text-[10px] sm:text-xs font-semibold uppercase tracking-wider">
        <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 bg-green-500" />
        </span>
        {label}
      </div>
    </div>
  );
}

// Animated count-up card (no live pulse) for totals like AI NSFW+Bots / OnlyFans creators.
function CountStatCard({ target, label, suffix = '' }: { target: number; label: string; suffix?: string }) {
  const { value, ref } = useCountUp(target);
  return (
    <div
      ref={ref}
      className="rounded-2xl px-3 py-3 sm:p-5 text-center border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl hover:border-[#00AFF0]/40 transition-all duration-300"
    >
      <div className="text-[17px] sm:text-2xl md:text-3xl font-black text-white mb-0.5 tracking-tight tabular-nums leading-tight">
        {value.toLocaleString('en-US')}{suffix}
      </div>
      <div className="text-white/45 text-[10px] sm:text-xs font-semibold uppercase tracking-wider">{label}</div>
    </div>
  );
}

function useActiveUsers() {
  const [count, setCount] = useState<number>(0);
  useEffect(() => {
    const fetchActive = () => {
      fetch('/api/advertise-stats', { cache: 'no-store' })
        .then((r) => r.json())
        .then((d) => { if (typeof d.activeVisitors === 'number') setCount(d.activeVisitors); })
        .catch(() => {});
    };
    fetchActive();
    const id = setInterval(fetchActive, ACTIVE_USERS_POLL);
    return () => clearInterval(id);
  }, []);
  return count;
}

export default function Home1Client({ featuredArticles, heroCampaigns = [], newGroups = [], stats, ofCategories = [], locale = 'en' }: HomeClientProps) {
  const { t, dict } = useTranslation();
  const lp = useLocalePath();
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);
  const [useLightAnimations, setUseLightAnimations] = useState(false);
  const activeUsers = useActiveUsers();

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        setUsername(window.localStorage.getItem('username'));
        setUseLightAnimations(shouldUseLightAnimations());
      }
    } catch {}
  }, []);

  const fadeInUp = {
    initial: { opacity: 0, y: 60 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: 'easeOut' },
  };

  // ── Full-size hero CTA buttons (same size/structure as live homepage) ──
  const HeroButtons = (
    <>
      {/* COLOR TEST: Groups = Telegram blue */}
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setTimeout(() => router.push(lp('/groups')), 0); }}
        className="cursor-pointer flex-1 sm:flex-initial sm:w-auto flex items-center justify-center gap-1.5 md:gap-2.5 px-4 py-2.5 md:px-8 md:py-4 bg-[#0088cc] hover:bg-[#0099e0] text-white rounded-xl text-[14px] md:text-base font-semibold transition-all whitespace-nowrap border border-[#FF8A00]/50 hover:border-[#FF8A00] shadow-[0_8px_24px_-8px_rgba(0,136,204,0.7)]"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" className="shrink-0 md:!w-5 md:!h-5">
          <path d="M20.665 3.717l-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701h-.002l.002.001-.314 4.692c.46 0 .663-.211.921-.46l2.211-2.15 4.599 3.397c.848.467 1.457.227 1.668-.785l3.019-14.228c.309-1.239-.473-1.8-1.282-1.434z" />
        </svg>
        Explore Groups
      </button>
      {/* Bots = Telegram blue (same as Groups) */}
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setTimeout(() => router.push(lp('/bots')), 0); }}
        className="cursor-pointer flex-1 sm:flex-initial sm:w-auto flex items-center justify-center gap-1.5 md:gap-2.5 px-4 py-2.5 md:px-8 md:py-4 bg-[#0088cc] hover:bg-[#0099e0] text-white rounded-xl text-[14px] md:text-base font-semibold transition-all whitespace-nowrap border border-[#FF8A00]/50 hover:border-[#FF8A00] shadow-[0_8px_24px_-8px_rgba(0,136,204,0.7)]"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 md:!w-5 md:!h-5">
          <rect x="3" y="11" width="18" height="10" rx="2" /><circle cx="9" cy="16" r="1" /><circle cx="15" cy="16" r="1" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />
        </svg>
        Explore Bots
      </button>
      {/* COLOR TEST: AI NSFW = dark yellow (matches AI NSFW section) */}
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setTimeout(() => router.push(lp('/ainsfw')), 0); }}
        className="cursor-pointer w-full sm:w-auto flex items-center justify-center gap-1.5 md:gap-2.5 px-4 py-2.5 md:px-8 md:py-4 bg-yellow-400 hover:bg-yellow-300 text-black rounded-xl text-[14px] md:text-base font-bold transition-all whitespace-nowrap border border-[#E07000]/60 hover:border-[#E07000] shadow-[0_8px_24px_-8px_rgba(250,204,21,0.7)]"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 md:!w-5 md:!h-5"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><path d="M9 9h.01M15 9h.01" /></svg>
        Explore AI NSFW
      </button>
      {/* PRIMARY: OnlyFans Search = cyan */}
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setTimeout(() => router.push('/onlyfanssearch'), 0); }}
        className="cursor-pointer group relative w-full sm:w-auto px-5 py-3 md:px-9 md:py-4 bg-[#00AFF0] hover:bg-[#009dd9] text-white rounded-xl transition-all flex items-center justify-center gap-2 whitespace-nowrap shadow-[0_10px_30px_-8px_rgba(0,175,240,0.65)] hover:shadow-[0_14px_44px_-8px_rgba(0,175,240,0.85)]"
      >
        <span className="text-[14px] md:text-base font-bold tracking-tight">
          <span className="font-black">OnlyFans Search</span>
          <span className="text-white/80 font-semibold"> · 1.8M creators</span>
        </span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 group-hover:translate-x-0.5 transition-transform"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
      </button>
    </>
  );

  const StatsGrid = (
    <>
      <CountStatCard target={stats?.aiAndBotsCount ?? 0} label="AI NSFW Tools & Bots" />
      <LiveStatCard target={activeUsers} label="Visiting Now" />
      <LiveStatCard target={stats?.totalViews ?? 0} label="Page Views" />
      <CountStatCard target={stats?.ofCreatorsCount ?? 0} label="OnlyFans Creators" />
    </>
  );

  return (
    <div className="min-h-screen bg-[#070b16] overflow-hidden">
      {/* Fresh background — plain dark blue + soft cyan glow, no grid */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_120%_70%_at_50%_-10%,rgba(0,175,240,0.12),transparent_60%)]" />
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1100px] h-[600px] bg-[#00AFF0]/[0.08] rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-0 w-[700px] h-[500px] bg-[#1E3A8A]/[0.18] rounded-full blur-[160px]" />
      </div>

      <Navbar username={username} setUsername={setUsername} />

      {/* Hero Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-16 sm:pt-28 pb-20">
        {heroCampaigns.length > 0 && (
          <div className="w-full mb-8">
            <HeaderBanner campaigns={heroCampaigns} />
          </div>
        )}

        <div className="text-center max-w-4xl mx-auto">
          {useLightAnimations ? (
            <>
              <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#00AFF0]/25 bg-[#00AFF0]/[0.08] backdrop-blur-md mb-4 sm:mb-8 ${animationClasses.fadeInUp}`}>
                <span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00AFF0] opacity-75" /><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#00AFF0]" /></span>
                <span className="text-xs sm:text-sm font-semibold text-white/80 tracking-tight">{t('home.badge', 'The #1 NSFW & Porn Telegram and AI Directory')}</span>
              </div>
              <h1 className={`text-3xl sm:text-5xl md:text-6xl font-black mb-4 sm:mb-8 leading-tight tracking-tight ${animationClasses.fadeInUp}`} style={{ animationDelay: '0.1s' }}>
                <span className="text-white">{t('home.heroTitle1', 'Best Telegram Porn & NSFW Groups,')}</span>
                <span className="block sm:inline"> </span>
                <span className={GRADIENT_TEXT}>{t('home.heroTitle2', 'Bots & AI Tools Directory')}</span>
              </h1>
            </>
          ) : (
            <>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#00AFF0]/25 bg-[#00AFF0]/[0.08] backdrop-blur-md mb-4 sm:mb-8"
              >
                <span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00AFF0] opacity-75" /><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#00AFF0]" /></span>
                <span className="text-xs sm:text-sm font-semibold text-white/80 tracking-tight">{t('home.badge', 'The #1 NSFW & Porn Telegram and AI Directory')}</span>
              </motion.div>
              <motion.h1
                className="text-3xl sm:text-5xl md:text-6xl font-black mb-4 sm:mb-8 leading-tight tracking-tight"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.2, 0.8, 0.2, 1], delay: 0.1 }}
                style={{ willChange: 'transform, opacity' }}
              >
                <span className="text-white">{t('home.heroTitle1', 'Best Telegram Porn & NSFW Groups,')}</span>
                <span className="block sm:inline"> </span>
                <span className={GRADIENT_TEXT}>{t('home.heroTitle2', 'Bots & AI Tools Directory')}</span>
              </motion.h1>
            </>
          )}

          {useLightAnimations ? (
            <p className={`text-base sm:text-xl md:text-2xl text-white/60 mb-6 sm:mb-10 max-w-3xl mx-auto px-4 leading-relaxed ${animationClasses.fadeInUp}`} style={{ animationDelay: '0.2s' }}>
              {t('home.heroDesc1', 'Your #1 hub for NSFW Telegram groups & bots, AI companions & tools, and 1.8M+ OnlyFans creators.')}{' '}
              {t('home.heroDesc2', 'Explore and save your favorites all in one place.')}
            </p>
          ) : (
            <motion.p
              className="text-base sm:text-xl md:text-2xl text-white/60 mb-6 sm:mb-10 max-w-3xl mx-auto px-4 leading-relaxed"
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
              {HeroButtons}
            </div>
          ) : (
            <motion.div
              className="flex flex-wrap sm:flex-nowrap gap-2 sm:gap-2.5 md:gap-4 justify-center items-center w-full mb-6 sm:mb-8"
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut', delay: 0.4 }}
              style={{ willChange: 'transform, opacity' }}
            >
              {HeroButtons}
            </motion.div>
          )}

          {/* Stats — live counters, tight under CTA */}
          {useLightAnimations ? (
            <div className={`grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 max-w-4xl mx-auto ${animationClasses.fadeInUp}`} style={{ animationDelay: '0.5s' }}>
              {StatsGrid}
            </div>
          ) : (
            <motion.div
              className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 max-w-4xl mx-auto"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut', delay: 0.5 }}
              style={{ willChange: 'transform, opacity' }}
            >
              {StatsGrid}
            </motion.div>
          )}
        </div>

        {/* New Additions Section */}
        {newGroups.length > 0 && (
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: '-100px' }}
            variants={fadeInUp}
            className="mt-20 sm:mt-40 max-w-7xl mx-auto px-4"
            style={{ willChange: 'transform, opacity' }}
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-center mb-4 text-white">
              {t('home.freshTitle1', 'Fresh')} <span className={GRADIENT_TEXT}>{t('home.freshTitle2', 'New Additions')}</span>
            </h2>
            <p className="text-center text-white/55 text-sm mb-12 sm:mb-16 max-w-xl mx-auto">
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
                    className={`block overflow-hidden ${CARD} hover:scale-[1.03] group`}
                  >
                    <div className="aspect-square relative overflow-hidden bg-white/5">
                      <img
                        src={group.image && (group.image.startsWith('https://') || group.image.startsWith('/')) ? group.image : '/assets/placeholder-no-image.png'}
                        alt={group.name}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        loading={idx < 4 ? 'eager' : 'lazy'}
                        onError={(e) => { (e.target as HTMLImageElement).src = '/assets/placeholder-no-image.png'; }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                      <div className="absolute top-2 left-2">
                        <span className="px-2 py-0.5 rounded-full bg-[#00AFF0]/90 text-white text-[10px] font-bold uppercase tracking-wide">
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
                      <span className="text-[10px] text-white/50 font-medium uppercase tracking-wide truncate">
                        {group.category}
                      </span>
                      {group.memberCount > 0 && (
                        <span className="text-[10px] text-white/50 flex items-center gap-1 shrink-0">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" /></svg>
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
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#00AFF0] to-[#00D4FF] hover:from-[#009ADB] hover:to-[#00BFE8] text-white rounded-xl text-lg font-semibold transition-all hover:scale-105 shadow-[0_10px_30px_-8px_rgba(0,175,240,0.6)]"
              >
                {t('home.browseAllGroups', 'Browse All Groups')}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
              </Link>
            </div>
          </motion.div>
        )}

        {/* Top Lists Section */}
        <motion.div
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: '-100px' }}
          variants={fadeInUp}
          className="mt-20 sm:mt-40 max-w-7xl mx-auto px-4"
          style={{ willChange: 'transform, opacity' }}
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-center mb-12 sm:mb-16 text-white">
            {t('home.curatedTitle1', 'Curated')} <span className={GRADIENT_TEXT}>{t('home.curatedTitle2', 'Top Lists')}</span>
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['Amateur', 'Anime', 'Onlyfans', 'Asian', 'Anal', 'Roleplay', 'Fetish', 'Lesbian', 'MILF', 'BDSM', 'Cosplay'].map((cat) => (
              <Link
                key={cat}
                href={lp(`/best-telegram-groups/${cat.toLowerCase()}`)}
                className="p-4 rounded-2xl bg-white hover:bg-white/95 shadow-[0_6px_20px_-6px_rgba(0,0,0,0.4)] transition-all hover:scale-105 text-center group"
              >
                <div className="text-lg font-bold text-[#0a0a0b] group-hover:text-[#00AFF0] transition-colors">
                  {t('home.bestGroups', 'Best {category} Groups').replace('{category}', cat)}
                </div>
                <div className="text-xs text-[#6b7280] mt-1">
                  {t('home.topCollections', 'Top 10 Collections')}
                </div>
              </Link>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link
              href={lp('/best-telegram-groups')}
              className="text-white/55 hover:text-[#00AFF0] text-sm underline underline-offset-4 transition-colors"
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
            viewport={{ once: true, margin: '-100px' }}
            variants={fadeInUp}
            className="mt-20 sm:mt-40 max-w-7xl mx-auto px-4"
            style={{ willChange: 'transform, opacity' }}
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-center mb-12 sm:mb-16 text-white">
              {t('home.latestTitle1', 'Latest')} <span className={GRADIENT_TEXT}>{t('home.latestTitle2', 'Articles')}</span>
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
                  className={`overflow-hidden ${CARD}`}
                  style={{ willChange: 'transform, opacity' }}
                >
                  <Link href={lp(`/blog/${article.slug}`)}>
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
                      <h3 className="text-xl font-bold mb-3 text-white line-clamp-2">
                        {article.title}
                      </h3>
                      <p className="text-white/55 text-sm mb-4 line-clamp-3">
                        {article.excerpt}
                      </p>
                      <div className="flex items-center justify-between text-xs text-white/50">
                        <span>{t('home.by', 'By')} {article.author.username}</span>
                        {article.publishedAt && (
                          <span>{formatDate(article.publishedAt, locale)}</span>
                        )}
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
            <div className="text-center mt-8">
              <Link href={lp('/blog')}>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-6 py-3 bg-gradient-to-r from-[#00AFF0] to-[#00D4FF] hover:from-[#009ADB] hover:to-[#00BFE8] text-white rounded-xl text-lg font-semibold transition-all shadow-[0_10px_30px_-8px_rgba(0,175,240,0.6)]"
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
          viewport={{ once: true, margin: '-100px' }}
          variants={fadeInUp}
          className="mt-20 sm:mt-40 max-w-4xl mx-auto px-4"
          style={{ willChange: 'transform, opacity' }}
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-center mb-12 sm:mb-16 text-white">
            {t('home.faqTitle1', 'Frequently Asked')} <span className={GRADIENT_TEXT}>{t('home.faqTitle2', 'Questions')}</span>
          </h2>
          <div className="space-y-6">
            {((dict.home?.faq as { q: string; a: string }[]) || []).map((faq: { q: string; a: string }, idx: number) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className={`p-6 ${CARD}`}
                style={{ willChange: 'transform, opacity' }}
              >
                <h3 className="text-lg sm:text-xl font-bold mb-3 text-white">{faq.q}</h3>
                <p className="text-white/55 text-sm sm:text-base leading-relaxed">{faq.a}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Best OnlyFans by Category — internal links to curated SEO pages */}
        <motion.div
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: '-100px' }}
          variants={fadeInUp}
          className="mt-20 sm:mt-40 max-w-5xl mx-auto px-4"
          style={{ willChange: 'transform, opacity' }}
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-center mb-3 text-white">
            {t('home.bestOfTitle1', 'Best OnlyFans Creators')} <span className={GRADIENT_TEXT}>{t('home.bestOfTitle2', 'by Category')}</span>
          </h2>
          <p className="text-center text-white/55 text-sm sm:text-base mb-10 max-w-2xl mx-auto">
            {t('home.bestOfDesc', 'Explore our curated top-10 rankings of the best OnlyFans creators in every category — updated daily.')}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {ofCategories.map((cat) => (
              <Link
                key={cat.slug}
                href={lp(`/best-onlyfans-accounts/${cat.slug}`)}
                className="group flex items-center gap-4 p-3 sm:p-4 rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl hover:border-[#00AFF0]/50 hover:bg-[#00AFF0]/[0.06] transition-all duration-200"
              >
                <div className="flex-shrink-0 w-14 h-14 rounded-full overflow-hidden bg-white/5 ring-2 ring-white/10 group-hover:ring-[#00AFF0]/40 transition-all">
                  {cat.avatar ? (
                    <img
                      src={cat.avatar}
                      alt=""
                      aria-hidden="true"
                      className="w-full h-full object-cover"
                      loading="lazy"
                      width={56}
                      height={56}
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xl text-[#00AFF0]/60">{cat.emoji}</div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg sm:text-xl font-extrabold text-white leading-tight truncate group-hover:text-[#00AFF0] transition-colors">
                    {cat.name} <span className="text-white/40 font-bold">OnlyFans</span>
                  </h3>
                  <p className="text-xs text-white/40 mt-0.5">Top 10 ranked creators</p>
                </div>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 text-white/20 group-hover:text-[#00AFF0] group-hover:translate-x-0.5 transition-all"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
              </Link>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link href={lp('/best-onlyfans-accounts')}>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-7 py-3.5 bg-gradient-to-r from-[#00AFF0] to-[#00D4FF] hover:from-[#009ADB] hover:to-[#00BFE8] text-white rounded-full text-lg font-bold transition-all shadow-lg shadow-[#00AFF0]/40"
                style={{ willChange: 'transform' }}
              >
                {t('home.viewAllOfCategories', 'View All Categories')}
              </motion.button>
            </Link>
          </div>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
