'use client';

import { useState, useEffect } from 'react';

const LS_KEY = 'age_verified';

function RtaBadge({ size = 'sm', className = '' }: { size?: 'sm' | 'lg'; className?: string }) {
  const isLg = size === 'lg';
  return (
    <a
      href="https://www.rtalabel.org/"
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-baseline bg-black rounded ${isLg ? 'px-3 py-1.5' : 'px-2 py-1'} gap-0.5 no-underline ${className}`}
      aria-label="RTA Label — Restricted To Adults"
    >
      <span className={`text-white font-black ${isLg ? 'text-lg' : 'text-sm'} tracking-wide leading-none`}>RTA</span>
      <span className={`text-white ${isLg ? 'text-[9px] -top-2' : 'text-[7px] -top-1.5'} font-bold leading-none relative`}>®</span>
    </a>
  );
}

export default function AgeGate() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(LS_KEY)) return;
      setVisible(true);
    } catch {
      // localStorage blocked (incognito / restricted) — skip gate
    }
  }, []);

  const confirm = () => {
    try { localStorage.setItem(LS_KEY, '1'); } catch {}
    setVisible(false);
  };

  const deny = () => {
    window.location.replace('https://www.google.com');
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Age verification"
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
    >
      <div className="w-full max-w-sm bg-white rounded-2xl overflow-hidden shadow-2xl border border-black/10">
        <div className="px-5 pt-5 pb-1">
          <span className="text-black text-[15px] font-black tracking-tight leading-none">
            EROGRAM<span className="text-[#b31b1b]">.PRO</span>
          </span>
        </div>

        <div className="px-5 pb-5 pt-3">
          <p className="text-[#333] text-[14px] font-medium mb-1">
            This website contains Adult and NSFW content.
          </p>
          <p className="text-[#999] text-[12px] mb-5">
            You must be 18 or older to enter.
          </p>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={confirm}
              className="w-full py-3 rounded-xl bg-[#22c55e] hover:bg-[#16a34a] text-white text-sm font-semibold active:bg-[#15803d] transition-colors"
            >
              I am 18 or older — Enter
            </button>
            <button
              type="button"
              onClick={deny}
              className="w-full py-3 rounded-xl border border-black/10 text-[#999] text-sm active:text-black active:border-black/20 transition-colors"
            >
              I am under 18 — Leave
            </button>
          </div>

          <div className="flex items-center justify-center gap-3 mt-4">
            <span className="text-[11px] text-[#aaa]">© Erogram.pro 2026</span>
            <RtaBadge />
          </div>
        </div>
      </div>
    </div>
  );
}

export { RtaBadge };
