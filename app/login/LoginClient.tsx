'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AuthMethods from '@/components/auth/AuthMethods';
import AuthJoinBenefits from '@/components/auth/AuthJoinBenefits';
import AuthSocialProof from '@/components/auth/AuthSocialProof';
import { AuthAvatarBackground, AuthCard, AuthTabToggle } from '@/components/auth/AuthPageShell';
import { ArrowLeft } from 'lucide-react';

type Tab = 'join' | 'signin';

function normalizeRedirect(value: string | null) {
  if (!value || !value.startsWith('/')) return '/profile';
  try {
    const url = new URL(value, 'http://local');
    url.searchParams.delete('onboarding');
    const qs = url.searchParams.toString();
    return `${url.pathname}${qs ? `?${qs}` : ''}`;
  } catch {
    return '/profile';
  }
}

function AuthError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="mb-2 p-2 rounded-lg bg-red-500/15 border border-red-500/35 text-red-300 text-xs">
      {message}
    </div>
  );
}

export default function LoginClient({
  avatars,
  initialRedirect = '/profile',
  initialTab = 'signin',
  totalUsers = 0,
  userAvatars = [],
}: {
  avatars: string[];
  initialRedirect?: string;
  initialTab?: Tab;
  totalUsers?: number;
  userAvatars?: string[];
}) {
  const [error, setError] = useState('');
  const [redirectTo, setRedirectTo] = useState(initialRedirect);
  const [tab, setTab] = useState<Tab>(initialTab);
  const router = useRouter();
  const isAinsfwTheme = redirectTo.includes('ainsfw');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get('error');
    if (err === 'google_denied') setError('Google sign-in was cancelled.');
    else if (err === 'google_config') setError('Google sign-in is not configured.');
    else if (err === 'google_token' || err === 'google_userinfo' || err === 'server') {
      setError('Google sign-in failed. Please try again.');
    }
    const rd = normalizeRedirect(params.get('redirect') || initialRedirect);
    setRedirectTo(rd);
    if (params.get('mode') === 'join') setTab('join');
    const token = localStorage.getItem('token');
    if (token && rd.startsWith('/')) router.replace(rd);
  }, [router, initialRedirect]);

  const googleHref =
    redirectTo === '/premium'
      ? '/api/auth/google?state=premium'
      : `/api/auth/google?state=${encodeURIComponent(`redirect:${redirectTo}`)}`;

  const handleAuthSuccess = useCallback((data: {
    token: string;
    username: string;
    isAdmin: boolean | string;
    firstName?: string | null;
    photoUrl?: string | null;
    isNewUser?: boolean;
  }) => {
    localStorage.setItem('token', data.token);
    localStorage.setItem('username', data.username);
    localStorage.setItem('isAdmin', String(data.isAdmin));
    if (data.firstName) localStorage.setItem('firstName', data.firstName);
    else localStorage.removeItem('firstName');
    if (data.photoUrl) localStorage.setItem('photoUrl', data.photoUrl);
    else localStorage.removeItem('photoUrl');

    const params = new URLSearchParams(window.location.search);
    const redirectParam = params.get('redirect');
    const rd = normalizeRedirect(redirectParam || redirectTo);

    if (data.isAdmin === 'true' || data.isAdmin === true) router.push('/admin');
    else if (redirectParam && rd.startsWith('/')) router.push(rd);
    else if (data.isNewUser) router.push('/profile');
    else router.push(rd);
  }, [router, redirectTo]);

  return (
    <div className={`min-h-screen flex flex-col ${isAinsfwTheme ? 'ainsfw-page bg-black' : 'bg-[#060d17]'}`}>
      <Navbar accent={isAinsfwTheme ? '#22c55e' : undefined} variant={isAinsfwTheme ? undefined : 'onlyfans'} />

      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 pt-[100px] sm:pt-[108px] pb-16 relative overflow-hidden">
        <AuthAvatarBackground avatars={avatars} isAinsfwTheme={isAinsfwTheme} />

        <div className={`relative z-10 w-[70%] sm:w-full mx-auto ${tab === 'join' ? 'max-w-3xl' : 'max-w-md'}`}>
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-white/40 hover:text-white/70 text-sm font-medium mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <AuthCard isAinsfwTheme={isAinsfwTheme} wide={tab === 'join'}>
            <AuthSocialProof totalUsers={totalUsers} avatars={userAvatars} isAinsfwTheme={isAinsfwTheme} />
            <AuthTabToggle tab={tab} setTab={setTab} isAinsfwTheme={isAinsfwTheme} />

            <div className="mb-3">
              <h1 className="text-lg sm:text-xl font-black text-gray-900 leading-tight">
                {tab === 'join' ? 'Create a free account' : 'Welcome back'}
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                {tab === 'join'
                  ? 'Be part of the fastest-growing adult community'
                  : 'Sign in to access your saved profiles'}
              </p>
            </div>

            {tab === 'join' ? (
              <div className="grid grid-cols-1 md:grid-cols-[1fr,0.9fr] gap-3 md:gap-4 md:items-start">
                <div>
                  <AuthError message={error} />
                  <AuthMethods
                    tab={tab}
                    googleHref={googleHref}
                    isAinsfwTheme={isAinsfwTheme}
                    onAuthSuccess={handleAuthSuccess}
                    onError={setError}
                  />
                </div>
                <AuthJoinBenefits isAinsfwTheme={isAinsfwTheme} />
              </div>
            ) : (
              <>
                <AuthError message={error} />
                <AuthMethods
                  tab={tab}
                  googleHref={googleHref}
                  isAinsfwTheme={isAinsfwTheme}
                  onAuthSuccess={handleAuthSuccess}
                  onError={setError}
                />
              </>
            )}

            <p className="mt-3 text-center text-[10px] text-black/40 leading-relaxed">
              By continuing, you agree to our{' '}
              <Link href="/terms" className={isAinsfwTheme ? 'text-[#16a34a] hover:underline' : 'text-[#0088c2] hover:underline'}>Terms</Link>
              {' & '}
              <Link href="/privacy" className={isAinsfwTheme ? 'text-[#16a34a] hover:underline' : 'text-[#0088c2] hover:underline'}>Privacy Policy</Link>
            </p>
          </AuthCard>
        </div>
      </main>

      <Footer />
    </div>
  );
}
