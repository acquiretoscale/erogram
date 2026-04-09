'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import Script from 'next/script';
import dynamic from 'next/dynamic';

const Navbar = dynamic(() => import('@/components/Navbar'), {
  ssr: false,
  loading: () => (
    <div className="fixed top-0 left-0 right-0 z-50 h-[72px] border-b border-[#333] bg-[#111111]/95 backdrop-blur-md" />
  ),
});

export default function LoginPage() {
  const [error, setError] = useState('');
  const [redirectTo, setRedirectTo] = useState('/profile?tab=saved');
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const router = useRouter();

  const normalizeRedirect = (value: string | null) => {
    if (!value || !value.startsWith('/')) return '/profile?tab=saved';
    return value;
  };

  useEffect(() => {
    const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
    const err = params.get('error');
    if (err === 'google_denied') setError('Google sign-in was cancelled.');
    else if (err === 'google_config') setError('Google sign-in is not configured.');
    else if (err === 'google_token' || err === 'google_userinfo' || err === 'server') setError('Google sign-in failed. Please try again.');
    const rd = normalizeRedirect(params.get('redirect'));
    setRedirectTo(rd);
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
        const rd = normalizeRedirect(params.get('redirect'));
        if (res.data.isAdmin === 'true' || res.data.isAdmin === true) {
          router.push('/admin');
        } else if (res.data.isNewUser) {
          const hasPending = localStorage.getItem('pendingBookmark');
          router.push(hasPending ? '/welcome?from=bookmark' : '/welcome');
        } else {
          router.push(rd);
        }
      } catch (err: any) {
        console.error('Telegram login error:', err);
        setError(err.response?.data?.message || 'Login failed');
      }
    };
  }, [router]);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUsername.trim() || !loginPassword.trim()) return;
    setLoginLoading(true);
    setError('');
    try {
      const res = await axios.post('/api/auth/login', {
        username: loginUsername.trim(),
        password: loginPassword,
      });
      if (!res.data?.token) { setError('Login failed'); setLoginLoading(false); return; }
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('username', res.data.username);
      localStorage.setItem('isAdmin', res.data.isAdmin);
      if (res.data.firstName) localStorage.setItem('firstName', res.data.firstName);
      if (res.data.photoUrl) localStorage.setItem('photoUrl', res.data.photoUrl);

      if (res.data.isAdmin === 'true' || res.data.isAdmin === true) {
        router.push('/admin');
      } else if (!res.data.onboardingCompleted) {
        router.push('/welcome');
      } else {
        router.push(redirectTo);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    }
    setLoginLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#111111] flex items-center justify-center px-6">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#b31b1b] rounded-full blur-3xl opacity-10 animate-[pulse_20s_ease-in-out_infinite]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#b31b1b] rounded-full blur-3xl opacity-10 animate-[pulse_15s_ease-in-out_infinite]" />
      </div>

      <div className="absolute top-0 left-0 right-0 z-10">
        <Navbar />
      </div>

      <div className="relative z-10 w-full max-w-md animate-[fadeInUp_0.6s_ease-out]">
        <div className="glass rounded-2xl p-8 sm:p-12 backdrop-blur-lg border border-white/10">
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-black mb-2 gradient-text">
              Login to Erogram
            </h1>
            <p className="text-[#999]">
              Login to discover amazing groups
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-3">
            <a
              href={redirectTo === '/premium' ? '/api/auth/google?state=premium' : `/api/auth/google?state=${encodeURIComponent(`redirect:${redirectTo}`)}`}
              className="w-full px-6 py-3 bg-white/10 hover:bg-white/15 border border-white/10 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign in with Google
            </a>
            <div className="flex justify-center items-center min-h-[60px] glass rounded-lg p-4 border border-white/10" id="telegram-login-container"></div>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10" /></div>
              <div className="relative flex justify-center"><span className="px-3 text-xs text-[#666] bg-[#111111]">or</span></div>
            </div>

            <form onSubmit={handlePasswordLogin} className="space-y-2">
              <input
                type="text"
                placeholder="Username"
                value={loginUsername}
                onChange={e => setLoginUsername(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-white/30 outline-none focus:ring-1 focus:ring-[#b31b1b]/50"
              />
              <input
                type="password"
                placeholder="Password"
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-white/30 outline-none focus:ring-1 focus:ring-[#b31b1b]/50"
              />
              <button
                type="submit"
                disabled={loginLoading || !loginUsername.trim() || !loginPassword.trim()}
                className="w-full px-6 py-3 bg-[#b31b1b] hover:bg-[#d32f2f] text-white rounded-lg font-medium transition-all disabled:opacity-50"
              >
                {loginLoading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          </div>

          <div className="mt-6 text-center text-sm text-[#999]">
            By logging in, you agree to our{' '}
            <Link href="/terms" className="text-[#b31b1b] hover:text-[#d32f2f] transition-colors">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-[#b31b1b] hover:text-[#d32f2f] transition-colors">
              Privacy Policy
            </Link>
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
