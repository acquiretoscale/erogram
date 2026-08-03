'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import Script from 'next/script';
import { LogIn } from 'lucide-react';
import Navbar from '@/components/Navbar';

const ACCENT = '#c0392f';
const SURFACE = '#1a0a0a';
const PAGE_BG = '#0f0606';

type Tab = 'join' | 'signin';

export default function LoginPage() {
  const [error, setError] = useState('');
  const [redirectTo, setRedirectTo] = useState('/profile');
  const [tab, setTab] = useState<Tab>('signin');
  const router = useRouter();

  const normalizeRedirect = (value: string | null) => {
    if (!value || !value.startsWith('/')) return '/profile';
    try {
      const url = new URL(value, 'http://local');
      url.searchParams.delete('onboarding');
      const qs = url.searchParams.toString();
      return `${url.pathname}${qs ? `?${qs}` : ''}`;
    } catch {
      return '/profile';
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
    const err = params.get('error');
    if (err === 'google_denied') setError('Google sign-in was cancelled.');
    else if (err === 'google_config') setError('Google sign-in is not configured.');
    else if (err === 'google_token' || err === 'google_userinfo' || err === 'server') setError('Google sign-in failed. Please try again.');
    const rd = normalizeRedirect(params.get('redirect'));
    setRedirectTo(rd);
    if (params.get('mode') === 'join') setTab('join');
  }, []);

  useEffect(() => {
    (window as any).onTelegramAuth = async function(user: any) {
      if (!user || !user.id || !user.hash) return;

      try {
        const res = await axios.post('/api/auth/telegram', user);

        if (!res.data || !res.data.token) return;

        localStorage.setItem('token', res.data.token);
        localStorage.setItem('username', res.data.username);
        localStorage.setItem('isAdmin', res.data.isAdmin);
        localStorage.setItem('firstName', res.data.firstName);
        localStorage.setItem('photoUrl', res.data.photoUrl);

        const params = new URLSearchParams(window.location.search);
        const redirectParam = params.get('redirect');
        const rd = normalizeRedirect(redirectParam);
        if (res.data.isAdmin === 'true' || res.data.isAdmin === true) {
          router.push('/admin');
        } else if (redirectParam && rd.startsWith('/')) {
          router.push(rd);
        } else if (res.data.isNewUser) {
          router.push('/profile');
        } else {
          router.push(rd);
        }
      } catch (err: any) {
        console.error('Telegram login error:', err);
        setError(err.response?.data?.message || 'Login failed');
      }
    };
  }, [router]);

  const googleHref =
    redirectTo === '/premium'
      ? '/api/auth/google?state=premium'
      : `/api/auth/google?state=${encodeURIComponent(`redirect:${redirectTo}`)}`;

  return (
    <div
      className="min-h-screen relative text-white"
      style={{
        backgroundColor: PAGE_BG,
        backgroundImage:
          'radial-gradient(900px circle at 12% -10%, rgba(192, 57, 47, 0.14), transparent 55%), radial-gradient(800px circle at 100% 0%, rgba(139, 26, 26, 0.10), transparent 50%), linear-gradient(180deg, #0f0606 0%, #0a0404 40%, #060303 100%)',
      }}
    >
      <Navbar accent={ACCENT} />

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-[#c0392f] rounded-full blur-[200px] opacity-[0.07]" />
        <div className="absolute bottom-1/4 right-1/3 w-[400px] h-[400px] bg-[#8b1a1a] rounded-full blur-[180px] opacity-[0.05]" />
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 sm:px-6 pt-[100px] sm:pt-[108px] pb-16">
        <div className="w-full max-w-md animate-[fadeInUp_0.6s_ease-out]">
          <div
            className="rounded-2xl border p-8 sm:p-12 shadow-2xl shadow-black/60"
            style={{
              backgroundColor: SURFACE,
              borderColor: 'rgba(192, 57, 47, 0.2)',
              boxShadow: '0 0 0 1px rgba(192, 57, 47, 0.1), 0 24px 60px rgba(0,0,0,0.6)',
            }}
          >
            <div
              className="flex items-center rounded-xl p-1 mb-7"
              style={{ backgroundColor: 'rgba(15, 6, 6, 0.8)', border: '1px solid rgba(192, 57, 47, 0.15)' }}
            >
              {([
                { id: 'join' as Tab, label: 'Create Account' },
                { id: 'signin' as Tab, label: 'Sign In' },
              ]).map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${
                    tab === id
                      ? 'text-white shadow-lg'
                      : 'text-white/40 hover:text-white/60'
                  }`}
                  style={tab === id ? { backgroundColor: ACCENT, boxShadow: '0 4px 14px rgba(192, 57, 47, 0.25)' } : undefined}
                >
                  {id === 'signin' && <LogIn className="w-3.5 h-3.5" />}
                  {label}
                </button>
              ))}
            </div>

            <div className="text-center mb-8">
              <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight">
                {tab === 'join' ? 'Create Account' : 'Login to Erogram'}
              </h1>
            </div>

            {error && (
              <div className="mb-6 p-3 rounded-xl bg-red-500/15 border border-red-500/40 text-red-300 text-sm">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-3">
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
              <div
                className="flex justify-center items-center min-h-[60px] rounded-xl p-4"
                style={{
                  backgroundColor: 'rgba(15, 6, 6, 0.8)',
                  border: '1px solid rgba(192, 57, 47, 0.15)',
                }}
                id="telegram-login-container"
              />
            </div>

            <p className="mt-6 text-center text-sm text-white/25">
              By continuing, you agree to our{' '}
              <Link href="/terms" className="text-[#c0392f]/60 hover:text-[#c0392f]">Terms</Link>
              {' & '}
              <Link href="/privacy" className="text-[#c0392f]/60 hover:text-[#c0392f]">Privacy Policy</Link>
            </p>
          </div>
        </div>
      </div>

      <Script
        id="telegram-login"
        strategy="lazyOnload"
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              const container = document.getElementById('telegram-login-container');
              if (!container) return;

              const script = document.createElement('script');
              script.src = 'https://telegram.org/js/telegram-widget.js?22';
              script.async = true;
              script.setAttribute('data-telegram-login', 'erogramvipbot');
              script.setAttribute('data-size', 'large');
              script.setAttribute('data-userpic', 'false');
              script.setAttribute('data-onauth', 'onTelegramAuth(user)');
              script.setAttribute('data-request-access', 'write');

              container.innerHTML = '';
              container.appendChild(script);
            })();
          `,
        }}
      />
    </div>
  );
}
