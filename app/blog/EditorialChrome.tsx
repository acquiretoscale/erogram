'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { useLocalePath, useTranslation } from '@/lib/i18n/client';
import { getMyListingsSummary } from '@/lib/actions/myListings';
import { getMyAINSFWSummary } from '@/lib/actions/myAINSFWListings';
import { getCampaignPlacement } from '@/lib/actions/publicData';
import { trackClick as trackCampaignClick } from '@/lib/actions/campaigns';
import { RtaBadge } from '@/components/AgeGate';
import ErogramWordmark from '@/components/ErogramWordmark';
import { TelegramPlaneIcon } from '@/lib/icons/TelegramPlaneIcon';

function MastheadAdSlot() {
  const [cta, setCta] = useState<{ _id: string; destinationUrl: string; description: string; buttonText: string } | null>(null);

  useEffect(() => {
    getCampaignPlacement('navbar-cta')
      .then((d) => { if (d?.campaign?.destinationUrl) setCta(d.campaign); })
      .catch(() => {});
  }, []);

  if (!cta) return null;
  const ctaLabel = (cta.buttonText || cta.description || '').trim();
  return (
    <a
      href={cta.destinationUrl}
      target="_blank"
      rel="sponsored noopener noreferrer"
      onClick={() => trackCampaignClick(cta._id, 'navbar-cta')}
      className="shrink-0 inline-flex items-center h-[18px] text-[9px] sm:text-[10px] font-bold tracking-[0.1em] uppercase text-white bg-[#e0245e] hover:bg-[#c81e51] border border-white/15 px-1.5 sm:px-2 rounded-[3px] transition-colors whitespace-nowrap leading-none"
    >
      {ctaLabel}
    </a>
  );
}

const NAV_PRE: Array<{ labelKey: string; fallback: string; href: string; badge?: string }> = [
  { labelKey: 'nav.groups', fallback: 'Groups', href: '/groups' },
  { labelKey: 'nav.bots', fallback: 'Bots', href: '/bots' },
  { labelKey: 'nav.aiNsfw', fallback: 'AI NSFW', href: '/ainsfw' },
  { labelKey: 'nav.onlyfans', fallback: 'OFsearch', href: '/ofsearch' },
];


const ADD_ITEMS = [
  {
    labelKey: 'nav.onlyfansCreator', fallback: 'OnlyFans Creator', href: '/submit', color: '#00AFF0',
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" /></svg>,
  },
  {
    labelKey: 'nav.telegramGroup', fallback: 'Telegram Group', href: '/add/group', color: '#4ab3f4',
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M20.665 3.717l-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701h-.002l.002.001-.314 4.692c.46 0 .663-.211.921-.46l2.211-2.15 4.599 3.397c.848.467 1.457.227 1.668-.785l3.019-14.228c.309-1.239-.473-1.8-1.282-1.434z" /></svg>,
  },
  {
    labelKey: 'nav.telegramBot', fallback: 'Telegram Bot', href: '/add/bot', color: '#4ab3f4',
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="10" rx="2" /><circle cx="9" cy="16" r="1" /><circle cx="15" cy="16" r="1" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>,
  },
  {
    labelKey: 'nav.aiNsfw', fallback: 'AI NSFW', href: '/add/ainsfw', color: '#e8b923',
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 8v8M9 8l6 8M15 8v8" /></svg>,
  },
];

function LiveVisitorBar() {
  return (
    <div
      className="w-full bg-white/[0.03] border-b border-white/[0.06]"
      aria-label="Site status"
    >
      <div className="max-w-[1280px] mx-auto px-3 sm:px-8 py-1 sm:py-0 sm:h-[24px] flex items-center gap-3">
        <div className="flex-1 min-w-0 flex justify-center">
          <LiveVisitorCount />
        </div>
        <div className="shrink-0 flex items-center gap-3">
          <Link
            href="/promo"
            className="text-[10px] sm:text-[11px] font-bold text-white hover:text-white/85 uppercase tracking-[0.12em] whitespace-nowrap leading-none transition-colors"
          >
            ADVERTISE
          </Link>
          <MastheadAdSlot />
        </div>
      </div>
    </div>
  );
}

function LiveVisitorCount() {
  const { t } = useTranslation();
  const [count, setCount] = useState(0);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const fetchCount = () => {
      fetch('/api/advertise-stats', { cache: 'no-store' })
        .then((r) => r.json())
        .then((d) => {
          if (typeof d.activeVisitors === 'number') {
            setCount(d.activeVisitors);
            setLive(true);
          }
        })
        .catch(() => {});
    };
    fetchCount();
    const id = setInterval(fetchCount, 300_000);
    return () => clearInterval(id);
  }, []);

  return (
    <span
      className="text-[10px] sm:text-[11px] font-semibold text-white/55 uppercase tracking-[0.06em] sm:tracking-[0.08em] whitespace-nowrap leading-none flex items-center justify-center gap-1.5"
      aria-label={count > 0 ? `${count.toLocaleString('en-US')} browsing right now` : 'Browsing right now'}
      role="status"
      aria-live="polite"
    >
      <span className="relative flex h-1.5 w-1.5 shrink-0">
        {live && count > 0 && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
        )}
        <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${live && count > 0 ? 'bg-emerald-400' : 'bg-white/20'}`} />
      </span>
      {count > 0 ? count.toLocaleString('en-US') : '—'}{' '}
      <span className="sm:hidden">{t('ainsfw.peopleBrowsingShort', 'browsing')}</span>
      <span className="hidden sm:inline">{t('ainsfw.peopleBrowsing', 'browsing right now')}</span>
    </span>
  );
}

function AddToolNav() {
  const { t } = useTranslation();
  const lp = useLocalePath();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const timer = setTimeout(() => document.addEventListener('mousedown', handler, true), 100);
    return () => { clearTimeout(timer); document.removeEventListener('mousedown', handler, true); };
  }, [open]);

  return (
    <div className="relative h-full flex items-center" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-0.5 text-[9px] sm:text-[10px] font-bold tracking-[0.1em] uppercase text-black bg-white hover:bg-white/90 px-1.5 sm:px-2 h-[18px] rounded-[3px] transition-colors leading-none"
      >
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="shrink-0"><path d="M12 5v14M5 12h14" /></svg>
        {t('nav.submit', 'Submit')}
        <svg width="6" height="6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`shrink-0 opacity-50 transition-transform ${open ? 'rotate-180' : ''}`}><path d="M6 9l6 6 6-6" /></svg>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            style={{ transformOrigin: 'top right' }}
            className="absolute right-0 top-full mt-1.5 w-[230px] bg-[#161412] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden p-1.5"
          >
            <div className="px-3 py-2 text-[9px] font-black uppercase tracking-[0.2em] text-white/35">{t('nav.whatAdding', 'What are you adding?')}</div>
            {ADD_ITEMS.map((it, i) => (
              <motion.div
                key={it.href}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.03 + i * 0.04, duration: 0.18 }}
              >
                <Link
                  href={lp(it.href)}
                  onClick={() => setOpen(false)}
                  className="group flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.05] transition-colors"
                >
                  <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-110" style={{ background: `${it.color}1f`, color: it.color }}>
                    {it.icon}
                  </span>
                  <span className="text-[13px] font-semibold text-[#cfc9c2] group-hover:text-white transition-colors">{t(it.labelKey, it.fallback)}</span>
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

function MastheadAvatarIcon({
  photoUrl,
  label,
  accent,
  size = 'sm',
}: {
  photoUrl: string | null;
  label: string;
  accent: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const cls =
    size === 'lg' ? 'w-[38px] h-[38px] text-[14px]' :
    size === 'md' ? 'w-8 h-8 text-[13px]' :
    'w-6 h-6 text-[11px]';
  if (photoUrl) {
    return (
      <span className={`${cls} rounded-full overflow-hidden shrink-0 block`}>
        <img src={photoUrl} alt="" className="w-full h-full object-cover scale-110" />
      </span>
    );
  }
  return (
    <span
      className={`${cls} rounded-full flex items-center justify-center font-bold text-black shrink-0`}
      style={{ background: accent }}
    >
      {label.charAt(0).toUpperCase()}
    </span>
  );
}

// Shared auth/session state — single source for desktop + mobile (mirrors Navbar).
function useMastheadAuth() {
  const [mounted, setMounted] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [firstName, setFirstName] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
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
    setFirstName(localStorage.getItem('firstName'));
    setPhotoUrl(localStorage.getItem('photoUrl'));
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
          if (d.firstName) { setFirstName(d.firstName); localStorage.setItem('firstName', d.firstName); }
          else { setFirstName(null); localStorage.removeItem('firstName'); }
          if (d.photoUrl) { setPhotoUrl(d.photoUrl); localStorage.setItem('photoUrl', d.photoUrl); }
        })
        .catch(() => {});
      getMyListingsSummary(token).then((s) => { if (s.hasListings) setListings(s); }).catch(() => {});
      getMyAINSFWSummary(token).then((s) => { if (s.hasListings) setAinsfw(s); }).catch(() => {});
    }

    const onPhotoUpdate = (e: Event) => {
      const url = (e as CustomEvent<{ photoUrl?: string }>).detail?.photoUrl ?? localStorage.getItem('photoUrl');
      setPhotoUrl(url);
    };
    const onProfileUpdate = (e: Event) => {
      const name = (e as CustomEvent<{ firstName?: string | null }>).detail?.firstName ?? localStorage.getItem('firstName');
      setFirstName(name || null);
    };
    window.addEventListener('erogram:photoUrlUpdated', onPhotoUpdate);
    window.addEventListener('erogram:profileUpdated', onProfileUpdate);

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt as EventListener);
      window.removeEventListener('erogram:photoUrlUpdated', onPhotoUpdate);
      window.removeEventListener('erogram:profileUpdated', onProfileUpdate);
    };
  }, []);

  const logout = () => {
    ['token', 'username', 'isAdmin', 'firstName', 'photoUrl'].forEach((k) => localStorage.removeItem(k));
    setUsername(null); setFirstName(null); setPhotoUrl(null); setIsPremium(false); setIsAdmin(false); setListings(null); setAinsfw(null);
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

  return { mounted, username, firstName, photoUrl, isPremium, isAdmin, listings, ainsfw, isAppInstalled, installApp, logout };
}

type MastheadAuth = ReturnType<typeof useMastheadAuth>;

function MastheadUserMenu({ accent, auth, lp }: { accent: string; auth: MastheadAuth; lp: (p: string) => string }) {
  const { t } = useTranslation();
  const { mounted, username, firstName, photoUrl, isPremium, isAdmin, listings, ainsfw, logout } = auth;
  const displayName = firstName || username || '';
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const t = setTimeout(() => document.addEventListener('mousedown', handler, true), 100);
    return () => { clearTimeout(t); document.removeEventListener('mousedown', handler, true); };
  }, [open]);

  const item = 'flex items-center gap-2.5 px-4 py-2 text-[13px] text-[#cfc9c2] hover:text-white hover:bg-white/[0.05] transition-colors';
  const campaignsLabel = listings?.hasPaidCampaign
    ? t('nav.myCampaigns', 'My Campaigns')
    : t('nav.myListings', 'My Listings');

  if (!mounted) {
    return <span className="w-8 h-8 rounded-full bg-white/[0.08] border border-white/15 inline-block" suppressHydrationWarning />;
  }

  if (!username) {
    return (
      <div className="flex items-center gap-2">
        <Link href={lp('/login')} className="text-[11px] font-bold tracking-[0.14em] uppercase text-white border border-white/25 hover:border-white/60 hover:bg-white/[0.06] px-4 py-2 rounded-[5px] transition-colors">
          {t('nav.login', 'Login')}
        </Link>
        <Link
          href={lp('/login?mode=join')}
          className="text-[11px] font-bold tracking-[0.14em] uppercase text-white px-4 py-2 rounded-[5px] transition-opacity hover:opacity-85"
          style={{ background: accent }}
        >
          {t('nav.join', 'Join')}
        </Link>
      </div>
    );
  }

  return (
    <div className="relative" ref={ref} suppressHydrationWarning>
      <button
        onClick={() => setOpen(!open)}
        aria-label="Account menu"
        className="flex items-center gap-2.5 rounded-full pl-1.5 pr-3 py-1.5 bg-white/[0.06] border border-white/15 hover:bg-white/[0.12] transition-colors"
      >
        <MastheadAvatarIcon photoUrl={photoUrl} label={displayName} accent={accent} size="lg" />
        <span className="hidden sm:block max-w-[90px] truncate text-[12px] font-semibold text-white">{displayName}</span>
        {isPremium && <svg width="10" height="10" viewBox="0 0 24 24" fill={accent} className="shrink-0"><path d="M12 2l2.09 6.26L20 9.27l-4.45 4.7L16.91 20 12 16.9 7.09 20l1.36-6.03L4 9.27l5.91-1.01z" /></svg>}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`text-white/60 transition-transform ${open ? 'rotate-180' : ''}`}><path d="M6 9l6 6 6-6" /></svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-[#161412] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden py-1">
          <div className="px-4 py-2.5 text-[12px] font-semibold text-white/50 border-b border-white/[0.06] flex items-center gap-2 flex-wrap">
            <span>{displayName}</span>
            {firstName && username && (
              <span className="text-white/30 font-normal">@{username}</span>
            )}
            {isPremium && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${accent}26`, color: accent }}>VIP</span>}
          </div>

          {!isPremium && <UpgradePremiumButton href={lp('/premium')} onClick={() => setOpen(false)} />}

          {listings?.hasListings && (
            <Link href={lp('/my-listings')} onClick={() => setOpen(false)} className={item}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 11 18-5v12L3 14v-3z" /><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" /></svg>
              <span className="flex-1">{campaignsLabel}</span>
              {!!listings.inReviewCount && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20">{listings.inReviewCount} {t('nav.inReview', 'in review')}</span>}
            </Link>
          )}
          {ainsfw?.hasListings && (
            <Link href="/ai-nsfw-listings" onClick={() => setOpen(false)} className={item}>
              <span className="text-[13px] leading-none">🔞</span>
              <span className="flex-1">{t('nav.myAiNsfw', 'My AI NSFW')}</span>
              {!!ainsfw.inReviewCount && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20">{ainsfw.inReviewCount} {t('nav.inReview', 'in review')}</span>}
            </Link>
          )}
          {isAdmin && (
            <Link href="/admin" onClick={() => setOpen(false)} className={item}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
              {t('nav.adminPanel', 'Admin Panel')}
            </Link>
          )}
          {isAdmin && (
            <Link href="/OF" onClick={() => setOpen(false)} className={item}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" /><path d="M8 12h8M12 8v8" /></svg>
              {t('nav.ofAdmin', 'OF Admin')}
            </Link>
          )}
          <Link href={lp('/profile')} onClick={() => setOpen(false)} className={item}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" /></svg>
            {t('nav.profile', 'Profile')}
          </Link>
          <Link href={`${lp('/profile')}?tab=saved`} onClick={() => setOpen(false)} className={item}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z" /></svg>
            {t('nav.saved', 'Saved')}
          </Link>
          <Link href="/blog" onClick={() => setOpen(false)} className={item}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
            {t('nav.blog', 'Blog')}
          </Link>
          <Link href={`${lp('/profile')}?tab=settings`} onClick={() => setOpen(false)} className={item}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
            {t('nav.support', 'Support')}
          </Link>
          <div className="border-t border-white/[0.06] mt-1 pt-1">
            <button onClick={() => { logout(); setOpen(false); }} className="w-full flex items-center gap-2.5 px-4 py-2 text-[13px] text-white/40 hover:text-red-400 hover:bg-red-500/5 transition-colors text-left">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>
              {t('nav.logout', 'Logout')}
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

// Golden UPGRADE PREMIUM styling — shared across desktop dropdown + mobile menu.
const GOLD_BG = 'linear-gradient(135deg, #b8860b 0%, #ffd700 40%, #fff8b0 55%, #ffd700 70%, #b8860b 100%)';
const GOLD_SHADOW = '0 4px 18px -6px rgba(255,215,0,0.55), inset 0 1px 0 rgba(255,255,255,0.4)';

function UpgradePremiumButton({ href, onClick, label }: { href: string; onClick?: () => void; label?: string }) {
  const { t } = useTranslation();
  return (
    <Link
      href={href}
      onClick={onClick}
      className="mx-2 my-1.5 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-black text-[#1a0f00] tracking-tight transition-all hover:brightness-105 active:scale-[0.98]"
      style={{ background: GOLD_BG, boxShadow: GOLD_SHADOW }}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="#1a0f00" className="shrink-0" aria-hidden><path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z" /></svg>
      {label || t('nav.upgradePremium', 'UPGRADE PREMIUM')}
    </Link>
  );
}

function MobileNavMenu({ open, lp, onClose }: { open: boolean; lp: (p: string) => string; onClose: () => void }) {
  const { t } = useTranslation();

  const item = 'flex items-center gap-3 px-4 py-2.5 text-[14px] text-[#cfc9c2] hover:text-white hover:bg-white/[0.05] active:bg-white/[0.08] transition-colors';

  // Scannable icons for top-tier mobile menu affordance (left icon + label).
  const navIcon = (href: string) => {
    if (href === '/') return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V9.5z"/></svg>;
    if (href === '/groups') return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
    if (href === '/bots') return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/><circle cx="8" cy="16" r="1"/><circle cx="16" cy="16" r="1"/></svg>;
    if (href === '/ainsfw') return <span className="text-[15px] leading-none">🔞</span>;
    if (href === '/ofsearch') {
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="10" fill="#00AFF0" />
          <text x="12" y="16" textAnchor="middle" fill="white" fontSize="11" fontWeight="800" fontFamily="system-ui, sans-serif">
            OF
          </text>
        </svg>
      );
    }
    return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>;
  };

  return (
    <motion.div
      className="lg:hidden overflow-hidden border-t border-white/10"
      initial={false}
      animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="px-4 pb-5 pt-3 space-y-3 bg-black">
        <div className="bg-[#161412] border border-white/10 rounded-xl overflow-hidden py-1">
          <div className="px-4 py-2.5 text-[13px] font-semibold text-white/50 border-b border-white/[0.06]">{t('nav.explore', 'Explore')}</div>

          {NAV_PRE.map((n) => (
            <Link key={n.href} href={lp(n.href)} onClick={onClose} className={item}>
              {navIcon(n.href)}
              <span className="flex-1">{t(n.labelKey, n.fallback)}</span>
              {n.badge && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#c0392f] text-white">{n.badge}</span>}
            </Link>
          ))}

          <Link href={lp('/best-porn')} onClick={onClose} className={item}>
            {navIcon('/best-porn')}
            <span className="flex-1">Porn Websites</span>
          </Link>

          <Link href="/blog" onClick={onClose} className={item}>
            <span className="flex-1">{t('nav.blog', 'Blog')}</span>
          </Link>

          <UpgradePremiumButton href={lp('/premium')} onClick={onClose} label="Upgrade to premium" />
        </div>
      </div>
    </motion.div>
  );
}

function MobileUserMenu({ open, auth, lp, onClose }: { open: boolean; auth: MastheadAuth; lp: (p: string) => string; onClose: () => void }) {
  const { t } = useTranslation();
  const { mounted, username, firstName, isPremium, isAdmin, listings, ainsfw, logout } = auth;
  const displayName = firstName || username || '';
  const campaignsLabel = listings?.hasPaidCampaign
    ? t('nav.myCampaigns', 'My Campaigns')
    : t('nav.myListings', 'My Listings');
  const item = 'flex items-center gap-3 px-4 py-2.5 text-[14px] text-[#cfc9c2] hover:text-white hover:bg-white/[0.05] active:bg-white/[0.08] transition-colors';

  return (
    <motion.div
      className="lg:hidden overflow-hidden border-t border-white/10"
      initial={false}
      animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="px-4 pb-5 pt-3 bg-black" suppressHydrationWarning>
        {mounted && username ? (
          <div className="bg-[#161412] border border-white/10 rounded-xl overflow-hidden py-1">
            <div className="px-4 py-2.5 text-[13px] font-semibold text-white/50 border-b border-white/[0.06] flex items-center gap-2 flex-wrap">
              <span>{displayName}</span>
              {firstName && username && (
                <span className="text-white/30 font-normal">@{username}</span>
              )}
              {isPremium && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20">VIP</span>}
            </div>

            {!isPremium && <UpgradePremiumButton href={lp('/premium')} onClick={onClose} />}

            {listings?.hasListings && (
              <Link href={lp('/my-listings')} onClick={onClose} className={item}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>
                <span className="flex-1">{campaignsLabel}</span>
                {!!listings.inReviewCount && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20">{listings.inReviewCount} {t('nav.inReview', 'in review')}</span>}
              </Link>
            )}
            {ainsfw?.hasListings && (
              <Link href="/ai-nsfw-listings" onClick={onClose} className={item}>
                <span className="text-[14px] leading-none">🔞</span>
                <span className="flex-1">{t('nav.myAiNsfw', 'My AI NSFW')}</span>
                {!!ainsfw.inReviewCount && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20">{ainsfw.inReviewCount} {t('nav.inReview', 'in review')}</span>}
              </Link>
            )}
            {isAdmin && (
              <Link href="/admin" onClick={onClose} className={item}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
                {t('nav.adminPanel', 'Admin Panel')}
              </Link>
            )}
            {isAdmin && (
              <Link href="/OF" onClick={onClose} className={item}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"/><path d="M8 12h8M12 8v8"/></svg>
                {t('nav.ofAdmin', 'OF Admin')}
              </Link>
            )}
            <Link href={lp('/profile')} onClick={onClose} className={item}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/></svg>
              {t('nav.profile', 'Profile')}
            </Link>
            <Link href={`${lp('/profile')}?tab=saved`} onClick={onClose} className={item}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>
              {t('nav.saved', 'Saved')}
            </Link>
            <Link href="/blog" onClick={onClose} className={item}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
              {t('nav.blog', 'Blog')}
            </Link>
            <Link href={`${lp('/profile')}?tab=settings`} onClick={onClose} className={item}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              {t('nav.support', 'Support')}
            </Link>
            <div className="border-t border-white/[0.06] mt-1 pt-1">
              <button onClick={() => { logout(); onClose(); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-[14px] text-white/40 hover:text-red-400 hover:bg-red-500/5 transition-colors text-left">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
                {t('nav.logout', 'Logout')}
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <Link href={lp('/login')} onClick={onClose} className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#161412] border border-white/10 text-[14px] font-bold text-white hover:bg-white/[0.06] transition-colors">
              {t('nav.login', 'Login')}
            </Link>
            <Link href={lp('/login?mode=join')} onClick={onClose} className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white text-[14px] font-bold text-black hover:opacity-90 transition-opacity">
              {t('nav.join', 'Join')}
            </Link>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// OnlyFans-blue routes get the blue accent; everything else uses Erogram dark red.
function accentForPath(pathname: string): string {
  const p = (pathname || '/').replace(/^\/(de|es|pt)/, '') || '/';
  if (
    p === '/ofsearch' ||
    p.startsWith('/ofsearch/') ||
    p.startsWith('/best-onlyfans-accounts') ||
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
export function EditorialMasthead({ accent, fixed = false, wordmarkMode = 'default' }: { accent?: string; fixed?: boolean; wordmarkMode?: 'default' | 'pornhub' | 'onlyfans' }) {
  const { t } = useTranslation();
  const auth = useMastheadAuth();
  const lp = useLocalePath();
  const pathname = usePathname();
  const resolvedAccent = accent ?? accentForPath(pathname || '/');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  // Fixed pages already pad for the 58px nav row (pt-20/24/28). The live visitor
  // strip (+5px gap) sits below that and was never in those pads — reserve it here
  // so every Navbar page clears the bar without editing dozens of pages.
  const FIXED_EXTRA_OFFSET = 24 + 5;

  return (
    <>
    <header className={`${fixed ? 'fixed top-0 left-0 right-0' : 'relative'} z-50 bg-black/95 backdrop-blur-md border-b border-white/[0.08]`}>
      <div className="max-w-[1280px] mx-auto px-4 sm:px-8 h-[58px] flex items-center gap-2 sm:gap-6">
        {/* Wordmark — EROGRAMX (red X via ErogramWordmark). */}
        <div className="shrink-0 inline-flex items-center mr-2 sm:mr-6 lg:mr-8">
          <Link
            href="/"
            aria-label="ErogramX"
            className={`flex items-baseline uppercase tracking-tighter leading-none select-none ${
              wordmarkMode === 'pornhub'
                ? 'text-[2.01rem] sm:text-[2.14rem] font-black gap-0'
                : 'text-[2.14rem] font-black'
            }`}
            style={{ fontFamily: wordmarkMode === 'pornhub' ? 'var(--font-inter-tight), Arial Black, sans-serif' : 'var(--font-inter-tight), sans-serif' }}
          >
            {wordmarkMode === 'pornhub' ? (
              <>
                <span className="text-white profile-ph-wordmark-main">Ero</span>
                <span className="profile-ph-wordmark-hub">gram</span>
              </>
            ) : (
              <ErogramWordmark accent="#c0392f" />
            )}
          </Link>
        </div>

        {/* Desktop nav — uppercase, letter-spaced, muted. Only at lg+ where it fits;
            tablet falls back to the burger menu so no items get cut off. */}
        <nav className="hidden lg:flex items-center gap-6 lg:gap-8 shrink-0">
          {NAV_PRE.map((n) => (
            <Link
              key={n.href}
              href={lp(n.href)}
              className="shrink-0 inline-flex items-center gap-1 text-[11px] font-bold tracking-[0.18em] uppercase text-white hover:text-white/80 transition-colors"
            >
              {t(n.labelKey, n.fallback)}
              {n.badge && (
                <span className="text-[8px] font-bold tracking-[0.08em] leading-none px-1 py-0.5 rounded-[3px] bg-[#c0392f] text-white">
                  {n.badge}
                </span>
              )}
            </Link>
          ))}
          <Link
            href={lp('/best-porn')}
            className="shrink-0 inline-flex items-center gap-1 text-[11px] font-bold tracking-[0.18em] uppercase text-white hover:text-white/80 transition-colors"
          >
            Porn Websites
          </Link>
          <Link
            href="/blog"
            className="shrink-0 inline-flex items-center gap-1 text-[11px] font-bold tracking-[0.18em] uppercase text-white hover:text-white/80 transition-colors"
          >
            {t('nav.blog', 'Blog')}
          </Link>
        </nav>

        <div className="hidden lg:flex items-center gap-2.5 shrink-0 ml-auto">
          <AddToolNav />
          <MastheadUserMenu accent={resolvedAccent} auth={auth} lp={lp} />
        </div>

        {/* Mobile + tablet — burger / avatar */}
        <div className="lg:hidden ml-auto flex items-center gap-1.5 sm:gap-2 shrink-0">
          <AddToolNav />
          <button
            onClick={() => { setMobileOpen((v) => !v); setUserOpen(false); }}
            aria-label="Toggle menu"
            className="shrink-0 flex flex-col gap-[5px] w-8 h-8 items-center justify-center rounded-lg hover:bg-white/[0.08] active:bg-white/[0.12] transition-colors"
          >
            <motion.span className="w-[18px] h-[1.5px] bg-white/75 rounded-full" animate={{ rotate: mobileOpen ? 45 : 0, y: mobileOpen ? 6.5 : 0 }} transition={{ duration: 0.2 }} />
            <motion.span className="w-[18px] h-[1.5px] bg-white/75 rounded-full" animate={{ opacity: mobileOpen ? 0 : 1 }} transition={{ duration: 0.2 }} />
            <motion.span className="w-[18px] h-[1.5px] bg-white/75 rounded-full" animate={{ rotate: mobileOpen ? -45 : 0, y: mobileOpen ? -6.5 : 0 }} transition={{ duration: 0.2 }} />
          </button>
          <button
            onClick={() => { setUserOpen((v) => !v); setMobileOpen(false); }}
            aria-label="Account menu"
            className={`shrink-0 transition-all ${
              userOpen ? 'ring-2 ring-white/50 rounded-full' : 'hover:brightness-110'
            }`}
            suppressHydrationWarning
          >
            {auth.mounted && auth.username ? (
              <MastheadAvatarIcon
                photoUrl={auth.photoUrl}
                label={auth.firstName || auth.username}
                accent={resolvedAccent}
                size="md"
              />
            ) : (
              <span
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: resolvedAccent }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" /></svg>
              </span>
            )}
          </button>
        </div>
      </div>

      <LiveVisitorBar />

      <MobileNavMenu open={mobileOpen} lp={lp} onClose={() => setMobileOpen(false)} />
      <MobileUserMenu open={userOpen} auth={auth} lp={lp} onClose={() => setUserOpen(false)} />
    </header>
    {fixed ? (
      <div aria-hidden className="w-full shrink-0 pointer-events-none" style={{ height: FIXED_EXTRA_OFFSET }} />
    ) : (
      <div aria-hidden className="w-full shrink-0 h-[5px] pointer-events-none" />
    )}
    </>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="block text-[13px] text-[#b8b2ab] hover:text-white transition-colors duration-200">
      {children}
    </Link>
  );
}

function FooterExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="block text-[13px] text-[#b8b2ab] hover:text-white transition-colors duration-200"
    >
      {children}
    </a>
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

function FooterSocialBlock() {
  const { t } = useTranslation();
  const tileBase =
    'group relative flex h-12 w-12 items-center justify-center rounded-[14px] border transition-all duration-300 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30';

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.09] bg-white/[0.03] px-5 py-4 sm:min-w-[200px] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.07] via-transparent to-[#c0392f]/[0.06]" />
      <p className="relative mb-4 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a39e97]">
        {t('footer.followSocials', 'Follow EROGRAMX on socials')}
      </p>
      <div className="relative flex items-center justify-center gap-3">
        <a
          href="https://t.me/erogrampro"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Follow EROGRAMX on Telegram"
          title="EROGRAMX"
          className={`${tileBase} flex-col gap-1 h-auto min-h-12 w-[4.25rem] py-2 bg-[#0d8ecf]/15 border-[#29a9eb]/35 shadow-[0_4px_14px_rgba(13,142,207,0.2),inset_0_1px_0_rgba(255,255,255,0.08)] hover:border-[#29a9eb]/60 hover:bg-[#0d8ecf]/25 hover:shadow-[0_10px_28px_rgba(13,142,207,0.35),0_0_0_1px_rgba(41,169,235,0.15)]`}
        >
          <TelegramPlaneIcon className="h-[19px] w-[19px] text-[#29a9eb] transition-transform duration-300 group-hover:scale-110" />
          <span className="text-[9px] font-black uppercase tracking-[0.12em] text-[#7dd3fc] leading-none">
            EROGRAMX
          </span>
        </a>
        <a
          href="https://x.com/erogrampro"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Follow EROGRAMX on X"
          className={`${tileBase} bg-[#111]/90 border-white/[0.14] shadow-[0_4px_14px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.08)] hover:border-white/30 hover:bg-[#181818] hover:shadow-[0_10px_28px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.06)]`}
        >
          <svg className="h-[19px] w-[19px] text-white transition-transform duration-300 group-hover:scale-110" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </a>
      </div>
    </div>
  );
}

export function EditorialFooter() {
  const lp = useLocalePath();
  const { t } = useTranslation();
  return (
    <footer className="bg-black border-t border-white/[0.08]">
      <div className="max-w-[1280px] mx-auto px-6 sm:px-8 py-8 sm:py-10">
        {/* Brand + tagline + socials */}
        <div className="mb-8 pb-8 border-b border-white/[0.08] flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <Link
              href="/"
              aria-label="ErogramX"
              className="inline-flex items-baseline text-[1.65rem] sm:text-[1.85rem] font-black uppercase tracking-tighter leading-none select-none mb-3"
              style={{ fontFamily: 'var(--font-inter-tight), sans-serif' }}
            >
              <ErogramWordmark accent="#c0392f" />
            </Link>
            <p className="text-[12px] sm:text-[13px] text-[#8c8780] leading-relaxed max-w-md">
              {t('footer.tagline', 'Your #1 hub for Porn Telegram groups & NSFW tools, bots, AI companions, OnlyFans creators.')}{' '}
              {t('footer.taglineSub', 'Explore and save your favorites all in one place.')}
            </p>
          </div>

          <FooterSocialBlock />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-5 gap-y-8 sm:gap-x-8 sm:gap-y-10 mb-8 pb-8 border-b border-white/[0.08]">
          <FooterCol label={t('footer.explore', 'Explore')}>
            <FooterLink href={lp('/best-porn')}>Porn Websites</FooterLink>
            <FooterLink href={lp('/best-telegram-groups')}>{t('footer.telegramGroups', 'Telegram Groups')}</FooterLink>
            <FooterLink href={lp('/bots')}>{t('footer.telegramBots', 'Telegram Bots')}</FooterLink>
            <FooterLink href={lp('/ainsfw')}>{t('footer.aiNsfwTools', 'AI NSFW Tools')}</FooterLink>
            <FooterLink href="/blog">{t('footer.blogGuides', 'Blog & Guides')}</FooterLink>
            <FooterLink href={lp('/ofsearch')}>{t('footer.onlyfansCreators', 'OnlyFans Creators')}</FooterLink>
            <FooterLink href="/tags">{t('footer.tags', 'Tags')}</FooterLink>
            <FooterLink href="/community">{t('nav.community', 'Community')}</FooterLink>
          </FooterCol>

          <FooterCol label={t('footer.getSeen', 'Get Seen')}>
            <FooterLink href={lp('/add/group')}>{t('footer.submitGroup', 'Submit Group')}</FooterLink>
            <FooterLink href={lp('/add/bot')}>{t('footer.submitBot', 'Submit Bot')}</FooterLink>
            <FooterLink href={lp('/submit')}>{t('footer.submitOfCreator', 'Submit OF Creator')}</FooterLink>
            <FooterLink href={lp('/add/ainsfw')}>{t('footer.submitAiNsfw', 'Submit AI NSFW')}</FooterLink>
          </FooterCol>

          <FooterCol label={t('footer.company', 'COMPANY')}>
            <FooterLink href={lp('/promo')}>{t('footer.advertise', 'Advertise with us')}</FooterLink>
            <FooterLink href={lp('/partners')}>{t('footer.partners', 'Partners')}</FooterLink>
            <FooterLink href={lp('/partnership')}>{t('footer.getBadge', 'Get EROgram Badge')}</FooterLink>
            <FooterLink href={lp('/about')}>{t('footer.about', 'About')}</FooterLink>
            <FooterLink href={lp('/contact')}>{t('footer.contact', 'Contact')}</FooterLink>
          </FooterCol>

          <FooterCol label={t('footer.trustLegal', 'Trust & Legal')}>
            <FooterLink href={lp('/terms')}>{t('footer.terms', 'Terms')}</FooterLink>
            <FooterLink href={lp('/privacy')}>{t('footer.privacy', 'Privacy')}</FooterLink>
            <FooterLink href={lp('/dmca')}>{t('footer.dmca', 'DMCA')}</FooterLink>
            <FooterLink href={lp('/copyright')}>{t('footer.copyrightTakedown', 'Copyright & Takedown')}</FooterLink>
            <FooterLink href={lp('/compliance')}>{t('footer.contentCompliance', 'Content Compliance')}</FooterLink>
            <FooterLink href={lp('/report-abuse')}>{t('footer.reportAbuse', 'Report Abuse')}</FooterLink>
          </FooterCol>

          <FooterCol label={t('footer.friendsOfErogram', 'Friends of EROGRAM')}>
            <FooterExternalLink href="https://camslut.ai">camslut.ai</FooterExternalLink>
            <FooterExternalLink href="https://slutbot.ai">slutbot.ai</FooterExternalLink>
          </FooterCol>
        </div>

        {/* Bottom bar — compact */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <RtaBadge size="lg" />
        </div>
      </div>
    </footer>
  );
}
