'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense, useEffect, useState, useRef } from 'react';
import Navbar from '@/components/Navbar';

const TIER_INFO: Record<string, { label: string; stars: number | null; icon: string; color: string; gradient: string }> = {
  free: { label: 'Free Submission', stars: null, icon: '✓', color: '#22c55e', gradient: 'from-green-500/20 to-emerald-500/10' },
  instant_approval: { label: 'Instant Approval', stars: 1000, icon: '⚡', color: '#0088cc', gradient: 'from-blue-500/20 to-cyan-500/10' },
  boost_week: { label: 'Instant + Boost (1 Week)', stars: 3000, icon: '🚀', color: '#a855f7', gradient: 'from-purple-500/20 to-violet-500/10' },
  boost_month: { label: 'Instant + Boost (1 Month)', stars: 6000, icon: '🚀', color: '#f59e0b', gradient: 'from-amber-500/20 to-orange-500/10' },
};

function ThankYouContent() {
  const params = useSearchParams();
  const entityType = params.get('type') || 'group';
  const tier = params.get('tier') || 'free';
  const name = params.get('name') || '';
  const payUrl = params.get('payUrl') || '';
  const entityId = params.get('id') || '';

  const info = TIER_INFO[tier] || TIER_INFO.free;
  const isPaid = tier !== 'free';
  const entityLabel = entityType === 'bot' ? 'Bot' : 'Group';

  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isPaid || !entityId) return;

    const check = async () => {
      try {
        const res = await fetch(`/api/submission-status?id=${entityId}&entity=${entityType}`);
        const data = await res.json();
        if (data.paid && data.status === 'approved') {
          setPaymentConfirmed(true);
          if (pollingRef.current) clearInterval(pollingRef.current);
        }
      } catch { /* retry next tick */ }
    };

    check();
    pollingRef.current = setInterval(check, 3000);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [isPaid, entityId, entityType]);

  // PAYMENT CONFIRMED
  if (isPaid && paymentConfirmed) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <Navbar />
        <main className="pt-24 pb-16 px-4 max-w-lg mx-auto">
          <div className={`rounded-3xl border border-white/10 overflow-hidden bg-gradient-to-br ${info.gradient}`}>
            <div className="p-8 text-center">
              <div className="text-6xl mb-4">🎉</div>
              <h1 className="text-2xl md:text-3xl font-black text-white mb-2">Payment Confirmed!</h1>
              <p className="text-[#bbb] text-sm mb-6">Your {entityLabel.toLowerCase()} is now live!</p>

              <div className="bg-black/30 rounded-2xl p-5 text-left space-y-3 mb-6 border border-white/5">
                <h3 className="text-xs font-bold text-[#666] uppercase tracking-wider mb-3">Summary</h3>
                {name && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-[#999]">{entityLabel}</span>
                    <span className="text-sm font-bold text-white">{decodeURIComponent(name)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#999]">Plan</span>
                  <span className="text-sm font-bold" style={{ color: info.color }}>{info.label}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#999]">Status</span>
                  <span className="text-sm font-bold text-green-400">✓ Approved & Live</span>
                </div>
                {(tier === 'boost_week' || tier === 'boost_month') && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-[#999]">Boost</span>
                    <span className="text-sm font-bold text-white">{tier === 'boost_week' ? '7 days' : '30 days'}</span>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <Link href="/add" className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full font-black text-white text-sm transition-all hover:opacity-90" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
                  + Add Another {entityLabel}
                </Link>
                <div className="flex gap-3">
                  <Link href="/groups" className="flex-1 inline-flex items-center justify-center px-4 py-2.5 rounded-full font-bold text-[#999] text-xs bg-white/5 border border-white/10 hover:border-white/20 transition-all">Browse Groups</Link>
                  <Link href="/bots" className="flex-1 inline-flex items-center justify-center px-4 py-2.5 rounded-full font-bold text-[#999] text-xs bg-white/5 border border-white/10 hover:border-white/20 transition-all">Browse Bots</Link>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // AWAITING PAYMENT — show the pay button
  if (isPaid && payUrl) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <Navbar />
        <main className="pt-24 pb-16 px-4 max-w-lg mx-auto">
          <div className="rounded-3xl border border-white/10 overflow-hidden bg-gradient-to-br from-amber-500/10 to-orange-500/5">
            <div className="p-8 text-center">
              <div className="text-6xl mb-4">⭐</div>
              <h1 className="text-2xl md:text-3xl font-black text-white mb-2">{entityLabel} Submitted!</h1>
              <p className="text-[#bbb] text-sm mb-6">Complete the payment in Telegram to activate your {entityLabel.toLowerCase()}.</p>

              <div className="bg-black/30 rounded-2xl p-5 text-left space-y-3 mb-6 border border-white/5">
                {name && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-[#999]">{entityLabel}</span>
                    <span className="text-sm font-bold text-white">{decodeURIComponent(name)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#999]">Plan</span>
                  <span className="text-sm font-bold" style={{ color: info.color }}>{info.label}</span>
                </div>
                {info.stars !== null && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-[#999]">Cost</span>
                    <span className="text-sm font-bold" style={{ color: info.color }}>{info.stars.toLocaleString()}★</span>
                  </div>
                )}
              </div>

              <a
                href={decodeURIComponent(payUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 w-full px-8 py-4 rounded-full font-black text-white text-base transition-all hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] mb-4"
                style={{ background: info.color }}
              >
                ⭐ Pay {info.stars?.toLocaleString()}★ in Telegram
              </a>

              <div className="flex items-center justify-center gap-2 text-xs text-[#555]">
                <div className="w-3 h-3 border-2 border-[#555] border-t-white rounded-full animate-spin" />
                This page will update automatically after payment
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // FREE SUBMISSION
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navbar />
      <main className="pt-24 pb-16 px-4 max-w-lg mx-auto">
        <div className={`rounded-3xl border border-white/10 overflow-hidden bg-gradient-to-br ${info.gradient}`}>
          <div className="p-8 text-center">
            <div className="text-6xl mb-4">{info.icon}</div>
            <h1 className="text-2xl md:text-3xl font-black text-white mb-2">Thank You!</h1>
            <p className="text-[#bbb] text-sm mb-6">Your {entityLabel.toLowerCase()} has been submitted successfully.</p>

            <div className="bg-black/30 rounded-2xl p-5 text-left space-y-3 mb-6 border border-white/5">
              {name && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#999]">{entityLabel}</span>
                  <span className="text-sm font-bold text-white">{decodeURIComponent(name)}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-sm text-[#999]">Status</span>
                <span className="text-sm font-bold text-yellow-400">Pending review (up to 7 days)</span>
              </div>
            </div>

            <div className="mb-6 p-3 rounded-xl bg-green-500/10 border border-green-500/20">
              <p className="text-sm text-green-400">Your {entityLabel.toLowerCase()} is in the moderation queue. We&apos;ll review it within 7 days.</p>
            </div>

            <div className="space-y-3">
              <Link href="/add" className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full font-black text-white text-sm transition-all hover:opacity-90" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
                + Add Another {entityLabel}
              </Link>
              <div className="flex gap-3">
                <Link href="/groups" className="flex-1 inline-flex items-center justify-center px-4 py-2.5 rounded-full font-bold text-[#999] text-xs bg-white/5 border border-white/10 hover:border-white/20 transition-all">Browse Groups</Link>
                <Link href="/bots" className="flex-1 inline-flex items-center justify-center px-4 py-2.5 rounded-full font-bold text-[#999] text-xs bg-white/5 border border-white/10 hover:border-white/20 transition-all">Browse Bots</Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ThankYouPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ThankYouContent />
    </Suspense>
  );
}
