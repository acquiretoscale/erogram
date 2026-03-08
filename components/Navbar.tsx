'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';


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

export default function Navbar({ username, setUsername, showAddGroup, onAddGroupClick }: NavbarProps) {
  const [mounted, setMounted] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [navbarCta, setNavbarCta] = useState<{ _id: string; destinationUrl: string; description: string; buttonText: string } | null>(null);
  const [isPremium, setIsPremium] = useState(false);


  useEffect(() => { setMounted(true); }, []);

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
    if (!mounted) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.premium) setIsPremium(true); })
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
    { href: '/groups', label: 'Groups' },
    { href: '/bots', label: 'Bots' },
    { href: '/articles', label: 'Articles' },
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
            <Link key={link.href} href={link.href} className={NAV_COLORS[link.label] || BTN_NAV}>
              {link.label}
            </Link>
          ))}

          <a
            href={navbarCta?.destinationUrl ?? DEFAULT_NAVBAR_CTA.destinationUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => { if (navbarCta?._id) fetch('/api/campaigns/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ campaignId: navbarCta._id, placement: 'navbar-cta' }) }).catch(() => {}); }}
            className={`${BTN} text-white bg-pink-600 hover:bg-pink-500 shadow-sm shadow-pink-600/20`}
          >
            {(navbarCta?.description || navbarCta?.buttonText) || DEFAULT_NAVBAR_CTA.description}
          </a>

          <Link href="/add" className={`${BTN_NAV} !text-[#4ab3f4] !bg-[#0088cc]/[0.10] !border-[#0088cc]/25 hover:!bg-[#0088cc]/[0.18] inline-flex items-center gap-1`}>
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
            Add
          </Link>

          {/* Unlock Erogram Premium */}
          {!isPremium && (
            <Link
              href="/premium"
              target="_blank"
              className="relative overflow-hidden text-[13px] px-4 py-1.5 rounded-lg font-black tracking-wide whitespace-nowrap inline-flex items-center gap-1.5 transition-all hover:scale-105 hover:shadow-lg hover:shadow-amber-500/30"
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
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="relative">
                <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <span className="relative">Unlock Erogram Premium</span>
            </Link>
          )}

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
                      <Link href="/profile" onClick={() => setIsUserMenuOpen(false)} className="flex items-center gap-2.5 px-4 py-2 text-[13px] text-white/70 hover:text-white hover:bg-white/5 transition">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/></svg>
                        Profile
                      </Link>
                      <Link href="/profile?tab=saved" onClick={() => setIsUserMenuOpen(false)} className="flex items-center gap-2.5 px-4 py-2 text-[13px] text-white/70 hover:text-white hover:bg-white/5 transition">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>
                        Saved
                      </Link>
                      <div className="border-t border-white/5 mt-1 pt-1">
                        <button
                          onClick={() => { handleLogout(); setIsUserMenuOpen(false); }}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-[13px] text-white/40 hover:text-red-400 hover:bg-red-500/5 transition text-left"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
                          Logout
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <span suppressHydrationWarning>
              <Link href="/login" className={NAV_COLORS['Login'] || BTN_NAV}>
                Login
              </Link>
            </span>
          )}
        </div>

        {/* Mobile Burger */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="md:hidden flex flex-col gap-1.5 w-8 h-8 items-center justify-center"
          aria-label="Toggle menu"
        >
          <motion.span className="w-5 h-0.5 bg-white/70 rounded-full" animate={{ rotate: isMenuOpen ? 45 : 0, y: isMenuOpen ? 6 : 0 }} transition={{ duration: 0.2 }} />
          <motion.span className="w-5 h-0.5 bg-white/70 rounded-full" animate={{ opacity: isMenuOpen ? 0 : 1 }} transition={{ duration: 0.2 }} />
          <motion.span className="w-5 h-0.5 bg-white/70 rounded-full" animate={{ rotate: isMenuOpen ? -45 : 0, y: isMenuOpen ? -6 : 0 }} transition={{ duration: 0.2 }} />
        </button>
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
              className={`block px-4 py-2.5 rounded-lg text-[14px] ${NAV_COLORS[link.label] || BTN_NAV}`}
            >
              {link.label}
            </Link>
          ))}

          <a
            href={navbarCta?.destinationUrl ?? DEFAULT_NAVBAR_CTA.destinationUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              if (navbarCta?._id) fetch('/api/campaigns/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ campaignId: navbarCta._id, placement: 'navbar-cta' }) }).catch(() => {});
              setIsMenuOpen(false);
            }}
            className="block px-4 py-2.5 rounded-lg text-[14px] font-bold text-white text-center bg-pink-600 hover:bg-pink-500 shadow-sm shadow-pink-600/20 transition"
          >
            {(navbarCta?.description || navbarCta?.buttonText) || DEFAULT_NAVBAR_CTA.description}
          </a>

          <Link
            href="/add"
            onClick={() => setIsMenuOpen(false)}
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg text-[14px] font-semibold text-[#4ab3f4] bg-[#0088cc]/[0.10] border border-[#0088cc]/25 hover:bg-[#0088cc]/[0.18] transition"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
            Add Group or Bot
          </Link>

          {!isPremium && (
            <Link
              href="/premium"
              target="_blank"
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
              <span className="relative">Unlock Erogram Premium</span>
            </Link>
          )}

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
              <Link href="/profile" onClick={() => setIsMenuOpen(false)} className="block px-4 py-2 rounded-lg text-[14px] text-white/70 hover:text-white hover:bg-white/5 transition">
                Profile
              </Link>
              <Link href="/profile?tab=saved" onClick={() => setIsMenuOpen(false)} className="block px-4 py-2 rounded-lg text-[14px] text-white/70 hover:text-white hover:bg-white/5 transition">
                Saved
              </Link>
              <button
                onClick={handleLogout}
                className="w-full px-4 py-2 rounded-lg text-[14px] text-white/40 hover:text-red-400 hover:bg-red-500/5 transition text-left"
              >
                Logout
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              onClick={() => setIsMenuOpen(false)}
              className={`block text-center px-4 py-2.5 rounded-lg text-[14px] ${NAV_COLORS['Login'] || BTN_NAV}`}
            >
              Login
            </Link>
          )}
        </div>
      </motion.div>


    </motion.nav>
  );
}
