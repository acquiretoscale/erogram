'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getLatestSale } from '@/lib/actions/adminStats';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) arr[i] = raw.charCodeAt(i);
  return arr;
}

interface ToastData {
  type: 'sale';
  plan?: string;
  method?: string;
  username?: string | null;
}

export default function AdminSaleAlert() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const lastPollRef = useRef(Date.now());
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const addToast = (t: ToastData) => {
    setToasts(prev => [...prev, t]);
    setTimeout(() => setToasts(prev => prev.slice(1)), 8000);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const admin = localStorage.getItem('isAdmin') === 'true';
    if (!admin) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.isAdmin) setIsAdmin(true); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) return;

    (async () => {
      try {
        await navigator.serviceWorker.register('/sw.js');
        const reg = await navigator.serviceWorker.ready;
        const existing = await reg.pushManager.getSubscription();
        if (existing) { setPushEnabled(true); return; }

        const perm = await Notification.requestPermission();
        if (perm !== 'granted') return;

        const res = await fetch('/api/admin/push/vapid-key');
        if (!res.ok) return;
        const { publicKey } = await res.json();
        if (!publicKey) return;

        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });

        const token = localStorage.getItem('token');
        await fetch('/api/admin/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ subscription: sub.toJSON() }),
        });

        setPushEnabled(true);
      } catch (err) {
        console.warn('[AdminSaleAlert] Push setup failed:', err);
      }
    })();
  }, [isAdmin]);

  const pollForEvents = useCallback(async () => {
    if (!isAdmin) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const { sale } = await getLatestSale(token, lastPollRef.current);
      if (sale) {
        lastPollRef.current = Date.now();
        addToast({ type: 'sale', plan: sale.plan, method: sale.method, username: sale.username });
      }
    } catch {}
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    lastPollRef.current = Date.now();
    pollIntervalRef.current = setInterval(pollForEvents, 30_000);
    return () => { if (pollIntervalRef.current) clearInterval(pollIntervalRef.current); };
  }, [isAdmin, pollForEvents]);

  if (!isAdmin || toasts.length === 0) return null;

  return (
    <>
      {toasts.map((toast, i) => (
        <div
          key={i}
          className="fixed right-4 z-[9999] max-w-xs transition-all"
          style={{
            top: `${16 + i * 72}px`,
            background: '#16a34a',
            color: '#fff',
            borderRadius: '12px',
            padding: '12px 16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">💰</span>
            <div>
              <p className="text-sm font-bold">New Sale!</p>
              <p className="text-xs opacity-90">
                {toast.plan === 'yearly' ? 'Yearly' : toast.plan === 'monthly' ? 'Monthly' : 'Lifetime'}
                {' · '}
                {toast.method === 'stars' ? '⭐ Stars' : '₿ Crypto'}
                {toast.username ? ` · @${toast.username}` : ''}
              </p>
            </div>
            <button onClick={() => setToasts(prev => prev.filter((_, j) => j !== i))} className="ml-auto text-white/70 hover:text-white text-lg leading-none">&times;</button>
          </div>
        </div>
      ))}
    </>
  );
}
