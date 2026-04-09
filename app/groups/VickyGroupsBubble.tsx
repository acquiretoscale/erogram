'use client';

import { useState } from 'react';

export default function VickyGroupsBubble() {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('vicky_groups_dismissed') === '1';
    return false;
  });
  const [expanded, setExpanded] = useState(false);

  if (dismissed) return null;

  const upgradeHref = typeof window !== 'undefined' && localStorage.getItem('token')
    ? '/welcome' : '/login?redirect=/welcome';

  const dismiss = () => { setDismissed(true); localStorage.setItem('vicky_groups_dismissed', '1'); };

  return (
    <>
      {/* Expanded panel */}
      {expanded && (
        <div className="fixed bottom-5 right-5 z-50 w-[320px] rounded-2xl overflow-hidden shadow-2xl animate-[fadeInUp_0.2s_ease-out]"
          style={{ background: 'linear-gradient(160deg, #0a0f1e 0%, #0d1628 50%, #0a1220 100%)', border: '2px solid rgba(0,175,240,0.25)', boxShadow: '0 12px 60px rgba(0,0,0,0.7), 0 0 40px rgba(0,175,240,0.15)' }}>
          {/* Header bar */}
          <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center gap-2">
              <div className="relative shrink-0">
                <img src="/assets/vicky-ai-avatar.jpg" alt="" className="w-9 h-9 rounded-full ring-2 ring-[#00aff0]/30" style={{ objectFit: 'cover', objectPosition: '50% 40%' }} />
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#0d1628]" />
              </div>
              <div>
                <div className="text-[12px] font-black text-white leading-tight">Vicky AI</div>
                <div className="text-[9px] text-[#00aff0]/70 font-medium">AI Assistant</div>
              </div>
            </div>
            <div className="flex items-center gap-0.5">
              <button onClick={() => setExpanded(false)} title="Minimize"
                className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-white/10 transition">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14"/></svg>
              </button>
              <button onClick={dismiss} title="Close"
                className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-red-500/20 transition">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
          </div>

          {/* Video */}
          <video src="https://pub-5800916b33a845e4b67e2d5be553c1e3.r2.dev/tgempire/booty-bazaar/wmremove-transformed.mp4"
            autoPlay muted loop playsInline className="w-full" style={{ maxHeight: '220px', objectFit: 'contain', background: '#000' }} />

          {/* CTA section */}
          <div className="px-5 py-4">
            <h3 className="text-[14px] font-black text-white mb-1">Meet Vicky AI</h3>
            <p className="text-[11px] text-white/40 mb-3 leading-relaxed">Your personal Erogram assistant — find the best creators, groups & tools instantly.</p>
            <a href={upgradeHref}
              className="block w-full py-2.5 rounded-xl text-[12px] font-bold text-white text-center transition-all hover:brightness-110"
              style={{ background: '#16a34a', boxShadow: '0 4px 12px rgba(22,163,74,0.3)' }}>
              Upgrade to VIP to unlock
            </a>
          </div>
        </div>
      )}

      {/* Floating button — matches profile page style */}
      {!expanded && (
        <div className="fixed bottom-6 right-6" style={{ zIndex: 9998 }}>
          <button onClick={() => setExpanded(true)}
            className="flex items-center gap-2.5 pl-1.5 pr-4 py-1.5 rounded-full transition-all duration-200 hover:scale-105 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #0d1628, #141e33)', border: '2px solid rgba(0,175,240,0.4)', boxShadow: '0 4px 30px rgba(0,175,240,0.3), 0 8px 32px rgba(0,0,0,0.5)' }}>
            <div className="relative shrink-0">
              <img src="/assets/vicky-ai-avatar.jpg" alt="Vicky AI" className="w-14 h-14 rounded-full ring-2 ring-[#00aff0]/40" style={{ objectFit: 'cover', objectPosition: '50% 40%' }} />
              <span className="absolute top-0 right-0 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[#0d1628]" />
            </div>
            <div className="text-left">
              <div className="text-[12px] font-bold text-white leading-tight">Ask Vicky</div>
              <div className="text-[9px] text-[#00aff0]/70 font-medium">AI Assistant</div>
            </div>
          </button>
        </div>
      )}
    </>
  );
}
