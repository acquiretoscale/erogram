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
      className="fixed top-0 left-0 right-0 z-50 h-[58px] border-b border-white/10 bg-black/95 backdrop-blur-md pointer-events-none"
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

interface NewBot {
  _id: string;
  name: string;
  slug: string;
  image: string;
  category: string;
  memberCount: number;
}

interface NewAINsfw {
  slug: string;
  name: string;
  image: string;
  category: string;
}

interface TopGroupCategory {
  name: string;
  slug: string;
  count: number;
}

interface HomeClientProps {
  featuredArticles: Article[];
  heroCampaigns?: CampaignData[];
  newGroups?: NewGroup[];
  stats?: SiteStats;
  ofCategories?: OFCategoryPreview[];
  newestBots?: NewBot[];
  newestAINsfw?: NewAINsfw[];
  topGroupCategories?: TopGroupCategory[];
  locale?: Locale;
}

const ACTIVE_USERS_POLL = 300_000;

// ── Shared design tokens for the fresh "Erogram 2.0" skin ─────────────
// Glassy card surface used across every section (replaces old flat cards).
const CARD = 'rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl shadow-[0_8px_32px_-12px_rgba(0,0,0,0.5)] hover:border-[#c0392f]/60 transition-all duration-300';

const HERO_TITLE_GRADIENT = {
  fontFamily: 'var(--font-bebas), sans-serif',
  backgroundImage: 'linear-gradient(180deg, #ffffff 0%, #b0b0b0 100%)',
} as const;

const HERO_ACCENT_GRADIENT = {
  fontFamily: 'var(--font-bebas), sans-serif',
  backgroundImage: 'linear-gradient(180deg, #ff8a00 0%, #c0392f 100%)',
} as const;

function SectionTitle({
  children,
  accent,
  suffix,
  className = 'mb-12 sm:mb-16',
}: {
  children: React.ReactNode;
  accent?: React.ReactNode;
  suffix?: React.ReactNode;
  className?: string;
}) {
  return (
    <h2
      className={`text-4xl sm:text-5xl md:text-6xl tracking-tight leading-[0.95] uppercase text-center ${className}`}
    >
      <span className="bg-clip-text text-transparent" style={HERO_TITLE_GRADIENT}>{children}</span>
      {accent != null && (
        <>
          {' '}
          <span className="bg-clip-text text-transparent" style={HERO_ACCENT_GRADIENT}>{accent}</span>
        </>
      )}
      {suffix != null && (
        <>
          {' '}
          <span className="bg-clip-text text-transparent" style={HERO_TITLE_GRADIENT}>{suffix}</span>
        </>
      )}
    </h2>
  );
}

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

function abbreviate(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString('en-US');
}

function LiveStatCell({ target, label }: { target: number; label: string }) {
  const { value, ref } = useCountUp(target);
  const [display, setDisplay] = useState(target);

  useEffect(() => {
    if (value < target) { setDisplay(value); return; }
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
    <div ref={ref} className="flex-1 flex flex-col items-center justify-center py-3 px-1">
      <span className="text-base sm:text-lg font-bold text-white tabular-nums leading-none">{abbreviate(display)}</span>
      <div className="flex items-center gap-1 mt-0.5">
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-400" />
        </span>
        <div className="text-[7px] sm:text-[8px] font-semibold uppercase tracking-[0.18em] text-white/30">{label}</div>
      </div>
    </div>
  );
}

function CountStatCell({ target, label, raw }: { target: number; label: string; raw?: boolean }) {
  const { value, ref } = useCountUp(target);
  return (
    <div ref={ref} className="flex-1 flex flex-col items-center justify-center py-3 px-1">
      <span className="text-base sm:text-lg font-bold text-white tabular-nums leading-none">
        {raw ? value.toLocaleString('en-US') : abbreviate(value)}
      </span>
      <div className="text-[7px] sm:text-[8px] font-semibold uppercase tracking-[0.18em] text-white/30 mt-0.5">{label}</div>
    </div>
  );
}

// Compact image-card row for "newest additions" (AI NSFW tools / Bots).
function NewestRow({ items }: { items: { key: string; href: string; image: string; name: string; category: string }[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
      {items.map((it) => (
        <Link
          key={it.key}
          href={it.href}
          className="group block overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl shadow-[0_8px_32px_-12px_rgba(0,0,0,0.5)] hover:border-[#c0392f]/60 transition-all duration-300 hover:scale-[1.03]"
        >
          <div className="aspect-square relative overflow-hidden bg-white/5">
            <img
              src={it.image}
              alt={it.name}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={(e) => { (e.target as HTMLImageElement).src = '/assets/placeholder-no-image.png'; }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            <div className="absolute top-2 left-2">
              <span className="px-2 py-0.5 rounded-full bg-white text-black text-[10px] font-bold uppercase tracking-wide">New</span>
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-3">
              <h3 className="text-white font-bold text-sm leading-tight line-clamp-2 drop-shadow-lg">{it.name}</h3>
            </div>
          </div>
          {it.category && (
            <div className="p-3">
              <span className="text-[10px] text-white/50 font-medium uppercase tracking-wide truncate block">{it.category}</span>
            </div>
          )}
        </Link>
      ))}
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

export default function HomeClient({ featuredArticles, heroCampaigns = [], newGroups = [], stats, ofCategories = [], newestBots = [], newestAINsfw = [], topGroupCategories = [], locale = 'en' }: HomeClientProps) {
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

  // ── Navigation cards — white-bg rows with icon ring, title, subtitle, arrow ──
  const navCards: { title: string; sub: string; href: string; icon: React.ReactNode; iconColor: string; bareIcon?: boolean; bgColor?: string }[] = [
    {
      title: 'Telegram Groups',
      sub: 'Explore thousands of adult & porn Telegram groups',
      href: lp('/groups'),
      iconColor: '#fff',
      bgColor: '#1a2740',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20.665 3.717l-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701h-.002l.002.001-.314 4.692c.46 0 .663-.211.921-.46l2.211-2.15 4.599 3.397c.848.467 1.457.227 1.668-.785l3.019-14.228c.309-1.239-.473-1.8-1.282-1.434z"/></svg>,
    },
    {
      title: 'Telegram Uncensored Bots',
      sub: 'Explore the best uncensored Telegram bots',
      href: lp('/bots'),
      iconColor: '#fff',
      bgColor: '#1a2740',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="9" cy="16" r="1"/><circle cx="15" cy="16" r="1"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>,
    },
    {
      title: 'AI Uncensored Tools',
      sub: 'Explore hundreds of the best uncensored AI tools',
      href: lp('/ainsfw'),
      iconColor: '#e0102b',
      // Lips icon provided by owner — tinted dark red
      icon: <img src="/assets/lips-icon.png" alt="" width="26" height="26" style={{ objectFit: 'contain', filter: 'brightness(0) saturate(100%) invert(13%) sepia(90%) saturate(4000%) hue-rotate(345deg) brightness(80%)' }} />,
    },
    {
      title: 'OnlyFans Search',
      sub: 'Search 1.8M+ OnlyFans creators on the biggest OF search engine',
      href: '/onlyfanssearch',
      iconColor: '#00AFF0',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="#00AFF0"><path d="M24 4.003h-4.015c-3.45 0-5.3.197-6.748 1.957a7.996 7.996 0 1 0 2.103 9.211c3.182-.231 5.39-2.134 6.085-5.173c0 0-2.399.585-4.43 0c4.018-.777 6.333-3.037 7.005-5.995M5.61 11.999A2.391 2.391 0 0 1 9.28 9.97a2.966 2.966 0 0 1 2.998-2.528h.008c-.92 1.778-1.407 3.352-1.998 5.263A2.392 2.392 0 0 1 5.61 12Zm2.386-7.996a7.996 7.996 0 1 0 7.996 7.996a7.996 7.996 0 0 0-7.996-7.996m0 10.394A2.399 2.399 0 1 1 10.395 12a2.396 2.396 0 0 1-2.399 2.398Z"/></svg>,
    },
    {
      title: 'TRENDING ON EROGRAM',
      sub: 'The best of adult entertainment, all in one place',
      href: lp('/trending'),
      iconColor: '#fff',
      bgColor: '#b91c1c',
      bareIcon: true,
      // Erogram devil mascot — full button height, no ring, pops out
      icon: <img src="/assets/erogram-mascot.webp" alt="" className="erogram-mascot" style={{ objectFit: 'contain', height: '72px', width: 'auto', marginTop: '-12px', marginBottom: '-12px' }} />,
    },
  ];

  const renderCard = (c: typeof navCards[0]) => (
    <button
      key={c.title}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setTimeout(() => router.push(c.href), 0); }}
      className="hero-nav-card"
      style={c.bgColor ? { background: c.bgColor, borderColor: c.bgColor } : undefined}
    >
      <span className="hero-nav-card__body">
        <span className="hero-nav-card__top">
          {c.bareIcon ? (
            <span className="hero-nav-card__bare">{c.icon}</span>
          ) : (
            <span className="hero-nav-card__ring" style={{ borderColor: c.bgColor ? 'rgba(255,255,255,0.4)' : c.iconColor, color: c.iconColor }}>{c.icon}</span>
          )}
          <span className="hero-nav-card__title" style={c.bgColor ? { color: '#fff' } : undefined}>{c.title}</span>
          <svg className="hero-nav-card__arrow" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={c.bgColor ? { color: 'rgba(255,255,255,0.6)' } : undefined}><path d="M7 17L17 7M17 7H7M17 7v10"/></svg>
        </span>
        <span className="hero-nav-card__sub" style={c.bgColor ? { color: 'rgba(255,255,255,0.65)' } : undefined}>{c.sub}</span>
      </span>
    </button>
  );

  const topCards = navCards.slice(0, 4);

  const HeroCards = (
    <div className="flex flex-col gap-2.5 sm:gap-3 w-full max-w-xs sm:max-w-7xl mx-auto">
      {/* Row 1: 4 nav cards */}
      <div className="grid grid-cols-1 sm:flex sm:flex-row gap-2.5 sm:gap-2 w-full">
        {topCards.map(renderCard)}
      </div>
      {/* Row 2: EROGRAM SPOTLIGHT — featured banner */}
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setTimeout(() => router.push(lp('/trending')), 0); }}
        className="erogram-uncut-cta"
      >
        {/* Left: mascot */}
        <img
          src="/assets/erogram-mascot.webp"
          alt=""
          className="erogram-mascot erogram-uncut-cta__mascot"
        />
        {/* Center: text */}
        <span className="erogram-uncut-cta__text">
          <span className="erogram-uncut-cta__label">TRENDING ON EROGRAM</span>
          <span className="erogram-uncut-cta__sub">The best of adult entertainment — all in one place</span>
        </span>
        {/* Right: arrow */}
        <span className="erogram-uncut-cta__arrow">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </span>
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-black overflow-hidden">
      {/* Deep black with warm amber/orange radial glow from top */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_50%_at_50%_-5%,rgba(180,80,0,0.30),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(255,120,0,0.12),transparent_50%)]" />
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[900px] h-[450px] bg-[#6b2f00]/20 rounded-full blur-[160px]" />
      </div>

      <Navbar username={username} setUsername={setUsername} />

      {/* Hero Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 pt-20 sm:pt-28 pb-14">
        {heroCampaigns.length > 0 && (
          <div className="w-full mb-8">
            <HeaderBanner campaigns={heroCampaigns} placement="homepage-hero" />
          </div>
        )}

        <div className="text-center max-w-4xl mx-auto">
          {/* Badge pill */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#ff8a00]/30 bg-[#ff8a00]/[0.06] mb-7 sm:mb-8"
          >
            <span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff8a00] opacity-75" /><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#ff8a00]" /></span>
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.2em] text-[#ff8a00]">#1 Porn Telegram &amp; AI NSFW Hub</span>
          </motion.div>

          {/* Hero title */}
          <motion.h1
            className="text-[3.2rem] sm:text-7xl md:text-8xl tracking-tight mb-6 sm:mb-7 leading-[0.95] uppercase bg-clip-text text-transparent"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.2, 0.8, 0.2, 1], delay: 0.1 }}
            style={{
              fontFamily: 'var(--font-bebas), sans-serif',
              backgroundImage: HERO_TITLE_GRADIENT.backgroundImage,
            }}
          >
            {t('home.heroTitle1', 'Your #1 hub for Adult Entertainment.')}
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            className="text-sm sm:text-lg md:text-xl text-white/45 mb-10 sm:mb-12 max-w-md sm:max-w-xl mx-auto px-4 leading-relaxed"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            {t('home.heroDesc1', 'Porn Telegram groups & NSFW bots, AI companions & tools, OnlyFans creators.')}{' '}
            {t('home.heroDesc2', 'Explore and save your favorites all in one place.')}
          </motion.p>

          {/* 2x2 Glass nav cards */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mb-6 sm:mb-8"
          >
            {HeroCards}
          </motion.div>

          {/* Stats strip — compact, abbreviated, discrete */}
          <motion.div
            className="flex items-stretch w-full max-w-lg sm:max-w-2xl mx-auto rounded-2xl overflow-hidden border border-white/8 bg-white/[0.03] backdrop-blur-sm divide-x divide-white/8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.45 }}
          >
            <CountStatCell target={stats?.aiAndBotsCount ?? 0} label="Tools" />
            <LiveStatCell target={activeUsers} label="Live" />
            <CountStatCell target={stats?.totalViews ?? 0} label="Views" raw />
            <CountStatCell target={stats?.ofCreatorsCount ?? 0} label="Creators" />
          </motion.div>
        </div>

        {/* Newest AI NSFW Tools additions */}
        {newestAINsfw.length > 0 && (
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: '-100px' }}
            variants={fadeInUp}
            className="mt-20 sm:mt-32 max-w-7xl mx-auto px-4"
            style={{ willChange: 'transform, opacity' }}
          >
            <SectionTitle accent="AI NSFW Tools" suffix="Additions">Newest</SectionTitle>
            <NewestRow
              items={newestAINsfw.map((tool) => ({
                key: tool.slug,
                href: lp(`/${tool.slug}`),
                image: tool.image,
                name: tool.name,
                category: tool.category,
              }))}
            />
            <div className="text-center mt-8">
              <Link
                href={lp('/ainsfw')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-yellow-400 hover:bg-yellow-300 text-black rounded-xl text-lg font-bold transition-all hover:scale-105 shadow-[0_10px_30px_-8px_rgba(250,204,21,0.6)]"
              >
                Explore AI NSFW Tools
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
              </Link>
            </div>
          </motion.div>
        )}

        {/* Newest Telegram AI NSFW Bots additions */}
        {newestBots.length > 0 && (
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: '-100px' }}
            variants={fadeInUp}
            className="mt-20 sm:mt-32 max-w-7xl mx-auto px-4"
            style={{ willChange: 'transform, opacity' }}
          >
            <SectionTitle accent="Telegram AI NSFW Bots" suffix="Additions">Newest</SectionTitle>
            <NewestRow
              items={newestBots.map((bot) => ({
                key: bot._id,
                href: lp(`/${bot.slug}`),
                image: bot.image,
                name: bot.name,
                category: bot.category,
              }))}
            />
            <div className="text-center mt-8">
              <Link
                href={lp('/bots')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-white hover:bg-white/90 text-black rounded-xl text-lg font-semibold transition-all hover:scale-105 shadow-[0_10px_30px_-8px_rgba(0,0,0,0.5)]"
              >
                Browse All Bots
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
              </Link>
            </div>
          </motion.div>
        )}

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
            <SectionTitle accent={t('home.freshTitle2', 'New Additions')} className="mb-4">
              {t('home.freshTitle1', 'Fresh')}
            </SectionTitle>
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
                        <span className="px-2 py-0.5 rounded-full bg-white text-black text-[10px] font-bold uppercase tracking-wide">
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
                className="inline-flex items-center gap-2 px-6 py-3 bg-white hover:bg-white/90 text-black rounded-xl text-lg font-semibold transition-all hover:scale-105 shadow-[0_10px_30px_-8px_rgba(0,0,0,0.5)]"
              >
                {t('home.browseAllGroups', 'Browse All Groups')}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
              </Link>
            </div>
          </motion.div>
        )}

        {/* Top Lists Section — top 16 categories by group count (same logic as /groups trending) */}
        {topGroupCategories.length > 0 && (
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: '-100px' }}
            variants={fadeInUp}
            className="mt-20 sm:mt-40 max-w-7xl mx-auto px-4"
            style={{ willChange: 'transform, opacity' }}
          >
            <SectionTitle accent={t('home.curatedTitle2', 'Top Lists')}>
              {t('home.curatedTitle1', 'Curated')}
            </SectionTitle>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {topGroupCategories.map((cat) => (
                <Link
                  key={cat.slug}
                  href={lp(`/best-telegram-groups/${cat.slug}`)}
                  className="p-4 rounded-2xl bg-white hover:bg-white/95 shadow-[0_6px_20px_-6px_rgba(0,0,0,0.4)] transition-all hover:scale-105 text-center group"
                >
                  <div className="text-lg font-bold text-[#0a0a0b] group-hover:text-[#c0392f] transition-colors">
                    {t('home.bestGroups', 'Best {category} Groups').replace('{category}', cat.name)}
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
                className="text-white/55 hover:text-[#c0392f] text-sm underline underline-offset-4 transition-colors"
              >
                {t('home.viewAllCategories', 'View all categories')}
              </Link>
            </div>
          </motion.div>
        )}

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
            <SectionTitle accent={t('home.latestTitle2', 'Articles')}>
              {t('home.latestTitle1', 'Latest')}
            </SectionTitle>
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
                  className="px-6 py-3 bg-white hover:bg-white/90 text-black rounded-xl text-lg font-semibold transition-all shadow-[0_10px_30px_-8px_rgba(0,0,0,0.5)]"
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
          <SectionTitle accent={t('home.faqTitle2', 'Questions')}>
            {t('home.faqTitle1', 'Frequently Asked')}
          </SectionTitle>
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
          <SectionTitle accent={t('home.bestOfTitle2', 'by Category')} className="mb-3">
            {t('home.bestOfTitle1', 'Best OnlyFans Creators')}
          </SectionTitle>
          <p className="text-center text-white/55 text-sm sm:text-base mb-10 max-w-2xl mx-auto">
            {t('home.bestOfDesc', 'Explore our curated top-10 rankings of the best OnlyFans creators in every category — updated daily.')}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {ofCategories.map((cat) => (
              <Link
                key={cat.slug}
                href={lp(`/best-onlyfans-accounts/${cat.slug}`)}
                className="group flex items-center gap-4 p-3 sm:p-4 rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl hover:border-[#c0392f]/60 hover:bg-[#c0392f]/[0.06] transition-all duration-200"
              >
                <div className="flex-shrink-0 w-14 h-14 rounded-full overflow-hidden bg-white/5 ring-2 ring-white/10 group-hover:ring-[#c0392f]/40 transition-all">
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
                    <div className="w-full h-full flex items-center justify-center text-xl text-[#c0392f]/60">{cat.emoji}</div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg sm:text-xl font-extrabold text-white leading-tight truncate group-hover:text-[#c0392f] transition-colors">
                    {cat.name} <span className="text-white/40 font-bold">OnlyFans</span>
                  </h3>
                  <p className="text-xs text-white/40 mt-0.5">Top 10 ranked creators</p>
                </div>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 text-white/20 group-hover:text-[#c0392f] group-hover:translate-x-0.5 transition-all"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
              </Link>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link href={lp('/best-onlyfans-accounts')}>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-7 py-3.5 bg-white hover:bg-white/90 text-black rounded-full text-lg font-bold transition-all shadow-lg shadow-black/40"
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
