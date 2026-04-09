'use client';

import { motion } from 'framer-motion';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { ToastProvider, useToast } from '@/components/Toast';
import SavedTab from './SavedTab';
import VaultTab from './VaultTab';
import SavedModelsTab from './SavedModelsTab';
import VickyFloatingChat from '@/app/profile1/VickyFloatingChat';
import FeatureSuggestionsTab from '@/app/profile1/FeatureSuggestionsTab';

type Tab = 'home' | 'saved' | 'models' | 'vault' | 'settings' | 'suggestions';
type ViewMode = 'admin' | 'premium' | 'free';

interface UserData {
  firstName: string | null;
  photoUrl: string | null;
  interests: string[];
  preferredPlatforms: string[];
  interestedInAI: boolean;
  onboardingCompleted: boolean;
}

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
  const [userData, setUserData] = useState<UserData>({
    firstName: null, photoUrl: null, interests: [], preferredPlatforms: [],
    interestedInAI: false, onboardingCompleted: false,
  });
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const initialTab: Tab = tabParam === 'saved' ? 'saved' : tabParam === 'models' ? 'models'
    : tabParam === 'vault' ? 'vault' : tabParam === 'settings' ? 'settings'
    : tabParam === 'suggestions' ? 'suggestions' : 'home';
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const onboardingIntent = searchParams.get('onboarding');
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }

    setUsername(localStorage.getItem('username'));
    setFirstName(localStorage.getItem('firstName'));
    setPhotoUrl(localStorage.getItem('photoUrl'));
    setIsAdmin(localStorage.getItem('isAdmin') === 'true');

    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        if (data.premium) setIsPremium(true);
        if (data.isAdmin) { setIsAdmin(true); localStorage.setItem('isAdmin', 'true'); }
        if (data.premiumPlan) setPremiumPlan(data.premiumPlan);
        if (data.premiumSince) setPremiumSince(data.premiumSince);
        if (data.premiumExpiresAt) setPremiumExpiresAt(data.premiumExpiresAt);
        if (data.firstName) setFirstName(data.firstName);
        if (data.photoUrl) setPhotoUrl(data.photoUrl);
        setUserData({
          firstName: data.firstName || null,
          photoUrl: data.photoUrl || null,
          interests: data.interests || [],
          preferredPlatforms: data.preferredPlatforms || [],
          interestedInAI: data.interestedInAI || false,
          onboardingCompleted: data.onboardingCompleted || false,
        });
      })
      .catch(() => {});
  }, [mounted, router]);

  const effectivePremium = isAdmin ? viewMode === 'admin' || viewMode === 'premium' : isPremium;
  const effectiveAdmin = isAdmin && viewMode === 'admin';

  const clearLocalAuth = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('firstName');
    localStorage.removeItem('photoUrl');
  };

  const handleLogout = () => { clearLocalAuth(); router.push('/'); };

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to permanently delete your account?\n\nThis will remove all your bookmarks, folders, reviews, and data. This action cannot be undone.')) return;
    if (!confirm('This is your last chance. Your account, bookmarks, and all data will be permanently erased.')) return;
    setDeletingAccount(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/auth/account', { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.message || 'Failed'); }
      clearLocalAuth(); router.push('/');
    } catch (err: any) { toast(err.message || 'Failed to delete account', 'error'); setDeletingAccount(false); }
  };

  const getRemainingDays = () => {
    if (!premiumExpiresAt) return null;
    const diff = new Date(premiumExpiresAt).getTime() - Date.now();
    return diff <= 0 ? 0 : Math.ceil(diff / 86400000);
  };

  if (!mounted) return null;

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'home', label: 'Home', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
    { key: 'saved', label: 'Saved', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg> },
    { key: 'models', label: 'Models', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg> },
    { key: 'suggestions', label: 'Suggestion Box', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 10 18.469V19a2 2 0 1 0 4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg> },
    { key: 'settings', label: 'Settings', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> },
  ];

  return (
    <div className="min-h-screen bg-[#111111]">
      <Navbar username={username} setUsername={setUsername} />

      <div className="pt-24 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto">
          {/* Admin View-As switcher */}
          {isAdmin && (
            <div className="mb-4 p-3 rounded-xl bg-purple-500/5 border border-purple-500/20 flex items-center gap-3 flex-wrap">
              <span className="text-xs text-purple-400 font-bold uppercase tracking-wider">View as:</span>
              {([
                { key: 'admin' as ViewMode, label: 'Admin', color: 'purple' },
                { key: 'premium' as ViewMode, label: 'Premium', color: 'amber' },
                { key: 'free' as ViewMode, label: 'Free', color: 'gray' },
              ]).map(mode => (
                <button
                  key={mode.key}
                  onClick={() => setViewMode(mode.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    viewMode === mode.key
                      ? mode.color === 'purple' ? 'bg-purple-500/20 text-purple-300 ring-1 ring-purple-500/30'
                      : mode.color === 'amber' ? 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/30'
                      : 'bg-white/10 text-white ring-1 ring-white/20'
                      : 'bg-white/5 text-white/40 hover:bg-white/10'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 mb-6 bg-white/[0.03] rounded-xl p-1 border border-white/5 overflow-x-auto">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`flex-1 py-2.5 rounded-lg text-[13px] font-semibold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
                  activeTab === t.key ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
            <button
              onClick={() => setActiveTab('vault')}
              className={`flex-1 py-2.5 rounded-lg text-[13px] font-black uppercase tracking-wide transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'vault' ? 'ring-2 ring-yellow-400/60 scale-[1.03]' : 'hover:scale-[1.02]'
              }`}
              style={{
                background: activeTab === 'vault'
                  ? 'linear-gradient(135deg, #d4a94c 0%, #e8c66a 30%, #c9973a 60%, #b8860b 100%)'
                  : 'linear-gradient(135deg, #b8860b 0%, #c9973a 50%, #a67c00 100%)',
                color: '#1a1000',
                boxShadow: activeTab === 'vault'
                  ? '0 0 20px rgba(201,151,58,0.5), 0 4px 12px rgba(0,0,0,0.3)'
                  : '0 0 10px rgba(201,151,58,0.25)',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#1a1000" stroke="#1a1000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Vault
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'home' ? (
            <HomeTab
              firstName={firstName}
              photoUrl={photoUrl}
              isPremium={effectivePremium}
              userData={userData}
              onNavigate={setActiveTab}
              isFromOnboarding={onboardingIntent === 'bookmark' || onboardingIntent === 'complete'}
            />
          ) : activeTab === 'saved' ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <SavedTab isPremium={effectivePremium} showOnboardingHint={onboardingIntent === 'bookmark'} />
            </motion.div>
          ) : activeTab === 'models' ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <SavedModelsTab />
            </motion.div>
          ) : activeTab === 'vault' ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <VaultTab isPremium={effectivePremium} isAdmin={effectiveAdmin} />
            </motion.div>
          ) : activeTab === 'suggestions' ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <FeatureSuggestionsTab isAdmin={isAdmin} />
            </motion.div>
          ) : activeTab === 'settings' ? (
            <SettingsTab
              username={username}
              firstName={firstName}
              photoUrl={photoUrl}
              isPremium={effectivePremium}
              isAdmin={isAdmin}
              viewMode={viewMode}
              premiumPlan={premiumPlan}
              premiumSince={premiumSince}
              premiumExpiresAt={premiumExpiresAt}
              getRemainingDays={getRemainingDays}
              deletingAccount={deletingAccount}
              onLogout={handleLogout}
              onDeleteAccount={handleDeleteAccount}
            />
          ) : null}
        </div>
      </div>

      {/* Vicky AI floating widget */}
      <VickyFloatingChat isPremium={effectivePremium} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   HOME TAB — Personalized dashboard
   ═══════════════════════════════════════════════════════════════════ */

function HomeTab({
  firstName,
  photoUrl,
  isPremium,
  userData,
  onNavigate,
  isFromOnboarding,
}: {
  firstName: string | null;
  photoUrl: string | null;
  isPremium: boolean;
  userData: UserData;
  onNavigate: (tab: Tab) => void;
  isFromOnboarding: boolean;
}) {
  const [savedCreators, setSavedCreators] = useState<any[]>([]);
  const [savedBookmarks, setSavedBookmarks] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      fetch('/api/onlyfans/save/creators', { headers }).then(r => r.ok ? r.json() : { creators: [] }).catch(() => ({ creators: [] })),
      fetch('/api/bookmarks?limit=8', { headers }).then(r => r.ok ? r.json() : []).catch(() => []),
    ]).then(([creatorsRes, bookmarks]) => {
      const creators = Array.isArray(creatorsRes?.creators) ? creatorsRes.creators : [];
      setSavedCreators(creators.slice(0, 8));
      setSavedBookmarks(Array.isArray(bookmarks) ? bookmarks.slice(0, 8) : []);
      setLoaded(true);
    });
  }, []);

  const allImages = [
    ...savedCreators.map((c: any) => c.avatar || c.photoUrl).filter(Boolean),
    ...savedBookmarks.map((b: any) => b.item?.image).filter(Boolean),
  ];
  const totalSaved = savedCreators.length + savedBookmarks.length;
  const greeting = isFromOnboarding
    ? (isPremium ? 'Welcome to VIP!' : "You're all set!")
    : firstName ? `Welcome back, ${firstName}` : 'Welcome back';
  const interests = userData.interests.length > 0 ? userData.interests.map(s => s.replace(/-/g, ' ')) : [];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      {/* Celebration shimmer bar */}
      {isFromOnboarding && (
        <div className="relative overflow-hidden rounded-2xl mb-4" style={{ height: '6px' }}>
          <div className="absolute inset-0" style={{
            background: 'linear-gradient(90deg, transparent, rgba(0,175,240,0.4), rgba(124,58,237,0.4), rgba(16,185,129,0.4), transparent)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 2s ease-in-out infinite',
          }} />
        </div>
      )}

      {/* Welcome header */}
      <div className="text-center mb-6">
        {isFromOnboarding && (
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-3" style={{
            background: isPremium ? 'rgba(0,175,240,0.12)' : 'rgba(16,185,129,0.12)',
            border: `2px solid ${isPremium ? 'rgba(0,175,240,0.25)' : 'rgba(16,185,129,0.25)'}`,
          }}>
            {isPremium ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00aff0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z" /></svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
            )}
          </div>
        )}
        {!isFromOnboarding && photoUrl && (
          <img src={photoUrl} alt="" className="w-16 h-16 rounded-full mx-auto mb-3 border-2 border-white/10 object-cover" />
        )}
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-1">{greeting}</h1>
        {isFromOnboarding && (
          <p className="text-sm text-white/40 mb-1">Here&apos;s what we set up for you.</p>
        )}
        {interests.length > 0 && (
          <div className="flex items-center justify-center gap-1.5 flex-wrap mt-2">
            {interests.slice(0, 5).map(i => (
              <span key={i} className="px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize text-white/50 bg-white/5 border border-white/8">
                {i}
              </span>
            ))}
          </div>
        )}
        {isPremium && (
          <div className="inline-flex items-center gap-1 mt-2 px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-[#00aff0]/10 to-[#00aff0]/5 border border-[#00aff0]/20 text-[#00aff0]">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="#00aff0"><path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z"/></svg>
            VIP Member
          </div>
        )}
      </div>

      {/* Saved content mosaic */}
      {loaded && allImages.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[12px] font-bold text-white/50">{totalSaved} saved items</span>
            <button onClick={() => onNavigate('saved')} className="text-[11px] font-semibold text-[#00aff0] hover:text-[#00aff0]/80 transition-colors">
              View all
            </button>
          </div>
          <div className="grid grid-cols-4 gap-1 rounded-xl overflow-hidden">
            {allImages.slice(0, 8).map((img, i) => (
              <div key={i} className="aspect-square overflow-hidden">
                <img src={img} alt="" className="w-full h-full object-cover" loading="lazy"
                  onError={(e) => { (e.target as HTMLImageElement).src = '/assets/placeholder-no-image.png'; }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-2 mb-6">
        <button
          onClick={() => window.open('/onlyfanssearch', '_blank', 'noopener,noreferrer')}
          className="rounded-xl py-4 text-center transition-all hover:bg-white/[0.06]"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <svg width="20" height="20" viewBox="0 0 48 48" fill="none" className="mx-auto mb-1.5">
            <circle cx="24" cy="24" r="24" fill="#00AFF0" />
            <path d="M24 10C16.27 10 10 16.27 10 24C10 31.73 16.27 38 24 38C31.73 38 38 31.73 38 24C38 16.27 31.73 10 24 10ZM24 32C19.58 32 16 28.42 16 24C16 19.58 19.58 16 24 16C28.42 16 32 19.58 32 24C32 28.42 28.42 32 24 32Z" fill="white" />
            <circle cx="24" cy="24" r="4" fill="white" />
          </svg>
          <div className="text-[11px] font-bold text-white/60">Creators</div>
        </button>
        <button
          onClick={() => window.open('/', '_blank', 'noopener,noreferrer')}
          className="rounded-xl py-4 text-center transition-all hover:bg-white/[0.06]"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <svg width="20" height="20" viewBox="0 0 48 48" fill="none" className="mx-auto mb-1.5">
            <circle cx="24" cy="24" r="24" fill="#26A5E4" />
            <path d="M35.5 13.5L10.5 22.8C10.5 22.8 9.8 23.1 9.9 23.7C10 24.3 10.7 24.6 10.7 24.6L16.5 26.5L19 33.5C19 33.5 19.3 34.3 20 34.3C20.7 34.3 21.2 33.8 21.2 33.8L24.5 30.5L30.5 35C30.5 35 31.1 35.3 31.7 35C32.3 34.7 32.5 34 32.5 34L36.5 15C36.5 15 36.7 13.8 35.5 13.5ZM31 18.5L20.5 27.8C20.5 27.8 20.1 28.1 20 28.6L19.3 32L18 27.5L31 18.5Z" fill="white" />
          </svg>
          <div className="text-[11px] font-bold text-white/60">Groups</div>
        </button>
        <button
          onClick={() => window.open('/ainsfw', '_blank', 'noopener,noreferrer')}
          className="rounded-xl py-4 text-center transition-all hover:bg-white/[0.06]"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <svg width="20" height="20" viewBox="0 0 48 48" fill="none" className="mx-auto mb-1.5">
            <circle cx="24" cy="24" r="24" fill="#7C3AED" />
            <path d="M16 20C16 20 18 14 24 14C30 14 32 20 32 20" stroke="white" strokeWidth="2" strokeLinecap="round" />
            <rect x="14" y="20" width="20" height="12" rx="3" fill="white" fillOpacity="0.15" stroke="white" strokeWidth="1.5" />
            <circle cx="19" cy="26" r="2.5" fill="white" />
            <circle cx="29" cy="26" r="2.5" fill="white" />
          </svg>
          <div className="text-[11px] font-bold text-white/60">AI Tools</div>
        </button>
      </div>

      {/* Vault teaser (free) or quick access (premium) */}
      {!isPremium ? (
        <a
          href="/premium"
          target="_blank"
          rel="noopener noreferrer"
          className="mb-6 flex items-center justify-between gap-4 w-full rounded-2xl px-5 py-4 transition-all hover:scale-[1.01] active:scale-[0.98]"
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
            <p className="text-[11px] font-semibold mt-0.5 opacity-75">4,000+ exclusive groups</p>
          </div>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1a1000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        </a>
      ) : (
        <button
          onClick={() => onNavigate('vault')}
          className="mb-6 w-full flex items-center gap-4 rounded-xl px-4 py-3 transition-all hover:bg-white/[0.06]"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(201,151,58,0.1)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c9973a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </div>
          <div className="flex-1 min-w-0 text-left">
            <div className="text-[13px] font-bold text-white">Browse the Vault</div>
            <div className="text-[10px] text-white/35">4,000+ exclusive groups at your fingertips</div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
        </button>
      )}

      {/* Vicky AI card for premium / upgrade nudge for free */}
      {isPremium ? (
        <div className="mb-6 rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-3 px-4 py-3">
            <img src="/assets/vicky-ai-avatar.jpg" alt="" className="w-10 h-10 rounded-full object-cover ring-2 ring-[#00aff0]/20 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-bold text-white">Ask Vicky AI</div>
              <div className="text-[10px] text-white/35">Tap the chat bubble to find the best content</div>
            </div>
            <div className="relative w-3 h-3">
              <div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-30" />
              <div className="absolute inset-0 rounded-full bg-emerald-400" />
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-6 rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: 'rgba(0,175,240,0.05)', border: '1px solid rgba(0,175,240,0.1)' }}>
          <img src="/assets/vicky-ai-avatar.jpg" alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-white/60">Unlock Vicky AI + 4,000 Vault groups</p>
            <p className="text-[9px] text-white/25 mt-0.5">Upgrade to VIP anytime.</p>
          </div>
          <a href="/premium" target="_blank" rel="noopener noreferrer" className="px-3 py-1 rounded-lg text-[10px] font-bold text-white shrink-0" style={{ background: '#00aff0' }}>
            Upgrade
          </a>
        </div>
      )}

      {/* Support links */}
      <div className="flex items-center justify-center gap-4 mt-4 mb-8">
        <a href="mailto:erogram@gmail.com" className="text-[11px] text-white/25 hover:text-white/50 transition-colors font-medium">Support</a>
        <span className="text-white/10">|</span>
        <a href="https://t.me/RVN8888" target="_blank" rel="noopener noreferrer" className="text-[11px] text-white/25 hover:text-white/50 transition-colors font-medium">Telegram</a>
      </div>

      {isFromOnboarding && (
        <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
      )}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   SETTINGS TAB — Account, premium info, logout, support
   ═══════════════════════════════════════════════════════════════════ */

function SettingsTab({
  username, firstName, photoUrl, isPremium, isAdmin, viewMode,
  premiumPlan, premiumSince, premiumExpiresAt, getRemainingDays,
  deletingAccount, onLogout, onDeleteAccount,
}: {
  username: string | null; firstName: string | null; photoUrl: string | null;
  isPremium: boolean; isAdmin: boolean; viewMode: ViewMode;
  premiumPlan: string | null; premiumSince: string | null; premiumExpiresAt: string | null;
  getRemainingDays: () => number | null;
  deletingAccount: boolean; onLogout: () => void; onDeleteAccount: () => void;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="glass rounded-2xl p-6 sm:p-8 backdrop-blur-lg border border-white/10 mb-6">
        <div className="text-center mb-6">
          {photoUrl && (
            <img src={photoUrl} alt="" className="w-20 h-20 rounded-full mx-auto mb-3 border-2 border-white/10 object-cover" />
          )}
          <h2 className="text-xl font-black text-white">{firstName || username || 'User'}</h2>
          {username && <p className="text-xs text-white/35 mt-0.5">@{username}</p>}
          {isPremium && (
            <div className="inline-flex items-center gap-1 mt-2 px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-amber-500/20 to-amber-600/20 border border-amber-500/30 text-amber-400">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="#f59e0b"><path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z"/></svg>
              Premium{isAdmin && viewMode !== 'admin' ? ' (simulated)' : ''}
            </div>
          )}
        </div>

        {isPremium && (premiumPlan || premiumSince || premiumExpiresAt) && (
          <div className="mb-6 mx-auto max-w-xs rounded-xl border border-amber-500/15 bg-amber-500/[0.04] p-3 space-y-1.5">
            {premiumPlan && (
              <div className="flex justify-between text-xs">
                <span className="text-white/40">Plan</span>
                <span className="text-amber-400 font-semibold capitalize">{premiumPlan}</span>
              </div>
            )}
            {premiumSince && (
              <div className="flex justify-between text-xs">
                <span className="text-white/40">Since</span>
                <span className="text-white/70">{new Date(premiumSince).toLocaleDateString()}</span>
              </div>
            )}
            {premiumExpiresAt ? (() => {
              const remaining = getRemainingDays();
              const soon = remaining !== null && remaining <= 7;
              return (
                <>
                  <div className="flex justify-between text-xs">
                    <span className="text-white/40">Expires</span>
                    <span className={`font-medium ${soon ? 'text-red-400' : 'text-white/70'}`}>{new Date(premiumExpiresAt).toLocaleDateString()}</span>
                  </div>
                  {remaining !== null && remaining > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-white/40">Remaining</span>
                      <span className={`font-bold ${soon ? 'text-red-400' : 'text-amber-400'}`}>{remaining} day{remaining !== 1 ? 's' : ''}</span>
                    </div>
                  )}
                </>
              );
            })() : premiumPlan === 'lifetime' ? (
              <div className="flex justify-between text-xs">
                <span className="text-white/40">Expires</span>
                <span className="text-green-400 font-medium">Never</span>
              </div>
            ) : null}
          </div>
        )}

        {!isPremium && (
          <div className="mb-6 mx-auto max-w-xs rounded-xl border border-white/10 bg-white/[0.03] p-3 space-y-1">
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

        {/* Support */}
        <div className="space-y-2 mb-6">
          <a href="mailto:erogram@gmail.com" className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-all">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
            <span className="text-xs font-semibold text-white/60">erogram@gmail.com</span>
          </a>
          <a href="https://t.me/RVN8888" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-all">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#3b82f6"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0h-.056zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
            <span className="text-xs font-semibold text-white/60">@RVN8888</span>
          </a>
        </div>

        <div className="flex flex-col items-center gap-3">
          <button onClick={onLogout} className="w-full max-w-xs px-4 py-2.5 rounded-xl text-sm font-semibold text-white/70 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all">
            Log out
          </button>
          <button onClick={onDeleteAccount} disabled={deletingAccount} className="text-[11px] text-red-400/40 hover:text-red-400 transition-colors underline underline-offset-2 disabled:opacity-50">
            {deletingAccount ? 'Deleting...' : 'Delete account permanently'}
          </button>
        </div>
      </div>
    </motion.div>
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
