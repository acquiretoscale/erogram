'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';

// Import components
import AdminSidebar from './components/AdminSidebar';
import OverviewTab from './components/OverviewTab';
import GroupsTab from './components/GroupsTab';
import BotsTab from './components/BotsTab';
import PendingGroupsTab from './components/PendingGroupsTab';
import PendingBotsTab from './components/PendingBotsTab';
import ReviewsTab from './components/ReviewsTab';
import ReportsTab from './components/ReportsTab';
import ArticlesTab from './components/ArticlesTab';
import AdvertsTab from './components/AdvertsTab';
import AdvertisersTab from './components/AdvertisersTab';
import ButtonsManagementTab from './components/ButtonsManagementTab';
import UsersTab from './components/UsersTab';
import SettingsTab from './components/SettingsTab';

export default function AdminPage() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState('buttons');
  const [isLoading, setIsLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [metrics, setMetrics] = useState({
    userCount: 0,
    groupCount: 0,
    approvedGroupCount: 0,
    pendingGroupCount: 0,
    totalViews: 0,
  });
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setShowLogin(true);
      setIsLoading(false);
      return;
    }

    try {
      await axios.get('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchMetrics();
    } catch (err) {
      localStorage.removeItem('token');
      setShowLogin(true);
      setIsLoading(false);
    }
  };

  const fetchMetrics = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/admin/metrics', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMetrics(res.data);
      setIsLoading(false);
    } catch (err: any) {
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        setShowLogin(true);
      }
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await axios.post('/api/auth/login', loginData);
      if (!res.data.isAdmin) {
        localStorage.removeItem('token');
        setError('This account is not an admin. Use an admin account to access the panel.');
        setIsLoading(false);
        return;
      }
      localStorage.setItem('token', res.data.token);
      setShowLogin(false);
      fetchMetrics();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Login failed';
      setError(msg === 'Invalid credentials' ? 'Invalid email or password. Need an admin user? Run: npx tsx scripts/set-admin-password.ts <email-or-username> <password> true' : msg);
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setShowLogin(true);
    router.push('/');
  };

  if (!mounted) return null;

  if (showLogin) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-black text-white mb-2">Admin Panel</h1>
            <p className="text-[#999]">Sign in to manage your platform</p>
          </div>

          <div className="glass p-8 rounded-3xl border border-white/5">
            <form onSubmit={handleLogin} className="space-y-6">
              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-[#999] mb-2">Email</label>
                <input
                  type="email"
                  value={loginData.email}
                  onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                  className="w-full p-4 bg-[#1a1a1a] border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:ring-2 focus:ring-[#b31b1b] focus:border-transparent outline-none transition-all"
                  placeholder="admin@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-[#999] mb-2">Password</label>
                <input
                  type="password"
                  value={loginData.password}
                  onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                  className="w-full p-4 bg-[#1a1a1a] border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:ring-2 focus:ring-[#b31b1b] focus:border-transparent outline-none transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 bg-[#b31b1b] hover:bg-[#c42b2b] text-white rounded-xl font-bold text-lg transition-all shadow-lg shadow-[#b31b1b]/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-white/5 bg-[#0a0a0a] sticky top-0 z-40">
        <h1 className="text-xl font-black gradient-text">Admin Panel</h1>
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 text-white hover:bg-white/5 rounded-lg"
        >
          <span className="text-2xl">☰</span>
        </button>
      </div>

      {/* Sidebar */}
      <AdminSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-4 md:p-8 min-h-screen overflow-y-auto w-full">
        <div className="max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'buttons' && <ButtonsManagementTab />}
              {activeTab === 'overview' && <OverviewTab metrics={metrics} setActiveTab={setActiveTab} />}
              {activeTab === 'groups' && <GroupsTab />}
              {activeTab === 'bots' && <BotsTab />}
              {activeTab === 'pending' && <PendingGroupsTab />}
              {activeTab === 'pending-bots' && <PendingBotsTab />}
              {activeTab === 'reviews' && <ReviewsTab />}
              {activeTab === 'reports' && <ReportsTab />}
              {activeTab === 'articles' && <ArticlesTab />}
              {activeTab === 'adverts' && <AdvertsTab />}
              {activeTab === 'advertisers' && <AdvertisersTab setActiveTab={setActiveTab} />}
              {activeTab === 'users' && <UsersTab />}
              {activeTab === 'settings' && <SettingsTab />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
