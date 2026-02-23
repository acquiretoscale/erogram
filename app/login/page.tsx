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
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Handle username/password login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await axios.post('/api/auth/login', {
        username,
        password,
      });

      if (res.data && res.data.token) {
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('username', res.data.username);
        localStorage.setItem('isAdmin', res.data.isAdmin);

        // Redirect to admin if admin, otherwise groups
        if (res.data.isAdmin) {
          router.push('/admin');
        } else {
          router.push('/groups');
        }
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  // Telegram auth handler
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

        router.push('/groups');
      } catch (err: any) {
        console.error('Telegram login error:', err);
        setError(err.response?.data?.message || 'Login failed');
      }
    };
  }, [router]);

  return (
    <div className="min-h-screen bg-[#111111] flex items-center justify-center px-6">
      {/* Animated Background (CSS only — no framer-motion) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#b31b1b] rounded-full blur-3xl opacity-10 animate-[pulse_20s_ease-in-out_infinite]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#b31b1b] rounded-full blur-3xl opacity-10 animate-[pulse_15s_ease-in-out_infinite]" />
      </div>

      {/* Navigation */}
      <div className="absolute top-0 left-0 right-0 z-10">
        <Navbar />
      </div>

      {/* Login Form */}
      <div className="relative z-10 w-full max-w-md animate-[fadeInUp_0.6s_ease-out]">
        <div className="glass rounded-2xl p-8 sm:p-12 backdrop-blur-lg border border-white/10">
          <div className="text-center mb-8">
            <h2 className="text-3xl sm:text-4xl font-black mb-2 gradient-text">
              Welcome!
            </h2>
            <p className="text-[#999]">
              Login to discover amazing groups
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Username/Password Login Form */}
          <form onSubmit={handleLogin} className="mb-6">
            <div className="mb-4">
              <label htmlFor="username" className="block text-sm font-medium text-[#999] mb-2">
                Username
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-[#666] focus:outline-none focus:border-[#b31b1b] transition-colors"
                placeholder="Enter your username"
                required
              />
            </div>
            <div className="mb-6">
              <label htmlFor="password" className="block text-sm font-medium text-[#999] mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-[#666] focus:outline-none focus:border-[#b31b1b] transition-colors"
                placeholder="Enter your password"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 bg-[#b31b1b] hover:bg-[#d32f2f] text-white rounded-lg font-semibold transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-[#111111] text-[#666]">Or login with Telegram</span>
            </div>
          </div>

          <div className="text-center">
            <div className="mb-6 flex justify-center items-center min-h-[60px] glass rounded-lg p-4 border border-white/10" id="telegram-login-container"></div>
          </div>

          <div className="text-center text-sm text-[#999]">
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

      {/* Telegram Widget Script */}
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
                script.setAttribute('data-telegram-login', 'erogrampro_bot');
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

