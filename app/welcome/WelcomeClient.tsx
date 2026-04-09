'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  getMixedFeed,
  getVaultPreviewGroups,
  saveOnboardingPreferences,
  completeOnboarding,
} from '@/lib/actions/onboarding';
import { chatWithVicky } from '@/lib/actions/vickyAI';

/* ─── Types ─── */
interface Category {
  name: string;
  slug: string;
}

interface Creator {
  _id: string;
  name: string;
  username: string;
  slug: string;
  avatar: string;
  header: string;
  subscriberCount: number;
  categories: string[];
  type: 'creator';
}

interface GroupItem {
  _id: string;
  name: string;
  slug: string;
  image: string;
  category: string;
  categories: string[];
  country: string;
  memberCount: number;
  type: 'group';
}

interface AINsfwTool {
  slug: string;
  name: string;
  category: string;
  image: string;
  description: string;
  tryNowUrl: string;
  subscription: string;
}

interface PendingBookmark {
  itemId: string;
  itemType: 'group' | 'bot';
}

interface WelcomeClientProps {
  categories: Category[];
  aiTools: AINsfwTool[];
  isPreview?: boolean;
  fromBookmark?: boolean;
}

/* ─── Helpers ─── */
const fmtNum = (n: number) =>
  n >= 1_000_000
    ? (n / 1_000_000).toFixed(1) + 'M'
    : n >= 1_000
      ? (n / 1_000).toFixed(n >= 10_000 ? 0 : 1) + 'K'
      : n > 0
        ? String(n)
        : '0';

// Only these 11 categories are shown initially in Step 2
const PRIORITY_SLUGS = [
  'asian', 'blonde', 'brunette', 'redhead',
  'big-ass', 'big-boobs', 'petite', 'amateur',
  'curvy', 'latina', 'ebony',
];

const AI_TOOL_CATEGORIES = [
  { slug: 'ai-girlfriend', name: 'AI Girlfriend' },
  { slug: 'undress-ai', name: 'Undress AI' },
  { slug: 'ai-chat', name: 'AI Chat' },
  { slug: 'ai-image', name: 'AI Image' },
  { slug: 'ai-roleplay', name: 'AI Roleplay' },
];

/* ─── SVG Icons ─── */
function IconOnlyFans({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="24" r="24" fill="#00AFF0" />
      <path
        d="M24 10C16.27 10 10 16.27 10 24C10 31.73 16.27 38 24 38C31.73 38 38 31.73 38 24C38 16.27 31.73 10 24 10ZM24 32C19.58 32 16 28.42 16 24C16 19.58 19.58 16 24 16C28.42 16 32 19.58 32 24C32 28.42 28.42 32 24 32Z"
        fill="white"
      />
      <circle cx="24" cy="24" r="4" fill="white" />
    </svg>
  );
}

function IconTelegram({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="24" r="24" fill="#26A5E4" />
      <path
        d="M35.5 13.5L10.5 22.8C10.5 22.8 9.8 23.1 9.9 23.7C10 24.3 10.7 24.6 10.7 24.6L16.5 26.5L19 33.5C19 33.5 19.3 34.3 20 34.3C20.7 34.3 21.2 33.8 21.2 33.8L24.5 30.5L30.5 35C30.5 35 31.1 35.3 31.7 35C32.3 34.7 32.5 34 32.5 34L36.5 15C36.5 15 36.7 13.8 35.5 13.5ZM31 18.5L20.5 27.8C20.5 27.8 20.1 28.1 20 28.6L19.3 32L18 27.5L31 18.5Z"
        fill="white"
      />
    </svg>
  );
}

function IconAI({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="24" r="24" fill="#7C3AED" />
      <path d="M16 20C16 20 18 14 24 14C30 14 32 20 32 20" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <rect x="14" y="20" width="20" height="12" rx="3" fill="white" fillOpacity="0.15" stroke="white" strokeWidth="1.5" />
      <circle cx="19" cy="26" r="2.5" fill="white" />
      <circle cx="29" cy="26" r="2.5" fill="white" />
      <path d="M19 32V35" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M29 32V35" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/* ─── Platform config ─── */
const PLATFORMS = [
  {
    id: 'onlyfans',
    icon: <IconOnlyFans />,
    title: 'OnlyFans Creators',
    desc: 'Browse 1.8M+ creators & save your favorites',
  },
  {
    id: 'telegram',
    icon: <IconTelegram />,
    title: 'Telegram Groups',
    desc: 'Join niche communities & save them to your vault',
  },
  {
    id: 'ai',
    icon: <IconAI />,
    title: 'AI Tools',
    desc: 'AI Girlfriend, Undress AI, AI Chat & more',
  },
];

/* ─── Main Component ─── */
export default function WelcomeClient({ categories, aiTools, isPreview = false, fromBookmark = false }: WelcomeClientProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedAICategories, setSelectedAICategories] = useState<string[]>([]);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [vaultPreviews, setVaultPreviews] = useState<{ _id: string; image: string; category: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [pendingBookmark, setPendingBookmark] = useState<PendingBookmark | null>(null);
  const fetchRef = useRef(0);

  useEffect(() => {
    if (fromBookmark && typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('pendingBookmark');
        if (raw) setPendingBookmark(JSON.parse(raw));
      } catch {}
    }
  }, [fromBookmark]);

  const showOF = selectedPlatforms.includes('onlyfans');
  const showTG = selectedPlatforms.includes('telegram');
  const showAI = selectedPlatforms.includes('ai');

  /* ── Fetch mixed feed ── */
  const loadFeed = useCallback(async (cats: string[]) => {
    const id = ++fetchRef.current;
    setLoading(true);
    const { creators: c, groups: g } = await getMixedFeed(cats, {
      creatorLimit: showOF ? 8 : 0,
      groupLimit: showTG ? 8 : 0,
    });
    if (fetchRef.current !== id) return;
    setCreators(c as Creator[]);
    setGroups(g as GroupItem[]);
    setLoading(false);
  }, [showOF, showTG]);

  /* ── Save preferences + go to step 3 ── */
  const handleStep2Next = useCallback(async () => {
    if (!isPreview) {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (token) {
        await saveOnboardingPreferences(token, {
          interests: selectedCategories,
          preferredPlatforms: selectedPlatforms,
          interestedInAI: showAI,
        });
      }
    }
    await loadFeed(selectedCategories);
    setStep(3);
  }, [isPreview, selectedCategories, selectedPlatforms, showAI, loadFeed]);

  /* ── Complete onboarding (also used by skip) ── */
  const finishAndRedirect = useCallback(async () => {
    if (!isPreview) {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (token) {
        await completeOnboarding(token, {
          creatorIds: creators.map(c => c._id),
          groupIds: groups.map(g => g._id),
        });

        if (pendingBookmark) {
          try {
            await fetch('/api/bookmarks', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify(pendingBookmark),
            });
            localStorage.removeItem('pendingBookmark');
          } catch {}
        }
      }
    }
  }, [isPreview, selectedCategories, categories, creators, groups, pendingBookmark]);

  const [simPayment, setSimPayment] = useState<{ paid: boolean; method?: 'stars' | 'crypto'; plan?: string } | null>(null);

  const storeSimData = useCallback(() => {
    try {
      const aiCatNames = selectedAICategories.map(s =>
        AI_TOOL_CATEGORIES.find(c => c.slug === s)?.name || ''
      ).filter(Boolean);
      let simAITools = showAI
        ? (aiCatNames.length > 0
            ? aiTools.filter(t => aiCatNames.includes(t.category)).slice(0, 6)
            : aiTools.slice(0, 3))
        : [];
      sessionStorage.setItem('simOnboardingData', JSON.stringify({
        creators,
        groups,
        aiTools: simAITools,
        interests: selectedCategories,
      }));
    } catch {}
  }, [creators, groups, aiTools, selectedCategories, selectedAICategories, showAI]);

  const goToCelebration = useCallback(async (paid: boolean, method?: 'stars' | 'crypto', plan?: string) => {
    if (isPreview) {
      storeSimData();
      const vm = paid ? 'premium' : 'free';
      window.location.href = `/profile1?onboarding=complete&vm=${vm}`;
      return;
    }
    await finishAndRedirect();
    router.replace('/profile1?tab=home&onboarding=complete');
  }, [isPreview, storeSimData, finishAndRedirect, router]);

  const handleFinish = useCallback(async () => {
    setFinishing(true);
    if (isPreview) {
      storeSimData();
      window.location.href = '/profile1?onboarding=complete&vm=free';
      return;
    }
    await finishAndRedirect();
    router.replace('/profile1?tab=home&onboarding=complete');
  }, [isPreview, finishAndRedirect, storeSimData, router]);

  const handleSkip = useCallback(async () => {
    setFinishing(true);
    if (isPreview) {
      storeSimData();
      window.location.href = '/profile1?onboarding=complete&vm=free';
      return;
    }
    await finishAndRedirect();
    router.replace('/profile1?tab=home&onboarding=complete');
  }, [isPreview, finishAndRedirect, storeSimData, router]);

  const togglePlatform = (id: string) =>
    setSelectedPlatforms(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );

  const toggleCategory = (slug: string) =>
    setSelectedCategories(prev =>
      prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug]
    );

  const toggleAICategory = (slug: string) =>
    setSelectedAICategories(prev =>
      prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug]
    );

  const progress = step >= 5 ? 100 : (step / 4) * 100;

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(160deg, #0a0f1e 0%, #0d1628 50%, #0a1220 100%)' }}>
      {/* ── Top bar (hidden on celebration) ── */}
      {step < 5 && <div className="sticky top-0 z-50 border-b border-white/[0.06]" style={{ background: 'rgba(10,15,30,0.92)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-white text-sm font-black tracking-tight">erogram</span>
            <span className="text-white/20 text-[10px] font-semibold uppercase tracking-widest">Setup</span>
          </div>
          <div className="flex items-center gap-3">
            {isPreview && (
              <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30">
                Preview
              </span>
            )}
            <span className="text-white/25 text-xs font-medium tabular-nums">{step}/4</span>
            <button
              onClick={handleSkip}
              disabled={finishing}
              className="text-white hover:text-white/70 text-xs font-semibold transition-colors px-3 py-1 rounded-full"
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}
            >
              Skip
            </button>
          </div>
        </div>
        <div className="h-[2px]" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <div
            className="h-full transition-all duration-500 ease-out"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #00AFF0, #00D4FF)',
            }}
          />
        </div>
      </div>}

      {/* ── Content ── */}
      <div className="max-w-lg mx-auto w-full px-4 py-8 sm:py-12">
        {/* Pending bookmark banner for users who registered via save */}
        {pendingBookmark && step === 1 && (
          <div className="mb-6 rounded-xl px-4 py-3 flex items-center gap-3 animate-[fadeInUp_0.3s_ease-out]" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#34d399">
              <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/>
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-bold text-emerald-400">Your {pendingBookmark.itemType} is saved!</p>
              <p className="text-[10px] text-white/35 mt-0.5">It&apos;s waiting for you. Let&apos;s build your perfect experience first.</p>
            </div>
          </div>
        )}

        {step === 1 && (
          <Step1
            selected={selectedPlatforms}
            onToggle={togglePlatform}
            onNext={() => setStep(2)}
          />
        )}
        {step === 2 && (
          <Step2
            categories={categories}
            selected={selectedCategories}
            onToggle={toggleCategory}
            showAI={showAI}
            selectedAICategories={selectedAICategories}
            onToggleAI={toggleAICategory}
            onBack={() => setStep(1)}
            onNext={handleStep2Next}
          />
        )}
        {step === 3 && (() => {
          let filteredAITools: AINsfwTool[] = [];
          if (showAI) {
            if (selectedAICategories.length > 0) {
              const aiCatNames = selectedAICategories.map(s =>
                AI_TOOL_CATEGORIES.find(c => c.slug === s)?.name || ''
              ).filter(Boolean);
              filteredAITools = aiTools.filter(t => aiCatNames.includes(t.category)).slice(0, 6);
            }
            if (filteredAITools.length === 0) filteredAITools = aiTools.slice(0, 3);
          }
          return (
            <Step3
              creators={creators}
              groups={groups}
              aiTools={filteredAITools}
              showOF={showOF}
              showTG={showTG}
              showAI={showAI}
              loading={loading}
              onBack={() => setStep(2)}
              onNext={async () => {
                const vp = await getVaultPreviewGroups(selectedCategories, 15);
                setVaultPreviews(vp);
                setStep(4);
              }}
            />
          );
        })()}
        {step === 4 && (
          <Step4
            topCategory={
              selectedCategories.length > 0
                ? categories.find(c => c.slug === selectedCategories[0])?.name || 'Favorites'
                : 'Favorites'
            }
            creatorCount={creators.length + groups.length}
            vaultPreviews={vaultPreviews}
            finishing={finishing}
            isPreview={isPreview}
            onFinish={handleFinish}
            onBack={() => setStep(3)}
            onSimulate={goToCelebration}
          />
        )}
        {step === 5 && simPayment && (() => {
          let filteredAITools5: AINsfwTool[] = [];
          if (showAI) {
            if (selectedAICategories.length > 0) {
              const aiCatNames = selectedAICategories.map(s =>
                AI_TOOL_CATEGORIES.find(c => c.slug === s)?.name || ''
              ).filter(Boolean);
              filteredAITools5 = aiTools.filter(t => aiCatNames.includes(t.category)).slice(0, 6);
            }
            if (filteredAITools5.length === 0) filteredAITools5 = aiTools.slice(0, 3);
          }
          return (
          <Step5Celebration
            creators={creators}
            groups={groups}
            aiTools={filteredAITools5}
            topCategory={
              selectedCategories.length > 0
                ? categories.find(c => c.slug === selectedCategories[0])?.name || 'Favorites'
                : 'Favorites'
            }
            isPaid={simPayment.paid}
            payMethod={simPayment.method}
            plan={simPayment.plan}
            isPreview={isPreview}
            onGoToProfile={() => {
              if (isPreview) {
                setStep(1);
                setSelectedPlatforms([]);
                setSelectedCategories([]);
                setCreators([]);
                setGroups([]);
                setVaultPreviews([]);
                setSimPayment(null);
              } else {
                router.replace('/profile1?tab=home&onboarding=complete');
              }
            }}
          />
          );
        })()}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Shared UI
   ═══════════════════════════════════════════════════════════════════ */

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 text-white/30 hover:text-white/50 text-sm font-medium mb-6 transition-colors"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 12H5M12 19l-7-7 7-7" />
      </svg>
      Back
    </button>
  );
}

function PrimaryButton({ onClick, disabled, children }: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        w-full py-3 sm:py-3.5 rounded-xl font-bold text-sm sm:text-[15px] transition-all duration-200
        ${disabled
          ? 'bg-white/[0.05] text-white/20 cursor-not-allowed'
          : 'text-white shadow-lg active:scale-[0.98]'
        }
      `}
      style={disabled ? {} : {
        background: 'linear-gradient(135deg, #00AFF0, #00D4FF)',
        boxShadow: '0 4px 24px rgba(0,175,240,0.25)',
      }}
    >
      {children}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   STEP 1 — What are you looking for?
   ═══════════════════════════════════════════════════════════════════ */

function Step1({
  selected,
  onToggle,
  onNext,
}: {
  selected: string[];
  onToggle: (id: string) => void;
  onNext: () => void;
}) {
  return (
    <div className="animate-[fadeInUp_0.4s_ease-out]">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-4" style={{ background: 'rgba(0,175,240,0.12)', border: '1px solid rgba(0,175,240,0.2)' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00AFF0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
          </svg>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight mb-2">
          Let&apos;s build your perfect experience
        </h1>
        <p className="text-sm text-white/40 max-w-[280px] mx-auto">
          Tell us what you&apos;re into and we&apos;ll create a personalized feed, pre-save top content, and organize everything for you.
        </p>
      </div>

      <div className="space-y-3 mb-8">
        {PLATFORMS.map(p => {
          const active = selected.includes(p.id);
          return (
            <button
              key={p.id}
              onClick={() => onToggle(p.id)}
              className={`
                w-full text-left rounded-2xl transition-all duration-200 overflow-hidden
                ${active
                  ? 'ring-2 ring-[#00AFF0]'
                  : 'ring-1 ring-white/[0.06] hover:ring-white/[0.12]'
                }
              `}
              style={{
                background: active
                  ? 'linear-gradient(135deg, rgba(0,175,240,0.12), rgba(0,212,255,0.08))'
                  : 'rgba(255,255,255,0.04)',
              }}
            >
              <div className="flex items-center gap-4 px-5 py-4 sm:py-5">
                <span className="shrink-0 rounded-xl overflow-hidden">{p.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-bold text-white">{p.title}</div>
                  <p className="text-xs text-white/35 mt-0.5">{p.desc}</p>
                </div>
                <div className={`
                  w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all
                  ${active ? 'bg-[#00AFF0] border-[#00AFF0]' : 'border-white/20 bg-transparent'}
                `}>
                  {active && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <PrimaryButton onClick={onNext} disabled={selected.length === 0}>
        Continue
      </PrimaryButton>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   STEP 2 — Pick your niches
   ═══════════════════════════════════════════════════════════════════ */

function Step2({
  categories,
  selected,
  onToggle,
  showAI,
  selectedAICategories,
  onToggleAI,
  onBack,
  onNext,
}: {
  categories: Category[];
  selected: string[];
  onToggle: (slug: string) => void;
  showAI: boolean;
  selectedAICategories: string[];
  onToggleAI: (slug: string) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const [showAll, setShowAll] = useState(false);

  const priority = categories.filter(c => PRIORITY_SLUGS.includes(c.slug));
  const rest = categories.filter(c => !PRIORITY_SLUGS.includes(c.slug));
  const visible = showAll ? [...priority, ...rest] : priority;

  const totalSelected = selected.length + selectedAICategories.length;

  return (
    <div className="animate-[fadeInUp_0.4s_ease-out]">
      <BackButton onClick={onBack} />

      <div className="text-center mb-6">
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight mb-2">
          What are you into?
        </h1>
        <p className="text-sm text-white/40 max-w-[260px] mx-auto">
          Choose your favorite niches. We&apos;ll use this to pre-fill your feed with the best matching creators and groups.
        </p>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-4">
        {visible.map(cat => {
          const active = selected.includes(cat.slug);
          return (
            <button
              key={cat.slug}
              onClick={() => onToggle(cat.slug)}
              className="rounded-xl px-2 py-3 text-center transition-all duration-150 relative"
              style={{
                background: active
                  ? 'linear-gradient(135deg, #00AFF0, #00D4FF)'
                  : 'rgba(255,255,255,0.05)',
                border: active ? 'none' : '1px solid rgba(255,255,255,0.06)',
                boxShadow: active ? '0 4px 16px rgba(0,175,240,0.2)' : 'none',
              }}
            >
              <div className={`text-[11px] sm:text-[12px] font-bold leading-tight ${active ? 'text-white' : 'text-white/45'}`}>
                {cat.name}
              </div>
            </button>
          );
        })}
      </div>

      {!showAll && rest.length > 0 && (
        <button
          onClick={() => setShowAll(true)}
          className="w-full py-2.5 rounded-xl text-xs font-semibold text-white/35 hover:text-white/60 transition-colors mb-4"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.08)' }}
        >
          Load {rest.length} more niches
        </button>
      )}

      {showAI && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <IconAI size={16} />
            <span className="text-xs font-bold text-white/50 uppercase tracking-widest">AI Tools</span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {AI_TOOL_CATEGORIES.map(cat => {
              const active = selectedAICategories.includes(cat.slug);
              return (
                <button
                  key={cat.slug}
                  onClick={() => onToggleAI(cat.slug)}
                  className="rounded-xl px-2 py-3 text-center transition-all duration-150"
                  style={{
                    background: active
                      ? 'linear-gradient(135deg, #7C3AED, #9F67FF)'
                      : 'rgba(124,58,237,0.08)',
                    border: active ? 'none' : '1px solid rgba(124,58,237,0.15)',
                    boxShadow: active ? '0 4px 16px rgba(124,58,237,0.2)' : 'none',
                  }}
                >
                  <div className={`text-[11px] sm:text-[12px] font-bold leading-tight ${active ? 'text-white' : 'text-white/45'}`}>
                    {cat.name}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <PrimaryButton onClick={onNext} disabled={totalSelected === 0}>
        {totalSelected > 0 ? `Build my feed  ·  ${totalSelected} selected` : 'Select at least 1'}
      </PrimaryButton>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   STEP 3 — Your feed is ready (separate sections, compact cards)
   ═══════════════════════════════════════════════════════════════════ */

function Step3({
  creators,
  groups,
  aiTools,
  showOF,
  showTG,
  showAI,
  loading,
  onBack,
  onNext,
}: {
  creators: Creator[];
  groups: GroupItem[];
  aiTools: AINsfwTool[];
  showOF: boolean;
  showTG: boolean;
  showAI: boolean;
  loading: boolean;
  onBack: () => void;
  onNext: () => void;
}) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div
          className="w-10 h-10 rounded-full border-2 border-t-[#00AFF0] animate-spin mb-4"
          style={{ borderColor: 'rgba(0,175,240,0.2)', borderTopColor: '#00AFF0' }}
        />
        <p className="text-white/35 text-sm font-medium">Building your personalized feed…</p>
      </div>
    );
  }

  const hasCreators = showOF && creators.length > 0;
  const hasGroups = showTG && groups.length > 0;
  const hasAI = showAI && aiTools.length > 0;
  const hasAnything = hasCreators || hasGroups || hasAI;

  return (
    <div className="animate-[fadeInUp_0.4s_ease-out]">
      <BackButton onClick={onBack} />

      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-3" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Your personal vault</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight mb-2">
          We built this just for you
        </h1>
        <p className="text-sm text-white/40 max-w-[280px] mx-auto">
          Based on your choices, we&apos;ve hand-picked the best matching creators and groups. They&apos;ve been saved to your profile and organized into a folder.
        </p>
      </div>

      {/* ── OnlyFans Creators section ── */}
      {hasCreators && (
        <div className="mb-5">
          <h2 className="text-xs font-bold text-white/40 mb-3 flex items-center gap-2 uppercase tracking-widest">
            <IconOnlyFans size={14} />
            Top creators for you
          </h2>
          <div className="grid grid-cols-4 gap-1.5">
            {creators.map(c => (
              <CreatorCard key={c._id} creator={c} />
            ))}
          </div>
          <p className="text-[10px] text-white/20 text-center mt-2">
            These creators will be saved to your profile
          </p>
        </div>
      )}

      {/* ── Telegram Groups section ── */}
      {hasGroups && (
        <div className="mb-5">
          <h2 className="text-xs font-bold text-white/40 mb-3 flex items-center gap-2 uppercase tracking-widest">
            <IconTelegram size={14} />
            Top groups for you
          </h2>
          <div className="grid grid-cols-4 gap-1.5">
            {groups.map(g => (
              <GroupCard key={g._id} group={g} />
            ))}
          </div>
        </div>
      )}

      {/* ── AI Tools section at bottom with quick access links ── */}
      {hasAI && (
        <div className="mb-6">
          <h2 className="text-xs font-bold text-white/40 mb-3 flex items-center gap-2 uppercase tracking-widest">
            <IconAI size={14} />
            AI tools you might like
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {aiTools.map(tool => (
              <div
                key={tool.slug}
                className="rounded-xl overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div className="aspect-square overflow-hidden">
                  <img
                    src={tool.image}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => { (e.target as HTMLImageElement).src = '/assets/placeholder-no-image.png'; }}
                  />
                </div>
                <div className="px-2 py-2">
                  <p className="text-[10px] font-bold text-white truncate leading-tight">{tool.name}</p>
                  <p className="text-[8px] text-white/30 font-semibold mt-0.5 truncate">{tool.category}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-white/20 text-center mt-2">
            Quick access to these tools will be saved to your profile
          </p>
        </div>
      )}

      {!hasAnything && (
        <div className="text-center py-12 text-white/20 text-sm">
          Nothing to show — try selecting more niches.
        </div>
      )}

      <PrimaryButton onClick={onNext}>
        Continue
      </PrimaryButton>
    </div>
  );
}

/* ── Visual card components ── */

function CreatorCard({ creator }: { creator: Creator }) {
  return (
    <div className="relative rounded-xl overflow-hidden aspect-square">
      <img
        src={creator.avatar || '/assets/placeholder-no-image.png'}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={(e) => { (e.target as HTMLImageElement).src = '/assets/placeholder-no-image.png'; }}
      />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.15) 45%, transparent 65%)' }} />
      <div className="absolute bottom-0 left-0 right-0 px-2 pb-2">
        <p className="text-[10px] font-bold text-white truncate leading-tight drop-shadow-sm">
          {creator.name}
        </p>
        <p className="text-[8px] text-white/45 truncate mt-0.5">@{creator.username}</p>
        {creator.categories.length > 0 && (
          <div className="flex flex-wrap gap-0.5 mt-1">
            {creator.categories.slice(0, 2).map(cat => (
              <span key={cat} className="px-1 py-[1px] rounded text-[7px] font-semibold text-white/70 capitalize" style={{ background: 'rgba(0,175,240,0.3)' }}>
                {cat}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function GroupCard({ group }: { group: GroupItem }) {
  const cats = group.categories.length > 0 ? group.categories : group.category ? [group.category] : [];
  return (
    <div className="relative rounded-xl overflow-hidden aspect-square">
      <img
        src={group.image}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        loading="lazy"
        onError={(e) => { (e.target as HTMLImageElement).src = '/assets/placeholder-no-image.png'; }}
      />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.15) 45%, transparent 65%)' }} />
      {group.memberCount > 0 && (
        <div className="absolute top-1.5 right-1.5">
          <span className="px-1 py-0.5 rounded text-[7px] font-bold text-white/80 tabular-nums" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
            {fmtNum(group.memberCount)}
          </span>
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 px-2 pb-2">
        <p className="text-[10px] font-bold text-white truncate leading-tight drop-shadow-sm">
          {group.name}
        </p>
        {cats.length > 0 && (
          <div className="flex flex-wrap gap-0.5 mt-1">
            {cats.slice(0, 2).map(cat => (
              <span key={cat} className="px-1 py-[1px] rounded text-[7px] font-semibold text-white/70" style={{ background: 'rgba(38,165,228,0.3)' }}>
                {cat}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   STEP 4 — VIP upsell (top) + vault mosaic (bottom)
   ═══════════════════════════════════════════════════════════════════ */

function Step4({
  topCategory,
  creatorCount,
  vaultPreviews,
  finishing,
  isPreview,
  onFinish,
  onBack,
  onSimulate,
}: {
  topCategory: string;
  creatorCount: number;
  vaultPreviews: { _id: string; image: string; category: string }[];
  finishing: boolean;
  isPreview: boolean;
  onFinish: () => void;
  onBack: () => void;
  onSimulate: (paid: boolean, method?: 'stars' | 'crypto', plan?: string) => void;
}) {
  const [payMethod, setPayMethod] = useState<'stars' | 'crypto' | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<'quarterly' | 'yearly' | 'lifetime'>('quarterly');
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState('');
  const [showAdminSim, setShowAdminSim] = useState(false);

  const plans = [
    { id: 'quarterly' as const, label: '3 Months', stars: 1000, usd: 14.97, perMonthStars: '333 ★', perMonthUsd: '$4.99', bestseller: false },
    { id: 'yearly' as const, label: '1 Year', stars: 2000, usd: 29.97, perMonthStars: '167 ★', perMonthUsd: '$2.50', bestseller: true },
    { id: 'lifetime' as const, label: 'Lifetime', stars: 13000, usd: 197, perMonthStars: 'One-time', perMonthUsd: 'Forever', bestseller: false },
  ];

  const activePlan = plans.find(p => p.id === selectedPlan) || plans[0];

  const handlePay = async () => {
    if (!payMethod) return;

    if (isPreview) {
      onSimulate(true, payMethod, selectedPlan);
      return;
    }

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) { setPayError('Please log in first.'); return; }

    setPayLoading(true);
    setPayError('');
    try {
      const endpoint = payMethod === 'stars' ? '/api/payments/stars' : '/api/payments/nowpayments';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ plan: selectedPlan }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPayError(data.message || 'Something went wrong.');
        setPayLoading(false);
        return;
      }
      if (data.url) {
        onSimulate(true, payMethod, selectedPlan);
        window.open(data.url, '_blank', 'noopener,noreferrer');
      }
    } catch {
      setPayError('Network error — please try again.');
    }
    setPayLoading(false);
  };

  return (
    <div className="animate-[fadeInUp_0.4s_ease-out] -mx-4 -mb-6 px-4 py-5 rounded-t-2xl bg-white/[0.07]">
      <BackButton onClick={onBack} />

      {/* ── Maybe later (top skip) ── */}
      <div className="flex justify-end mb-3">
        <button
          onClick={onFinish}
          disabled={finishing}
          className="text-white/40 hover:text-white/70 text-xs font-semibold transition-colors px-4 py-1.5 rounded-full"
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
        >
          Maybe later
        </button>
      </div>

      {/* ── VIP upgrade card ── */}
      <div className="mb-4 rounded-2xl overflow-hidden" style={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.08)' }}>
        <div className="px-4 py-5">
          <div className="text-center mb-5">
            <h2 className="text-[15px] sm:text-[17px] font-black text-gray-900 uppercase tracking-wide leading-snug">
              How about unlocking the full Erogram experience?
            </h2>
          </div>

          <div className="space-y-3 mb-4">
            <BenefitRow
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00aff0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>}
              title="Unlimited bookmarks & folders"
              desc="Save as many creators and groups as you want, organized your way."
            />
            <BenefitRow
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00aff0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>}
              title="4,000+ unlisted Vault groups"
              desc="We only share 4% of our groups publicly. The rest is VIP-only."
            />
            <BenefitRow
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00aff0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" /></svg>}
              title="Full Erogram experience"
              desc="Enjoy everything Erogram has to offer — no limits, no restrictions."
            />
            <BenefitRow
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00aff0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>}
              title="Ad-free browsing"
              desc="No ads, no distractions — just content."
            />
            <BenefitRow
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00aff0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z" /><path d="M4 22H2V11h2" /></svg>}
              title="Vote on new features"
              desc="Have your say — help shape what Erogram builds next."
            />
            {/* ── Vicky AI showcase ── */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 overflow-hidden">
                <img src="/assets/vicky-ai-avatar.jpg" alt="" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-bold text-gray-800 leading-tight">Unlock Vicky AI</div>
                <div className="text-[10px] text-gray-500 leading-relaxed mt-0.5">Your personal Erogram assistant — find the best creators, groups & tools instantly.</div>
                <div className="mt-2 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.08)' }}>
                  <video
                    src="https://pub-5800916b33a845e4b67e2d5be553c1e3.r2.dev/tgempire/booty-bazaar/wmremove-transformed.mp4"
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="w-full rounded-xl"
                    style={{ maxHeight: '180px', objectFit: 'contain', background: '#000' }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── Payment method picker (step 1) ── */}
          {!payMethod && (
            <>
              <p className="text-[10px] text-gray-400 text-center mb-1 font-semibold">Choose your payment method</p>
              <p className="text-[10px] text-green-600 text-center mb-2.5 font-bold">One-time payment · No auto-renewal</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setPayMethod('stars')}
                  className="rounded-xl py-3.5 text-center transition-all hover:brightness-95"
                  style={{ background: '#16a34a', border: '1px solid #15803d' }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-1.5">
                    <path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z" />
                  </svg>
                  <div className="text-[11px] font-bold text-white">Telegram Stars</div>
                  <div className="text-[8px] text-white/70 mt-0.5">Pay with credit card in Telegram</div>
                </button>
                <button
                  onClick={() => setPayMethod('crypto')}
                  className="rounded-xl py-3.5 text-center transition-all hover:brightness-95"
                  style={{ background: '#16a34a', border: '1px solid #15803d' }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-1.5">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M14.5 9a3.5 3.5 0 0 0-5 0M9.5 15a3.5 3.5 0 0 0 5 0M12 6v2M12 16v2" />
                  </svg>
                  <div className="text-[11px] font-bold text-white">Crypto</div>
                  <div className="text-[8px] text-white/70 mt-0.5">USDT, BTC, ETH & 100+ coins</div>
                </button>
              </div>
            </>
          )}

          {/* ── Plan selector + pay button (step 2) ── */}
          {payMethod && (
            <div className="animate-[fadeInUp_0.2s_ease-out]">
              <button
                onClick={() => { setPayMethod(null); setPayError(''); }}
                className="flex items-center gap-1.5 text-[12px] font-bold text-gray-500 hover:text-gray-800 mb-4 transition-colors px-3 py-1.5 rounded-lg"
                style={{ background: 'rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.1)' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                Change payment method
              </button>

              <div className="grid grid-cols-3 gap-1.5 mb-3">
                {plans.map(p => {
                  const active = selectedPlan === p.id;
                  const price = payMethod === 'stars' ? `${p.stars} ★` : `$${p.usd}`;
                  const perMo = payMethod === 'stars' ? p.perMonthStars : p.perMonthUsd;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPlan(p.id)}
                      className="rounded-xl py-2.5 text-center transition-all relative"
                      style={{
                        background: active
                          ? 'rgba(22,163,74,0.1)'
                          : 'rgba(0,0,0,0.02)',
                        border: active
                          ? '1.5px solid rgba(22,163,74,0.4)'
                          : '1px solid rgba(0,0,0,0.08)',
                      }}
                    >
                      {p.bestseller && (
                        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-wider text-white" style={{ background: '#16a34a' }}>
                          Bestseller
                        </div>
                      )}
                      <div className={`text-[10px] font-bold ${active ? 'text-gray-900' : 'text-gray-600'}`}>
                        {p.label}
                      </div>
                      <div className={`text-[14px] font-black tabular-nums mt-0.5 ${active ? 'text-gray-900' : 'text-gray-700'}`}>
                        {price}
                      </div>
                      <div className={`text-[8px] mt-0.5 ${active ? 'text-gray-500' : 'text-gray-500'}`}>
                        {perMo}/mo
                      </div>
                    </button>
                  );
                })}
              </div>

              {payError && (
                <p className="text-[10px] text-red-500 text-center mb-2">{payError}</p>
              )}

              <button
                onClick={handlePay}
                disabled={payLoading}
                className="w-full flex items-center justify-center gap-2 text-[13px] font-black text-white py-2.5 rounded-xl transition-all hover:brightness-110 disabled:opacity-50"
                style={{ background: '#16a34a', boxShadow: '0 4px 16px rgba(22,163,74,0.3)' }}
              >
                {payLoading ? (
                  <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                ) : (
                  <>
                    Pay {payMethod === 'stars' ? `${activePlan.stars} ★` : `$${activePlan.usd}`}
                  </>
                )}
              </button>

              <p className="text-[10px] text-green-600 text-center mt-2 font-bold">
                One-time payment · No auto-renewal · No recurring charges
              </p>
              {payMethod === 'stars' && (
                <p className="text-[8px] text-gray-400 text-center mt-1">
                  You can buy Telegram Stars with any credit card directly inside Telegram
                </p>
              )}
              {payMethod === 'crypto' && (
                <p className="text-[8px] text-gray-400 text-center mt-1">
                  Secure checkout via NOWPayments · USDT, BTC, ETH & 100+ coins
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Vault mosaic preview (bottom) ── */}
      {vaultPreviews.length > 0 && (
        <div className="mb-4">
          <div className="rounded-2xl overflow-hidden relative" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="grid grid-cols-4 gap-[1px]" style={{ background: 'rgba(0,0,0,0.2)' }}>
              {vaultPreviews.slice(0, 8).map((g) => (
                <div key={g._id} className="aspect-square overflow-hidden">
                  <img
                    src={g.image}
                    alt=""
                    className="w-full h-full object-cover"
                    style={{ filter: 'blur(3px) brightness(0.55)', transform: 'scale(1.08)' }}
                    loading="lazy"
                    onError={(e) => { (e.target as HTMLImageElement).src = '/assets/placeholder-no-image.png'; }}
                  />
                </div>
              ))}
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ background: 'rgba(0,0,0,0.3)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00aff0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-1">
                <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <p className="text-[11px] font-black text-white/90">4,000+ Vault Groups</p>
              <p className="text-[8px] text-white/40 mt-0.5">Hand-picked groups — VIP only</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Maybe later ── */}
      <button
        onClick={onFinish}
        disabled={finishing}
        className="w-full py-3 rounded-xl text-sm font-semibold text-white/40 hover:text-white/70 transition-colors"
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        {finishing ? 'Setting up…' : isPreview ? 'Reset Preview' : 'Maybe later'}
      </button>

      {/* ── Admin simulation panel (preview mode only) ── */}
      {isPreview && (
        <div className="mt-4">
          <button
            onClick={() => setShowAdminSim(s => !s)}
            className="w-full text-[10px] font-bold text-white/40 hover:text-white/70 transition-colors py-2 text-center uppercase tracking-wider"
          >
            {showAdminSim ? 'Hide' : 'Show'} Admin Simulator
          </button>
          {showAdminSim && (
            <div className="mt-2 rounded-xl p-3 space-y-2" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <p className="text-[10px] font-bold text-white/60 text-center mb-2">Simulate post-onboarding as:</p>

              <button
                onClick={() => onSimulate(false)}
                className="w-full py-2 rounded-lg text-[11px] font-bold text-white/60 hover:text-white transition-colors"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                Free user →
              </button>

              <div className="grid grid-cols-2 gap-1.5">
                {(['quarterly', 'yearly', 'lifetime'] as const).map(plan => (
                  <button
                    key={`stars-${plan}`}
                    onClick={() => onSimulate(true, 'stars', plan)}
                    className="py-2 rounded-lg text-[10px] font-bold text-white/50 hover:text-white transition-colors text-center"
                    style={{ background: 'rgba(0,175,240,0.08)', border: '1px solid rgba(0,175,240,0.15)' }}
                  >
                    Stars · {plan}
                  </button>
                ))}
                {(['quarterly', 'yearly', 'lifetime'] as const).map(plan => (
                  <button
                    key={`crypto-${plan}`}
                    onClick={() => onSimulate(true, 'crypto', plan)}
                    className="py-2 rounded-lg text-[10px] font-bold text-white/50 hover:text-white transition-colors text-center"
                    style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.15)' }}
                  >
                    Crypto · {plan}
                  </button>
                ))}
              </div>

              <p className="text-[8px] text-white/20 text-center mt-1">
                Shows celebration page with user&apos;s picks · No data modified
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   STEP 5 — Post-onboarding celebration
   ═══════════════════════════════════════════════════════════════════ */

function Step5Celebration({
  creators,
  groups,
  aiTools,
  topCategory,
  isPaid,
  payMethod,
  plan,
  isPreview,
  onGoToProfile,
}: {
  creators: Creator[];
  groups: GroupItem[];
  aiTools: AINsfwTool[];
  topCategory: string;
  isPaid: boolean;
  payMethod?: 'stars' | 'crypto';
  plan?: string;
  isPreview: boolean;
  onGoToProfile: () => void;
}) {
  const allImages = [
    ...creators.map(c => c.avatar),
    ...groups.map(g => g.image),
  ].filter(Boolean);
  const totalSaved = creators.length + groups.length;

  const [vickyOpen, setVickyOpen] = useState(false);
  const [vickyMessages, setVickyMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [vickyInput, setVickyInput] = useState('');
  const [vickySending, setVickySending] = useState(false);
  const vickyScrollRef = useRef<HTMLDivElement>(null);
  const vickyInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (vickyScrollRef.current) vickyScrollRef.current.scrollTop = vickyScrollRef.current.scrollHeight;
  }, [vickyMessages, vickyOpen]);

  const sendVicky = useCallback(async (text: string) => {
    if (!text.trim() || vickySending) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;
    const userMsg = { role: 'user' as const, content: text.trim() };
    const updated = [...vickyMessages, userMsg];
    setVickyMessages(updated);
    setVickyInput('');
    setVickySending(true);
    try {
      const res = await chatWithVicky(token, updated);
      setVickyMessages(prev => [...prev, { role: 'assistant', content: res.reply }]);
    } catch {
      setVickyMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Try again.' }]);
    }
    setVickySending(false);
    vickyInputRef.current?.focus();
  }, [vickyMessages, vickySending]);

  return (
    <div className="animate-[fadeInUp_0.5s_ease-out] pb-8">
      {/* ── Admin preview badge ── */}
      {isPreview && (
        <div className="mb-4 text-center">
          <span className="inline-block px-3 py-1 rounded-full text-[9px] font-bold text-purple-400/80 uppercase tracking-wider" style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.15)' }}>
            Simulating: {isPaid ? `VIP · ${payMethod} · ${plan}` : 'Free user'}
          </span>
        </div>
      )}

      {/* ── Shimmer bar ── */}
      <div className="relative overflow-hidden rounded-2xl mb-4" style={{ height: '6px' }}>
        <div className="absolute inset-0 animate-[shimmer_2s_ease-in-out_infinite]"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(0,175,240,0.4), rgba(124,58,237,0.4), rgba(16,185,129,0.4), transparent)', backgroundSize: '200% 100%' }} />
      </div>

      {/* ── Fake tab bar (mirrors the real profile) ── */}
      <div className="flex gap-1 mb-5 bg-white/[0.03] rounded-xl p-1 border border-white/5">
        <div className="flex-1 py-2 rounded-lg text-[12px] font-semibold text-center bg-white/10 text-white flex items-center justify-center gap-1">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          Home
        </div>
        {['Saved Groups', 'OF Creators', 'Settings'].map(t => (
          <div key={t} className="flex-1 py-2 rounded-lg text-[10px] font-semibold text-center text-white/25">{t}</div>
        ))}
        <div className="flex-1 py-2 rounded-lg text-[11px] font-black uppercase text-center" style={{ background: 'linear-gradient(135deg, #b8860b, #c9973a, #a67c00)', color: '#1a1000' }}>Vault</div>
      </div>

      {/* ── Welcome header ── */}
      <div className="text-center mb-5">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-3 animate-[bounceIn_0.6s_ease-out]" style={{ background: isPaid ? 'rgba(0,175,240,0.12)' : 'rgba(16,185,129,0.12)', border: `2px solid ${isPaid ? 'rgba(0,175,240,0.25)' : 'rgba(16,185,129,0.25)'}` }}>
          {isPaid ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00aff0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z" /></svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
          )}
        </div>
        <h1 className="text-2xl font-black text-white tracking-tight leading-tight mb-1">
          {isPaid ? 'Welcome to VIP!' : 'You\'re all set!'}
        </h1>
        <p className="text-[13px] text-white/40 max-w-[280px] mx-auto">
          {isPaid
            ? `Your ${plan || 'VIP'} plan is active. Here's everything we set up for you.`
            : `Your ${topCategory} feed is ready. Here's what we saved for you.`}
        </p>
        {isPaid && payMethod && (
          <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full" style={{ background: 'rgba(0,175,240,0.1)', border: '1px solid rgba(0,175,240,0.2)' }}>
            <span className="text-[10px] font-bold text-[#00aff0]">
              {payMethod === 'stars' ? 'Telegram Stars' : 'Crypto'} · {plan}
            </span>
          </div>
        )}
        {isPaid && (
          <div className="mt-1.5 inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold bg-gradient-to-r from-[#00aff0]/10 to-[#00aff0]/5 border border-[#00aff0]/20 text-[#00aff0]">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="#00aff0"><path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z"/></svg>
            VIP Member
          </div>
        )}
      </div>

      {/* ── Saved creators ── */}
      {creators.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-white/50">{creators.length} creators saved</span>
            <a href="/profile1?tab=creators" className="text-[10px] font-semibold text-[#00aff0]">View all</a>
          </div>
          <div className="grid grid-cols-4 gap-1 rounded-xl overflow-hidden">
            {creators.slice(0, 8).map((c, i) => (
              <div key={c._id} className="aspect-square overflow-hidden animate-[fadeInUp_0.4s_ease-out_both]" style={{ animationDelay: `${0.2 + i * 0.05}s` }}>
                <img src={c.avatar || '/assets/placeholder-no-image.png'} alt="" className="w-full h-full object-cover" loading="lazy"
                  onError={(e) => { (e.target as HTMLImageElement).src = '/assets/placeholder-no-image.png'; }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Saved groups ── */}
      {groups.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-white/50">{groups.length} groups saved</span>
            <a href="/profile1?tab=groups" className="text-[10px] font-semibold text-[#00aff0]">View all</a>
          </div>
          <div className="grid grid-cols-4 gap-1 rounded-xl overflow-hidden">
            {groups.slice(0, 8).map((g, i) => (
              <div key={g._id} className="aspect-square overflow-hidden animate-[fadeInUp_0.4s_ease-out_both]" style={{ animationDelay: `${0.2 + i * 0.05}s` }}>
                <img src={g.image || '/assets/placeholder-no-image.png'} alt="" className="w-full h-full object-cover" loading="lazy"
                  onError={(e) => { (e.target as HTMLImageElement).src = '/assets/placeholder-no-image.png'; }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Quick actions ── */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        {[
          { label: 'Creators', bg: '#00AFF0', icon: <><circle cx="24" cy="24" r="24" fill="#00AFF0"/><path d="M24 10C16.27 10 10 16.27 10 24C10 31.73 16.27 38 24 38C31.73 38 38 31.73 38 24C38 16.27 31.73 10 24 10ZM24 32C19.58 32 16 28.42 16 24C16 19.58 19.58 16 24 16C28.42 16 32 19.58 32 24C32 28.42 28.42 32 24 32Z" fill="white"/><circle cx="24" cy="24" r="4" fill="white"/></> },
          { label: 'Groups', bg: '#26A5E4', icon: <><circle cx="24" cy="24" r="24" fill="#26A5E4"/><path d="M35.5 13.5L10.5 22.8C10.5 22.8 9.8 23.1 9.9 23.7C10 24.3 10.7 24.6 10.7 24.6L16.5 26.5L19 33.5C19 33.5 19.3 34.3 20 34.3C20.7 34.3 21.2 33.8 21.2 33.8L24.5 30.5L30.5 35C30.5 35 31.1 35.3 31.7 35C32.3 34.7 32.5 34 32.5 34L36.5 15C36.5 15 36.7 13.8 35.5 13.5ZM31 18.5L20.5 27.8C20.5 27.8 20.1 28.1 20 28.6L19.3 32L18 27.5L31 18.5Z" fill="white"/></> },
          { label: 'AI Tools', bg: '#7C3AED', icon: <><circle cx="24" cy="24" r="24" fill="#7C3AED"/><path d="M16 20C16 20 18 14 24 14C30 14 32 20 32 20" stroke="white" strokeWidth="2" strokeLinecap="round"/><rect x="14" y="20" width="20" height="12" rx="3" fill="white" fillOpacity="0.15" stroke="white" strokeWidth="1.5"/><circle cx="19" cy="26" r="2.5" fill="white"/><circle cx="29" cy="26" r="2.5" fill="white"/></> },
        ].map(a => (
          <div key={a.label} className="rounded-xl py-3.5 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <svg width="18" height="18" viewBox="0 0 48 48" fill="none" className="mx-auto mb-1">{a.icon}</svg>
            <div className="text-[10px] font-bold text-white/50">{a.label}</div>
          </div>
        ))}
      </div>

      {/* ── Vault section ── */}
      {!isPaid ? (
        <div className="mb-5 flex items-center justify-between gap-4 rounded-2xl px-4 py-3.5" style={{
          background: 'linear-gradient(135deg, #d4a94c 0%, #e8c66a 30%, #c9973a 60%, #b8860b 100%)',
          border: '2px solid rgba(232,198,106,0.5)',
          color: '#1a1000',
        }}>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.15em] opacity-70">Members Only</p>
            <p className="text-[15px] font-black uppercase tracking-tight leading-none">Unlock the Vault</p>
            <p className="text-[10px] font-semibold mt-0.5 opacity-75">4,000+ exclusive groups</p>
          </div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1a1000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        </div>
      ) : (
        <div className="mb-5 flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(201,151,58,0.1)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c9973a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-bold text-white">Browse the Vault</div>
            <div className="text-[9px] text-white/35">4,000+ exclusive groups at your fingertips</div>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
        </div>
      )}

      {/* ── Vicky AI section ── */}
      {isPaid ? (
        <div className="mb-5 rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <button
            onClick={() => { setVickyOpen(o => !o); setTimeout(() => vickyInputRef.current?.focus(), 100); }}
            className="w-full flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[0.02]"
          >
            <div className="relative shrink-0">
              <img src="/assets/vicky-ai-avatar.jpg" alt="" className="w-10 h-10 rounded-full object-cover ring-2 ring-[#00aff0]/20" />
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#0d1628]" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div className="text-[13px] font-bold text-white leading-tight">Vicky AI</div>
              <div className="text-[10px] text-white/35 mt-0.5">
                {vickyOpen ? 'Your personal assistant' : 'Tap to chat — ask about creators, groups, or tools'}
              </div>
            </div>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${vickyOpen ? 'bg-white/10 rotate-180' : 'bg-[#00aff0]'}`}>
              {vickyOpen ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M18 15l-6-6-6 6"/></svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
              )}
            </div>
          </button>

          {vickyOpen && (
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div ref={vickyScrollRef} className="max-h-[280px] overflow-y-auto px-3 py-3 space-y-3">
                {vickyMessages.length === 0 && (
                  <div className="text-center py-2">
                    <p className="text-[10px] text-white/25 mb-2">Try asking:</p>
                    <div className="grid grid-cols-2 gap-1">
                      {['Best MILF creators', 'Top Asian groups', 'Free OnlyFans', 'AI undress tools'].map(s => (
                        <button key={s} onClick={() => sendVicky(s)}
                          className="text-left px-2 py-1.5 rounded-lg text-[9px] text-white/40 font-medium hover:text-white/60 hover:bg-white/5 transition-all"
                          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {vickyMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-1.5`}>
                    {msg.role === 'assistant' && (
                      <img src="/assets/vicky-ai-avatar.jpg" alt="" className="w-6 h-6 rounded-full object-cover shrink-0 mt-1" />
                    )}
                    <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-[11px] leading-relaxed ${
                      msg.role === 'user' ? 'text-white font-medium rounded-br-sm' : 'text-white/85 rounded-bl-sm'
                    }`} style={msg.role === 'user' ? { background: 'rgba(0,175,240,0.2)' } : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <VickyMsgInline content={msg.content} isUser={msg.role === 'user'} />
                    </div>
                  </div>
                ))}
                {vickySending && (
                  <div className="flex gap-1.5">
                    <img src="/assets/vicky-ai-avatar.jpg" alt="" className="w-6 h-6 rounded-full object-cover shrink-0 mt-1" />
                    <div className="px-3 py-2.5 rounded-2xl rounded-bl-sm" style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="px-3 pb-3 pt-1" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <form onSubmit={e => { e.preventDefault(); sendVicky(vickyInput); }} className="flex gap-1.5">
                  <input ref={vickyInputRef} type="text" value={vickyInput} onChange={e => setVickyInput(e.target.value)}
                    placeholder="Ask Vicky..." disabled={vickySending}
                    className="flex-1 bg-white/5 text-white text-[11px] px-3 py-2 rounded-lg outline-none placeholder:text-white/20 focus:ring-1 focus:ring-[#00aff0]/30"
                    style={{ border: '1px solid rgba(255,255,255,0.08)' }} />
                  <button type="submit" disabled={!vickyInput.trim() || vickySending}
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 disabled:opacity-30" style={{ background: '#00aff0' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="mb-5 rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: 'rgba(0,175,240,0.06)', border: '1px solid rgba(0,175,240,0.12)' }}>
          <img src="/assets/vicky-ai-avatar.jpg" alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-white/70">Unlock Vicky AI + 4,000 Vault groups</p>
            <p className="text-[9px] text-white/30 mt-0.5">Upgrade to VIP anytime.</p>
          </div>
          <span className="px-2.5 py-1 rounded-lg text-[9px] font-bold text-white/50 shrink-0" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>Upgrade</span>
        </div>
      )}

      {/* ── AI Tools with quick access links ── */}
      {aiTools.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-2">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
            </svg>
            <span className="text-[11px] font-bold text-white/50">AI Tools for you</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {aiTools.map(tool => (
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

      {/* ── Footer links (mirror real profile) ── */}
      <div className="flex items-center justify-center gap-4 mb-5">
        <span className="text-[10px] text-white/20 font-medium">Support</span>
        <span className="text-white/8">|</span>
        <span className="text-[10px] text-white/20 font-medium">Telegram</span>
      </div>

      {/* ── CTA ── */}
      <PrimaryButton onClick={onGoToProfile}>
        {isPreview ? 'Reset Preview' : 'Go to my profile'}
      </PrimaryButton>

      <style>{`
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        @keyframes bounceIn { 0% { transform: scale(0.3); opacity: 0; } 50% { transform: scale(1.05); } 70% { transform: scale(0.95); } 100% { transform: scale(1); opacity: 1; } }
      `}</style>
    </div>
  );
}

function VickyMsgInline({ content, isUser }: { content: string; isUser: boolean }) {
  if (isUser) return <>{content}</>;
  const parts = content.split(/(\[.*?\]\(.*?\)|\*\*.*?\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
        if (linkMatch) {
          return <a key={i} href={linkMatch[2]} target="_blank" rel="noopener noreferrer"
            className="text-[#00aff0] underline underline-offset-2 decoration-[#00aff0]/30 font-medium">{linkMatch[1]}</a>;
        }
        const boldMatch = part.match(/^\*\*(.*?)\*\*$/);
        if (boldMatch) return <strong key={i} className="font-bold text-white">{boldMatch[1]}</strong>;
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

function BenefitRow({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: 'rgba(0,175,240,0.08)' }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[12px] font-bold text-gray-800 leading-tight">{title}</div>
        <div className="text-[10px] text-gray-500 leading-relaxed mt-0.5">{desc}</div>
      </div>
    </div>
  );
}
