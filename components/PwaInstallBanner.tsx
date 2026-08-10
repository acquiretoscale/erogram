'use client';

import { useState, useEffect, useCallback } from 'react';
import { recordPwaInstall } from '@/lib/actions/pwaInstall';

const DISMISS_KEY = 'pwa_install_dismissed';
const CLIENT_KEY = 'pwa_install_client';
const RECORDED_KEY = 'pwa_install_recorded';
const DISMISS_DAYS = 14;
const SW_URL = '/sw.js?v=7';

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

function recordInstall() {
  try {
    if (localStorage.getItem(RECORDED_KEY) === '1') {
      // Still sync user link if they log in later after a guest install
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

export default function PwaInstallBanner() {
  const [visible, setVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [showIosTip, setShowIosTip] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isStandalone()) {
      recordInstall();
      return;
    }

    // Install detection runs even when the banner is hidden or dismissed.
    const onInstalled = () => {
      recordInstall();
      setVisible(false);
    };
    window.addEventListener('appinstalled', onInstalled);

    if (!isMobileUa() || wasDismissedRecently()) {
      return () => window.removeEventListener('appinstalled', onInstalled);
    }

    setIsIOS(isIosDevice());

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register(SW_URL).catch(() => {});
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);

    let iosTimer: ReturnType<typeof setTimeout> | undefined;
    if (isIosDevice()) {
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
      aria-label="Install Erogram"
      className="fixed bottom-0 inset-x-0 z-[9998] safe-bottom pointer-events-none"
    >
      <div className="pointer-events-auto mx-auto max-w-lg px-3 pb-3">
        <div className="rounded-2xl border border-black/10 bg-white shadow-2xl px-4 py-3.5">
          {showIosTip ? (
            <div className="space-y-3">
              <p className="text-[13px] text-[#333] leading-relaxed">
                Tap the Share button (box with arrow) at the bottom of Safari, then tap &quot;Add to Home Screen&quot;.
              </p>
              <button
                type="button"
                onClick={dismiss}
                className="w-full py-2.5 text-sm font-semibold text-white bg-[#b31b1b] active:bg-[#cc2222] rounded-xl transition-colors"
              >
                Got it
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <img
                src="/icons/icon-192.png?v=6"
                alt=""
                width={44}
                height={44}
                className="rounded-xl shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[#111] leading-tight">Erogram</p>
                <p className="text-[12px] text-[#666] mt-0.5">Download App</p>
              </div>
              <button
                type="button"
                onClick={install}
                className="shrink-0 px-4 py-2 text-sm font-semibold text-white bg-[#b31b1b] active:bg-[#cc2222] rounded-xl transition-colors"
              >
                Install
              </button>
              <button
                type="button"
                onClick={dismiss}
                aria-label="Dismiss"
                className="shrink-0 w-8 h-8 flex items-center justify-center text-[#999] active:text-[#111]"
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
