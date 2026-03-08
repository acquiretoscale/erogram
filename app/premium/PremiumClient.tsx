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
                    {cats.map((c, i) => (
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
      window.location.href = '/login?redirect=/premium';
      return;
    }
    fetch('/api/payments/slots').then(r => r.json()).then(d => { if (d.remaining === 0) setSoldOut(true); }).catch(() => {});
    const expiry = getOrCreateExpiry(); setTimeLeft(Math.max(0, expiry - Date.now()));
    const tick = setInterval(() => { const r = Math.max(0, getOrCreateExpiry() - Date.now()); setTimeLeft(r); if (r === 0) localStorage.removeItem(TIMER_KEY); }, 1000);
    return () => { clearInterval(tick); if (pollRef.current) clearInterval(pollRef.current); };
  }, [checkPremiumStatus]);

  const handlePurchase = async (plan: 'monthly' | 'yearly' | 'lifetime') => {
    if (!isLoggedIn) { window.location.href = '/login?redirect=/premium'; return; }
    trackPremiumEvent('plan_click', { plan }); setLoading(plan); setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/payments/stars', { plan }, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data?.url) { window.open(res.data.url, '_blank'); setAwaitingPayment(true); if (pollRef.current) clearInterval(pollRef.current); let a = 0; pollRef.current = setInterval(async () => { a++; await checkPremiumStatus(); if (a >= 120) { clearInterval(pollRef.current!); pollRef.current = null; setAwaitingPayment(false); } }, 5000); }
    } catch (err: any) { if (err?.response?.data?.soldOut) setSoldOut(true); setError(err?.response?.data?.message || 'Failed to create payment'); } finally { setLoading(null); }
  };

  const handleCryptoPurchase = async (plan: 'monthly' | 'yearly' | 'lifetime') => {
    if (!isLoggedIn) { window.location.href = '/login?redirect=/premium'; return; }
    trackPremiumEvent('crypto_plan_click', { plan }); setLoading(`crypto_${plan}`); setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/payments/nowpayments', { plan }, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data?.url) window.location.href = res.data.url;
    } catch (err: any) { if (err?.response?.data?.soldOut) setSoldOut(true); setError(err?.response?.data?.message || 'Failed to create crypto payment.'); } finally { setLoading(null); }
  };

  if (!authChecked || !isLoggedIn) {
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
        {isLoggedIn && !isPremium && !soldOut && timeLeft > 0 && (
          <div className="mb-5 rounded-xl bg-white p-3 shadow-lg shadow-white/5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 rounded-md text-[11px] font-black uppercase tracking-wide bg-red-600 text-white">80% OFF</span>
                <span className="text-[11px] font-bold text-gray-800">Launch price ends soon</span>
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

        {/* ━━━ VAULT PREVIEW (same as /groups) ━━━ */}
        {vaultTeaser.length > 0 && <VaultPreview items={vaultTeaser} />}

        {/* ━━━ UNLOCK VAULT + Features ━━━ */}
        <div className="mb-6 space-y-4">
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight mb-2">
              🔒 UNLOCK EROGRAM VAULT
            </h1>
            <p className="text-xs sm:text-sm max-w-md mx-auto" style={{ color: G.goldDim }}>
              Exclusive groups, rare niches, and leak communities you won&apos;t find anywhere else.
            </p>
          </div>

          {/* Quality */}
          <div>
            <h3 className="text-sm font-black text-white mb-2 flex items-center gap-2">
              <span>📊</span> Only Active, High-Quality Groups
            </h3>
            <p className="text-xs mb-1.5" style={{ color: G.goldDim }}>We filter everything manually. Premium listings include only groups that are:</p>
            <div className="space-y-1 pl-6">
              <p className="text-xs" style={{ color: G.goldText }}>• Real leaks & real communities</p>
              <p className="text-xs" style={{ color: G.goldText }}>• No spam or fake channels</p>
            </div>
          </div>

          {/* Enhanced Experience */}
          <div>
            <h3 className="text-sm font-black text-white mb-1.5 flex items-center gap-2">
              <span>🎯</span> Enhanced Experience
            </h3>
            <div className="space-y-1 pl-6">
              <p className="text-xs" style={{ color: G.goldText }}>🎯 Advanced filtering by niche</p>
              <p className="text-xs" style={{ color: G.goldText }}>⭐ Smart bookmarks & private folders</p>
            </div>
            <p className="text-xs font-semibold mt-1 pl-6" style={{ color: G.gold }}>Find exactly what you want in seconds.</p>
          </div>

          {/* Daily Drops */}
          <div>
            <h3 className="text-sm font-black text-white mb-1.5 flex items-center gap-2">
              <span>🔥</span> Daily Premium Drops
            </h3>
            <p className="text-xs pl-6" style={{ color: G.goldText }}>Every day we add new hidden Telegram groups discovered by our system.</p>
            <p className="text-xs pl-6 mt-0.5" style={{ color: G.goldText }}>Premium members get exclusive daily drops <span className="font-bold" style={{ color: G.gold }}>before the public sees them.</span></p>
            <p className="text-xs font-bold pl-6 mt-0.5" style={{ color: G.goldDim }}>Never miss the next big leak source.</p>
          </div>

          {/* Mega Lists */}
          <div>
            <h3 className="text-sm font-black text-white mb-1.5 flex items-center gap-2">
              <span>📚</span> INSTANT Unlock Premium Mega Lists
            </h3>
            <p className="text-xs pl-6" style={{ color: G.goldText }}>Instant Access to our curated lists with <span className="font-bold" style={{ color: G.gold }}>100+ hand-picked Telegram groups.</span></p>
          </div>

          {/* Scam Protection */}
          <div>
            <h3 className="text-sm font-black text-white mb-1.5 flex items-center gap-2">
              <span>🛡</span> Scam & Spam Protection
            </h3>
            <p className="text-xs pl-6 mb-1" style={{ color: G.goldDim }}>We actively filter:</p>
            <div className="space-y-0.5 pl-6">
              <p className="text-xs" style={{ color: G.goldText }}>❌ Fake groups</p>
              <p className="text-xs" style={{ color: G.goldText }}>❌ Scam channels</p>
              <p className="text-xs" style={{ color: G.goldText }}>❌ Dead communities</p>
              <p className="text-xs" style={{ color: G.goldText }}>❌ Spam networks</p>
            </div>
            <p className="text-xs pl-6 mt-1" style={{ color: G.goldDim }}>So you only join real, active Telegram groups.</p>
          </div>

          {/* Inner Circle */}
          <div className="pt-2 border-t" style={{ borderColor: `${G.gold}15` }}>
            <h3 className="text-sm font-black text-white mb-1.5">Join the Erogram Inner Circle</h3>
            <p className="text-xs leading-relaxed" style={{ color: G.goldText }}>
              Unlock hidden Telegram networks, discover new groups before everyone else, and explore the best NSFW communities without wasting hours searching.
            </p>
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

        {/* ━━━ TIMER — above checkout (logged-in only) ━━━ */}
        {isLoggedIn && !isPremium && !soldOut && timeLeft > 0 && (
          <div className="mb-4 rounded-xl bg-white p-3 shadow-lg shadow-white/5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 rounded-md text-[11px] font-black uppercase tracking-wide bg-red-600 text-white">80% OFF</span>
                <span className="text-[11px] font-bold text-gray-800">Launch price ends soon</span>
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
                  {effectivePayMethod === 'crypto' ? 'Complete your crypto payment — this page will update automatically once confirmed.' : 'Complete payment in Telegram — this page will update automatically once confirmed.'}
                </span>
              </div>
            )}

            {error && <div className="mb-3 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center">{error}</div>}

            {isPremium && adminPreview === 'none' && (
              <div className="py-4 px-4 rounded-xl mb-3 space-y-2.5" style={{ background: `${G.gold}05`, border: `1px solid ${G.gold}20` }}>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: `${G.gold}20` }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill={G.gold}><path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z"/></svg>
                  </div>
                  <span className="font-bold text-sm" style={{ color: G.gold }}>You&apos;re Premium</span>
                  {premiumPlan && <span className="ml-auto px-2 py-0.5 rounded-full text-[9px] font-black uppercase capitalize" style={{ background: `${G.gold}15`, color: G.goldLight, border: `1px solid ${G.gold}20` }}>{premiumPlan}</span>}
                </div>
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
                <Link href="/profile?tab=vault" className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-lg text-sm font-bold transition-all hover:scale-[1.02]" style={{ background: `linear-gradient(135deg, ${G.gold}, #a67c2e)`, color: '#0d0c0a', boxShadow: `0 0 20px ${G.gold}20` }}>
                  🔒 Open Vault
                </Link>
              </div>
            )}

            {soldOut && !isPremium && adminPreview === 'none' && (
              <div className="text-center py-4 rounded-xl mb-3" style={{ border: `1px solid ${G.border}`, background: 'rgba(255,255,255,0.01)' }}>
                <div className="text-xl mb-1">🔥</div>
                <div className="text-white font-bold text-sm mb-0.5">All 100 spots are taken!</div>
                <div className="text-[11px]" style={{ color: G.goldDim }}>More slots opening soon.</div>
              </div>
            )}

            {/* Login prompt — non-logged-in users */}
            {!isLoggedIn && !isPremium && !soldOut && adminPreview === 'none' && (
              <div className="text-center">
                <div className="flex justify-center mb-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: `${G.gold}10`, border: `1px solid ${G.gold}20` }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={G.gold} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  </div>
                </div>
                <p className="text-white font-bold text-sm mb-1">Create an account</p>
                <p className="text-[11px] mb-5" style={{ color: G.goldDim }}>Free account — takes 5 seconds</p>
                <div className="flex flex-col gap-2">
                  <a href="/api/auth/google?state=premium" className="w-full py-3 rounded-lg text-white text-sm font-semibold transition flex items-center justify-center gap-2 hover:opacity-90" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                    Continue with Google
                  </a>
                  <Link href="/login?redirect=/premium" className="w-full py-3 rounded-lg text-sm font-bold transition flex items-center justify-center gap-2 hover:opacity-90" style={{ background: `linear-gradient(135deg, ${G.gold}, #a67c2e)`, color: '#0d0c0a' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248l-1.97 9.289c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.932z"/></svg>
                    Continue with Telegram
                  </Link>
                </div>
              </div>
            )}

            {/* Pricing — logged-in users (or admin preview) */}
            {((isLoggedIn && !isPremium && !soldOut) || adminPreview !== 'none') && (
              <div className="rounded-xl p-3 space-y-2.5" style={{ background: '#ffffff', border: '1px solid #e5e7eb', boxShadow: '0 8px 28px rgba(0,0,0,0.12)' }}>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPayMethod('stars')}
                    className="flex-1 py-2 text-[11px] font-bold transition-all rounded-lg flex items-center justify-center gap-1.5"
                    style={effectivePayMethod === 'stars'
                      ? { background: '#229ED9', color: '#ffffff', boxShadow: '0 2px 6px rgba(34,158,217,0.35)' }
                      : { background: '#111827', color: '#e5e7eb' }}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z"/></svg>
                    Telegram Stars
                  </button>
                  <button
                    onClick={() => setPayMethod('crypto')}
                    className="flex-1 py-2 text-[11px] font-bold transition-all rounded-lg flex items-center justify-center gap-1.5"
                    style={effectivePayMethod === 'crypto'
                      ? { background: '#F7931A', color: '#ffffff', boxShadow: '0 2px 6px rgba(247,147,26,0.35)' }
                      : { background: '#111827', color: '#e5e7eb' }}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 17.97L4.58 13.62 11.943 24l7.37-10.38-7.372 4.35h.003zM12.056 0L4.69 12.223l7.365 4.354 7.365-4.35L12.056 0z"/></svg>
                    Crypto
                  </button>
                </div>

                <div className="space-y-2">
                  {/* Monthly */}
                  <div className="rounded-lg px-3 py-3 flex items-center gap-3" style={{ border: '1px solid #e5e7eb' }}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <span className="font-black text-gray-900 text-[13px]">Monthly</span>
                        <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-green-50 text-green-700">
                          ⏳ {effectivePayMethod === 'stars' ? 'Save 2,400★ ($35.96)' : 'Save $35.96'}
                        </span>
                      </div>
                      {effectivePayMethod === 'stars' ? (
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="line-through text-[11px]" style={{ color: '#16a34a' }}>3,000</span>
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="#16a34a"><path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z"/></svg>
                          <span className="font-black text-[20px] leading-none text-gray-900">600</span>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="#111827"><path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z"/></svg>
                          <span className="text-gray-500 text-[10px]">≈ $8.99/mo</span>
                        </div>
                      ) : (
                        <div className="flex items-baseline gap-1.5">
                          <span className="line-through text-[11px]" style={{ color: '#16a34a' }}>$44.95</span>
                          <span className="font-black text-[20px] leading-none text-gray-900">$8.99</span>
                          <span className="text-gray-500 text-[10px]">/mo</span>
                        </div>
                      )}
                      <p className="text-[9px] mt-1 text-gray-500">One-time payment · No auto-renew</p>
                    </div>
                    <button
                      onClick={() => effectivePayMethod === 'stars' ? handlePurchase('monthly') : handleCryptoPurchase('monthly')}
                      disabled={!!loading}
                      className="shrink-0 px-3.5 py-2.5 rounded-lg font-black text-[11px] uppercase tracking-wide text-white transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5 hover:opacity-90"
                      style={{ background: '#16a34a', whiteSpace: 'nowrap' }}
                    >
                      {(loading === 'monthly' || loading === 'crypto_monthly') ? (
                        <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                      ) : (<>Get Monthly <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></>)}
                    </button>
                  </div>

                  {/* Yearly */}
                  <div className="rounded-lg overflow-hidden" style={{ border: '2px solid #111827' }}>
                    <div className="flex items-center justify-between px-3 py-1.5" style={{ background: '#111827' }}>
                      <span className="font-black text-white text-[13px]">Yearly</span>
                      <span className="text-[8px] font-black tracking-widest text-white uppercase opacity-70">BESTSELLER</span>
                    </div>
                    <div className="px-3 py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-green-50 text-green-700">
                          ⏳ {effectivePayMethod === 'stars' ? 'Save 13,332★ ($199.96)' : 'Save $199.96'}
                        </span>
                      </div>
                      {effectivePayMethod === 'stars' ? (
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="line-through text-[11px]" style={{ color: '#16a34a' }}>16,665</span>
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="#16a34a"><path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z"/></svg>
                          <span className="font-black text-[20px] leading-none text-gray-900">3,333</span>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="#111827"><path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z"/></svg>
                          <span className="text-gray-500 text-[10px]">≈ $49.99/yr · $4.17/mo</span>
                        </div>
                      ) : (
                        <div className="flex items-baseline gap-1.5">
                          <span className="line-through text-[11px]" style={{ color: '#16a34a' }}>$249.95</span>
                          <span className="font-black text-[20px] leading-none text-gray-900">$49.99</span>
                          <span className="text-gray-500 text-[10px]">/yr · $4.17/mo</span>
                        </div>
                      )}
                      <p className="text-[9px] mt-1 text-gray-500">One-time payment · No auto-renew</p>
                    </div>
                    <button
                      onClick={() => effectivePayMethod === 'stars' ? handlePurchase('yearly') : handleCryptoPurchase('yearly')}
                      disabled={!!loading}
                      className="shrink-0 px-3.5 py-2.5 rounded-lg font-black text-[11px] uppercase tracking-wide text-white transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5 hover:opacity-90"
                      style={{ background: '#16a34a', whiteSpace: 'nowrap' }}
                    >
                      {(loading === 'yearly' || loading === 'crypto_yearly') ? (
                        <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                      ) : (<>Get Yearly <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></>)}
                    </button>
                    </div>
                  </div>
                </div>
                <p className="text-center text-[10px] text-gray-500">Secure checkout · Instant access · No hidden fees</p>
                {effectivePayMethod === 'crypto' && <p className="text-center text-[9px] text-gray-500">300+ cryptocurrencies accepted · Powered by NowPayments</p>}
              </div>
            )}

            <div className="mt-4 space-y-0.5">
              <p className="text-center text-[9px]" style={{ color: '#2a1f0e' }}>Telegram Stars · Crypto (BTC, ETH, USDT, 300+ more)</p>
              <p className="text-center text-[9px]" style={{ color: '#1e1510' }}>Erogram is actively developing — more features coming soon</p>
            </div>
          </div>
        </div>
          );
        })()}

        {/* ━━━ SECOND VAULT PREVIEW — below payment ━━━ */}
        {vaultTeaser.length > 0 && <VaultPreview items={vaultTeaser} />}

        <div className="mt-5 flex justify-center">
          <Link href="/" className="px-3.5 py-1.5 rounded-lg text-xs font-medium transition hover:opacity-80" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)', color: '#4a3820' }}>&larr; Back to site</Link>
        </div>

      </div>
    </div>
  );
}
