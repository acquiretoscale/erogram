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
        <div className="w-6 h-6 border-2 border-white/20 border-t-[#0ea5e9] rounded-full animate-spin" />
      </div>
    );
  }

  if (authed) return <>{children}</>;

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4 overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-to-b from-[#0ea5e9]/8 to-transparent rounded-full blur-[120px] opacity-40" />
        <div className="absolute bottom-0 right-0 w-[800px] h-[800px] bg-[#0ea5e9]/5 rounded-full blur-[140px] opacity-20" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#0ea5e9]/20 border border-[#0ea5e9]/30 mb-4" style={{ boxShadow: '4px 4px 0px #0ea5e9' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#38bdf8]">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h1 className="text-2xl font-black text-white mb-1">Erogram Media Kit</h1>
          <p className="text-sm text-white/40">Exclusive access for advertising partners</p>
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
              className="w-full px-5 py-4 bg-white/5 border border-white/10 text-white text-center text-lg tracking-widest placeholder:tracking-normal placeholder:text-white/30 focus:ring-2 focus:ring-[#0ea5e9]/50 focus:border-[#0ea5e9]/50 outline-none disabled:opacity-50 transition-all rounded-none"
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
            className="w-full py-4 text-white font-black text-sm tracking-widest uppercase transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: '#0ea5e9', border: '3px solid #000', boxShadow: '4px 4px 0px #000' }}
          >
            {submitting ? 'Verifying...' : 'Access Media Kit'}
          </button>
        </form>

        <p className="text-center text-white/30 text-xs mt-6">
          Don&apos;t have access? Contact{' '}
          <a href="mailto:erogrampro@gmail.com" className="text-sky-400 hover:text-sky-300 transition-colors">
            our team
          </a>
        </p>
      </motion.div>
    </div>
  );
}
