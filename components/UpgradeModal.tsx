'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason?: 'bookmark_limit' | 'folder_create';
}

export default function UpgradeModal({ isOpen, onClose, reason }: UpgradeModalProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [soldOut, setSoldOut] = useState(false);
  const [slotsLeft, setSlotsLeft] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/payments/slots')
        .then(r => r.json())
        .then(d => {
          setSlotsLeft(d.remaining ?? null);
          if (d.remaining === 0) setSoldOut(true);
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePurchase = async (plan: 'monthly' | 'yearly' | 'lifetime') => {
    setLoading(plan);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/payments/stars', { plan }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data?.url) {
        window.open(res.data.url, '_blank');
        onClose();
      }
    } catch (err: any) {
      if (err?.response?.data?.soldOut) {
        setSoldOut(true);
      }
      setError(err?.response?.data?.message || 'Failed to create payment');
    } finally {
      setLoading(null);
    }
  };

  const title = reason === 'folder_create'
    ? 'Unlock VIP Features'
    : 'Unlock VIP Features';

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-[420px] rounded-2xl overflow-hidden border border-white/10 shadow-2xl"
        style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #111125 100%)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Glow effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-56 h-28 rounded-full opacity-25 blur-3xl" style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }} />
        <div className="absolute bottom-0 right-0 w-32 h-32 rounded-full opacity-10 blur-3xl bg-purple-500" />

        <div className="relative px-6 pt-7 pb-5">
          {/* VIP icon */}
          <div className="flex justify-center mb-3">
            <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                <path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z"/>
              </svg>
            </div>
          </div>

          <h2 className="text-xl font-bold text-white text-center mb-1">{title}</h2>

          {/* Slot counter */}
          {slotsLeft !== null && !soldOut && (
            <div className="flex justify-center mb-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-red-400 text-[11px] font-bold">{slotsLeft} of 100 slots remaining</span>
              </div>
            </div>
          )}

          {/* Benefits */}
          <div className="space-y-2 mb-5 mt-4">
            <div className="flex items-start gap-2.5">
              <span className="text-amber-400 mt-0.5 text-sm shrink-0">&#9733;</span>
              <span className="text-white/80 text-[13px]">Unlimited bookmarks & custom folders</span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="text-amber-400 mt-0.5 text-sm shrink-0">&#128274;</span>
              <span className="text-white/80 text-[13px]">Access to exclusive groups not listed on Erogram.pro</span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="text-amber-400 mt-0.5 text-sm shrink-0">&#128640;</span>
              <span className="text-white/80 text-[13px]">Early access to new features as we build them</span>
            </div>
          </div>

          {error && (
            <div className="mb-3 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center">
              {error}
            </div>
          )}

          {soldOut ? (
            <div className="text-center py-6">
              <div className="text-2xl mb-2">&#128293;</div>
              <div className="text-white font-bold text-lg mb-1">All 100 slots are taken!</div>
              <div className="text-white/40 text-sm">Join the waitlist — more slots open soon.</div>
            </div>
          ) : (
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
                    <div className="text-white font-bold text-[15px]">Monthly</div>
                    <div className="text-white/35 text-xs mt-0.5">Billed every 30 days</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-amber-400 font-bold text-lg">600</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#f59e0b"><path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z"/></svg>
                  </div>
                </div>
                {loading === 'monthly' && <div className="mt-2 text-xs text-amber-400">Opening Telegram...</div>}
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
                    <div className="text-white font-bold text-[15px]">Yearly</div>
                    <div className="text-white/35 text-xs mt-0.5">Best deal — billed once a year</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-white/25 line-through text-sm mr-1">7,200</span>
                    <span className="text-amber-400 font-bold text-lg">2,000</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#f59e0b"><path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z"/></svg>
                  </div>
                </div>
                {loading === 'yearly' && <div className="mt-2 text-xs text-amber-400">Opening Telegram...</div>}
              </button>

              {/* Lifetime */}
              <button
                onClick={() => handlePurchase('lifetime')}
                disabled={!!loading}
                className="w-full rounded-xl p-4 text-left transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 border border-purple-500/30 hover:border-purple-500/50 relative overflow-hidden"
                style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.08), rgba(139,92,246,0.05))' }}
              >
                <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-purple-500 text-white">Forever</div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-white font-bold text-[15px]">Lifetime</div>
                    <div className="text-white/35 text-xs mt-0.5">Pay once, VIP forever — no renewals</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-amber-400 font-bold text-lg">10,000</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#f59e0b"><path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z"/></svg>
                  </div>
                </div>
                {loading === 'lifetime' && <div className="mt-2 text-xs text-amber-400">Opening Telegram...</div>}
              </button>
            </div>
          )}

          <div className="mt-4 space-y-2">
            <p className="text-center text-white/20 text-[10px]">We only accept Telegram Stars as payment</p>
            <p className="text-center text-white/15 text-[10px]">Erogram is actively developing — more features coming soon</p>
          </div>

          <button
            onClick={onClose}
            className="w-full mt-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 text-sm font-medium transition"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
}
