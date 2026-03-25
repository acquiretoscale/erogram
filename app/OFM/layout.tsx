'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import OFMSidebar from './components/OFMSidebar';

export default function OFMLayout({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [loginData, setLoginData] = useState({ identifier: '', password: '' });
  const [error, setError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (!token) { setIsLoading(false); return; }
    try {
      const res = await axios.get('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.data.isAdmin) throw new Error('Not admin');
      if (res.data.username) localStorage.setItem('username', res.data.username);
      localStorage.setItem('isAdmin', 'true');
      setIsAuthenticated(true);
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('username');
      localStorage.removeItem('isAdmin');
    } finally {
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
        setError('This account does not have admin access.');
        setLoginLoading(false);
        return;
      }
      localStorage.setItem('token', res.data.token);
      if (res.data.username) localStorage.setItem('username', res.data.username);
      localStorage.setItem('isAdmin', 'true');
      setIsAuthenticated(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('firstName');
    localStorage.removeItem('photoUrl');
    setIsAuthenticated(false);
    router.push('/');
  };

  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen bg-[#080c10] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#00AFF0]" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#080c10] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#00AFF0]/10 border border-[#00AFF0]/20 mb-4">
              <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
                <circle cx="20" cy="20" r="20" fill="#00AFF0" fillOpacity="0.15"/>
                <text x="50%" y="56%" textAnchor="middle" dominantBaseline="middle" fontSize="18" fill="#00AFF0">OF</text>
              </svg>
            </div>
            <h1 className="text-3xl font-black text-white mb-1">OFM Admin</h1>
            <p className="text-white/40 text-sm">OnlyFans Management Panel</p>
          </div>
          <div className="bg-white/[0.03] border border-white/[0.07] p-8 rounded-2xl backdrop-blur-sm">
            <form onSubmit={handleLogin} className="space-y-5">
              {error && (
                <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center">
                  {error}
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Email or Username</label>
                <input
                  type="text"
                  value={loginData.identifier}
                  onChange={(e) => setLoginData({ ...loginData, identifier: e.target.value })}
                  className="w-full px-4 py-3 bg-white/[0.05] border border-white/10 rounded-xl text-white placeholder:text-white/20 focus:ring-2 focus:ring-[#00AFF0]/50 focus:border-[#00AFF0]/50 outline-none transition-all"
                  placeholder="admin@example.com"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Password</label>
                <input
                  type="password"
                  value={loginData.password}
                  onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                  className="w-full px-4 py-3 bg-white/[0.05] border border-white/10 rounded-xl text-white placeholder:text-white/20 focus:ring-2 focus:ring-[#00AFF0]/50 focus:border-[#00AFF0]/50 outline-none transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-3.5 bg-[#00AFF0] hover:bg-[#009dd9] text-white rounded-xl font-bold text-base transition-all shadow-lg shadow-[#00AFF0]/20 disabled:opacity-50 disabled:cursor-not-allowed"
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
    <div className="min-h-screen bg-[#080c10] text-white flex">
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 bg-[#080c10] border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <span className="text-[#00AFF0] font-black text-lg">OF</span>
          <span className="text-white font-bold text-lg">Manager</span>
        </div>
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 text-white/60 hover:text-white hover:bg-white/5 rounded-lg transition"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M3 12h18M3 6h18M3 18h18"/>
          </svg>
        </button>
      </div>

      <OFMSidebar
        onLogout={handleLogout}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <main className="flex-1 md:ml-[220px] pt-16 md:pt-0 min-h-screen overflow-y-auto">
        <div className="max-w-7xl mx-auto p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
