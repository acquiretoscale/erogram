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

const G = { gold: '#00aff0', goldLight: '#00d4ff', goldDim: 'rgba(255,255,255,0.4)', goldText: 'rgba(255,255,255,0.55)', border: 'rgba(255,255,255,0.08)', borderLight: 'rgba(255,255,255,0.12)', innerBg: 'rgba(255,255,255,0.03)' };

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
  const [paymentJustCompleted, setPaymentJustCompleted] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const tracked = useRef(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOSDevice, setIsIOSDevice] = useState(false);
  const [appInstalled, setAppInstalled] = useState(false);
  const [payMethod, setPayMethod] = useState<'stars' | 'crypto'>('stars');

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
    const expiry = getOrCreateExpiry(); setTimeLeft(Math.max(0, expiry - Date.now()));
    const tick = setInterval(() => { const r = Math.max(0, getOrCreateExpiry() - Date.now()); setTimeLeft(r); if (r === 0) localStorage.removeItem(TIMER_KEY); }, 1000);
    return () => { clearInterval(tick); if (pollRef.current) clearInterval(pollRef.current); };
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
    trackPremiumEvent('plan_click', { plan, method: payMethod }); setLoading(plan); setError('');
    try {
      const token = localStorage.getItem('token');
      const endpoint = payMethod === 'crypto' ? '/api/payments/nowpayments' : '/api/payments/stars';
      const res = await axios.post(endpoint, { plan }, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data?.url) { window.open(res.data.url, '_blank'); setAwaitingPayment(true); if (pollRef.current) clearInterval(pollRef.current); let a = 0; pollRef.current = setInterval(async () => { a++; await checkPremiumStatus(true); if (a >= 120) { clearInterval(pollRef.current!); pollRef.current = null; setAwaitingPayment(false); } }, 5000); }
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
    <div className="min-h-screen" style={{ background: 'linear-gradient(160deg, #0a0f1e 0%, #0d1628 50%, #0a1220 100%)' }}>
      <div className="max-w-[520px] mx-auto px-3 sm:px-4 pt-5 pb-16">

        {/* ━━━ TIMER — at top of page (logged-in only) ━━━ */}
        {!isPremium && !soldOut && timeLeft > 0 && (
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
              UPGRADE TO PREMIUM
            </h1>
            <p className="text-xs sm:text-sm max-w-md mx-auto text-white/40">
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

          {/* Vicky AI showcase */}
          <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="rounded-xl overflow-hidden">
              <video
                src="https://pub-5800916b33a845e4b67e2d5be553c1e3.r2.dev/tgempire/booty-bazaar/wmremove-transformed.mp4"
                autoPlay muted loop playsInline
                className="w-full"
                style={{ maxHeight: '200px', objectFit: 'contain', background: '#000' }}
              />
            </div>
            <div className="px-4 py-3 flex items-center gap-3">
              <img src="/assets/vicky-ai-avatar.jpg" alt="" className="w-10 h-10 rounded-full ring-2 ring-[#00aff0]/20 shrink-0" style={{ objectFit: 'cover', objectPosition: '50% 60%' }} />
              <div>
                <div className="text-[13px] font-black text-white">Unlock Vicky AI</div>
                <div className="text-[11px] text-white/40">Your personal Erogram assistant — find the best creators, groups & tools instantly.</div>
              </div>
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

          {/* Mobile App */}
          <div>
            <h3 className="text-sm font-black text-white mb-1.5 flex items-center gap-2">
              <span>📱</span> Mobile App — Install on Your Phone
            </h3>
            <p className="text-xs pl-6 mb-1" style={{ color: G.goldText }}>Premium members get access to the <span className="font-bold" style={{ color: G.gold }}>Erogram mobile app.</span></p>
            <div className="space-y-0.5 pl-6">
              <p className="text-xs" style={{ color: G.goldText }}>✓ Works on Android & iOS</p>
              <p className="text-xs" style={{ color: G.goldText }}>✓ Full-screen native experience</p>
              <p className="text-xs" style={{ color: G.goldText }}>✓ Quick access from your home screen</p>
            </div>
          </div>

          {/* Inner Circle */}
          <div className="pt-2 border-t border-white/5">
            <h3 className="text-sm font-black text-white mb-1.5">Join the Erogram Inner Circle</h3>
            <p className="text-xs leading-relaxed" style={{ color: G.goldText }}>
              Unlock hidden Telegram networks, discover new groups before everyone else, and explore the best NSFW communities without wasting hours searching.
            </p>
          </div>

          {/* Vote on new features */}
          <div>
            <h3 className="text-sm font-black text-white mb-1.5 flex items-center gap-2">
              <span>👍</span> Vote on New Features
            </h3>
            <p className="text-xs pl-6" style={{ color: G.goldText }}>Have your say — help shape what Erogram builds next.</p>
          </div>

          {/* Save unlimited OF Creators */}
          <div>
            <h3 className="text-sm font-black text-white mb-1.5 flex items-center gap-2">
              <span>💾</span> Save Unlimited OF Creators
            </h3>
            <p className="text-xs pl-6" style={{ color: G.goldText }}>Bookmark as many OnlyFans creators as you want — no limits.</p>
          </div>

          {/* Access beta features */}
          <div>
            <h3 className="text-sm font-black text-white mb-1.5 flex items-center gap-2">
              <span>🧪</span> Access Beta Features
            </h3>
            <p className="text-xs pl-6" style={{ color: G.goldText }}>Be the first to test new tools and features before they go public.</p>
          </div>

        </div>

        {/* ━━━ TIMER — above checkout ━━━ */}
        {!isPremium && !soldOut && timeLeft > 0 && (
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
        <div
          className="rounded-xl overflow-hidden relative mb-6"
          style={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}
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

            {awaitingPayment && !isPremium && (
              <div className="mb-3 px-3 py-2 rounded-lg flex items-center gap-2" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}>
                <svg className="animate-spin shrink-0" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                <span className="text-amber-700 text-[11px] font-medium">
                  Complete payment in Telegram — this page will update automatically once confirmed.
                </span>
              </div>
            )}

            {error && <div className="mb-3 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center">{error}</div>}

            {(isPremium || isAdmin) && (
              <div className="py-4 px-4 rounded-xl mb-3 space-y-2.5" style={{ background: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.15)' }}>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 bg-green-100">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="#16a34a"><path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z"/></svg>
                  </div>
                  <span className="font-bold text-sm text-green-700">{isAdmin && !isPremium ? 'Admin Access' : 'You\u2019re Premium'}</span>
                  {premiumPlan && <span className="ml-auto px-2 py-0.5 rounded-full text-[9px] font-black uppercase capitalize bg-green-50 text-green-700 border border-green-200">{premiumPlan}</span>}
                  {isAdmin && !isPremium && <span className="ml-auto px-2 py-0.5 rounded-full text-[9px] font-black uppercase" style={{ background: 'rgba(168,85,247,0.1)', color: '#7c3aed', border: '1px solid rgba(168,85,247,0.2)' }}>Admin</span>}
                </div>
                {isPremium && (
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
                )}
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
            {!isPremium && !soldOut && (
              <div className="rounded-xl p-3 space-y-2.5" style={{ background: '#ffffff', border: '1px solid #e5e7eb', boxShadow: '0 8px 28px rgba(0,0,0,0.12)' }}>

                {/* Payment method picker */}
                <div>
                  <p className="text-[10px] text-gray-400 text-center mb-1 font-semibold">Choose your payment method</p>
                  <p className="text-[10px] text-green-600 text-center mb-2.5 font-bold">One-time payment · No auto-renewal</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setPayMethod('stars')}
                      className="rounded-xl py-3 text-center transition-all"
                      style={{
                        background: payMethod === 'stars' ? '#16a34a' : '#f3f4f6',
                        border: payMethod === 'stars' ? '2px solid #15803d' : '2px solid #e5e7eb',
                      }}
                    >
                      <div className={`text-[12px] font-black ${payMethod === 'stars' ? 'text-white' : 'text-gray-700'}`}>⭐ Telegram Stars</div>
                      <div className={`text-[9px] mt-0.5 ${payMethod === 'stars' ? 'text-white/70' : 'text-gray-400'}`}>Pay via Telegram</div>
                    </button>
                    <button
                      onClick={() => setPayMethod('crypto')}
                      className="rounded-xl py-3 text-center transition-all"
                      style={{
                        background: payMethod === 'crypto' ? '#16a34a' : '#f3f4f6',
                        border: payMethod === 'crypto' ? '2px solid #15803d' : '2px solid #e5e7eb',
                      }}
                    >
                      <div className={`text-[12px] font-black ${payMethod === 'crypto' ? 'text-white' : 'text-gray-700'}`}>₿ Crypto</div>
                      <div className={`text-[9px] mt-0.5 ${payMethod === 'crypto' ? 'text-white/70' : 'text-gray-400'}`}>USDT, BTC, ETH & more</div>
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {/* 3 Months */}
                  <div className="rounded-lg px-3 py-3 flex items-center gap-3" style={{ border: '1px solid #e5e7eb' }}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <span className="font-black text-gray-900 text-[13px]">3 Months</span>
                      </div>
                      <div className="flex items-center gap-1 flex-wrap">
                        {payMethod === 'stars' ? (
                          <>
                            <span className="font-black text-[20px] leading-none text-gray-900">1,000</span>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="#111827"><path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z"/></svg>
                            <span className="text-gray-500 text-[10px]">≈ $14.97 · $4.99/mo</span>
                          </>
                        ) : (
                          <>
                            <span className="font-black text-[20px] leading-none text-gray-900">$14.97</span>
                            <span className="text-gray-500 text-[10px]">· $4.99/mo</span>
                          </>
                        )}
                      </div>
                      <p className="text-[9px] mt-1 text-green-600 font-semibold">One-time payment · No auto-renewal</p>
                    </div>
                    <button
                      onClick={() => handlePurchase('quarterly')}
                      disabled={!!loading}
                      className="shrink-0 px-3.5 py-2.5 rounded-lg font-black text-[11px] uppercase tracking-wide text-white transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5 hover:opacity-90"
                      style={{ background: '#16a34a', whiteSpace: 'nowrap' }}
                    >
                      {loading === 'quarterly' ? (
                        <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                      ) : (<>Get 3 Months <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></>)}
                    </button>
                  </div>

                  {/* Yearly · BESTSELLER */}
                  <div className="rounded-lg overflow-hidden" style={{ border: '2px solid #111827' }}>
                    <div className="flex items-center justify-between px-3 py-1.5" style={{ background: '#111827' }}>
                      <span className="font-black text-white text-[13px]">1 Year</span>
                      <span className="text-[8px] font-black tracking-widest text-white uppercase opacity-70">BESTSELLER</span>
                    </div>
                    <div className="px-3 py-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 flex-wrap">
                          {payMethod === 'stars' ? (
                            <>
                              <span className="font-black text-[20px] leading-none text-gray-900">2,000</span>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="#111827"><path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z"/></svg>
                              <span className="text-gray-500 text-[10px]">≈ $29.97/yr · $2.50/mo</span>
                            </>
                          ) : (
                            <>
                              <span className="font-black text-[20px] leading-none text-gray-900">$29.97</span>
                              <span className="text-gray-500 text-[10px]">· $2.50/mo</span>
                            </>
                          )}
                        </div>
                        <p className="text-[9px] mt-1 text-green-600 font-semibold">One-time payment · No auto-renewal</p>
                      </div>
                      <button
                        onClick={() => handlePurchase('yearly')}
                        disabled={!!loading}
                        className="shrink-0 px-3.5 py-2.5 rounded-lg font-black text-[11px] uppercase tracking-wide text-white transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5 hover:opacity-90"
                        style={{ background: '#16a34a', whiteSpace: 'nowrap' }}
                      >
                        {loading === 'yearly' ? (
                          <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                        ) : (<>Get Yearly <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></>)}
                      </button>
                    </div>
                  </div>

                  {/* Lifetime */}
                  <div className="rounded-lg px-3 py-3 flex items-center gap-3" style={{ border: '2px solid #16a34a', background: '#f0fdf4' }}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <span className="font-black text-gray-900 text-[13px]">Lifetime</span>
                        <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-green-600 text-white">PAY ONCE</span>
                      </div>
                      <div className="flex items-center gap-1 flex-wrap">
                        {payMethod === 'stars' ? (
                          <>
                            <span className="font-black text-[20px] leading-none text-gray-900">13,000</span>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="#111827"><path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z"/></svg>
                            <span className="text-gray-500 text-[10px]">≈ $197 · Access forever</span>
                          </>
                        ) : (
                          <>
                            <span className="font-black text-[20px] leading-none text-gray-900">$197</span>
                            <span className="text-gray-500 text-[10px]">· Access forever</span>
                          </>
                        )}
                      </div>
                      <p className="text-[9px] mt-1 text-gray-500">One-time payment · Never expires</p>
                    </div>
                    <button
                      onClick={() => handlePurchase('lifetime')}
                      disabled={!!loading}
                      className="shrink-0 px-3.5 py-2.5 rounded-lg font-black text-[11px] uppercase tracking-wide text-white transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5 hover:opacity-90"
                      style={{ background: '#16a34a', whiteSpace: 'nowrap' }}
                    >
                      {loading === 'lifetime' ? (
                        <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                      ) : (<>Get Lifetime <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></>)}
                    </button>
                  </div>
                </div>
                <p className="text-center text-[11px] text-green-600 font-bold mt-2">One-time payment · No auto-renewal · No recurring charges</p>
                <p className="text-center text-[9px] text-gray-400 mt-1">
                  {payMethod === 'crypto' ? 'Secure checkout via NOWPayments · USDT, BTC, ETH & 100+ coins' : 'Secure checkout via Telegram Stars · Instant access'}
                </p>
              </div>
            )}

            <div className="mt-4 space-y-0.5">
              <p className="text-center text-[9px] text-gray-400">Pay with Telegram Stars or Crypto</p>
              <p className="text-center text-[9px] text-gray-300">Erogram is actively developing — more features coming soon</p>
            </div>
          </div>
        </div>

        {/* ━━━ SECOND VAULT PREVIEW — below payment ━━━ */}
        {vaultTeaser.length > 0 && <VaultPreview items={vaultTeaser} />}

        <div className="mt-5 flex justify-center">
          <Link href="/" className="px-3.5 py-1.5 rounded-lg text-xs font-medium transition hover:opacity-80" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' }}>&larr; Back to site</Link>
        </div>

      </div>
    </div>
  );
}
