'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem('cookie_consent')) setVisible(true);
    } catch {}
  }, []);

  const dismiss = useCallback((value: string) => {
    try { localStorage.setItem('cookie_consent', value); } catch {}
    setVisible(false);
  }, []);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed bottom-0 inset-x-0 z-[9999] safe-bottom"
    >
      <div className="bg-[#1a1a1a]/95 backdrop-blur-md border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <p className="text-[13px] sm:text-sm text-[#aaa] leading-relaxed mb-3">
            We use cookies to improve your experience and analyze site traffic.{' '}
            <Link href="/privacy" className="text-[#b31b1b] hover:underline">
              Privacy Policy
            </Link>
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => dismiss('declined')}
              className="flex-1 sm:flex-none px-5 py-3 sm:py-2 text-sm text-[#999] active:text-white border border-white/10 active:border-white/20 rounded-xl sm:rounded-lg transition-colors"
            >
              Decline
            </button>
            <button
              type="button"
              onClick={() => dismiss('accepted')}
              className="flex-1 sm:flex-none px-5 py-3 sm:py-2 text-sm font-semibold bg-[#b31b1b] active:bg-[#cc2222] text-white rounded-xl sm:rounded-lg transition-colors"
            >
              Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
