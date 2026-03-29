'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';

function ThankYouContent() {
  const params = useSearchParams();
  const plan = params.get('plan');
  const slug = params.get('slug');
  const isBoost = plan === 'boost';
  const liveUrl = slug ? `/ainsfw` : '/ainsfw';

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <div className="w-20 h-20 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-emerald-400" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M3 8l3.5 3.5L13 5"/></svg>
        </div>

        <h1 className="text-3xl font-black text-white mb-3">
          {isBoost ? 'You\'re Live!' : 'Payment Confirmed!'}
        </h1>

        {isBoost ? (
          <>
            <p className="text-white/50 text-base leading-relaxed mb-4">
              Your AI tool has been <strong className="text-emerald-400">instantly approved</strong> and is now
              <strong className="text-white"> featured in Top AI NSFW</strong> for the next 30 days.
            </p>
            <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-xl px-5 py-4 mb-8">
              <p className="text-emerald-400 text-sm font-bold mb-1">Your tool is live now</p>
              <Link
                href={liveUrl}
                className="text-sky-400 text-sm font-bold underline hover:text-sky-300 break-all"
              >
                erogram.pro/ainsfw
              </Link>
              <p className="text-white/30 text-xs mt-2">
                Your tool appears in the Featured / Top AI NSFW section.
              </p>
            </div>
          </>
        ) : (
          <p className="text-white/50 text-base leading-relaxed mb-8">
            Thank you for your payment. Your AI tool listing will be reviewed and
            approved within <strong className="text-white">24 hours</strong>.
            We&apos;ll contact you at the email you provided.
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/ainsfw"
            className="px-6 py-3 rounded-xl bg-white/10 text-white font-bold text-sm hover:bg-white/15 transition-colors"
          >
            {isBoost ? 'See Your Live Listing' : 'Browse AI NSFW Tools'}
          </Link>
          <Link
            href="/"
            className="px-6 py-3 rounded-xl bg-white/5 text-white/60 font-bold text-sm hover:bg-white/10 transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ThankYouPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-white/30 text-sm">Loading...</div>
      </div>
    }>
      <ThankYouContent />
    </Suspense>
  );
}
