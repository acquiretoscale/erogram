'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  getMyListings,
  getAllBoostedListings,
  deleteMyPendingListing,
  updateMyApprovedListing,
  type ListingItem,
} from '@/lib/actions/myListings';
import { compressImage } from '@/lib/utils/compressImage';
import { useProfileTheme } from './ProfileThemeContext';
import { ProfileEyebrow, ProfileHeading } from './ProfileTypography';
import { useToast } from '@/components/Toast';
import { BOOST_STARS, cryptoUsdFromStars, SCALE_STARS, SCALE_USD, starsToUsd } from '@/lib/boostPricing';

const INSTANT_APPROVAL_STARS = { group: 600, bot: 1500 } as const;
const DEMO_PENDING_ID = 'demo-pending-group';
const DEMO_BOOST_BOT_ID = 'demo-boost-bot';
const BOOST_PENDING_KEY = 'listingBoostPending';

const DEMO_PENDING_LISTING: ListingItem = {
  _id: DEMO_PENDING_ID,
  type: 'group',
  name: 'Demo Telegram Group (Preview)',
  slug: '',
  image: '/assets/placeholder-no-image.png',
  telegramLink: 'https://t.me/demo_group_preview',
  status: 'pending',
  category: 'NSFW-Telegram',
  views: 0,
  clickCount: 0,
  boosted: false,
  boostExpiresAt: null,
  boostDuration: null,
  paidBoost: false,
  paidBoostStars: null,
  contactTelegram: '',
  contactEmail: '',
  description: 'Preview row for awaiting approval UI.',
  createdAt: new Date().toISOString(),
};

function buildDemoBoostBot(): ListingItem {
  const boostExpiresAt = new Date();
  boostExpiresAt.setDate(boostExpiresAt.getDate() + 5);
  return {
    _id: DEMO_BOOST_BOT_ID,
    type: 'bot',
    name: 'Demo Telegram Bot (Preview)',
    slug: 'demo-bot-preview',
    image: '/assets/placeholder-no-image.png',
    telegramLink: 'https://t.me/demo_bot_preview',
    status: 'approved',
    category: 'Sexting / NSFW Chat',
    views: 1247,
    clickCount: 89,
    boosted: true,
    boostExpiresAt: boostExpiresAt.toISOString(),
    boostDuration: '7d',
    paidBoost: true,
    paidBoostStars: 3000,
    contactTelegram: '',
    contactEmail: '',
    description: 'Preview row for boost active UI.',
    createdAt: new Date().toISOString(),
  };
}

function isDemoListing(id: string) {
  return id === DEMO_PENDING_ID || id === DEMO_BOOST_BOT_ID;
}

function boostDurationLabel(duration: string | null): string {
  if (duration === '7d') return '1 week';
  if (duration === '30d') return '1 month';
  if (duration === '14d') return '2 weeks';
  if (duration === '1d') return '1 day';
  return duration || '';
}

function boostDaysLeft(expiresAt: string | null): number {
  if (!expiresAt) return 0;
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000));
}

async function createBoostInvoice(
  listingId: string,
  type: 'boost_week' | 'boost_month' | 'scale_month',
  entityType: 'group' | 'bot',
  paymentMethod: 'stars' | 'crypto',
): Promise<{ url: string | null; freeApproval?: boolean; error?: string }> {
  try {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/payments/group-submission', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ groupId: listingId, type, entityType, paymentMethod }),
    });
    const data = await res.json();
    if (!res.ok) return { url: null, error: data.message || 'Payment failed' };
    return { url: data.url || null, freeApproval: data.freeApproval };
  } catch {
    return { url: null, error: 'Payment failed' };
  }
}

function pollBoostPayment(
  id: string,
  entityType: 'group' | 'bot',
  expiryBefore: Date | null,
  onSuccess: () => void,
) {
  let attempts = 0;
  const timer = setInterval(async () => {
    attempts += 1;
    try {
      const res = await fetch(`/api/submission-status?id=${id}&entity=${entityType}`);
      const data = await res.json();
      const nextExpiry = data.boostExpiresAt ? new Date(data.boostExpiresAt) : null;
      const paid = data.paid || data.status === 'approved';
      if (nextExpiry && (!expiryBefore || nextExpiry.getTime() > expiryBefore.getTime())) {
        clearInterval(timer);
        onSuccess();
        return;
      }
      if (paid && data.boosted && !expiryBefore) {
        clearInterval(timer);
        onSuccess();
      }
    } catch { /* retry */ }
    if (attempts >= 40) clearInterval(timer);
  }, 3000);
  return () => clearInterval(timer);
}

function formatBoostEndDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

type BoostTier = 'boost_week' | 'boost_month' | 'scale_month';

function BoostPaymentOptions({
  listing,
  tokens,
  payMethod,
  setPayMethod,
  checkoutLoading,
  boostMsg,
  onCheckout,
  title,
  subtitle,
}: {
  listing: ListingItem;
  tokens: ReturnType<typeof useProfileTheme>['tokens'];
  payMethod: 'stars' | 'crypto';
  setPayMethod: (m: 'stars' | 'crypto') => void;
  checkoutLoading: boolean;
  boostMsg: string;
  onCheckout: (tier: BoostTier) => void;
  title: string;
  subtitle?: string;
}) {
  const [selectedTier, setSelectedTier] = useState<BoostTier | null>(null);
  const entityType = listing.type === 'bot' ? 'bot' : 'group';
  const prices = BOOST_STARS[entityType];
  const weekStars = prices.week;
  const monthStars = prices.month;

  const tierPrice = (tier: BoostTier) => {
    if (tier === 'scale_month') {
      return payMethod === 'stars'
        ? `${SCALE_STARS.toLocaleString()}★ · $${SCALE_USD}`
        : `$${SCALE_USD}`;
    }
    const stars = tier === 'boost_week' ? weekStars : monthStars;
    return payMethod === 'stars'
      ? `${stars.toLocaleString()}★ · ~$${starsToUsd(stars).toFixed(2)}`
      : `$${cryptoUsdFromStars(stars).toFixed(2)}`;
  };

  return (
    <>
      <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: tokens.accent }}>{title}</p>
      {subtitle && <p className="mt-1 text-xs" style={{ color: tokens.muted }}>{subtitle}</p>}
      <div className="mt-3 grid min-w-0 grid-cols-2 gap-2">
        <button type="button" onClick={() => setPayMethod('stars')} className="min-w-0 rounded-xl py-2.5 text-[10px] font-black uppercase tracking-wide sm:py-2" style={{ backgroundColor: payMethod === 'stars' ? tokens.accent : tokens.bg, color: payMethod === 'stars' ? tokens.ink : tokens.muted, border: `1px solid ${payMethod === 'stars' ? tokens.accent : tokens.border}` }}>
          Telegram Stars
        </button>
        <button type="button" onClick={() => setPayMethod('crypto')} className="min-w-0 rounded-xl py-2.5 text-[10px] font-black uppercase tracking-wide sm:py-2" style={{ backgroundColor: payMethod === 'crypto' ? '#f97316' : tokens.bg, color: payMethod === 'crypto' ? '#fff' : tokens.muted, border: `1px solid ${payMethod === 'crypto' ? '#f97316' : tokens.border}` }}>
          Crypto
        </button>
      </div>
      <div className="mt-3 min-w-0 space-y-2">
        <button
          type="button"
          onClick={() => setSelectedTier('boost_week')}
          className="flex w-full min-w-0 flex-col items-start rounded-xl border px-3 py-3 text-left"
          style={{
            borderColor: selectedTier === 'boost_week' ? tokens.accent : tokens.border,
            backgroundColor: selectedTier === 'boost_week' ? `${tokens.accent}10` : tokens.bg,
          }}
        >
          <span className="text-xs font-black uppercase tracking-wide" style={{ color: tokens.text }}>Boost 1 week</span>
          <span className="mt-1 text-[11px]" style={{ color: tokens.muted }}>{tierPrice('boost_week')}</span>
        </button>
        <button
          type="button"
          onClick={() => setSelectedTier('boost_month')}
          className="flex w-full flex-col items-start rounded-xl border px-3 py-3 text-left"
          style={{
            borderColor: selectedTier === 'boost_month' ? tokens.accent : tokens.border,
            backgroundColor: selectedTier === 'boost_month' ? `${tokens.accent}10` : tokens.bg,
          }}
        >
          <span className="text-xs font-black uppercase tracking-wide" style={{ color: tokens.text }}>Boost 1 month</span>
          <span className="mt-1 text-[11px]" style={{ color: tokens.muted }}>{tierPrice('boost_month')}</span>
        </button>
        <button
          type="button"
          onClick={() => setSelectedTier('scale_month')}
          className="flex w-full flex-col items-start rounded-xl border px-3 py-3 text-left"
          style={{
            borderColor: selectedTier === 'scale_month' ? '#a855f7' : tokens.border,
            backgroundColor: selectedTier === 'scale_month' ? '#a855f718' : tokens.bg,
          }}
        >
          <span className="text-xs font-black uppercase tracking-wide" style={{ color: tokens.text }}>Scale · 1 month</span>
          <span className="mt-1 text-[11px] break-words" style={{ color: tokens.muted }}>{tierPrice('scale_month')}</span>
          <span className="mt-1.5 text-[10px] leading-snug break-words" style={{ color: '#a855f7' }}>
            4× more exposure than Boost.
          </span>
        </button>
      </div>
      <button
        type="button"
        disabled={!selectedTier || checkoutLoading}
        onClick={() => selectedTier && onCheckout(selectedTier)}
        className="mt-3 w-full rounded-xl py-3 text-xs font-black uppercase tracking-wide disabled:opacity-40"
        style={{
          backgroundColor: selectedTier ? (payMethod === 'crypto' ? '#f97316' : tokens.accent) : tokens.bg,
          color: selectedTier ? (payMethod === 'crypto' ? '#fff' : tokens.ink) : tokens.muted,
          border: `1px solid ${selectedTier ? (payMethod === 'crypto' ? '#f97316' : tokens.accent) : tokens.border}`,
        }}
      >
        {checkoutLoading ? 'Starting…' : 'Checkout'}
      </button>
      {payMethod === 'crypto' && (
        <p className="mt-2 text-center text-[10px]" style={{ color: tokens.muted }}>
          Secure checkout via NOWPayments · USDT, BTC, ETH and more
        </p>
      )}
      {boostMsg && (
        <p className="mt-2 break-words text-center text-xs font-bold" style={{ color: boostMsg.includes('failed') || boostMsg.includes('Could') ? '#ef4444' : '#22c55e' }}>
          {boostMsg}
        </p>
      )}
    </>
  );
}

async function createInstantApprovalInvoice(
  listingId: string,
  entityType: 'group' | 'bot',
): Promise<{ url: string | null; freeApproval?: boolean; error?: string }> {
  try {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/payments/group-submission', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ groupId: listingId, type: 'instant_approval', entityType }),
    });
    const data = await res.json();
    if (!res.ok) return { url: null, error: data.message || 'Payment failed' };
    return { url: data.url || null, freeApproval: data.freeApproval };
  } catch {
    return { url: null, error: 'Payment failed' };
  }
}

function statusLabel(status: string): string {
  if (status === 'approved') return 'Approved';
  if (status === 'pending') return 'Awaiting approval';
  if (status === 'rejected') return 'Rejected';
  if (status === 'scheduled') return 'Scheduled';
  return 'Awaiting approval';
}

function statusColor(status: string): string {
  if (status === 'approved') return '#22c55e';
  if (status === 'rejected') return '#ef4444';
  if (status === 'scheduled') return '#3b82f6';
  return '#eab308';
}

function typeLabel(type: ListingItem['type']): string {
  return type === 'bot' ? 'Bot' : 'Group';
}

function ListingThumb({
  listing,
  tokens,
  sizeClass = 'h-11 w-11',
}: {
  listing: ListingItem;
  tokens: ReturnType<typeof useProfileTheme>['tokens'];
  sizeClass?: string;
}) {
  return (
    <div
      className={`${sizeClass} shrink-0 overflow-hidden rounded-lg border`}
      style={{ borderColor: tokens.border, backgroundColor: tokens.bg }}
    >
      {listing.image && listing.image !== '/assets/placeholder-no-image.png' ? (
        <img src={listing.image} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-sm font-black" style={{ color: tokens.accent }}>
          {listing.name.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  );
}

function ListingClickExpand({
  listing,
  tokens,
  showBoostLabel = true,
  onRefresh,
}: {
  listing: ListingItem;
  tokens: ReturnType<typeof useProfileTheme>['tokens'];
  showBoostLabel?: boolean;
  onRefresh?: () => Promise<void>;
}) {
  const { toast } = useToast();
  const [payMethod, setPayMethod] = useState<'stars' | 'crypto'>('stars');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [boostMsg, setBoostMsg] = useState('');

  const entityType = listing.type === 'bot' ? 'bot' : 'group';
  const boostExpiry = listing.boostExpiresAt ? new Date(listing.boostExpiresAt) : null;
  const isBoostActive = !!(listing.boosted && boostExpiry && boostExpiry > new Date());
  const hadPastBoost = !!(boostExpiry && boostExpiry <= new Date());
  const showBoostPanel = listing.status === 'approved';
  const isDemo = isDemoListing(listing._id);
  const daysLeft = boostDaysLeft(listing.boostExpiresAt);

  const boostProgress = (() => {
    if (!isBoostActive || !boostExpiry) return 0;
    const totalMs = listing.boostDuration === '30d' ? 30 * 86400000 : 7 * 86400000;
    return Math.min(100, Math.max(0, ((boostExpiry.getTime() - Date.now()) / totalMs) * 100));
  })();

  const boostTitle = isBoostActive || hadPastBoost ? 'Boost again' : 'Boost listing';
  const boostSubtitle = isBoostActive
    ? 'Extend or renew top placement.'
    : 'Top placement while boosted. 40× more exposure.';

  const handleCheckout = async (tier: BoostTier) => {
    if (isDemo) {
      toast('Preview only. Submit a real listing to boost.', 'error');
      return;
    }

    setCheckoutLoading(true);
    setBoostMsg('');
    const expiryBefore = boostExpiry ? new Date(boostExpiry) : null;

    try {
      const result = await createBoostInvoice(listing._id, tier, entityType, payMethod);
      if (result.error) {
        setBoostMsg(result.error);
        return;
      }
      if (result.freeApproval) {
        await onRefresh?.();
        setBoostMsg('Boost activated.');
        toast('Boost activated', 'success');
        return;
      }
      if (result.url) {
        if (payMethod === 'crypto') {
          sessionStorage.setItem(
            BOOST_PENDING_KEY,
            JSON.stringify({
              id: listing._id,
              entityType,
              expiryBefore: expiryBefore?.toISOString() ?? null,
            }),
          );
        }
        window.open(result.url, '_blank', 'noopener,noreferrer');
        setBoostMsg(
          payMethod === 'stars'
            ? 'Complete payment in Telegram. This page updates automatically.'
            : 'Complete payment in the new tab. This page updates automatically.',
        );
        pollBoostPayment(listing._id, entityType, expiryBefore, async () => {
          sessionStorage.removeItem(BOOST_PENDING_KEY);
          await onRefresh?.();
          setBoostMsg('Boost activated.');
          toast('Boost activated', 'success');
        });
        return;
      }
      setBoostMsg('Could not start payment.');
    } catch {
      setBoostMsg('Could not start payment.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <div
      className="mt-3 min-w-0 rounded-xl border p-3 sm:p-4"
      style={{ borderColor: tokens.border, backgroundColor: tokens.bg }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className={showBoostPanel ? 'grid min-w-0 gap-4 sm:grid-cols-2' : 'min-w-0'}>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: tokens.muted }}>
            {showBoostLabel ? 'Boost clicks' : 'Listing clicks'}
          </p>
          <p className="mt-1 text-2xl font-black tabular-nums" style={{ color: tokens.text }}>
            {listing.clickCount.toLocaleString()}
          </p>
          <p className="mt-1 text-xs" style={{ color: tokens.muted }}>
            Total join-button clicks on this listing
          </p>
          <p className="mt-2 text-xs" style={{ color: tokens.muted }}>
            {listing.views.toLocaleString()} page visits
          </p>
          {hadPastBoost && !isBoostActive && listing.boostExpiresAt && (
            <p className="mt-3 text-xs font-bold" style={{ color: tokens.muted }}>
              Last boost ended {formatBoostEndDate(listing.boostExpiresAt)}
              {listing.boostDuration ? ` · ${boostDurationLabel(listing.boostDuration)}` : ''}
            </p>
          )}
        </div>

        {showBoostPanel && (
          <div className="min-w-0 rounded-xl border p-3 sm:p-4" style={{ borderColor: tokens.border, backgroundColor: tokens.card }}>
            {isBoostActive && (
              <div className="mb-4">
                <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: tokens.muted }}>
                  Boost status
                </p>
                <p className="mt-2 text-sm font-bold" style={{ color: tokens.accent }}>
                  Active · {boostDurationLabel(listing.boostDuration)} · {daysLeft} days left
                </p>
                <p className="mt-1 text-xs" style={{ color: tokens.muted }}>
                  Ends {formatBoostEndDate(listing.boostExpiresAt)}
                </p>
                <div className="mt-3 h-2 overflow-hidden rounded-full" style={{ backgroundColor: tokens.bg }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${boostProgress}%`, backgroundColor: tokens.accent }} />
                </div>
              </div>
            )}
            <BoostPaymentOptions
              listing={listing}
              tokens={tokens}
              payMethod={payMethod}
              setPayMethod={setPayMethod}
              checkoutLoading={checkoutLoading}
              boostMsg={boostMsg}
              onCheckout={handleCheckout}
              title={boostTitle}
              subtitle={boostSubtitle}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Read failed'));
    reader.readAsDataURL(file);
  });
}

function ApprovedListingEdit({
  listing,
  tokens,
  onSaved,
  onCancel,
}: {
  listing: ListingItem;
  tokens: ReturnType<typeof useProfileTheme>['tokens'];
  onSaved: (patch: Partial<ListingItem>) => void;
  onCancel: () => void;
}) {
  const [telegramLink, setTelegramLink] = useState(listing.telegramLink);
  const [description, setDescription] = useState(listing.description || '');
  const [imagePreview, setImagePreview] = useState(listing.image);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const handleImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setMsg('Max file size is 10MB');
      return;
    }
    setUploadingImage(true);
    setMsg('');
    try {
      const compressed = await compressImage(file);
      const dataUrl = await fileToDataUrl(compressed);
      setImageDataUrl(dataUrl);
      setImagePreview(dataUrl);
    } catch {
      setMsg('Could not process image');
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleSave = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    if (!telegramLink.trim().startsWith('https://t.me/')) {
      setMsg('Telegram link must start with https://t.me/');
      return;
    }
    if (description.trim().length < 30) {
      setMsg('Description must be at least 30 characters');
      return;
    }

    setSaving(true);
    setMsg('');
    try {
      const result = await updateMyApprovedListing(
        token,
        listing._id,
        listing.type as 'group' | 'bot',
        {
          telegramLink: telegramLink.trim(),
          description: description.trim(),
          ...(imageDataUrl ? { imageDataUrl } : {}),
        },
      );
      if (result.error) {
        setMsg(result.error);
      } else {
        onSaved({
          telegramLink: telegramLink.trim(),
          description: description.trim(),
          ...(result.image ? { image: result.image } : {}),
        });
      }
    } catch {
      setMsg('Could not save changes');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="mt-3 min-w-0 space-y-3 rounded-xl border p-3 sm:p-4"
      style={{ borderColor: tokens.border, backgroundColor: tokens.bg }}
    >
      <div>
        <label className="mb-1 block text-[10px] font-black uppercase tracking-wide" style={{ color: tokens.muted }}>
          Profile image
        </label>
        <div className="flex items-center gap-3">
          <div
            className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border"
            style={{ borderColor: tokens.border }}
          >
            {imagePreview && imagePreview !== '/assets/placeholder-no-image.png' ? (
              <img src={imagePreview} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm font-black" style={{ color: tokens.accent }}>
                {listing.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <label
            className="inline-flex cursor-pointer items-center rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-wide"
            style={{ border: `1px solid ${tokens.border}`, color: tokens.text }}
          >
            {uploadingImage ? 'Processing…' : 'Change image'}
            <input type="file" accept="image/*" className="hidden" onChange={handleImagePick} disabled={uploadingImage} />
          </label>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-[10px] font-black uppercase tracking-wide" style={{ color: tokens.muted }}>
          Telegram link
        </label>
        <input
          type="url"
          value={telegramLink}
          onChange={(e) => setTelegramLink(e.target.value)}
          className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
          style={{ borderColor: tokens.border, backgroundColor: tokens.card, color: tokens.text }}
          placeholder="https://t.me/..."
        />
      </div>

      <div>
        <label className="mb-1 block text-[10px] font-black uppercase tracking-wide" style={{ color: tokens.muted }}>
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="w-full resize-y rounded-lg border px-3 py-2 text-sm outline-none"
          style={{ borderColor: tokens.border, backgroundColor: tokens.card, color: tokens.text }}
        />
        <p className="mt-1 text-[10px]" style={{ color: tokens.muted }}>
          {description.trim().length} / 30 min
        </p>
      </div>

      {msg && (
        <p className="text-xs font-bold" style={{ color: msg === 'Saved' ? '#22c55e' : '#ef4444' }}>
          {msg}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || uploadingImage}
          className="rounded-lg px-4 py-2 text-[10px] font-black uppercase tracking-wide disabled:opacity-50"
          style={{ backgroundColor: tokens.accent, color: tokens.ink }}
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded-lg px-4 py-2 text-[10px] font-black uppercase tracking-wide"
          style={{ border: `1px solid ${tokens.border}`, color: tokens.muted }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function ListingRow({
  listing,
  tokens,
  showOwner,
  isEditing,
  isExpanded,
  instantLoadingId,
  deletingId,
  onToggleExpand,
  onSelectBoost,
  onToggleEdit,
  onInstantApproval,
  onDelete,
  onSaved,
  onRefresh,
}: {
  listing: ListingItem;
  tokens: ReturnType<typeof useProfileTheme>['tokens'];
  showOwner?: boolean;
  isEditing: boolean;
  isExpanded: boolean;
  instantLoadingId: string | null;
  deletingId: string | null;
  onToggleExpand: () => void;
  onSelectBoost: () => void;
  onToggleEdit: () => void;
  onInstantApproval: () => void;
  onDelete: () => void;
  onSaved: (patch: Partial<ListingItem>) => void;
  onRefresh?: () => Promise<void>;
}) {
  const live = listing.status === 'approved' && listing.slug;
  const isDemo = isDemoListing(listing._id);
  const boostExpiry = listing.boostExpiresAt ? new Date(listing.boostExpiresAt) : null;
  const isBoostActive = !!(listing.boosted && boostExpiry && boostExpiry > new Date());
  const daysLeft = boostDaysLeft(listing.boostExpiresAt);
  const ownerLabel =
    showOwner && 'ownerLabel' in listing
      ? String((listing as ListingItem & { ownerLabel?: string }).ownerLabel ?? '')
      : '';

  return (
    <li className="overflow-hidden px-3 py-3 sm:px-5 sm:py-4" style={{ backgroundColor: tokens.card }}>
      <div className="flex gap-2.5 sm:gap-3">
        <ListingThumb listing={listing} tokens={tokens} />
        <div className="min-w-0 flex-1">
          <div
            className="flex cursor-pointer items-start gap-2 transition-opacity hover:opacity-95"
            onClick={onToggleExpand}
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="max-w-full truncate text-sm font-bold" style={{ color: tokens.text }}>{listing.name}</span>
                <span className="rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide" style={{ backgroundColor: tokens.bg, color: tokens.muted, border: `1px solid ${tokens.border}` }}>
                  {typeLabel(listing.type)}
                </span>
                {isDemo && (
                  <span className="rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide" style={{ backgroundColor: '#eab30818', color: '#eab308', border: '1px solid #eab30840' }}>
                    Preview
                  </span>
                )}
              </div>
              {(listing.category || ownerLabel) && (
                <p className="mt-0.5 truncate text-xs" style={{ color: tokens.muted }}>
                  {[listing.category, ownerLabel].filter(Boolean).join(' · ')}
                </p>
              )}
              {isBoostActive && (
                <p className="mt-1 text-[10px] font-black uppercase tracking-wide" style={{ color: tokens.accent }}>
                  Boost active · {boostDurationLabel(listing.boostDuration) || 'active'} · {daysLeft}d left
                </p>
              )}
              {live && !isEditing && (
                <a href={`/${listing.slug}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="mt-1 inline-block text-[11px] font-bold no-underline hover:underline" style={{ color: tokens.accent }}>
                  View live page
                </a>
              )}
            </div>
            <span className="mt-0.5 shrink-0 text-xs" style={{ color: tokens.muted, transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }} aria-hidden>▾</span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide" style={{ color: tokens.text, backgroundColor: tokens.bg, border: `1px solid ${tokens.border}` }}>
              {listing.views.toLocaleString()} visits
            </span>
            <span className="rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide" style={{ color: statusColor(listing.status), backgroundColor: `${statusColor(listing.status)}18`, border: `1px solid ${statusColor(listing.status)}40` }}>
              {statusLabel(listing.status)}
            </span>
            {isBoostActive && (
              <span className="rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide" style={{ color: tokens.accent, backgroundColor: `${tokens.accent}18`, border: `1px solid ${tokens.accent}40` }}>
                Boost · {daysLeft}d
              </span>
            )}
            {listing.status === 'pending' && !listing.paidBoost && (
              <button type="button" onClick={(e) => { e.stopPropagation(); onInstantApproval(); }} disabled={instantLoadingId === listing._id} className="rounded-lg px-2 py-1.5 text-[10px] font-black uppercase tracking-wide transition-opacity disabled:opacity-50" style={{ color: '#fff', backgroundColor: '#22c55e', border: '1px solid #22c55e80' }}>
                {instantLoadingId === listing._id ? '…' : (
                  <>
                    <span className="sm:hidden">Instant · {INSTANT_APPROVAL_STARS[listing.type === 'bot' ? 'bot' : 'group']}★</span>
                    <span className="hidden sm:inline">Buy instant approval · {INSTANT_APPROVAL_STARS[listing.type === 'bot' ? 'bot' : 'group']}★</span>
                  </>
                )}
              </button>
            )}
            {listing.status === 'approved' && (
              <button type="button" onClick={(e) => { e.stopPropagation(); onSelectBoost(); }} className="rounded-lg px-2 py-1.5 text-[10px] font-black uppercase tracking-wide" style={{ color: tokens.accent, border: `1px solid ${tokens.accent}40`, backgroundColor: `${tokens.accent}10` }}>
                Boost
              </button>
            )}
            {listing.status === 'approved' && (
              <button type="button" onClick={(e) => { e.stopPropagation(); onToggleEdit(); }} className="rounded-lg px-2 py-1.5 text-[10px] font-black uppercase tracking-wide" style={{ color: tokens.muted, border: `1px solid ${tokens.border}` }}>
                {isEditing ? 'Close' : 'Edit'}
              </button>
            )}
            {listing.status === 'pending' && (
              <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(); }} disabled={deletingId === listing._id} title="Delete listing" aria-label="Delete listing" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-opacity disabled:opacity-50" style={{ color: '#ef4444', border: '1px solid #ef444440', backgroundColor: '#ef444410' }}>
                {deletingId === listing._id ? <span className="text-xs">…</span> : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" />
                  </svg>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
      {isExpanded && (
        <ListingClickExpand
          listing={listing}
          tokens={tokens}
          showBoostLabel={isBoostActive || !!listing.boostExpiresAt || listing.paidBoost}
          onRefresh={onRefresh}
        />
      )}
      {isEditing && listing.status === 'approved' && (
        <div onClick={(e) => e.stopPropagation()}>
          <ApprovedListingEdit listing={listing} tokens={tokens} onCancel={onToggleEdit} onSaved={onSaved} />
        </div>
      )}
    </li>
  );
}

function ListingsContactBlock({
  tokens,
}: {
  tokens: ReturnType<typeof useProfileTheme>['tokens'];
}) {
  return (
    <section className="mt-6">
      <div
        className="rounded-xl border px-4 py-6 text-center sm:px-6 sm:py-8"
        style={{ borderColor: tokens.border, backgroundColor: tokens.bg }}
      >
        <p className="mx-auto mb-5 max-w-lg text-sm leading-relaxed sm:text-base" style={{ color: tokens.muted }}>
          Need help? Have a question? Don&apos;t hesitate to get in touch:
        </p>
        <div className="mx-auto grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          <a
            href="mailto:isabella@erogram.biz"
            className="group flex flex-col items-center justify-center gap-2 rounded-lg px-4 py-4 text-center transition-opacity hover:opacity-90"
            style={{ backgroundColor: tokens.card, border: `1px solid ${tokens.border}` }}
          >
            <span className="text-2xl leading-none" aria-hidden="true">✉️</span>
            <span className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: tokens.muted }}>Email</span>
            <span className="break-all text-sm font-black sm:text-base" style={{ color: tokens.text }}>isabella@erogram.biz</span>
          </a>
          <a
            href="https://t.me/erogramDOTpro"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col items-center justify-center gap-2 rounded-lg px-4 py-4 text-center transition-opacity hover:opacity-90"
            style={{ backgroundColor: tokens.accent, border: `1px solid ${tokens.accent}`, color: tokens.ink }}
          >
            <svg className="h-7 w-7 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.820 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" /></svg>
            <span className="text-[10px] font-black uppercase tracking-[0.18em] opacity-70">Telegram</span>
            <span className="text-sm font-black sm:text-base">@erogramDOTpro</span>
          </a>
        </div>
      </div>
    </section>
  );
}

export default function ProfileMyListingsTab({ username, isAdmin }: { username?: string | null; isAdmin?: boolean }) {
  const { tokens } = useProfileTheme();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const cryptoPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [listings, setListings] = useState<ListingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cryptoConfirming, setCryptoConfirming] = useState(false);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ListingItem | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [instantLoadingId, setInstantLoadingId] = useState<string | null>(null);
  const [demoPendingVisible, setDemoPendingVisible] = useState(true);
  const [demoBoostVisible, setDemoBoostVisible] = useState(true);
  const [expandedListingId, setExpandedListingId] = useState<string | null>(null);
  const [adminBoosted, setAdminBoosted] = useState<(ListingItem & { ownerLabel: string; boostPhase: 'active' | 'past' })[]>([]);
  const [adminBoostedLoading, setAdminBoostedLoading] = useState(false);

  const demoListings = useMemo(() => {
    if (username !== 'eros') return [];
    const rows: ListingItem[] = [];
    if (demoPendingVisible) rows.push(DEMO_PENDING_LISTING);
    if (demoBoostVisible) rows.push(buildDemoBoostBot());
    return rows;
  }, [username, demoPendingVisible, demoBoostVisible]);

  const displayListings = [...demoListings, ...listings];

  const load = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await getMyListings(token);
      if (result.error) {
        setError(result.error);
        setListings([]);
      } else {
        setListings(result.listings.filter((l) => l.type === 'group' || l.type === 'bot'));
      }
      if (isAdmin) {
        const adminResult = await getAllBoostedListings(token);
        if (!adminResult.error) setAdminBoosted(adminResult.listings);
      }
    } catch {
      setError('Could not load your listings.');
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const renewed = searchParams.get('renewed') === '1';
    const pendingRaw = typeof window !== 'undefined' ? sessionStorage.getItem(BOOST_PENDING_KEY) : null;
    if (!renewed && !pendingRaw) return;

    if (renewed && typeof window !== 'undefined') {
      window.history.replaceState({}, '', '/profile?tab=listings');
    }
    setCryptoConfirming(true);

    let pending: { id: string; entityType: 'group' | 'bot'; expiryBefore: string | null } | null = null;
    if (pendingRaw) {
      try {
        pending = JSON.parse(pendingRaw);
      } catch {
        sessionStorage.removeItem(BOOST_PENDING_KEY);
      }
    }

    if (cryptoPollRef.current) clearInterval(cryptoPollRef.current);
    let attempts = 0;
    cryptoPollRef.current = setInterval(async () => {
      attempts += 1;
      if (pending) {
        try {
          const res = await fetch(`/api/submission-status?id=${pending.id}&entity=${pending.entityType}`);
          const data = await res.json();
          const nextExpiry = data.boostExpiresAt ? new Date(data.boostExpiresAt) : null;
          const expiryBefore = pending.expiryBefore ? new Date(pending.expiryBefore) : null;
          if (nextExpiry && (!expiryBefore || nextExpiry.getTime() > expiryBefore.getTime())) {
            if (cryptoPollRef.current) clearInterval(cryptoPollRef.current);
            cryptoPollRef.current = null;
            sessionStorage.removeItem(BOOST_PENDING_KEY);
            setCryptoConfirming(false);
            await load();
            toast('Boost activated', 'success');
            return;
          }
        } catch { /* retry */ }
      }
      if (attempts >= 120) {
        if (cryptoPollRef.current) clearInterval(cryptoPollRef.current);
        cryptoPollRef.current = null;
        sessionStorage.removeItem(BOOST_PENDING_KEY);
        setCryptoConfirming(false);
      }
    }, 5000);

    return () => {
      if (cryptoPollRef.current) clearInterval(cryptoPollRef.current);
      cryptoPollRef.current = null;
    };
  }, [searchParams, load, toast]);

  useEffect(() => {
    if (!isAdmin) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    setAdminBoostedLoading(true);
    getAllBoostedListings(token)
      .then((result) => {
        if (!result.error) setAdminBoosted(result.listings);
      })
      .finally(() => setAdminBoostedLoading(false));
  }, [isAdmin, listings]);

  const toggleExpanded = (id: string) => {
    setExpandedListingId((prev) => (prev === id ? null : id));
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    if (isDemoListing(deleteTarget._id)) {
      if (deleteTarget._id === DEMO_PENDING_ID) setDemoPendingVisible(false);
      if (deleteTarget._id === DEMO_BOOST_BOT_ID) setDemoBoostVisible(false);
      setDeleteTarget(null);
      toast('Preview listing removed', 'success');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) return;

    setDeletingId(deleteTarget._id);
    setError('');
    try {
      const result = await deleteMyPendingListing(
        token,
        deleteTarget._id,
        deleteTarget.type as 'group' | 'bot',
      );
      if (result.error) {
        setError(result.error);
        toast(result.error, 'error');
      } else {
        setListings((prev) => prev.filter((l) => l._id !== deleteTarget._id));
        toast('Listing deleted', 'success');
        setDeleteTarget(null);
      }
    } catch {
      setError('Could not delete listing.');
      toast('Could not delete listing.', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const handleInstantApproval = async (listing: ListingItem) => {
    if (listing.status !== 'pending' || listing.paidBoost) return;

    if (isDemoListing(listing._id)) {
      toast('Preview only. Submit a real listing to pay for instant approval.', 'error');
      return;
    }

    setInstantLoadingId(listing._id);
    setError('');
    try {
      const entityType = listing.type === 'bot' ? 'bot' : 'group';
      const result = await createInstantApprovalInvoice(listing._id, entityType);
      if (result.error) {
        setError(result.error);
      } else if (result.freeApproval) {
        await load();
      } else if (result.url) {
        window.open(result.url, '_blank', 'noopener,noreferrer');
      }
    } catch {
      setError('Could not start payment.');
    } finally {
      setInstantLoadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
          style={{ borderColor: tokens.accent, borderTopColor: 'transparent' }}
        />
      </div>
    );
  }

  return (
    <div className="min-w-0 max-w-full overflow-x-hidden">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0">
          <ProfileEyebrow muted className="mb-2">Submissions</ProfileEyebrow>
          <ProfileHeading size="md" className="!mt-0">
            My Listings
          </ProfileHeading>
          <p className="mt-2 text-sm" style={{ color: tokens.muted }}>
            Groups and bots you submitted to Erogram.
          </p>
        </div>
        <Link
          href="/add"
          className="inline-flex w-full items-center justify-center rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-wide transition-opacity hover:opacity-90 sm:w-auto"
          style={{ backgroundColor: tokens.accent, color: tokens.ink }}
        >
          + Submit listing
        </Link>
      </div>

      {cryptoConfirming && (
        <div
          className="mb-4 rounded-xl border px-4 py-3 text-center text-xs font-bold"
          style={{ borderColor: '#f97316', backgroundColor: '#f9731618', color: tokens.text }}
        >
          Confirming crypto payment… This page updates automatically.
        </div>
      )}

      {demoListings.length > 0 && (
        <p className="mb-4 text-xs" style={{ color: tokens.muted }}>
          Yellow <strong style={{ color: '#eab308' }}>Preview</strong> rows are demo only. No database write.
        </p>
      )}

      {username === 'eros' && demoListings.length === 0 && (
        <button
          type="button"
          onClick={() => { setDemoPendingVisible(true); setDemoBoostVisible(true); }}
          className="mb-4 text-xs font-bold underline"
          style={{ color: tokens.accent }}
        >
          Show preview listings again
        </button>
      )}

      {error && (
        <p className="mb-4 rounded-xl border px-4 py-3 text-sm" style={{ borderColor: tokens.border, color: '#ef4444' }}>
          {error}
        </p>
      )}

      {isAdmin && (
        <div className="mb-8">
          <div className="mb-3">
            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#a855f7' }}>Admin</p>
            <p className="text-sm font-bold" style={{ color: tokens.text }}>All boosted listings</p>
            <p className="text-xs" style={{ color: tokens.muted }}>
              {adminBoostedLoading
                ? 'Loading…'
                : `${adminBoosted.filter((l) => l.boostPhase === 'active').length} active · ${adminBoosted.filter((l) => l.boostPhase === 'past').length} past · ${adminBoosted.length} total`}
            </p>
          </div>

          {adminBoostedLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: '#a855f7', borderTopColor: 'transparent' }} />
            </div>
          ) : adminBoosted.length === 0 ? (
            <div className="rounded-2xl border px-4 py-6 text-center text-sm" style={{ borderColor: tokens.border, color: tokens.muted }}>
              No active boosts right now.
            </div>
          ) : (
            <ul className="divide-y overflow-hidden rounded-2xl border" style={{ borderColor: tokens.border }}>
              {adminBoosted.map((listing) => (
                <ListingRow
                  key={`admin-${listing.type}-${listing._id}`}
                  listing={listing}
                  tokens={tokens}
                  showOwner
                  isEditing={editingId === listing._id}
                  isExpanded={expandedListingId === listing._id}
                  instantLoadingId={instantLoadingId}
                  deletingId={deletingId}
                  onToggleExpand={() => toggleExpanded(listing._id)}
                  onSelectBoost={() => setExpandedListingId(listing._id)}
                  onToggleEdit={() => setEditingId(editingId === listing._id ? null : listing._id)}
                  onInstantApproval={() => handleInstantApproval(listing)}
                  onDelete={() => setDeleteTarget(listing)}
                  onSaved={(patch) => {
                    setAdminBoosted((prev) => prev.map((l) => (l._id === listing._id ? { ...l, ...patch } : l)));
                    setEditingId(null);
                  }}
                  onRefresh={load}
                />
              ))}
            </ul>
          )}
        </div>
      )}

      {displayListings.length === 0 ? (
        <div
          className="rounded-2xl border px-6 py-12 text-center"
          style={{ borderColor: tokens.border, backgroundColor: tokens.bg }}
        >
          <p className="text-base font-bold" style={{ color: tokens.text }}>
            No listings yet
          </p>
          <p className="mt-2 text-sm" style={{ color: tokens.muted }}>
            Submit a Telegram group or bot and it will show here with its approval status.
          </p>
          <Link
            href="/add"
            className="mt-6 inline-flex items-center rounded-xl px-5 py-3 text-xs font-black uppercase tracking-wide"
            style={{ backgroundColor: tokens.accent, color: tokens.ink }}
          >
            Submit group or bot
          </Link>
        </div>
      ) : (
        <ul className="divide-y overflow-hidden rounded-2xl border" style={{ borderColor: tokens.border }}>
          {displayListings.map((listing) => (
            <ListingRow
              key={`${listing.type}-${listing._id}`}
              listing={listing}
              tokens={tokens}
              isEditing={editingId === listing._id}
              isExpanded={expandedListingId === listing._id}
              instantLoadingId={instantLoadingId}
              deletingId={deletingId}
              onToggleExpand={() => toggleExpanded(listing._id)}
              onSelectBoost={() => setExpandedListingId(listing._id)}
              onToggleEdit={() => setEditingId(editingId === listing._id ? null : listing._id)}
              onInstantApproval={() => handleInstantApproval(listing)}
              onDelete={() => setDeleteTarget(listing)}
              onSaved={(patch) => {
                setListings((prev) => prev.map((l) => (l._id === listing._id ? { ...l, ...patch } : l)));
                setEditingId(null);
              }}
              onRefresh={load}
            />
          ))}
        </ul>
      )}

      <ListingsContactBlock tokens={tokens} />

      {deleteTarget && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center px-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
          onClick={() => !deletingId && setDeleteTarget(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border p-6 shadow-2xl"
            style={{ borderColor: tokens.border, backgroundColor: tokens.card }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-base font-bold" style={{ color: tokens.text }}>
              Are you sure you want to delete?
            </p>
            <p className="mt-2 text-sm" style={{ color: tokens.muted }}>
              {deleteTarget.name}
            </p>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={!!deletingId}
                className="flex-1 rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-wide disabled:opacity-50"
                style={{ border: `1px solid ${tokens.border}`, color: tokens.muted }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={!!deletingId}
                className="flex-1 rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-wide text-white disabled:opacity-50"
                style={{ backgroundColor: '#ef4444' }}
              >
                {deletingId ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
