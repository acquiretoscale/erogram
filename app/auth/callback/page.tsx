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

    const newUser = searchParams.get('newUser') === '1';
    const redirectTarget = state?.startsWith('redirect:')
      ? state.slice('redirect:'.length)
      : null;

    const normalizeRedirect = (path: string) => {
      if (!path.startsWith('/')) return '/profile';
      try {
        const url = new URL(path, 'http://local');
        url.searchParams.delete('onboarding');
        const qs = url.searchParams.toString();
        return `${url.pathname}${qs ? `?${qs}` : ''}`;
      } catch {
        return '/profile';
      }
    };

    if (isAdmin === 'true') {
      router.replace('/admin');
    } else if (state === 'premium') {
      router.replace('/premium');
    } else if (newUser) {
      router.replace('/profile');
    } else if (redirectTarget) {
      router.replace(normalizeRedirect(redirectTarget));
    } else {
      router.replace('/profile');
    }
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-[#111111] flex items-center justify-center">
      <p className="text-[#999]">Signing you in...</p>
    </div>
  );
}
