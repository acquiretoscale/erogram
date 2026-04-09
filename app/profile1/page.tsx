'use client';

import { motion } from 'framer-motion';
import { Suspense, useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { ToastProvider, useToast } from '@/components/Toast';
import VaultTab from '@/app/profile/VaultTab';
import SavedGroupsTab1 from './SavedGroupsTab1';
import SavedCreatorsTab1 from './SavedCreatorsTab1';
import { chatWithVicky } from '@/lib/actions/vickyAI';
import FeatureSuggestionsTab from './FeatureSuggestionsTab';

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

function Profile1Content() {
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

  const vmParam = searchParams.get('vm');

  const [simData, setSimData] = useState<{ creators: any[]; groups: any[]; aiTools: any[]; interests: string[] } | null>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (vmParam === 'free') setViewMode('free');
    else if (vmParam === 'premium') setViewMode('premium');
  }, [vmParam]);

  useEffect(() => {
    if (vmParam) {
      try {
        const raw = sessionStorage.getItem('simOnboardingData');
        if (raw) setSimData(JSON.parse(raw));
      } catch {}
    }
  }, [vmParam]);

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

  const isSimulation = !!vmParam && !!simData;

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'home', label: 'Home', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
    { key: 'saved', label: 'Saved Groups', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg> },
    { key: 'models', label: 'Saved OF Creators', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg> },
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
              isFromOnboarding={onboardingIntent === 'complete'}
              simData={isSimulation ? simData : null}
            />
          ) : activeTab === 'saved' ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <SavedGroupsTab1 isPremium={effectivePremium} simData={isSimulation ? (simData?.groups || []) : null} />
            </motion.div>
          ) : activeTab === 'models' ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <SavedCreatorsTab1 isPremium={effectivePremium} simData={isSimulation ? (simData?.creators || []) : null} />
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
   HOME TAB
   ═══════════════════════════════════════════════════════════════════ */

function HomeTab({
  firstName, photoUrl, isPremium, userData, onNavigate, isFromOnboarding, simData,
}: {
  firstName: string | null; photoUrl: string | null; isPremium: boolean;
  userData: UserData; onNavigate: (tab: Tab) => void; isFromOnboarding: boolean;
  simData: { creators: any[]; groups: any[]; aiTools: any[]; interests: string[] } | null;
}) {
  const [savedCreators, setSavedCreators] = useState<any[]>([]);
  const [savedBookmarks, setSavedBookmarks] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (simData) {
      setLoaded(true);
      return;
    }
    const token = localStorage.getItem('token');
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch('/api/onlyfans/save/creators', { headers }).then(r => r.ok ? r.json() : { creators: [] }).catch(() => ({ creators: [] })),
      fetch('/api/bookmarks?limit=8', { headers }).then(r => r.ok ? r.json() : []).catch(() => []),
    ]).then(([creatorsRes, bookmarks]) => {
      const cr = Array.isArray(creatorsRes?.creators) ? creatorsRes.creators : [];
      setSavedCreators(cr.slice(0, 8));
      setSavedBookmarks(Array.isArray(bookmarks) ? bookmarks.slice(0, 8) : []);
      setLoaded(true);
    });
  }, [simData]);

  const creatorImages = simData
    ? simData.creators.map((c: any) => c.avatar).filter(Boolean)
    : savedCreators.map((c: any) => c.avatar || c.photoUrl).filter(Boolean);
  const groupImages = simData
    ? simData.groups.map((g: any) => g.image).filter(Boolean)
    : savedBookmarks.map((b: any) => b.item?.image).filter(Boolean);
  const greeting = isFromOnboarding
    ? (isPremium ? 'Welcome to VIP!' : "You're all set!")
    : firstName ? `Welcome back, ${firstName}` : 'Welcome back';
  const interests = userData.interests.length > 0 ? userData.interests.map(s => s.replace(/-/g, ' ')) : [];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      {isFromOnboarding && (
        <div className="relative overflow-hidden rounded-2xl mb-4" style={{ height: '6px' }}>
          <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, transparent, rgba(0,175,240,0.4), rgba(124,58,237,0.4), rgba(16,185,129,0.4), transparent)', backgroundSize: '200% 100%', animation: 'shimmer 2s ease-in-out infinite' }} />
        </div>
      )}

      <div className="text-center mb-6">
        {isFromOnboarding ? (
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-3" style={{ background: isPremium ? 'rgba(0,175,240,0.12)' : 'rgba(16,185,129,0.12)', border: `2px solid ${isPremium ? 'rgba(0,175,240,0.25)' : 'rgba(16,185,129,0.25)'}` }}>
            {isPremium ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00aff0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z" /></svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
            )}
          </div>
        ) : photoUrl ? (
          <img src={photoUrl} alt="" className="w-16 h-16 rounded-full mx-auto mb-3 border-2 border-white/10 object-cover" />
        ) : null}
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-1">{greeting}</h1>
        {interests.length > 0 && (
          <div className="flex items-center justify-center gap-1.5 flex-wrap mt-2">
            {interests.slice(0, 5).map(i => (
              <span key={i} className="px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize text-white/50 bg-white/5 border border-white/8">{i}</span>
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

      {loaded && creatorImages.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] font-bold text-white/50">{creatorImages.length} creators saved</span>
            <button onClick={() => onNavigate('models')} className="text-[11px] font-semibold text-[#00aff0] hover:text-[#00aff0]/80 transition-colors">View all</button>
          </div>
          <div className="grid grid-cols-4 gap-1 rounded-xl overflow-hidden">
            {creatorImages.slice(0, 8).map((img, i) => (
              <div key={i} className="aspect-square overflow-hidden">
                <img src={img} alt="" className="w-full h-full object-cover" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {loaded && groupImages.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] font-bold text-white/50">{groupImages.length} groups saved</span>
            <button onClick={() => onNavigate('saved')} className="text-[11px] font-semibold text-[#00aff0] hover:text-[#00aff0]/80 transition-colors">View all</button>
          </div>
          <div className="grid grid-cols-4 gap-1 rounded-xl overflow-hidden">
            {groupImages.slice(0, 8).map((img, i) => (
              <div key={i} className="aspect-square overflow-hidden">
                <img src={img} alt="" className="w-full h-full object-cover" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {loaded && creatorImages.length === 0 && groupImages.length === 0 && (
        <div className="mb-6 rounded-xl py-8 text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-[13px] font-semibold text-white/40 mb-1">No saved content yet</p>
          <p className="text-[11px] text-white/25">Save creators and groups to see them here</p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 mb-6">
        {[
          { label: 'Creators', url: '/onlyfanssearch', color: '#00AFF0' },
          { label: 'Groups', url: '/', color: '#26A5E4' },
          { label: 'AI Tools', url: '/ainsfw', color: '#7C3AED' },
        ].map(a => (
          <button key={a.label} onClick={() => window.open(a.url, '_blank', 'noopener,noreferrer')}
            className="rounded-xl py-4 text-center transition-all hover:bg-white/[0.06]"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="w-5 h-5 rounded-full mx-auto mb-1.5" style={{ background: a.color }} />
            <div className="text-[11px] font-bold text-white/60">{a.label}</div>
          </button>
        ))}
      </div>

      {!isPremium ? (
        <a href="/premium" target="_blank" rel="noopener noreferrer"
          className="mb-6 flex items-center justify-between gap-4 w-full rounded-2xl px-5 py-4 transition-all hover:scale-[1.01] active:scale-[0.98]"
          style={{ background: 'linear-gradient(135deg, #d4a94c 0%, #e8c66a 30%, #c9973a 60%, #b8860b 100%)', border: '2px solid rgba(232,198,106,0.5)', boxShadow: '0 0 30px rgba(201,151,58,0.25)', color: '#1a1000' }}>
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] opacity-70 mb-0.5">Members Only</p>
            <p className="text-[17px] font-black uppercase tracking-tight leading-none">Unlock the Vault</p>
            <p className="text-[11px] font-semibold mt-0.5 opacity-75">4,000+ exclusive groups</p>
          </div>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1a1000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        </a>
      ) : (
        <button onClick={() => onNavigate('vault')} className="mb-6 w-full flex items-center gap-4 rounded-xl px-4 py-3 transition-all hover:bg-white/[0.06]"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
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

      {isPremium ? (
        <div className="mb-6 rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-3 px-4 py-3">
            <img src="/assets/vicky-ai-avatar.jpg" alt="" className="w-12 h-12 rounded-full ring-2 ring-[#00aff0]/20 shrink-0" style={{ objectFit: 'cover', objectPosition: '50% 60%' }} />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-bold text-white">Ask Vicky AI</div>
              <div className="text-[10px] text-white/35">Tap the chat bubble to find the best content</div>
            </div>
            <div className="relative w-3 h-3"><div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-30" /><div className="absolute inset-0 rounded-full bg-emerald-400" /></div>
          </div>
        </div>
      ) : (
        <div className="mb-6 rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: 'rgba(0,175,240,0.05)', border: '1px solid rgba(0,175,240,0.1)' }}>
          <img src="/assets/vicky-ai-avatar.jpg" alt="" className="w-10 h-10 rounded-full shrink-0" style={{ objectFit: 'cover', objectPosition: '50% 60%' }} />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-white/60">Unlock Vicky AI + 4,000 Vault groups</p>
            <p className="text-[9px] text-white/25 mt-0.5">Upgrade to VIP anytime.</p>
          </div>
          <a href="/premium" target="_blank" rel="noopener noreferrer" className="px-3 py-1 rounded-lg text-[10px] font-bold text-white shrink-0" style={{ background: '#00aff0' }}>Upgrade</a>
        </div>
      )}

      {/* AI Tools quick access */}
      {simData && simData.aiTools.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
            </svg>
            <span className="text-[11px] font-bold text-white/50">AI Tools for you</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {simData.aiTools.map((tool: any) => (
              <a key={tool.slug} href={`/ainsfw/${tool.slug}`} target="_blank" rel="noopener noreferrer"
                className="rounded-xl overflow-hidden transition-all hover:scale-[1.02]"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="aspect-square overflow-hidden">
                  <img src={tool.image} alt="" className="w-full h-full object-cover" loading="lazy"
                    onError={(e) => { (e.target as HTMLImageElement).src = '/assets/placeholder-no-image.png'; }} />
                </div>
                <div className="px-2 py-1.5">
                  <p className="text-[9px] font-bold text-white truncate">{tool.name}</p>
                  <p className="text-[8px] text-white/25 truncate">{tool.category}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-center gap-4 mt-4 mb-8">
        <a href="mailto:erogram@gmail.com" className="text-[11px] text-white/25 hover:text-white/50 transition-colors font-medium">Support</a>
        <span className="text-white/10">|</span>
        <a href="https://t.me/RVN8888" target="_blank" rel="noopener noreferrer" className="text-[11px] text-white/25 hover:text-white/50 transition-colors font-medium">Telegram</a>
      </div>

      {isFromOnboarding && <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   SETTINGS TAB
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
          {photoUrl && <img src={photoUrl} alt="" className="w-20 h-20 rounded-full mx-auto mb-3 border-2 border-white/10 object-cover" />}
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
            {premiumPlan && <div className="flex justify-between text-xs"><span className="text-white/40">Plan</span><span className="text-amber-400 font-semibold capitalize">{premiumPlan}</span></div>}
            {premiumSince && <div className="flex justify-between text-xs"><span className="text-white/40">Since</span><span className="text-white/70">{new Date(premiumSince).toLocaleDateString()}</span></div>}
            {premiumExpiresAt ? (() => {
              const remaining = getRemainingDays();
              const soon = remaining !== null && remaining <= 7;
              return (
                <>
                  <div className="flex justify-between text-xs"><span className="text-white/40">Expires</span><span className={`font-medium ${soon ? 'text-red-400' : 'text-white/70'}`}>{new Date(premiumExpiresAt).toLocaleDateString()}</span></div>
                  {remaining !== null && remaining > 0 && <div className="flex justify-between text-xs"><span className="text-white/40">Remaining</span><span className={`font-bold ${soon ? 'text-red-400' : 'text-amber-400'}`}>{remaining} day{remaining !== 1 ? 's' : ''}</span></div>}
                </>
              );
            })() : premiumPlan === 'lifetime' ? <div className="flex justify-between text-xs"><span className="text-white/40">Expires</span><span className="text-green-400 font-medium">Never</span></div> : null}
          </div>
        )}

        {!isPremium && (
          <div className="mb-6 mx-auto max-w-xs rounded-xl border border-white/10 bg-white/[0.03] p-3 space-y-1">
            <div className="flex justify-between text-xs"><span className="text-white/40">Plan</span><span className="text-white/60 font-semibold">Free</span></div>
            <div className="flex justify-between text-xs"><span className="text-white/40">Saves</span><span className="text-white/60">20 max</span></div>
            <div className="flex justify-between text-xs"><span className="text-white/40">Folders</span><span className="text-white/60">1 max</span></div>
          </div>
        )}

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
          <button onClick={onLogout} className="w-full max-w-xs px-4 py-2.5 rounded-xl text-sm font-semibold text-white/70 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all">Log out</button>
          <button onClick={onDeleteAccount} disabled={deletingAccount} className="text-[11px] text-red-400/40 hover:text-red-400 transition-colors underline underline-offset-2 disabled:opacity-50">
            {deletingAccount ? 'Deleting...' : 'Delete account permanently'}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   VICKY AI FLOATING CHAT — self-contained, no external component
   ═══════════════════════════════════════════════════════════════════ */

interface CreatorCard {
  name: string;
  username: string;
  avatar: string;
  url: string;
  categories: string;
}

export function VickyFloatingChat({ isPremium }: { isPremium: boolean }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string; creators?: CreatorCard[] }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 200);
  }, [open]);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;
    const userMsg = { role: 'user' as const, content: text.trim() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput('');
    setLoading(true);
    try {
      const res = await chatWithVicky(token, updated);
      setMessages(prev => [...prev, { role: 'assistant', content: res.reply, creators: res.creators }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Try again.' }]);
    }
    setLoading(false);
  }, [messages, loading]);

  return (
    <>
      {/* Floating button — always visible bottom-right */}
      {!open && (
        <div className="fixed bottom-6 right-6" style={{ zIndex: 9998 }}>
          <button onClick={() => setOpen(true)}
            className="flex items-center gap-2.5 pl-1.5 pr-4 py-1.5 rounded-full transition-all duration-200 hover:scale-105 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #0d1628, #141e33)', border: '2px solid rgba(0,175,240,0.4)', boxShadow: '0 4px 30px rgba(0,175,240,0.3), 0 8px 32px rgba(0,0,0,0.5)' }}>
            <div className="relative shrink-0">
              <img src="/assets/vicky-ai-avatar.jpg" alt="Vicky AI" className="w-14 h-14 rounded-full ring-2 ring-[#00aff0]/40" style={{ objectFit: 'cover', objectPosition: '50% 65%' }} />
              <span className="absolute top-0 right-0 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[#0d1628]" />
            </div>
            <div className="text-left">
              <div className="text-[12px] font-bold text-white leading-tight">Ask Vicky</div>
              <div className="text-[9px] text-[#00aff0]/70 font-medium">AI Assistant</div>
            </div>
          </button>
          <style>{`
            @keyframes pulseGlow { 0%, 100% { box-shadow: 0 4px 30px rgba(0,175,240,0.3), 0 8px 32px rgba(0,0,0,0.5); } 50% { box-shadow: 0 4px 40px rgba(0,175,240,0.5), 0 8px 32px rgba(0,0,0,0.5); } }
          `}</style>
        </div>
      )}

      {/* Chat panel */}
      {open && (
        <>
          <div className="fixed inset-0 bg-black/50" style={{ zIndex: 9998 }} onClick={() => setOpen(false)} />
          <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-[380px] flex flex-col rounded-2xl overflow-hidden"
            style={{ zIndex: 9999, height: 'min(520px, calc(100dvh - 80px))', background: 'linear-gradient(160deg, #0a0f1e 0%, #0d1628 50%, #0a1220 100%)', border: '2px solid rgba(0,175,240,0.25)', boxShadow: '0 12px 60px rgba(0,0,0,0.7), 0 0 40px rgba(0,175,240,0.15)' }}>
            {/* Header */}
            <div className="shrink-0 px-4 py-3 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="relative shrink-0">
                <img src="/assets/vicky-ai-avatar.jpg" alt="" className="w-11 h-11 rounded-full ring-2 ring-[#00aff0]/30" style={{ objectFit: 'cover', objectPosition: '50% 65%' }} />
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#0a0f1e]" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-[13px] font-black text-white leading-tight">Vicky AI</h2>
                <p className="text-[9px] text-white/40 font-medium">Your personal assistant</p>
              </div>
              <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>

            {!isPremium ? (
              <div className="flex-1 relative overflow-hidden" style={{ minHeight: '320px' }}>
                <video
                  src="https://pub-5800916b33a845e4b67e2d5be553c1e3.r2.dev/tgempire/booty-bazaar/wmremove-transformed.mp4"
                  autoPlay muted loop playsInline
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ filter: 'blur(6px) brightness(0.25)', transform: 'scale(1.1)' }}
                />
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-6 text-center">
                  <img src="/assets/vicky-ai-avatar.jpg" alt="" className="w-24 h-24 rounded-full ring-2 ring-white/20 mb-4 shadow-lg" style={{ objectFit: 'cover', objectPosition: '50% 60%' }} />
                  <h3 className="text-sm font-black text-white mb-1 drop-shadow-md">Meet Vicky AI</h3>
                  <p className="text-[11px] text-white/50 leading-relaxed mb-5 max-w-[220px] drop-shadow-sm">Your personal Erogram concierge. She knows the best creators, groups, bots & AI tools.</p>
                  <a href={typeof window !== 'undefined' && localStorage.getItem('token') ? '/welcome' : '/login?redirect=/welcome'} className="px-5 py-2.5 rounded-xl text-[12px] font-bold text-white transition-all hover:brightness-110 shadow-lg" style={{ background: '#16a34a', boxShadow: '0 4px 16px rgba(22,163,74,0.4)' }}>Upgrade to VIP to unlock</a>
                </div>
              </div>
            ) : (
              <>
                <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
                  {messages.length === 0 && (
                    <div className="flex flex-col items-center pt-6 pb-2">
                      <img src="/assets/vicky-ai-avatar.jpg" alt="" className="w-20 h-20 rounded-full ring-2 ring-[#00aff0]/15 mb-3" style={{ objectFit: 'cover', objectPosition: '50% 60%' }} />
                      <p className="text-[11px] text-white/35 text-center max-w-[240px] mb-4 leading-relaxed">Ask me about the best creators, groups, bots, or AI tools.</p>
                      <div className="w-full grid grid-cols-2 gap-1.5">
                        {['Best MILF creators', 'Top Asian groups', 'Free OnlyFans', 'AI undress tools'].map(s => (
                          <button key={s} onClick={() => send(s)}
                            className="text-left px-2.5 py-2 rounded-lg text-[10px] text-white/45 font-medium hover:text-white/70 hover:bg-white/5 transition-all"
                            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>{s}</button>
                        ))}
                      </div>
                    </div>
                  )}
                  {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-1.5`}>
                      {msg.role === 'assistant' && <img src="/assets/vicky-ai-avatar.jpg" alt="" className="w-8 h-8 rounded-full shrink-0 mt-1" style={{ objectFit: 'cover', objectPosition: '50% 60%' }} />}
                      <div className={`max-w-[85%] ${msg.role === 'user' ? '' : ''}`}>
                        <div className={`px-3 py-2 rounded-2xl text-[11px] leading-relaxed ${msg.role === 'user' ? 'text-white font-medium rounded-br-sm' : 'text-white/85 rounded-bl-sm'}`}
                          style={msg.role === 'user' ? { background: 'rgba(0,175,240,0.2)' } : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <RenderMsg content={msg.content} isUser={msg.role === 'user'} />
                        </div>
                        {msg.creators && msg.creators.length > 0 && (
                          <div className="grid grid-cols-3 gap-1.5 mt-2">
                            {msg.creators.slice(0, 6).map((c, ci) => (
                              <a key={ci} href={c.url} target="_blank" rel="noopener noreferrer"
                                className="group rounded-xl overflow-hidden transition-all hover:scale-[1.03]"
                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                <div className="aspect-square overflow-hidden">
                                  <img src={c.avatar} alt={c.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                                    onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder-avatar.png'; }} />
                                </div>
                                <div className="px-1.5 py-1.5">
                                  <div className="text-[9px] font-bold text-white truncate">{c.name}</div>
                                  <div className="text-[8px] text-white/30 truncate">@{c.username}</div>
                                </div>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {loading && (
                    <div className="flex gap-1.5">
                      <img src="/assets/vicky-ai-avatar.jpg" alt="" className="w-8 h-8 rounded-full shrink-0 mt-1" style={{ objectFit: 'cover', objectPosition: '50% 60%' }} />
                      <div className="px-3 py-2.5 rounded-2xl rounded-bl-sm" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <div className="flex gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce" />
                          <span className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="shrink-0 px-3 pb-3 pt-1" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <form onSubmit={e => { e.preventDefault(); send(input); }} className="flex gap-1.5">
                    <input ref={inputRef} type="text" value={input} onChange={e => setInput(e.target.value)}
                      placeholder="Ask Vicky..." disabled={loading}
                      className="flex-1 bg-white/5 text-white text-[12px] px-3 py-2.5 rounded-xl outline-none placeholder:text-white/20 focus:ring-1 focus:ring-[#00aff0]/30 transition-all"
                      style={{ border: '1px solid rgba(255,255,255,0.08)' }} />
                    <button type="submit" disabled={!input.trim() || loading}
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all disabled:opacity-30"
                      style={{ background: '#00aff0' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                    </button>
                  </form>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </>
  );
}

function RenderMsg({ content, isUser }: { content: string; isUser: boolean }) {
  if (isUser) return <>{content}</>;
  const parts = content.split(/(\[.*?\]\(.*?\)|\*\*.*?\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        const link = part.match(/^\[(.*?)\]\((.*?)\)$/);
        if (link) return <a key={i} href={link[2]} target="_blank" rel="noopener noreferrer" className="text-[#00aff0] underline underline-offset-2 decoration-[#00aff0]/30 font-medium">{link[1]}</a>;
        const bold = part.match(/^\*\*(.*?)\*\*$/);
        if (bold) return <strong key={i} className="font-bold text-white">{bold[1]}</strong>;
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

export default function Profile1Page() {
  return (
    <ToastProvider>
      <Suspense>
        <Profile1Content />
      </Suspense>
    </ToastProvider>
  );
}
