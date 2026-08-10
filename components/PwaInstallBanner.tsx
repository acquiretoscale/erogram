'use client';

import { useState, useEffect, useCallback } from 'react';
import { markPwaInstalled } from '@/lib/actions/pwaInstall';

const DISMISS_KEY = 'pwa_install_dismissed';
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

function recordInstallIfLoggedIn() {
  try {
    const token = localStorage.getItem('token');
    if (token) markPwaInstalled(token).catch(() => {});
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
      recordInstallIfLoggedIn();
      return;
    }
    if (!isMobileUa() || wasDismissedRecently()) return;

    setIsIOS(isIosDevice());

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register(SW_URL).catch(() => {});
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    const onInstalled = () => {
      recordInstallIfLoggedIn();
      setVisible(false);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);

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
        recordInstallIfLoggedIn();
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
        <div className="rounded-2xl border border-white/10 bg-[#1a1a1a]/95 backdrop-blur-md shadow-xl px-4 py-3.5">
          {showIosTip ? (
            <div className="space-y-3">
              <p className="text-[13px] text-[#ccc] leading-relaxed">
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
                <p className="text-sm font-semibold text-white leading-tight">Erogram</p>
                <p className="text-[12px] text-[#999] mt-0.5">Download App</p>
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
                className="shrink-0 w-8 h-8 flex items-center justify-center text-[#888] active:text-white"
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
