'use client';

import { useState, useCallback, createContext, useContext, type ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++nextId;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {toasts.length > 0 && (
        <div
          style={{ position: 'fixed', bottom: 16, right: 16, zIndex: 10000, display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none', maxWidth: 340 }}
        >
          {toasts.map(t => (
            <div
              key={t.id}
              style={{
                pointerEvents: 'auto',
                borderRadius: 12,
                padding: '12px 16px',
                fontSize: 13,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                backdropFilter: 'blur(16px)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                background: t.type === 'error' ? '#2a0a0a' : t.type === 'success' ? '#0a1a0a' : '#1a150a',
                border: `1px solid ${t.type === 'error' ? 'rgba(239,68,68,0.25)' : t.type === 'success' ? 'rgba(34,197,94,0.25)' : 'rgba(201,151,58,0.25)'}`,
                color: t.type === 'error' ? '#fca5a5' : t.type === 'success' ? '#86efac' : '#e8d5a8',
                animation: 'toastSlideIn 0.25s ease-out',
              }}
            >
              <span style={{ marginTop: 2, flexShrink: 0 }}>
                {t.type === 'error' ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>
                ) : t.type === 'success' ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
                )}
              </span>
              <span style={{ lineHeight: 1.4 }}>{t.message}</span>
              <button
                onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
                style={{ marginLeft: 'auto', flexShrink: 0, opacity: 0.4, background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, marginTop: 2 }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}
