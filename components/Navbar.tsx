'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useTranslation, useLocalePath, useLocale } from '@/lib/i18n/client';
import { LOCALES, type Locale, localePath as buildLocalePath } from '@/lib/i18n/config';


const DEFAULT_NAVBAR_CTA = {
  destinationUrl: 'https://lovescape.com/create-ai-sex-girlfriend/style?userId=5ebe4f139af9bcff39155f3e9f06fbce233415fd82fd4da2a9c51ea0921d4c0e&sourceId=Erogram&creativeId=6step_hent&p1=test',
  description: 'Meet your AI slut',
};

interface NavbarProps {
  username?: string | null;
  setUsername?: (username: string | null) => void;
  showAddGroup?: boolean;
  onAddGroupClick?: () => void;
}

const BTN = 'text-[13px] px-3.5 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap';
const BTN_NAV = `${BTN} text-white/80 bg-white/[0.07] border border-white/[0.10] hover:bg-white/[0.13] hover:text-white`;
const BTN_FILLED = `${BTN} text-white`;

const NAV_COLORS: Record<string, string> = {
  Groups:    `${BTN} text-red-400/90 bg-[#b31b1b]/[0.12] border border-[#b31b1b]/25 hover:bg-[#b31b1b]/25 hover:text-red-300`,
  Bots:      `${BTN} text-sky-400/90 bg-sky-900/[0.15] border border-sky-700/25 hover:bg-sky-900/25 hover:text-sky-300`,
  Articles:  `${BTN} text-white/75 bg-white/[0.07] border border-white/[0.10] hover:bg-white/[0.13] hover:text-white`,
  Advertise: `${BTN} text-white/75 bg-white/[0.07] border border-white/[0.10] hover:bg-white/[0.13] hover:text-white`,
  Login:     `${BTN} text-white/90 bg-white/[0.10] border border-white/[0.18] hover:bg-white/[0.18] hover:text-white`,
};

const LOCALE_FLAGS: Record<Locale, string> = { en: '🇺🇸', de: '🇩🇪', es: '🇪🇸' };

export default function Navbar({ username, setUsername, showAddGroup, onAddGroupClick }: NavbarProps) {
  const { t } = useTranslation();
  const lp = useLocalePath();
  const { locale } = useLocale();
  const [mounted, setMounted] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [navbarCta, setNavbarCta] = useState<{ _id: string; destinationUrl: string; description: string; buttonText: string } | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isAppInstalled, setIsAppInstalled] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream);
    if (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone) setIsAppInstalled(true);
    const handler = (e: Event) => { e.preventDefault(); setDeferredPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler as EventListener);
    return () => window.removeEventListener('beforeinstallprompt', handler as EventListener);
  }, []);

  useEffect(() => {
    fetch('/api/campaigns/placement?slot=navbar-cta', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => { if (d?.campaign?.destinationUrl) setNavbarCta(d.campaign); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!username && setUsername) {
      const stored = localStorage.getItem('username');
      if (stored) setUsername(stored);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  useEffect(() => {
    if (!isUserMenuOpen || !mounted) return;
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setIsUserMenuOpen(false);
    };
    const t = setTimeout(() => document.addEventListener('mousedown', handler, true), 100);
    return () => { clearTimeout(t); document.removeEventListener('mousedown', handler, true); };
  }, [isUserMenuOpen, mounted]);

  useEffect(() => {
    if (!langOpen || !mounted) return;
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
    };
    const t = setTimeout(() => document.addEventListener('mousedown', handler, true), 100);
    return () => { clearTimeout(t); document.removeEventListener('mousedown', handler, true); };
  }, [langOpen, mounted]);

  useEffect(() => {
    if (!mounted) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.premium) setIsPremium(true); if (d.isAdmin) { setIsAdminUser(true); localStorage.setItem('isAdmin', 'true'); } })
      .catch(() => {});
  }, [mounted]);

  const currentUsername = username ?? (mounted ? localStorage.getItem('username') : null);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('firstName');
    localStorage.removeItem('photoUrl');
    if (setUsername) setUsername(null);
    setIsMenuOpen(false);
    setIsUserMenuOpen(false);
  };

  const navLinks = [
    { href: lp('/groups'), label: t('nav.groups', 'Groups'), colorKey: 'Groups' },
    { href: lp('/bots'), label: t('nav.bots', 'Bots'), colorKey: 'Bots' },
    { href: '/articles', label: t('nav.articles', 'Articles'), colorKey: 'Articles' },
  ];

  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06] bg-[#0d0d0d]/95 backdrop-blur-md"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex justify-between items-center">
        {/* Logo */}
        <Link href="/" className="flex-shrink-0">
          <span className="text-xl font-bold gradient-text">erogram</span>
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-1.5 lg:gap-2">
          {navLinks.map(link => (
            <Link key={link.href} href={link.href} className={NAV_COLORS[link.colorKey] || BTN_NAV}>
              {link.label}
            </Link>
          ))}

          <a
            href={navbarCta?.destinationUrl ?? DEFAULT_NAVBAR_CTA.destinationUrl}
            target="_blank"
            rel="sponsored noopener noreferrer"
            onClick={() => { if (navbarCta?._id) fetch('/api/campaigns/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ campaignId: navbarCta._id, placement: 'navbar-cta' }) }).catch(() => {}); }}
            className={`${BTN} text-white bg-pink-600 hover:bg-pink-500 shadow-sm shadow-pink-600/20`}
          >
            {(navbarCta?.description || navbarCta?.buttonText) || DEFAULT_NAVBAR_CTA.description}
          </a>

          <Link href={lp('/add')} className={`${BTN_NAV} !text-[#4ab3f4] !bg-[#0088cc]/[0.10] !border-[#0088cc]/25 hover:!bg-[#0088cc]/[0.18] inline-flex items-center gap-1`}>
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
            {t('nav.add', 'Add')}
          </Link>

          {/* Erogram Premium */}
          {!isPremium && (
            <Link
              href={currentUsername ? '/premium' : '/premiumvault'}
              target={currentUsername ? '_blank' : undefined}
              className="relative overflow-hidden text-[12px] px-3 py-1.5 rounded-lg font-bold tracking-wide whitespace-nowrap inline-flex items-center gap-1 transition-all hover:scale-[1.03]"
              style={{
                background: 'linear-gradient(135deg, #c9973a 0%, #e8ba5a 40%, #c9973a 60%, #a67c2e 100%)',
                color: '#0d0c0a',
                border: '1px solid rgba(232,186,90,0.5)',
                boxShadow: '0 2px 12px rgba(201,151,58,0.25)',
              }}
            >
              <span className="absolute inset-0 overflow-hidden rounded-lg pointer-events-none">
                <span className="absolute inset-0 -translate-x-full animate-[shimmer_2.5s_ease-in-out_infinite]" style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.25) 50%, transparent 100%)' }} />
              </span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="relative">
                <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <span className="relative">Premium</span>
            </Link>
          )}

          {/* Language Switcher */}
          <div className="relative" ref={langRef}>
            <button
              onClick={() => setLangOpen(!langOpen)}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-sm hover:bg-white/10 transition-colors"
              aria-label="Change language"
            >
              <span className="text-base leading-none">{LOCALE_FLAGS[locale]}</span>
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={`text-white/50 transition-transform ${langOpen ? 'rotate-180' : ''}`}><path d="M6 9l6 6 6-6"/></svg>
            </button>
            <AnimatePresence>
              {mounted && langOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.12 }}
                  className="absolute right-0 mt-1 w-32 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden py-1"
                >
                  {LOCALES.map(l => {
                    const currentPath = typeof window !== 'undefined' ? window.location.pathname.replace(/^\/(de|es)/, '') || '/' : '/';
                    const href = buildLocalePath(currentPath, l);
                    return (
                      <a
                        key={l}
                        href={href}
                        onClick={() => setLangOpen(false)}
                        className={`flex items-center gap-2.5 px-3.5 py-2 text-[13px] transition-colors ${locale === l ? 'text-white bg-white/5 font-medium' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                      >
                        <span className="text-base leading-none">{LOCALE_FLAGS[l]}</span>
                        {l === 'en' ? 'English' : l === 'de' ? 'Deutsch' : 'Español'}
                      </a>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* User */}
          {currentUsername ? (
            <div className="relative" ref={userMenuRef} suppressHydrationWarning>
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-1.5 text-[13px] font-semibold text-white/90 hover:text-white transition-all px-3.5 py-1.5 rounded-lg bg-white/[0.10] border border-white/[0.14] hover:bg-white/[0.18]"
              >
                <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[11px]">
                  {currentUsername.charAt(0).toUpperCase()}
                </div>
                <span className="max-w-[80px] truncate">{currentUsername}</span>
                {isPremium && <svg width="10" height="10" viewBox="0 0 24 24" fill="#f59e0b" className="shrink-0"><path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z"/></svg>}
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`}><path d="M6 9l6 6 6-6"/></svg>
              </button>

              <AnimatePresence>
                {mounted && isUserMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-1.5 w-52 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden"
                  >
                    <div className="px-4 py-2.5 text-[13px] font-medium text-white/50 border-b border-white/5 flex items-center gap-2">
                      {currentUsername}
                      {isPremium && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20">VIP</span>
                      )}
                    </div>
                    <div className="py-1">
                      {isAdminUser && (
                        <Link href="/admin" onClick={() => setIsUserMenuOpen(false)} className="flex items-center gap-2.5 px-4 py-2 text-[13px] text-amber-400 hover:text-amber-300 hover:bg-amber-500/5 transition font-semibold">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
                          {t('nav.adminPanel', 'Admin Panel')}
                        </Link>
                      )}
                      <Link href={lp('/profile')} onClick={() => setIsUserMenuOpen(false)} className="flex items-center gap-2.5 px-4 py-2 text-[13px] text-white/70 hover:text-white hover:bg-white/5 transition">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/></svg>
                        {t('nav.profile', 'Profile')}
                      </Link>
                      <Link href={`${lp('/profile')}?tab=saved`} onClick={() => setIsUserMenuOpen(false)} className="flex items-center gap-2.5 px-4 py-2 text-[13px] text-white/70 hover:text-white hover:bg-white/5 transition">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>
                        {t('nav.saved', 'Saved')}
                      </Link>
                      {(isPremium || isAdminUser) && !isAppInstalled && (
                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            if (deferredPrompt) {
                              deferredPrompt.prompt();
                              deferredPrompt.userChoice.then((r: any) => { if (r.outcome === 'accepted') setIsAppInstalled(true); });
                              setDeferredPrompt(null);
                            } else if (isIOS) {
                              alert('Tap the Share button (box with arrow) at the bottom of Safari, then tap "Add to Home Screen".');
                            }
                          }}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-[13px] text-white/70 hover:text-white hover:bg-white/5 transition text-left"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                          {t('nav.downloadApp', 'Download App')}
                        </button>
                      )}
                      <div className="border-t border-white/5 mt-1 pt-1">
                        <button
                          onClick={() => { handleLogout(); setIsUserMenuOpen(false); }}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-[13px] text-white/40 hover:text-red-400 hover:bg-red-500/5 transition text-left"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
                          {t('nav.logout', 'Logout')}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <span suppressHydrationWarning>
              <Link href={lp('/login')} className={NAV_COLORS['Login'] || BTN_NAV}>
                {t('nav.login', 'Login')}
              </Link>
            </span>
          )}
        </div>

        {/* Mobile: flag + burger */}
        <div className="md:hidden flex items-center gap-2">
          {/* Mobile flag switcher - always visible */}
          <div className="relative" ref={langRef}>
            <button
              onClick={() => setLangOpen(!langOpen)}
              className="flex items-center gap-0.5 px-1.5 py-1 rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Change language"
            >
              <span className="text-lg leading-none">{LOCALE_FLAGS[locale]}</span>
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={`text-white/50 transition-transform ${langOpen ? 'rotate-180' : ''}`}><path d="M6 9l6 6 6-6"/></svg>
            </button>
            <AnimatePresence>
              {mounted && langOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.12 }}
                  className="absolute right-0 mt-1 w-32 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden py-1"
                >
                  {LOCALES.map(l => {
                    const currentPath = typeof window !== 'undefined' ? window.location.pathname.replace(/^\/(de|es)/, '') || '/' : '/';
                    const href = buildLocalePath(currentPath, l);
                    return (
                      <a
                        key={l}
                        href={href}
                        onClick={() => setLangOpen(false)}
                        className={`flex items-center gap-2.5 px-3.5 py-2 text-[13px] transition-colors ${locale === l ? 'text-white bg-white/5 font-medium' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                      >
                        <span className="text-base leading-none">{LOCALE_FLAGS[l]}</span>
                        {l === 'en' ? 'English' : l === 'de' ? 'Deutsch' : 'Español'}
                      </a>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex flex-col gap-1.5 w-8 h-8 items-center justify-center"
            aria-label="Toggle menu"
          >
            <motion.span className="w-5 h-0.5 bg-white/70 rounded-full" animate={{ rotate: isMenuOpen ? 45 : 0, y: isMenuOpen ? 6 : 0 }} transition={{ duration: 0.2 }} />
            <motion.span className="w-5 h-0.5 bg-white/70 rounded-full" animate={{ opacity: isMenuOpen ? 0 : 1 }} transition={{ duration: 0.2 }} />
            <motion.span className="w-5 h-0.5 bg-white/70 rounded-full" animate={{ rotate: isMenuOpen ? -45 : 0, y: isMenuOpen ? -6 : 0 }} transition={{ duration: 0.2 }} />
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <motion.div
        className="md:hidden overflow-hidden"
        initial={false}
        animate={{ height: isMenuOpen ? 'auto' : 0, opacity: isMenuOpen ? 1 : 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="px-4 pb-4 space-y-2 border-t border-white/[0.06] pt-3">
          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setIsMenuOpen(false)}
              className={`block px-4 py-2.5 rounded-lg text-[14px] ${NAV_COLORS[link.colorKey] || BTN_NAV}`}
            >
              {link.label}
            </Link>
          ))}

          <a
            href={navbarCta?.destinationUrl ?? DEFAULT_NAVBAR_CTA.destinationUrl}
            target="_blank"
            rel="sponsored noopener noreferrer"
            onClick={() => {
              if (navbarCta?._id) fetch('/api/campaigns/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ campaignId: navbarCta._id, placement: 'navbar-cta' }) }).catch(() => {});
              setIsMenuOpen(false);
            }}
            className="block px-4 py-2.5 rounded-lg text-[14px] font-bold text-white text-center bg-pink-600 hover:bg-pink-500 shadow-sm shadow-pink-600/20 transition"
          >
            {(navbarCta?.description || navbarCta?.buttonText) || DEFAULT_NAVBAR_CTA.description}
          </a>

          <Link
            href={lp('/add')}
            onClick={() => setIsMenuOpen(false)}
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg text-[14px] font-semibold text-[#4ab3f4] bg-[#0088cc]/[0.10] border border-[#0088cc]/25 hover:bg-[#0088cc]/[0.18] transition"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
            {t('nav.addGroupOrBot', 'Add Group or Bot')}
          </Link>

          {!isPremium && (
            <Link
              href={currentUsername ? '/premium' : '/premiumvault'}
              target={currentUsername ? '_blank' : undefined}
              onClick={() => setIsMenuOpen(false)}
              className="relative overflow-hidden flex items-center justify-center gap-2 w-full px-4 py-3 rounded-lg text-[14px] font-black tracking-wide transition-all"
              style={{
                background: 'linear-gradient(135deg, #c9973a 0%, #e8ba5a 40%, #c9973a 60%, #a67c2e 100%)',
                color: '#0d0c0a',
                border: '1px solid rgba(232,186,90,0.5)',
                boxShadow: '0 2px 16px rgba(201,151,58,0.3)',
              }}
            >
              <span className="absolute inset-0 overflow-hidden rounded-lg pointer-events-none">
                <span className="absolute inset-0 -translate-x-full animate-[shimmer_2.5s_ease-in-out_infinite]" style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.25) 50%, transparent 100%)' }} />
              </span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="relative">
                <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <span className="relative">EROGRAM PREMIUM</span>
            </Link>
          )}

          {/* Mobile Language Switcher */}
          <div className="flex items-center gap-1.5 px-2 py-1">
            {LOCALES.map(l => {
              const currentPath = typeof window !== 'undefined' ? window.location.pathname.replace(/^\/(de|es)/, '') || '/' : '/';
              const href = buildLocalePath(currentPath, l);
              return (
                <a
                  key={l}
                  href={href}
                  onClick={() => setIsMenuOpen(false)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${locale === l ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
                >
                  <span className="text-base leading-none">{LOCALE_FLAGS[l]}</span>
                  {l === 'en' ? 'EN' : l === 'de' ? 'DE' : 'ES'}
                </a>
              );
            })}
          </div>

          <div className="h-px bg-white/[0.06] my-1" />

          {currentUsername ? (
            <div className="space-y-1.5" suppressHydrationWarning>
              <div className="px-4 py-2 text-[13px] text-white/40 flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[11px] text-white/60">
                  {currentUsername.charAt(0).toUpperCase()}
                </div>
                {currentUsername}
                {isPremium && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20">VIP</span>}
              </div>
              {isAdminUser && (
                <Link href="/admin" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-2 w-full px-4 py-2.5 rounded-lg text-[14px] font-semibold text-amber-400 bg-amber-500/[0.08] border border-amber-500/20 hover:bg-amber-500/[0.14] transition">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
                  {t('nav.adminPanel', 'Admin Panel')}
                </Link>
              )}
              <Link href={lp('/profile')} onClick={() => setIsMenuOpen(false)} className="block px-4 py-2 rounded-lg text-[14px] text-white/70 hover:text-white hover:bg-white/5 transition">
                {t('nav.profile', 'Profile')}
              </Link>
              <Link href={`${lp('/profile')}?tab=saved`} onClick={() => setIsMenuOpen(false)} className="block px-4 py-2 rounded-lg text-[14px] text-white/70 hover:text-white hover:bg-white/5 transition">
                {t('nav.saved', 'Saved')}
              </Link>
              {(isPremium || isAdminUser) && !isAppInstalled && (
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    if (deferredPrompt) {
                      deferredPrompt.prompt();
                      deferredPrompt.userChoice.then((r: any) => { if (r.outcome === 'accepted') setIsAppInstalled(true); });
                      setDeferredPrompt(null);
                    } else if (isIOS) {
                      alert('Tap the Share button (box with arrow) at the bottom of Safari, then tap "Add to Home Screen".');
                    }
                  }}
                  className="w-full px-4 py-2 rounded-lg text-[14px] text-white/70 hover:text-white hover:bg-white/5 transition text-left flex items-center gap-2"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                  {t('nav.downloadApp', 'Download App')}
                </button>
              )}
              <button
                onClick={handleLogout}
                className="w-full px-4 py-2 rounded-lg text-[14px] text-white/40 hover:text-red-400 hover:bg-red-500/5 transition text-left"
              >
                {t('nav.logout', 'Logout')}
              </button>
            </div>
          ) : (
            <Link
              href={lp('/login')}
              onClick={() => setIsMenuOpen(false)}
              className={`block text-center px-4 py-2.5 rounded-lg text-[14px] ${NAV_COLORS['Login'] || BTN_NAV}`}
            >
              {t('nav.login', 'Login')}
            </Link>
          )}
        </div>
      </motion.div>


    </motion.nav>
  );
}
