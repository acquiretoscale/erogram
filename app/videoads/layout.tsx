'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';

export default function VideoAdsLayout({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [loginData, setLoginData] = useState({ identifier: '', password: '' });
  const [error, setError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      const res = await axios.get('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.data.isAdmin) {
        localStorage.removeItem('isAdmin');
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }
      localStorage.setItem('isAdmin', 'true');
      setIsAuthenticated(true);
      setIsLoading(false);
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('isAdmin');
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoginLoading(true);
    try {
      const isEmail = loginData.identifier.includes('@');
      const res = await axios.post('/api/auth/login', {
        email: isEmail ? loginData.identifier : undefined,
        username: !isEmail ? loginData.identifier : undefined,
        password: loginData.password,
      });
      if (!res.data.isAdmin) {
        localStorage.removeItem('token');
        setError('This account is not an admin.');
        setLoginLoading(false);
        return;
      }
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('isAdmin', 'true');
      setIsAuthenticated(true);
      setLoginLoading(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Login failed';
      setError(msg === 'Invalid credentials' ? 'Invalid email or password.' : msg);
      setLoginLoading(false);
    }
  };

  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-violet-500" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black text-violet-400 mb-2">Video Ads</h1>
            <p className="text-[#999]">Admin sign in required</p>
          </div>
          <div className="glass p-8 rounded-3xl border border-white/5">
            <form onSubmit={handleLogin} className="space-y-6">
              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center">
                  {error}
                </div>
              )}
              <div>
                <label className="block text-sm font-bold text-[#999] mb-2">Email or Username</label>
                <input
                  type="text"
                  value={loginData.identifier}
                  onChange={(e) => setLoginData({ ...loginData, identifier: e.target.value })}
                  className="w-full p-4 bg-[#1a1a1a] border border-white/10 rounded-xl text-white outline-none focus:ring-2 focus:ring-violet-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-[#999] mb-2">Password</label>
                <input
                  type="password"
                  value={loginData.password}
                  onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                  className="w-full p-4 bg-[#1a1a1a] border border-white/10 rounded-xl text-white outline-none focus:ring-2 focus:ring-violet-500"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-4 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-bold disabled:opacity-50"
              >
                {loginLoading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {children}
    </div>
  );
}
