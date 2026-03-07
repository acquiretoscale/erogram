'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import AdvertSidebar from './components/AdvertSidebar';

export default function AdvertLayout({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [loginData, setLoginData] = useState({ identifier: '', password: '' });
  const [error, setError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const router = useRouter();

  useEffect(() => { setMounted(true); checkAuth(); }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (!token) { setIsLoading(false); return; }
    try {
      await axios.get('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
      setIsAuthenticated(true);
    } catch { localStorage.removeItem('token'); }
    setIsLoading(false);
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
      setIsAuthenticated(true);
      setLoginLoading(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    router.push('/');
  };

  if (!mounted || isLoading) return null;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-black text-amber-400 mb-2">Ads Manager</h1>
            <p className="text-[#999]">Sign in to manage advertising</p>
          </div>
          <div className="glass p-8 rounded-3xl border border-white/5">
            <form onSubmit={handleLogin} className="space-y-6">
              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center">{error}</div>
              )}
              <div>
                <label className="block text-sm font-bold text-[#999] mb-2">Email or Username</label>
                <input type="text" value={loginData.identifier} onChange={(e) => setLoginData({ ...loginData, identifier: e.target.value })} className="w-full p-4 bg-[#1a1a1a] border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all" placeholder="admin@example.com" required />
              </div>
              <div>
                <label className="block text-sm font-bold text-[#999] mb-2">Password</label>
                <input type="password" value={loginData.password} onChange={(e) => setLoginData({ ...loginData, password: e.target.value })} className="w-full p-4 bg-[#1a1a1a] border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all" placeholder="••••••••" required />
              </div>
              <button type="submit" disabled={loginLoading} className="w-full py-4 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-lg transition-all shadow-lg shadow-amber-600/20 disabled:opacity-50 disabled:cursor-not-allowed">
                {loginLoading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col md:flex-row">
      <div className="md:hidden flex items-center justify-between p-4 border-b border-white/5 bg-[#0a0a0a] sticky top-0 z-40">
        <h1 className="text-xl font-black text-amber-400">Ads Manager</h1>
        <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-white hover:bg-white/5 rounded-lg">
          <span className="text-2xl">☰</span>
        </button>
      </div>
      <AdvertSidebar onLogout={handleLogout} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <main className="flex-1 md:ml-64 p-4 md:p-8 min-h-screen overflow-y-auto w-full">
        <div className="max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
