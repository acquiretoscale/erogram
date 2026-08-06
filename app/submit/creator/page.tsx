'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import SubmitCreatorForm from '../SubmitCreatorForm';

export default function SubmitCreatorLandingPage() {
  return (
    <div className="min-h-screen bg-[#0a1117] text-[#f5f5f5]">
      <Navbar variant="onlyfans" />

      <main className="pt-24 sm:pt-28">
        <section className="relative overflow-hidden pb-12 sm:pb-16">
          <div className="absolute inset-0 bg-gradient-to-b from-[#001824] via-[#041e2e] to-[#0a1117]" />
          <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-[#00AFF0]/15 blur-[100px] pointer-events-none" />
          <div className="absolute top-40 -left-10 w-60 h-60 rounded-full bg-[#00D4FF]/10 blur-[80px] pointer-events-none" />
          <div className="relative max-w-2xl mx-auto px-4 sm:px-6">
            <Link
              href="/submit"
              className="inline-flex items-center gap-1.5 text-white/50 hover:text-[#00AFF0] text-sm font-medium mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Link>

            <div className="text-center mb-8 sm:mb-10">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#00AFF0] mb-2">For individual creators</p>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white mb-2 tracking-tight">
                Create your free profile
              </h1>
            </div>

            <SubmitCreatorForm posterType="creator" />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
