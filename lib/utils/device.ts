export type DeviceInfo = {
  userAgent: string;
  isMobile: boolean;
  isTelegram: boolean;
};

/**
 * Very small UA-based detection to avoid client-only `useEffect()` toggles that cause CLS.
 *
 * Notes:
 * - This is best-effort; we intentionally keep it conservative.
 * - If the UA is missing, we default to desktop + non-Telegram.
 */
export function detectDeviceFromUserAgent(userAgent: string | null | undefined): DeviceInfo {
  const ua = String(userAgent || '');

  // Telegram in-app browsers include "Telegram".
  const isTelegram = /Telegram/i.test(ua);

  // Common mobile signals.
  const isMobile = /(Mobi|Android|iPhone|iPad|iPod|IEMobile|BlackBerry)/i.test(ua);

  return { userAgent: ua, isMobile, isTelegram };
}

