'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (res.ok) {
      router.push('/');
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Invalid credentials');
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={handleLogin} className="w-full max-w-sm bg-[#111] rounded-2xl p-8 border border-white/10">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">TGempire</h1>
          <p className="text-sm text-[#888] mt-1">Telegram Automation Dashboard</p>
        </div>
        <input
          type="text"
          value={username}
          onChange={e => setUsername(e.target.value)}
          placeholder="Username"
          className="w-full p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white mb-3 outline-none focus:ring-2 focus:ring-[#b31b1b]"
          autoComplete="username"
          autoFocus
        />
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white mb-4 outline-none focus:ring-2 focus:ring-[#b31b1b]"
          autoComplete="current-password"
        />
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-[#b31b1b] text-white rounded-xl font-semibold hover:bg-[#d42020] transition disabled:opacity-50"
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
}
