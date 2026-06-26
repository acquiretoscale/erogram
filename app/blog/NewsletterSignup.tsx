'use client';

import { useState } from 'react';
import { subscribeNewsletter } from '@/lib/actions/newsletter';

// Lean newsletter capture — stores the email and shows a thank-you confirmation.
// `source` lets us see where a subscriber signed up (blog hub vs a specific article).
export default function NewsletterSignup({ source = 'blog' }: { source?: string }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === 'loading') return;
    setStatus('loading');
    setError('');
    const res = await subscribeNewsletter(email, source);
    if (res.ok) {
      setStatus('done');
      setEmail('');
    } else {
      setError(res.error || 'Something went wrong.');
      setStatus('error');
    }
  };

  return (
    <div className="bg-white px-6 sm:px-8 pt-4 pb-20">
      <div
        className="max-w-[1080px] mx-auto rounded-2xl px-7 py-10 sm:px-12 sm:py-12 flex flex-col md:flex-row md:items-center md:justify-between gap-8"
        style={{ background: 'linear-gradient(135deg, #1a0a08 0%, #0c0706 60%, #0c0706 100%)' }}
      >
        <div className="md:max-w-md">
          <div className="text-[10px] font-bold tracking-[0.35em] uppercase text-[#e07a6f] mb-3">Stay Informed</div>
          <h2 className="font-sans font-black text-[1.7rem] sm:text-[2rem] leading-[1.1] tracking-tight text-white mb-2">
            The best of adult AI, in your inbox.
          </h2>
          <p className="text-[13.5px] text-[#a39e96] leading-relaxed">
            New AI NSFW tools, top OnlyFans creators and the freshest Telegram drops — one email a month. No spam.
          </p>
        </div>

        {status === 'done' ? (
          <div className="w-full md:w-auto md:shrink-0 flex items-center gap-3 rounded-[8px] border border-[#c0392f]/40 bg-[#c0392f]/[0.12] px-5 py-4">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[#c0392f] text-white shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            </span>
            <div>
              <p className="text-[14px] font-bold text-white leading-tight">You&apos;re subscribed!</p>
              <p className="text-[12.5px] text-[#a39e96] leading-tight mt-0.5">Thanks — we&apos;ll be in touch.</p>
            </div>
          </div>
        ) : (
          <div className="w-full md:w-auto md:shrink-0">
            <form className="flex gap-0" onSubmit={submit}>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (status === 'error') setStatus('idle'); }}
                placeholder="you@email.com"
                className="flex-1 md:w-64 bg-white/[0.06] border border-white/[0.14] border-r-0 rounded-l-[6px] px-4 py-3 text-[13px] text-[#f0ece6] placeholder:text-[#6a6258] outline-none focus:border-white/30 transition-colors"
              />
              <button
                type="submit"
                disabled={status === 'loading'}
                className="shrink-0 bg-[#c0392f] hover:bg-[#d8453a] disabled:opacity-60 text-white text-[11px] font-bold tracking-[0.22em] uppercase px-6 py-3 rounded-r-[6px] transition-colors"
              >
                {status === 'loading' ? '...' : 'Subscribe'}
              </button>
            </form>
            {status === 'error' && <p className="text-[12px] text-[#e07a6f] mt-2">{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
