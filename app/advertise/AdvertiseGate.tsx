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
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (authed) return <>{children}</>;

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h1 className="text-2xl font-black text-white mb-1">Erogram Media Kit</h1>
          <p className="text-sm text-gray-500">Exclusive access for advertising partners</p>
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
              className="w-full px-5 py-4 rounded-xl bg-white/5 border border-white/10 text-white text-center text-lg tracking-widest placeholder:tracking-normal placeholder:text-gray-600 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 outline-none disabled:opacity-50 transition-all"
            />
          </div>

          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-red-400 text-sm text-center"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          <button
            type="submit"
            disabled={submitting || !password.trim()}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-sm tracking-wide uppercase transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? 'Verifying...' : 'Access Media Kit'}
          </button>
        </form>

        <p className="text-center text-gray-600 text-xs mt-6">
          Don&apos;t have access? Contact{' '}
          <a href="mailto:adilmaf.agency@gmail.com" className="text-amber-500/80 hover:text-amber-400 transition-colors">
            our team
          </a>
        </p>
      </motion.div>
    </div>
  );
}
