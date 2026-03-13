'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import Link from 'next/link';

function trackPremiumEvent(event: string, extra?: Record<string, string | null>) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  fetch('/api/payments/track', { method: 'POST', headers, body: JSON.stringify({ event, source: 'premium_page', ...extra }) }).catch(() => {});
}


const TIMER_KEY = 'erogram_premium_timer_expiry';
function getOrCreateExpiry(): number {
  if (typeof window === 'undefined') return Date.now() + 5400_000;
  const stored = localStorage.getItem(TIMER_KEY);
  const now = Date.now();
  if (stored) { const expiry = parseInt(stored, 10); if (expiry > now) return expiry; }
  const ms = (480 + Math.floor(Math.random() * 48)) * 60_000;
  const newExpiry = now + ms;
  localStorage.setItem(TIMER_KEY, String(newExpiry));
  return newExpiry;
}

function formatTime(ms: number) {
  if (ms <= 0) return '00:00:00';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

interface VaultTeaserItem { _id: string; name: string; image: string; category: string; country: string; memberCount: number; vaultCategories?: string[]; }

const G = { gold: '#c9973a', goldLight: '#e8ba5a', goldDim: '#7a6040', goldText: '#9a7a50', border: '#2a1f0e', borderLight: '#3d2a10', innerBg: '#120f09' };

/* ─── Vault Preview — identical to /groups VaultTeaserSection ─── */
function VaultPreview({ items }: { items: VaultTeaserItem[] }) {
  const fmtNum = (n: number) => n >= 1_000_000 ? (n/1_000_000).toFixed(1)+'M' : n >= 1_000 ? (n/1_000).toFixed(n>=10_000?0:1)+'K' : n > 0 ? String(n) : null;
  if (!items.length) return null;

  return (
    <div className="mb-6">
      <div className="text-center mb-3">
        <span
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.25em] mb-2"
          style={{ background: 'rgba(201,151,58,0.08)', border: '1px solid rgba(201,151,58,0.2)', color: '#b8964e' }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          Private Vault
        </span>
        <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
          Premium <span style={{ background: `linear-gradient(135deg, ${G.gold}, ${G.goldLight})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Secret Vault</span>
        </h2>
      </div>

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
      <p className="text-center text-[10px] mt-2 font-semibold" style={{ color: '#4a3820' }}>100+ exclusive groups · Updated daily</p>
    </div>
  );
}

interface PremiumClientProps { vaultTeaser?: VaultTeaserItem[]; }

export default function PremiumClient({ vaultTeaser = [] }: PremiumClientProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [soldOut, setSoldOut] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [premiumPlan, setPremiumPlan] = useState<string | null>(null);
  const [premiumSince, setPremiumSince] = useState<string | null>(null);
  const [premiumExpiresAt, setPremiumExpiresAt] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [awaitingPayment, setAwaitingPayment] = useState(false);
  const [payMethod, setPayMethod] = useState<'stars' | 'crypto'>('stars');
  const [authProvider, setAuthProvider] = useState<'telegram' | 'google' | 'password' | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPreview, setAdminPreview] = useState<'none' | 'telegram' | 'google'>('none');
  const tracked = useRef(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOSDevice, setIsIOSDevice] = useState(false);
  const [appInstalled, setAppInstalled] = useState(false);
  const [topIdx, setTopIdx] = useState(0);
  const [btmIdx, setBtmIdx] = useState(0);
  const [pricingConfig, setPricingConfig] = useState<{
    monthly: { priceUsd: number; starsAmount: number; days: number; label: string };
    quarterly: { priceUsd: number; starsAmount: number; days: number; label: string };
    yearly: { priceUsd: number; starsAmount: number; days: number; label: string };
    offerBadge: string;
    offerText: string;
    starsRate: number;
  } | null>(null);

  useEffect(() => {
    fetch('/api/admin/premium-config').then(r => r.json()).then(d => setPricingConfig(d)).catch(() => {});
  }, []);

  const mp = pricingConfig?.monthly ?? { priceUsd: 12.97, starsAmount: 865, days: 30 };
  const qp = pricingConfig?.quarterly ?? { priceUsd: 19.97, starsAmount: 1332, days: 90 };
  const yp = pricingConfig?.yearly ?? { priceUsd: 29, starsAmount: 1934, days: 365 };
  const offerBadge = pricingConfig?.offerBadge ?? '80% OFF';
  const offerText = pricingConfig?.offerText ?? 'Launch price ends soon';

  const monthlyCostIfMonthly = mp.priceUsd;
  const qSaveVsMonthly = ((mp.priceUsd * 3) - qp.priceUsd);
  const ySaveVsMonthly = ((mp.priceUsd * 12) - yp.priceUsd);
  const qSavePct = Math.round((qSaveVsMonthly / (mp.priceUsd * 3)) * 100);
  const ySavePct = Math.round((ySaveVsMonthly / (mp.priceUsd * 12)) * 100);

  const checkPremiumStatus = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return false;
    try {
      const res = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
      const d = await res.json();
      if (d.premium) {
        setIsPremium(true); setPremiumPlan(d.premiumPlan || null); setPremiumSince(d.premiumSince || null); setPremiumExpiresAt(d.premiumExpiresAt || null); setAwaitingPayment(false);
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
        return true;
      }
    } catch { /* ignore */ }
    return false;
  }, []);

  useEffect(() => {
    if (!tracked.current) { tracked.current = true; trackPremiumEvent('page_view'); }
    const isCryptoReturn = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('payment') === 'crypto_success';
    if (isCryptoReturn) setAwaitingPayment(true);
    const token = localStorage.getItem('token');
    if (token) {
      setIsLoggedIn(true); setAuthChecked(true); checkPremiumStatus();
      fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).then(d => { if (d.authProvider) setAuthProvider(d.authProvider); if (d.isAdmin) setIsAdmin(true); }).catch(() => {});
      // Start polling if user returned from crypto checkout
      if (isCryptoReturn) {
        if (pollRef.current) clearInterval(pollRef.current);
        let attempts = 0;
        pollRef.current = setInterval(async () => {
          attempts++;
          const confirmed = await checkPremiumStatus();
          if (confirmed || attempts >= 120) {
            clearInterval(pollRef.current!); pollRef.current = null;
            if (!confirmed) setAwaitingPayment(false);
          }
        }, 5000);
      }
    } else {
      setAuthChecked(true);
    }
    fetch('/api/payments/slots').then(r => r.json()).then(d => { if (d.remaining === 0) setSoldOut(true); }).catch(() => {});
    const expiry = getOrCreateExpiry(); setTimeLeft(Math.max(0, expiry - Date.now()));
    const tick = setInterval(() => { const r = Math.max(0, getOrCreateExpiry() - Date.now()); setTimeLeft(r); if (r === 0) localStorage.removeItem(TIMER_KEY); }, 1000);
    return () => { clearInterval(tick); if (pollRef.current) clearInterval(pollRef.current); };
  }, [checkPremiumStatus]);

  useEffect(() => {
    if (vaultTeaser.length <= 4) return;
    const interval = setInterval(() => {
      setTopIdx(prev => (prev + 4) % vaultTeaser.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [vaultTeaser.length]);

  useEffect(() => {
    if (vaultTeaser.length <= 8) return;
    const interval = setInterval(() => {
      setBtmIdx(prev => (prev + 8) % vaultTeaser.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [vaultTeaser.length]);

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
    trackPremiumEvent('plan_click', { plan }); setLoading(plan); setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/payments/stars', { plan }, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data?.url) { window.open(res.data.url, '_blank'); setAwaitingPayment(true); if (pollRef.current) clearInterval(pollRef.current); let a = 0; pollRef.current = setInterval(async () => { a++; await checkPremiumStatus(); if (a >= 120) { clearInterval(pollRef.current!); pollRef.current = null; setAwaitingPayment(false); } }, 5000); }
    } catch (err: any) { if (err?.response?.data?.soldOut) setSoldOut(true); setError(err?.response?.data?.message || 'Failed to create payment'); } finally { setLoading(null); }
  };

  const handleCryptoPurchase = async (plan: 'monthly' | 'quarterly' | 'yearly' | 'lifetime') => {
    if (!isLoggedIn) { window.location.href = '/login?redirect=/premium'; return; }
    trackPremiumEvent('crypto_plan_click', { plan }); setLoading(`crypto_${plan}`); setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/payments/nowpayments', { plan }, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data?.url) window.location.href = res.data.url;
    } catch (err: any) { if (err?.response?.data?.soldOut) setSoldOut(true); setError(err?.response?.data?.message || 'Failed to create crypto payment.'); } finally { setLoading(null); }
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(180deg, #070605 0%, #0a0906 100%)' }}>
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2" style={{ borderColor: '#c9973a' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #070605 0%, #0a0906 100%)' }}>
      <div className="max-w-[520px] mx-auto px-3 sm:px-4 pt-5 pb-16">

        {/* ━━━ TIMER — at top of page (logged-in only) ━━━ */}
        {!isPremium && !soldOut && timeLeft > 0 && (
          <div className="mb-5 rounded-xl bg-white p-3 shadow-lg shadow-white/5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 rounded-md text-[11px] font-black uppercase tracking-wide bg-red-600 text-white">{offerBadge}</span>
                <span className="text-[11px] font-bold text-gray-800">{offerText}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                </svg>
                <span className="text-red-600 text-lg font-black tabular-nums tracking-tight font-mono">{formatTime(timeLeft)}</span>
              </div>
            </div>
          </div>
        )}

        {/* ━━━ VAULT HERO BLOCK ━━━ */}
        {!isPremium && (
          <div className="mb-6">
            <div
              className="relative rounded-2xl overflow-hidden px-5 py-3"
              style={{ background: 'linear-gradient(135deg, #111009 0%, #140f07 60%, #0e0d0b 100%)', border: '1px solid #2e2010' }}
            >
              <div className="absolute top-0 right-0 w-56 h-56 blur-3xl opacity-[0.12] rounded-full" style={{ background: 'radial-gradient(ellipse, #c9973a 0%, transparent 60%)' }} />
              <div className="absolute bottom-0 left-0 w-40 h-40 blur-3xl opacity-[0.07] rounded-full" style={{ background: 'radial-gradient(ellipse, #c9973a 0%, transparent 60%)' }} />

              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="flex gap-0.5">
                        {[1,2,3,4,5].map(i => <svg key={i} width="12" height="12" viewBox="0 0 24 24" fill="#b8964e"><path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z"/></svg>)}
                      </div>
                      <span className="text-[8px] font-black uppercase tracking-[0.3em]" style={{ color: '#b8964e' }}>Erogram Premium Vault</span>
                    </div>
                    <h2 className="text-sm font-black text-white tracking-tight">Unlock Instantly Thousands of Curated NSFW Groups</h2>
                  </div>
                </div>

                {vaultTeaser.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {Array.from({ length: Math.min(4, vaultTeaser.length) }, (_, i) => vaultTeaser[(topIdx + i) % vaultTeaser.length]).map(g => {
                      const fmtNum = (n: number) => n >= 1_000_000 ? (n/1_000_000).toFixed(1)+'M' : n >= 1_000 ? (n/1_000).toFixed(n>=10_000?0:1)+'K' : '';
                      const cats = g.vaultCategories && g.vaultCategories.length > 0 ? g.vaultCategories : [g.category];
                      const topCat = cats[2] || cats[1] || cats[0] || '';
                      return (
                        <div
                          key={g._id}
                          className="rounded-xl overflow-hidden relative"
                          style={{ aspectRatio: '1', border: '2px solid #c9973a33', boxShadow: '0 4px 20px #c9973a0a' }}
                        >
                          <img src={g.image || '/assets/placeholder-no-image.png'} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).src = '/assets/placeholder-no-image.png'; }} />
                          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 30%, #0a0908dd 75%, #0a0908 100%)' }} />
                          <div className="absolute bottom-0 left-0 right-0 p-1.5">
                            <p className="text-[10px] font-bold text-white leading-tight truncate">
                              {(g.name || '').slice(0, 4)}<span style={{ filter: 'blur(4px)', opacity: 0.4, color: '#fff', userSelect: 'none' as const }}>{(g.name || '██████').slice(4) || '██████'}</span>
                            </p>
                            {g.memberCount ? (
                              <p className="text-[11px] font-black leading-none" style={{ color: '#c9973a' }}>
                                {fmtNum(g.memberCount)} <span className="text-[9px] font-bold" style={{ color: '#7a6040' }}>subs</span>
                                {topCat && <span className="text-[9px] font-bold" style={{ color: '#7a604088' }}> · {topCat}</span>}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Niche tags (non-clickable) */}
                <div className="flex gap-1.5 flex-wrap">
                  {['Amateur', 'Onlyfans', 'NSFW-Telegram', 'Russian', 'Hentai', 'Feet', 'BDSM', 'MILF', 'Latina', 'Fetish', 'Asian', 'Cosplay', 'Lesbian', 'Onlyfans Leaks'].map(cat => (
                    <span
                      key={cat}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide"
                      style={{ background: '#0d0c0a', border: '1px solid #2e2010', color: '#7a6040' }}
                    >{cat}</span>
                  ))}
                  <span
                    className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide"
                    style={{ background: 'linear-gradient(135deg, #1f1709, #241b0c)', border: '1px solid #c9973a33', color: '#c9973a' }}
                  >& MUCH MORE</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ━━━ UNLOCK VAULT + Features ━━━ */}
        <div className="mb-6">
          <div className="text-center mb-4">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight mb-2">
              ⚜️ READY TO UPGRADE YOUR TELEGRAM EXPERIENCE?
            </h1>
          </div>

          <div className="rounded-xl p-4" style={{ background: '#0f0d0a', border: `1px solid ${G.border}` }}>
            <p className="text-sm font-black text-white mb-4">
              EROGRAM PRO isn&apos;t even 5% of what&apos;s inside <span style={{ color: G.gold }}>EROGRAM PREMIUM.</span>
            </p>
            <div className="space-y-2.5">
              {[
                { icon: '🔓', text: 'Unlock thousands of curated groups instantly' },
                { icon: '✨', text: 'Experience Erogram ad-free' },
                { icon: '⚡', text: 'Find what you\u2019re looking for 10\u00D7 faster' },
                { icon: '📋', text: 'Get curated lists in your niches' },
                { icon: '⭐', text: 'Bookmark and organize your favorite groups' },
                { icon: '🔥', text: 'Receive daily PREMIUM drops' },
                { icon: '🎯', text: 'Enhance your experience with advanced filtering and search' },
                { icon: '🧪', text: 'Unlock beta features (mobile app, and more)' },
              ].map(item => (
                <div key={item.icon + item.text} className="flex items-start gap-2.5">
                  <span className="text-sm shrink-0 mt-px">{item.icon}</span>
                  <p className="text-[13px] font-semibold" style={{ color: G.goldText }}>{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ━━━ ADMIN PREVIEW PANEL ━━━ */}
        {isAdmin && (
          <div className="mb-4 p-3 rounded-lg border border-dashed border-white/20 bg-white/[0.02]">
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2">Admin Preview — see checkout as different users</p>
            <div className="flex gap-2 flex-wrap">
              {(['none', 'telegram', 'google'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setAdminPreview(mode)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${adminPreview === mode ? 'bg-amber-500 text-black' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
                >
                  {mode === 'none' ? 'Normal (my account)' : mode === 'telegram' ? 'Preview as Telegram user' : 'Preview as Google user'}
                </button>
              ))}
            </div>
            {adminPreview !== 'none' && (
              <p className="text-[10px] text-amber-400/60 mt-1.5">Showing checkout as a <strong>{adminPreview}</strong> user. Payment will still work for testing.</p>
            )}
          </div>
        )}

        {/* ━━━ TIMER — above checkout ━━━ */}
        {!isPremium && !soldOut && timeLeft > 0 && (
          <div className="mb-4 rounded-xl bg-white p-3 shadow-lg shadow-white/5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 rounded-md text-[11px] font-black uppercase tracking-wide bg-red-600 text-white">{offerBadge}</span>
                <span className="text-[11px] font-bold text-gray-800">{offerText}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                </svg>
                <span className="text-red-600 text-lg font-black tabular-nums tracking-tight font-mono">{formatTime(timeLeft)}</span>
              </div>
            </div>
          </div>
        )}

        {/* ━━━ UPGRADE CARD — after Inner Circle ━━━ */}
        {(() => {
          const effectiveProvider = adminPreview !== 'none' ? adminPreview : authProvider;
          const effectivePayMethod = payMethod;
          return (
        <div
          className="rounded-xl overflow-hidden relative mb-6"
          style={{ background: 'linear-gradient(160deg, #0f0d09 0%, #110e08 60%, #0d0b07 100%)', border: `1px solid ${G.border}`, boxShadow: `0 0 50px ${G.gold}08` }}
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-52 h-16 blur-3xl opacity-15 pointer-events-none" style={{ background: `linear-gradient(135deg, ${G.gold}, #ef4444)` }} />

          <div className="relative px-4 pt-5 pb-5">

            {awaitingPayment && !isPremium && (
              <div className="mb-3 px-3 py-2 rounded-lg flex items-center gap-2" style={{ background: `${G.gold}06`, border: `1px solid ${G.gold}25` }}>
                <svg className="animate-spin shrink-0" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={G.gold} strokeWidth="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                <span className="text-amber-400 text-[11px] font-medium">
                  {payMethod === 'crypto' || effectiveProvider !== 'telegram' ? 'Complete your crypto payment — this page will update automatically once confirmed.' : 'Complete payment in Telegram — this page will update automatically once confirmed.'}
                </span>
              </div>
            )}

            {error && <div className="mb-3 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center">{error}</div>}

            {(isPremium || isAdmin) && adminPreview === 'none' && (
              <div className="py-4 px-4 rounded-xl mb-3 space-y-2.5" style={{ background: `${G.gold}05`, border: `1px solid ${G.gold}20` }}>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: `${G.gold}20` }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill={G.gold}><path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z"/></svg>
                  </div>
                  <span className="font-bold text-sm" style={{ color: G.gold }}>{isAdmin && !isPremium ? 'Admin Access' : 'You\u2019re Premium'}</span>
                  {premiumPlan && <span className="ml-auto px-2 py-0.5 rounded-full text-[9px] font-black uppercase capitalize" style={{ background: `${G.gold}15`, color: G.goldLight, border: `1px solid ${G.gold}20` }}>{premiumPlan}</span>}
                  {isAdmin && !isPremium && <span className="ml-auto px-2 py-0.5 rounded-full text-[9px] font-black uppercase" style={{ background: 'rgba(168,85,247,0.15)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.2)' }}>Admin</span>}
                </div>
                {isPremium && (
                  <div className="grid grid-cols-2 gap-2">
                    {premiumSince && (
                      <div className="rounded-lg px-2.5 py-1.5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                        <p className="text-[8px] uppercase font-bold tracking-wider mb-0.5" style={{ color: G.goldDim }}>Member since</p>
                        <p className="text-[11px] font-semibold text-white/80">{new Date(premiumSince).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      </div>
                    )}
                    <div className="rounded-lg px-2.5 py-1.5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                      <p className="text-[8px] uppercase font-bold tracking-wider mb-0.5" style={{ color: G.goldDim }}>Valid until</p>
                      {premiumExpiresAt ? (
                        <>
                          <p className="text-[11px] font-semibold text-white/80">{new Date(premiumExpiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                          {(() => { const dl = Math.ceil((new Date(premiumExpiresAt).getTime() - Date.now()) / 86_400_000); return <p className={`text-[8px] font-bold mt-0.5 ${dl <= 7 ? 'text-red-400' : ''}`} style={dl > 7 ? { color: G.goldDim } : {}}>{dl > 0 ? `${dl} day${dl === 1 ? '' : 's'} left` : 'Expired'}</p>; })()}
                        </>
                      ) : <p className="text-[11px] font-bold text-purple-400">Lifetime ♾</p>}
                    </div>
                  </div>
                )}
                <Link href="/profile?tab=vault" className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-lg text-sm font-bold transition-all hover:scale-[1.02]" style={{ background: `linear-gradient(135deg, ${G.gold}, #a67c2e)`, color: '#0d0c0a', boxShadow: `0 0 20px ${G.gold}20` }}>
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
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                    📱 Download App
                  </button>
                )}
              </div>
            )}

            {soldOut && !isPremium && adminPreview === 'none' && (
              <div className="text-center py-4 rounded-xl mb-3" style={{ border: `1px solid ${G.border}`, background: 'rgba(255,255,255,0.01)' }}>
                <div className="text-xl mb-1">🔥</div>
                <div className="text-white font-bold text-sm mb-0.5">All 100 spots are taken!</div>
                <div className="text-[11px]" style={{ color: G.goldDim }}>More slots opening soon.</div>
              </div>
            )}

            {/* JOIN NOW — not logged in */}
            {!isLoggedIn && !isPremium && adminPreview === 'none' && (
              <div className="rounded-xl p-5 text-center space-y-4" style={{ background: '#ffffff', border: '1px solid #e5e7eb', boxShadow: '0 8px 28px rgba(0,0,0,0.12)' }}>
                <div>
                  <p className="font-black text-gray-900 text-lg mb-1">Unlock Premium Access</p>
                  <p className="text-gray-500 text-xs">Log in to see exclusive pricing and payment options</p>
                </div>
                <a
                  href="/login?redirect=/premium"
                  className="inline-flex items-center justify-center gap-2 w-full py-3.5 rounded-lg font-black text-sm uppercase tracking-wide text-white transition-all hover:scale-[1.02] active:scale-95"
                  style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)', boxShadow: '0 4px 14px rgba(22,163,74,0.35)' }}
                >
                  UNLOCK INSTANT ACCESS
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </a>
                <p className="text-[10px] text-gray-400">Free to join · Pay only when you choose a plan</p>
              </div>
            )}

            {/* Pricing — logged-in users only */}
            {((!isPremium && !soldOut && isLoggedIn) || adminPreview !== 'none') && (() => {
              const isTelegram = effectiveProvider === 'telegram';
              const showToggle = isTelegram;
              const forceCrypto = !isTelegram;
              const activeMethod = forceCrypto ? 'crypto' as const : effectivePayMethod;

              const starsSvg = <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z"/></svg>;
              const arrowSvg = <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>;
              const spinSvg = <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>;

              const buyBtn = (plan: 'monthly' | 'quarterly' | 'yearly', label: string, perMo?: string) => (
                <div className="shrink-0 flex flex-col items-center gap-0.5">
                  <button
                    onClick={() => activeMethod === 'stars' ? handlePurchase(plan) : handleCryptoPurchase(plan)}
                    disabled={!!loading}
                    className="px-3 py-1.5 rounded-md font-black text-[10px] uppercase tracking-wide text-white transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1 hover:opacity-90"
                    style={{ background: '#16a34a', whiteSpace: 'nowrap' }}
                  >
                    {(loading === plan || loading === `crypto_${plan}`) ? spinSvg : <>{label} {arrowSvg}</>}
                  </button>
                  {perMo && <span className="text-[9px] font-bold text-green-700">{perMo}</span>}
                </div>
              );

              const priceDisplay = (priceUsd: number, stars: number, suffix: string) => (
                activeMethod === 'stars' ? (
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="font-black text-[20px] leading-none text-gray-900">{stars.toLocaleString()}</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="#111827"><path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z"/></svg>
                    <span className="text-gray-500 text-[10px]">≈ ${priceUsd}{suffix}</span>
                  </div>
                ) : (
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-black text-[20px] leading-none text-gray-900">${priceUsd}</span>
                    <span className="text-gray-500 text-[10px]">{suffix}</span>
                  </div>
                )
              );

              return (
              <div className="rounded-xl p-2.5 space-y-2" style={{ background: '#ffffff', border: '1px solid #e5e7eb', boxShadow: '0 8px 28px rgba(0,0,0,0.12)' }}>
                {/* One-time payment notice */}
                <p className="text-center text-[10px] font-bold text-gray-900">✓ One-time payment · No auto-renew · No hidden fees</p>

                {/* Payment method toggle — only for Telegram users */}
                {showToggle && (
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setPayMethod('stars')}
                      className="flex-1 py-1.5 text-[10px] font-bold transition-all rounded-md flex items-center justify-center gap-1"
                      style={activeMethod === 'stars'
                        ? { background: '#229ED9', color: '#ffffff', boxShadow: '0 2px 6px rgba(34,158,217,0.35)' }
                        : { background: '#111827', color: '#e5e7eb' }}
                    >
                      {starsSvg} Telegram Stars
                    </button>
                    <button
                      onClick={() => setPayMethod('crypto')}
                      className="flex-1 py-1.5 text-[10px] font-bold transition-all rounded-md flex items-center justify-center gap-1"
                      style={activeMethod === 'crypto'
                        ? { background: '#F7931A', color: '#ffffff', boxShadow: '0 2px 6px rgba(247,147,26,0.35)' }
                        : { background: '#111827', color: '#e5e7eb' }}
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 17.97L4.58 13.62 11.943 24l7.37-10.38-7.372 4.35h.003zM12.056 0L4.69 12.223l7.365 4.354 7.365-4.35L12.056 0z"/></svg>
                      Crypto (USDT)
                    </button>
                  </div>
                )}

                <div className="space-y-1.5">

                  {/* ── 3 Months — Popular ── */}
                  <div className="rounded-md px-3 py-2 flex items-center" style={{ border: '2px solid #16a34a', background: '#f0fdf4' }}>
                    <span className="text-[10px] font-bold text-green-700 w-[52px] shrink-0">3 Months</span>
                    <div className="flex-1 min-w-0 flex items-center gap-1.5">
                      <span className="font-black text-gray-900 text-[16px] leading-none">
                        {activeMethod === 'stars' ? `${qp.starsAmount.toLocaleString()} ★` : `$${qp.priceUsd}`}
                      </span>
                      <span className="line-through text-[10px] font-bold text-red-400">
                        {activeMethod === 'stars' ? `${(mp.starsAmount * 3).toLocaleString()} ★` : `$${(mp.priceUsd * 3).toFixed(2)}`}
                      </span>
                      <span className="px-1 py-0.5 rounded text-[7px] font-black" style={{ background: '#16a34a', color: '#fff' }}>🔥 POPULAR</span>
                      <span className="px-1 py-0.5 rounded text-[7px] font-black" style={{ background: '#dc2626', color: '#fff' }}>80% OFF</span>
                    </div>
                    {buyBtn('quarterly', 'Get Access Now',
                      activeMethod === 'stars' ? `${Math.round(qp.starsAmount / 3).toLocaleString()} ★/mo` : `$${(qp.priceUsd / 3).toFixed(2)}/mo`
                    )}
                  </div>

                  {/* ── 1 Year — Best Value ── */}
                  <div className="rounded-md px-3 py-2 flex items-center" style={{ border: '1.5px solid #111827' }}>
                    <span className="text-[10px] font-bold text-gray-700 w-[52px] shrink-0">1 Year</span>
                    <div className="flex-1 min-w-0 flex items-center gap-1.5">
                      <span className="font-black text-gray-900 text-[16px] leading-none">
                        {activeMethod === 'stars' ? `${yp.starsAmount.toLocaleString()} ★` : `$${yp.priceUsd}`}
                      </span>
                      <span className="line-through text-[10px] font-bold text-red-400">
                        {activeMethod === 'stars' ? `${(mp.starsAmount * 12).toLocaleString()} ★` : `$${(mp.priceUsd * 12).toFixed(2)}`}
                      </span>
                      <span className="px-1 py-0.5 rounded text-[7px] font-black" style={{ background: '#f59e0b', color: '#111827' }}>🏆 BEST</span>
                      <span className="px-1 py-0.5 rounded text-[7px] font-black" style={{ background: '#dc2626', color: '#fff' }}>80% OFF</span>
                    </div>
                    {buyBtn('yearly', 'Unlock Access',
                      activeMethod === 'stars' ? `${Math.round(yp.starsAmount / 12).toLocaleString()} ★/mo` : `$${(yp.priceUsd / 12).toFixed(2)}/mo`
                    )}
                  </div>

                </div>
                {activeMethod === 'crypto' && <p className="text-center text-[8px] text-gray-400 mt-1">USDT (TRC20) · Powered by NowPayments</p>}
                {activeMethod === 'stars' && <p className="text-center text-[8px] text-gray-400 mt-1">Stars price based on live USD rate</p>}
              </div>
              );
            })()}

            <div className="mt-4 space-y-0.5">
              <p className="text-center text-[9px]" style={{ color: '#2a1f0e' }}>Telegram Stars · Crypto USDT (TRC20)</p>
              <p className="text-center text-[9px]" style={{ color: '#1e1510' }}>Erogram is actively developing — more features coming soon</p>
            </div>
          </div>
        </div>
          );
        })()}

        {/* ━━━ BOTTOM VAULT PREVIEW (8 images, below checkout) ━━━ */}
        {!isPremium && vaultTeaser.length > 0 && (
          <div
            className="relative overflow-hidden rounded-2xl p-4 mt-2 mb-4 select-none pointer-events-none"
            style={{ background: 'linear-gradient(135deg, #111009 0%, #140f07 60%, #0e0d0b 100%)', border: '1px solid #2e2010' }}
          >
            <div className="absolute top-0 right-0 w-56 h-56 blur-3xl opacity-[0.12] rounded-full" style={{ background: 'radial-gradient(ellipse, #c9973a 0%, transparent 60%)' }} />
            <div className="relative">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-[8px] font-black uppercase tracking-[0.3em]" style={{ color: '#b8964e' }}>Erogram Premium Vault</span>
              </div>
              <h3 className="text-sm font-black text-white tracking-tight mb-3">Unlock Instantly Thousands of Curated NSFW Groups</h3>

              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: Math.min(8, vaultTeaser.length) }, (_, i) => vaultTeaser[(btmIdx + i) % vaultTeaser.length]).map((g, i) => {
                  const fmtNum = (n: number) => n >= 1_000_000 ? (n/1_000_000).toFixed(1)+'M' : n >= 1_000 ? (n/1_000).toFixed(n>=10_000?0:1)+'K' : '';
                  const cats = g.vaultCategories && g.vaultCategories.length > 0 ? g.vaultCategories : [g.category];
                  const topCat = cats[2] || cats[1] || cats[0] || '';
                  return (
                    <div
                      key={`${g._id}-btm-${i}`}
                      className="rounded-xl overflow-hidden relative"
                      style={{ aspectRatio: '1', border: '2px solid #c9973a33', boxShadow: '0 4px 20px #c9973a0a' }}
                    >
                      <img src={g.image || '/assets/placeholder-no-image.png'} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).src = '/assets/placeholder-no-image.png'; }} />
                      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 30%, #0a0908dd 75%, #0a0908 100%)' }} />
                      <div className="absolute bottom-0 left-0 right-0 p-1.5">
                        <p className="text-[10px] font-bold text-white leading-tight truncate">
                          {(g.name || '').slice(0, 4)}<span style={{ filter: 'blur(4px)', opacity: 0.4, color: '#fff', userSelect: 'none' as const }}>{(g.name || '██████').slice(4) || '██████'}</span>
                        </p>
                        {g.memberCount ? (
                          <p className="text-[11px] font-black leading-none" style={{ color: '#c9973a' }}>
                            {fmtNum(g.memberCount)} <span className="text-[9px] font-bold" style={{ color: '#7a6040' }}>subs</span>
                            {topCat && <span className="text-[9px] font-bold" style={{ color: '#7a604088' }}> · {topCat}</span>}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-1.5 flex-wrap mt-3">
                {['Amateur', 'Onlyfans', 'NSFW-Telegram', 'Russian', 'Feet', 'BDSM', 'MILF', 'Latina', 'Fetish', 'Asian', 'Cosplay', 'Lesbian'].map(cat => (
                  <span
                    key={cat}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide"
                    style={{ background: '#0d0c0a', border: '1px solid #2e2010', color: '#7a6040' }}
                  >{cat}</span>
                ))}
                <span
                  className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide"
                  style={{ background: 'linear-gradient(135deg, #1f1709, #241b0c)', border: '1px solid #c9973a33', color: '#c9973a' }}
                >& MUCH MORE</span>
              </div>
            </div>
          </div>
        )}

        <div className="mt-5 flex justify-center">
          <Link href="/" className="px-3.5 py-1.5 rounded-lg text-xs font-medium transition hover:opacity-80" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)', color: '#4a3820' }}>&larr; Back to site</Link>
        </div>

      </div>
    </div>
  );
}
