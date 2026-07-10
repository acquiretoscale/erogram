'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { motion } from 'framer-motion';
import { PLACEHOLDER_IMAGE_URL } from '@/lib/placeholder';
import { useTranslation, useLocalePath } from '@/lib/i18n';
import { validateCoupon } from '@/lib/actions/coupons';

const TELEGRAM_BLUE = '#0088cc';

type SubmissionType = 'free' | 'normal_listing' | 'instant_approval' | 'boost_week' | 'boost_month';
type PageStep = 'form' | 'pay' | 'confirmed' | 'free_done';

interface PricingTier {
  type: SubmissionType;
  stars: number | null;
  label: string;
  badge: string | null;
  perks: string[];
  highlight: boolean;
  bg: string;
  borderSelected: string;
  accentColor: string;
}

const GROUP_PRICING_TIERS: PricingTier[] = [
  {
    type: 'free',
    stars: null,
    label: 'Free',
    badge: null,
    perks: ['Manual review (up to 7 days)', 'Regular listing position', 'Standard visibility'],
    highlight: false,
    bg: 'rgba(255,255,255,0.06)',
    borderSelected: 'rgba(255,255,255,0.35)',
    accentColor: '#888',
  },
  {
    type: 'instant_approval',
    stars: 600,
    label: 'Instant Approval',
    badge: 'FAST',
    perks: ['Goes live immediately', 'Skip moderation queue', 'Regular listing position'],
    highlight: false,
    bg: 'linear-gradient(135deg, rgba(6,182,212,0.35), rgba(20,184,166,0.20))',
    borderSelected: '#06b6d4',
    accentColor: '#06b6d4',
  },
  {
    type: 'boost_week',
    stars: 2000,
    label: 'Instant + Boost 1 Week',
    badge: null,
    perks: ['Goes live immediately', '1 week in Top Listings section', 'Reach thousands of active users'],
    highlight: true,
    bg: 'linear-gradient(135deg, rgba(249,115,22,0.50), rgba(234,88,12,0.32))',
    borderSelected: '#f97316',
    accentColor: '#fb923c',
  },
  {
    type: 'boost_month',
    stars: 5000,
    label: 'Instant + Boost 1 Month',
    badge: null,
    perks: ['Goes live immediately', '1 month in Top Listings section', '40× more exposure for 1 month'],
    highlight: false,
    bg: 'linear-gradient(135deg, rgba(168,85,247,0.45), rgba(139,92,246,0.25))',
    borderSelected: '#a855f7',
    accentColor: '#a855f7',
  },
];

const BOT_PRICING_TIERS: PricingTier[] = [
  {
    type: 'normal_listing',
    stars: 1000,
    label: 'Normal Listing',
    badge: null,
    perks: ['Added to bot directory', 'Up to 48h for approval', 'Regular listing position'],
    highlight: false,
    bg: 'rgba(255,255,255,0.06)',
    borderSelected: 'rgba(255,255,255,0.35)',
    accentColor: '#22c55e',
  },
  {
    type: 'instant_approval',
    stars: 1500,
    label: 'Instant Approval',
    badge: 'FAST',
    perks: ['Goes live immediately', 'Skip moderation queue', 'Regular listing position'],
    highlight: false,
    bg: 'linear-gradient(135deg, rgba(6,182,212,0.35), rgba(20,184,166,0.20))',
    borderSelected: '#06b6d4',
    accentColor: '#06b6d4',
  },
  {
    type: 'boost_week',
    stars: 3000,
    label: 'Instant + Boost 1 Week',
    badge: null,
    perks: ['Goes live immediately', '1 week in Top Bots section', '40× more exposure for 1 week'],
    highlight: true,
    bg: 'linear-gradient(135deg, rgba(249,115,22,0.50), rgba(234,88,12,0.32))',
    borderSelected: '#f97316',
    accentColor: '#fb923c',
  },
  {
    type: 'boost_month',
    stars: 6000,
    label: 'Instant + Boost 1 Month',
    badge: null,
    perks: ['Goes live immediately', '1 month in Most Popular Bots', '40× more exposure for 1 month'],
    highlight: false,
    bg: 'linear-gradient(135deg, rgba(168,85,247,0.45), rgba(139,92,246,0.25))',
    borderSelected: '#a855f7',
    accentColor: '#a855f7',
  },
];

const GROUP_TIER_STARS: Record<string, number> = {
  instant_approval: 600,
  boost_week: 2000,
  boost_month: 5000,
};

const BOT_TIER_STARS: Record<string, number> = {
  normal_listing: 1000,
  instant_approval: 1500,
  boost_week: 3000,
  boost_month: 6000,
};

const STAR_RATE = 0.013;
function usd(stars: number) { return `~$${(stars * STAR_RATE).toFixed(2)}`; }

interface AddClientProps {
  categories: string[];
  countries: string[];
  defaultTab?: 'group' | 'bot';
}

export default function AddClient({ categories, countries, defaultTab }: AddClientProps) {
  const { t } = useTranslation();
  const lp = useLocalePath();

  const [tab, setTab] = useState<'group' | 'bot'>(defaultTab || 'group');
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [groupData, setGroupData] = useState({
    name: '',
    category: 'NSFW-Telegram',
    country: 'Adult-Telegram',
    telegramLink: '',
    description: '',
    imageFile: null as File | null,
  });
  const [botData, setBotData] = useState({
    name: '',
    category: 'NSFW-Telegram',
    country: 'Adult-Telegram',
    telegramLink: '',
    description: '',
    imageFile: null as File | null,
  });
  const [contactTelegram, setContactTelegram] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [groupPreview, setGroupPreview] = useState<string | null>(null);
  const [botPreview, setBotPreview] = useState<string | null>(null);
  const [selectedTier, setSelectedTier] = useState<SubmissionType>('free');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const PRICING_TIERS = tab === 'bot' ? BOT_PRICING_TIERS : GROUP_PRICING_TIERS;
  const TIER_STARS = tab === 'bot' ? BOT_TIER_STARS : GROUP_TIER_STARS;

  const [step, setStep] = useState<PageStep>('form');
  const [payUrl, setPayUrl] = useState('');
  const [entityId, setEntityId] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [couponResult, setCouponResult] = useState<{ valid: boolean; discountedStars?: number; savedStars?: number; error?: string } | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [submittedName, setSubmittedName] = useState('');
  const [paidStars, setPaidStars] = useState(0);
  const [paidTierLabel, setPaidTierLabel] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Restore form data from sessionStorage if coming back from login
    try {
      const saved = sessionStorage.getItem('addFormDraft');
      if (saved) {
        const draft = JSON.parse(saved);
        if (draft.tab) setTab(draft.tab);
        if (draft.groupData) setGroupData((prev) => ({ ...prev, ...draft.groupData, imageFile: null }));
        if (draft.botData) setBotData((prev) => ({ ...prev, ...draft.botData, imageFile: null }));
        if (draft.contactTelegram) setContactTelegram(draft.contactTelegram);
        if (draft.contactEmail) setContactEmail(draft.contactEmail);
        if (draft.selectedTier) setSelectedTier(draft.selectedTier);
        sessionStorage.removeItem('addFormDraft');
      }
    } catch {}
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const getAuthHeaders = () => {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
    return token ? { Authorization: `Bearer ${token}` } : null;
  };

  const startPolling = (id: string, entityType: 'group' | 'bot') => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/submission-status?id=${id}&entity=${entityType}`);
        const data = await res.json();
        if (data.paid) {
          if (pollRef.current) clearInterval(pollRef.current);
          setStep('confirmed');
        }
      } catch {}
    }, 3000);
  };

  const handleGroupImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setGroupData((d) => ({ ...d, imageFile: file }));
      const reader = new FileReader();
      reader.onload = (ev) => setGroupPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleBotImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBotData((d) => ({ ...d, imageFile: file }));
      const reader = new FileReader();
      reader.onload = (ev) => setBotPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const saveFormDraft = () => {
    try {
      sessionStorage.setItem('addFormDraft', JSON.stringify({
        tab,
        groupData: { name: groupData.name, category: groupData.category, country: groupData.country, telegramLink: groupData.telegramLink, description: groupData.description },
        botData: { name: botData.name, category: botData.category, country: botData.country, telegramLink: botData.telegramLink, description: botData.description },
        contactTelegram,
        contactEmail,
        selectedTier,
      }));
    } catch {}
  };

  const clearAuthStorage = () => {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('firstName');
    localStorage.removeItem('photoUrl');
  };

  const ensureAuthenticatedHeaders = async () => {
    const headers = getAuthHeaders();
    if (!headers) return null;
    try {
      const res = await fetch('/api/auth/me', { headers });
      if (res.ok) return headers;
    } catch {
      // handled below
    }
    clearAuthStorage();
    return null;
  };

  const validateFormFields = () => {
    const data = tab === 'group' ? groupData : botData;
    if (!data.name || !data.category || !data.telegramLink || !data.description) {
      setError(t('add.nameRequired'));
      return false;
    }
    if (data.description.length < 30) {
      setError(t('add.descMin30'));
      return false;
    }
    if (!data.telegramLink.startsWith('https://t.me/')) {
      setError(t('add.linkMustStart'));
      return false;
    }
    if (!contactTelegram.trim() && !contactEmail.trim()) {
      setError('Please provide your Telegram username or email so we can reach you.');
      return false;
    }
    return true;
  };

  const getImageUrl = async (imageFile: File | null): Promise<string> => {
    if (!imageFile) return PLACEHOLDER_IMAGE_URL;
    // Upload the file to R2 (compressed server-side) and send back only the URL.
    // Never embed base64 in the JSON body — a phone photo blows past Vercel's
    // 4.5MB request-body limit and the submit fails with no error message.
    const fd = new FormData();
    fd.append('file', imageFile);
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    if (!res.ok) throw new Error('Image upload failed. Please try a smaller image.');
    const data = await res.json();
    return data.url as string;
  };

  const submitGroup = async () => {
    setError('');
    if (!validateFormFields()) return;

    const authHeaders = await ensureAuthenticatedHeaders();
    if (!authHeaders) {
      saveFormDraft();
      setError('Your session expired. Please log in again — your form is saved.');
      setShowLoginPrompt(true);
      return;
    }

    const tier = selectedTier;
    const stars = TIER_STARS[tier] || 0;
    const tierObj = PRICING_TIERS.find((t) => t.type === tier);
    const name = groupData.name;

    setIsSubmitting(true);

    try {
      const imageUrl = await getImageUrl(groupData.imageFile);
      const res = await axios.post('/api/groups', {
        name: groupData.name,
        category: groupData.category,
        country: groupData.country,
        telegramLink: groupData.telegramLink,
        description: groupData.description,
        image: imageUrl,
        contactTelegram: contactTelegram.trim(),
        contactEmail: contactEmail.trim(),
      }, { headers: authHeaders });

      const groupId = res.data._id;
      setSubmittedName(name);
      setEntityId(groupId);

      if (tier !== 'free' && groupId) {
        const payRes = await axios.post('/api/payments/group-submission', {
          groupId,
          type: tier,
          entityType: 'group',
          ...(couponCode.trim() ? { couponCode: couponCode.trim() } : {}),
        }, { headers: authHeaders });
        if (payRes.data.freeApproval) {
          setStep('confirmed');
          return;
        }
        setPaidStars(stars);
        setPaidTierLabel(tierObj?.label || '');
        setPayUrl(payRes.data.url);
        setStep('pay');
        startPolling(groupId, 'group');
      } else {
        setStep('free_done');
      }
    } catch (err: any) {
      if (err?.response?.status === 401) {
        clearAuthStorage();
        saveFormDraft();
        setShowLoginPrompt(true);
        setError('Session expired. Please log in again — your form is saved.');
        return;
      }
      setError(err.response?.data?.message || t('add.failedGroup'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitBot = async () => {
    setError('');
    if (!validateFormFields()) return;

    const authHeaders = await ensureAuthenticatedHeaders();
    if (!authHeaders) {
      saveFormDraft();
      setError('Your session expired. Please log in again — your form is saved.');
      setShowLoginPrompt(true);
      return;
    }

    const tier = selectedTier;
    const stars = TIER_STARS[tier] || 0;
    const tierObj = PRICING_TIERS.find((t) => t.type === tier);
    const name = botData.name;

    setIsSubmitting(true);

    try {
      const imageUrl = await getImageUrl(botData.imageFile);
      const res = await axios.post('/api/bots', {
        name: botData.name,
        category: botData.category,
        country: botData.country,
        telegramLink: botData.telegramLink,
        description: botData.description,
        image: imageUrl,
        contactTelegram: contactTelegram.trim(),
        contactEmail: contactEmail.trim(),
      }, { headers: authHeaders });

      const botId = res.data._id;
      setSubmittedName(name);
      setEntityId(botId);

      if (tier !== 'free' && botId) {
        const payRes = await axios.post('/api/payments/group-submission', {
          groupId: botId,
          type: tier,
          entityType: 'bot',
          ...(couponCode.trim() ? { couponCode: couponCode.trim() } : {}),
        }, { headers: authHeaders });
        if (payRes.data.freeApproval) {
          setStep('confirmed');
          return;
        }
        setPaidStars(stars);
        setPaidTierLabel(tierObj?.label || '');
        setPayUrl(payRes.data.url);
        setStep('pay');
        startPolling(botId, 'bot');
      } else {
        setStep('free_done');
      }
    } catch (err: any) {
      if (err?.response?.status === 401) {
        clearAuthStorage();
        saveFormDraft();
        setShowLoginPrompt(true);
        setError('Session expired. Please log in again — your form is saved.');
        return;
      }
      setError(err.response?.data?.message || t('add.failedBot'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setStep('form');
    setPayUrl('');
    setEntityId('');
    setSubmittedName('');
    setPaidStars(0);
    setPaidTierLabel('');
    setError('');
    setIsSubmitting(false);
    setGroupData({ name: '', category: 'NSFW-Telegram', country: 'Adult-Telegram', telegramLink: '', description: '', imageFile: null });
    setBotData({ name: '', category: 'NSFW-Telegram', country: 'Adult-Telegram', telegramLink: '', description: '', imageFile: null });
    setGroupPreview(null);
    setBotPreview(null);
    setSelectedTier('free');
    if (pollRef.current) clearInterval(pollRef.current);
  };

  const entityLabel = tab === 'group' ? 'Group' : 'Bot';
  const loginRedirectPath = defaultTab ? `/add/${defaultTab}` : '/add';

  /* ───── LOGIN PROMPT (overlay, not a page block) ───── */
  if (showLoginPrompt) {
    return (
      <main className="pt-24 pb-16 px-4 max-w-lg mx-auto text-center">
        <div className="text-6xl mb-6">🔒</div>
        <h1 className="text-2xl font-black text-white mb-3">Quick Login Required</h1>
        <p className="text-[#999] mb-2 text-sm leading-relaxed">
          You need to log in to submit your {entityLabel.toLowerCase()}.
        </p>
        <p className="text-[#888] mb-8 text-xs">
          Don&apos;t worry — everything you filled in will be saved.
        </p>
        <a
          href={`/join-erogram?redirect=${encodeURIComponent(loginRedirectPath)}`}
          className="inline-block w-full max-w-xs mx-auto py-4 px-8 rounded-full font-black text-white text-lg no-underline"
          style={{ background: `linear-gradient(135deg, ${TELEGRAM_BLUE}, #0066aa)` }}
        >
          Create Account / Login
        </a>
        <button
          onClick={() => setShowLoginPrompt(false)}
          className="mt-4 text-sm text-[#666] hover:text-white underline block mx-auto"
        >
          Go back to form
        </button>
      </main>
    );
  }

  /* ───── STEP: PAY ───── */
  if (step === 'pay') {
    return (
      <main className="pt-24 pb-16 px-4 max-w-lg mx-auto text-center">
        <div className="text-6xl mb-6">⭐</div>
        <h1 className="text-2xl font-black text-white mb-2">Complete Payment</h1>
        <p className="text-[#999] mb-2">
          Your {entityLabel.toLowerCase()} <span className="text-white font-bold">{submittedName}</span> has been created.
        </p>
        <p className="text-[#999] mb-8">Click the button below to pay in Telegram.</p>

        <a
          href={payUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block w-full max-w-xs mx-auto py-4 px-8 rounded-full font-black text-white text-lg no-underline"
          style={{ background: 'linear-gradient(135deg, #0088cc, #0066aa)' }}
        >
          Pay {paidStars.toLocaleString()}★ in Telegram
        </a>

        <div className="mt-8 flex items-center justify-center gap-2 text-[#666] text-sm">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
          Waiting for payment confirmation...
        </div>
        <p className="mt-2 text-xs text-[#555]">This page updates automatically after you pay.</p>

        <button
          onClick={resetForm}
          className="mt-10 text-sm text-[#666] hover:text-white underline"
        >
          Cancel and go back
        </button>
      </main>
    );
  }

  /* ───── STEP: CONFIRMED ───── */
  if (step === 'confirmed') {
    const isNormalListing = selectedTier === 'normal_listing';
    return (
      <main className="pt-24 pb-16 px-4 max-w-lg mx-auto text-center">
        <div className="text-6xl mb-6">{isNormalListing ? '✅' : '🎉'}</div>
        <h1 className="text-2xl font-black text-green-400 mb-2">Payment Confirmed!</h1>
        <p className="text-[#ccc] mb-8">
          {isNormalListing ? (
            <>Your {entityLabel.toLowerCase()} <span className="text-white font-bold">{submittedName}</span> has been submitted and will be reviewed within 48 hours.</>
          ) : (
            <>Your {entityLabel.toLowerCase()} <span className="text-white font-bold">{submittedName}</span> is now live!</>
          )}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/my-listings"
            className="px-7 py-3.5 rounded-full font-black text-white text-sm no-underline shadow-lg shadow-[#00AFF0]/30 bg-[#00AFF0] hover:bg-[#009dd9] transition-all"
          >
            Go to My Campaigns →
          </Link>
          <button
            onClick={resetForm}
            className="px-6 py-3.5 rounded-full font-bold text-white text-sm bg-white/10 hover:bg-white/20"
          >
            Add Another {entityLabel}
          </button>
        </div>
      </main>
    );
  }

  /* ───── STEP: FREE DONE ───── */
  if (step === 'free_done') {
    return (
      <main className="pt-24 pb-16 px-4 max-w-lg mx-auto text-center">
        <div className="text-6xl mb-6">✅</div>
        <h1 className="text-2xl font-black text-white mb-2">Thank You!</h1>
        <p className="text-[#ccc] mb-8">
          Your {entityLabel.toLowerCase()} <span className="text-white font-bold">{submittedName}</span> is in the moderation queue.
          You&apos;ll be notified when it&apos;s approved.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/my-listings"
            className="px-7 py-3.5 rounded-full font-black text-white text-sm no-underline shadow-lg shadow-[#00AFF0]/30 bg-[#00AFF0] hover:bg-[#009dd9] transition-all"
          >
            Go to My Listings →
          </Link>
          <button
            onClick={resetForm}
            className="px-6 py-3.5 rounded-full font-bold text-white text-sm bg-white/10 hover:bg-white/20"
          >
            Add Another {entityLabel}
          </button>
        </div>
      </main>
    );
  }

  /* ───── STEP: FORM (default) ───── */
  const currentData = tab === 'group' ? groupData : botData;
  const hasContact = contactTelegram.trim().length > 0 || contactEmail.trim().length > 0;
  const isFormFilled =
    currentData.name.trim().length > 0 &&
    currentData.telegramLink.trim().length > 0 &&
    currentData.description.trim().length >= 30 &&
    hasContact;

  return (
    <main className="pt-24 pb-16 px-4 max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-black text-white mb-2">
          {tab === 'group' ? 'Add Telegram Group' : 'Add Telegram Bot'}
        </h1>
      </div>

      {/* Tabs */}
      {!defaultTab && (
        <div className="flex rounded-full bg-white/5 border border-white/10 p-1 mb-8">
          <button
            type="button"
            onClick={() => { setTab('group'); setSelectedTier('free'); setError(''); }}
            className={`flex-1 py-2.5 rounded-full font-bold text-sm transition-all ${tab === 'group' ? 'text-white' : 'text-[#999] hover:text-white'}`}
            style={tab === 'group' ? { backgroundColor: TELEGRAM_BLUE } : {}}
          >
            {t('add.group')}
          </button>
          <button
            type="button"
            onClick={() => { setTab('bot'); setSelectedTier('normal_listing'); setError(''); }}
            className={`flex-1 py-2.5 rounded-full font-bold text-sm transition-all ${tab === 'bot' ? 'text-white' : 'text-[#999] hover:text-white'}`}
            style={tab === 'bot' ? { backgroundColor: TELEGRAM_BLUE } : {}}
          >
            {t('add.bot')}
          </button>
          <Link
            href="/add/ainsfw"
            className="flex-1 py-2.5 rounded-full font-bold text-sm transition-all text-[#999] hover:text-white text-center no-underline"
          >
            🔞 AI NSFW
          </Link>
        </div>
      )}

      {/* Contact Info — always visible */}
      <div className="mb-6 p-4 rounded-2xl border border-white/10 bg-white/[0.03]">
        <p className="text-sm font-bold text-white mb-3">Your Contact Info <span className="text-red-400">*</span></p>
        <p className="text-xs text-[#888] mb-3">We need at least one way to reach you (e.g. if your listing needs attention).</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#aaa] mb-1">Telegram Username</label>
            <input
              type="text"
              value={contactTelegram}
              onChange={(e) => setContactTelegram(e.target.value)}
              className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 text-sm"
              placeholder="@yourusername"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#aaa] mb-1">Email</label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 text-sm"
              placeholder="you@example.com"
            />
          </div>
        </div>
        {!hasContact && (
          <p className="text-[10px] text-amber-400/80 mt-2">Provide at least one: Telegram or Email</p>
        )}
      </div>

      {/* Form */}
      <>
          {tab === 'group' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-[#ccc] mb-1">{t('add.groupImage')}</label>
                <input type="file" accept="image/*" onChange={handleGroupImage} className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-[#ccc] text-sm" />
                {groupPreview && <img src={groupPreview} alt="Preview" className="mt-2 h-32 object-cover rounded-xl" />}
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#ccc] mb-1">{t('add.name')} *</label>
                <input
                  type="text"
                  value={groupData.name}
                  onChange={(e) => setGroupData((d) => ({ ...d, name: e.target.value }))}
                  className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500"
                  placeholder={t('add.groupPlaceholder')}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#ccc] mb-1">{t('add.categoryLabel')} *</label>
                <select
                  value={groupData.category}
                  onChange={(e) => setGroupData((d) => ({ ...d, category: e.target.value }))}
                  className="w-full p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white"
                >
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#ccc] mb-1">{t('add.telegramLink')} *</label>
                <input
                  type="url"
                  value={groupData.telegramLink}
                  onChange={(e) => setGroupData((d) => ({ ...d, telegramLink: e.target.value }))}
                  className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500"
                  placeholder="Your Telegram link starting with https://t.me/"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#ccc] mb-1">{t('add.descLabel')} *</label>
                <textarea
                  value={groupData.description}
                  onChange={(e) => setGroupData((d) => ({ ...d, description: e.target.value }))}
                  className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 resize-none"
                  placeholder={t('add.descGroupPlaceholder')}
                  rows={4}
                />
                <p className="text-xs text-[#666] mt-1">{groupData.description.length}/30</p>
              </div>
            </motion.div>
          )}

          {tab === 'bot' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-[#ccc] mb-1">{t('add.botImage')}</label>
                <input type="file" accept="image/*" onChange={handleBotImage} className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-[#ccc] text-sm" />
                {botPreview && <img src={botPreview} alt="Preview" className="mt-2 h-32 object-cover rounded-xl" />}
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#ccc] mb-1">{t('add.name')} *</label>
                <input
                  type="text"
                  value={botData.name}
                  onChange={(e) => setBotData((d) => ({ ...d, name: e.target.value }))}
                  className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500"
                  placeholder={t('add.botPlaceholder')}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#ccc] mb-1">{t('add.categoryLabel')} *</label>
                <select
                  value={botData.category}
                  onChange={(e) => setBotData((d) => ({ ...d, category: e.target.value }))}
                  className="w-full p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white"
                >
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#ccc] mb-1">{t('add.telegramLink')} *</label>
                <input
                  type="url"
                  value={botData.telegramLink}
                  onChange={(e) => setBotData((d) => ({ ...d, telegramLink: e.target.value }))}
                  className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500"
                  placeholder="Your Telegram link starting with https://t.me/"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#ccc] mb-1">{t('add.descLabel')} *</label>
                <textarea
                  value={botData.description}
                  onChange={(e) => setBotData((d) => ({ ...d, description: e.target.value }))}
                  className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 resize-none"
                  placeholder={t('add.descBotPlaceholder')}
                  rows={4}
                />
                <p className="text-xs text-[#666] mt-1">{botData.description.length}/30</p>
              </div>
            </motion.div>
          )}

          {/* Pricing Tiers */}
          <div className="mt-8 mb-6">
            <p className="text-sm font-semibold text-[#999] mb-3 text-center uppercase tracking-wider">Choose submission type</p>
            <div className="grid grid-cols-1 gap-3">
              {PRICING_TIERS.map((tier) => {
                const isSelected = selectedTier === tier.type;
                const { accentColor, borderSelected, bg } = tier;
                return (
                  <div key={tier.type}>
                  <motion.button
                    type="button"
                    onClick={() => setSelectedTier(tier.type)}
                    whileTap={{ scale: 0.98 }}
                    className="relative w-full text-left p-4 rounded-2xl border transition-all"
                    style={{
                      background: bg,
                      borderColor: isSelected ? borderSelected : 'rgba(255,255,255,0.1)',
                      outline: isSelected ? `2px solid ${borderSelected}` : 'none',
                      outlineOffset: '0px',
                    }}
                  >
                    {tier.badge && (
                      <span
                        className="absolute top-3 right-3 text-[10px] font-black px-2 py-0.5 rounded-full text-white"
                        style={{ background: accentColor }}
                      >
                        {tier.badge}
                      </span>
                    )}
                    <div className="flex items-start gap-3">
                      <div
                        className="mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0"
                        style={{ borderColor: isSelected ? accentColor : '#555' }}
                      >
                        {isSelected && (
                          <div className="w-2 h-2 rounded-full" style={{ background: accentColor }} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 flex gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2 mb-2">
                            <span className="font-black text-white text-base">{tier.label}</span>
                            {tier.stars !== null && (
                              <span className="text-sm font-bold" style={{ color: accentColor }}>
                                {tier.stars.toLocaleString()}★ <span className="text-white/40 text-sm font-bold">· {usd(tier.stars)}</span>
                              </span>
                            )}
                            {tier.stars === null && (
                              <span className="text-sm font-bold text-green-400">Free</span>
                            )}
                          </div>
                          <ul className="space-y-0.5">
                            {tier.perks.map((perk) => (
                              <li key={perk} className="text-xs flex items-center gap-1.5 text-white/80">
                                <span style={{ color: accentColor }}>✓</span>
                                {perk}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {tier.type === 'instant_approval' && (
                          <div
                            className="shrink-0 self-stretch rounded-xl flex flex-col items-center justify-center gap-2"
                            style={{
                              width: '15rem',
                              background: 'rgba(0,0,0,0.55)',
                              border: '1.5px solid rgba(6,182,212,0.8)',
                              boxShadow: '0 0 12px rgba(6,182,212,0.3)',
                            }}
                          >
                            <span className="text-5xl leading-none">⚡</span>
                            <span className="font-black text-sm uppercase tracking-widest text-center leading-tight px-2" style={{ color: '#67e8f9' }}>Skip The Line</span>
                          </div>
                        )}

                        {(tier.type === 'boost_week' || tier.type === 'boost_month') && (
                          <div
                            className="shrink-0 self-stretch rounded-xl flex flex-col items-center justify-center gap-1"
                            style={{
                              width: '15rem',
                              background: 'rgba(0,0,0,0.55)',
                              border: `1.5px solid ${tier.type === 'boost_month' ? 'rgba(168,85,247,0.8)' : 'rgba(251,146,60,0.8)'}`,
                              boxShadow: `0 0 12px ${tier.type === 'boost_month' ? 'rgba(168,85,247,0.3)' : 'rgba(249,115,22,0.3)'}`,
                            }}
                          >
                            <span className="font-black text-white leading-none tracking-tight" style={{ fontSize: '2.8rem' }}>
                              {tier.type === 'boost_week' ? '1 WEEK' : '1 MONTH'}
                            </span>
                            <span className="font-black text-xs uppercase tracking-widest text-center leading-tight px-2" style={{ color: tier.type === 'boost_month' ? '#c4b5fd' : '#fdba74' }}>
                              Boost · 40× More Exposure
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.button>
                  {isSelected && tier.type !== 'free' && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={couponCode}
                          onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponResult(null); }}
                          placeholder="Coupon code"
                          className="flex-1 px-3 py-2 bg-white/[0.05] border border-white/10 rounded-lg text-white text-xs placeholder:text-white/20 outline-none focus:border-[#00AFF0]/40 transition"
                        />
                        <button
                          type="button"
                          disabled={!couponCode.trim() || validatingCoupon}
                          onClick={async () => {
                            setValidatingCoupon(true);
                            const service = tab === 'bot' ? 'bots' : 'groups';
                            const res = await validateCoupon(couponCode.trim(), service, tier.stars || 0);
                            setCouponResult(res);
                            setValidatingCoupon(false);
                          }}
                          className="px-4 py-2 bg-white/[0.08] hover:bg-white/[0.12] text-white/70 text-xs font-bold rounded-lg border border-white/10 disabled:opacity-30 transition"
                        >
                          {validatingCoupon ? '...' : 'Apply'}
                        </button>
                      </div>
                      {couponResult && (
                        <p className={`text-[11px] mt-1.5 font-bold ${couponResult.valid ? 'text-emerald-400' : 'text-red-400'}`}>
                          {couponResult.valid
                            ? `✓ Coupon applied! Pay ${couponResult.discountedStars?.toLocaleString()}★ (${usd(couponResult.discountedStars || 0)}) instead of ${(tier.stars || 0).toLocaleString()}★ — save ${couponResult.savedStars?.toLocaleString()}★`
                            : couponResult.error}
                        </p>
                      )}
                    </motion.div>
                  )}
                  {isSelected && (
                    <motion.button
                      type="button"
                      onClick={tab === 'group' ? submitGroup : submitBot}
                      disabled={isSubmitting || !isFormFilled}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      whileTap={{ scale: 0.97 }}
                      className="w-full mt-3 py-3.5 rounded-xl font-black text-white text-base disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      style={{
                        background: !isFormFilled ? '#333' : 'linear-gradient(135deg, #22c55e, #16a34a)',
                        boxShadow: !isFormFilled ? 'none' : '0 10px 24px rgba(34, 197, 94, 0.35)',
                      }}
                    >
                      {isSubmitting
                        ? t('add.submitting')
                        : !isFormFilled
                          ? 'Fill all required fields above'
                          : tier.type === 'free'
                            ? t('add.submitForMod')
                            : `Submit & Pay ${(tier.stars || 0).toLocaleString()}★ · ${usd(tier.stars || 0)}`}
                    </motion.button>
                  )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Rules Notice */}
          <div className="mb-5 p-3.5 rounded-xl border border-red-500/20 bg-red-500/5">
            <p className="text-xs font-bold text-red-400 mb-1.5">Submission Rules</p>
            <ul className="text-[11px] text-[#999] space-y-1">
              <li className="flex items-start gap-1.5"><span className="text-red-400 shrink-0">✕</span> No illicit activities or scams of any kind</li>
              <li className="flex items-start gap-1.5"><span className="text-red-400 shrink-0">✕</span> Violations result in removal without refund</li>
            </ul>
          </div>

          {/* Ready indicator */}
          {isFormFilled && (
            <div className="mb-3 flex items-center justify-center gap-2 text-emerald-400 text-sm font-bold">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
              All set — ready to submit!
            </div>
          )}

          {/* Submit Button */}
          <motion.button
            type="button"
            onClick={tab === 'group' ? submitGroup : submitBot}
            disabled={isSubmitting || !isFormFilled}
            whileTap={{ scale: 0.96 }}
            className={`w-full py-5 rounded-2xl font-black text-white text-lg tracking-wide disabled:opacity-40 disabled:cursor-not-allowed transition-all ${isFormFilled ? 'animate-pulse' : ''}`}
            style={{
              background: !isFormFilled
                ? '#333'
                : 'linear-gradient(135deg, #22c55e, #16a34a)',
              boxShadow: !isFormFilled ? 'none' : '0 14px 32px rgba(34, 197, 94, 0.45)',
              fontSize: isFormFilled ? '18px' : '16px',
            }}
          >
            {isSubmitting
              ? t('add.submitting')
              : selectedTier === 'free'
                ? `✓ ${t('add.submitForMod')}`
                : `✓ Submit & Pay ${(TIER_STARS[selectedTier] || 0).toLocaleString()}★`}
          </motion.button>

          {error && (
            <div className="mt-3 p-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-400 text-sm text-center font-semibold">
              {error}
            </div>
          )}

          {selectedTier !== 'free' && TIER_STARS[selectedTier] && (
            <p className="mt-3 text-center text-xs text-[#555]">
              After submission, a Telegram Stars payment link will appear on this page.
            </p>
          )}
      </>

      <div className="mt-6 rounded-2xl p-4 text-center" style={{ background: 'linear-gradient(135deg, rgba(34,158,217,0.12), rgba(34,158,217,0.04))', border: '1.5px solid rgba(34,158,217,0.35)' }}>
        <p className="text-[13px] font-black text-white mb-1.5">Having trouble with your purchase?</p>
        <p className="text-[11px] text-gray-300 mb-3">Reach out to our support team.</p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <a href="https://t.me/erogramDOTpro" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-[12px] font-black text-white transition hover:opacity-90" style={{ background: '#229ED9' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M9.036 16.572l-.353 4.967c.505 0 .724-.217.987-.476l2.37-2.265 4.914 3.6c.9.495 1.533.235 1.777-.832l3.22-15.088h.001c.287-1.332-.482-1.853-1.357-1.528L1.94 11.29c-1.308.494-1.288 1.206-.222 1.53l4.82 1.498L17.722 7.98c.527-.348 1.006-.155.611.193"/></svg>
            Telegram: @erogramDOTpro
          </a>
          <a href="mailto:support@erogram.biz" className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-[12px] font-black transition hover:opacity-90" style={{ background: '#fff', color: '#111827' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            support@erogram.biz
          </a>
        </div>
      </div>

      <p className="mt-6 text-center text-[#666] text-sm">
        <Link href={lp('/groups')} className="text-[#0088cc] hover:underline">{t('add.browseGroups')}</Link>
        {' · '}
        <Link href={lp('/bots')} className="text-[#0088cc] hover:underline">{t('add.browseBots')}</Link>
        {' · '}
        <Link href="/ainsfw" className="text-[#0088cc] hover:underline">Browse AI NSFW</Link>
      </p>
    </main>
  );
}
