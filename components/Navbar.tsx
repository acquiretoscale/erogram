'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useTranslation, useLocalePath, useLocale } from '@/lib/i18n/client';
import { LOCALES, type Locale, localePath as buildLocalePath } from '@/lib/i18n/config';
import { OF_CATEGORIES } from '@/app/onlyfanssearch/constants';
import { trackClick as trackCampaignClick } from '@/lib/actions/campaigns';
import { getCampaignPlacement } from '@/lib/actions/publicData';

const OF_SEARCH_VOLUMES: Record<string, string> = {
  asian:     '165K', blonde:   '142K', teen:    '128K',
  'big-boobs': '135K', milf:  '118K', 'big-ass': '112K',
  latina:    '98K',  amateur:  '94K',  petite:  '88K',
  redhead:   '72K',  brunette: '67K',  goth:    '28K',
  ahegao:    '14K',  alt:      '9K',
};


const DEFAULT_NAVBAR_CTA = null;

interface NavbarProps {
  username?: string | null;
  setUsername?: (username: string | null) => void;
  showAddGroup?: boolean;
  onAddGroupClick?: () => void;
  variant?: 'default' | 'onlyfans';
}

const BTN = 'text-[13px] px-3.5 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap';
const BTN_NAV = `${BTN} text-white/80 bg-white/[0.07] border border-white/[0.10] hover:bg-white/[0.13] hover:text-white`;

/** Same blue treatment as Telegram NSFW */
const TELEGRAM_BLUE_NAV =
  'text-[13px] font-semibold text-[#4ab3f4] bg-[#0088cc]/[0.10] border border-[#0088cc]/25 hover:bg-[#0088cc]/[0.18] hover:text-[#6ec6f7] transition-all whitespace-nowrap';

/** Pink pill for navbar CTA (e.g. Meet your AI slut) */
const PINK_CTA_NAV =
  'text-[13px] font-semibold text-white bg-pink-600 border border-pink-400/45 hover:bg-pink-500 hover:border-pink-300/60 shadow-sm shadow-pink-900/30 transition-all whitespace-nowrap';

const NAV_COLORS: Record<string, string> = {
  Groups:    `${BTN} text-[#4ab3f4] bg-[#0088cc]/[0.10] border border-[#0088cc]/25 hover:bg-[#0088cc]/[0.18] hover:text-[#6ec6f7]`,
  Bots:      `${BTN} text-[#4ab3f4] bg-[#0088cc]/[0.10] border border-[#0088cc]/25 hover:bg-[#0088cc]/[0.18] hover:text-[#6ec6f7]`,
  Articles:  `${BTN} text-white/75 bg-white/[0.07] border border-white/[0.10] hover:bg-white/[0.13] hover:text-white`,
  'OnlyFans Search': `${BTN} text-white bg-[#00AFF0] border border-[#00AFF0] hover:bg-[#009dd9] hover:border-[#009dd9] shadow-sm shadow-[#00AFF0]/25`,
  Advertise: `${BTN} text-white/75 bg-white/[0.07] border border-white/[0.10] hover:bg-white/[0.13] hover:text-white`,
  Login:     `${BTN} text-white/90 bg-white/[0.10] border border-white/[0.18] hover:bg-white/[0.18] hover:text-white`,
};

const LOCALE_FLAGS: Record<Locale, string> = { en: '🇺🇸', de: '🇩🇪', es: '🇪🇸' };

export default function Navbar({ username, setUsername, showAddGroup, onAddGroupClick, variant = 'default' }: NavbarProps) {
  const { t } = useTranslation();
  const lp = useLocalePath();
  const { locale } = useLocale();
  const [mounted, setMounted] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [mobileLangOpen, setMobileLangOpen] = useState(false);
  const mobileLangRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);
  const [ofOpen, setOfOpen] = useState(false);
  const ofRef = useRef<HTMLDivElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [mobileOfOpen, setMobileOfOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [navbarCta, setNavbarCta] = useState<{ _id: string; destinationUrl: string; description: string; buttonText: string } | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isAppInstalled, setIsAppInstalled] = useState(false);

  const [showLangSwitcher, setShowLangSwitcher] = useState(true);
  useEffect(() => {
    setMounted(true);
    const path = window.location.pathname.replace(/^\/(de|es)/, '') || '/';
    if (path.endsWith('-onlyfans') || path.startsWith('/ainsfw') || path.startsWith('/articles')) {
      setShowLangSwitcher(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream);
    if (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone) setIsAppInstalled(true);
    const handler = (e: Event) => { e.preventDefault(); setDeferredPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler as EventListener);
    return () => window.removeEventListener('beforeinstallprompt', handler as EventListener);
  }, []);

  useEffect(() => {
    getCampaignPlacement('navbar-cta')
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
    if (!mobileLangOpen || !mounted) return;
    const handler = (e: MouseEvent) => {
      if (mobileLangRef.current && !mobileLangRef.current.contains(e.target as Node)) setMobileLangOpen(false);
    };
    const t = setTimeout(() => document.addEventListener('mousedown', handler, true), 100);
    return () => { clearTimeout(t); document.removeEventListener('mousedown', handler, true); };
  }, [mobileLangOpen, mounted]);

  useEffect(() => {
    if (!ofOpen || !mounted) return;
    const handler = (e: MouseEvent) => {
      if (ofRef.current && !ofRef.current.contains(e.target as Node)) setOfOpen(false);
    };
    const t = setTimeout(() => document.addEventListener('mousedown', handler, true), 100);
    return () => { clearTimeout(t); document.removeEventListener('mousedown', handler, true); };
  }, [ofOpen, mounted]);

  useEffect(() => {
    if (!mounted) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.premium) setIsPremium(true); if (d.isAdmin) { setIsAdminUser(true); localStorage.setItem('isAdmin', 'true'); } if (d.username) localStorage.setItem('username', d.username); })
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
          <span className="text-xl font-bold"><span className="text-white">ERO</span><span className={variant === 'onlyfans' ? 'text-[#00AFF0]' : 'text-red-500'}>gram</span></span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1.5 lg:gap-2">

          {/* Pillar 1 — Telegram: Groups, Bots */}
          <Link href={lp('/groups')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-semibold text-[#4ab3f4] bg-[#0088cc]/[0.10] border border-[#0088cc]/25 hover:bg-[#0088cc]/[0.18] hover:text-[#6ec6f7] transition-all whitespace-nowrap">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" className="shrink-0 opacity-80">
              <path d="M20.665 3.717l-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701h-.002l.002.001-.314 4.692c.46 0 .663-.211.921-.46l2.211-2.15 4.599 3.397c.848.467 1.457.227 1.668-.785l3.019-14.228c.309-1.239-.473-1.8-1.282-1.434z"/>
            </svg>
            {t('nav.groups', 'Groups')}
          </Link>
          <Link href={lp('/bots')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-semibold text-[#4ab3f4] bg-[#0088cc]/[0.10] border border-[#0088cc]/25 hover:bg-[#0088cc]/[0.18] hover:text-[#6ec6f7] transition-all whitespace-nowrap">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-80">
              <rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="9" cy="16" r="1"/><circle cx="15" cy="16" r="1"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>
            </svg>
            {t('nav.bots', 'Bots')}
          </Link>
          <Link href={lp('/ainsfw')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${TELEGRAM_BLUE_NAV}`}>
            <span className="text-sm leading-none shrink-0">🔞</span>
            AI NSFW
          </Link>

          {/* OnlyFans Search */}
          <div className="relative" ref={ofRef} onMouseEnter={() => setOfOpen(true)} onMouseLeave={() => setOfOpen(false)}>
            <Link
              href="/onlyfanssearch"
              className="inline-block px-3.5 py-1.5 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 shadow-sm transition-all whitespace-nowrap"
            >
              <span className="text-sm font-bold text-[#00AFF0]">OFsearch</span>
            </Link>

            <AnimatePresence>
              {mounted && ofOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.1 }}
                  className="absolute left-0 mt-1.5 w-[260px] bg-white rounded-xl shadow-[0_12px_36px_-6px_rgba(0,0,0,0.2)] border border-gray-200 z-50 overflow-hidden"
                >
                  <div className="px-2.5 pt-2 pb-0.5">
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Best OnlyFans Accounts</p>
                  </div>
                  <div className="grid grid-cols-3 px-1.5 pb-2 gap-px">
                    {OF_CATEGORIES.map((cat) => (
                      <Link
                        key={cat.slug}
                        href={`/best-onlyfans-accounts/${cat.slug}`}
                        onClick={() => setOfOpen(false)}
                        className="group flex items-center justify-between gap-0.5 px-2 py-1 rounded-lg hover:bg-[#00AFF0]/[0.07] transition-colors"
                      >
                        <span className="text-[11px] font-semibold text-gray-700 group-hover:text-[#00AFF0] transition-colors truncate">{cat.name}</span>
                        <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 flex-shrink-0"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
                      </Link>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* AI CTA — only shows when an active campaign exists */}
          {navbarCta && (
            <a
              href={navbarCta.destinationUrl}
              target="_blank"
              rel="sponsored noopener noreferrer"
              onClick={() => trackCampaignClick(navbarCta._id, 'navbar-cta')}
              className={`px-3 py-1.5 rounded-lg ${PINK_CTA_NAV}`}
            >
              {navbarCta.description || navbarCta.buttonText}
            </a>
          )}

          <Link href="/articles" className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${BTN_NAV}`}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-80"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            {t('nav.articles', 'Articles')}
          </Link>

          <Link href={lp('/add')} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[13px] font-semibold text-[#4ab3f4] bg-[#0088cc]/[0.10] border border-[#0088cc]/25 hover:bg-[#0088cc]/[0.18] hover:text-[#6ec6f7] transition-all whitespace-nowrap">
            <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
            {t('nav.add', 'Add')}
          </Link>

          {/* Utility — User menu */}
          {currentUsername ? (
            <div className="relative" ref={userMenuRef} suppressHydrationWarning>
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${TELEGRAM_BLUE_NAV}`}
              >
                <div className="w-6 h-6 rounded-full bg-[#0088cc]/25 flex items-center justify-center text-[11px] text-[#6ec6f7]">
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
                      {isAdminUser && (
                        <Link href="/OF" onClick={() => setIsUserMenuOpen(false)} className="flex items-center gap-2.5 px-4 py-2 text-[13px] text-[#4ab3f4] hover:text-[#6ec6f7] hover:bg-[#0088cc]/5 transition font-semibold">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"/><path d="M8 12h8M12 8v8"/></svg>
                          OF Admin
                        </Link>
                      )}
                      {isAdminUser && mounted && localStorage.getItem('username') === 'eros' && (
                        <>
                          <div className="h-px bg-white/[0.06] mx-3 my-1" />
                          <Link href="/enzogonzo" onClick={() => setIsUserMenuOpen(false)} className="flex items-center gap-2.5 px-4 py-2 text-[13px] text-[#00AFF0] hover:text-[#00D4FF] hover:bg-[#00AFF0]/5 transition font-semibold">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1.5" fill="currentColor"/></svg>
                            Onlygram
                          </Link>
                          <div className="h-px bg-white/[0.06] mx-3 my-1" />
                        </>
                      )}
                      <Link href={lp('/profile')} onClick={() => setIsUserMenuOpen(false)} className="flex items-center gap-2.5 px-4 py-2 text-[13px] text-white/70 hover:text-white hover:bg-white/5 transition">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/></svg>
                        {t('nav.profile', 'Profile')}
                      </Link>
                      <Link href={`${lp('/profile')}?tab=saved`} onClick={() => setIsUserMenuOpen(false)} className="flex items-center gap-2.5 px-4 py-2 text-[13px] text-white/70 hover:text-white hover:bg-white/5 transition">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>
                        {t('nav.saved', 'Saved')}
                      </Link>
                      <Link href="/articles" onClick={() => setIsUserMenuOpen(false)} className="flex items-center gap-2.5 px-4 py-2 text-[13px] text-white/70 hover:text-white hover:bg-white/5 transition">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                        {t('nav.articles', 'Articles')}
                      </Link>
                      <Link href={`${lp('/profile')}?tab=settings`} onClick={() => setIsUserMenuOpen(false)} className="flex items-center gap-2.5 px-4 py-2 text-[13px] text-white/70 hover:text-white hover:bg-white/5 transition">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                        Support
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
              <Link href={lp('/login')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-semibold text-[#4ab3f4] bg-[#0088cc]/[0.10] border border-[#0088cc]/25 hover:bg-[#0088cc]/[0.18] hover:text-[#6ec6f7] transition-all whitespace-nowrap">
                {t('nav.login', 'Login')}
              </Link>
            </span>
          )}

          {/* Utility — Language switcher (far right) */}
          {showLangSwitcher && (
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
          )}

        </div>

        {/* Mobile: burger + language dropdown */}
        <div className="md:hidden flex items-center gap-2">
          <button
            onClick={() => { setIsMenuOpen(!isMenuOpen); setMobileLangOpen(false); }}
            className="flex flex-col gap-1.5 w-8 h-8 items-center justify-center"
            aria-label="Toggle menu"
          >
            <motion.span className="w-5 h-0.5 bg-white/70 rounded-full" animate={{ rotate: isMenuOpen ? 45 : 0, y: isMenuOpen ? 6 : 0 }} transition={{ duration: 0.2 }} />
            <motion.span className="w-5 h-0.5 bg-white/70 rounded-full" animate={{ opacity: isMenuOpen ? 0 : 1 }} transition={{ duration: 0.2 }} />
            <motion.span className="w-5 h-0.5 bg-white/70 rounded-full" animate={{ rotate: isMenuOpen ? -45 : 0, y: isMenuOpen ? -6 : 0 }} transition={{ duration: 0.2 }} />
          </button>
          {!isMenuOpen && showLangSwitcher && (
            <div className="relative" ref={mobileLangRef}>
              <button
                onClick={() => setMobileLangOpen(!mobileLangOpen)}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
                aria-label="Change language"
              >
                <span className="text-lg leading-none">{LOCALE_FLAGS[locale]}</span>
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={`text-white/50 transition-transform ${mobileLangOpen ? 'rotate-180' : ''}`}><path d="M6 9l6 6 6-6"/></svg>
              </button>
              <AnimatePresence>
                {mounted && mobileLangOpen && (
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
                          onClick={() => setMobileLangOpen(false)}
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
          )}
        </div>
      </div>

      {/* Mobile Menu */}
      <motion.div
        className="md:hidden overflow-hidden"
        initial={false}
        animate={{ height: isMenuOpen ? 'auto' : 0, opacity: isMenuOpen ? 1 : 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="px-4 pb-5 border-t border-white/[0.06] pt-3 space-y-4">

          {/* Section: Directories */}
          <div className="space-y-1.5">
            <p className="px-1 text-[10px] font-black uppercase tracking-widest text-white/25">Explore</p>
            {/* Groups, Bots, AI NSFW — stacked vertically */}
            <div className="flex flex-col gap-1.5">
              <Link
                href={lp('/groups')}
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-[14px] font-semibold text-[#4ab3f4] bg-[#0088cc]/[0.10] border border-[#0088cc]/25 hover:bg-[#0088cc]/[0.18] hover:text-[#6ec6f7] transition-all"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="shrink-0 opacity-80">
                  <path d="M20.665 3.717l-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701h-.002l.002.001-.314 4.692c.46 0 .663-.211.921-.46l2.211-2.15 4.599 3.397c.848.467 1.457.227 1.668-.785l3.019-14.228c.309-1.239-.473-1.8-1.282-1.434z"/>
                </svg>
                {t('nav.groups', 'Groups')}
              </Link>
              <Link
                href={lp('/bots')}
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-[14px] font-semibold text-[#4ab3f4] bg-[#0088cc]/[0.10] border border-[#0088cc]/25 hover:bg-[#0088cc]/[0.18] hover:text-[#6ec6f7] transition-all"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-80">
                  <rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="9" cy="16" r="1"/><circle cx="15" cy="16" r="1"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>
                </svg>
                {t('nav.bots', 'Bots')}
              </Link>
              <Link
                href={lp('/ainsfw')}
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-[14px] font-semibold text-[#4ab3f4] bg-[#0088cc]/[0.10] border border-[#0088cc]/25 hover:bg-[#0088cc]/[0.18] hover:text-[#6ec6f7] transition-all"
              >
                <span className="text-sm leading-none shrink-0">🔞</span>
                AI NSFW
              </Link>
            </div>

            {/* OFsearch mobile */}
            <div>
              <Link
                href="/onlyfanssearch"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center justify-between px-4 py-2.5 rounded-lg text-[14px] bg-white border border-gray-200 font-bold"
              >
                <span className="text-[#00AFF0]">OFsearch</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00AFF0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </Link>
              <button
                onClick={() => setMobileOfOpen(!mobileOfOpen)}
                className="w-full flex items-center justify-between px-4 py-2 mt-1 rounded-lg text-[12px] font-semibold text-white/50 hover:text-white/80 transition-colors"
              >
                <span className="uppercase tracking-widest text-[9px] font-black">Best OnlyFans Accounts</span>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={`transition-transform ${mobileOfOpen ? 'rotate-180' : ''}`}><path d="M6 9l6 6 6-6"/></svg>
              </button>
              {mobileOfOpen && (
                <div className="grid grid-cols-3 gap-px px-1 pb-1">
                  {OF_CATEGORIES.map((cat) => (
                    <Link
                      key={cat.slug}
                      href={`/best-onlyfans-accounts/${cat.slug}`}
                      onClick={() => { setIsMenuOpen(false); setMobileOfOpen(false); }}
                      className="px-2 py-1.5 rounded-lg text-[11px] font-semibold text-white/60 hover:text-[#00AFF0] hover:bg-white/5 transition-colors truncate"
                    >
                      {cat.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {navbarCta && (
              <a
                href={navbarCta.destinationUrl}
                target="_blank"
                rel="sponsored noopener noreferrer"
                onClick={() => {
                  trackCampaignClick(navbarCta._id, 'navbar-cta');
                  setIsMenuOpen(false);
                }}
                className={`flex items-center justify-center px-4 py-2.5 rounded-lg ${PINK_CTA_NAV} text-[14px]`}
              >
                {navbarCta.description || navbarCta.buttonText}
              </a>
            )}

            <Link
              href="/articles"
              onClick={() => setIsMenuOpen(false)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-[14px] font-semibold text-white/80 bg-white/[0.07] border border-white/[0.10] hover:bg-white/[0.13] hover:text-white transition-all"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-80"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
              {t('nav.articles', 'Articles')}
            </Link>

            <Link
              href={lp('/add')}
              onClick={() => setIsMenuOpen(false)}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-[14px] font-semibold text-[#4ab3f4] bg-[#0088cc]/[0.10] border border-[#0088cc]/25 hover:bg-[#0088cc]/[0.18] hover:text-[#6ec6f7] transition-all whitespace-nowrap"
            >
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
              {t('nav.add', 'Add')}
            </Link>
          </div>

          <div className="h-px bg-white/[0.06]" />

          {/* Section: Account */}
          <div className="space-y-1.5" suppressHydrationWarning>
            <p className="px-1 text-[10px] font-black uppercase tracking-widest text-white/25">Account</p>
            {currentUsername ? (
              <>
                <div className={`px-4 py-2.5 rounded-lg flex items-center gap-2 text-[14px] ${TELEGRAM_BLUE_NAV}`}>
                  <div className="w-6 h-6 rounded-full bg-[#0088cc]/25 flex items-center justify-center text-[11px] text-[#6ec6f7]">
                    {currentUsername.charAt(0).toUpperCase()}
                  </div>
                  <span className="truncate">{currentUsername}</span>
                  {isPremium && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20 shrink-0">VIP</span>}
                </div>
                {isAdminUser && (
                  <Link href="/admin" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-2 w-full px-4 py-2.5 rounded-lg text-[14px] font-semibold text-amber-400 bg-amber-500/[0.08] border border-amber-500/20 hover:bg-amber-500/[0.14] transition">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
                    {t('nav.adminPanel', 'Admin Panel')}
                  </Link>
                )}
                {isAdminUser && (
                  <Link href="/OF" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-2 w-full px-4 py-2.5 rounded-lg text-[14px] font-semibold text-[#4ab3f4] bg-[#0088cc]/[0.08] border border-[#0088cc]/20 hover:bg-[#0088cc]/[0.14] transition">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"/><path d="M8 12h8M12 8v8"/></svg>
                    OF Admin
                  </Link>
                )}
                {isAdminUser && mounted && localStorage.getItem('username') === 'eros' && (
                  <Link href="/enzogonzo" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-2 w-full px-4 py-2.5 rounded-lg text-[14px] font-semibold text-[#00AFF0] bg-[#00AFF0]/[0.08] border border-[#00AFF0]/20 hover:bg-[#00AFF0]/[0.14] transition">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1.5" fill="currentColor"/></svg>
                    Onlygram
                  </Link>
                )}
                <Link href={lp('/profile')} onClick={() => setIsMenuOpen(false)} className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-[14px] font-semibold text-[#4ab3f4] bg-[#0088cc]/[0.10] border border-[#0088cc]/25 hover:bg-[#0088cc]/[0.18] hover:text-[#6ec6f7] transition-all">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 opacity-80"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/></svg>
                  {t('nav.profile', 'Profile')}
                </Link>
                <Link href={`${lp('/profile')}?tab=saved`} onClick={() => setIsMenuOpen(false)} className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-[14px] font-semibold text-[#4ab3f4] bg-[#0088cc]/[0.10] border border-[#0088cc]/25 hover:bg-[#0088cc]/[0.18] hover:text-[#6ec6f7] transition-all">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 opacity-80"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>
                  {t('nav.saved', 'Saved')}
                </Link>
                <Link href={`${lp('/profile')}?tab=settings`} onClick={() => setIsMenuOpen(false)} className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-[14px] font-semibold text-[#4ab3f4] bg-[#0088cc]/[0.10] border border-[#0088cc]/25 hover:bg-[#0088cc]/[0.18] hover:text-[#6ec6f7] transition-all">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-80"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  Support
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
              </>
            ) : (
              <>
                <Link
                  href={lp('/login')}
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center justify-center px-4 py-2.5 rounded-lg text-[14px] font-semibold text-[#4ab3f4] bg-[#0088cc]/[0.10] border border-[#0088cc]/25 hover:bg-[#0088cc]/[0.18] hover:text-[#6ec6f7] transition-all"
                >
                  {t('nav.login', 'Login')}
                </Link>
              </>
            )}
          </div>

          <div className="h-px bg-white/[0.06]" />

          {/* Section: Language */}
          <div>
            <p className="px-1 mb-2 text-[10px] font-black uppercase tracking-widest text-white/25">Language</p>
            <div className="flex items-center gap-1.5 px-1">
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
          </div>

        </div>
      </motion.div>

    </motion.nav>
  );
}
