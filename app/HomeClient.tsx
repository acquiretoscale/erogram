'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { shouldUseLightAnimations, animationClasses, getStaggerDelay } from '@/lib/utils/animations';
import Footer from '@/components/Footer';
import AdBanner from '@/components/AdBanner';
import HeaderBanner from '@/components/HeaderBanner';

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

interface HomeClientProps {
  featuredArticles: Article[];
  heroCampaigns?: CampaignData[];
  newGroups?: NewGroup[];
}

export default function HomeClient({ featuredArticles, heroCampaigns = [], newGroups = [] }: HomeClientProps) {
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);
  const [useLightAnimations, setUseLightAnimations] = useState(false);
  const [isPremiumOrAdmin, setIsPremiumOrAdmin] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isAppInstalled, setIsAppInstalled] = useState(false);

  useEffect(() => {
    // Client-only: read from localStorage (avoid breaking SSR and restricted envs)
    try {
      if (typeof window !== 'undefined') {
        setUsername(window.localStorage.getItem('username'));
        setUseLightAnimations(shouldUseLightAnimations());

        const ua = navigator.userAgent;
        setIsIOS(/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream);

        if (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone) {
          setIsAppInstalled(true);
        }
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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('token');
    const admin = localStorage.getItem('isAdmin') === 'true';
    if (admin) { setIsPremiumOrAdmin(true); return; }
    if (!token) return;
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.premium || d.isAdmin) setIsPremiumOrAdmin(true); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (e: Event) => { e.preventDefault(); setDeferredPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler as EventListener);
    return () => window.removeEventListener('beforeinstallprompt', handler as EventListener);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setIsAppInstalled(true);
      setDeferredPrompt(null);
    }
  };

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
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-20 sm:pt-28 pb-20">
        {/* Homepage Hero Banner – same style as header horizontal ads (Groups/Bots/Articles): 900×250, no crop, no label */}
        {heroCampaigns.length > 0 && (
          <div className="w-full mb-8">
            <HeaderBanner campaigns={heroCampaigns} />
          </div>
        )}

        <div className="text-center max-w-4xl mx-auto">
          {useLightAnimations ? (
            <>
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full glass border-white/10 bg-white/5 mb-8 ${animationClasses.fadeInUp}`}>
                <span className="w-2 h-2 rounded-full bg-[#ff3366] animate-pulse"></span>
                <span className="text-sm font-medium text-white/80">The #1 Verified NSFW Directory</span>
              </div>
              <h1 className={`text-4xl sm:text-5xl md:text-6xl font-black mb-8 leading-tight tracking-tight ${animationClasses.fadeInUp}`} style={{ animationDelay: '0.1s' }}>
                Discover Best <span className="gradient-text">NSFW</span>
                <br />
                <span className="text-[#f5f5f5]">Telegram Groups</span>
              </h1>
            </>
          ) : (
            <>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border-white/10 bg-white/5 mb-8"
              >
                <span className="w-2 h-2 rounded-full bg-[#ff3366] animate-pulse"></span>
                <span className="text-sm font-medium text-white/80">The #1 Verified NSFW Directory</span>
              </motion.div>
              <motion.h1
                className="text-4xl sm:text-5xl md:text-6xl font-black mb-8 leading-tight tracking-tight"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.2, 0.8, 0.2, 1], delay: 0.1 }}
                style={{ willChange: 'transform, opacity' }}
              >
                Discover Best <span className="gradient-text">NSFW</span>
                <br />
                <span className="text-[#f5f5f5]">Telegram Groups</span>
              </motion.h1>
            </>
          )}

          {useLightAnimations ? (
            <p className={`text-lg sm:text-xl md:text-2xl text-[#999] mb-12 max-w-3xl mx-auto px-4 leading-relaxed ${animationClasses.fadeInUp}`} style={{ animationDelay: '0.2s' }}>
              Dive into a world of <span className="text-white font-medium">premium adult communities</span> and <span className="text-white font-medium">interactive AI</span>.
              <br className="hidden sm:block" />
              Connect, explore, and indulge — <span className="text-white/80">safely and anonymously</span>.
            </p>
          ) : (
            <motion.p
              className="text-lg sm:text-xl md:text-2xl text-[#999] mb-12 max-w-3xl mx-auto px-4 leading-relaxed"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.2, 0.8, 0.2, 1], delay: 0.2 }}
              style={{ willChange: 'transform, opacity' }}
            >
              Dive into a world of <span className="text-white font-medium">premium adult communities</span> and <span className="text-white font-medium">interactive AI</span>.
              <br className="hidden sm:block" />
              Connect, explore, and indulge — <span className="text-white/80">safely and anonymously</span>.
            </motion.p>
          )}

          {useLightAnimations ? (
            <div className={`flex flex-col items-center gap-4 mb-20 ${animationClasses.fadeInUp}`} style={{ animationDelay: '0.4s' }}>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center w-full">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setTimeout(() => router.push('/groups'), 0);
                  }}
                  className="w-full sm:w-auto px-8 py-4 bg-[#b31b1b] hover-glow text-white rounded-lg text-lg font-semibold transition-all hover:scale-105"
                >
                  Explore Groups
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setTimeout(() => router.push('/bots'), 0);
                  }}
                  className="w-full sm:w-auto px-8 py-4 bg-[#229ED9] hover:bg-[#1e8bc0] text-white rounded-lg text-lg font-semibold transition-all hover:scale-105"
                >
                  Explore Bots
                </button>
              </div>
              <a
                href="/premium"
                target="_blank"
                rel="noopener nofollow"
                className="group/prem relative sm:w-auto px-6 py-2.5 rounded-lg text-sm font-bold uppercase tracking-[0.1em] transition-all duration-300 hover:scale-105 inline-flex items-center justify-center gap-2 overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, #d4a94c 0%, #e8c66a 20%, #c9973a 40%, #b8860b 60%, #e8c66a 80%, #d4a94c 100%)',
                  border: '1px solid rgba(232,198,106,0.6)',
                  color: '#1a1000',
                  boxShadow: '0 0 25px rgba(201,151,58,0.3), 0 2px 10px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -1px 0 rgba(0,0,0,0.15)',
                }}
              >
                <span className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.05) 45%, transparent 50%, rgba(0,0,0,0.1) 100%)', borderRadius: 'inherit' }} />
                <span className="absolute inset-0 opacity-0 group-hover/prem:opacity-100 transition-opacity duration-500" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 40%, rgba(255,255,255,0.1) 100%)' }} />
                <svg className="relative drop-shadow-sm" width="13" height="13" viewBox="0 0 24 24" fill="#1a1000"><path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z"/></svg>
                <span className="relative drop-shadow-sm">Unlock EROGRAM Premium</span>
                <svg className="relative drop-shadow-sm" width="13" height="13" viewBox="0 0 24 24" fill="#1a1000"><path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z"/></svg>
              </a>
            </div>
          ) : (
            <motion.div
              className="flex flex-col items-center gap-4 mb-20"
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut', delay: 0.4 }}
              style={{ willChange: 'transform, opacity' }}
            >
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center w-full">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setTimeout(() => router.push('/groups'), 0);
                  }}
                  className="w-full sm:w-auto px-8 py-4 bg-[#b31b1b] hover-glow text-white rounded-lg text-lg font-semibold transition-all hover:scale-105"
                >
                  Explore Groups
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setTimeout(() => router.push('/bots'), 0);
                  }}
                  className="w-full sm:w-auto px-8 py-4 bg-[#229ED9] hover:bg-[#1e8bc0] text-white rounded-lg text-lg font-semibold transition-all hover:scale-105"
                >
                  Explore Bots
                </button>
              </div>
              <a
                href="/premium"
                target="_blank"
                rel="noopener nofollow"
                className="group/prem relative sm:w-auto px-6 py-2.5 rounded-lg text-sm font-bold uppercase tracking-[0.1em] transition-all duration-300 hover:scale-105 inline-flex items-center justify-center gap-2 overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, #d4a94c 0%, #e8c66a 20%, #c9973a 40%, #b8860b 60%, #e8c66a 80%, #d4a94c 100%)',
                  border: '1px solid rgba(232,198,106,0.6)',
                  color: '#1a1000',
                  boxShadow: '0 0 25px rgba(201,151,58,0.3), 0 2px 10px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -1px 0 rgba(0,0,0,0.15)',
                }}
              >
                <span className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.05) 45%, transparent 50%, rgba(0,0,0,0.1) 100%)', borderRadius: 'inherit' }} />
                <span className="absolute inset-0 opacity-0 group-hover/prem:opacity-100 transition-opacity duration-500" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 40%, rgba(255,255,255,0.1) 100%)' }} />
                <svg className="relative drop-shadow-sm" width="13" height="13" viewBox="0 0 24 24" fill="#1a1000"><path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z"/></svg>
                <span className="relative drop-shadow-sm">Unlock EROGRAM Premium</span>
                <svg className="relative drop-shadow-sm" width="13" height="13" viewBox="0 0 24 24" fill="#1a1000"><path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z"/></svg>
              </a>
            </motion.div>
          )}

          {/* Install App Buttons — Premium & Admin only */}
          {isPremiumOrAdmin && !isAppInstalled && (
            <div className="flex flex-row items-center justify-center gap-3 mt-5">
              {/* Android install */}
              {!isIOS && deferredPrompt && (
                <button
                  onClick={handleInstallClick}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-semibold transition-all hover:scale-105 active:scale-95"
                  style={{ background: '#3DDC84', color: '#000' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.523 2.236l1.644 2.84a.5.5 0 01-.865.5l-1.663-2.873A9.987 9.987 0 0012 1.5a9.987 9.987 0 00-4.639 1.203L5.698 5.576a.5.5 0 01-.865-.5l1.644-2.84C3.143 4.274 1 7.836 1 12h22c0-4.164-3.143-7.726-6.477-9.764zM7 9a1 1 0 110-2 1 1 0 010 2zm10 0a1 1 0 110-2 1 1 0 010 2zM1 12v7a2 2 0 002 2h18a2 2 0 002-2v-7H1z"/></svg>
                  Install Android App
                </button>
              )}
              {/* iOS install */}
              {isIOS && (
                <button
                  onClick={() => {
                    alert('Tap the Share button (box with arrow) at the bottom of Safari, then tap "Add to Home Screen".');
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-semibold transition-all hover:scale-105 active:scale-95"
                  style={{ background: '#ffffff', color: '#000' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                  Install iOS App
                </button>
              )}
              {/* Desktop/non-iOS without prompt — show both as info */}
              {!isIOS && !deferredPrompt && (
                <span className="text-white/30 text-[11px]">Open on your phone to install the app</span>
              )}
            </div>
          )}
        </div>

        {/* Stats Section */}
        {/* Stats Section */}
        {useLightAnimations ? (
          <div className={`grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mt-20 sm:mt-32 max-w-6xl mx-auto px-4 ${animationClasses.fadeInUp}`} style={{ animationDelay: '0.6s' }}>
            {[
              { number: '10K+', label: 'Active Groups', icon: '🔥' },
              { number: '500+', label: 'AI Bots', icon: '🤖' },
              { number: '500K+', label: 'Members', icon: '👥' },
              { number: '150+', label: 'Countries', icon: '🌍' },
            ].map((stat, idx) => (
              <div
                key={idx}
                className="glass rounded-2xl p-6 text-center hover-glow hover:-translate-y-1 transition-all duration-300 border-white/5 bg-white/[0.02]"
              >
                <div className="text-2xl mb-2">{stat.icon}</div>
                <div className="text-3xl sm:text-4xl font-bold text-white mb-1 tracking-tight">
                  {stat.number}
                </div>
                <div className="text-white/40 text-sm font-medium uppercase tracking-wider">{stat.label}</div>
              </div>
            ))}
          </div>
        ) : (
          <motion.div
            className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mt-20 sm:mt-32 max-w-6xl mx-auto px-4"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.2, 0.8, 0.2, 1], delay: 0.6 }}
            style={{ willChange: 'transform, opacity' }}
          >
            {[
              { number: '10K+', label: 'Active Groups', icon: '🔥' },
              { number: '500+', label: 'AI Bots', icon: '🤖' },
              { number: '500K+', label: 'Members', icon: '👥' },
              { number: '150+', label: 'Countries', icon: '🌍' },
            ].map((stat, idx) => (
              <div
                key={idx}
                className="glass rounded-2xl p-6 text-center hover-glow hover:-translate-y-1 transition-all duration-300 border-white/5 bg-white/[0.02]"
              >
                <div className="text-2xl mb-2">{stat.icon}</div>
                <div className="text-3xl sm:text-4xl font-bold text-white mb-1 tracking-tight">
                  {stat.number}
                </div>
                <div className="text-white/40 text-sm font-medium uppercase tracking-wider">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        )}

        {/* Features Section */}
        {/* Features Section */}
        {useLightAnimations ? (
          <div className={`mt-20 sm:mt-40 max-w-6xl mx-auto px-4 ${animationClasses.fadeInUp}`} style={{ animationDelay: '0.8s' }}>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center mb-12 sm:mb-16 text-[#f5f5f5]">
              Why Choose <span className="gradient-text">erogram</span>?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  icon: '👥',
                  title: 'Active Communities',
                  description: 'Thousands of verified groups and channels for every interest.',
                  className: 'md:col-span-2'
                },
                {
                  icon: '🤖',
                  title: 'AI Companions',
                  description: 'Premium AI bots and chat companions.',
                  className: ''
                },
                {
                  icon: '🔍',
                  title: 'Smart Discovery',
                  description: 'Advanced search and filtering.',
                  className: ''
                },
                {
                  icon: '🛡️',
                  title: 'Safe & Secure',
                  description: 'Verified and moderated content.',
                  className: 'md:col-span-2'
                },
                {
                  icon: '⚡',
                  title: 'Always Updated',
                  description: 'Fresh content added daily.',
                  className: ''
                },
                {
                  icon: '📱',
                  title: 'Mobile Friendly',
                  description: 'Seamless experience on all devices.',
                  className: ''
                },
              ].map((feature, idx) => (
                <div
                  key={idx}
                  className={`glass rounded-2xl p-8 hover-glow transition-all duration-300 ${feature.className} flex flex-col justify-center`}
                >
                  <div className="text-4xl mb-4">{feature.icon}</div>
                  <h3 className="text-xl font-bold mb-2 text-[#f5f5f5]">
                    {feature.title}
                  </h3>
                  <p className="text-[#999] text-sm">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <motion.div
            className="mt-20 sm:mt-40 max-w-6xl mx-auto px-4"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }}
            style={{ willChange: 'transform, opacity' }}
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center mb-12 sm:mb-16 text-[#f5f5f5]">
              Why Choose <span className="gradient-text">erogram</span>?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  icon: '👥',
                  title: 'Active Communities',
                  description: 'Thousands of verified groups and channels for every interest.',
                  className: 'md:col-span-2'
                },
                {
                  icon: '🤖',
                  title: 'AI Companions',
                  description: 'Premium AI bots and chat companions.',
                  className: ''
                },
                {
                  icon: '🔍',
                  title: 'Smart Discovery',
                  description: 'Advanced search and filtering.',
                  className: ''
                },
                {
                  icon: '🛡️',
                  title: 'Safe & Secure',
                  description: 'Verified and moderated content.',
                  className: 'md:col-span-2'
                },
                {
                  icon: '⚡',
                  title: 'Always Updated',
                  description: 'Fresh content added daily.',
                  className: ''
                },
                {
                  icon: '📱',
                  title: 'Mobile Friendly',
                  description: 'Seamless experience on all devices.',
                  className: ''
                },
              ].map((feature, idx) => (
                <motion.div
                  key={idx}
                  className={`glass rounded-2xl p-8 hover-glow transition-all duration-300 ${feature.className} flex flex-col justify-center`}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                >
                  <div className="text-4xl mb-4">{feature.icon}</div>
                  <h3 className="text-xl font-bold mb-2 text-[#f5f5f5]">
                    {feature.title}
                  </h3>
                  <p className="text-[#999] text-sm">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Articles Carousel Section */}
        {featuredArticles.length > 0 && (
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeInUp}
            className="mt-20 sm:mt-40 max-w-7xl mx-auto px-4"
            style={{ willChange: 'transform, opacity' }}
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center mb-12 sm:mb-16 text-[#f5f5f5]">
              Latest <span className="gradient-text">Articles</span>
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
                  <Link href={`/articles/${article.slug}`}>
                    {article.featuredImage && (
                      <div className="aspect-video overflow-hidden relative">
                        <Image
                          src={article.featuredImage}
                          alt={article.title}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          className="object-cover hover:scale-105 transition-transform duration-300"
                          priority={idx < 3} // Prioritize first 3 images for LCP
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
                        <span>By {article.author.username}</span>
                        {article.publishedAt && (
                          <span>
                            {new Date(article.publishedAt).toLocaleDateString('en-US', {
                              timeZone: 'UTC',
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
            <div className="text-center mt-8">
              <Link href="/articles">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-6 py-3 bg-[#b31b1b] hover-glow text-white rounded-lg text-lg font-semibold transition-all"
                  style={{ willChange: 'transform' }}
                >
                  View All Articles
                </motion.button>
              </Link>
            </div>
          </motion.div>
        )}

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
              Fresh <span className="gradient-text">New Additions</span>
            </h2>
            <p className="text-center text-[#999] text-sm mb-12 sm:mb-16 max-w-xl mx-auto">
              The latest groups added to Erogram — updated daily
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
                    href={`/${group.slug}`}
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
                          New
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
                href="/groups"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#b31b1b] hover:bg-[#d32f2f] text-white rounded-lg text-lg font-semibold transition-all hover:scale-105"
              >
                Browse All Groups
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
            Curated <span className="gradient-text">Top Lists</span>
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              'Amateur', 'Hentai', 'Onlyfans',
              'Asian', 'Anal', 'Roleplay', 'Gay',
              'Lesbian', 'MILF', 'BDSM', 'Cosplay'
            ].map((cat, idx) => (
              <Link
                key={cat}
                href={`/best-telegram-groups/${cat.toLowerCase()}`}
                className="glass p-4 rounded-xl border border-white/5 hover:border-[#b31b1b] transition-all hover:scale-105 text-center group"
              >
                <div className="text-lg font-bold text-[#f5f5f5] group-hover:text-[#b31b1b] transition-colors">
                  Best {cat} Groups
                </div>
                <div className="text-xs text-[#999] mt-1">
                  Top 10 Collections
                </div>
              </Link>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link
              href="/groups"
              className="text-[#999] hover:text-[#b31b1b] text-sm underline transition-colors"
            >
              View all categories
            </Link>
          </div>
        </motion.div>

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
            Frequently Asked <span className="gradient-text">Questions</span>
          </h2>
          <div className="space-y-6">
            {[
              {
                question: "What is Erogram?",
                answer: "Erogram is the ultimate directory for discovering NSFW Telegram groups, channels, and AI companion bots. We curate and verify adult-oriented communities and bots to help you find like-minded people and engaging AI companions that match your interests."
              },
              {
                question: "What's the difference between groups and bots?",
                answer: "Groups are community spaces where multiple people chat and interact, while bots are AI-powered companions that provide personalized conversations, entertainment, and interactive experiences. Both are fully integrated into our platform."
              },
              {
                question: "Are all communities and bots safe?",
                answer: "Yes, we take safety seriously. All groups and bots listed on Erogram are verified and moderated to ensure they meet our community standards. We regularly review content to maintain a safe environment for all users."
              },
              {
                question: "How do I join a Telegram group or use a bot?",
                answer: "Simply click on any group or bot card and follow the Telegram link. You'll be redirected to Telegram where you can join the group or start chatting with the bot instantly. Make sure you have the Telegram app installed for the best experience."
              },
              {
                question: "Is Erogram free to use?",
                answer: "Yes, Erogram is completely free to use. We don't charge for browsing groups, using bots, joining communities, or accessing our content. Our service is supported through partnerships and donations."
              },
              {
                question: "How often are new groups and bots added?",
                answer: "We add fresh groups and bots daily from our community submissions. Our team reviews and approves new content regularly to ensure quality and relevance. Check back often for the latest additions!"
              },
              {
                question: "Can I submit my own group or bot?",
                answer: "Yes! You can submit your own group or bot using the 'Add' button in the navigation bar. Fill out the form with your details, and our team will review and approve it. Once approved, your content will be visible to all users on our platform."
              }
            ].map((faq, idx) => (
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
                  {faq.question}
                </h3>
                <p className="text-[#999] text-sm sm:text-base leading-relaxed">
                  {faq.answer}
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
