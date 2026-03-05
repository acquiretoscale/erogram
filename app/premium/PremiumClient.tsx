'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import Link from 'next/link';

function trackPremiumEvent(event: string, extra?: Record<string, string | null>) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  fetch('/api/payments/track', {
    method: 'POST',
    headers,
    body: JSON.stringify({ event, source: 'premium_page', ...extra }),
  }).catch(() => {});
}

// Slots decrease 1/day from launch date, floored at minimum
const LAUNCH = new Date('2025-03-01').getTime();
function daysElapsed() { return Math.floor((Date.now() - LAUNCH) / 86_400_000); }
function calcSlots() { return Math.max(8, 43 - daysElapsed()); }
function calcLifetimeSlots() { return Math.max(3, 34 - Math.floor(daysElapsed() * 0.6)); }

// Sticky countdown: stored in localStorage, resets to random 1h15m–1h55m when expired
const TIMER_KEY = 'erogram_premium_timer_expiry';
function getOrCreateExpiry(): number {
  if (typeof window === 'undefined') return Date.now() + 5400_000;
  const stored = localStorage.getItem(TIMER_KEY);
  const now = Date.now();
  if (stored) {
    const expiry = parseInt(stored, 10);
    if (expiry > now) return expiry;
  }
  // 8 hours + random 0–47 minutes so it feels organic
  const ms = (480 + Math.floor(Math.random() * 48)) * 60_000;
  const newExpiry = now + ms;
  localStorage.setItem(TIMER_KEY, String(newExpiry));
  return newExpiry;
}

function formatTime(ms: number) {
  if (ms <= 0) return '00:00';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const PREVIEW_IMGS = [
  'https://pub-5800916b33a845e4b67e2d5be553c1e3.r2.dev/adverts/erogramPremium%20adult%20Telegram1.jpg',
  'https://pub-5800916b33a845e4b67e2d5be553c1e3.r2.dev/adverts/erogramPremium%20adult%20Telegram.jpg',
];

export default function PremiumClient() {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [soldOut, setSoldOut] = useState(false);
  const [slotsLeft] = useState<number>(calcSlots());
  const [lifetimeSlots] = useState<number>(calcLifetimeSlots());
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [premiumPlan, setPremiumPlan] = useState<string | null>(null);
  const [premiumSince, setPremiumSince] = useState<string | null>(null);
  const [premiumExpiresAt, setPremiumExpiresAt] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const [awaitingPayment, setAwaitingPayment] = useState(false);
  const tracked = useRef(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkPremiumStatus = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return false;
    try {
      const res = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
      const d = await res.json();
      if (d.premium) {
        setIsPremium(true);
        setPremiumPlan(d.premiumPlan || null);
        setPremiumSince(d.premiumSince || null);
        setPremiumExpiresAt(d.premiumExpiresAt || null);
        setAwaitingPayment(false);
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
        return true;
      }
    } catch { /* ignore */ }
    return false;
  }, []);

  useEffect(() => {
    if (!tracked.current) {
      tracked.current = true;
      trackPremiumEvent('page_view');
    }

    const token = localStorage.getItem('token');
    if (token) {
      setIsLoggedIn(true);
      checkPremiumStatus();
    }
    fetch('/api/payments/slots')
      .then(r => r.json())
      .then(d => { if (d.remaining === 0) setSoldOut(true); })
      .catch(() => {});

    // Init timer
    const expiry = getOrCreateExpiry();
    setTimeLeft(Math.max(0, expiry - Date.now()));

    const tick = setInterval(() => {
      const remaining = Math.max(0, getOrCreateExpiry() - Date.now());
      setTimeLeft(remaining);
      // If expired, getOrCreateExpiry() will create a new one on next tick
      if (remaining === 0) localStorage.removeItem(TIMER_KEY);
    }, 1000);

    return () => {
      clearInterval(tick);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [checkPremiumStatus]);

  const handlePurchase = async (plan: 'monthly' | 'yearly' | 'lifetime') => {
    if (!isLoggedIn) { window.location.href = '/login?redirect=/premium'; return; }
    trackPremiumEvent('plan_click', { plan });
    setLoading(plan);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/payments/stars', { plan }, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data?.url) {
        window.open(res.data.url, '_blank');
        // Poll for premium status every 5s for up to 10 minutes after invoice opens
        setAwaitingPayment(true);
        if (pollRef.current) clearInterval(pollRef.current);
        let attempts = 0;
        pollRef.current = setInterval(async () => {
          attempts++;
          await checkPremiumStatus();
          if (attempts >= 120) {
            clearInterval(pollRef.current!);
            pollRef.current = null;
            setAwaitingPayment(false);
          }
        }, 5000);
      }
    } catch (err: any) {
      if (err?.response?.data?.soldOut) setSoldOut(true);
      setError(err?.response?.data?.message || 'Failed to create payment');
    } finally { setLoading(null); }
  };

  /* ---------- image preview row (both images side by side) ---------- */
  const ImagePreview = () => (
    <div className="mt-5">
      <p className="text-amber-400/40 text-[9px] uppercase tracking-widest text-center font-bold mb-2.5">Preview what&apos;s inside</p>
      <div className="flex gap-3">
        {PREVIEW_IMGS.map((src, i) => (
          <button
            key={i}
            onClick={() => setLightboxImg(src)}
            className="flex-1 rounded-xl overflow-hidden relative focus:outline-none active:scale-[0.97] transition-transform"
            style={{ aspectRatio: '9/16', border: '1.5px solid rgba(196,150,50,0.45)', boxShadow: '0 0 18px rgba(196,150,50,0.18), inset 0 0 0 1px rgba(196,150,50,0.08)' }}
          >
            <img
              src={src}
              alt={`Vault preview ${i + 1}`}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-black/50 rounded-full px-2 py-0.5 pointer-events-none">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
              </svg>
              <span className="text-white/50 text-[9px] font-medium">tap</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#111111] flex items-center justify-center p-4 pt-16 pb-16">

      {/* Lightbox */}
      {lightboxImg && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightboxImg(null)}
        >
          <div className="relative max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <img
              src={lightboxImg}
              alt="Vault preview"
              className="w-full rounded-2xl object-contain"
              style={{ border: '2px solid rgba(196,150,50,0.6)', boxShadow: '0 0 40px rgba(196,150,50,0.25)', maxHeight: '80vh' }}
            />
            <button
              onClick={() => setLightboxImg(null)}
              className="absolute -top-4 -right-4 w-10 h-10 rounded-full bg-black border border-white/30 flex items-center justify-center text-white text-2xl leading-none shadow-lg"
            >
              ×
            </button>
            {/* Prev / Next */}
            <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between px-2 pointer-events-none">
              <button
                className="pointer-events-auto w-9 h-9 rounded-full bg-black/60 border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition"
                onClick={() => setLightboxImg(src => {
                  const idx = PREVIEW_IMGS.indexOf(src!);
                  return PREVIEW_IMGS[(idx - 1 + PREVIEW_IMGS.length) % PREVIEW_IMGS.length];
                })}
              >‹</button>
              <button
                className="pointer-events-auto w-9 h-9 rounded-full bg-black/60 border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition"
                onClick={() => setLightboxImg(src => {
                  const idx = PREVIEW_IMGS.indexOf(src!);
                  return PREVIEW_IMGS[(idx + 1) % PREVIEW_IMGS.length];
                })}
              >›</button>
            </div>
            <button
              onClick={() => setLightboxImg(null)}
              className="mt-4 w-full py-3 rounded-xl bg-white/10 border border-white/20 text-white font-bold text-sm tracking-wide active:scale-[0.97] transition-transform"
            >
              Close
            </button>
          </div>
        </div>
      )}
      <div
        className="w-full max-w-[860px] rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative"
        style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #111125 100%)' }}
      >
        {/* Glow effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-56 h-28 rounded-full opacity-25 blur-3xl" style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }} />
        <div className="absolute bottom-0 right-0 w-32 h-32 rounded-full opacity-10 blur-3xl bg-purple-500" />

        <div className="relative px-6 pt-7 pb-5">
          {/* Icon */}
          <div className="flex justify-center mb-3">
            <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                <path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z"/>
              </svg>
            </div>
          </div>

          <h1 className="text-xl font-bold text-white text-center mb-1">Erogram Premium</h1>
          <p className="text-white/30 text-xs text-center mb-3">This is not just an upgrade. It&apos;s a different level.</p>

          {/* Sticky countdown timer — prominent white background */}
          {!isPremium && !soldOut && timeLeft > 0 && (
            <div className="flex items-center justify-center gap-3 mb-4 px-4 py-3 rounded-xl bg-white border border-white/80 shadow-lg">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
              </svg>
              <span className="text-red-600 text-xs font-bold uppercase tracking-wide">Deal expires in</span>
              <span className="text-red-600 text-2xl font-black tabular-nums tracking-tight">{formatTime(timeLeft)}</span>
            </div>
          )}

          {/* Benefits */}
          <div className="space-y-2 mb-5">
            <div className="flex items-start gap-2.5">
              <span className="text-amber-400 mt-0.5 text-sm shrink-0">&#128274;</span>
              <span className="text-white/80 text-[13px]"><strong className="text-white">Secret Vault</strong> — Private hand-picked groups, not listed publicly</span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="text-amber-400 mt-0.5 text-sm shrink-0">&#9733;</span>
              <span className="text-white/80 text-[13px]"><strong className="text-white">Unlimited Bookmarks</strong> &amp; custom collections</span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="text-amber-400 mt-0.5 text-sm shrink-0">&#128640;</span>
              <span className="text-white/80 text-[13px]"><strong className="text-white">Early Access</strong> to new features</span>
            </div>
          </div>

          {awaitingPayment && !isPremium && (
            <div className="mb-3 px-3 py-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center gap-2.5">
              <svg className="animate-spin shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
              <span className="text-amber-400 text-xs font-medium">Complete payment in Telegram — this page will update automatically once confirmed.</span>
            </div>
          )}

          {error && (
            <div className="mb-3 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center">{error}</div>
          )}

          {/* Already Premium */}
          {isPremium && (
            <div className="py-5 px-5 rounded-xl border border-amber-500/25 bg-amber-500/[0.04] mb-3 space-y-3">
              {/* Header */}
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#f59e0b"><path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z"/></svg>
                </div>
                <span className="text-amber-400 font-bold text-sm">You&apos;re Premium</span>
                {premiumPlan && (
                  <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/25 capitalize">
                    {premiumPlan}
                  </span>
                )}
              </div>

              {/* Subscription details */}
              <div className="grid grid-cols-2 gap-2">
                {premiumSince && (
                  <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 py-2">
                    <p className="text-white/30 text-[9px] uppercase font-bold tracking-wider mb-0.5">Member since</p>
                    <p className="text-white/80 text-xs font-semibold">
                      {new Date(premiumSince).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                )}
                <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 py-2">
                  <p className="text-white/30 text-[9px] uppercase font-bold tracking-wider mb-0.5">Valid until</p>
                  {premiumExpiresAt ? (
                    <>
                      <p className="text-white/80 text-xs font-semibold">
                        {new Date(premiumExpiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                      {(() => {
                        const msLeft = new Date(premiumExpiresAt).getTime() - Date.now();
                        const daysLeft = Math.ceil(msLeft / 86_400_000);
                        const isExpiringSoon = daysLeft <= 7;
                        return (
                          <p className={`text-[9px] font-bold mt-0.5 ${isExpiringSoon ? 'text-red-400' : 'text-white/30'}`}>
                            {daysLeft > 0 ? `${daysLeft} day${daysLeft === 1 ? '' : 's'} left` : 'Expired'}
                          </p>
                        );
                      })()}
                    </>
                  ) : (
                    <p className="text-purple-400 text-xs font-bold">Lifetime ♾</p>
                  )}
                </div>
              </div>

              <Link
                href="/profile?tab=vault"
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-white text-sm font-bold transition"
              >
                <span>&#128274;</span> Open Vault
              </Link>
            </div>
          )}

          {/* Sold Out */}
          {soldOut && !isPremium && (
            <div className="text-center py-5 rounded-xl border border-white/10 bg-white/[0.02] mb-3">
              <div className="text-2xl mb-2">&#128293;</div>
              <div className="text-white font-bold mb-1">All 100 spots are taken!</div>
              <div className="text-white/40 text-xs">More slots opening soon.</div>
            </div>
          )}

          {/* Pricing */}
          {!isPremium && !soldOut && (
            <div>
              <div className="space-y-2.5">
                {/* Monthly */}
                <button
                  onClick={() => handlePurchase('monthly')}
                  disabled={!!loading}
                  className="w-full rounded-xl p-4 text-left transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 border border-white/10 hover:border-amber-500/30"
                  style={{ background: 'rgba(255,255,255,0.03)' }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-bold text-[15px]">Monthly</span>
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/20">80% OFF</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-white/25 line-through text-xs">3,000</span>
                        <span className="text-amber-400 font-bold text-lg">600</span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="#f59e0b"><path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z"/></svg>
                      </div>
                    </div>
                    <span className="px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-white text-[11px] font-black uppercase tracking-wide transition shrink-0">Grab the Deal</span>
                  </div>
                  {loading === 'monthly' && <div className="mt-1.5 text-xs text-amber-400 animate-pulse">Opening Telegram...</div>}
                </button>

                {/* Yearly */}
                <button
                  onClick={() => handlePurchase('yearly')}
                  disabled={!!loading}
                  className="w-full rounded-xl p-4 text-left transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 border-2 border-amber-500/30 hover:border-amber-500/50 relative overflow-hidden"
                  style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(239,68,68,0.05))' }}
                >
                  <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-500 to-red-500 text-white">72% OFF</div>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-white font-bold text-[15px]">Yearly</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-white/25 line-through text-xs">7,200</span>
                        <span className="text-amber-400 font-bold text-lg">2,000</span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="#f59e0b"><path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z"/></svg>
                      </div>
                    </div>
                    <span className="px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-white text-[11px] font-black uppercase tracking-wide transition shrink-0">Grab the Deal</span>
                  </div>
                  {loading === 'yearly' && <div className="mt-1.5 text-xs text-amber-400 animate-pulse">Opening Telegram...</div>}
                </button>

                {/* Lifetime */}
                <button
                  onClick={() => handlePurchase('lifetime')}
                  disabled={!!loading}
                  className="w-full rounded-xl p-4 text-left transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 border border-purple-500/30 hover:border-purple-500/50 relative overflow-hidden"
                  style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.08), rgba(139,92,246,0.05))' }}
                >
                  <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-purple-500 text-white">80% OFF</div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-bold text-[15px]">Lifetime</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-white/25 line-through text-xs">50,000</span>
                        <span className="text-purple-400 font-bold text-lg">10,000</span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="#a855f7"><path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z"/></svg>
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse shrink-0" />
                        <span className="text-purple-400/80 text-[10px] font-bold">Only {lifetimeSlots} lifetime spots left</span>
                      </div>
                    </div>
                    <span className="px-3.5 py-2 rounded-lg bg-purple-500 hover:bg-purple-400 text-white text-[11px] font-black uppercase tracking-wide transition shrink-0">Grab the Deal</span>
                  </div>
                  {loading === 'lifetime' && <div className="mt-1.5 text-xs text-purple-400 animate-pulse">Opening Telegram...</div>}
                </button>
              </div>

              <ImagePreview />
            </div>
          )}

          {/* Images shown below for premium/soldOut states too */}
          {(isPremium || soldOut) && <ImagePreview />}

          {!isLoggedIn && !isPremium && !soldOut && (
            <p className="text-center text-amber-400/70 text-xs mt-4">
              <Link href="/login?redirect=/premium" className="underline hover:text-amber-400">Log in with Telegram</Link> to upgrade
            </p>
          )}

          <div className="mt-4 space-y-1">
            <p className="text-center text-white/20 text-[10px]">Payments via Telegram Stars only</p>
            <p className="text-center text-white/15 text-[10px]">Erogram is actively developing — more features coming soon</p>
          </div>

          <div className="mt-4 flex justify-center">
            <Link href="/" className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white/70 text-sm font-medium transition border border-white/[0.06]">
              &larr; Back to site
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
