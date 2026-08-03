'use client';

import { useEffect } from 'react';

function getSid(): string {
  const KEY = '__ero_sid';
  try {
    let sid = sessionStorage.getItem(KEY);
    if (!sid) {
      sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem(KEY, sid);
    }
    return sid;
  } catch {
    return Math.random().toString(36).slice(2);
  }
}

function getCountryCookie(): string | undefined {
  try {
    const match = document.cookie.match(/(?:^|;\s*)__ero_cc=([A-Z]{2})/);
    return match?.[1];
  } catch {
    return undefined;
  }
}

export default function SiteBeacon() {
  useEffect(() => {
    const ping = () => {
      try {
        const sid = getSid();
        const country = getCountryCookie();
        fetch('/api/beacon', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(country ? { sid, country } : { sid }),
          keepalive: true,
        }).catch(() => {});
      } catch {}
    };

    ping();
    setTimeout(ping, 30_000);
    const id = setInterval(ping, 3 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  return null;
}
