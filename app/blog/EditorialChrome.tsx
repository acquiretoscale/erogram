'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { useLocale, useLocalePath } from '@/lib/i18n/client';
import { LOCALES, type Locale, localePath as buildLocalePath } from '@/lib/i18n/config';
import { getMyListingsSummary } from '@/lib/actions/myListings';
import { getMyAINSFWSummary } from '@/lib/actions/myAINSFWListings';
import { OF_CATEGORIES } from '@/app/onlyfanssearch/constants';
import { getCampaignPlacement } from '@/lib/actions/publicData';
import { trackClick as trackCampaignClick } from '@/lib/actions/campaigns';
import { RtaBadge } from '@/components/AgeGate';

function MastheadAdSlot() {
  const [cta, setCta] = useState<{ _id: string; destinationUrl: string; description: string; buttonText: string } | null>(null);
  useEffect(() => {
    getCampaignPlacement('navbar-cta')
      .then((d) => { if (d?.campaign?.destinationUrl) setCta(d.campaign); })
      .catch(() => {});
  }, []);
  if (!cta) return null;
  return (
    <a
      href={cta.destinationUrl}
      target="_blank"
      rel="sponsored noopener noreferrer"
      onClick={() => trackCampaignClick(cta._id, 'navbar-cta')}
      className="hidden md:inline-flex items-center text-[11px] font-bold tracking-[0.12em] uppercase text-white bg-[#e0245e] hover:bg-[#c81e51] border border-white/15 px-3.5 py-2 rounded-[5px] transition-colors whitespace-nowrap"
    >
      {cta.description || cta.buttonText}
    </a>
  );
}

const LOCALE_FLAGS: Record<Locale, string> = { en: '🇺🇸', de: '🇩🇪', es: '🇪🇸' };
const LOCALE_NAMES: Record<Locale, string> = { en: 'English', de: 'Deutsch', es: 'Español' };

function MastheadLangSwitcher() {
  const { locale } = useLocale();
  const rawPathname = usePathname();
  const currentPath = (rawPathname || '/').replace(/^\/(de|es)/, '') || '/';
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const t = setTimeout(() => document.addEventListener('mousedown', handler, true), 100);
    return () => { clearTimeout(t); document.removeEventListener('mousedown', handler, true); };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        aria-label="Change language"
        className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
      >
        <span className="text-base leading-none" suppressHydrationWarning>{LOCALE_FLAGS[locale]}</span>
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={`text-white/50 transition-transform ${open ? 'rotate-180' : ''}`}><path d="M6 9l6 6 6-6" /></svg>
      </button>
      <AnimatePresence>
        {mounted && open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 mt-2 w-36 bg-[#161412] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden py-1"
          >
            {LOCALES.map((l) => (
              <a
                key={l}
                href={buildLocalePath(currentPath, l)}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-2.5 px-3.5 py-2 text-[13px] transition-colors ${locale === l ? 'text-white bg-white/5 font-medium' : 'text-[#cfc9c2] hover:text-white hover:bg-white/5'}`}
              >
                <span className="text-base leading-none">{LOCALE_FLAGS[l]}</span>
                {LOCALE_NAMES[l]}
              </a>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Real Erogram menu elements (OFsearch is rendered separately as a dropdown)
const NAV_PRE = [
  { label: 'Groups', href: '/groups' },
  { label: 'Bots', href: '/bots' },
  { label: 'AI NSFW', href: '/ainsfw' },
];

const NAV_POST = [
  { label: 'Blog', href: '/blog' },
];

const ADD_ITEMS = [
  {
    label: 'OnlyFans Creator', href: '/submit', color: '#00AFF0',
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" /></svg>,
  },
  {
    label: 'Telegram Group', href: '/add/group', color: '#4ab3f4',
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M20.665 3.717l-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701h-.002l.002.001-.314 4.692c.46 0 .663-.211.921-.46l2.211-2.15 4.599 3.397c.848.467 1.457.227 1.668-.785l3.019-14.228c.309-1.239-.473-1.8-1.282-1.434z" /></svg>,
  },
  {
    label: 'Telegram Bot', href: '/add/bot', color: '#4ab3f4',
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="10" rx="2" /><circle cx="9" cy="16" r="1" /><circle cx="15" cy="16" r="1" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>,
  },
  {
    label: 'AI NSFW', href: '/add/ainsfw', color: '#e8b923',
    icon: <span className="text-[14px] leading-none">🔞</span>,
  },
];

function OFsearchNav() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Close dropdown on route change (removes onClick handlers from category links, avoids RSC prop serialization issues)
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const t = setTimeout(() => document.addEventListener('mousedown', handler, true), 80);
    return () => { clearTimeout(t); document.removeEventListener('mousedown', handler, true); };
  }, [open]);

  return (
    <div className="relative shrink-0" ref={ref} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      {/* Money section — bold white. The label navigates to OFsearch; the chevron toggles the dropdown. */}
      <div className="inline-flex items-center gap-2 text-[13px] font-bold leading-none text-white">
        <Link
          href="/onlyfanssearch"
          onClick={() => setOpen(false)}
          className="inline-flex items-center gap-1.5 hover:text-white/80 transition-colors"
        >
          <span>OFsearch</span>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="white" aria-hidden className="shrink-0"><path d="M24 4.003h-4.015c-3.45 0-5.3.197-6.748 1.957a7.996 7.996 0 1 0 2.103 9.211c3.182-.231 5.39-2.134 6.085-5.173c0 0-2.399.585-4.43 0c4.018-.777 6.333-3.037 7.005-5.995M5.61 11.999A2.391 2.391 0 0 1 9.28 9.97a2.966 2.966 0 0 1 2.998-2.528h.008c-.92 1.778-1.407 3.352-1.998 5.263A2.392 2.392 0 0 1 5.61 12Zm2.386-7.996a7.996 7.996 0 1 0 7.996 7.996a7.996 7.996 0 0 0-7.996-7.996m0 10.394A2.399 2.399 0 1 1 10.395 12a2.396 2.396 0 0 1-2.399 2.398Z"/></svg>
        </Link>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label="Toggle OFsearch menu"
          className="inline-flex items-center hover:text-white/80 transition-colors"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}><path d="M6 9l6 6 6-6" /></svg>
        </button>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            style={{ transformOrigin: 'top left' }}
            className="absolute left-0 mt-2.5 w-[340px] bg-white border border-black/10 rounded-2xl shadow-2xl z-50 overflow-hidden"
          >
            {/* Featured header — OnlyFans logo on white */}
            <Link
              href="/onlyfanssearch"
              onClick={() => setOpen(false)}
              className="flex items-center justify-between px-4 py-3.5 border-b border-black/[0.06] hover:bg-[#00AFF0]/[0.05] group transition-colors"
            >
              <span className="inline-flex items-center gap-2">
                <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" fill="none" stroke="#00AFF0" strokeWidth="3" />
                  <circle cx="12" cy="12" r="3.4" fill="#0089c7" />
                </svg>
                <span className="font-extrabold text-[15px] leading-tight">
                  <span className="text-[#0f0c0a]">Only</span><span className="text-[#00AFF0]">Fans</span>
                  <span className="block text-[10px] font-bold text-[#8a8178] tracking-wide">Search 1.8M+ Creators</span>
                </span>
              </span>
              <span className="text-[#00AFF0] text-[18px] transition-transform group-hover:translate-x-0.5">→</span>
            </Link>

            <div className="px-3.5 pt-3 pb-1.5 flex items-center justify-between">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#9a928a]">Best OnlyFans Accounts</span>
              <Link href="/best-onlyfans-accounts" className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#00AFF0] hover:text-[#0089c7] transition-colors">All →</Link>
            </div>
            <div className="grid grid-cols-3 gap-px px-2 pb-3">
              {OF_CATEGORIES.map((cat) => (
                <Link
                  key={cat.slug}
                  href={`/best-onlyfans-accounts/${cat.slug}`}
                  className="px-2 py-1.5 rounded-lg text-[11px] font-semibold text-[#4a443d] hover:text-[#00AFF0] hover:bg-[#00AFF0]/[0.06] transition-colors truncate"
                >
                  {cat.name}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AddToolNav() {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative hidden sm:block" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <Link
        href="/add"
        className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-[0.12em] uppercase text-black bg-white hover:bg-white/90 px-3.5 py-2 rounded-[5px] transition-colors"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="shrink-0 -ml-0.5"><path d="M12 5v14M5 12h14" /></svg>
        Submit
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`shrink-0 opacity-50 transition-transform ${open ? 'rotate-180' : ''}`}><path d="M6 9l6 6 6-6" /></svg>
      </Link>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            style={{ transformOrigin: 'top right' }}
            className="absolute right-0 mt-2 w-[230px] bg-[#161412] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden p-1.5"
          >
            <div className="px-3 py-2 text-[9px] font-black uppercase tracking-[0.2em] text-white/35">What are you adding?</div>
            {ADD_ITEMS.map((it, i) => (
              <motion.div
                key={it.href}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 + i * 0.05, duration: 0.2 }}
              >
                <Link
                  href={it.href}
                  onClick={() => setOpen(false)}
                  className="group flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.05] transition-colors"
                >
                  <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-110" style={{ background: `${it.color}1f`, color: it.color }}>
                    {it.icon}
                  </span>
                  <span className="text-[13px] font-semibold text-[#cfc9c2] group-hover:text-white transition-colors">{it.label}</span>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="ml-auto text-white/20 group-hover:text-white/60 group-hover:translate-x-0.5 transition-all"><path d="M9 6l6 6-6 6" /></svg>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Shared auth/session state — single source for desktop + mobile (mirrors Navbar).
function useMastheadAuth() {
  const [mounted, setMounted] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [listings, setListings] = useState<{ hasListings: boolean; inReviewCount: number; hasPaidCampaign: boolean } | null>(null);
  const [ainsfw, setAinsfw] = useState<{ hasListings: boolean; inReviewCount: number } | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isAppInstalled, setIsAppInstalled] = useState(false);

  useEffect(() => {
    setMounted(true);
    setUsername(localStorage.getItem('username'));
    setIsAdmin(localStorage.getItem('isAdmin') === 'true');
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream);
    if (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone) setIsAppInstalled(true);
    const onPrompt = (e: Event) => { e.preventDefault(); setDeferredPrompt(e); };
    window.addEventListener('beforeinstallprompt', onPrompt as EventListener);

    const token = localStorage.getItem('token');
    if (token) {
      fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((d) => {
          if (d.premium) setIsPremium(true);
          if (d.isAdmin) { setIsAdmin(true); localStorage.setItem('isAdmin', 'true'); }
          if (d.username) { setUsername(d.username); localStorage.setItem('username', d.username); }
        })
        .catch(() => {});
      getMyListingsSummary(token).then((s) => { if (s.hasListings) setListings(s); }).catch(() => {});
      getMyAINSFWSummary(token).then((s) => { if (s.hasListings) setAinsfw(s); }).catch(() => {});
    }
    return () => window.removeEventListener('beforeinstallprompt', onPrompt as EventListener);
  }, []);

  const logout = () => {
    ['token', 'username', 'isAdmin', 'firstName', 'photoUrl'].forEach((k) => localStorage.removeItem(k));
    setUsername(null); setIsPremium(false); setIsAdmin(false); setListings(null); setAinsfw(null);
  };

  const installApp = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((r: any) => { if (r.outcome === 'accepted') setIsAppInstalled(true); });
      setDeferredPrompt(null);
    } else if (isIOS) {
      alert('Tap the Share button (box with arrow) at the bottom of Safari, then tap "Add to Home Screen".');
    }
  };

  return { mounted, username, isPremium, isAdmin, listings, ainsfw, isAppInstalled, installApp, logout };
}

type MastheadAuth = ReturnType<typeof useMastheadAuth>;

function MastheadUserMenu({ accent, auth, lp }: { accent: string; auth: MastheadAuth; lp: (p: string) => string }) {
  const { mounted, username, isPremium, isAdmin, listings, ainsfw, logout } = auth;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const t = setTimeout(() => document.addEventListener('mousedown', handler, true), 100);
    return () => { clearTimeout(t); document.removeEventListener('mousedown', handler, true); };
  }, [open]);

  const item = 'flex items-center gap-2.5 px-4 py-2 text-[13px] text-[#cfc9c2] hover:text-white hover:bg-white/[0.05] transition-colors';
  const campaignsLabel = listings?.hasPaidCampaign ? 'My Campaigns' : 'My Listings';

  if (!mounted) {
    return <span className="w-8 h-8 rounded-full bg-white/[0.08] border border-white/15 inline-block" suppressHydrationWarning />;
  }

  if (!username) {
    return (
      <Link href={lp('/login')} className="text-[11px] font-bold tracking-[0.14em] uppercase text-white border border-white/25 hover:border-white/60 hover:bg-white/[0.06] px-4 py-2 rounded-[5px] transition-colors">
        Login
      </Link>
    );
  }

  return (
    <div className="relative" ref={ref} suppressHydrationWarning>
      <button
        onClick={() => setOpen(!open)}
        aria-label="Account menu"
        className="flex items-center gap-2 rounded-full pl-1 pr-2.5 py-1 bg-white/[0.06] border border-white/15 hover:bg-white/[0.12] transition-colors"
      >
        <span className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-black" style={{ background: accent }}>
          {username.charAt(0).toUpperCase()}
        </span>
        <span className="hidden sm:block max-w-[90px] truncate text-[12px] font-semibold text-white">{username}</span>
        {isPremium && <svg width="10" height="10" viewBox="0 0 24 24" fill={accent} className="shrink-0"><path d="M12 2l2.09 6.26L20 9.27l-4.45 4.7L16.91 20 12 16.9 7.09 20l1.36-6.03L4 9.27l5.91-1.01z" /></svg>}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`text-white/60 transition-transform ${open ? 'rotate-180' : ''}`}><path d="M6 9l6 6 6-6" /></svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-[#161412] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden py-1">
          <div className="px-4 py-2.5 text-[12px] font-semibold text-white/50 border-b border-white/[0.06] flex items-center gap-2">
            {username}
            {isPremium && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${accent}26`, color: accent }}>VIP</span>}
          </div>

          {listings?.hasListings && (
            <Link href={lp('/my-listings')} onClick={() => setOpen(false)} className={item}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 11 18-5v12L3 14v-3z" /><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" /></svg>
              <span className="flex-1">{campaignsLabel}</span>
              {!!listings.inReviewCount && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20">{listings.inReviewCount} in review</span>}
            </Link>
          )}
          {ainsfw?.hasListings && (
            <Link href="/ai-nsfw-listings" onClick={() => setOpen(false)} className={item}>
              <span className="text-[13px] leading-none">🔞</span>
              <span className="flex-1">My AI NSFW</span>
              {!!ainsfw.inReviewCount && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20">{ainsfw.inReviewCount} in review</span>}
            </Link>
          )}
          {isAdmin && (
            <Link href="/admin" onClick={() => setOpen(false)} className={item}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
              Admin Panel
            </Link>
          )}
          {isAdmin && (
            <Link href="/OF" onClick={() => setOpen(false)} className={item}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" /><path d="M8 12h8M12 8v8" /></svg>
              OF Admin
            </Link>
          )}
          <Link href={lp('/profile')} onClick={() => setOpen(false)} className={item}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" /></svg>
            Profile
          </Link>
          <Link href={`${lp('/profile')}?tab=saved`} onClick={() => setOpen(false)} className={item}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z" /></svg>
            Saved
          </Link>
          <Link href="/blog" onClick={() => setOpen(false)} className={item}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
            Blog
          </Link>
          <Link href={`${lp('/profile')}?tab=settings`} onClick={() => setOpen(false)} className={item}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
            Support
          </Link>
          <div className="border-t border-white/[0.06] mt-1 pt-1">
            <button onClick={() => { logout(); setOpen(false); }} className="w-full flex items-center gap-2.5 px-4 py-2 text-[13px] text-white/40 hover:text-red-400 hover:bg-red-500/5 transition-colors text-left">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Use the exact same button background as on /trending: plum dark bg + off-white text.
// (See SpotlightClient: PLUM='#2B1B28', INK='#FDFDFD')
// Exceptions: OFsearch and the Top 10 OnlyFans button keep their blue branding.
const NB = 'w-full flex items-center justify-start gap-3 rounded-full bg-[#2B1B28] text-[#FDFDFD] pl-4 pr-5 py-3.5 text-[13px] font-bold tracking-[0.02em] border border-white/10 hover:opacity-90 active:opacity-100 transition-all duration-150';
const MENU_LABEL = 'text-center text-[11px] font-extrabold tracking-[0.28em] uppercase font-[family-name:var(--font-inter-tight)]';

function MobileNavMenu({ open, lp, onClose }: { open: boolean; lp: (p: string) => string; onClose: () => void }) {
  const [ofOpen, setOfOpen] = useState(false);
  const { locale } = useLocale();
  const rawPathname = usePathname();
  const currentPath = (rawPathname || '/').replace(/^\/(de|es)/, '') || '/';
  const currentMonthYear = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Scannable icons for top-tier mobile menu affordance (left icon + label).
  const navIcon = (label: string) => {
    if (label === 'Groups') return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
    if (label === 'Bots') return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/><circle cx="8" cy="16" r="1"/><circle cx="16" cy="16" r="1"/></svg>;
    if (label === 'AI NSFW') return <span className="text-[15px] leading-none">🔞</span>;
    return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>;
  };

  return (
    <motion.div
      className="lg:hidden overflow-hidden border-t border-white/10"
      initial={false}
      animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="px-4 pb-5 pt-3 space-y-3 bg-black">
        <div className="space-y-2">
          <p className={`${MENU_LABEL} text-[#c0392f]/70`}>Explore</p>
          <Link href="/trending" onClick={onClose} className={`${NB} !justify-center`}>TRENDING</Link>
          {NAV_PRE.map((n) => (
            <Link key={n.label} href={lp(n.href)} onClick={onClose} className={NB}>
              {navIcon(n.label)}
              <span>{n.label}</span>
            </Link>
          ))}

          {/* OFsearch — money row, emphasized brand button */}
          <Link href="/onlyfanssearch" onClick={onClose} className={`${NB} gap-2 !bg-[#00AFF0] !text-white !border-transparent !justify-center`}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white" aria-hidden className="shrink-0"><path d="M24 4.003h-4.015c-3.45 0-5.3.197-6.748 1.957a7.996 7.996 0 1 0 2.103 9.211c3.182-.231 5.39-2.134 6.085-5.173c0 0-2.399.585-4.43 0c4.018-.777 6.333-3.037 7.005-5.995M5.61 11.999A2.391 2.391 0 0 1 9.28 9.97a2.966 2.966 0 0 1 2.998-2.528h.008c-.92 1.778-1.407 3.352-1.998 5.263A2.392 2.392 0 0 1 5.61 12Zm2.386-7.996a7.996 7.996 0 1 0 7.996 7.996a7.996 7.996 0 0 0-7.996-7.996m0 10.394A2.399 2.399 0 1 1 10.395 12a2.396 2.396 0 0 1-2.399 2.398Z"/></svg>
            <span>OFsearch</span>
          </Link>
          <button onClick={() => setOfOpen(!ofOpen)} className="group w-full flex items-center justify-center gap-2 rounded-full border-2 border-[#00AFF0] bg-white px-5 py-3 text-[10px] font-extrabold tracking-[0.12em] uppercase text-[#00AFF0] font-[family-name:var(--font-baloo)] hover:bg-[#00AFF0] hover:text-white hover:-translate-y-0.5 active:translate-y-[1px] transition-all duration-150">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden className="shrink-0"><path d="M24 4.003h-4.015c-3.45 0-5.3.197-6.748 1.957a7.996 7.996 0 1 0 2.103 9.211c3.182-.231 5.39-2.134 6.085-5.173c0 0-2.399.585-4.43 0c4.018-.777 6.333-3.037 7.005-5.995M5.61 11.999A2.391 2.391 0 0 1 9.28 9.97a2.966 2.966 0 0 1 2.998-2.528h.008c-.92 1.778-1.407 3.352-1.998 5.263A2.392 2.392 0 0 1 5.61 12Zm2.386-7.996a7.996 7.996 0 1 0 7.996 7.996a7.996 7.996 0 0 0-7.996-7.996m0 10.394A2.399 2.399 0 1 1 10.395 12a2.396 2.396 0 0 1-2.399 2.398Z"/></svg>
            <span className="text-center leading-tight">Top 10 OnlyFans Creators by Category for {currentMonthYear}</span>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={`shrink-0 transition-transform ${ofOpen ? 'rotate-180' : ''}`}><path d="M6 9l6 6 6-6" /></svg>
          </button>
          {ofOpen && (
            <div>
              <p className="text-center text-[9px] font-black tracking-[0.22em] uppercase text-[#00AFF0]/60 pb-1.5 pt-0.5">Best OnlyFans Accounts</p>
              <div className="grid grid-cols-3 gap-1.5">
                {OF_CATEGORIES.map((cat) => (
                  <Link key={cat.slug} href={`/best-onlyfans-accounts/${cat.slug}`} className="text-center px-1.5 py-2 rounded-xl border-2 border-[#00AFF0]/40 bg-white text-[11px] font-bold text-[#2B1B28] hover:bg-[#00AFF0] hover:text-white hover:border-[#00AFF0] hover:-translate-y-0.5 active:translate-y-[1px] shadow-[0_1px_2px_0_rgba(0,0,0,0.06)] transition-all truncate">{cat.name}</Link>
                ))}
              </div>
            </div>
          )}

          {NAV_POST.map((n) => (
            <Link key={n.label} href={n.href} onClick={onClose} className={NB}>
              {navIcon(n.label)}
              <span>{n.label}</span>
            </Link>
          ))}
        </div>

        {/* Language */}
        <div className="space-y-2 pt-1">
          <p className={`${MENU_LABEL} text-white/40`}>Language</p>
          <div className="grid grid-cols-3 gap-2">
            {LOCALES.map((l) => (
              <a
                key={l}
                href={buildLocalePath(currentPath, l)}
                onClick={onClose}
                className={`${NB} !py-2.5 gap-1.5 !justify-center ${locale === l ? '!bg-[#1a1014] !text-white !border-transparent' : ''}`}
              >
                <span className="text-base leading-none">{LOCALE_FLAGS[l]}</span>
                <span className="text-[12px]">{LOCALE_NAMES[l]}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function MobileUserMenu({ open, auth, lp, onClose }: { open: boolean; auth: MastheadAuth; lp: (p: string) => string; onClose: () => void }) {
  const { mounted, username, isAdmin, listings, ainsfw, logout } = auth;
  const campaignsLabel = listings?.hasPaidCampaign ? 'My Campaigns' : 'My Listings';

  const accIcon = (label: string) => {
    if (label.includes('Campaign') || label.includes('Listing')) return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>;
    if (label === 'My AI NSFW') return <span className="text-[14px]">🔞</span>;
    if (label === 'Admin Panel' || label === 'OF Admin') return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>;
    if (label === 'Profile') return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
    if (label === 'Saved') return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>;
    if (label === 'Support') return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
    return null;
  };

  return (
    <motion.div
      className="lg:hidden overflow-hidden border-t border-white/10"
      initial={false}
      animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="px-4 pb-5 pt-3 space-y-2 bg-black" suppressHydrationWarning>
        <p className={`${MENU_LABEL} text-white/55`}>Account</p>
        {mounted && username ? (
          <>
            {listings?.hasListings && (
              <Link href={lp('/my-listings')} onClick={onClose} className={`${NB} !bg-[#00AFF0] !text-white !border-transparent !justify-center`}>{accIcon(campaignsLabel)}{campaignsLabel}{!!listings.inReviewCount && <span className="ml-2 normal-case tracking-normal text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-white/25">{listings.inReviewCount} in review</span>}</Link>
            )}
            {ainsfw?.hasListings && (
              <Link href="/ai-nsfw-listings" onClick={onClose} className={`${NB} !bg-[#e8b923] !border-transparent !justify-center`}>{accIcon('My AI NSFW')}My AI NSFW{!!ainsfw.inReviewCount && <span className="ml-2 normal-case tracking-normal text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-black/15">{ainsfw.inReviewCount} in review</span>}</Link>
            )}
            {isAdmin && <Link href="/admin" onClick={onClose} className={`${NB} !bg-[#e8b923] !border-transparent !justify-center`}>{accIcon('Admin Panel')}Admin Panel</Link>}
            {isAdmin && <Link href="/OF" onClick={onClose} className={NB}>{accIcon('OF Admin')}OF Admin</Link>}
            <Link href={lp('/profile')} onClick={onClose} className={NB}>{accIcon('Profile')}Profile</Link>
            <Link href={`${lp('/profile')}?tab=saved`} onClick={onClose} className={NB}>{accIcon('Saved')}Saved</Link>
            <Link href={`${lp('/profile')}?tab=settings`} onClick={onClose} className={NB}>{accIcon('Support')}Support</Link>
            <button onClick={() => { logout(); onClose(); }} className={`${NB} !bg-[#1a1014] !text-white !border-transparent !justify-center`}>Logout</button>
          </>
        ) : (
          <Link href={lp('/login')} onClick={onClose} className={`${NB} !bg-[#1a1014] !text-white !border-transparent !justify-center`}>Login</Link>
        )}
      </div>
    </motion.div>
  );
}

// OnlyFans-blue routes get the blue accent; everything else uses Erogram dark red.
function accentForPath(pathname: string): string {
  const p = (pathname || '/').replace(/^\/(de|es)/, '') || '/';
  if (
    p === '/onlyfanssearch' ||
    p.startsWith('/onlyfanssearch/') ||
    p.startsWith('/best-onlyfans-accounts') ||
    p.startsWith('/best-onlyfans-creators') ||
    p.startsWith('/Toponlyfanscreators') ||
    p.endsWith('-onlyfans')
  ) {
    return '#00AFF0';
  }
  return '#c0392f';
}

/**
 * Section-aware masthead. `accent` themes the wordmark + active state so the
 * same bar can shift color per section. When `accent` is omitted it is derived
 * from the current route (OnlyFans pages = blue, everything else = dark red).
 * `fixed` makes it a drop-in replacement for the legacy fixed Navbar.
 */
export function EditorialMasthead({ accent, fixed = false }: { accent?: string; fixed?: boolean }) {
  const auth = useMastheadAuth();
  const lp = useLocalePath();
  const pathname = usePathname();
  const resolvedAccent = accent ?? accentForPath(pathname || '/');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  return (
    <header className={`${fixed ? 'fixed top-0 left-0 right-0' : 'relative'} z-50 bg-black/95 backdrop-blur-md border-b border-white/[0.08]`}>
      <div className="max-w-[1280px] mx-auto px-5 sm:px-8 h-[58px] flex items-center gap-6">
        {/* Wordmark — all white, only the dot accent-colored, heavy weight */}
        <Link
          href="/"
          className="shrink-0 flex items-baseline text-[1.86rem] font-black uppercase tracking-tighter leading-none select-none mr-6 lg:mr-8"
          style={{ fontFamily: 'var(--font-inter-tight), sans-serif' }}
        >
          <span className="text-white">EROGRAM</span><span className="w-[10px] h-[10px] ml-1 shrink-0 self-end mb-[3px]" style={{ backgroundColor: resolvedAccent }} />
        </Link>

        {/* Desktop nav — uppercase, letter-spaced, muted. Only at lg+ where it fits;
            tablet falls back to the burger menu so no items get cut off. */}
        <nav className="hidden lg:flex flex-1 items-center gap-6 lg:gap-8">
          <Link href="/trending" className="shrink-0 text-[13px] font-black uppercase tracking-[0.1em] text-red-500 hover:text-red-400 transition-colors">TRENDING</Link>
          {NAV_PRE.map((n) => (
            <Link
              key={n.label}
              href={lp(n.href)}
              className="shrink-0 text-[11px] font-bold tracking-[0.18em] uppercase text-white hover:text-white/80 transition-colors"
            >
              {n.label}
            </Link>
          ))}
          <OFsearchNav />
          {NAV_POST.map((n) => (
            <Link
              key={n.label}
              href={n.href}
              className="shrink-0 text-[11px] font-bold tracking-[0.18em] uppercase text-white hover:text-white/80 transition-colors"
            >
              {n.label}
            </Link>
          ))}
          <MastheadLangSwitcher />
        </nav>

        {/* Desktop right — ad slot + Add Tool + user menu */}
        <div className="hidden lg:flex items-center gap-2.5 shrink-0">
          <MastheadAdSlot />
          <AddToolNav />
          <MastheadUserMenu accent={resolvedAccent} auth={auth} lp={lp} />
        </div>

        {/* Mobile + tablet — Submit + burger (nav) + avatar (account) on the far right */}
        <div className="lg:hidden ml-auto flex items-center gap-2 shrink-0">
          {!mobileOpen && !userOpen && (
            <Link
              href="/add"
              className="inline-flex items-center gap-1 text-[10px] font-bold tracking-[0.1em] uppercase text-black bg-white hover:bg-white/90 px-2.5 py-1.5 rounded-[5px] transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="shrink-0 -ml-0.5"><path d="M12 5v14M5 12h14" /></svg>
              Submit
            </Link>
          )}
          <button
            onClick={() => { setMobileOpen((v) => !v); setUserOpen(false); }}
            aria-label="Toggle menu"
            className="flex flex-col gap-1.5 w-9 h-9 items-center justify-center"
          >
            <motion.span className="w-5 h-0.5 bg-white/70 rounded-full" animate={{ rotate: mobileOpen ? 45 : 0, y: mobileOpen ? 6 : 0 }} transition={{ duration: 0.2 }} />
            <motion.span className="w-5 h-0.5 bg-white/70 rounded-full" animate={{ opacity: mobileOpen ? 0 : 1 }} transition={{ duration: 0.2 }} />
            <motion.span className="w-5 h-0.5 bg-white/70 rounded-full" animate={{ rotate: mobileOpen ? -45 : 0, y: mobileOpen ? -6 : 0 }} transition={{ duration: 0.2 }} />
          </button>
          <button
            onClick={() => { setUserOpen((v) => !v); setMobileOpen(false); }}
            aria-label="Account menu"
            className={`w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold text-black shrink-0 ring-2 ring-transparent transition-all ${userOpen ? '!ring-white/60' : ''}`}
            style={{ background: resolvedAccent }}
            suppressHydrationWarning
          >
            {auth.mounted && auth.username ? auth.username.charAt(0).toUpperCase() : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" /></svg>
            )}
          </button>
        </div>
      </div>

      <MobileNavMenu open={mobileOpen} lp={lp} onClose={() => setMobileOpen(false)} />
      <MobileUserMenu open={userOpen} auth={auth} lp={lp} onClose={() => setUserOpen(false)} />
    </header>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="block text-[13px] text-[#b8b2ab] hover:text-white transition-colors duration-200">
      {children}
    </Link>
  );
}

function FooterCol({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-[10px] font-black tracking-[0.24em] uppercase text-white mb-3 pb-2 border-b border-white/[0.08]">{label}</h4>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

export function EditorialFooter() {
  const lp = useLocalePath();
  const year = new Date().getFullYear();
  return (
    <footer className="bg-black border-t border-white/[0.08]">
      <div className="max-w-[1280px] mx-auto px-6 sm:px-8 py-8 sm:py-10">
        {/* Brand + tagline */}
        <div className="mb-8 pb-8 border-b border-white/[0.08]">
          <Link
            href="/"
            className="inline-flex items-baseline text-[1.65rem] sm:text-[1.85rem] font-black uppercase tracking-tighter leading-none select-none mb-3"
            style={{ fontFamily: 'var(--font-inter-tight), sans-serif' }}
          >
            <span className="text-white">EROGRAM</span>
            <span className="w-[8px] h-[8px] ml-1 shrink-0 self-end mb-[2px] bg-[#c0392f]" />
          </Link>
          <p className="text-[12px] sm:text-[13px] text-[#8c8780] leading-relaxed max-w-md">
            Your #1 hub for Porn Telegram groups &amp; NSFW tools, bots, AI companions, OnlyFans creators.
            Explore and save your favorites all in one place.
          </p>
        </div>

        {/* 3 columns */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-10 mb-8 pb-8 border-b border-white/[0.08]">
          <FooterCol label="Explore">
            <FooterLink href={lp('/best-telegram-groups')}>Telegram Groups</FooterLink>
            <FooterLink href={lp('/bots')}>Telegram Bots</FooterLink>
            <FooterLink href={lp('/ainsfw')}>AI NSFW Tools</FooterLink>
            <FooterLink href="/blog">Blog &amp; Guides</FooterLink>
            <FooterLink href={lp('/best-onlyfans-accounts')}>OnlyFans Creators</FooterLink>
            <FooterLink href="/trending"><span className="text-[#c0392f] font-semibold">Trending</span></FooterLink>
          </FooterCol>

          <FooterCol label="Get Seen">
            <FooterLink href={lp('/add/group')}>Submit Group</FooterLink>
            <FooterLink href={lp('/add/bot')}>Submit Bot</FooterLink>
            <FooterLink href={lp('/submit')}>Submit OF Creator</FooterLink>
            <FooterLink href={lp('/add/ainsfw')}>Submit AI NSFW</FooterLink>
          </FooterCol>

          <FooterCol label="Advertise With Us">
            <a href="mailto:Isabella@erogram.biz" className="block text-[13px] text-[#b8b2ab] hover:text-white transition-colors">
              Isabella@erogram.biz
            </a>
            <a href="https://t.me/erogramDOTpro" target="_blank" rel="noopener noreferrer" className="block text-[13px] text-[#b8b2ab] hover:text-white transition-colors">
              ErogramDOTpro on Telegram
            </a>
          </FooterCol>
        </div>

        {/* Bottom bar — compact */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] tracking-[0.1em] uppercase">
            <FooterLink href={lp('/about')}>About</FooterLink>
            <FooterLink href={lp('/contact')}>Contact</FooterLink>
            <FooterLink href={lp('/terms')}>Terms</FooterLink>
            <FooterLink href={lp('/privacy')}>Privacy</FooterLink>
            <FooterLink href={lp('/onlyfanssearch')}>OFsearch</FooterLink>
          </div>
          <RtaBadge size="lg" />
        </div>
        <p className="mt-4 text-[11px] text-[#5a534d] leading-relaxed">
          © {year} Erogram.pro · By entering this site you swear that you are of legal age in your area to view adult material.
        </p>
      </div>
    </footer>
  );
}
