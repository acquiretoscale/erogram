'use client';

import { useState } from 'react';
import Image from 'next/image';

const CTA = '#facc15';
const BORDER = '3px solid #000000';
const SHADOW = '5px 5px 0px #000000';

export default function CheckoutForm() {
  const [toolName, setToolName] = useState('');
  const [email, setEmail] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/payments/custom-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountUsd: Number(amount), toolName, email, note }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data?.message || 'Something went wrong. Please try again.');
        setLoading(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  const inputCls = 'w-full px-3 py-2.5 text-base font-semibold bg-white text-black placeholder-black/30 outline-none focus:ring-2 focus:ring-[#facc15]';

  return (
    <form onSubmit={handlePay} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-black uppercase tracking-widest text-black mb-1.5">Tool name</label>
          <input
            type="text"
            maxLength={120}
            value={toolName}
            onChange={(e) => setToolName(e.target.value)}
            required
            className={inputCls}
            style={{ border: '2px solid #000' }}
          />
        </div>
        <div>
          <label className="block text-xs font-black uppercase tracking-widest text-black mb-1.5">Email</label>
          <input
            type="email"
            autoComplete="email"
            maxLength={160}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={inputCls}
            style={{ border: '2px solid #000' }}
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-black uppercase tracking-widest text-black mb-1.5">Amount (USD)</label>
        <input
          type="number"
          min="1"
          max="100000"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0"
          required
          className={inputCls}
          style={{ border: '2px solid #000' }}
        />
      </div>
      <div>
        <label className="block text-xs font-black uppercase tracking-widest text-black mb-1.5">Note</label>
        <textarea
          maxLength={500}
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className={inputCls}
          style={{ border: '2px solid #000' }}
        />
      </div>
      {error ? (
        <div className="border border-red-500 bg-red-50 p-3 text-sm text-red-700 text-center">
          {error}
        </div>
      ) : null}
      <button
        type="submit"
        disabled={loading}
        className="relative w-full py-3 text-black font-black text-base tracking-wide disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:-translate-y-0.5 active:translate-x-[2px] active:translate-y-[2px]"
        style={{ background: CTA, border: BORDER, boxShadow: SHADOW }}
      >
        <span
          className="pointer-events-none absolute inset-x-0 top-0 h-[42%]"
          style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.45) 0%, transparent 100%)' }}
          aria-hidden
        />
        <span className="relative">{loading ? 'Loading…' : 'Buy Now'}</span>
      </button>
      <div className="flex justify-center pt-1">
        <Image
          src="/assets/nowpayments-logo.png"
          alt="NOWPayments"
          width={180}
          height={36}
          className="h-7 w-auto"
        />
      </div>
      <div className="pt-1 text-center">
        <p className="text-xs text-black/60 leading-snug">
          Need help? Have a question? Don&apos;t hesitate to get in touch:
        </p>
        <div className="mt-1.5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm font-black">
          <a href="mailto:isabella@erogram.biz" className="underline">isabella@erogram.biz</a>
          <a href="https://t.me/erogramDOTpro" target="_blank" rel="noopener noreferrer" className="underline">@erogramDOTpro</a>
        </div>
      </div>
    </form>
  );
}
