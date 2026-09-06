'use client';

import { useState, useEffect, useCallback } from 'react';
import { recordPwaInstall } from '@/lib/actions/pwaInstall';
import { subscribeUserPush } from '@/lib/actions/userPush';

const DISMISS_KEY = 'pwa_install_dismissed';
const CLIENT_KEY = 'pwa_install_client';
const RECORDED_KEY = 'pwa_install_recorded';
const PUSH_KEY = 'pwa_push_subscribed';
const DISMISS_DAYS = 14;
const SW_URL = '/sw.js?v=8';
const APP_NAME = 'EROGRAMX ADULT ENTRETAINEMENT HUB';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isMobileUa(): boolean {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

function isIosDevice(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as Window & { MSStream?: unknown }).MSStream;
}

function wasDismissedRecently(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const until = Number(raw);
    if (!Number.isFinite(until)) return true;
    return Date.now() < until;
  } catch {
    return false;
  }
}

function getClientId(): string {
  try {
    let id = localStorage.getItem(CLIENT_KEY);
    if (id && id.length >= 8) return id;
    id = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : `c-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(CLIENT_KEY, id);
    return id;
  } catch {
    return `c-${Date.now()}`;
  }
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) arr[i] = raw.charCodeAt(i);
  return arr;
}

function recordInstall() {
  try {
    if (localStorage.getItem(RECORDED_KEY) === '1') {
      const token = localStorage.getItem('token');
      if (token) recordPwaInstall(token, getClientId()).catch(() => {});
      return;
    }
    const token = localStorage.getItem('token');
    const clientId = getClientId();
    recordPwaInstall(token, clientId)
      .then((r) => {
        if (r?.ok) localStorage.setItem(RECORDED_KEY, '1');
      })
      .catch(() => {});
  } catch {}
}

async function subscribePush() {
  try {
    if (localStorage.getItem(PUSH_KEY) === '1') return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return;
    await navigator.serviceWorker.register(SW_URL);
    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    let sub = existing;
    if (!sub) {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') return;
      const res = await fetch('/api/admin/push/vapid-key');
      if (!res.ok) return;
      const { publicKey } = await res.json();
      if (!publicKey) return;
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    }
    const token = localStorage.getItem('token');
    const json = sub.toJSON();
    const r = await subscribeUserPush(token, {
      endpoint: json.endpoint || '',
      keys: { p256dh: json.keys?.p256dh || '', auth: json.keys?.auth || '' },
    });
    if (r?.ok) localStorage.setItem(PUSH_KEY, '1');
  } catch {}
}

export default function PwaInstallBanner() {
  const [visible, setVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [showIosTip, setShowIosTip] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isStandalone()) {
      recordInstall();
      subscribePush();
      return;
    }

    const onInstalled = () => {
      recordInstall();
      subscribePush();
      setVisible(false);
    };
    window.addEventListener('appinstalled', onInstalled);

    if (!isMobileUa() || wasDismissedRecently()) {
      return () => window.removeEventListener('appinstalled', onInstalled);
    }

    const isLoggedIn = () => {
      try {
        return Boolean(localStorage.getItem('token'));
      } catch {
        return false;
      }
    };

    setIsIOS(isIosDevice());

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register(SW_URL).catch(() => {});
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      if (isLoggedIn()) setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);

    let iosTimer: ReturnType<typeof setTimeout> | undefined;
    if (isIosDevice() && isLoggedIn()) {
      iosTimer = setTimeout(() => setVisible(true), 2500);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      if (iosTimer) clearTimeout(iosTimer);
    };
  }, []);

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_DAYS * 86400000));
    } catch {}
    setVisible(false);
    setShowIosTip(false);
  }, []);

  const install = useCallback(async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      if (choice.outcome === 'accepted') {
        recordInstall();
        subscribePush();
        setVisible(false);
        return;
      }
      dismiss();
      return;
    }
    if (isIOS) setShowIosTip(true);
  }, [deferredPrompt, dismiss, isIOS]);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label={APP_NAME}
      className="fixed bottom-0 inset-x-0 z-[9998] safe-bottom pointer-events-none"
    >
      <div className="pointer-events-auto mx-auto max-w-lg px-3 pb-3">
        <div
          className="overflow-hidden rounded-3xl border border-[#2AABEE]/30 shadow-[0_0_40px_rgba(42,171,238,0.18)]"
          style={{ background: 'linear-gradient(180deg, #17212b 0%, #0e1621 100%)' }}
        >
          <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #f5d061, #c9973a, #2AABEE)' }} />
          {showIosTip ? (
            <div className="px-4 py-4 space-y-3">
              <p className="text-[13px] text-white/80 leading-relaxed">
                Tap the Share button (box with arrow) at the bottom of Safari, then tap &quot;Add to Home Screen&quot;.
              </p>
              <button
                type="button"
                onClick={dismiss}
                className="w-full py-2.5 text-sm font-black uppercase tracking-wide rounded-full text-[#2a1f00]"
                style={{ background: 'linear-gradient(135deg, #f5d061 0%, #c9973a 45%, #a67c00 100%)' }}
              >
                Got it
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 px-4 py-3.5">
              <img
                src="/icons/icon-192.png?v=6"
                alt=""
                width={52}
                height={52}
                className="rounded-2xl shrink-0 ring-1 ring-white/15"
              />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[#2AABEE] leading-none mb-1">Download App</p>
                <p className="text-[13px] font-black text-white leading-tight">{APP_NAME}</p>
              </div>
              <button
                type="button"
                onClick={install}
                className="shrink-0 px-4 py-2.5 text-[11px] font-black uppercase tracking-wide rounded-full text-[#2a1f00]"
                style={{ background: 'linear-gradient(135deg, #f5d061 0%, #c9973a 45%, #a67c00 100%)' }}
              >
                Install
              </button>
              <button
                type="button"
                onClick={dismiss}
                aria-label="Dismiss"
                className="shrink-0 w-8 h-8 flex items-center justify-center text-white/40 active:text-white"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
