'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { resetPasswordWithToken } from '@/lib/actions/passwordReset';

export default function ResetPasswordClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const res = await resetPasswordWithToken(token, password);
      if (!res.ok) {
        setError(res.error || 'Could not reset password.');
        return;
      }
      router.replace('/login?mode=signin');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#060d17] px-4">
        <div className="max-w-md w-full rounded-2xl bg-white p-6 text-center">
          <p className="text-sm text-gray-600">This reset link is invalid.</p>
          <Link href="/login" className="mt-4 inline-block text-sm font-bold text-[#0088c2] hover:underline">
            Back to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#060d17] px-4">
      <div className="max-w-md w-full rounded-2xl bg-white p-6">
        <h1 className="text-lg font-black text-gray-900">Create new password</h1>
        <p className="mt-1 text-xs text-gray-500">Choose a new password for your account.</p>

        {error ? (
          <div className="mt-4 p-2 rounded-lg bg-red-500/15 border border-red-500/35 text-red-600 text-xs">
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-2">
          <input
            type="password"
            autoComplete="new-password"
            required
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-black/[0.03] border border-black/15 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:border-[#00AFF0]"
          />
          <input
            type="password"
            autoComplete="new-password"
            required
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-black/[0.03] border border-black/15 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:border-[#00AFF0]"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-[#00AFF0] text-white font-bold text-sm hover:bg-[#0099d6] transition-all disabled:opacity-50"
          >
            {loading ? 'Saving…' : 'Save password'}
          </button>
        </form>
      </div>
    </div>
  );
}
