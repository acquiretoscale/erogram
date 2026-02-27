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

export default function SiteBeacon() {
  useEffect(() => {
    const ping = () => {
      try {
        const sid = getSid();
        fetch('/api/beacon', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sid }),
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
