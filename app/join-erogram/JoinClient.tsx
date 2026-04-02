'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Search, Bookmark, Rocket, Shield, LogIn, ArrowLeft } from 'lucide-react';

type Tab = 'join' | 'signin';

export default function JoinClient({ avatars }: { avatars: string[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [redirect, setRedirect] = useState('/onlyfanssearch');
  const [tab, setTab] = useState<Tab>('join');

  useEffect(() => {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
    const paramRd = searchParams.get('redirect');
    const rd = paramRd || sessionStorage.getItem('joinRedirect') || '/onlyfanssearch';
    if (paramRd) {
      sessionStorage.setItem('joinRedirect', paramRd);
      window.history.replaceState(null, '', '/join-erogram');
    }
    setRedirect(rd);
    if (token) {
      sessionStorage.removeItem('joinRedirect');
      router.replace(rd);
    }
  }, [router, searchParams]);

  const googleHref = `/api/auth/google?state=${encodeURIComponent(`redirect:${redirect}`)}`;

  return (
    <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-24 relative overflow-hidden">
      {/* Mosaic background */}
      {avatars.length > 0 && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(10, 1fr)',
              gap: '2px',
              position: 'absolute',
              inset: 0,
            }}
          >
            {avatars.map((src, i) => (
              <div
                key={i}
                style={{ position: 'relative', aspectRatio: '1 / 1', overflow: 'hidden' }}
              >
                <img
                  src={src}
                  alt=""
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  loading={i < 20 ? 'eager' : 'lazy'}
                  referrerPolicy="no-referrer"
                />
              </div>
            ))}
          </div>
          {/* Dark overlay + vignette */}
          <div className="absolute inset-0 bg-[#0a1525]/80" />
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, transparent 10%, #060d17 75%)' }} />
        </div>
      )}

      {/* Fallback subtle glow if no avatars */}
      {avatars.length === 0 && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-[#00AFF0] rounded-full blur-[200px] opacity-[0.06]" />
          <div className="absolute bottom-1/4 right-1/3 w-[400px] h-[400px] bg-[#00D4FF] rounded-full blur-[180px] opacity-[0.04]" />
        </div>
      )}

      <div className="relative z-10 w-full max-w-md">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-white/40 hover:text-white/70 text-sm font-medium mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="rounded-3xl border border-[#1e4a7a]/60 bg-[#0c1e35] backdrop-blur-xl p-8 sm:p-10 shadow-2xl shadow-black/60" style={{ boxShadow: '0 0 0 1px rgba(0,175,240,0.08), 0 24px 60px rgba(0,0,0,0.6)' }}>

          {/* Toggle */}
          <div className="flex items-center rounded-xl bg-[#0F274C] border border-[#1e4a7a]/60 p-1 mb-7">
            {([
              { id: 'join' as Tab, label: 'Create Account' },
              { id: 'signin' as Tab, label: 'Sign In' },
            ]).map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${
                  tab === id
                    ? 'bg-[#00AFF0] text-white shadow-lg shadow-[#00AFF0]/25'
                    : 'text-white/40 hover:text-white/60'
                }`}
              >
                {id === 'signin' && <LogIn className="w-3.5 h-3.5" />}
                {label}
              </button>
            ))}
          </div>

          {/* Header */}
          <div className="text-center mb-7">
            <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight mb-1.5">
              {tab === 'join' ? 'Create a free account' : 'Welcome back'}
            </h1>
            <p className="text-sm text-white/35">
              {tab === 'join'
                ? 'Join thousands of users on Erogram'
                : 'Sign in to access your saved profiles'}
            </p>
          </div>

          {/* Value props — only on join tab */}
          {tab === 'join' && (
            <div className="space-y-2.5 mb-7">
              {[
                { icon: Search, text: 'Browse thousands of profiles by niche' },
                { icon: Bookmark, text: 'Bookmark and save your favourites' },
                { icon: Rocket, text: 'Unlock the full Erogram experience' },
                { icon: Shield, text: 'Unlock beta features' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-[#0F274C]/80 border border-[#1e4a7a]/50">
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#00AFF0]/10 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-[#00AFF0]" />
                  </div>
                  <span className="text-sm text-white/70 font-medium">{text}</span>
                </div>
              ))}
            </div>
          )}

          {/* Google button */}
          <a
            href={googleHref}
            className="flex items-center justify-center gap-3 w-full px-6 py-3.5 rounded-xl bg-white text-gray-900 font-bold text-sm hover:bg-gray-100 transition-all shadow-lg shadow-white/10 hover:shadow-white/20"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {tab === 'join' ? 'Continue with Google' : 'Sign in with Google'}
          </a>

          <p className="mt-6 text-center text-[11px] text-white/25">
            By continuing, you agree to our{' '}
            <Link href="/terms" className="text-[#00AFF0]/50 hover:text-[#00AFF0]">Terms</Link>{' & '}
            <Link href="/privacy" className="text-[#00AFF0]/50 hover:text-[#00AFF0]">Privacy Policy</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
