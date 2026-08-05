'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { verifyEmailToken } from '@/lib/actions/verifyEmail';

export default function VerifyEmailClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setError('Missing verification link.');
      return;
    }
    verifyEmailToken(token).then((res) => {
      if (res.ok) {
        sessionStorage.setItem('erogram:emailVerifiedJustNow', '1');
        const loggedIn = typeof localStorage !== 'undefined' && localStorage.getItem('token');
        router.replace(loggedIn ? '/profile' : '/login?redirect=/profile');
        return;
      }
      setError(res.error || 'Could not verify email.');
    });
  }, [token, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#060d17] px-4">
      <p className="text-sm text-white/60">
        {error || 'Verifying your email…'}
      </p>
    </div>
  );
}
