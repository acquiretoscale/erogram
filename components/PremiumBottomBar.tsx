'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import ErogramWordmark from '@/components/ErogramWordmark';

const DISMISS_KEY = 'ero_premium_bar_dismissed';

/** Pages where the promo bar must never show. */
function isHiddenPath(pathname: string): boolean {
  const p = (pathname || '').toLowerCase().replace(/\/$/, '');
  return p === '/premium' || p === '/premium-x' || p.startsWith('/premium/') || p.startsWith('/premium-x/');
}

export default function PremiumBottomBar() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Hide from users who already have Premium.
    let cancelled = false;
    try {
      const dismissed = sessionStorage.getItem(DISMISS_KEY);
      if (dismissed) return;
    } catch {
      setVisible(true);
      return;
    }

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      setVisible(true);
      return;
    }

    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { if (!cancelled && !d?.premium) setVisible(true); })
      .catch(() => { if (!cancelled) setVisible(true); });

    return () => { cancelled = true; };
  }, []);

  if (!visible || isHiddenPath(pathname)) return null;

  function handleDismiss() {
    setVisible(false);
    try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch {}
  }

  return (
    <div className="premium-bottom-bar">
      <div className="premium-bottom-bar-inner">
        <div className="premium-bottom-bar-glow" />

        <div className="premium-bottom-bar-content">
          <div className="premium-bottom-bar-center">
            <Link href="/premium-x" className="premium-bottom-bar-cta">
              <span className="premium-bottom-bar-cta-icon" aria-hidden>🔓</span>
              <span className="premium-bottom-bar-cta-label">
                TRY <ErogramWordmark className="inline text-[1em]" textClassName="text-[#0a0a0a]" accent="#c0392f" /> PREMIUM
              </span>
            </Link>
            <span className="premium-bottom-bar-text">
              Unlock thousands of exclusive groups, rare niches, and fresher links
            </span>
          </div>
          <button
            onClick={handleDismiss}
            className="premium-bottom-bar-close"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
