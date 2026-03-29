'use client';

import { useState } from 'react';

export default function AdvertiseContactForm() {
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const name = (formData.get('name') as string)?.trim();
    const email = (formData.get('email') as string)?.trim();
    const message = (formData.get('message') as string)?.trim();
    const company = (formData.get('company') as string)?.trim();

    if (!name || !email || !message) {
      setStatus('error');
      setErrorMessage('Please fill in name, email, and message.');
      return;
    }

    setStatus('sending');
    setErrorMessage('');

    try {
      const res = await fetch('/api/advertise-contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message, company: company || undefined }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setStatus('error');
        setErrorMessage(data?.error || 'Something went wrong. Please try again.');
        return;
      }
      setStatus('success');
      form.reset();
    } catch {
      setStatus('error');
      setErrorMessage('Network error. Please try again.');
    }
  }

  const inputCls = 'w-full px-4 py-3 text-sm font-semibold bg-white text-black placeholder-black/30 focus:outline-none focus:ring-2 focus:ring-sky-500/60 rounded-none disabled:opacity-60';

  return (
    <form onSubmit={handleSubmit} className="max-w-lg mx-auto text-left space-y-4">
      <div>
        <label htmlFor="adv-name" className="block text-xs font-black uppercase tracking-widest text-sky-300 mb-1">
          Name *
        </label>
        <input
          id="adv-name"
          name="name"
          type="text"
          required
          disabled={status === 'sending'}
          className={inputCls}
          placeholder="Your name"
        />
      </div>
      <div>
        <label htmlFor="adv-email" className="block text-xs font-black uppercase tracking-widest text-sky-300 mb-1">
          Email *
        </label>
        <input
          id="adv-email"
          name="email"
          type="email"
          required
          disabled={status === 'sending'}
          className={inputCls}
          placeholder="your@email.com"
        />
      </div>
      <div>
        <label htmlFor="adv-company" className="block text-xs font-black uppercase tracking-widest text-sky-300 mb-1">
          Company <span className="normal-case font-normal text-white/30">(optional)</span>
        </label>
        <input
          id="adv-company"
          name="company"
          type="text"
          disabled={status === 'sending'}
          className={inputCls}
          placeholder="Company or brand"
        />
      </div>
      <div>
        <label htmlFor="adv-message" className="block text-xs font-black uppercase tracking-widest text-sky-300 mb-1">
          Message *
        </label>
        <textarea
          id="adv-message"
          name="message"
          required
          rows={4}
          disabled={status === 'sending'}
          className={`${inputCls} resize-none`}
          placeholder="Tell us about your campaign, goals, or questions..."
        />
      </div>
      {status === 'success' && (
        <p className="text-emerald-400 text-sm font-bold">Thanks! Your message was sent. We&apos;ll get back to you soon.</p>
      )}
      {status === 'error' && errorMessage && (
        <p className="text-red-400 text-sm">{errorMessage}</p>
      )}
      <button
        type="submit"
        disabled={status === 'sending'}
        className="w-full flex items-center justify-center gap-2 text-white font-black px-8 py-4 text-sm uppercase tracking-widest transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        style={{ background: '#0ea5e9', border: '3px solid #000', boxShadow: '4px 4px 0px #000' }}
      >
        {status === 'sending' ? 'Sending...' : 'Send Message'}
      </button>

      <div className="pt-2 border-t border-white/10 flex flex-col sm:flex-row items-center justify-center gap-3 text-[11px] text-white/30 font-semibold">
        <span>Questions? Reach us at:</span>
        <a href="mailto:erogram@gmail.com" className="text-sky-400 hover:text-sky-300 transition-colors">
          erogram@gmail.com
        </a>
        <span className="hidden sm:inline text-white/15">·</span>
        <a
          href="https://t.me/RVN8888"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sky-400 hover:text-sky-300 transition-colors"
        >
          @RVN8888 on Telegram
        </a>
      </div>
    </form>
  );
}
