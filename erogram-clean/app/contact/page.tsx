'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import AdvertiseContactForm from '@/app/advertise/AdvertiseContactForm';

export default function ContactPage() {
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    setUsername(localStorage.getItem('username'));
  }, []);

  return (
    <div className="min-h-screen bg-[#111111]">
      <Navbar username={username} setUsername={setUsername} />

      <div className="max-w-2xl mx-auto px-4 pt-24 pb-16">
        <Link href="/" className="inline-flex items-center gap-1 text-white/40 hover:text-white/70 text-sm mb-6 transition">
          &larr; Back to site
        </Link>

        <h1 className="text-3xl font-black text-white mb-6">Advertise with Us</h1>

        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 sm:p-8 mb-6">
          <AdvertiseContactForm />
        </div>

        <p className="text-center text-white/20 text-xs">We typically respond within 24 hours.</p>
      </div>
    </div>
  );
}
