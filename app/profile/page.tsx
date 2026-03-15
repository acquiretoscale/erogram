'use client';

import { motion } from 'framer-motion';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import SavedTab from './SavedTab';
import VaultTab from './VaultTab';

type Tab = 'groups' | 'bots' | 'profile' | 'saved' | 'vault';
type ViewMode = 'admin' | 'premium' | 'free';

function ProfileContent() {
  const [mounted, setMounted] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [firstName, setFirstName] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [premiumPlan, setPremiumPlan] = useState<string | null>(null);
  const [premiumSince, setPremiumSince] = useState<string | null>(null);
  const [premiumExpiresAt, setPremiumExpiresAt] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('admin');
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>((searchParams.get('tab') as Tab) || 'profile');
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    setUsername(localStorage.getItem('username'));
    setFirstName(localStorage.getItem('firstName'));
    setPhotoUrl(localStorage.getItem('photoUrl'));
    setIsAdmin(localStorage.getItem('isAdmin') === 'true');

    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        if (data.premium) setIsPremium(true);
        if (data.isAdmin) {
          setIsAdmin(true);
          localStorage.setItem('isAdmin', 'true');
        }
        if (data.premiumPlan) setPremiumPlan(data.premiumPlan);
        if (data.premiumSince) setPremiumSince(data.premiumSince);
        if (data.premiumExpiresAt) setPremiumExpiresAt(data.premiumExpiresAt);
      })
      .catch(() => {});
  }, [mounted, router]);

  const effectivePremium = isAdmin
    ? viewMode === 'admin' || viewMode === 'premium'
    : isPremium;
  const effectiveAdmin = isAdmin && viewMode === 'admin';

  const handleDeleteProfile = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('firstName');
    localStorage.removeItem('photoUrl');
    router.push('/');
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#111111]">
      <Navbar username={username} setUsername={setUsername} />

      <div className="pt-24 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto">
          {/* Admin: View As switcher */}
          {isAdmin && (
            <div className="mb-4 p-3 rounded-xl bg-purple-500/5 border border-purple-500/20 flex items-center gap-3 flex-wrap">
              <span className="text-xs text-purple-400 font-bold uppercase tracking-wider">View as:</span>
              {([
                { key: 'admin' as ViewMode, label: 'Admin (full access)', color: 'purple' },
                { key: 'premium' as ViewMode, label: 'Premium User', color: 'amber' },
                { key: 'free' as ViewMode, label: 'Free User', color: 'gray' },
              ]).map(mode => (
                <button
                  key={mode.key}
                  onClick={() => setViewMode(mode.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    viewMode === mode.key
                      ? mode.color === 'purple' ? 'bg-purple-500/20 text-purple-300 ring-1 ring-purple-500/30'
                      : mode.color === 'amber' ? 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/30'
                      : 'bg-white/10 text-white ring-1 ring-white/20'
                      : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
              {viewMode !== 'admin' && (
                <span className="text-[10px] text-purple-400/60 ml-auto">Simulating {viewMode === 'premium' ? 'premium' : 'free'} user experience</span>
              )}
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 mb-6 bg-white/[0.03] rounded-xl p-1 border border-white/5">
            <button
              onClick={() => router.push('/groups')}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all text-white/40 hover:text-white/60 hover:bg-white/5 flex items-center justify-center gap-1.5"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              Groups
            </button>
            <button
              onClick={() => router.push('/bots')}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all text-white/40 hover:text-white/60 hover:bg-white/5 flex items-center justify-center gap-1.5"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/></svg>
              Bots
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'profile'
                  ? 'bg-white/10 text-white'
                  : 'text-white/40 hover:text-white/60'
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              Profile
            </button>
            <button
              onClick={() => setActiveTab('saved')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'saved'
                  ? 'bg-white/10 text-white'
                  : 'text-white/40 hover:text-white/60'
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>
              Saved
            </button>
            <button
              onClick={() => setActiveTab('vault')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-black uppercase tracking-wide transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'vault'
                  ? 'ring-2 ring-yellow-400/60 scale-[1.03]'
                  : 'hover:scale-[1.02]'
              }`}
              style={{
                background: activeTab === 'vault'
                  ? 'linear-gradient(135deg, #d4a94c 0%, #e8c66a 30%, #c9973a 60%, #b8860b 100%)'
                  : 'linear-gradient(135deg, #b8860b 0%, #c9973a 50%, #a67c00 100%)',
                color: activeTab === 'vault' ? '#1a1000' : '#1a1000',
                boxShadow: activeTab === 'vault'
                  ? '0 0 20px rgba(201,151,58,0.5), 0 4px 12px rgba(0,0,0,0.3)'
                  : '0 0 10px rgba(201,151,58,0.25), 0 2px 6px rgba(0,0,0,0.2)',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#1a1000" stroke="#1a1000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Vault
            </button>
          </div>

          {activeTab === 'profile' ? (
            <motion.div
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="glass rounded-2xl p-8 backdrop-blur-lg border border-white/10"
            >
              <div className="text-center mb-8">
                <h1 className="text-3xl sm:text-4xl font-black mb-2 gradient-text">
                  Your Profile
                </h1>
                <p className="text-[#999]">
                  Manage your account settings
                </p>
                {effectivePremium && (
                  <div className="inline-flex items-center gap-1 mt-2 px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-amber-500/20 to-amber-600/20 border border-amber-500/30 text-amber-400">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="#f59e0b"><path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z"/></svg>
                    Premium{isAdmin && viewMode !== 'admin' ? ` (simulated)` : ''}
                  </div>
                )}
                {effectivePremium && (premiumPlan || premiumSince || premiumExpiresAt) && viewMode === 'admin' && (
                  <div className="mt-3 mx-auto max-w-xs rounded-xl border border-amber-500/15 bg-amber-500/[0.04] p-3 text-left space-y-1.5">
                    {premiumPlan && (
                      <div className="flex justify-between text-xs">
                        <span className="text-white/40">Plan</span>
                        <span className="text-amber-400 font-semibold capitalize">{premiumPlan}</span>
                      </div>
                    )}
                    {premiumSince && (
                      <div className="flex justify-between text-xs">
                        <span className="text-white/40">Member since</span>
                        <span className="text-white/70">{new Date(premiumSince).toLocaleDateString()}</span>
                      </div>
                    )}
                    {premiumExpiresAt ? (
                      <div className="flex justify-between text-xs">
                        <span className="text-white/40">Expires</span>
                        <span className={`font-medium ${new Date(premiumExpiresAt) < new Date(Date.now() + 7 * 86400000) ? 'text-red-400' : 'text-white/70'}`}>
                          {new Date(premiumExpiresAt).toLocaleDateString()}
                        </span>
                      </div>
                    ) : premiumPlan === 'lifetime' ? (
                      <div className="flex justify-between text-xs">
                        <span className="text-white/40">Expires</span>
                        <span className="text-green-400 font-medium">Never — Lifetime</span>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>

              <div className="space-y-6 mb-8">
                {photoUrl && (
                  <div className="flex justify-center">
                    <img
                      src={photoUrl}
                      alt="Profile"
                      className="w-24 h-24 rounded-full border-2 border-[#b31b1b]"
                    />
                  </div>
                )}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#f5f5f5] mb-1">
                      Username
                    </label>
                    <div className="glass rounded-lg p-3 text-[#f5f5f5]">
                      {username || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#f5f5f5] mb-1">
                      First Name
                    </label>
                    <div className="glass rounded-lg p-3 text-[#f5f5f5]">
                      {firstName || 'N/A'}
                    </div>
                  </div>
                </div>
              </div>

              {!effectivePremium && (
                <div className="mb-6 p-4 rounded-xl border border-amber-500/20 bg-amber-500/[0.04] text-center">
                  <p className="text-white/70 text-sm mb-2">Unlock the <strong className="text-amber-400">Premium Vault</strong>, unlimited bookmarks &amp; more</p>
                  <a href="/premium" target="_blank" rel="noopener noreferrer" className="inline-block px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-white text-sm font-bold transition">
                    Upgrade to Premium
                  </a>
                </div>
              )}

              <div className="text-center">
                <button
                  onClick={handleDeleteProfile}
                  className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-bold"
                >
                  Delete Profile
                </button>
                <p className="text-sm text-[#999] mt-2">
                  This will sign you out of your account.
                </p>
              </div>
            </motion.div>
          ) : activeTab === 'saved' ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <SavedTab isPremium={effectivePremium} />
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <VaultTab isPremium={effectivePremium} isAdmin={effectiveAdmin} />
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense>
      <ProfileContent />
    </Suspense>
  );
}
