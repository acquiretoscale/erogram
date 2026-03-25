'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Link from 'next/link';

export default function SupportPage() {
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    setUsername(localStorage.getItem('username'));
  }, []);

  return (
    <div className="min-h-screen bg-[#111111]">
      <Navbar username={username} setUsername={setUsername} />

      <div className="max-w-lg mx-auto px-4 pt-24 pb-16">
        <Link href="/" className="inline-flex items-center gap-1 text-white/40 hover:text-white/70 text-sm mb-6 transition">
          &larr; Back to site
        </Link>

        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-lg p-6 sm:p-8">
          <div className="text-center mb-8">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </div>
            <h1 className="text-2xl font-black text-white mb-2">Get in Touch</h1>
            <p className="text-sm text-white/45 leading-relaxed max-w-sm mx-auto">
              Whether you have a question, want to advertise, report an issue, or simply share a suggestion — we&apos;re all ears. Don&apos;t hesitate to reach out.
            </p>
          </div>

          <div className="space-y-4">
            <a
              href="mailto:erogram@gmail.com"
              className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.07] hover:border-white/15 transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-white/40 font-medium mb-0.5">Email</p>
                <p className="text-sm font-bold text-white group-hover:text-red-400 transition-colors truncate">erogram@gmail.com</p>
              </div>
            </a>

            <a
              href="https://t.me/RVN8888"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.07] hover:border-white/15 transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#3b82f6"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0h-.056zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-white/40 font-medium mb-0.5">Telegram</p>
                <p className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors truncate">@RVN8888</p>
              </div>
            </a>
          </div>

          <p className="mt-6 text-center text-[11px] text-white/20">
            We typically respond within 24 hours.
          </p>
        </div>
      </div>
    </div>
  );
}
