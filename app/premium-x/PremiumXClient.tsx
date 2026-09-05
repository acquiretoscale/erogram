'use client';

import { useState, useEffect, useRef, useCallback, useMemo, type ReactNode } from 'react';
import axios from 'axios';
import Link from 'next/link';
import type { PremiumPricing, ValidPlan } from '@/lib/premiumPricing';
import PremiumCompareBlock from '@/components/PremiumCompareBlock';

function trackPremiumEvent(event: string, extra?: Record<string, string | null>) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  fetch('/api/payments/track', { method: 'POST', headers, body: JSON.stringify({ event, source: 'premium_x_page', ...extra }) }).catch(() => {});
}


interface VaultTeaserItem { _id: string; name: string; image: string; category: string; country: string; memberCount: number; vaultCategories?: string[]; }

const G = { gold: '#2AABEE', goldLight: '#5bc1f5', goldDim: 'rgba(255,255,255,0.4)', goldText: 'rgba(255,255,255,0.55)', border: 'rgba(255,255,255,0.10)', borderLight: 'rgba(255,255,255,0.15)', innerBg: 'rgba(255,255,255,0.04)' };
const TG = '#2AABEE';
const TG_DARK = '#0e1621';
const MODAL_SHELL =
  'rounded-3xl border border-[#2AABEE]/25 bg-[#17212b] shadow-[0_0_60px_rgba(42,171,238,0.18),inset_0_1px_0_rgba(42,171,238,0.14)]';
const WHITE_INSET = 'rounded-2xl bg-white';
const PREMIUM_GOLD = {
  background: 'linear-gradient(135deg, #f5d061 0%, #c9973a 45%, #a67c00 100%)',
  color: '#2a1f00',
  border: '1px solid #e8c547',
  boxShadow: '0 0 10px rgba(201,151,58,0.45)',
};
const checkoutBtnClass =
  'shrink-0 px-4 py-2.5 rounded-full font-black transition-all hover:scale-[1.02] hover:brightness-110 active:scale-[0.98] disabled:opacity-50 flex flex-col items-center';
const ctaClass =
  'inline-flex items-center justify-center px-5 py-2.5 rounded-full text-sm font-black uppercase tracking-wide transition-all hover:brightness-110 active:scale-95';

const CHECKOUT_PROMO_VIDEO = 'https://pub-5800916b33a845e4b67e2d5be553c1e3.r2.dev/premium/checkout/EROGRAMX-PREMIUM-ADULT-ENTRETAINEMENT.mp4';
const CHECKOUT_PROMO_POSTER = 'https://pub-5800916b33a845e4b67e2d5be553c1e3.r2.dev/premium/checkout/swipey-promo.jpg';
const MOSAIC_WEBP = 'https://pub-5800916b33a845e4b67e2d5be553c1e3.r2.dev/premium/mosaic/groups-mosaic-hq.webp';

function TgIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.665 3.717l-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701h-.002l.002.001-.314 4.692c.46 0 .663-.211.921-.46l2.211-2.15 4.599 3.397c.848.467 1.457.227 1.668-.785l3.019-14.228c.309-1.239-.473-1.8-1.282-1.434z"/>
    </svg>
  );
}

function CheckoutPromoVideo() {
  return (
    <div className="w-full overflow-hidden relative aspect-[16/13.2] sm:aspect-[16/11.88] bg-black">
      <video
        src={CHECKOUT_PROMO_VIDEO}
        poster={CHECKOUT_PROMO_POSTER}
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        className="absolute inset-0 w-full h-full object-cover object-top"
        aria-hidden="true"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[1] bg-black/25"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-0 bottom-0 z-[1] h-[75%] w-[82%]"
        style={{
          background: 'linear-gradient(to top, #070b10 0%, rgba(14,22,33,0.94) 42%, rgba(14,22,33,0.58) 70%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to right, #000 0%, #000 58%, transparent 100%)',
          maskImage: 'linear-gradient(to right, #000 0%, #000 58%, transparent 100%)',
        }}
      />
      <div className="absolute left-4 right-4 bottom-4 z-[2] select-none">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white mb-2 drop-shadow-[0_1px_4px_rgba(0,0,0,0.85)]">Premium Highlights</p>
        <ul className="space-y-1">
          {[
            '4800 UNLISTED/RARE GROUPS',
            '120 CATEGORIES & SUB CATEGORIES',
            'WEEKLY DROPS OF NEW GROUPS',
            'ADVANCED FILTERS TO FIND FASTER',
          ].map((line) => (
            <li key={line} className="flex items-center gap-1.5 text-[16px] leading-[20px] text-white tracking-[0.02em] drop-shadow-[0_1px_4px_rgba(0,0,0,0.85)]">
              <TgIcon className="w-4 h-4 shrink-0 text-white" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 w-fit whitespace-nowrap text-[28px] sm:text-[40px] leading-none font-black uppercase tracking-[0.01em] text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]">
          JOIN EROGRAM<span className="inline-block origin-bottom text-[#e30613] tracking-normal" style={{ fontSize: '1.1em' }}>X</span> PREMIUM
        </p>
      </div>
    </div>
  );
}

function formatUsd(amount: number): string {
  return amount % 1 === 0 ? `$${amount}` : `$${amount.toFixed(2)}`;
}

function formatPerMonth(priceUsd: number, months: number): string {
  return `$${(priceUsd / months).toFixed(2)}/mo`;
}

function launchListPrice(saleUsd: number): number {
  return +(saleUsd / 0.8).toFixed(2);
}

function formatStars(amount: number | null): string {
  if (!amount) return '';
  return amount >= 1000 ? `${amount.toLocaleString('en-US')} ★` : `${amount} ★`;
}

const fmtMemberCount = (n: number) =>
  n >= 1_000_000 ? (n / 1_000_000).toFixed(1) + 'M' : n >= 1_000 ? (n / 1_000).toFixed(n >= 10_000 ? 0 : 1) + 'K' : n > 0 ? String(n) : null;

const PREMIUM_FAQ: { q: string; a: ReactNode }[] = [
  {
    q: "What's the difference between the 300 public groups and the 4,800+ Premium ones?",
    a: 'The public catalog is around 300 groups anyone can browse. Erogram Premium unlocks 4,800+ hand-picked Telegram groups, including exclusive niches that are not on the public feed. Premium links are checked daily so expired invites get cleaned. Public listings are not verified on that same daily schedule.',
  },
  {
    q: 'What do I actually get with Premium?',
    a: (
      <div className="space-y-2">
        <p>Erogram Premium includes 4,800 unlisted groups. High quality and rare groups you will not find on the public catalog.</p>
        <p>An advanced groups search engine to find what you want faster.</p>
        <p>Over 120 categories, including OnlyFans leaks, Russian, Ukrainian, Korean, Cosplay, Asian, Dominatrix/Submissive, Nylon, Booty, Arabs, Erotic, MILF, blowjob, Latinas, Lesbian, BDSM, Feet, Chinese, big boobs, JOI, JAV, and more.</p>
        <p>Weekly cleanup. Only active, high-quality groups stay listed.</p>
        <p>Weekly Premium drops of the spiciest groups not available anywhere else.</p>
      </div>
    ),
  },
  {
    q: 'Do you add new groups after I pay, or is the list frozen?',
    a: 'The list is not frozen. New groups are added every day. Premium members get those daily drops first.',
  },
  {
    q: 'Do I need an Erogram account before I can pay?',
    a: 'Yes. Log in first. Premium is attached to your Erogram account, so checkout sends you to login if you are not signed in.',
  },
  {
    q: 'Can I pay with a debit/credit card, Apple Pay, or Google Pay?',
    a: (
      <>
        Yes. Checkout opens Telegram, where you pay with Telegram Stars using a debit or credit card, Apple Pay, or Google Pay. You can also visit this Telegram Stars payment guide that we create here:{' '}
        <Link href="/payments/telegram-stars-tutorial" className="font-bold text-[#2AABEE] underline">
          Telegram Stars payment guide
        </Link>
        . If still have questions, don&apos;t hesitate to drop us a message Telegram:{' '}
        <a href="https://t.me/erogramDOTpro" target="_blank" rel="noopener noreferrer" className="font-bold text-[#2AABEE] underline">
          @erogramDOTpro
        </a>
        {' · '}
        <a href="mailto:support@erogram.biz" className="font-bold text-[#2AABEE] underline">
          support@erogram.biz
        </a>
      </>
    ),
  },
  {
    q: 'Will this auto-renew, or is it one payment and then it stops?',
    a: 'One-time payment. No auto-renewal. Access lasts for the plan you bought (3 months or 1 year), then it stops.',
  },
  {
    q: 'Can I use the same Premium on phone and computer?',
    a: 'Yes. Erogram Premium follows your Erogram account. Log in on phone or computer and it is there.',
  },
  {
    q: 'How do I get help if the Stars payment fails or my card is declined?',
    a: (
      <>
        Try Apple Pay or Google Pay in the Telegram app, or pay in Telegram on the web.{' '}
        <Link href="/payments/telegram-stars-tutorial" className="font-bold text-[#2AABEE] underline">
          Telegram Payment Tutorial
        </Link>
        . If it still fails, message{' '}
        <a href="https://t.me/erogramDOTpro" target="_blank" rel="noopener noreferrer" className="font-bold text-[#2AABEE] underline">
          @erogramDOTpro
        </a>{' '}
        or email{' '}
        <a href="mailto:support@erogram.biz" className="font-bold text-[#2AABEE] underline">
          support@erogram.biz
        </a>
        .
      </>
    ),
  },
  {
    q: 'Can I renew after my premium is over?',
    a: 'Yes. When your plan ends, come back to this page and buy 3 months or 1 year again. Nothing auto-charges.',
  },
];

/* ─── Full-page premium groups mosaic (fixed behind content) ─── */
function PremiumMosaicBackground() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <img
        src={MOSAIC_WEBP}
        alt=""
        className="absolute inset-0 w-full h-full object-cover object-center"
        decoding="async"
        fetchPriority="low"
      />
      <div className="absolute inset-0 bg-black/78" />
    </div>
  );
}

/* ─── Vault Preview — identical to /groups VaultTeaserSection ─── */
function VaultPreview({ items, whiteCaption = false }: { items: VaultTeaserItem[]; whiteCaption?: boolean }) {
  const fmtNum = fmtMemberCount;
  if (!items.length) return null;

  return (
    <div>
      <div
        className="relative rounded-2xl overflow-hidden p-3 sm:p-4"
        style={{ background: 'linear-gradient(160deg, #0f0d09 0%, #110e08 60%, #0d0b07 100%)', border: `1px solid ${G.border}` }}
      >
        <div className="absolute top-0 right-0 w-56 h-56 blur-3xl opacity-[0.06] rounded-full pointer-events-none" style={{ background: `radial-gradient(ellipse, ${G.gold} 0%, transparent 60%)` }} />

        <div className="relative grid grid-cols-2 gap-1.5">
          {items.slice(0, 14).map(g => {
            const fmt = fmtNum(g.memberCount);
            const cats = g.vaultCategories && g.vaultCategories.length > 0 ? g.vaultCategories : [g.category];
            return (
              <div
                key={g._id}
                className="relative rounded-lg flex items-center gap-2 px-2 py-1.5 cursor-default select-none"
                style={{ background: `linear-gradient(135deg, ${G.innerBg} 0%, #150f08 100%)`, border: `1px solid ${G.border}` }}
              >
                <div className="absolute left-0 top-0 bottom-0 w-px" style={{ background: `linear-gradient(180deg, transparent, ${G.gold}44, transparent)` }} />
                <div className="shrink-0 w-8 h-8 rounded-md overflow-hidden" style={{ border: '1px solid #2e2010' }}>
                  <img src={g.image || '/assets/placeholder-no-image.png'} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = '/assets/placeholder-no-image.png'; }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-[10px] truncate leading-tight mb-0.5 select-none pointer-events-none" aria-hidden="true">
                    <span className="text-white">{g.name.slice(0, 4)}</span><span style={{ filter: 'blur(4px)', color: '#fff' }}>{g.name.slice(4) || '····'}</span>
                  </div>
                  <div className="flex items-center gap-1 flex-wrap">
                    {cats.map((c: string, i: number) => (
                      <span key={c} className="text-[7px] font-black uppercase tracking-[0.06em] px-1 py-0.5 rounded shrink-0" style={{ background: i === 0 ? '#1a1408' : '#12100a', border: `1px solid ${G.gold}22`, color: i === 0 ? G.gold : G.goldDim }}>{c}</span>
                    ))}
                    {g.country && <span className="text-[8px] font-semibold truncate" style={{ color: '#5a4830' }}>{g.country}</span>}
                    {fmt && <span className="text-[8px] font-semibold shrink-0" style={{ color: '#4a3820' }}>· {fmt}</span>}
                  </div>
                </div>
                <svg className="shrink-0" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={`${G.gold}55`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
            );
          })}
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none" style={{ background: 'linear-gradient(to bottom, transparent, #0f0d09)' }} />
      </div>
      <p className={`text-center text-[10px] mt-2 font-semibold ${whiteCaption ? 'text-white' : ''}`} style={whiteCaption ? undefined : { color: '#4a3820' }}>4800 exclusive groups · Updated daily</p>
    </div>
  );
}

interface PremiumClientProps { vaultTeaser?: VaultTeaserItem[]; pricing: PremiumPricing; }

export default function PremiumClient({ vaultTeaser = [], pricing }: PremiumClientProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [soldOut, setSoldOut] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [premiumPlan, setPremiumPlan] = useState<string | null>(null);
  const [premiumSince, setPremiumSince] = useState<string | null>(null);
  const [premiumExpiresAt, setPremiumExpiresAt] = useState<string | null>(null);
  const [awaitingPayment, setAwaitingPayment] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string | null>('yearly');
  const [paymentJustCompleted, setPaymentJustCompleted] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const tracked = useRef(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOSDevice, setIsIOSDevice] = useState(false);
  const [appInstalled, setAppInstalled] = useState(false);

  const planDisplay = useMemo(() => ({
    quarterly: {
      label: '3 Months',
      stars: formatStars(750),
      usd: formatUsd(pricing.quarterly.priceUsd),
      listUsd: formatUsd(launchListPrice(pricing.quarterly.priceUsd)),
      perMo: formatPerMonth(pricing.quarterly.priceUsd, 3),
      listPerMo: formatPerMonth(launchListPrice(pricing.quarterly.priceUsd), 3),
      perMoShort: `$${(pricing.quarterly.priceUsd / 3).toFixed(2)}/mo ONLY`,
    },
    yearly: {
      label: '1 Year',
      stars: formatStars(1500),
      usd: formatUsd(pricing.yearly.priceUsd),
      listUsd: formatUsd(launchListPrice(pricing.yearly.priceUsd)),
      perMo: formatPerMonth(pricing.yearly.priceUsd, 12),
      listPerMo: formatPerMonth(launchListPrice(pricing.yearly.priceUsd), 12),
      perMoShort: `$${(pricing.yearly.priceUsd / 12).toFixed(2)}/mo ONLY`,
    },
    lifetime: {
      label: 'Lifetime',
      stars: formatStars(pricing.lifetime.starsAmount),
      usd: formatUsd(pricing.lifetime.priceUsd),
      listUsd: formatUsd(launchListPrice(pricing.lifetime.priceUsd)),
      perMo: 'forever' as const,
      perMoShort: 'Use Forever!',
    },
    monthly: {
      label: '1 Month',
      stars: formatStars(pricing.monthly.starsAmount),
      usd: formatUsd(pricing.monthly.priceUsd),
      perMo: formatUsd(pricing.monthly.priceUsd) + '/mo',
      perMoShort: formatUsd(pricing.monthly.priceUsd) + '/mo ONLY',
    },
  }), [pricing]);

  const checkPremiumStatus = useCallback(async (fromPoll = false) => {
    const token = localStorage.getItem('token');
    if (!token) return false;
    try {
      const res = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
      const d = await res.json();
      if (d.premium) {
        setIsPremium(true); setPremiumPlan(d.premiumPlan || null); setPremiumSince(d.premiumSince || null); setPremiumExpiresAt(d.premiumExpiresAt || null);
        if (fromPoll) setPaymentJustCompleted(true);
        setAwaitingPayment(false);
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
        return true;
      }
    } catch { /* ignore */ }
    return false;
  }, []);

  useEffect(() => {
    if (!tracked.current) { tracked.current = true; trackPremiumEvent('page_view'); }
    const token = localStorage.getItem('token');
    if (token) {
      setIsLoggedIn(true); setAuthChecked(true); checkPremiumStatus();
      fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).then(d => { if (d.isAdmin) setIsAdmin(true); }).catch(() => {});
    } else {
      setAuthChecked(true);
    }
    fetch('/api/payments/slots').then(r => r.json()).then(d => { if (d.remaining === 0) setSoldOut(true); }).catch(() => {});
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [checkPremiumStatus]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsIOSDevice(/iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream);
    if (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone) setAppInstalled(true);
    const handler = (e: Event) => { e.preventDefault(); setDeferredPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler as EventListener);
    return () => window.removeEventListener('beforeinstallprompt', handler as EventListener);
  }, []);

  const handlePurchase = async (plan: 'monthly' | 'quarterly' | 'yearly' | 'lifetime') => {
    if (!isLoggedIn) { window.location.href = '/login?redirect=/premium-x'; return; }
    trackPremiumEvent('plan_click', { plan, method: 'stars' }); setLoading(plan); setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/payments/stars', { plan }, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data?.url) {
        window.location.assign(res.data.url);
        return;
      }
    } catch (err: any) { if (err?.response?.data?.soldOut) setSoldOut(true); setError(err?.response?.data?.message || 'Failed to create payment'); } finally { setLoading(null); }
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0e1621]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#2AABEE]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{ background: `linear-gradient(180deg, ${TG_DARK}aa 0%, transparent 32%, transparent 68%, ${TG_DARK}88 100%)` }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-20 left-1/2 z-[1] h-72 w-72 -translate-x-1/2 rounded-full blur-3xl opacity-35"
        style={{ background: `radial-gradient(circle, ${TG}33 0%, transparent 68%)` }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-24 -right-16 z-[1] h-64 w-64 rounded-full blur-3xl opacity-25"
        style={{ background: `radial-gradient(circle, ${TG_DARK} 0%, transparent 70%)` }}
      />
      <PremiumMosaicBackground />
      <div className="relative z-10 max-w-[520px] mx-auto pb-16">
        {!isPremium && <CheckoutPromoVideo />}

        <div className={`px-3 sm:px-4 ${isPremium ? 'pt-5' : ''}`}>
        {/* ━━━ UPGRADE CARD — after Inner Circle ━━━ */}
        <div id="pricing" className="overflow-hidden relative mb-6 rounded-3xl bg-white border border-[#2AABEE]/25 shadow-[0_0_40px_rgba(42,171,238,0.10)]">

          <div className="relative px-4 pt-4 pb-5 bg-white">

            {paymentJustCompleted && isPremium && (
              <div className="mb-4 rounded-xl overflow-hidden border border-emerald-500/25 bg-emerald-50">
                <div className="px-4 py-4 text-center space-y-2">
                  <div className="text-3xl">🎉</div>
                  <h3 className="text-lg font-black text-gray-900">Payment Successful!</h3>
                  <p className="text-emerald-600 text-sm font-semibold">Welcome to Erogram Premium</p>
                  <p className="text-gray-500 text-xs">Your Erogram Premium access is now active. Enjoy all Premium features.</p>
                </div>
              </div>
            )}

            {error && <div className="mb-3 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center">{error}</div>}

            {isPremium && (
              <div className="py-4 px-4 rounded-xl mb-3 space-y-2.5 border border-emerald-200 bg-emerald-50">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 bg-green-100">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="#16a34a"><path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z"/></svg>
                  </div>
                  <span className="font-bold text-sm text-green-700">You&apos;re Premium</span>
                  {premiumPlan && <span className="ml-auto px-2 py-0.5 rounded-full text-[9px] font-black uppercase capitalize bg-green-50 text-green-700 border border-green-200">{premiumPlan}</span>}
                </div>
                <div className="grid grid-cols-2 gap-2">
                    {premiumSince && (
                      <div className="rounded-lg px-2.5 py-1.5 bg-gray-50 border border-gray-100">
                        <p className="text-[8px] uppercase font-bold tracking-wider mb-0.5 text-gray-400">Member since</p>
                        <p className="text-[11px] font-semibold text-gray-700">{new Date(premiumSince).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      </div>
                    )}
                    <div className="rounded-lg px-2.5 py-1.5 bg-gray-50 border border-gray-100">
                      <p className="text-[8px] uppercase font-bold tracking-wider mb-0.5 text-gray-400">Valid until</p>
                      {premiumExpiresAt ? (
                        <>
                          <p className="text-[11px] font-semibold text-gray-700">{new Date(premiumExpiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                          {(() => { const dl = Math.ceil((new Date(premiumExpiresAt).getTime() - Date.now()) / 86_400_000); return <p className={`text-[8px] font-bold mt-0.5 ${dl <= 7 ? 'text-red-500' : 'text-gray-400'}`}>{dl > 0 ? `${dl} day${dl === 1 ? '' : 's'} left` : 'Expired'}</p>; })()}
                        </>
                      ) : <p className="text-[11px] font-bold text-purple-600">Lifetime ♾</p>}
                    </div>
                  </div>
                <Link href="/profile?tab=vault" className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-full text-sm font-bold text-white bg-[#2AABEE] shadow-[0_6px_18px_rgba(42,171,238,0.4)] transition-all hover:bg-[#229ED9] hover:scale-[1.02]">
                  🔒 Open Erogram Premium
                </Link>
                {!appInstalled && (deferredPrompt || isIOSDevice) && (
                  <button
                    onClick={() => {
                      if (deferredPrompt) {
                        deferredPrompt.prompt();
                        deferredPrompt.userChoice.then((r: any) => { if (r.outcome === 'accepted') setAppInstalled(true); });
                        setDeferredPrompt(null);
                      } else if (isIOSDevice) {
                        alert('Tap the Share button (box with arrow) at the bottom of Safari, then tap "Add to Home Screen".');
                      }
                    }}
                    className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-lg text-sm font-bold transition-all hover:scale-[1.02] bg-gray-100 border border-gray-200 text-gray-800"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                    📱 Download App
                  </button>
                )}
              </div>
            )}

            {soldOut && !isPremium && (
              <div className="text-center py-4 rounded-xl mb-3 bg-gray-50 border border-gray-200">
                <div className="text-xl mb-1">🔥</div>
                <div className="text-gray-900 font-bold text-sm mb-0.5">All 100 spots are taken!</div>
                <div className="text-[11px] text-gray-500">More slots opening soon.</div>
              </div>
            )}

            {/* Pricing */}
            {!isPremium && !soldOut && !paymentUrl && !awaitingPayment && (
              <div className="space-y-3">
                <div className={`${WHITE_INSET} p-3 space-y-2`}>
                <div className="space-y-2">
                  {/* 3 Months */}
                  <div
                    onClick={() => setSelectedPlan('quarterly')}
                    className={`rounded-xl px-3 py-3 flex items-center gap-3 cursor-pointer ${selectedPlan === 'quarterly' ? 'border-2 border-[#c9973a] bg-[#fdf8ee] shadow-[0_0_16px_rgba(201,151,58,0.22)]' : 'border border-gray-200 bg-white'}`}
                  >
                    <div aria-hidden="true" className={`shrink-0 w-[18px] h-[18px] rounded-full ${selectedPlan === 'quarterly' ? 'border-[5px] border-[#c9973a] bg-[#c9973a]' : 'border-2 border-gray-300'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <span className="font-black text-gray-900 text-[13px]">3 Months</span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-black text-[20px] leading-none text-gray-900">{planDisplay.quarterly.stars}</span>
                      </div>
                      <p className="text-[9px] mt-1 text-gray-600 font-semibold">One-time payment · No auto-renewal</p>
                    </div>
                    <button
                      onClick={() => handlePurchase('quarterly')}
                      disabled={!!loading}
                      className={checkoutBtnClass}
                      style={{ ...PREMIUM_GOLD, whiteSpace: 'nowrap' }}
                    >
                      {loading === 'quarterly' ? (
                        <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                      ) : (
                        <>
                          <span className="text-[11px] uppercase tracking-wide">Get 3 Months</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Yearly · BESTSELLER */}
                  <div
                    onClick={() => setSelectedPlan('yearly')}
                    className={`rounded-xl px-3 py-3 flex items-center gap-3 cursor-pointer ${selectedPlan === 'yearly' ? 'border-2 border-[#c9973a] bg-[#fdf8ee] shadow-[0_0_16px_rgba(201,151,58,0.22)]' : 'border border-gray-200 bg-white'}`}
                  >
                    <div aria-hidden="true" className={`shrink-0 w-[18px] h-[18px] rounded-full ${selectedPlan === 'yearly' ? 'border-[5px] border-[#c9973a] bg-[#c9973a]' : 'border-2 border-gray-300'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <span className="font-black text-gray-900 text-[13px]">1 Year</span>
                        <span className="text-[8px] font-black tracking-widest uppercase px-1.5 py-0.5 rounded-full" style={PREMIUM_GOLD}>BESTSELLER</span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-black text-[20px] leading-none text-gray-900">{planDisplay.yearly.stars}</span>
                      </div>
                      <p className="text-[9px] mt-1 text-gray-600 font-semibold">One-time payment · No auto-renewal</p>
                    </div>
                      <button
                        onClick={() => handlePurchase('yearly')}
                        disabled={!!loading}
                        className={checkoutBtnClass}
                        style={{ ...PREMIUM_GOLD, whiteSpace: 'nowrap' }}
                      >
                        {loading === 'yearly' ? (
                          <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                        ) : (
                          <>
                          <span className="text-[11px] uppercase tracking-wide">Get Yearly</span>
                          </>
                        )}
                      </button>
                  </div>
                </div>
                </div>
                <p className="text-[10px] text-gray-900 text-center font-semibold px-1">
                  <svg className="inline-block w-3.5 h-3.5 mr-1 -mt-0.5 align-middle text-[#2AABEE]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M20.665 3.717l-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701h-.002l.002.001-.314 4.692c.46 0 .663-.211.921-.46l2.211-2.15 4.599 3.397c.848.467 1.457.227 1.668-.785l3.019-14.228c.309-1.239-.473-1.8-1.282-1.434z"/>
                  </svg>
                  You'll be redirected to Telegram app, to pay using TG Stars using Debit/Credit Card. · One-time payment · No auto-renewal
                </p>
                <div className="flex justify-center pt-1">
                  <img src="/assets/stars-card-logos.png" alt="" className="h-9 w-auto max-w-full object-contain" />
                </div>
                <p className="text-[10px] text-gray-900 text-center font-semibold px-1">Secure · No adult line on your bank statement · No hidden fees</p>
              </div>
            )}

            {paymentUrl && !isPremium && (() => {
              const planKey = (selectedPlan || 'quarterly') as ValidPlan;
              const p = planDisplay[planKey] || planDisplay.quarterly;
              const starsAmount = pricing[planKey]?.starsAmount;
              return (
              <div className="space-y-3">
                <button
                  onClick={() => { setPaymentUrl(null); setSelectedPlan(null); setAwaitingPayment(false); if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } }}
                  className="w-full py-2.5 rounded-full text-[13px] font-bold text-white bg-[#2AABEE] shadow-[0_4px_16px_rgba(42,171,238,0.4)] transition-all hover:bg-[#229ED9] flex items-center justify-center gap-1.5"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                  Change Plan
                </button>

                <div className={`${WHITE_INSET} p-4 space-y-3`}>
                  <p className="text-[11px] font-bold text-gray-900 uppercase tracking-wider text-center">Order Summary</p>

                  <div className="rounded-lg px-4 py-3 bg-gray-50 border border-gray-200">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-black text-gray-900 text-[14px]">Erogram Premium {p.label}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="font-black text-[14px] leading-none text-gray-900">{starsAmount?.toLocaleString('en-US')}</span>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="#111827"><path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z"/></svg>
                          <span className="font-black text-[14px] leading-none text-gray-900 ml-1">{p.usd}</span>
                        </div>
                      <span className="font-bold text-gray-700 text-[13px]">{p.perMo === 'forever' ? 'Pay once, use forever' : p.perMo + ' only'}</span>
                    </div>
                  </div>

                  <a
                    href={paymentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-4 rounded-full font-black text-base tracking-wide transition-all hover:brightness-110 hover:scale-[1.02] active:scale-[0.97]"
                    style={PREMIUM_GOLD}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                    </svg>
                    {`PAY ${starsAmount?.toLocaleString('en-US')} ★ ${p.usd}`}
                  </a>

                  <p className="text-[10px] text-gray-700 text-center">
                    Complete payment in Telegram · This page updates automatically · After payment you will be redirected back to Erogram
                  </p>
                  <p className="text-[10px] text-gray-700 text-center">
                    <Link href="#faq" className="font-bold text-[#2AABEE] underline">Telegram Payment Tutorial</Link>
                  </p>
                </div>
              </div>
              );
            })()}

            {!isPremium && (
            <div className="mt-4 space-y-0.5">
              <p className="text-center text-[9px] text-gray-900">Complete payment in Telegram · This page updates automatically · After payment you will be redirected back to Erogram</p>
              <p className="text-center text-[9px] text-gray-900">
                <Link href="#faq" className="font-bold text-[#2AABEE] underline">Telegram Payment Tutorial</Link>
              </p>
            </div>
            )}
          </div>
        </div>

        {vaultTeaser.length > 0 && <VaultPreview items={vaultTeaser} />}
        {!isPremium && <PremiumCompareBlock ctaHref="#pricing" className="mb-6 mt-4" />}

        {!isPremium && (
          <div className="text-center mb-6">
            <a href="#pricing" className={ctaClass} style={PREMIUM_GOLD}>
              Join Now
            </a>
          </div>
        )}

        {/* ━━━ SECOND VAULT PREVIEW — below payment ━━━ */}
        {vaultTeaser.length > 0 && <VaultPreview items={vaultTeaser} whiteCaption />}

        {!isPremium && (
          <section className={`mb-6 mt-4 p-4 sm:p-5 ${MODAL_SHELL}`}>
            <div className={`${WHITE_INSET} p-4 space-y-4`}>
              <div>
                <h3 className="text-sm font-black text-gray-900 mb-2">
                  Only Active, High-Quality Groups
                </h3>
                <p className="text-xs mb-1.5 text-gray-600">We filter everything manually. Premium listings include only groups that are:</p>
                <div className="space-y-1 pl-6">
                  <p className="text-xs text-gray-700">• Real leaks & real communities</p>
                  <p className="text-xs text-gray-700">• No spam or fake channels</p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-black text-gray-900 mb-1.5">
                  Enhanced Experience
                </h3>
                <div className="space-y-1 pl-6">
                  <p className="text-xs text-gray-700">• Advanced filtering by niche</p>
                  <p className="text-xs text-gray-700">• Smart bookmarks & private folders</p>
                </div>
                <p className="text-xs font-semibold mt-1 pl-6 text-gray-900">Find exactly what you want in seconds.</p>
              </div>

              <div>
                <h3 className="text-sm font-black text-gray-900 mb-1.5">
                  Daily Premium Drops
                </h3>
                <p className="text-xs pl-6 text-gray-700">Every day we add new hidden Telegram groups discovered by our system.</p>
                <p className="text-xs pl-6 mt-0.5 text-gray-700">Premium members get exclusive daily drops <span className="font-bold text-gray-900">before the public sees them.</span></p>
                <p className="text-xs font-bold pl-6 mt-0.5 text-gray-600">Never miss the next big leak source.</p>
              </div>

              <div>
                <h3 className="text-sm font-black text-gray-900 mb-1.5">
                  INSTANT Unlock Premium Mega Lists
                </h3>
                <p className="text-xs pl-6 text-gray-700">Instant Access to our curated lists with <span className="font-bold text-gray-900">4800+ hand-picked Telegram groups.</span></p>
              </div>

              <div className="text-center pt-1">
                <a href="#pricing" className={ctaClass} style={PREMIUM_GOLD}>
                  Join Now
                </a>
              </div>
            </div>
          </section>
        )}

        {!isPremium && !soldOut && (
          <div className="mb-5 flex justify-center px-4">
            <a href="#pricing" className={`text-xs sm:text-sm ${ctaClass}`} style={PREMIUM_GOLD}>
              Unlock Erogram Premium
            </a>
          </div>
        )}

        <section id="faq" className={`mb-6 p-4 sm:p-5 ${MODAL_SHELL}`}>
          <h2 className="text-lg sm:text-xl font-black text-white text-center mb-3">FAQ</h2>
          <div className={`${WHITE_INSET} overflow-hidden divide-y divide-gray-200`}>
            {PREMIUM_FAQ.map((item) => (
              <details key={item.q} className="group">
                <summary className="flex items-center justify-between gap-3 cursor-pointer px-3.5 py-3 text-left list-none [&::-webkit-details-marker]:hidden">
                  <span className="text-[12px] sm:text-[13px] font-bold text-gray-900 leading-snug">{item.q}</span>
                  <svg className="w-4 h-4 shrink-0 text-gray-400 transition-transform group-open:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
                </summary>
                <div className="px-3.5 pb-3.5 text-[12px] leading-relaxed text-gray-600">{item.a}</div>
              </details>
            ))}
          </div>
        </section>

        <div className="mt-5 flex justify-center">
          <Link href="/" className="px-3.5 py-1.5 rounded-lg text-xs font-medium transition hover:opacity-80" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' }}>&larr; Back to site</Link>
        </div>

        </div>
      </div>
    </div>
  );
}
