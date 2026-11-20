'use client';

import { useState, useEffect, useCallback } from 'react';

type CheckoutItem = {
  publicId: string;
  description: string;
  clientEmail?: string;
  note?: string;
  amountUsd: number;
  status: string;
  createdAt?: string;
};

const PAY_LINK = 'https://erogramx.com/checkout';

export default function AdminCheckoutPage() {
  const [copied, setCopied] = useState(false);
  const [items, setItems] = useState<CheckoutItem[]>([]);

  const load = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/custom-checkout', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setItems(data.items || []);
    } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);

  const copy = () => {
    navigator.clipboard.writeText(PAY_LINK).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const fmt = (n: number) => (n % 1 === 0 ? `$${n}` : `$${n.toFixed(2)}`);

  return (
    <div>
      <h1 className="text-3xl font-black mb-1">Checkout</h1>
      <p className="text-[#888] mb-6">Send this same link every time. The client types the amount and the tool name, then pays.</p>

      <div className="rounded-2xl border border-white/10 bg-[#111] p-4 mb-8 max-w-xl flex gap-2">
        <input readOnly value={PAY_LINK} className="flex-1 p-3 bg-[#0a0a0a] border border-white/10 rounded-xl text-white" />
        <button onClick={copy} className="px-4 rounded-xl bg-[#4ade80] text-black font-black">
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      <h2 className="text-xl font-black mb-3">Payments</h2>
      <div className="space-y-2">
        {items.length === 0 ? (
          <p className="text-[#666]">No payments yet.</p>
        ) : (
          items.map((it) => (
            <div key={it.publicId} className="rounded-xl border border-white/10 bg-[#111] p-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-bold truncate">{fmt(it.amountUsd)} · {it.description}</p>
                {it.clientEmail ? <p className="text-sm text-[#888] truncate">{it.clientEmail}</p> : null}
                {it.note ? <p className="text-sm text-[#bbb] truncate">{it.note}</p> : null}
              </div>
              <span className={`text-xs font-bold px-2 py-1 rounded-full shrink-0 ${it.status === 'paid' ? 'bg-[#4ade80]/15 text-[#4ade80]' : 'bg-amber-500/15 text-amber-400'}`}>
                {it.status === 'paid' ? 'Paid' : 'Pending'}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
