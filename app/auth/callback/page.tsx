'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    const username = searchParams.get('username');
    const isAdmin = searchParams.get('isAdmin');
    const firstName = searchParams.get('firstName');
    const photoUrl = searchParams.get('photoUrl');
    const state = searchParams.get('state');

    if (!token) {
      router.replace('/login');
      return;
    }

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('token', token);
      if (username) localStorage.setItem('username', username);
      if (isAdmin) localStorage.setItem('isAdmin', isAdmin);
      if (firstName) localStorage.setItem('firstName', firstName);
      if (photoUrl) localStorage.setItem('photoUrl', photoUrl);
    }
    try { sessionStorage.removeItem('joinRedirect'); } catch {}


    const isNewUser = searchParams.get('newUser') === '1';
    const needsOnboarding = isNewUser || searchParams.get('onboardingPending') === '1';

    const redirectTarget = state?.startsWith('redirect:')
      ? state.slice('redirect:'.length)
      : null;

    if (isAdmin === 'true') {
      router.replace('/admin');
    } else if (state === 'premium') {
      router.replace('/premium');
    } else if (needsOnboarding) {
      const hasPending = typeof localStorage !== 'undefined' && localStorage.getItem('pendingBookmark');
      if (redirectTarget) {
        try { sessionStorage.setItem('postOnboardingRedirect', redirectTarget); } catch {}
      }
      router.replace(hasPending ? '/welcome?from=bookmark' : '/welcome');
    } else if (redirectTarget) {
      router.replace(redirectTarget.startsWith('/') ? redirectTarget : '/profile?tab=saved');
    } else {
      router.replace('/profile?tab=saved');
    }
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-[#111111] flex items-center justify-center">
      <p className="text-[#999]">Signing you in...</p>
    </div>
  );
}
