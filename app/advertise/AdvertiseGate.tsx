'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const STORAGE_KEY = 'erogram_advertise_auth';

interface AdvertiseGateProps {
  children: React.ReactNode;
}

export default function AdvertiseGate({ children }: AdvertiseGateProps) {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored === '1') setAuthed(true);
    setChecking(false);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/advertise-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password.trim() }),
      });
      const data = await res.json();
      if (data.ok) {
        sessionStorage.setItem(STORAGE_KEY, '1');
        setAuthed(true);
      } else {
        setError('Invalid access code');
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-[#111111] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-white/20 border-t-[#b31b1b] rounded-full animate-spin" />
      </div>
    );
  }

  if (authed) return <>{children}</>;

  return (
    <div className="min-h-screen bg-[#111111] flex items-center justify-center px-4 overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-to-b from-[#ff0000]/10 to-transparent rounded-full blur-[100px] opacity-30" />
        <div className="absolute bottom-0 right-0 w-[800px] h-[800px] bg-[#ff3366]/5 rounded-full blur-[120px] opacity-20" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#b31b1b]/20 border border-[#b31b1b]/30 mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#ff3366]">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h1 className="text-2xl font-black text-[#f5f5f5] mb-1">Erogram Media Kit</h1>
          <p className="text-sm text-[#999]">Exclusive access for advertising partners</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              placeholder="Enter access code"
              autoFocus
              disabled={submitting}
              className="w-full px-5 py-4 rounded-xl glass border border-white/10 text-[#f5f5f5] text-center text-lg tracking-widest placeholder:tracking-normal placeholder:text-[#999] focus:ring-2 focus:ring-[#b31b1b]/50 focus:border-[#b31b1b]/50 outline-none disabled:opacity-50 transition-all bg-white/[0.03]"
            />
          </div>

          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-[#ff3366] text-sm text-center"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          <button
            type="submit"
            disabled={submitting || !password.trim()}
            className="w-full py-4 rounded-xl bg-[#b31b1b] hover-glow text-white font-bold text-sm tracking-wide uppercase transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
          >
            {submitting ? 'Verifying...' : 'Access Media Kit'}
          </button>
        </form>

        <p className="text-center text-[#999] text-xs mt-6">
          Don&apos;t have access? Contact{' '}
          <a href="mailto:erogrampro@gmail.com" className="text-[#b31b1b] hover:text-[#ff3366] transition-colors">
            our team
          </a>
        </p>
      </motion.div>
    </div>
  );
}
