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

  return (
    <form onSubmit={handleSubmit} className="max-w-lg mx-auto text-left space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">
          Name *
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          disabled={status === 'sending'}
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:opacity-60"
          placeholder="Your name"
        />
      </div>
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
          Email *
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          disabled={status === 'sending'}
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:opacity-60"
          placeholder="your@email.com"
        />
      </div>
      <div>
        <label htmlFor="company" className="block text-sm font-medium text-gray-300 mb-1">
          Company (optional)
        </label>
        <input
          id="company"
          name="company"
          type="text"
          disabled={status === 'sending'}
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:opacity-60"
          placeholder="Company or brand"
        />
      </div>
      <div>
        <label htmlFor="message" className="block text-sm font-medium text-gray-300 mb-1">
          Message *
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={4}
          disabled={status === 'sending'}
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none disabled:opacity-60"
          placeholder="Tell us about your campaign, goals, or questions..."
        />
      </div>
      {status === 'success' && (
        <p className="text-green-400 text-sm">Thanks! Your message was sent. We’ll get back to you soon.</p>
      )}
      {status === 'error' && errorMessage && (
        <p className="text-red-400 text-sm">{errorMessage}</p>
      )}
      <button
        type="submit"
        disabled={status === 'sending'}
        className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:from-gray-600 disabled:to-gray-600 text-white font-black px-8 py-4 rounded-xl text-lg transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-blue-500/30 disabled:cursor-not-allowed"
      >
        {status === 'sending' ? 'Sending...' : 'Send message'}
      </button>
    </form>
  );
}
