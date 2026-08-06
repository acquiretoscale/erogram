'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { EditorialMasthead, EditorialFooter } from '@/app/blog/EditorialChrome';
import { ToastProvider, useToast } from '@/components/Toast';
import SavedTab from './SavedTab';
import VaultTab from './VaultTab';
import PremiumCompareBlock from '@/components/PremiumCompareBlock';
import ProfileHomeSetupSteps from './ProfileHomeSetupSteps';
import { profileHomeSetupComplete } from '@/lib/profileHomeSetup';
import AvatarPicker from '@/components/AvatarPicker';
import ProfileEditSection from '@/components/ProfileEditSection';
import InterestsEditSection from '@/components/InterestsEditSection';
import { type InterestOption } from '@/lib/userInterests';
import { getProfileInterestOptions } from '@/lib/actions/userProfile';
import { getProfileLikedMedia } from '@/lib/actions/profileFeed';
import { getRecentPremiumHomeSections } from '@/lib/actions/onboarding';
import ProfileFeedTab from './ProfileFeedTab';
import MyLikesTab from './MyLikesTab';
import ThemeTab from './ThemeTab';
import LeaderboardTab from './LeaderboardTab';
import ProfileMyListingsTab from './ProfileMyListingsTab';
import ProfileMyListingsPreview from './ProfileMyListingsPreview';
import { ProfileThemeProvider, useProfileTheme } from './ProfileThemeContext';
import { ProfileEyebrow, ProfileHeading } from './ProfileTypography';
import {
  profileCardClass,
  profileBtnClass,
  profileComponentColors,
  profileCyberShellClass,
  profilePornhubShellClass,
  profileOnlyfansShellClass,
  profileTelegramShellClass,
  profileErogramShellClass,
  profileConsoleShellClass,
} from './profileTheme';

type Tab = 'home' | 'listings' | 'feed' | 'saved' | 'likes' | 'subscription' | 'vault' | 'preferences' | 'settings' | 'theme' | 'leaderboard';

function TelegramMenuIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="shrink-0" aria-hidden>
      <path d="M20.665 3.717l-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701h-.002l.002.001-.314 4.692c.46 0 .663-.211.921-.46l2.211-2.15 4.599 3.397c.848.467 1.457.227 1.668-.785l3.019-14.228c.309-1.239-.473-1.8-1.282-1.434z" />
    </svg>
  );
}

const PREMIUM_MEMBER_GOLD = {
  background: 'linear-gradient(135deg, #f5d061 0%, #c9973a 45%, #a67c00 100%)',
  color: '#2a1f00',
  border: '1px solid #e8c547',
  boxShadow: '0 0 10px rgba(201,151,58,0.45)',
};
type ViewMode = 'admin' | 'premium' | 'free';

interface UserData {
  firstName: string | null;
  photoUrl: string | null;
  interests: string[];
  aiInterests: string[];
  preferredPlatforms: string[];
  interestedInAI: boolean;
  onboardingCompleted: boolean;
}

function ProfileContent() {
  const [mounted, setMounted] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [firstName, setFirstName] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [bio, setBio] = useState<string | null>(null);
  const [memberSince, setMemberSince] = useState<string | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [premiumPlan, setPremiumPlan] = useState<string | null>(null);
  const [premiumSince, setPremiumSince] = useState<string | null>(null);
  const [premiumExpiresAt, setPremiumExpiresAt] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('admin');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [userData, setUserData] = useState<UserData>({
    firstName: null, photoUrl: null, interests: [], aiInterests: [], preferredPlatforms: [],
    interestedInAI: false, onboardingCompleted: false,
  });
  const [tagOptions, setTagOptions] = useState<InterestOption[]>([]);
  const [aiOptions, setAiOptions] = useState<InterestOption[]>([]);
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const tabParam = searchParams.get('tab');
  const initialTab: Tab = pathname === '/profile/leaderboard' ? 'leaderboard'
    : tabParam === 'listings' ? 'listings'
    : tabParam === 'feed' ? 'feed'
    : tabParam === 'saved' ? 'saved'
    : tabParam === 'models' ? 'likes'
    : tabParam === 'likes' ? 'likes'
    : tabParam === 'subscription' ? 'subscription' : tabParam === 'vault' ? 'vault' : tabParam === 'preferences' ? 'preferences' : tabParam === 'settings' ? 'settings' : tabParam === 'theme' ? 'theme' : tabParam === 'leaderboard' ? 'leaderboard' : 'home';
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [menuCollapsed, setMenuCollapsed] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.matchMedia('(max-width: 639px)').matches;
  });
  const [viewBarOpen, setViewBarOpen] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [emailUnverified, setEmailUnverified] = useState(false);
  const [emailVerifiedSuccess, setEmailVerifiedSuccess] = useState(false);
  const [resendSending, setResendSending] = useState(false);
  const [resendSent, setResendSent] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(82);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const measure = () => setHeaderHeight(el.offsetHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [mounted]);

  const selectTab = (tab: Tab) => {
    setActiveTab(tab);
    if (tab === 'leaderboard') router.push('/profile/leaderboard');
    else if (tab === 'home') router.push('/profile');
    else router.push(`/profile?tab=${tab}`);
  };

  useEffect(() => {
    if (pathname === '/profile/leaderboard') {
      setActiveTab('leaderboard');
      return;
    }
    if (tabParam === 'listings') setActiveTab('listings');
    else if (tabParam === 'feed') setActiveTab('feed');
    else if (tabParam === 'saved') setActiveTab('saved');
    else if (tabParam === 'models' || tabParam === 'likes') setActiveTab('likes');
    else if (tabParam === 'subscription') setActiveTab('subscription');
    else if (tabParam === 'vault') setActiveTab('vault');
    else if (tabParam === 'preferences') setActiveTab('preferences');
    else if (tabParam === 'settings') setActiveTab('settings');
    else if (tabParam === 'theme') setActiveTab('theme');
    else if (tabParam === 'leaderboard') setActiveTab('leaderboard');
    else if (pathname === '/profile') setActiveTab('home');
  }, [pathname, tabParam]);

  useEffect(() => {
    getProfileInterestOptions()
      .then((opts) => {
        setTagOptions(opts.tagInterests);
        setAiOptions(opts.aiInterests);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const justVerified =
      searchParams.get('emailVerified') === '1' ||
      sessionStorage.getItem('erogram:emailVerifiedJustNow') === '1';
    if (!justVerified) return;

    setEmailUnverified(false);
    setEmailVerifiedSuccess(true);
    if (searchParams.get('emailVerified') === '1') {
      router.replace('/profile', { scroll: false });
    }
  }, [mounted, searchParams, router]);

  useEffect(() => {
    if (!mounted) return;
    const token = localStorage.getItem('token');
    if (!token) {
      const pendingVerify = sessionStorage.getItem('erogram:emailVerifiedJustNow') === '1';
      router.push(pendingVerify ? '/login?redirect=/profile' : '/login');
      return;
    }

    setUsername(localStorage.getItem('username'));
    setFirstName(localStorage.getItem('firstName'));
    setPhotoUrl(localStorage.getItem('photoUrl'));
    setIsAdmin(localStorage.getItem('isAdmin') === 'true');

    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        if (data.id) setCurrentUserId(String(data.id));
        if (data.premium) setIsPremium(true);
        if (data.isAdmin) { setIsAdmin(true); localStorage.setItem('isAdmin', 'true'); }
        if (data.premiumPlan) setPremiumPlan(data.premiumPlan);
        if (data.premiumSince) setPremiumSince(data.premiumSince);
        if (data.premiumExpiresAt) setPremiumExpiresAt(data.premiumExpiresAt);
        setFirstName(data.firstName || null);
        if (data.photoUrl) setPhotoUrl(data.photoUrl);
        if (data.createdAt) setMemberSince(data.createdAt);
        setBio(data.bio || null);
        if (data.emailVerified) setEmailUnverified(false);
        else setEmailUnverified(!!data.email && !data.emailVerified);
        setUserData({
          firstName: data.firstName || null,
          photoUrl: data.photoUrl || null,
          interests: data.interests || [],
          aiInterests: data.aiInterests || [],
          preferredPlatforms: data.preferredPlatforms || [],
          interestedInAI: data.interestedInAI || false,
          onboardingCompleted: data.onboardingCompleted || false,
        });
      })
      .catch(() => {});

    try {
      const raw = localStorage.getItem('pendingBookmark');
      if (raw) {
        const pending = JSON.parse(raw);
        fetch('/api/bookmarks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(pending),
        }).finally(() => localStorage.removeItem('pendingBookmark'));
      }
    } catch {}
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

  const handleResendVerification = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setResendSending(true);
    try {
      const { resendVerificationEmail } = await import('@/lib/actions/verifyEmail');
      await resendVerificationEmail(token);
      setResendSent(true);
    } finally {
      setResendSending(false);
    }
  };

  const handleDismissEmailVerifiedSuccess = () => {
    setEmailVerifiedSuccess(false);
    sessionStorage.removeItem('erogram:emailVerifiedJustNow');
    if (currentUserId) {
      localStorage.setItem(`erogram:verifiedBannerClosed:${currentUserId}`, '1');
    }
  };

  if (!mounted) return null;

  return <ProfileThemedShell {...{
    mounted, username, firstName, photoUrl, bio, memberSince, isPremium, premiumPlan, premiumSince, premiumExpiresAt,
    isAdmin, viewMode, viewBarOpen, deletingAccount, userData, tagOptions, aiOptions, activeTab, menuCollapsed, headerHeight,
    headerRef, effectivePremium, effectiveAdmin, selectTab, setMenuCollapsed, setViewBarOpen, setViewMode, handleLogout, handleDeleteAccount,
    getRemainingDays, toast, router, setFirstName, setBio, setPhotoUrl, setUserData, currentUserId,
    emailUnverified, emailVerifiedSuccess, handleDismissEmailVerifiedSuccess, resendSending, resendSent, handleResendVerification,
  }} />;
}

function ProfileThemedShell(props: any) {
  const { theme, tokens } = useProfileTheme();
  const searchParams = useSearchParams();
  const {
    username, firstName, photoUrl, bio, memberSince, isPremium, premiumPlan, premiumSince, premiumExpiresAt,
    isAdmin, viewMode, viewBarOpen, deletingAccount, userData, tagOptions, aiOptions, activeTab, menuCollapsed, headerHeight,
    headerRef, effectivePremium, effectiveAdmin, selectTab, setMenuCollapsed, setViewBarOpen, setViewMode, handleLogout, handleDeleteAccount,
    getRemainingDays, toast, router, setFirstName, setBio, setPhotoUrl, setUserData, currentUserId,
    emailUnverified, emailVerifiedSuccess, handleDismissEmailVerifiedSuccess, resendSending, resendSent, handleResendVerification,
  } = props;
  const creatorLiveHighlight = searchParams.get('creatorLive') === '1';

  const [isMobileNav, setIsMobileNav] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 639px)').matches;
  });

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    const sync = () => setIsMobileNav(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  const handleTabSelect = (tab: Tab) => {
    selectTab(tab);
    if (isMobileNav) setMenuCollapsed(true);
  };

  const VIEW_MODES: { key: ViewMode; label: string; short: string }[] = [
    { key: 'admin', label: 'Admin', short: 'A' },
    { key: 'premium', label: 'Premium', short: 'P' },
    { key: 'free', label: 'Free', short: 'F' },
  ];

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'home', label: 'Main', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
    { key: 'listings', label: 'My Listings', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg> },
    { key: 'vault', label: 'Premium TG Groups', icon: <TelegramMenuIcon /> },
    { key: 'feed', label: 'My Feed', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="18" rx="2"/><path d="M10 8l6 4-6 4V8z"/></svg> },
    { key: 'preferences', label: 'My Preferences', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" /><line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" /><line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" /><line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" /></svg> },
    { key: 'likes', label: 'My Likes', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg> },
    { key: 'saved', label: 'My Bookmarks', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg> },
    { key: 'subscription', label: 'My Subscription', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg> },
    { key: 'settings', label: 'Settings', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> },
    { key: 'theme', label: 'Theme', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg> },
  ];

  const sidebarMargin = isMobileNav
    ? 'mr-[40px]'
    : menuCollapsed
      ? 'mr-[60px]'
      : 'mr-[220px]';
  const mobileMenuExpanded = isMobileNav && !menuCollapsed;
  const greeting = firstName ? `Welcome back, ${firstName}` : 'Welcome back';
  const activeTabLabel = activeTab === 'leaderboard'
    ? 'Leaderboard'
    : TABS.find((t) => t.key === activeTab)?.label ?? 'My Profile';
  const cyber = theme === 'cyberpunk';
  const ph = theme === 'pornhub';
  const of = theme === 'onlyfans';
  const tg = theme === 'telegram';
  const er = theme === 'erogram';
  const con = theme === 'console';
  const themedShell = cyber || ph || of || tg || er || con;

  return (
    <div
      className={`min-h-screen ${cyber ? profileCyberShellClass : ph ? profilePornhubShellClass : of ? profileOnlyfansShellClass : tg ? profileTelegramShellClass : er ? profileErogramShellClass : con ? profileConsoleShellClass : 'font-[family-name:var(--font-baloo)]'}`}
      style={themedShell ? { color: tokens.text } : { backgroundColor: tokens.bg, color: tokens.text }}
    >
      <div ref={headerRef}>
        <EditorialMasthead
          wordmarkMode={ph ? 'pornhub' : of ? 'onlyfans' : 'default'}
          accent={ph ? '#FF9000' : of ? '#00AFF0' : tg ? '#2AABEE' : er ? '#991b1b' : con ? '#ff5e2a' : undefined}
        />
      </div>

      {emailVerifiedSuccess && (
        <div className="bg-[#16a34a] text-white border-b border-[#15803d]">
          <div className="max-w-[1280px] mx-auto px-4 sm:px-8 py-2.5 flex items-center justify-center gap-3 text-[12px] sm:text-sm font-semibold">
            <span>You&apos;re all set. Your email is verified.</span>
            <button
              type="button"
              onClick={handleDismissEmailVerifiedSuccess}
              className="rounded-md border border-white/30 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide hover:bg-white/10 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {emailUnverified && !emailVerifiedSuccess && (
        <div className="bg-[#00AFF0] text-white border-b border-[#0099d6]">
          <div className="max-w-[1280px] mx-auto px-4 sm:px-8 py-2.5 flex items-center justify-center gap-3 flex-wrap text-[12px] sm:text-sm font-semibold">
            <span>{resendSent ? 'Verification email sent. Check your inbox.' : 'Verify your email for the full experience.'}</span>
            {!resendSent && (
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={resendSending}
                className="underline hover:no-underline disabled:opacity-60"
              >
                {resendSending ? 'Sending…' : 'Resend email'}
              </button>
            )}
          </div>
        </div>
      )}

      {mobileMenuExpanded && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-x-0 bottom-0 z-20 bg-black/50 sm:hidden"
          style={{ top: headerHeight }}
          onClick={() => setMenuCollapsed(true)}
        />
      )}

      <aside
        className={`fixed right-0 flex flex-col overflow-hidden border-l transition-all duration-300 ease-in-out ${
          mobileMenuExpanded ? 'z-40 shadow-2xl' : 'z-30'
        } ${menuCollapsed ? 'w-[40px] sm:w-[60px]' : isMobileNav ? 'w-[min(220px,78vw)]' : 'w-[220px]'}`}
        style={{
          top: headerHeight,
          height: `calc(100vh - ${headerHeight}px)`,
          backgroundColor: tokens.card,
          borderColor: tokens.border,
        }}
      >
        <div className="border-b shrink-0" style={{ borderColor: tokens.border }}>
          {isAdmin && (
            <div
              className="border-b"
              style={{ borderColor: tokens.border, backgroundColor: tokens.adminBarBg }}
            >
              {viewBarOpen ? (
                <div className={menuCollapsed ? 'px-2 py-2 space-y-2' : 'px-3 py-2.5 space-y-2'}>
                  <div className={`flex items-center gap-2 ${menuCollapsed ? 'justify-center' : 'justify-between'}`}>
                    {!menuCollapsed && <ProfileEyebrow muted className="text-[9px]">View as</ProfileEyebrow>}
                    <button
                      type="button"
                      onClick={() => setViewBarOpen(false)}
                      aria-label="Hide view switcher"
                      className="flex h-6 w-6 items-center justify-center rounded-md transition-colors shrink-0"
                      style={{ color: tokens.muted }}
                      title="Hide to see full experience"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 15l-6-6-6 6" /></svg>
                    </button>
                  </div>
                  <div className={`flex gap-1 ${menuCollapsed ? 'flex-col items-center' : 'flex-wrap'}`}>
                    {VIEW_MODES.map(mode => (
                      <button
                        key={mode.key}
                        type="button"
                        onClick={() => setViewMode(mode.key)}
                        title={mode.label}
                        className={`rounded-full font-bold transition-all ${menuCollapsed ? 'h-6 w-6 text-[9px] sm:h-7 sm:w-7 sm:text-[10px]' : 'px-2.5 py-1 text-[10px]'}`}
                        style={
                          viewMode === mode.key
                            ? { backgroundColor: tokens.accent, color: tokens.ink }
                            : { backgroundColor: 'transparent', color: tokens.muted, border: `1px solid ${tokens.border}` }
                        }
                      >
                        {menuCollapsed ? mode.short : mode.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setViewBarOpen(true)}
                  aria-label="Show view switcher"
                  title={`View as: ${viewMode} (click to expand)`}
                  className={`flex w-full items-center transition-colors ${menuCollapsed ? 'h-8 justify-center px-0 sm:h-9' : 'h-9 gap-2 px-3'}`}
                  style={{ color: tokens.muted }}
                >
                  <span
                    className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-black uppercase shrink-0"
                    style={{ backgroundColor: tokens.accent, color: tokens.ink }}
                  >
                    {VIEW_MODES.find(m => m.key === viewMode)?.short}
                  </span>
                  {!menuCollapsed && (
                    <span className="text-[10px] font-bold tracking-[0.12em] uppercase truncate">
                      {VIEW_MODES.find(m => m.key === viewMode)?.label} view
                    </span>
                  )}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={menuCollapsed ? '' : 'ml-auto shrink-0'}><path d="M6 9l6 6 6-6" /></svg>
                </button>
              )}
            </div>
          )}
          <div className={`flex items-center ${menuCollapsed ? 'h-8 justify-center px-0 sm:h-10' : 'h-10 px-3 justify-end'}`}>
            <button
              type="button"
              onClick={() => setMenuCollapsed((v: boolean) => !v)}
              aria-label={menuCollapsed ? 'Expand menu' : 'Collapse menu'}
              className="flex h-6 w-6 items-center justify-center rounded-md transition-colors sm:h-7 sm:w-7"
              style={{ color: tokens.muted }}
            >
              {menuCollapsed ? (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="sm:h-[14px] sm:w-[14px]"><path d="M15 18l-6-6 6-6" /></svg>
              ) : (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="sm:h-[14px] sm:w-[14px]"><path d="M9 18l6-6-6-6" /></svg>
              )}
            </button>
          </div>

          <div className={`${menuCollapsed ? 'hidden pb-2 sm:flex sm:justify-center sm:px-2 sm:pb-3' : 'px-4 pb-4'}`}>
            {photoUrl && (
              <div
                className={`rounded-full overflow-hidden border-2 mx-auto ${menuCollapsed ? 'w-8 h-8 sm:w-10 sm:h-10' : 'w-16 h-16'}`}
                style={{ borderColor: tokens.border }}
                title={menuCollapsed ? greeting : undefined}
              >
                <img src={photoUrl} alt="" className="w-full h-full object-cover scale-110" />
              </div>
            )}
            {!menuCollapsed && (
              <div className="mt-3 text-center">
                <p className="text-[13px] font-bold leading-tight" style={{ color: tokens.text }}>{greeting}</p>
                {username && <p className="text-[12px] mt-1.5" style={{ color: tokens.muted }}>@{username}</p>}
                {effectivePremium ? (
                  <span
                    className="inline-flex items-center gap-1 mt-2.5 px-2.5 py-1 rounded-full text-[9px] font-bold tracking-[0.18em] uppercase"
                    style={PREMIUM_MEMBER_GOLD}
                  >
                    PREMIUM Member
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => router.push('/premium')}
                    className="inline-flex items-center gap-1 mt-2.5 px-2.5 py-1 rounded-full text-[9px] font-bold tracking-[0.18em] uppercase transition-all hover:brightness-110 active:scale-[0.98]"
                    style={PREMIUM_MEMBER_GOLD}
                  >
                    UPGRADE TO PREMIUM
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 min-h-0 overflow-y-auto space-y-0.5 px-1 py-1.5 sm:px-2 sm:py-3">
          {TABS.map((tabItem) => {
            const active = activeTab === tabItem.key;
            const isVaultTab = tabItem.key === 'vault';
            return (
              <button
                key={tabItem.key}
                type="button"
                onClick={() => handleTabSelect(tabItem.key)}
                title={menuCollapsed ? tabItem.label : undefined}
                className={`relative flex w-full items-center rounded-md transition-all duration-150 ${
                  menuCollapsed ? 'h-8 justify-center px-0 sm:h-9' : 'h-9 gap-2.5 px-3'
                } ${!isVaultTab && cyber && active ? 'profile-cyber-nav-active' : ''} ${!isVaultTab && ph && active ? 'profile-pornhub-nav-active' : ''} ${!isVaultTab && of && active ? 'profile-onlyfans-nav-active' : ''} ${!isVaultTab && tg && active ? 'profile-telegram-nav-active' : ''} ${!isVaultTab && er && active ? 'profile-erogram-nav-active' : ''} ${!isVaultTab && con && active ? 'profile-console-nav-active' : ''}`}
                style={
                  isVaultTab
                    ? PREMIUM_MEMBER_GOLD
                    : {
                        backgroundColor: !cyber && !ph && !of && !tg && !er && active ? tokens.accent : undefined,
                        color: !cyber && !ph && !of && !tg && !er && active ? tokens.ink : cyber && active ? undefined : ph && active ? undefined : of && active ? undefined : tg && active ? undefined : er && active ? undefined : tokens.muted,
                      }
                }
                onMouseEnter={(e) => {
                  if (isVaultTab) return;
                  if (!active) e.currentTarget.style.backgroundColor = tokens.hover;
                }}
                onMouseLeave={(e) => {
                  if (isVaultTab) return;
                  if (!active) e.currentTarget.style.backgroundColor = '';
                }}
              >
                <span className="shrink-0 scale-90 sm:scale-100">{tabItem.icon}</span>
                {!menuCollapsed && (
                  <>
                    <span className={`text-[12px] font-bold truncate ${isVaultTab ? 'tracking-[0.06em] uppercase' : of ? 'profile-onlyfans-nav-label' : tg ? 'profile-telegram-nav-label' : er ? 'profile-erogram-nav-label' : con ? 'profile-console-nav-label' : 'tracking-[0.06em] uppercase'} ${cyber && !isVaultTab ? 'profile-cyber-nav-label' : ''} ${ph && !isVaultTab ? 'profile-pornhub-nav-label' : ''}`}>{tabItem.label}</span>
                    {tabItem.key === 'theme' && (
                      <span className="ml-auto shrink-0 text-[8px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-[#22c55e] text-white">
                        New
                      </span>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </nav>
      </aside>

      <main
        className={`max-w-[1180px] mx-auto px-2 sm:px-8 pt-12 pb-16 transition-all duration-300 ease-in-out min-w-0 ${sidebarMargin}`}
      >
        <section className="pb-4">
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[10px] sm:text-[11px] font-semibold mb-3 sm:mb-4">
            <Link href="/" className="transition-opacity hover:opacity-70" style={{ color: tokens.muted }}>
              Home
            </Link>
            <span aria-hidden style={{ color: tokens.muted, opacity: 0.45 }}>/</span>
            {activeTab === 'home' ? (
              <span style={{ color: tokens.text }}>My Profile</span>
            ) : (
              <>
                <Link href="/profile" className="transition-opacity hover:opacity-70" style={{ color: tokens.muted }}>
                  My Profile
                </Link>
                <span aria-hidden style={{ color: tokens.muted, opacity: 0.45 }}>/</span>
                <span style={{ color: tokens.text }}>{activeTabLabel}</span>
              </>
            )}
          </nav>
        </section>

        <div
          className={`${cyber ? 'profile-cyber-content-card rounded-2xl' : ph ? 'profile-pornhub-content-card rounded-2xl' : of ? 'profile-onlyfans-content-card rounded-2xl' : tg ? 'profile-telegram-content-card rounded-2xl' : er ? 'profile-erogram-content-card rounded-2xl' : con ? 'profile-console-content-card rounded-2xl' : profileCardClass} px-2 py-3 sm:p-8 ${menuCollapsed && isMobileNav ? 'pr-0.5' : ''}`}
          style={themedShell ? undefined : { backgroundColor: tokens.card, borderColor: tokens.border, boxShadow: tokens.cardShadow }}
        >
          {activeTab === 'home' ? (
            <HomeTab
              isPremium={effectivePremium}
              photoUrl={photoUrl}
              interests={userData.interests}
              preferredPlatforms={userData.preferredPlatforms}
              aiInterests={userData.aiInterests}
              tagOptions={tagOptions}
              aiOptions={aiOptions}
              themeMode={theme}
              creatorLiveHighlight={creatorLiveHighlight}
              onNavigate={selectTab}
              onAvatarSaved={(url) => { setPhotoUrl(url); toast('Avatar saved', 'success'); }}
              onAvatarError={(msg) => toast(msg, 'error')}
              onInterestsSaved={(data) => {
                setUserData((prev: UserData) => ({
                  ...prev,
                  preferredPlatforms: data.preferredPlatforms,
                  interests: data.interests,
                  aiInterests: data.aiInterests,
                  interestedInAI: data.preferredPlatforms.includes('ai'),
                }));
                toast('Interests saved', 'success');
              }}
              onInterestsError={(msg) => toast(msg, 'error')}
            />
          ) : activeTab === 'listings' ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <ProfileMyListingsTab username={username} isAdmin={isAdmin} />
            </motion.div>
          ) : activeTab === 'feed' ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <ProfileFeedTab
                interests={userData.interests}
                preferredPlatforms={userData.preferredPlatforms}
                onNavigatePreferences={() => selectTab('preferences')}
              />
            </motion.div>
          ) : activeTab === 'saved' ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <SavedTab isPremium={effectivePremium} themeMode={theme} />
            </motion.div>
          ) : activeTab === 'likes' ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <MyLikesTab isPremium={effectivePremium} themeMode={theme} />
            </motion.div>
          ) : activeTab === 'subscription' ? (
            <SubscriptionTab
              isPremium={effectivePremium}
              premiumPlan={premiumPlan}
              premiumSince={premiumSince}
              premiumExpiresAt={premiumExpiresAt}
              getRemainingDays={getRemainingDays}
            />
          ) : activeTab === 'vault' ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <div className="mb-6">
                <ProfileHeading size="md" className="!mt-0 leading-snug tracking-[0.04em]">
                  PREMIUM TELEGRAM GROUPS
                </ProfileHeading>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] mt-2" style={{ color: tokens.muted }}>
                  UPDATED / VERIFIED DAILY
                </p>
              </div>
              <VaultTab isPremium={effectivePremium} isAdmin={effectiveAdmin} onUpgrade={() => selectTab('subscription')} />
            </motion.div>
          ) : activeTab === 'theme' ? (
            <ThemeTab isPremium={effectivePremium} />
          ) : activeTab === 'leaderboard' ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <LeaderboardTab currentUserId={currentUserId} />
            </motion.div>
          ) : activeTab === 'preferences' ? (
            <PreferencesTab
              interests={userData.interests}
              tagOptions={tagOptions}
              themeMode={theme}
              onInterestsSaved={(data) => {
                setUserData((prev: UserData) => ({
                  ...prev,
                  preferredPlatforms: data.preferredPlatforms,
                  interests: data.interests,
                  aiInterests: data.aiInterests,
                  interestedInAI: false,
                }));
                toast('Interests saved', 'success');
              }}
              onInterestsError={(msg) => toast(msg, 'error')}
            />
          ) : activeTab === 'settings' ? (
            <SettingsTab
              username={username}
              firstName={firstName}
              bio={bio}
              memberSince={memberSince}
              photoUrl={photoUrl}
              isPremium={effectivePremium}
              isAdmin={isAdmin}
              viewMode={viewMode}
              deletingAccount={deletingAccount}
              themeMode={theme}
              onLogout={handleLogout}
              onDeleteAccount={handleDeleteAccount}
              onAvatarSaved={(url) => { setPhotoUrl(url); toast('Avatar saved', 'success'); }}
              onAvatarError={(msg) => toast(msg, 'error')}
              onProfileSaved={({ firstName: fn, bio: b }) => {
                setFirstName(fn);
                setBio(b);
                toast('Profile saved', 'success');
              }}
              onProfileError={(msg) => toast(msg, 'error')}
            />
          ) : null}
        </div>
      </main>

      <div className={`transition-all duration-300 ease-in-out ${sidebarMargin}`} style={{ background: tokens.footerGradient }}>
        <EditorialFooter />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   HOME TAB — Personalized dashboard
   ═══════════════════════════════════════════════════════════════════ */

function HomeTab({
  isPremium,
  photoUrl,
  interests,
  preferredPlatforms,
  aiInterests,
  tagOptions,
  aiOptions,
  themeMode,
  creatorLiveHighlight = false,
  onNavigate,
  onAvatarSaved,
  onAvatarError,
  onInterestsSaved,
  onInterestsError,
}: {
  isPremium: boolean;
  photoUrl: string | null;
  interests: string[];
  preferredPlatforms: string[];
  aiInterests: string[];
  tagOptions: InterestOption[];
  aiOptions: InterestOption[];
  themeMode: import('./profileTheme').ProfileThemeId;
  creatorLiveHighlight?: boolean;
  onNavigate: (tab: Tab) => void;
  onAvatarSaved: (url: string) => void;
  onAvatarError: (msg: string) => void;
  onInterestsSaved: (data: { preferredPlatforms: string[]; interests: string[]; aiInterests: string[] }) => void;
  onInterestsError: (msg: string) => void;
}) {
  const { tokens } = useProfileTheme();
  const [savedCreators, setSavedCreators] = useState<any[]>([]);
  const [savedBookmarks, setSavedBookmarks] = useState<any[]>([]);
  const [likedMedia, setLikedMedia] = useState<{ url: string; type: string }[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [recentPremiumGroups, setRecentPremiumGroups] = useState<
    { _id: string; name: string; slug: string; image: string; category: string; categories: string[]; memberCount: number }[]
  >([]);
  const [recentPremiumNiches, setRecentPremiumNiches] = useState<
    { niche: string; image: string; latestAt: string; totalSubs: number }[]
  >([]);
  const [recentGroupsLoaded, setRecentGroupsLoaded] = useState(false);
  const [recentNichesLoaded, setRecentNichesLoaded] = useState(false);

  useEffect(() => {
    if (isPremium) {
      setRecentGroupsLoaded(true);
      setRecentNichesLoaded(true);
      return;
    }
    getRecentPremiumHomeSections(20, 20)
      .then(({ groups, niches }) => {
        setRecentPremiumGroups(groups);
        setRecentPremiumNiches(niches);
      })
      .catch(() => {
        setRecentPremiumGroups([]);
        setRecentPremiumNiches([]);
      })
      .finally(() => {
        setRecentGroupsLoaded(true);
        setRecentNichesLoaded(true);
      });
  }, [isPremium]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      fetch('/api/onlyfans/save/creators', { headers }).then(r => r.ok ? r.json() : { creators: [] }).catch(() => ({ creators: [] })),
      fetch('/api/bookmarks?limit=8', { headers }).then(r => r.ok ? r.json() : []).catch(() => []),
      getProfileLikedMedia(token).catch(() => ({ items: [] })),
    ]).then(([creatorsRes, bookmarks, likedRes]) => {
      const creators = Array.isArray(creatorsRes?.creators) ? creatorsRes.creators : [];
      setSavedCreators(creators.slice(0, 8));
      setSavedBookmarks(Array.isArray(bookmarks) ? bookmarks.slice(0, 8) : []);
      setLikedMedia((likedRes.items || []).slice(0, 8).map((item) => ({ url: item.url, type: item.type })));
      setLoaded(true);
    });
  }, []);

  const bookmarkImages = [
    ...savedBookmarks.map((b: any) => b.item?.image).filter(Boolean),
    ...savedCreators.map((c: any) => c.avatar || c.photoUrl).filter(Boolean),
  ];
  const bookmarkCount = savedBookmarks.length + savedCreators.length;
  const likedPreviewImages = likedMedia.map((item) => item.url).filter(Boolean);

  const renderPreview = (images: string[]) => (
    <div className="grid grid-cols-4 gap-1.5 rounded-2xl overflow-hidden border" style={{ borderColor: tokens.border }}>
      {images.slice(0, 8).map((img, i) => (
        <div key={i} className="aspect-square overflow-hidden">
          <img src={img} alt="" className="w-full h-full object-cover" loading="lazy"
            onError={(e) => { (e.target as HTMLImageElement).src = '/assets/placeholder-no-image.png'; }} />
        </div>
      ))}
    </div>
  );

  const handlePremiumGate = (premiumTab: Tab) => {
    if (isPremium) onNavigate(premiumTab);
    else onNavigate('subscription');
  };

  const formatGroupCount = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
  };

  const setupComplete = profileHomeSetupComplete(photoUrl, interests);
  const homeQuickLinks: { tab: Tab; label: string }[] = [
    { tab: 'feed', label: 'My Feed' },
    { tab: 'likes', label: 'My Likes' },
    { tab: 'saved', label: 'My Bookmarks' },
    { tab: 'listings', label: 'My Listings' },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <ProfileMyListingsPreview highlight={creatorLiveHighlight} onManageListings={() => onNavigate('listings')} />
      <ProfileHomeSetupSteps
        photoUrl={photoUrl}
        interests={interests}
        preferredPlatforms={preferredPlatforms}
        aiInterests={aiInterests}
        tagOptions={tagOptions}
        aiOptions={aiOptions}
        themeMode={themeMode}
        onNavigate={onNavigate}
        onAvatarSaved={onAvatarSaved}
        onAvatarError={onAvatarError}
        onInterestsSaved={onInterestsSaved}
        onInterestsError={onInterestsError}
      />

      {setupComplete && (
        <section className="mb-8 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
          {homeQuickLinks.map((link) => (
            <button
              key={link.tab}
              type="button"
              onClick={() => onNavigate(link.tab)}
              className="w-full min-w-0 rounded-lg border-2 border-[#111] bg-white px-1.5 py-2.5 sm:px-2.5 sm:py-3 text-center whitespace-nowrap shadow-[2px_2px_0_0_#111] sm:shadow-[3px_3px_0_0_#111] transition-all duration-150 hover:-translate-x-px hover:-translate-y-px hover:shadow-[3px_3px_0_0_#111] sm:hover:shadow-[4px_4px_0_0_#111] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0_0_#111]"
            >
              <span className="block text-[10px] sm:text-[12px] font-black uppercase tracking-tight leading-none text-[#111]">
                {link.label}
              </span>
            </button>
          ))}
        </section>
      )}

      {!isPremium && <PremiumCompareBlock className="mb-10" />}

      {!isPremium && (
      <>
      <Link
        href="/premium"
        className="mb-6 w-full rounded-xl px-5 py-4 sm:py-5 text-center transition-all hover:opacity-95 active:scale-[0.995] border block"
        style={{
          background: PREMIUM_MEMBER_GOLD.background,
          color: PREMIUM_MEMBER_GOLD.color,
          border: PREMIUM_MEMBER_GOLD.border,
          boxShadow: PREMIUM_MEMBER_GOLD.boxShadow,
        }}
      >
        <span className="text-[16px] sm:text-[20px] font-black uppercase tracking-[0.06em] leading-none">
          UPGRADE TO PREMIUM
        </span>
      </Link>

      <section className="mb-10">
        <div className="border-b pb-4 mb-5" style={{ borderColor: tokens.border }}>
          <ProfileHeading size="md" as="h3" className="!mt-0">Recently Added Premium Groups</ProfileHeading>
        </div>
        {!recentGroupsLoaded ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-xl animate-pulse" style={{ backgroundColor: tokens.hover }} />
            ))}
          </div>
        ) : recentPremiumGroups.length === 0 ? (
          <p className="text-[13px]" style={{ color: tokens.muted }}>No groups yet.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2">
            {recentPremiumGroups.map((group) => {
              const cats = group.categories?.length ? group.categories : [group.category].filter(Boolean);
              return (
                <button
                  key={group._id}
                  type="button"
                  onClick={() => handlePremiumGate('vault')}
                  className="aspect-square rounded-xl overflow-hidden relative text-left transition-all hover:opacity-95 active:scale-[0.98]"
                >
                  <img
                    src={group.image}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => { (e.target as HTMLImageElement).src = '/assets/placeholder-no-image.png'; }}
                  />
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 30%, rgba(10,9,8,0.85) 70%, rgba(10,9,8,0.95) 100%)' }} />
                  <div className="absolute bottom-0 left-0 right-0 p-2">
                    <p className="text-[10px] sm:text-[11px] font-bold text-white leading-tight truncate mb-1">
                      {(group.name || '').slice(0, 5)}
                      <span style={{ filter: 'blur(5px)', opacity: 0.7, userSelect: 'none' }}>{(group.name || '').slice(5) || '██████'}</span>
                    </p>
                    {cats[0] && (
                      <span className="text-[7px] font-black uppercase tracking-wide px-1 py-px rounded" style={{ background: 'rgba(10,9,8,0.5)', color: '#c9973a' }}>{cats[0]}</span>
                    )}
                    {group.memberCount > 0 && (
                      <p className="text-[9px] font-semibold mt-1" style={{ color: '#9a8060' }}>{formatGroupCount(group.memberCount)} subs</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section className="mb-10">
        <div className="border-b pb-4 mb-5" style={{ borderColor: tokens.border }}>
          <ProfileHeading size="md" as="h3" className="!mt-0">Recently Added Premium Niches</ProfileHeading>
        </div>
        {!recentNichesLoaded ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-xl animate-pulse" style={{ backgroundColor: tokens.hover }} />
            ))}
          </div>
        ) : recentPremiumNiches.length === 0 ? (
          <p className="text-[13px]" style={{ color: tokens.muted }}>No niches yet.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2">
            {recentPremiumNiches.map((item) => (
              <button
                key={item.niche}
                type="button"
                onClick={() => handlePremiumGate('vault')}
                className="aspect-square rounded-xl overflow-hidden relative text-left transition-all hover:opacity-95 active:scale-[0.98]"
              >
                <img
                  src={item.image}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => { (e.target as HTMLImageElement).src = '/assets/placeholder-no-image.png'; }}
                />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 25%, rgba(10,9,8,0.88) 65%, rgba(10,9,8,0.98) 100%)' }} />
                <div className="absolute bottom-0 left-0 right-0 p-2">
                  <p className="text-[11px] sm:text-[12px] font-black text-white leading-tight line-clamp-2 uppercase tracking-wide">
                    {item.niche}
                  </p>
                  {item.totalSubs > 0 && (
                    <p className="text-[9px] font-semibold mt-1" style={{ color: '#9a8060' }}>{formatGroupCount(item.totalSubs)} subs</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
      </>
      )}

      {isPremium && loaded && bookmarkImages.length > 0 && (
        <section className="mb-10">
          <div className="flex items-end justify-between gap-4 border-b pb-4 mb-5" style={{ borderColor: tokens.border }}>
            <div>
              <ProfileEyebrow>Bookmarks</ProfileEyebrow>
              <ProfileHeading size="md" as="h3">My Bookmarks ({bookmarkCount})</ProfileHeading>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('saved')}
              className="text-[11px] font-semibold tracking-[0.22em] uppercase shrink-0"
              style={{ color: tokens.muted }}
            >
              View all →
            </button>
          </div>
          {renderPreview(bookmarkImages.slice(0, 8))}
        </section>
      )}

      {isPremium && loaded && likedPreviewImages.length > 0 && (
        <section className="mb-10">
          <div className="flex items-end justify-between gap-4 border-b pb-4 mb-5" style={{ borderColor: tokens.border }}>
            <div>
              <ProfileEyebrow>OnlyFans</ProfileEyebrow>
              <ProfileHeading size="md" as="h3">My Likes ({likedPreviewImages.length})</ProfileHeading>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('likes')}
              className="text-[11px] font-semibold tracking-[0.22em] uppercase shrink-0"
              style={{ color: tokens.muted }}
            >
              View all →
            </button>
          </div>
          {renderPreview(likedPreviewImages.slice(0, 8))}
        </section>
      )}

      <div className="flex items-center justify-center gap-4 pt-4 border-t" style={{ borderColor: tokens.border }}>
        <a href="mailto:support@erogram.biz" className="text-[11px] font-semibold tracking-[0.18em] uppercase transition-colors hover:opacity-70" style={{ color: tokens.muted }}>Support</a>
        <span style={{ color: tokens.border }}>|</span>
        <a href="https://t.me/erogramDOTpro" target="_blank" rel="noopener noreferrer" className="text-[11px] font-semibold tracking-[0.18em] uppercase transition-colors hover:opacity-70" style={{ color: tokens.muted }}>Telegram</a>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   SUBSCRIPTION TAB
   ═══════════════════════════════════════════════════════════════════ */

function SubscriptionTab({
  isPremium,
  premiumPlan,
  premiumSince,
  premiumExpiresAt,
  getRemainingDays,
}: {
  isPremium: boolean;
  premiumPlan: string | null;
  premiumSince: string | null;
  premiumExpiresAt: string | null;
  getRemainingDays: () => number | null;
}) {
  const { tokens } = useProfileTheme();
  const remaining = getRemainingDays();
  const soon = remaining !== null && remaining <= 7;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <ProfileEyebrow>Membership</ProfileEyebrow>
      <ProfileHeading size="xl" className="mb-6">My Subscription</ProfileHeading>
      <div className="space-y-4 max-w-md">
        <div className="flex justify-between text-sm border-b pb-3" style={{ borderColor: tokens.border }}>
          <span style={{ color: tokens.muted }}>Plan</span>
          <span className="font-bold capitalize" style={{ color: isPremium ? '#8a6115' : tokens.text }}>
            {isPremium ? (premiumPlan || 'Premium') : 'Free'}
          </span>
        </div>
        <div className="flex justify-between text-sm border-b pb-3" style={{ borderColor: tokens.border }}>
          <span style={{ color: tokens.muted }}>Started</span>
          <span style={{ color: tokens.text }}>
            {isPremium && premiumSince ? new Date(premiumSince).toLocaleDateString() : '-'}
          </span>
        </div>
        <div className="flex justify-between text-sm border-b pb-3" style={{ borderColor: tokens.border }}>
          <span style={{ color: tokens.muted }}>Ends</span>
          <span className={soon ? 'text-red-600 font-semibold' : ''} style={{ color: soon ? undefined : tokens.text }}>
            {!isPremium
              ? '-'
              : premiumPlan === 'lifetime'
                ? 'Never'
                : premiumExpiresAt
                  ? new Date(premiumExpiresAt).toLocaleDateString()
                  : '-'}
          </span>
        </div>
        {isPremium && remaining !== null && remaining > 0 && (
          <div className="flex justify-between text-sm">
            <span style={{ color: tokens.muted }}>Remaining</span>
            <span className={`font-bold ${soon ? 'text-red-600' : ''}`} style={{ color: soon ? undefined : '#8a6115' }}>
              {remaining} day{remaining !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>
      {!isPremium && (
        <a
          href="/premium"
          className={`${profileBtnClass} mt-8`}
          style={{ color: tokens.ink, backgroundColor: tokens.accent }}
        >
          Upgrade to Premium →
        </a>
      )}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   PREFERENCES TAB — Feed category picks
   ═══════════════════════════════════════════════════════════════════ */

function PreferencesTab({
  interests,
  tagOptions,
  onInterestsSaved,
  onInterestsError,
  themeMode,
}: {
  interests: string[];
  tagOptions: InterestOption[];
  onInterestsSaved: (data: { preferredPlatforms: string[]; interests: string[]; aiInterests: string[] }) => void;
  onInterestsError: (msg: string) => void;
  themeMode: import('./profileTheme').ProfileThemeId;
}) {
  const { tokens } = useProfileTheme();

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="mb-6">
        <ProfileEyebrow>OnlyFans</ProfileEyebrow>
        <ProfileHeading size="xl" as="h2" className="!mt-0">
          My Preferences
        </ProfileHeading>
        <p className="text-sm mt-2 max-w-2xl" style={{ color: tokens.muted }}>
          The more specific you are, the hotter your FEED gets.
        </p>
      </div>
      <InterestsEditSection
        themeMode={themeMode}
        embedded
        minimumCategories={3}
        preferredPlatforms={['onlyfans']}
        interests={interests}
        aiInterests={[]}
        tagOptions={tagOptions}
        aiOptions={[]}
        onSaved={onInterestsSaved}
        onError={onInterestsError}
      />
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   SETTINGS TAB — Account, premium info, logout, support
   ═══════════════════════════════════════════════════════════════════ */

function SettingsTab({
  username, firstName, bio, memberSince, photoUrl, isPremium, isAdmin, viewMode,
  deletingAccount, onLogout, onDeleteAccount, onAvatarSaved, onAvatarError,
  onProfileSaved, onProfileError,
  themeMode,
}: {
  username: string | null; firstName: string | null; bio: string | null; memberSince: string | null;
  photoUrl: string | null;
  isPremium: boolean; isAdmin: boolean; viewMode: ViewMode;
  deletingAccount: boolean; onLogout: () => void; onDeleteAccount: () => void;
  onAvatarSaved: (url: string) => void; onAvatarError: (msg: string) => void;
  onProfileSaved: (data: { firstName: string | null; bio: string | null }) => void;
  onProfileError: (msg: string) => void;
  themeMode: import('./profileTheme').ProfileThemeId;
}) {
  const { tokens } = useProfileTheme();
  const fieldBg = profileComponentColors(themeMode).fieldBg;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="text-center mb-8 pb-8 border-b" style={{ borderColor: tokens.border }}>
        <ProfileHeading size="lg" as="h2">{firstName || username || 'User'}</ProfileHeading>
        {username && <p className="text-sm mt-1" style={{ color: tokens.muted }}>@{username}</p>}
        {bio && <p className="text-[15px] leading-relaxed mt-3 max-w-md mx-auto" style={{ color: tokens.muted }}>{bio}</p>}
        {isPremium && (
          <div
            className="inline-flex items-center gap-1 mt-3 px-3 py-1 rounded-full text-[10px] font-bold tracking-[0.2em] uppercase"
            style={{ backgroundColor: 'rgba(201,151,58,0.15)', color: '#8a6115', border: '1px solid rgba(201,151,58,0.3)' }}
          >
            Premium{isAdmin && viewMode !== 'admin' ? ' (simulated)' : ''}
          </div>
        )}
      </div>

      <AvatarPicker themeMode={themeMode} currentPhotoUrl={photoUrl} onSaved={onAvatarSaved} onError={onAvatarError} />

      <ProfileEditSection themeMode={themeMode} username={username} firstName={firstName} bio={bio} memberSince={memberSince} onSaved={onProfileSaved} onError={onProfileError} />

      <div className="space-y-2 mb-8 pt-6 border-t" style={{ borderColor: tokens.border }}>
        <a href="mailto:support@erogram.biz" className="flex items-center gap-3 p-3 rounded-xl transition-all hover:opacity-80 border" style={{ borderColor: tokens.border, backgroundColor: fieldBg }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
          <span className="text-xs font-semibold" style={{ color: tokens.text }}>support@erogram.biz</span>
        </a>
        <a href="https://t.me/erogramDOTpro" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-xl transition-all hover:opacity-80 border" style={{ borderColor: tokens.border, backgroundColor: fieldBg }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#3b82f6"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0h-.056zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
          <span className="text-xs font-semibold" style={{ color: tokens.text }}>@erogramDOTpro</span>
        </a>
      </div>

      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={onLogout}
          className={`${profileBtnClass} w-full max-w-xs justify-center`}
          style={{ color: tokens.ink, backgroundColor: tokens.accent }}
        >
          Log out
        </button>
        <button type="button" onClick={onDeleteAccount} disabled={deletingAccount} className="text-[11px] text-red-600/60 hover:text-red-600 transition-colors underline underline-offset-2 disabled:opacity-50">
          {deletingAccount ? 'Deleting...' : 'Delete account permanently'}
        </button>
      </div>
    </motion.div>
  );
}

export default function ProfilePage() {
  return (
    <ToastProvider>
      <ProfileThemeProvider>
        <Suspense>
          <ProfileContent />
        </Suspense>
      </ProfileThemeProvider>
    </ToastProvider>
  );
}
