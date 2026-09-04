'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import axios from 'axios';
import Link from 'next/link';
import type { PremiumPricing, ValidPlan } from '@/lib/premiumPricing';
import PremiumCompareBlock from '@/components/PremiumCompareBlock';

function trackPremiumEvent(event: string, extra?: Record<string, string | null>) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  fetch('/api/payments/track', { method: 'POST', headers, body: JSON.stringify({ event, source: 'premium_page', ...extra }) }).catch(() => {});
}


interface VaultTeaserItem { _id: string; name: string; image: string; category: string; country: string; memberCount: number; vaultCategories?: string[]; }

const G = { gold: '#00aff0', goldLight: '#00d4ff', goldDim: 'rgba(255,255,255,0.4)', goldText: 'rgba(255,255,255,0.55)', border: 'rgba(255,255,255,0.08)', borderLight: 'rgba(255,255,255,0.12)', innerBg: 'rgba(255,255,255,0.03)' };
const PREMIUM_BEIGE = '#ffffff';
const ORDER_GREEN = '#16a34a';
const CHECKOUT_BLUE = '#1e3a8a';
const checkoutBtnClass =
  'shrink-0 px-3.5 py-2.5 rounded-lg font-black text-white border-2 border-[#111] shadow-[3px_3px_0_0_#111] transition-all duration-150 hover:-translate-x-px hover:-translate-y-px hover:shadow-[4px_4px_0_0_#111] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0_0_#111] disabled:opacity-50 flex flex-col items-center';

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

/* ─── Full-page premium groups mosaic (fixed behind content) ─── */
function PremiumMosaicBackground({ items }: { items: VaultTeaserItem[] }) {
  if (!items.length) return null;

  const tiles: VaultTeaserItem[] = [];
  while (tiles.length < 30) tiles.push(...items);
  const display = tiles.slice(0, 30);

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-px min-h-screen h-full w-full">
        {display.map((g, i) => {
          const niche = (g.vaultCategories && g.vaultCategories.length > 0 ? g.vaultCategories[0] : g.category) || '';
          const subs = fmtMemberCount(g.memberCount);
          return (
            <div key={`${g._id}-${i}`} className="relative aspect-[3/4] sm:aspect-square overflow-hidden bg-black">
              <img
                src={g.image || '/assets/placeholder-no-image.png'}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
                decoding="async"
                onError={(e) => { (e.target as HTMLImageElement).src = '/assets/placeholder-no-image.png'; }}
              />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 35%, rgba(0,0,0,0.92) 100%)' }} />
              <div className="absolute bottom-0 left-0 right-0 p-1.5 sm:p-2">
                {niche ? (
                  <span className="block text-[7px] sm:text-[8px] font-black uppercase tracking-wide text-white truncate">{niche}</span>
                ) : null}
                {subs ? (
                  <span className="block text-[8px] sm:text-[9px] font-bold text-white/75 tabular-nums">{subs} subs</span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
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
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
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

  const ctaBg = CHECKOUT_BLUE;

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
    if (!isLoggedIn) { window.location.href = '/login?redirect=/premium'; return; }
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(180deg, #070605 0%, #0a0906 100%)' }}>
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2" style={{ borderColor: '#c9973a' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      <PremiumMosaicBackground items={vaultTeaser} />
      <div className="relative z-10 max-w-[520px] mx-auto px-3 sm:px-4 pt-5 pb-16">
        {/* ━━━ UNLOCK VAULT + Features ━━━ */}
        <div className="mb-6 rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm" style={{ backgroundColor: PREMIUM_BEIGE, border: '1px solid rgba(0,0,0,0.06)' }}>
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight leading-tight mb-2">
              UPGRADE TO PREMIUM
            </h1>
            <p className="text-xs sm:text-sm max-w-md mx-auto text-gray-600">
              Exclusive groups, rare niches, and leak communities you won&apos;t find anywhere else.
            </p>
            {!isPremium && (
              <a href="#pricing" className="inline-flex items-center justify-center mt-3 px-3.5 py-2.5 rounded-lg text-sm font-black text-white uppercase tracking-wide transition-all active:scale-95 hover:opacity-90" style={{ background: ORDER_GREEN }}>
                Access Now
              </a>
            )}
          </div>

          {vaultTeaser.length > 0 && <VaultPreview items={vaultTeaser} />}

          {/* Quality */}
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

          {/* Enhanced Experience */}
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

          {/* Daily Drops */}
          <div>
            <h3 className="text-sm font-black text-gray-900 mb-1.5">
              Daily Premium Drops
            </h3>
            <p className="text-xs pl-6 text-gray-700">Every day we add new hidden Telegram groups discovered by our system.</p>
            <p className="text-xs pl-6 mt-0.5 text-gray-700">Premium members get exclusive daily drops <span className="font-bold text-gray-900">before the public sees them.</span></p>
            <p className="text-xs font-bold pl-6 mt-0.5 text-gray-600">Never miss the next big leak source.</p>
          </div>

          {/* Mega Lists */}
          <div>
            <h3 className="text-sm font-black text-gray-900 mb-1.5">
              INSTANT Unlock Premium Mega Lists
            </h3>
            <p className="text-xs pl-6 text-gray-700">Instant Access to our curated lists with <span className="font-bold text-gray-900">4800+ hand-picked Telegram groups.</span></p>
          </div>

          {/* Join Now CTA */}
          {!isPremium && (
            <div className="text-center pt-1">
              <a
                href="#pricing"
                className="inline-flex items-center justify-center px-3.5 py-2.5 rounded-lg text-sm font-black text-white uppercase tracking-wide transition-all active:scale-95 hover:opacity-90"
                style={{ background: ORDER_GREEN }}
              >
                Join Now
              </a>
            </div>
          )}

        </div>

        {/* ━━━ UPGRADE CARD — after Inner Circle ━━━ */}
        <div
          id="pricing"
          className="rounded-xl overflow-hidden relative mb-6"
          style={{ backgroundColor: PREMIUM_BEIGE, border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}
        >

          <div className="relative px-4 pt-5 pb-5">

            {paymentJustCompleted && isPremium && (
              <div className="mb-4 rounded-xl overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(16,185,129,0.04))', border: '1px solid rgba(34,197,94,0.25)' }}>
                <div className="px-4 py-4 text-center space-y-2">
                  <div className="text-3xl">🎉</div>
                  <h3 className="text-lg font-black text-gray-900">Payment Successful!</h3>
                  <p className="text-emerald-600 text-sm font-semibold">Welcome to Erogram VIP</p>
                  <p className="text-gray-500 text-xs">Your premium access is now active. Enjoy the Vault and all VIP features.</p>
                </div>
              </div>
            )}

            {error && <div className="mb-3 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center">{error}</div>}

            {isPremium && (
              <div className="py-4 px-4 rounded-xl mb-3 space-y-2.5" style={{ background: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.15)' }}>
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
                <Link href="/profile?tab=vault" className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-lg text-sm font-bold text-white transition-all hover:scale-[1.02]" style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)', boxShadow: '0 4px 12px rgba(22,163,74,0.25)' }}>
                  🔒 Open Vault
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
                    className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-lg text-sm font-bold transition-all hover:scale-[1.02]"
                    style={{ background: '#f3f4f6', border: '1px solid #e5e7eb', color: '#111827' }}
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
                <div className="text-[11px] text-gray-400">More slots opening soon.</div>
              </div>
            )}

            {/* Pricing */}
            {!isPremium && !soldOut && !paymentUrl && !awaitingPayment && (
              <div className="rounded-xl p-3 space-y-2.5">

                <p className="text-[10px] text-gray-900 text-center font-semibold">You'll be redirected to Telegram app, to pay using TG Stars using Debit/Credit Card.</p>
                <p className="text-[10px] text-gray-900 text-center font-semibold">One-time payment · No auto-renewal</p>

                <div className="space-y-2">
                  {/* 3 Months */}
                  <div className="rounded-lg px-3 py-3 flex items-center gap-3" style={{ border: '1px solid #e5e7eb' }}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <span className="font-black text-gray-900 text-[13px]">3 Months</span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-black text-[20px] leading-none text-gray-900">{planDisplay.quarterly.stars}</span>
                      </div>
                      <p className="text-[9px] mt-1 text-gray-900 font-semibold">One-time payment · No auto-renewal</p>
                    </div>
                    <button
                      onClick={() => handlePurchase('quarterly')}
                      disabled={!!loading}
                      className={checkoutBtnClass}
                      style={{ background: CHECKOUT_BLUE, whiteSpace: 'nowrap' }}
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
                  <div className="rounded-lg overflow-hidden" style={{ border: `2px solid ${ctaBg}` }}>
                    <div className="flex items-center justify-between px-3 py-1.5" style={{ background: ctaBg }}>
                      <span className="font-black text-white text-[13px]">1 Year</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[8px] font-black tracking-widest text-white uppercase opacity-70">BESTSELLER</span>
                      </div>
                    </div>
                    <div className="px-3 py-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-black text-[20px] leading-none text-gray-900">{planDisplay.yearly.stars}</span>
                        </div>
                        <p className="text-[9px] mt-1 text-gray-900 font-semibold">One-time payment · No auto-renewal</p>
                      </div>
                      <button
                        onClick={() => handlePurchase('yearly')}
                        disabled={!!loading}
                        className={checkoutBtnClass}
                        style={{ background: CHECKOUT_BLUE, whiteSpace: 'nowrap' }}
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
                <div className="flex justify-center pt-1">
                  <img src="/assets/stars-card-logos.png" alt="" className="h-9 w-auto max-w-full object-contain" />
                </div>
              </div>
            )}

            {paymentUrl && !isPremium && (() => {
              const planKey = (selectedPlan || 'quarterly') as ValidPlan;
              const p = planDisplay[planKey] || planDisplay.quarterly;
              const starsAmount = pricing[planKey]?.starsAmount;
              const payBtnBg = ORDER_GREEN;
              const payBtnShadow = '0 6px 18px rgba(22,163,74,0.4)';
              return (
              <div className="space-y-3">
                <button
                  onClick={() => { setPaymentUrl(null); setSelectedPlan(null); setAwaitingPayment(false); if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } }}
                  className="w-full py-2.5 rounded-lg text-[13px] font-bold text-white transition-all hover:opacity-90 flex items-center justify-center gap-1.5"
                  style={{ background: payBtnBg }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                  Change Plan
                </button>

                <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: 'rgba(255,255,255,0.45)', border: '1px solid rgba(0,0,0,0.06)' }}>
                  <p className="text-[11px] font-bold text-gray-900 uppercase tracking-wider text-center">Order Summary</p>

                  <div className="rounded-lg px-4 py-3" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-black text-gray-900 text-[14px]">Erogram VIP — {p.label}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="font-black text-[14px] leading-none text-gray-900">{starsAmount?.toLocaleString('en-US')}</span>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="#111827"><path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z"/></svg>
                          <span className="font-black text-[14px] leading-none text-gray-900 ml-1">{p.usd}</span>
                        </div>
                      <span className="font-bold text-gray-900 text-[13px]">{p.perMo === 'forever' ? 'Pay once, use forever' : p.perMo + ' only'}</span>
                    </div>
                  </div>

                  <a
                    href={paymentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-4 rounded-xl text-white font-black text-base tracking-wide transition-all hover:scale-[1.02] active:scale-[0.97]"
                    style={{ background: payBtnBg, boxShadow: payBtnShadow }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                    </svg>
                    {`PAY ${starsAmount?.toLocaleString('en-US')} ★ ${p.usd}`}
                  </a>

                  <p className="text-[10px] text-gray-900 text-center">
                    Complete payment in Telegram · This page updates automatically · After payment you will be redirected back to Erogram
                  </p>
                  <p className="text-[10px] text-gray-900 text-center">
                    Need help? Telegram: <a href="https://t.me/erogramDOTpro" target="_blank" rel="noopener noreferrer" className="font-bold underline">@erogramDOTpro</a> · <a href="mailto:support@erogram.biz" className="font-bold underline">support@erogram.biz</a>
                  </p>
                </div>
              </div>
              );
            })()}

            {!isPremium && (
            <div className="mt-4 space-y-0.5">
              <p className="text-center text-[9px] text-gray-900">Complete payment in Telegram · This page updates automatically · After payment you will be redirected back to Erogram</p>
              <p className="text-center text-[9px] text-gray-900">
                Need help? Telegram: <a href="https://t.me/erogramDOTpro" target="_blank" rel="noopener noreferrer" className="font-bold underline">@erogramDOTpro</a> · <a href="mailto:support@erogram.biz" className="font-bold underline">support@erogram.biz</a>
              </p>
            </div>
            )}
          </div>
        </div>

        {!isPremium && <PremiumCompareBlock ctaHref="#pricing" className="mb-6" />}

        {/* ━━━ SECOND VAULT PREVIEW — below payment ━━━ */}
        {vaultTeaser.length > 0 && <VaultPreview items={vaultTeaser} whiteCaption />}

        {!isPremium && !soldOut && (
          <div className="mb-5 flex justify-center px-4">
            <a
              href="#pricing"
              className="inline-flex items-center justify-center px-3.5 py-2.5 rounded-lg text-xs sm:text-sm font-black text-white uppercase tracking-wide text-center transition-all active:scale-95 hover:opacity-90"
              style={{ background: ORDER_GREEN }}
            >
              Unlock Erogram Premium
            </a>
          </div>
        )}

        <div className="mt-5 flex justify-center">
          <Link href="/" className="px-3.5 py-1.5 rounded-lg text-xs font-medium transition hover:opacity-80" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' }}>&larr; Back to site</Link>
        </div>

      </div>
    </div>
  );
}
