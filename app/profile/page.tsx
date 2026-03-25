'use client';

import { motion } from 'framer-motion';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { ToastProvider, useToast } from '@/components/Toast';
import SavedTab from './SavedTab';
import VaultTab from './VaultTab';
import SavedModelsTab from './SavedModelsTab';

type Tab = 'groups' | 'bots' | 'profile' | 'saved' | 'vault' | 'models' | 'support';
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
  const [deletingAccount, setDeletingAccount] = useState(false);
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>((searchParams.get('tab') as Tab) || 'profile');
  const onboardingIntent = searchParams.get('onboarding');
  const router = useRouter();
  const { toast } = useToast();

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

  const clearLocalAuth = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('firstName');
    localStorage.removeItem('photoUrl');
  };

  const handleLogout = () => {
    clearLocalAuth();
    router.push('/');
  };

  const handleDeleteAccount = async () => {
    const confirmed = confirm(
      'Are you sure you want to permanently delete your account?\n\nThis will remove all your bookmarks, folders, reviews, and data. This action cannot be undone.'
    );
    if (!confirmed) return;

    const doubleConfirm = confirm(
      'This is your last chance. Type OK below means your account, bookmarks, and all data will be permanently erased.'
    );
    if (!doubleConfirm) return;

    setDeletingAccount(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/auth/account', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to delete account');
      }
      clearLocalAuth();
      router.push('/');
    } catch (err: any) {
      toast(err.message || 'Failed to delete account', 'error');
      setDeletingAccount(false);
    }
  };

  const getRemainingDays = () => {
    if (!premiumExpiresAt) return null;
    const diff = new Date(premiumExpiresAt).getTime() - Date.now();
    if (diff <= 0) return 0;
    return Math.ceil(diff / 86400000);
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
              onClick={() => setActiveTab('support')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'support'
                  ? 'bg-white/10 text-white'
                  : 'text-white/40 hover:text-white/60'
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              Support
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
              onClick={() => setActiveTab('models')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'models'
                  ? 'bg-white/10 text-white'
                  : 'text-white/40 hover:text-white/60'
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              Models
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
                {effectivePremium && (premiumPlan || premiumSince || premiumExpiresAt) && (
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
                    {premiumExpiresAt ? (() => {
                      const remaining = getRemainingDays();
                      const isExpiringSoon = remaining !== null && remaining <= 7;
                      return (
                        <>
                          <div className="flex justify-between text-xs">
                            <span className="text-white/40">Expires</span>
                            <span className={`font-medium ${isExpiringSoon ? 'text-red-400' : 'text-white/70'}`}>
                              {new Date(premiumExpiresAt).toLocaleDateString()}
                            </span>
                          </div>
                          {remaining !== null && remaining > 0 && (
                            <div className="flex justify-between text-xs">
                              <span className="text-white/40">Remaining</span>
                              <span className={`font-bold ${isExpiringSoon ? 'text-red-400' : 'text-amber-400'}`}>
                                {remaining} day{remaining !== 1 ? 's' : ''}
                              </span>
                            </div>
                          )}
                          {remaining === 0 && (
                            <div className="flex justify-between text-xs">
                              <span className="text-white/40">Status</span>
                              <span className="text-red-400 font-bold">Expired</span>
                            </div>
                          )}
                        </>
                      );
                    })() : premiumPlan === 'lifetime' ? (
                      <div className="flex justify-between text-xs">
                        <span className="text-white/40">Expires</span>
                        <span className="text-green-400 font-medium">Never — Lifetime</span>
                      </div>
                    ) : null}
                  </div>
                )}
                {!effectivePremium && (
                  <div className="mt-3 mx-auto max-w-xs rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-white/40">Plan</span>
                      <span className="text-white/60 font-semibold">Free</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-white/40">Saves</span>
                      <span className="text-white/60">20 max</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-white/40">Folders</span>
                      <span className="text-white/60">2 max</span>
                    </div>
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
                <a
                  href="/premium"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mb-6 flex items-center justify-between gap-4 w-full rounded-2xl px-5 py-4 transition-all duration-300 hover:scale-[1.01] active:scale-[0.98]"
                  style={{
                    background: 'linear-gradient(135deg, #d4a94c 0%, #e8c66a 30%, #c9973a 60%, #b8860b 100%)',
                    border: '2px solid rgba(232,198,106,0.5)',
                    boxShadow: '0 0 30px rgba(201,151,58,0.25), 0 6px 16px rgba(0,0,0,0.3)',
                    color: '#1a1000',
                  }}
                >
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] opacity-70 mb-0.5">Members Only</p>
                    <p className="text-[17px] font-black uppercase tracking-tight leading-none">Unlock the Vault</p>
                    <p className="text-[11px] font-semibold mt-0.5 opacity-75">4,000+ exclusive groups · Instant access</p>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1a1000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1a1000" strokeWidth="3" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  </div>
                </a>
              )}

              <div className="flex flex-col items-center gap-3 mt-4">
                <button
                  onClick={handleLogout}
                  className="w-full max-w-xs px-4 py-2.5 rounded-xl text-sm font-semibold text-white/70 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
                >
                  Log out
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deletingAccount}
                  className="text-[11px] text-red-400/40 hover:text-red-400 transition-colors underline underline-offset-2 disabled:opacity-50"
                >
                  {deletingAccount ? 'Deleting...' : 'Delete account permanently'}
                </button>
              </div>
            </motion.div>
          ) : activeTab === 'saved' ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <SavedTab isPremium={effectivePremium} showOnboardingHint={onboardingIntent === 'bookmark'} />
            </motion.div>
          ) : activeTab === 'models' ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <SavedModelsTab />
            </motion.div>
          ) : activeTab === 'support' ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="glass rounded-2xl p-8 backdrop-blur-lg border border-white/10"
            >
              <div className="text-center mb-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                </div>
                <p className="text-sm text-white/50 max-w-xs mx-auto leading-relaxed">
                  Have a question, want to advertise, or just have a suggestion? We&apos;d love to hear from you — don&apos;t hesitate to reach out.
                </p>
              </div>

              <div className="space-y-4 max-w-sm mx-auto">
                <a
                  href="mailto:erogram@gmail.com"
                  className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.07] hover:border-white/15 transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-white/40 font-medium mb-0.5">Email</p>
                    <p className="text-sm font-bold text-white group-hover:text-red-400 transition-colors truncate">erogram@gmail.com</p>
                  </div>
                </a>

                <a
                  href="https://t.me/RVN8888"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.07] hover:border-white/15 transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="#3b82f6"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0h-.056zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-white/40 font-medium mb-0.5">Telegram</p>
                    <p className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors truncate">@RVN8888</p>
                  </div>
                </a>
              </div>

              <p className="mt-6 text-center text-[11px] text-white/20">
                Response time: usually within 24 hours
              </p>
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
    <ToastProvider>
      <Suspense>
        <ProfileContent />
      </Suspense>
    </ToastProvider>
  );
}
